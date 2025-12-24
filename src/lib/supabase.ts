import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Create a null-safe supabase client
// If credentials are missing, supabase will be null and sync features won't work
export const supabase: SupabaseClient | null = 
  supabaseUrl && supabaseAnonKey 
    ? createClient(supabaseUrl, supabaseAnonKey) 
    : null;

export const isSupabaseConfigured = (): boolean => {
  return supabase !== null;
};

// Database types
export interface UserProfile {
  id: string;
  clerk_id: string;
  username: string | null;
  created_at: string;
  has_completed_gate: boolean;
}

export interface UserProgress {
  id: string;
  user_id: string;
  coins: number;
  total_earned: number;
  high_score: number;
  unlocked_themes: string[];
  unlocked_powerups: string[];
  updated_at: string;
}

export interface CalculationHistory {
  id: string;
  user_id: string;
  expression: string;
  result: string;
  created_at: string;
}

export interface MathHistory {
  id: string;
  user_id: string;
  grade_level: string;
  problem: string;
  user_answer: string | null;
  correct_answer: string;
  is_correct: boolean;
  coins_earned: number;
  created_at: string;
}

