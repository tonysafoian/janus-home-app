-- Sample grocery staples starter pack
INSERT INTO grocery_staples (item_name, category, default_quantity, unit, reorder_threshold, is_active)
VALUES
  ('Organic Whole Milk', 'Dairy & Eggs', 1, 'gallon', 1, true),
  ('Pasture-Raised Eggs', 'Dairy & Eggs', 1, 'dozen', 1, true),
  ('Organic Bananas', 'Produce', 1, 'bunch', 1, true),
  ('Avocados', 'Produce', 4, 'count', 2, true),
  ('Sourdough Bread', 'Bakery', 1, 'loaf', 1, true)
ON CONFLICT (item_name) DO NOTHING;
