//! SQLite persistence in ~/.foldale/foldale.db.
//!
//! The v1.0.0 schema (bookmarks, history, settings, operation_logs) is kept as-is so
//! upgrading never loses data. Changes are applied through `PRAGMA user_version`
//! migrations.

use rusqlite::{params, Connection, OptionalExtension};
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::Mutex;

use crate::models::{Bookmark, OperationLog};
use crate::util::now_ts;

pub struct Database {
    conn: Mutex<Connection>,
    pub path: Option<PathBuf>,
}

const SCHEMA_V0: &str = "
    CREATE TABLE IF NOT EXISTS bookmarks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        path TEXT NOT NULL UNIQUE,
        icon TEXT NOT NULL DEFAULT 'folder',
        order_index INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        path TEXT NOT NULL,
        visited_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS operation_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        op_type TEXT NOT NULL,
        source TEXT NOT NULL,
        destination TEXT,
        timestamp INTEGER NOT NULL,
        status TEXT NOT NULL,
        error_message TEXT
    );
";

pub fn default_db_path() -> PathBuf {
    dirs::home_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join(".foldale")
        .join("foldale.db")
}

impl Database {
    pub fn open(path: &Path) -> Result<Self, String> {
        if let Some(dir) = path.parent() {
            fs::create_dir_all(dir).map_err(|e| e.to_string())?;
        }
        let conn = Connection::open(path).map_err(|e| e.to_string())?;
        let db = Database { conn: Mutex::new(conn), path: Some(path.to_path_buf()) };
        db.migrate()?;
        Ok(db)
    }

    /// Used when the on-disk database cannot be opened, so the app still runs.
    pub fn in_memory() -> Self {
        let conn = Connection::open_in_memory().expect("in-memory sqlite");
        let db = Database { conn: Mutex::new(conn), path: None };
        let _ = db.migrate();
        db
    }

    fn migrate(&self) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        conn.execute_batch("PRAGMA journal_mode=WAL; PRAGMA busy_timeout=3000;")
            .map_err(|e| e.to_string())?;
        conn.execute_batch(SCHEMA_V0).map_err(|e| e.to_string())?;
        let version: i64 = conn.query_row("PRAGMA user_version", [], |r| r.get(0)).map_err(|e| e.to_string())?;

        if version < 1 {
            // v1.0.0 re-seeded Home/Documents/Downloads/Desktop as bookmarks on every
            // launch with an empty table. Those now live in the sidebar's Favorites,
            // so remove only those exact auto-created rows. User bookmarks are kept.
            let home = dirs::home_dir().map(|p| p.to_string_lossy().to_string()).unwrap_or_default();
            let seeds = [
                ("Home", home.clone(), "home"),
                ("Documents", dirs::document_dir().map(|p| p.to_string_lossy().to_string()).unwrap_or_default(), "file-text"),
                ("Downloads", dirs::download_dir().map(|p| p.to_string_lossy().to_string()).unwrap_or_default(), "download"),
                ("Desktop", dirs::desktop_dir().map(|p| p.to_string_lossy().to_string()).unwrap_or_default(), "monitor"),
            ];
            for (name, path, icon) in seeds.iter() {
                let _ = conn.execute(
                    "DELETE FROM bookmarks WHERE name = ?1 AND path = ?2 AND icon = ?3",
                    params![name, path, icon],
                );
            }
            conn.execute_batch(
                "CREATE INDEX IF NOT EXISTS idx_history_visited ON history(visited_at);
                 CREATE INDEX IF NOT EXISTS idx_history_path ON history(path);
                 CREATE INDEX IF NOT EXISTS idx_logs_ts ON operation_logs(timestamp);
                 PRAGMA user_version = 1;",
            )
            .map_err(|e| e.to_string())?;
        }
        Ok(())
    }

    // --- Bookmarks ---------------------------------------------------------

    pub fn get_bookmarks(&self) -> Result<Vec<Bookmark>, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let mut stmt = conn
            .prepare("SELECT id, name, path, icon, order_index FROM bookmarks ORDER BY order_index ASC, id ASC")
            .map_err(|e| e.to_string())?;
        let rows = stmt
            .query_map([], |row| {
                Ok(Bookmark {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    path: row.get(2)?,
                    icon: row.get(3)?,
                    order_index: row.get(4)?,
                })
            })
            .map_err(|e| e.to_string())?;
        Ok(rows.flatten().collect())
    }

    /// Adds a bookmark, or renames the existing bookmark for the same path.
    pub fn add_bookmark(&self, name: &str, path: &str, icon: &str) -> Result<Bookmark, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        conn.execute(
            "INSERT INTO bookmarks (name, path, icon, order_index)
             VALUES (?1, ?2, ?3, (SELECT COALESCE(MAX(order_index), -1) + 1 FROM bookmarks))
             ON CONFLICT(path) DO UPDATE SET name = excluded.name, icon = excluded.icon",
            params![name, path, icon],
        )
        .map_err(|e| e.to_string())?;
        conn.query_row(
            "SELECT id, name, path, icon, order_index FROM bookmarks WHERE path = ?1",
            params![path],
            |row| {
                Ok(Bookmark {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    path: row.get(2)?,
                    icon: row.get(3)?,
                    order_index: row.get(4)?,
                })
            },
        )
        .map_err(|e| e.to_string())
    }

    pub fn rename_bookmark(&self, id: i64, name: &str) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        conn.execute("UPDATE bookmarks SET name = ?1 WHERE id = ?2", params![name, id])
            .map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn reorder_bookmarks(&self, ids: &[i64]) -> Result<(), String> {
        let mut conn = self.conn.lock().map_err(|e| e.to_string())?;
        let tx = conn.transaction().map_err(|e| e.to_string())?;
        for (i, id) in ids.iter().enumerate() {
            tx.execute("UPDATE bookmarks SET order_index = ?1 WHERE id = ?2", params![i as i64, id])
                .map_err(|e| e.to_string())?;
        }
        tx.commit().map_err(|e| e.to_string())
    }

    pub fn remove_bookmark(&self, id: i64) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        conn.execute("DELETE FROM bookmarks WHERE id = ?1", params![id])
            .map_err(|e| e.to_string())?;
        Ok(())
    }

    // --- History -----------------------------------------------------------

    pub fn add_history(&self, path: &str) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        conn.execute("INSERT INTO history (path, visited_at) VALUES (?1, ?2)", params![path, now_ts()])
            .map_err(|e| e.to_string())?;
        let _ = conn.execute(
            "DELETE FROM history WHERE id NOT IN (SELECT id FROM history ORDER BY visited_at DESC, id DESC LIMIT 300)",
            [],
        );
        Ok(())
    }

    pub fn get_recent_history(&self, limit: usize) -> Result<Vec<String>, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let mut stmt = conn
            .prepare(
                "SELECT path FROM history GROUP BY path ORDER BY MAX(visited_at) DESC, MAX(id) DESC LIMIT ?1",
            )
            .map_err(|e| e.to_string())?;
        let rows = stmt
            .query_map(params![limit as i64], |row| row.get::<_, String>(0))
            .map_err(|e| e.to_string())?;
        Ok(rows.flatten().collect())
    }

    pub fn clear_history(&self) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        conn.execute("DELETE FROM history", []).map_err(|e| e.to_string())?;
        Ok(())
    }

    // --- Settings ----------------------------------------------------------

    pub fn get_setting(&self, key: &str) -> Result<Option<String>, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        conn.query_row("SELECT value FROM settings WHERE key = ?1", params![key], |r| r.get(0))
            .optional()
            .map_err(|e| e.to_string())
    }

    pub fn set_setting(&self, key: &str, value: &str) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        conn.execute(
            "INSERT INTO settings (key, value) VALUES (?1, ?2) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
            params![key, value],
        )
        .map_err(|e| e.to_string())?;
        Ok(())
    }

    // --- Operation log -----------------------------------------------------

    pub fn log_operation(
        &self,
        op_type: &str,
        source: &str,
        dest: Option<&str>,
        status: &str,
        error: Option<&str>,
    ) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        conn.execute(
            "INSERT INTO operation_logs (op_type, source, destination, timestamp, status, error_message) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![op_type, source, dest, now_ts(), status, error],
        )
        .map_err(|e| e.to_string())?;
        let _ = conn.execute(
            "DELETE FROM operation_logs WHERE id NOT IN (SELECT id FROM operation_logs ORDER BY id DESC LIMIT 2000)",
            [],
        );
        Ok(())
    }

    pub fn get_operation_logs(&self, limit: usize) -> Result<Vec<OperationLog>, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let mut stmt = conn
            .prepare("SELECT id, op_type, source, destination, timestamp, status, error_message FROM operation_logs ORDER BY id DESC LIMIT ?1")
            .map_err(|e| e.to_string())?;
        let rows = stmt
            .query_map(params![limit as i64], |row| {
                Ok(OperationLog {
                    id: row.get(0)?,
                    op_type: row.get(1)?,
                    source: row.get(2)?,
                    destination: row.get(3)?,
                    timestamp: row.get(4)?,
                    status: row.get(5)?,
                    error_message: row.get(6)?,
                })
            })
            .map_err(|e| e.to_string())?;
        Ok(rows.flatten().collect())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn upgrade_from_v1_schema_keeps_user_data() {
        let t = tempfile::tempdir().unwrap();
        let p = t.path().join("foldale.db");
        {
            // Simulate a v1.0.0 database.
            let c = Connection::open(&p).unwrap();
            c.execute_batch(SCHEMA_V0).unwrap();
            let home = dirs::home_dir().unwrap().to_string_lossy().to_string();
            c.execute("INSERT INTO bookmarks (name,path,icon,order_index) VALUES ('Home',?1,'home',0)", params![home]).unwrap();
            c.execute("INSERT INTO bookmarks (name,path,icon,order_index) VALUES ('Work','/tmp/work','folder',4)", []).unwrap();
            c.execute("INSERT INTO settings (key,value) VALUES ('theme','light')", []).unwrap();
        }
        let db = Database::open(&p).unwrap();
        let b = db.get_bookmarks().unwrap();
        assert_eq!(b.len(), 1, "auto-seeded Home removed, user bookmark kept");
        assert_eq!(b[0].name, "Work");
        assert_eq!(db.get_setting("theme").unwrap().as_deref(), Some("light"));
        // Re-opening is idempotent.
        drop(db);
        let db = Database::open(&p).unwrap();
        assert_eq!(db.get_bookmarks().unwrap().len(), 1);
    }

    #[test]
    fn bookmarks_upsert_rename_reorder() {
        let db = Database::in_memory();
        let a = db.add_bookmark("A", "/a", "folder").unwrap();
        let b = db.add_bookmark("B", "/b", "folder").unwrap();
        let a2 = db.add_bookmark("A renamed", "/a", "folder").unwrap();
        assert_eq!(a.id, a2.id, "same path updates instead of duplicating");
        db.reorder_bookmarks(&[b.id, a.id]).unwrap();
        let all = db.get_bookmarks().unwrap();
        assert_eq!(all[0].path, "/b");
        db.rename_bookmark(b.id, "Bee").unwrap();
        assert_eq!(db.get_bookmarks().unwrap()[0].name, "Bee");
        db.remove_bookmark(b.id).unwrap();
        assert_eq!(db.get_bookmarks().unwrap().len(), 1);
    }

    #[test]
    fn recent_history_is_distinct_and_ordered() {
        let db = Database::in_memory();
        for p in ["/a", "/b", "/a", "/c"] {
            db.add_history(p).unwrap();
        }
        assert_eq!(db.get_recent_history(10).unwrap(), vec!["/c", "/a", "/b"]);
    }

    #[test]
    fn settings_round_trip() {
        let db = Database::in_memory();
        assert_eq!(db.get_setting("x").unwrap(), None);
        db.set_setting("x", "1").unwrap();
        db.set_setting("x", "2").unwrap();
        assert_eq!(db.get_setting("x").unwrap().as_deref(), Some("2"));
    }
}
