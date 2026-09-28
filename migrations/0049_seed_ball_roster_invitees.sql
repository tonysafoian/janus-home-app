-- 0049: Anonymized seed ball roster invitees (sample demo data)
INSERT INTO ball_roster_invitees (full_name, email, phone, role, status, is_active, notes)
VALUES
  ('Demo Player 1', 'player1@example.com', NULL, 'regular', 'active', true, 'Demo roster member'),
  ('Demo Player 2', 'player2@example.com', NULL, 'regular', 'active', true, 'Demo roster member')
ON CONFLICT (email) DO NOTHING;
