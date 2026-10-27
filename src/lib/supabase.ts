// Shared database result types. Database access lives exclusively in src/lib/server.
export interface UserProfile {
  id: string; clerk_id: string | null; simple_user_id: string | null; username: string | null;
  created_at: string; has_completed_gate: boolean;
}
export interface UserProgress {
  id: string; user_id: string; coins: number; total_earned: number; high_score: number;
  unlocked_themes: string[]; unlocked_powerups: string[]; updated_at: string;
}
export interface CalculationHistory { id: string; user_id: string; expression: string; result: string; created_at: string }
export interface MathHistory {
  id: string; user_id: string; grade_level: string; problem: string; user_answer: string | null;
  correct_answer: string; is_correct: boolean; coins_earned: number; created_at: string;
}

