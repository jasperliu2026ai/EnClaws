-- ============================================================
-- Auth security Phase 3: sessions / email verification / MFA
-- ============================================================

-- 1. refresh_tokens: track last-used time so the sessions UI can
--    order devices by recency, and persist a reference IP so the
--    list shows "Shanghai · Chrome on macOS" style metadata.
ALTER TABLE refresh_tokens ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMPTZ;
ALTER TABLE refresh_tokens ADD COLUMN IF NOT EXISTS ip_address TEXT;

ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_secret TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_enabled INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_backup_codes TEXT;
