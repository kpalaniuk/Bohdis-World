-- Create word problems tables for Mad Libs style word problem generator
-- Users can create word problems with custom names/nouns/adjectives, computer generates numbers

-- Template types for different word problem structures
CREATE TABLE IF NOT EXISTS word_problem_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_name TEXT NOT NULL UNIQUE,
  template_text TEXT NOT NULL, -- Template with placeholders like {name1}, {noun1}, {adjective1}, {number1}
  difficulty_level INTEGER NOT NULL CHECK (difficulty_level >= 1 AND difficulty_level <= 10),
  problem_type TEXT NOT NULL, -- e.g., 'addition', 'subtraction', 'multiplication', 'division', 'multi-step'
  calculation_formula TEXT NOT NULL, -- JavaScript-like formula using {number1}, {number2}, etc.
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User's saved word problems (not shared)
CREATE TABLE IF NOT EXISTS user_problems (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  template_id UUID REFERENCES word_problem_templates(id) ON DELETE SET NULL,
  custom_words JSONB NOT NULL DEFAULT '{}', -- {name1: "Alice", noun1: "apples", adjective1: "red", ...}
  difficulty_level INTEGER NOT NULL CHECK (difficulty_level >= 1 AND difficulty_level <= 10),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Indexes
  CONSTRAINT valid_custom_words CHECK (jsonb_typeof(custom_words) = 'object')
);

-- Problems shared to the forum
CREATE TABLE IF NOT EXISTS forum_problems (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  template_id UUID REFERENCES word_problem_templates(id) ON DELETE SET NULL,
  custom_words JSONB NOT NULL DEFAULT '{}',
  difficulty_level INTEGER NOT NULL CHECK (difficulty_level >= 1 AND difficulty_level <= 10),
  is_active BOOLEAN DEFAULT TRUE, -- For soft deletion by admins
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_custom_words CHECK (jsonb_typeof(custom_words) = 'object')
);

-- Attempts to solve forum problems (for stats)
CREATE TABLE IF NOT EXISTS problem_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  problem_id UUID NOT NULL REFERENCES forum_problems(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  user_answer NUMERIC,
  correct_answer NUMERIC NOT NULL,
  is_correct BOOLEAN NOT NULL,
  generated_numbers JSONB NOT NULL, -- The numbers that were generated for this attempt
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Prevent duplicate attempts from same user (optional - can be removed if we want multiple attempts)
  UNIQUE(problem_id, user_id, created_at)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_problems_user_id ON user_problems(user_id);
CREATE INDEX IF NOT EXISTS idx_user_problems_difficulty ON user_problems(difficulty_level);
CREATE INDEX IF NOT EXISTS idx_forum_problems_active ON forum_problems(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_forum_problems_difficulty ON forum_problems(difficulty_level);
CREATE INDEX IF NOT EXISTS idx_forum_problems_created ON forum_problems(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_problem_attempts_problem_id ON problem_attempts(problem_id);
CREATE INDEX IF NOT EXISTS idx_problem_attempts_user_id ON problem_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_word_problem_templates_difficulty ON word_problem_templates(difficulty_level);

-- Add comments
COMMENT ON TABLE word_problem_templates IS 'Templates for word problems with placeholders for user customization';
COMMENT ON TABLE user_problems IS 'User-created word problems saved privately';
COMMENT ON TABLE forum_problems IS 'Word problems shared publicly on the forum';
COMMENT ON TABLE problem_attempts IS 'Tracks user attempts to solve forum problems for statistics';

