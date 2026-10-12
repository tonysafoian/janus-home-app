-- Electricity tracking tables for LADWP cost intelligence system
-- Created: 2026-04-30

-- Stores imported LADWP bill data for reconciliation
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

-- Stores hourly/daily energy snapshots pulled from HA
CREATE TABLE IF NOT EXISTS electricity_snapshots (
  id SERIAL PRIMARY KEY,
  snapshot_at TIMESTAMPTZ NOT NULL,
  period TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  kwh NUMERIC(10,4) NOT NULL,
  cost_usd NUMERIC(10,4),
  tier INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI-generated savings recommendations
CREATE TABLE IF NOT EXISTS electricity_recommendations (
  id SERIAL PRIMARY KEY,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  category TEXT,
  circuit_entity_id TEXT,
  headline TEXT NOT NULL,
  detail TEXT,
  potential_savings_usd_month NUMERIC(8,2),
  dismissed_at TIMESTAMPTZ
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_electricity_snapshots_at ON electricity_snapshots (snapshot_at DESC);
CREATE INDEX IF NOT EXISTS idx_electricity_snapshots_entity ON electricity_snapshots (entity_id, snapshot_at DESC);
CREATE INDEX IF NOT EXISTS idx_electricity_bills_period ON electricity_bills (billing_period_start DESC);

-- Historical bills seed omitted for privacy. Private seed files can be imported if desired.

