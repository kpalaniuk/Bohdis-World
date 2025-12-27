-- Create game_settings table for storing per-user game configurations
-- This allows superusers to customize game parameters for individual users

CREATE TABLE IF NOT EXISTS game_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  game_name TEXT NOT NULL,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure one settings record per user per game
  UNIQUE(user_id, game_name)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_game_settings_user_id ON game_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_game_settings_game_name ON game_settings(game_name);
CREATE INDEX IF NOT EXISTS idx_game_settings_updated_at ON game_settings(updated_at DESC);

-- Add comment
COMMENT ON TABLE game_settings IS 'Stores per-user game configuration settings set by superusers';

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_game_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_game_settings_timestamp
  BEFORE UPDATE ON game_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_game_settings_updated_at();

