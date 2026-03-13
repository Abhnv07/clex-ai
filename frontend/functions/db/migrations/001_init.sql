CREATE TABLE IF NOT EXISTS inboxes (
  id TEXT PRIMARY KEY,
  address TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  client_ip TEXT
);

CREATE TABLE IF NOT EXISTS emails (
  id TEXT PRIMARY KEY,
  inbox_id TEXT NOT NULL,
  from_address TEXT,
  to_address TEXT NOT NULL,
  subject TEXT,
  html_body TEXT,
  text_body TEXT,
  received_at INTEGER NOT NULL,
  FOREIGN KEY (inbox_id) REFERENCES inboxes(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_emails_inbox_id_received_at
  ON emails (inbox_id, received_at DESC);

CREATE INDEX IF NOT EXISTS idx_inboxes_expires_at
  ON inboxes (expires_at);

