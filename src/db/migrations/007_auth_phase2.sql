-- ============================================================
-- Auth security Phase 2: password history + login attempts
-- ============================================================

-- 1. Password history — prevents reuse of the last N passwords on change.
CREATE TABLE IF NOT EXISTS password_history (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pw_history_user ON password_history (user_id, created_at DESC);

-- 2. Login attempts — persistent audit + cross-restart rate limit state.
--    Success rows are kept for auditing; failure rows feed the hybrid
--    rate limiter that survives gateway restarts.
CREATE TABLE IF NOT EXISTS login_attempts (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip         TEXT NOT NULL,
  email      TEXT,
  success    INTEGER NOT NULL DEFAULT 0,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_login_attempts_ip_time ON login_attempts (ip, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_attempts_email_time ON login_attempts (email, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_attempts_created_at ON login_attempts (created_at);
