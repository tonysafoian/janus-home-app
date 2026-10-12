-- Sample grocery staples starter pack
INSERT INTO grocery_staples (name, category, default_quantity, is_active)
VALUES
  ('Organic Whole Milk', 'Dairy & Eggs', 1, true),
  ('Pasture-Raised Eggs', 'Dairy & Eggs', 1, true),
  ('Organic Bananas', 'Produce', 1, true),
  ('Avocados', 'Produce', 4, true),
  ('Sourdough Bread', 'Bakery', 1, true)
ON CONFLICT DO NOTHING;
