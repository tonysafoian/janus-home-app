-- 0060_deduplicate_grocery_staples.sql
-- Deduplicate grocery_staples and add unique index on lowercase trimmed name

-- 1. Remove duplicate items keeping the earliest row
DELETE FROM grocery_staples a
USING grocery_staples b
WHERE a.created_at > b.created_at
  AND LOWER(TRIM(a.name)) = LOWER(TRIM(b.name));

-- Fallback for items with identical timestamps
DELETE FROM grocery_staples a
USING grocery_staples b
WHERE a.id::text > b.id::text
  AND LOWER(TRIM(a.name)) = LOWER(TRIM(b.name));

-- 2. Create unique index to prevent future duplicate staple items
CREATE UNIQUE INDEX IF NOT EXISTS idx_grocery_staples_unique_name
ON grocery_staples (LOWER(TRIM(name)));
