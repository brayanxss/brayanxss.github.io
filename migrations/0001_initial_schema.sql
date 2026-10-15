-- Schema inicial utilizado pelas rotas OAuth e de sessão do projeto.
CREATE TABLE IF NOT EXISTS oauth_transactions (
  id_hash TEXT PRIMARY KEY NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('google', 'github')),
  state_hash TEXT NOT NULL,
  nonce TEXT,
  code_verifier TEXT NOT NULL,
  expires_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  id_hash TEXT PRIMARY KEY NOT NULL,
  issuer TEXT NOT NULL,
  subject TEXT NOT NULL,
  email TEXT,
  display_name TEXT,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_oauth_transactions_expires_at
  ON oauth_transactions (expires_at);

CREATE INDEX IF NOT EXISTS idx_sessions_expires_at
  ON sessions (expires_at);
CREATE TABL teste_erro (id INTEGER);
