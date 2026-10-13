-- Seed initial time-tracking work categories
-- Migration 0051
-- Ensures workers have categories to log time against on day one.
-- Idempotent: existing categories with the same name are left untouched.

INSERT INTO tt_categories (name, sort_order) VALUES
  ('Home Maintenance', 1),
  ('Property Projects', 2),
  ('Errands & Services', 3)
ON CONFLICT (name) DO NOTHING;
