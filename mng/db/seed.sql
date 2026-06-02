INSERT INTO users (username, email, password_hash, role)
VALUES (
  'umut',
  'umuttonguc@gmail.com',
  '1bf06cd584a427fec6314e57135392ed:b2a36ebe018f7fdf1281549108b6202d0d19c5f6014c008508d5203d63f74ce4ccae4f5799243dc81cbf489e1e2c4bdfa17198d5e797bfcce515b1a5fa0cdf39',
  'admin'
)
ON CONFLICT (username) DO NOTHING;
