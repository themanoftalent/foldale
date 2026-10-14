use rusqlite::{params, Connection};
use std::fs;
use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};

use crate::models::{Bookmark, OperationLog};

pub struct Database {
    conn: Mutex<Connection>,
}

impl Database {
    pub fn new() -> Result<Self, String> {
        let home = dirs::home_dir().unwrap_or_else(|| std::path::PathBuf::from("."));
        let db_dir = home.join(".foldale");
        if !db_dir.exists() {
            let _ = fs::create_dir_all(&db_dir);
        }
        let db_path = db_dir.join("foldale.db");

        let conn = Connection::open(&db_path).map_err(|e| e.to_string())?;

        // Initialize schema
        conn.execute_batch(
            "
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
            ",
        )
        .map_err(|e| e.to_string())?;

        // Populate default bookmarks if empty
        let count: i64 = conn
            .query_row("SELECT COUNT(*) FROM bookmarks", [], |row| row.get(0))
            .unwrap_or(0);

        if count == 0 {
            if let Some(home_p) = dirs::home_dir() {
                let _ = conn.execute(
                    "INSERT INTO bookmarks (name, path, icon, order_index) VALUES (?1, ?2, ?3, ?4)",
                    params!["Home", home_p.to_string_lossy().to_string(), "home", 0],
                );
            }
            if let Some(docs) = dirs::document_dir() {
                let _ = conn.execute(
                    "INSERT INTO bookmarks (name, path, icon, order_index) VALUES (?1, ?2, ?3, ?4)",
                    params!["Documents", docs.to_string_lossy().to_string(), "file-text", 1],
                );
            }
            if let Some(down) = dirs::download_dir() {
                let _ = conn.execute(
                    "INSERT INTO bookmarks (name, path, icon, order_index) VALUES (?1, ?2, ?3, ?4)",
                    params!["Downloads", down.to_string_lossy().to_string(), "download", 2],
                );
            }
            if let Some(desk) = dirs::desktop_dir() {
                let _ = conn.execute(
                    "INSERT INTO bookmarks (name, path, icon, order_index) VALUES (?1, ?2, ?3, ?4)",
                    params!["Desktop", desk.to_string_lossy().to_string(), "monitor", 3],
                );
            }
        }

        Ok(Database {
            conn: Mutex::new(conn),
        })
    }

    // --- Bookmarks ---
    pub fn get_bookmarks(&self) -> Result<Vec<Bookmark>, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let mut stmt = conn
            .prepare("SELECT id, name, path, icon, order_index FROM bookmarks ORDER BY order_index ASC")
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

        let mut bookmarks = Vec::new();
        for r in rows.flatten() {
            bookmarks.push(r);
        }
        Ok(bookmarks)
    }

    pub fn add_bookmark(&self, name: &str, path: &str, icon: &str) -> Result<Bookmark, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        conn.execute(
            "INSERT OR REPLACE INTO bookmarks (name, path, icon, order_index) VALUES (?1, ?2, ?3, (SELECT COALESCE(MAX(order_index), 0) + 1 FROM bookmarks))",
            params![name, path, icon],
        ).map_err(|e| e.to_string())?;

        let id = conn.last_insert_rowid();
        Ok(Bookmark {
            id,
            name: name.to_string(),
            path: path.to_string(),
            icon: icon.to_string(),
            order_index: 0,
        })
    }

    pub fn remove_bookmark(&self, id: i64) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        conn.execute("DELETE FROM bookmarks WHERE id = ?1", params![id])
            .map_err(|e| e.to_string())?;
        Ok(())
    }

    // --- History ---
    pub fn add_history(&self, path: &str) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|d| d.as_secs() as i64)
            .unwrap_or(0);

        conn.execute(
            "INSERT INTO history (path, visited_at) VALUES (?1, ?2)",
            params![path, now],
        )
        .map_err(|e| e.to_string())?;

        // Keep last 100 history items
        let _ = conn.execute(
            "DELETE FROM history WHERE id NOT IN (SELECT id FROM history ORDER BY visited_at DESC LIMIT 100)",
            [],
        );

        Ok(())
    }

    pub fn get_recent_history(&self, limit: usize) -> Result<Vec<String>, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let mut stmt = conn
            .prepare("SELECT DISTINCT path FROM history ORDER BY visited_at DESC LIMIT ?1")
            .map_err(|e| e.to_string())?;

        let rows = stmt
            .query_map(params![limit as i64], |row| row.get::<_, String>(0))
            .map_err(|e| e.to_string())?;

        let mut list = Vec::new();
        for r in rows.flatten() {
            list.push(r);
        }
        Ok(list)
    }

    // --- Settings ---
    pub fn get_setting(&self, key: &str) -> Result<Option<String>, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let mut stmt = conn
            .prepare("SELECT value FROM settings WHERE key = ?1")
            .map_err(|e| e.to_string())?;

        let mut rows = stmt.query(params![key]).map_err(|e| e.to_string())?;
        if let Some(row) = rows.next().map_err(|e| e.to_string())? {
            Ok(Some(row.get(0).map_err(|e| e.to_string())?))
        } else {
            Ok(None)
        }
    }

    pub fn set_setting(&self, key: &str, value: &str) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        conn.execute(
            "INSERT OR REPLACE INTO settings (key, value) VALUES (?1, ?2)",
            params![key, value],
        )
        .map_err(|e| e.to_string())?;
        Ok(())
    }

    // --- Operation Logs ---
    pub fn log_operation(
        &self,
        op_type: &str,
        source: &str,
        dest: Option<&str>,
        status: &str,
        error: Option<&str>,
    ) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|d| d.as_secs() as i64)
            .unwrap_or(0);

        conn.execute(
            "INSERT INTO operation_logs (op_type, source, destination, timestamp, status, error_message) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![op_type, source, dest, now, status, error],
        ).map_err(|e| e.to_string())?;

        Ok(())
    }

    pub fn get_operation_logs(&self, limit: usize) -> Result<Vec<OperationLog>, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let mut stmt = conn
            .prepare("SELECT id, op_type, source, destination, timestamp, status, error_message FROM operation_logs ORDER BY timestamp DESC LIMIT ?1")
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

        let mut list = Vec::new();
        for r in rows.flatten() {
            list.push(r);
        }
        Ok(list)
    }
}
