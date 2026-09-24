CREATE TABLE IF NOT EXISTS branding (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  app_name TEXT,
  logo_light TEXT,
  logo_dark TEXT,
  primary_color TEXT,
  secondary_color TEXT,
  locale_default TEXT,
  updated_at TEXT
);
INSERT INTO branding (app_name, locale_default, primary_color, secondary_color)
SELECT 'FloCafe', 'ar', '#3248FF', '#1E1E2E'
WHERE NOT EXISTS (SELECT 1 FROM branding);
