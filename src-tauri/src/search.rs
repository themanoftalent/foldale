use regex::Regex;
use std::path::Path;
use std::time::UNIX_EPOCH;
use walkdir::WalkDir;

use crate::models::{SearchQuery, SearchResultEntry};

pub fn search_directory(query: SearchQuery) -> Result<Vec<SearchResultEntry>, String> {
    let root = Path::new(&query.directory);
    if !root.is_dir() {
        return Err(format!("Search directory does not exist: {}", query.directory));
    }

    let regex_matcher = if query.is_regex {
        Some(
            Regex::new(&query.term)
                .map_err(|e| format!("Invalid regex pattern: {}", e))?,
        )
    } else {
        None
    };

    let lowercase_term = query.term.to_lowercase();
    let mut results = Vec::new();
    let max_results = if query.max_results == 0 { 500 } else { query.max_results };

    for entry in WalkDir::new(root).into_iter().filter_map(|e| e.ok()) {
        if results.len() >= max_results {
            break;
        }

        let file_name = entry.file_name().to_string_lossy();

        // 1. Term Match
        let matches_term = if query.term.is_empty() {
            true
        } else if let Some(ref re) = regex_matcher {
            re.is_match(&file_name)
        } else if query.case_sensitive {
            file_name.contains(&query.term)
        } else {
            file_name.to_lowercase().contains(&lowercase_term)
        };

        if !matches_term {
            continue;
        }

        let entry_path = entry.path();
        let extension = entry_path
            .extension()
            .map(|e| e.to_string_lossy().to_string());

        // 2. Extension filter
        if let Some(ref ext_filter) = query.extension_filter {
            let filter_clean = ext_filter.trim_start_matches('.').to_lowercase();
            if !filter_clean.is_empty() {
                match &extension {
                    Some(ext) if ext.to_lowercase() == filter_clean => {}
                    _ => continue,
                }
            }
        }

        // 3. Metadata filters (size, modified)
        let is_dir = entry.file_type().is_dir();
        let meta = match entry.metadata() {
            Ok(m) => m,
            Err(_) => continue,
        };

        let size = if is_dir { 0 } else { meta.len() };

        if let Some(min_s) = query.min_size {
            if !is_dir && size < min_s {
                continue;
            }
        }

        if let Some(max_s) = query.max_size {
            if !is_dir && size > max_s {
                continue;
            }
        }

        let modified = meta
            .modified()
            .ok()
            .and_then(|t| t.duration_since(UNIX_EPOCH).ok().map(|d| d.as_secs() as i64));

        if let Some(min_mod) = query.min_modified {
            if let Some(mod_sec) = modified {
                if mod_sec < min_mod {
                    continue;
                }
            }
        }

        results.push(SearchResultEntry {
            name: file_name.to_string(),
            path: entry_path.to_string_lossy().to_string(),
            is_dir,
            size,
            modified,
            extension,
        });
    }

    Ok(results)
}
