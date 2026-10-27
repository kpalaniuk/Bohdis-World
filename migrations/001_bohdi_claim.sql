-- One-time Bohdi account claim objects. This migration touches only bohdi_* objects.

CREATE TABLE IF NOT EXISTS bohdi_app_secrets (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  expires_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bohdi_claim_attempts (
  ip TEXT PRIMARY KEY,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  locked_until TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION bohdi_register_claim_attempt(p_ip TEXT)
RETURNS TABLE(attempt_count INTEGER, locked_until TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_count INTEGER;
  next_lock TIMESTAMPTZ;
BEGIN
  INSERT INTO bohdi_claim_attempts AS current_attempt (ip, attempt_count, locked_until, updated_at)
  VALUES (p_ip, 1, NULL, NOW())
  ON CONFLICT (ip) DO UPDATE SET
    attempt_count = CASE
      WHEN current_attempt.locked_until IS NOT NULL AND current_attempt.locked_until <= NOW() THEN 1
      ELSE current_attempt.attempt_count + 1
    END,
    locked_until = CASE
      WHEN current_attempt.locked_until IS NOT NULL AND current_attempt.locked_until <= NOW() THEN NULL
      WHEN current_attempt.attempt_count + 1 >= 5 THEN NOW() + INTERVAL '5 minutes'
      ELSE current_attempt.locked_until
    END,
    updated_at = NOW()
  RETURNING current_attempt.attempt_count, current_attempt.locked_until INTO next_count, next_lock;

  RETURN QUERY SELECT next_count, next_lock;
END;
$$;

ALTER TABLE bohdi_app_secrets ENABLE ROW LEVEL SECURITY;
ALTER TABLE bohdi_claim_attempts ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE bohdi_app_secrets FROM anon, authenticated;
REVOKE ALL ON TABLE bohdi_claim_attempts FROM anon, authenticated;
GRANT ALL ON TABLE bohdi_app_secrets TO service_role;
GRANT ALL ON TABLE bohdi_claim_attempts TO service_role;

REVOKE EXECUTE ON FUNCTION bohdi_register_claim_attempt(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION bohdi_register_claim_attempt(TEXT) TO service_role;
