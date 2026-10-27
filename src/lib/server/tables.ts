export const TABLES = {
  simpleUsers: 'bohdi_simple_users',
  userProfiles: 'bohdi_user_profiles',
  userProgress: 'bohdi_user_progress',
  sessions: 'bohdi_sessions',
  loginFailures: 'bohdi_login_failures',
  appSecrets: 'bohdi_app_secrets',
  claimAttempts: 'bohdi_claim_attempts',
  calculationHistory: 'bohdi_calculation_history',
  mathHistory: 'bohdi_math_history',
  userActivities: 'bohdi_user_activities',
  gameSettings: 'bohdi_game_settings',
  wordProblemTemplates: 'bohdi_word_problem_templates',
  userProblems: 'bohdi_user_problems',
  forumProblems: 'bohdi_forum_problems',
  problemAttempts: 'bohdi_problem_attempts',
  levels: 'bohdi_levels',
} as const;

export const RPC = {
  registerLoginFailure: 'bohdi_register_login_failure',
  registerClaimAttempt: 'bohdi_register_claim_attempt',
  giftCoins: 'bohdi_gift_coins',
} as const;

export const EMBEDS = {
  forumProblemAuthor: '*, bohdi_user_profiles!bohdi_forum_problems_user_id_fkey(username, bohdi_simple_users!inner(display_name))',
  attemptAuthor: '*, bohdi_user_profiles!bohdi_problem_attempts_user_id_fkey(username, bohdi_simple_users!inner(display_name))',
  activityUser: '*, bohdi_user_profiles!inner(username, bohdi_simple_users!inner(display_name))',
  gameSettingsUser: '*, bohdi_user_profiles!inner(username, simple_user_id, bohdi_simple_users!inner(display_name))',
} as const;

export const TABLE_COLUMNS: Record<string, readonly string[]> = {
  [TABLES.simpleUsers]: ['id', 'username', 'password_hash', 'display_name', 'role', 'can_gift_items', 'created_at', 'last_login_at', 'failed_login_count', 'locked_until'],
  [TABLES.userProfiles]: ['id', 'simple_user_id', 'clerk_id', 'username', 'has_completed_gate', 'created_at'],
  [TABLES.userProgress]: ['id', 'user_id', 'coins', 'total_earned', 'high_score', 'unlocked_themes', 'unlocked_powerups', 'updated_at'],
  [TABLES.sessions]: ['id', 'user_id', 'token_hash', 'created_at', 'expires_at', 'last_seen_at'],
  [TABLES.loginFailures]: ['id', 'user_id', 'username', 'ip', 'failed_login_count', 'locked_until', 'updated_at'],
  [TABLES.appSecrets]: ['key', 'value', 'expires_at', 'updated_at'],
  [TABLES.claimAttempts]: ['ip', 'attempt_count', 'locked_until', 'updated_at'],
  [TABLES.calculationHistory]: ['id', 'user_id', 'expression', 'result', 'created_at'],
  [TABLES.mathHistory]: ['id', 'user_id', 'grade_level', 'problem', 'user_answer', 'correct_answer', 'is_correct', 'coins_earned', 'created_at'],
  [TABLES.userActivities]: ['id', 'user_id', 'activity_type', 'activity_data', 'created_at'],
  [TABLES.gameSettings]: ['id', 'user_id', 'game_name', 'settings', 'created_at', 'updated_at'],
  [TABLES.wordProblemTemplates]: ['id', 'template_name', 'template_text', 'difficulty_level', 'problem_type', 'calculation_formula', 'created_at'],
  [TABLES.userProblems]: ['id', 'user_id', 'template_id', 'custom_words', 'difficulty_level', 'created_at', 'updated_at'],
  [TABLES.forumProblems]: ['id', 'user_id', 'template_id', 'custom_words', 'difficulty_level', 'is_active', 'created_at', 'updated_at'],
  [TABLES.problemAttempts]: ['id', 'problem_id', 'user_id', 'user_answer', 'correct_answer', 'is_correct', 'generated_numbers', 'created_at'],
  [TABLES.levels]: ['id', 'owner_profile_id', 'shelf', 'file_name', 'level_name', 'sha256', 'bytes_b64', 'size_bytes', 'created_at'],
};
