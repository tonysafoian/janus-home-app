-- Sample grocery staples starter pack
INSERT INTO grocery_staples (name, category, default_quantity, is_active)
SELECT v.name, v.category, v.default_quantity, v.is_active
FROM (VALUES
  ('Organic Whole Milk', 'Dairy & Eggs', 1, true),
  ('Pasture-Raised Eggs', 'Dairy & Eggs', 1, true),
  ('Organic Bananas', 'Produce', 1, true),
  ('Avocados', 'Produce', 4, true),
  ('Sourdough Bread', 'Bakery', 1, true)
) AS v(name, category, default_quantity, is_active)
WHERE NOT EXISTS (
  SELECT 1 FROM grocery_staples gs WHERE LOWER(TRIM(gs.name)) = LOWER(TRIM(v.name))
);
