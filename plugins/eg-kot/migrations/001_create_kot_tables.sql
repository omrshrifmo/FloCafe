CREATE TABLE IF NOT EXISTS kitchen_stations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  printer_id TEXT,
  enabled INTEGER DEFAULT 1,
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS kot_slips (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id TEXT NOT NULL,
  station_id TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  printed INTEGER DEFAULT 0,
  printed_at TEXT,
  printer_name TEXT,
  content TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY(station_id) REFERENCES kitchen_stations(id)
);

INSERT INTO kitchen_stations (id, name, enabled, sort_order)
SELECT 'chef', 'المطبخ – Chef', 1, 1 WHERE NOT EXISTS (SELECT 1 FROM kitchen_stations WHERE id = 'chef');
INSERT INTO kitchen_stations (id, name, enabled, sort_order)
SELECT 'barista', 'البار – Barista', 1, 2 WHERE NOT EXISTS (SELECT 1 FROM kitchen_stations WHERE id = 'barista');
INSERT INTO kitchen_stations (id, name, enabled, sort_order)
SELECT 'shisha', 'الشيشة – Shisha', 1, 3 WHERE NOT EXISTS (SELECT 1 FROM kitchen_stations WHERE id = 'shisha');
