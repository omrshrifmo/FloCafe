CREATE TABLE IF NOT EXISTS plugin_feature_flags (
  id TEXT PRIMARY KEY,
  enabled INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT
);
