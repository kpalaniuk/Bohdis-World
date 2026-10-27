-- User-loaded and curated Elasto Mania level files. This migration touches only bohdi_* objects.

CREATE TABLE IF NOT EXISTS bohdi_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_profile_id UUID REFERENCES bohdi_user_profiles(id) ON DELETE CASCADE,
  shelf TEXT NOT NULL CHECK (shelf IN ('community', 'mine')),
  file_name TEXT NOT NULL,
  level_name TEXT NOT NULL,
  sha256 TEXT NOT NULL,
  bytes_b64 TEXT NOT NULL,
  size_bytes INTEGER NOT NULL CHECK (size_bytes >= 0 AND size_bytes <= 300000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT bohdi_levels_shelf_owner_check CHECK (
    (shelf = 'community' AND owner_profile_id IS NULL) OR
    (shelf = 'mine' AND owner_profile_id IS NOT NULL)
  ),
  UNIQUE (shelf, owner_profile_id, sha256)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_bohdi_levels_community_sha256
  ON bohdi_levels (sha256) WHERE shelf = 'community' AND owner_profile_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_bohdi_levels_owner_shelf_file
  ON bohdi_levels (owner_profile_id, shelf, file_name);

ALTER TABLE bohdi_levels ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE bohdi_levels FROM anon, authenticated;
GRANT ALL ON TABLE bohdi_levels TO service_role;
