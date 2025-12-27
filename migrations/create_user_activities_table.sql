-- Create user_activities table for tracking user actions
-- This table stores activity logs for admin panel history

CREATE TABLE IF NOT EXISTS user_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  activity_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Index for efficient queries
  CONSTRAINT valid_activity_type CHECK (
    activity_type IN (
      'login',
      'signup',
      'game_played',
      'math_problem',
      'calculator_used',
      'shop_purchase',
      'level_complete',
      'high_score'
    )
  )
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_activities_user_id ON user_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activities_created_at ON user_activities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_activities_type ON user_activities(activity_type);

-- Add comment
COMMENT ON TABLE user_activities IS 'Tracks user activities for admin panel history and analytics';

