-- Example Private Seed Script
--
-- Copy this file to a private, uncommitted file (e.g. scripts/seed-private-data.sql)
-- to import your household's custom data into PostgreSQL.
--
-- DO NOT commit personal rosters, utility account data, or private addresses to git.

-- Sample Player Roster
INSERT INTO ball_players (name, email, token, active, is_host, notes) VALUES
  ('Organizer Name', 'organizer@example.com', 'm1jc55tt', true, true, 'Host'),
  ('Friend One',     'friend1@example.com',   'dw3kgj2p', true, false, NULL)
ON CONFLICT DO NOTHING;

-- Sample Utility Bills
INSERT INTO electricity_bills (billing_period_start, billing_period_end, ladwp_kwh, ladwp_total_usd, raw_bill_data)
VALUES
  ('2026-01-01', '2026-03-01', 1200, 350.00, '{"source":"manual"}')
ON CONFLICT DO NOTHING;
