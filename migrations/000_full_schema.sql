-- Bohdi's World objects in the shared Kanons public schema.
-- This migration deliberately touches only bohdi_* objects.

CREATE TABLE IF NOT EXISTS bohdi_simple_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  display_name TEXT,
  role TEXT NOT NULL DEFAULT 'user' CONSTRAINT bohdi_simple_users_role_check CHECK (role IN ('user', 'admin', 'superuser')),
  can_gift_items BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login_at TIMESTAMPTZ,
  failed_login_count INTEGER NOT NULL DEFAULT 0,
  locked_until TIMESTAMPTZ
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_bohdi_simple_users_username ON bohdi_simple_users(username);

CREATE TABLE IF NOT EXISTS bohdi_user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  simple_user_id UUID UNIQUE CONSTRAINT bohdi_user_profiles_simple_user_id_fkey REFERENCES bohdi_simple_users(id) ON DELETE CASCADE,
  clerk_id TEXT,
  username TEXT,
  has_completed_gate BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_bohdi_user_profiles_simple_user_id ON bohdi_user_profiles(simple_user_id) WHERE simple_user_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS bohdi_user_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE CONSTRAINT bohdi_user_progress_user_id_fkey REFERENCES bohdi_user_profiles(id) ON DELETE CASCADE,
  coins INTEGER NOT NULL DEFAULT 0,
  total_earned INTEGER NOT NULL DEFAULT 0,
  high_score INTEGER NOT NULL DEFAULT 0,
  unlocked_themes TEXT[] NOT NULL DEFAULT ARRAY['default']::TEXT[],
  unlocked_powerups TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_bohdi_user_progress_user_id ON bohdi_user_progress(user_id);

CREATE TABLE IF NOT EXISTS bohdi_calculation_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL CONSTRAINT bohdi_calculation_history_user_id_fkey REFERENCES bohdi_user_profiles(id) ON DELETE CASCADE,
  expression TEXT NOT NULL,
  result TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_bohdi_calculation_history_user_created ON bohdi_calculation_history(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS bohdi_math_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL CONSTRAINT bohdi_math_history_user_id_fkey REFERENCES bohdi_user_profiles(id) ON DELETE CASCADE,
  grade_level TEXT NOT NULL,
  problem TEXT NOT NULL,
  user_answer TEXT,
  correct_answer TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL,
  coins_earned INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_bohdi_math_history_user_created ON bohdi_math_history(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS bohdi_user_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL CONSTRAINT bohdi_user_activities_user_id_fkey REFERENCES bohdi_user_profiles(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL CONSTRAINT bohdi_user_activities_type_check CHECK (activity_type IN ('login', 'signup', 'game_played', 'math_problem', 'calculator_used', 'shop_purchase', 'level_complete', 'high_score')),
  activity_data JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_bohdi_user_activities_user_id ON bohdi_user_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_bohdi_user_activities_created_at ON bohdi_user_activities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bohdi_user_activities_type ON bohdi_user_activities(activity_type);

CREATE TABLE IF NOT EXISTS bohdi_game_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL CONSTRAINT bohdi_game_settings_user_id_fkey REFERENCES bohdi_user_profiles(id) ON DELETE CASCADE,
  game_name TEXT NOT NULL,
  settings JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT bohdi_game_settings_user_game_key UNIQUE(user_id, game_name)
);
CREATE INDEX IF NOT EXISTS idx_bohdi_game_settings_user_id ON bohdi_game_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_bohdi_game_settings_game_name ON bohdi_game_settings(game_name);
CREATE INDEX IF NOT EXISTS idx_bohdi_game_settings_updated_at ON bohdi_game_settings(updated_at DESC);

CREATE TABLE IF NOT EXISTS bohdi_word_problem_templates (
  id TEXT PRIMARY KEY,
  template_name TEXT NOT NULL UNIQUE,
  template_text TEXT NOT NULL,
  difficulty_level INTEGER NOT NULL CONSTRAINT bohdi_word_problem_templates_difficulty_check CHECK (difficulty_level BETWEEN 1 AND 10),
  problem_type TEXT NOT NULL,
  calculation_formula TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bohdi_user_problems (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL CONSTRAINT bohdi_user_problems_user_id_fkey REFERENCES bohdi_user_profiles(id) ON DELETE CASCADE,
  template_id TEXT CONSTRAINT bohdi_user_problems_template_id_fkey REFERENCES bohdi_word_problem_templates(id) ON DELETE SET NULL,
  custom_words JSONB NOT NULL DEFAULT '{}'::JSONB CONSTRAINT bohdi_user_problems_custom_words_check CHECK (jsonb_typeof(custom_words) = 'object'),
  difficulty_level INTEGER NOT NULL CONSTRAINT bohdi_user_problems_difficulty_check CHECK (difficulty_level BETWEEN 1 AND 10),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bohdi_forum_problems (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL CONSTRAINT bohdi_forum_problems_user_id_fkey REFERENCES bohdi_user_profiles(id) ON DELETE CASCADE,
  template_id TEXT CONSTRAINT bohdi_forum_problems_template_id_fkey REFERENCES bohdi_word_problem_templates(id) ON DELETE SET NULL,
  custom_words JSONB NOT NULL DEFAULT '{}'::JSONB CONSTRAINT bohdi_forum_problems_custom_words_check CHECK (jsonb_typeof(custom_words) = 'object'),
  difficulty_level INTEGER NOT NULL CONSTRAINT bohdi_forum_problems_difficulty_check CHECK (difficulty_level BETWEEN 1 AND 10),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bohdi_problem_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  problem_id UUID NOT NULL CONSTRAINT bohdi_problem_attempts_problem_id_fkey REFERENCES bohdi_forum_problems(id) ON DELETE CASCADE,
  user_id UUID NOT NULL CONSTRAINT bohdi_problem_attempts_user_id_fkey REFERENCES bohdi_user_profiles(id) ON DELETE CASCADE,
  user_answer NUMERIC,
  correct_answer NUMERIC NOT NULL,
  is_correct BOOLEAN NOT NULL,
  generated_numbers JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT bohdi_problem_attempts_unique_attempt UNIQUE(problem_id, user_id, created_at)
);

CREATE INDEX IF NOT EXISTS idx_bohdi_user_problems_user_id ON bohdi_user_problems(user_id);
CREATE INDEX IF NOT EXISTS idx_bohdi_user_problems_difficulty ON bohdi_user_problems(difficulty_level);
CREATE INDEX IF NOT EXISTS idx_bohdi_forum_problems_active ON bohdi_forum_problems(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_bohdi_forum_problems_difficulty ON bohdi_forum_problems(difficulty_level);
CREATE INDEX IF NOT EXISTS idx_bohdi_forum_problems_created ON bohdi_forum_problems(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bohdi_problem_attempts_problem_id ON bohdi_problem_attempts(problem_id);
CREATE INDEX IF NOT EXISTS idx_bohdi_problem_attempts_user_id ON bohdi_problem_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_bohdi_word_problem_templates_difficulty ON bohdi_word_problem_templates(difficulty_level);

CREATE TABLE IF NOT EXISTS bohdi_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL CONSTRAINT bohdi_sessions_user_id_fkey REFERENCES bohdi_simple_users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_bohdi_sessions_token_hash ON bohdi_sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_bohdi_sessions_user_id ON bohdi_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_bohdi_sessions_expires_at ON bohdi_sessions(expires_at);

CREATE TABLE IF NOT EXISTS bohdi_login_failures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL CONSTRAINT bohdi_login_failures_user_id_fkey REFERENCES bohdi_simple_users(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  ip TEXT NOT NULL,
  failed_login_count INTEGER NOT NULL DEFAULT 0,
  locked_until TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT bohdi_login_failures_username_ip_key UNIQUE(username, ip)
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_bohdi_login_failures_username_ip ON bohdi_login_failures(username, ip);
CREATE INDEX IF NOT EXISTS idx_bohdi_login_failures_user_id ON bohdi_login_failures(user_id);

CREATE OR REPLACE FUNCTION bohdi_update_game_settings_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'bohdi_update_game_settings_timestamp') THEN
    CREATE TRIGGER bohdi_update_game_settings_timestamp
      BEFORE UPDATE ON bohdi_game_settings
      FOR EACH ROW EXECUTE FUNCTION bohdi_update_game_settings_updated_at();
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION bohdi_register_login_failure(p_user_id UUID, p_username TEXT, p_ip TEXT)
RETURNS TABLE(failed_login_count INTEGER, locked_until TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  failure_count INTEGER;
  failure_lock TIMESTAMPTZ;
BEGIN
  INSERT INTO bohdi_login_failures AS current_failure (user_id, username, ip, failed_login_count, locked_until, updated_at)
  VALUES (p_user_id, p_username, p_ip, 1, NULL, NOW())
  ON CONFLICT (username, ip) DO UPDATE SET
    user_id = EXCLUDED.user_id,
    failed_login_count = CASE
      WHEN current_failure.locked_until IS NOT NULL AND current_failure.locked_until <= NOW() THEN 1
      ELSE current_failure.failed_login_count + 1
    END,
    locked_until = CASE
      WHEN current_failure.locked_until IS NOT NULL AND current_failure.locked_until <= NOW() THEN NULL
      WHEN current_failure.failed_login_count + 1 >= 5 THEN NOW() + INTERVAL '5 minutes'
      ELSE current_failure.locked_until
    END,
    updated_at = NOW()
  RETURNING current_failure.failed_login_count, current_failure.locked_until INTO failure_count, failure_lock;

  UPDATE bohdi_simple_users
  SET failed_login_count = failure_count, locked_until = failure_lock
  WHERE id = p_user_id;

  RETURN QUERY SELECT failure_count, failure_lock;
END;
$$;

CREATE OR REPLACE FUNCTION bohdi_gift_coins(p_profile_id UUID, p_amount INTEGER)
RETURNS TABLE(new_balance INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  UPDATE bohdi_user_progress AS progress
  SET coins = GREATEST(0, progress.coins + p_amount),
      total_earned = CASE WHEN p_amount > 0 THEN progress.total_earned + p_amount ELSE progress.total_earned END,
      updated_at = NOW()
  WHERE progress.user_id = p_profile_id
  RETURNING progress.coins;
END;
$$;

INSERT INTO bohdi_word_problem_templates (id, template_name, template_text, difficulty_level, problem_type, calculation_formula)
VALUES
  ('add-simple', 'Simple Addition', 'Built-in application template', 1, 'addition', 'number1 + number2'),
  ('add-two-people', 'Adding Together', 'Built-in application template', 1, 'addition', 'number1 + number2'),
  ('subtract-simple', 'Simple Subtraction', 'Built-in application template', 2, 'subtraction', 'number1 - number2'),
  ('subtract-difference', 'Finding Difference', 'Built-in application template', 2, 'subtraction', 'number1 - number2'),
  ('multiply-groups', 'Groups Multiplication', 'Built-in application template', 3, 'multiplication', 'number1 * number2'),
  ('multiply-rows', 'Rows and Columns', 'Built-in application template', 3, 'multiplication', 'number1 * number2'),
  ('divide-sharing', 'Sharing Division', 'Built-in application template', 4, 'division', 'number1 / number2'),
  ('divide-grouping', 'Grouping Division', 'Built-in application template', 4, 'division', 'number1 / number2'),
  ('multistep-add-subtract', 'Multi-step Add/Subtract', 'Built-in application template', 5, 'multi-step', 'number1 + number2 - number3'),
  ('multistep-shopping', 'Multi-step Shopping', 'Built-in application template', 5, 'multi-step', 'number1 * number2 - number3'),
  ('percentage-discount', 'Percentage Discount', 'Built-in application template', 6, 'percentage', 'number1 * (1 - number2 / 100)'),
  ('fraction-part', 'Fraction Part', 'Built-in application template', 6, 'fraction', 'number1 / number2'),
  ('area-rectangle', 'Rectangle Area', 'Built-in application template', 7, 'geometry', 'number1 * number2'),
  ('perimeter-square', 'Square Perimeter', 'Built-in application template', 7, 'geometry', 'number1 * 4'),
  ('distance-rate-time', 'Distance Rate Time', 'Built-in application template', 8, 'rate', 'number1 * number2'),
  ('time-rate', 'Time and Rate', 'Built-in application template', 8, 'rate', 'number1 / number2'),
  ('complex-multistep', 'Complex Multi-step', 'Built-in application template', 9, 'multi-step', '(number1 + number2) * number3'),
  ('ratio-problem', 'Ratio Problem', 'Built-in application template', 10, 'ratio', 'number1 * number2')
ON CONFLICT DO NOTHING;

ALTER TABLE bohdi_simple_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE bohdi_user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE bohdi_user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE bohdi_calculation_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE bohdi_math_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE bohdi_user_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE bohdi_game_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE bohdi_word_problem_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE bohdi_user_problems ENABLE ROW LEVEL SECURITY;
ALTER TABLE bohdi_forum_problems ENABLE ROW LEVEL SECURITY;
ALTER TABLE bohdi_problem_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE bohdi_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bohdi_login_failures ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE bohdi_simple_users FROM anon, authenticated;
REVOKE ALL ON TABLE bohdi_user_profiles FROM anon, authenticated;
REVOKE ALL ON TABLE bohdi_user_progress FROM anon, authenticated;
REVOKE ALL ON TABLE bohdi_calculation_history FROM anon, authenticated;
REVOKE ALL ON TABLE bohdi_math_history FROM anon, authenticated;
REVOKE ALL ON TABLE bohdi_user_activities FROM anon, authenticated;
REVOKE ALL ON TABLE bohdi_game_settings FROM anon, authenticated;
REVOKE ALL ON TABLE bohdi_word_problem_templates FROM anon, authenticated;
REVOKE ALL ON TABLE bohdi_user_problems FROM anon, authenticated;
REVOKE ALL ON TABLE bohdi_forum_problems FROM anon, authenticated;
REVOKE ALL ON TABLE bohdi_problem_attempts FROM anon, authenticated;
REVOKE ALL ON TABLE bohdi_sessions FROM anon, authenticated;
REVOKE ALL ON TABLE bohdi_login_failures FROM anon, authenticated;

GRANT ALL ON TABLE bohdi_simple_users TO service_role;
GRANT ALL ON TABLE bohdi_user_profiles TO service_role;
GRANT ALL ON TABLE bohdi_user_progress TO service_role;
GRANT ALL ON TABLE bohdi_calculation_history TO service_role;
GRANT ALL ON TABLE bohdi_math_history TO service_role;
GRANT ALL ON TABLE bohdi_user_activities TO service_role;
GRANT ALL ON TABLE bohdi_game_settings TO service_role;
GRANT ALL ON TABLE bohdi_word_problem_templates TO service_role;
GRANT ALL ON TABLE bohdi_user_problems TO service_role;
GRANT ALL ON TABLE bohdi_forum_problems TO service_role;
GRANT ALL ON TABLE bohdi_problem_attempts TO service_role;
GRANT ALL ON TABLE bohdi_sessions TO service_role;
GRANT ALL ON TABLE bohdi_login_failures TO service_role;

REVOKE EXECUTE ON FUNCTION bohdi_update_game_settings_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION bohdi_register_login_failure(UUID, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION bohdi_gift_coins(UUID, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION bohdi_update_game_settings_updated_at() TO service_role;
GRANT EXECUTE ON FUNCTION bohdi_register_login_failure(UUID, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION bohdi_gift_coins(UUID, INTEGER) TO service_role;

