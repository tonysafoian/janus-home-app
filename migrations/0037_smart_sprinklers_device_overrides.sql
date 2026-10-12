-- Schema for device_overrides table.

CREATE TABLE IF NOT EXISTS device_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mac text NOT NULL UNIQUE,
  custom_name text,
  custom_category text,
  custom_subcategory text,
  original_hostname text,
  owner text,
  trusted boolean NOT NULL DEFAULT false,
  is_random boolean NOT NULL DEFAULT false,
  first_seen timestamptz,
  last_seen timestamptz,
  notes text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
