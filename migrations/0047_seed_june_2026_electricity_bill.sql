-- Ensure electricity_bills table exists
--
-- CREATE TABLE IF NOT EXISTS is defensive: it is a no-op on production (0009
-- already created the table) but lets this migration apply cleanly on a dev DB
-- whose electricity_bills table is absent due to ledger drift.

CREATE TABLE IF NOT EXISTS electricity_bills (
  id SERIAL PRIMARY KEY,
  billing_period_start DATE NOT NULL,
  billing_period_end DATE NOT NULL,
  ladwp_kwh NUMERIC(10,2),
  ladwp_total_usd NUMERIC(10,2),
  our_estimate_kwh NUMERIC(10,2),
  our_estimate_usd NUMERIC(10,2),
  variance_pct NUMERIC(6,2),
  raw_bill_data JSONB,
  imported_at TIMESTAMPTZ DEFAULT NOW()
);
