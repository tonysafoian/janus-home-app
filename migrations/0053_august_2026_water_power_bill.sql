-- Schema for water_bills table.
--
-- Water gets its own actual-bill table so modeled daily telemetry can be
-- reconciled against the meter and bill-level year-over-year trends can drive
-- Water Intelligence suggestions.

CREATE TABLE IF NOT EXISTS water_bills (
  id SERIAL PRIMARY KEY,
  billing_period_start DATE NOT NULL,
  billing_period_end DATE NOT NULL,
  ladwp_hcf NUMERIC(10,2) NOT NULL,
  ladwp_gallons NUMERIC(14,2) NOT NULL,
  water_usd NUMERIC(10,2) NOT NULL,
  sewer_usd NUMERIC(10,2),
  solid_waste_usd NUMERIC(10,2),
  total_new_charges_usd NUMERIC(10,2),
  prior_year_hcf NUMERIC(10,2),
  prior_year_days INTEGER,
  raw_bill_data JSONB,
  imported_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_water_bills_period_unique
  ON water_bills (billing_period_start, billing_period_end);
CREATE INDEX IF NOT EXISTS idx_water_bills_period
  ON water_bills (billing_period_start DESC);