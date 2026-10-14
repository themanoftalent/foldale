//! Recursive name and content search with cancellation and streamed partial results.

use regex::{Regex, RegexBuilder};
use std::fs::File;
use std::io::{BufRead, BufReader, Read};
use std::path::Path;
use std::sync::atomic::{AtomicBool, Ordering};
use std::time::Instant;
use walkdir::WalkDir;

use crate::models::{SearchQuery, SearchResultEntry, SearchSummary};
use crate::util::time_to_timestamp;

const CONTENT_MAX_FILE: u64 = 8 * 1024 * 1024;
/// Directories that are almost never what the user is looking for and are expensive.
const SKIP_DIRS: &[&str] = &["node_modules", ".git", "target", ".Trash", "Library/Caches"];

enum Matcher {
    Regex(Regex),
    Plain { needle: String, case_sensitive: bool },
    All,
}

impl Matcher {
    fn new(q: &SearchQuery) -> Result<Self, String> {
        if q.term.is_empty() {
            return Ok(Matcher::All);
        }
        if q.is_regex {
            let re = RegexBuilder::new(&q.term)
                .case_insensitive(!q.case_sensitive)
                .size_limit(1 << 20)
                .build()
                .map_err(|e| format!("Invalid regular expression: {}", e))?;
            return Ok(Matcher::Regex(re));
        }
        Ok(Matcher::Plain {
            needle: if q.case_sensitive { q.term.clone() } else { q.term.to_lowercase() },
            case_sensitive: q.case_sensitive,
        })
    }

    fn is_match(&self, s: &str) -> bool {
        match self {
            Matcher::All => true,
            Matcher::Regex(re) => re.is_match(s),
            Matcher::Plain { needle, case_sensitive } => {
                if *case_sensitive {
                    s.contains(needle.as_str())
                } else {
                    s.to_lowercase().contains(needle.as_str())
                }
            }
        }
    }
}

fn content_match(path: &Path, m: &Matcher, cancel: &AtomicBool) -> Option<(usize, String)> {
    let mut f = File::open(path).ok()?;
    let mut head = [0u8; 4096];
    let n = f.read(&mut head).ok()?;
    if head[..n].contains(&0) {
        return None; // binary
    }
    let f = File::open(path).ok()?;
    for (i, line) in BufReader::new(f).lines().enumerate() {
        if i % 2048 == 0 && cancel.load(Ordering::Relaxed) {
            return None;
        }
        let Ok(line) = line else { return None };
        if m.is_match(&line) {
            let trimmed: String = line.trim().chars().take(200).collect();
            return Some((i + 1, trimmed));
        }
    }
    None
}

pub fn search_directory(
    query: SearchQuery,
    cancel: &AtomicBool,
    on_batch: &dyn Fn(&[SearchResultEntry], u64),
) -> Result<SearchSummary, String> {
    let started = Instant::now();
    let root = Path::new(&query.directory);
    if !root.is_dir() {
        return Err(format!("\"{}\" is not a folder.", query.directory));
    }
    let matcher = Matcher::new(&query)?;
    let ext_filter: Vec<String> = query
        .extension_filter
        .as_deref()
        .unwrap_or("")
        .split(|c| c == ',' || c == ' ')
        .map(|s| s.trim().trim_start_matches('.').to_lowercase())
        .filter(|s| !s.is_empty())
        .collect();
    let max_results = if query.max_results == 0 { 1000 } else { query.max_results };
    let include_hidden = query.include_hidden;

    let mut results: Vec<SearchResultEntry> = Vec::new();
    let mut pending_from = 0usize;
    let mut scanned = 0u64;
    let mut last_batch = Instant::now();
    let mut truncated = false;
    let mut cancelled = false;

    let walker = WalkDir::new(root).follow_links(false).into_iter().filter_entry(|e| {
        if e.depth() == 0 {
            return true;
        }
        let name = e.file_name().to_string_lossy();
        if !include_hidden && name.starts_with('.') {
            return false;
        }
        if e.file_type().is_dir() {
            let p = e.path().to_string_lossy();
            if SKIP_DIRS.iter().any(|s| p.ends_with(s)) {
                return false;
            }
        }
        true
    });

    for entry in walker.filter_map(|e| e.ok()) {
        if cancel.load(Ordering::Relaxed) {
            cancelled = true;
            break;
        }
        if entry.depth() == 0 {
            continue;
        }
        scanned += 1;
        let is_dir = entry.file_type().is_dir();
        let name = entry.file_name().to_string_lossy().to_string();
        let path = entry.path();
        let extension = path.extension().map(|e| e.to_string_lossy().to_string());

        if !ext_filter.is_empty() {
            match &extension {
                Some(e) if ext_filter.contains(&e.to_lowercase()) => {}
                _ => continue,
            }
        }

        let meta = match entry.metadata() {
            Ok(m) => m,
            Err(_) => continue,
        };
        let size = if is_dir { 0 } else { meta.len() };
        if let Some(min) = query.min_size {
            if is_dir || size < min {
                continue;
            }
        }
        if let Some(max) = query.max_size {
            if is_dir || size > max {
                continue;
            }
        }
        let modified = time_to_timestamp(meta.modified());
        if let Some(min_mod) = query.min_modified {
            if modified.map(|m| m < min_mod).unwrap_or(true) {
                continue;
            }
        }

        let (matched, snippet, line_number) = if query.search_contents {
            if is_dir || size > CONTENT_MAX_FILE || query.term.is_empty() {
                (false, None, None)
            } else {
                match content_match(path, &matcher, cancel) {
                    Some((ln, s)) => (true, Some(s), Some(ln)),
                    None => (false, None, None),
                }
            }
        } else {
            (matcher.is_match(&name), None, None)
        };
        if !matched {
            continue;
        }

        results.push(SearchResultEntry {
            name,
            path: path.to_string_lossy().to_string(),
            is_dir,
            size,
            modified,
            extension,
            snippet,
            line_number,
        });

        if last_batch.elapsed().as_millis() >= 150 {
            on_batch(&results[pending_from..], scanned);
            pending_from = results.len();
            last_batch = Instant::now();
        }
        if results.len() >= max_results {
            truncated = true;
            break;
        }
    }
    if pending_from < results.len() {
        on_batch(&results[pending_from..], scanned);
    }

    Ok(SearchSummary {
        search_id: query.search_id,
        results,
        scanned,
        truncated,
        cancelled,
        elapsed_ms: started.elapsed().as_millis() as u64,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    fn q(dir: &Path, term: &str) -> SearchQuery {
        SearchQuery {
            search_id: "s".into(),
            directory: dir.to_string_lossy().into(),
            term: term.into(),
            is_regex: false,
            case_sensitive: false,
            include_hidden: false,
            search_contents: false,
            extension_filter: None,
            min_size: None,
            max_size: None,
            min_modified: None,
            max_results: 100,
        }
    }

    fn setup() -> tempfile::TempDir {
        let t = tempfile::tempdir().unwrap();
        fs::create_dir_all(t.path().join("a/b")).unwrap();
        fs::create_dir_all(t.path().join("node_modules/pkg")).unwrap();
        fs::write(t.path().join("a/Report.md"), "quarterly numbers\nTODO: finish").unwrap();
        fs::write(t.path().join("a/b/report.txt"), "nothing").unwrap();
        fs::write(t.path().join("node_modules/pkg/report.js"), "x").unwrap();
        fs::write(t.path().join(".hidden-report"), "x").unwrap();
        t
    }

    #[test]
    fn name_search_skips_noise_and_hidden() {
        let t = setup();
        let none = AtomicBool::new(false);
        let r = search_directory(q(t.path(), "report"), &none, &|_, _| {}).unwrap();
        let names: Vec<_> = r.results.iter().map(|e| e.name.as_str()).collect();
        assert_eq!(names.len(), 2, "{names:?}");
        let mut hq = q(t.path(), "report");
        hq.include_hidden = true;
        assert_eq!(search_directory(hq, &none, &|_, _| {}).unwrap().results.len(), 3);
    }

    #[test]
    fn regex_extension_and_content() {
        let t = setup();
        let none = AtomicBool::new(false);
        let mut rq = q(t.path(), "^report\\.(md|txt)$");
        rq.is_regex = true;
        assert_eq!(search_directory(rq, &none, &|_, _| {}).unwrap().results.len(), 2);
        let mut eq = q(t.path(), "");
        eq.extension_filter = Some("md".into());
        assert_eq!(search_directory(eq, &none, &|_, _| {}).unwrap().results.len(), 1);
        let mut cq = q(t.path(), "todo");
        cq.search_contents = true;
        let r = search_directory(cq, &none, &|_, _| {}).unwrap();
        assert_eq!(r.results.len(), 1);
        assert_eq!(r.results[0].line_number, Some(2));
    }

    #[test]
    fn invalid_regex_is_an_error_and_cancel_works() {
        let t = setup();
        let none = AtomicBool::new(false);
        let mut rq = q(t.path(), "(");
        rq.is_regex = true;
        assert!(search_directory(rq, &none, &|_, _| {}).is_err());
        let stop = AtomicBool::new(true);
        assert!(search_directory(q(t.path(), "report"), &stop, &|_, _| {}).unwrap().cancelled);
    }
}
