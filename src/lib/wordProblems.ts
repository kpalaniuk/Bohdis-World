// Library functions for saving/loading word problems and forum posts

import { supabase, isSupabaseConfigured } from './supabase';
import { createAuthUserId, AuthUserId } from './syncProgress';
import { WordProblem, CustomWords, GeneratedNumbers } from '@/components/math/WordProblemGenerator';

export interface UserProblem {
  id: string;
  user_id: string;
  template_id: string | null;
  custom_words: CustomWords;
  difficulty_level: number;
  created_at: string;
  updated_at: string;
}

export interface ForumProblem {
  id: string;
  user_id: string;
  template_id: string | null;
  custom_words: CustomWords;
  difficulty_level: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Joined data
  username?: string;
  display_name?: string;
  attempt_count?: number;
  correct_count?: number;
}

export interface ProblemAttempt {
  id: string;
  problem_id: string;
  user_id: string;
  user_answer: number | null;
  correct_answer: number;
  is_correct: boolean;
  generated_numbers: GeneratedNumbers;
  created_at: string;
  // Joined data
  username?: string;
  display_name?: string;
}

// Save a user problem
export async function saveUserProblem(
  userId: AuthUserId,
  templateId: string | null,
  customWords: CustomWords,
  difficultyLevel: number
): Promise<{ success: boolean; problemId?: string; error?: string }> {
  if (!isSupabaseConfigured() || !supabase) {
    return { success: false, error: 'Database not configured' };
  }

  try {
    const { data, error } = await supabase
      .from('user_problems')
      .insert({
        user_id: userId.id,
        template_id: templateId,
        custom_words: customWords,
        difficulty_level: difficultyLevel,
      })
      .select('id')
      .single();

    if (error) {
      // Handle case where table doesn't exist yet
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        return { success: false, error: 'Database tables not set up. Please run the migration first.' };
      }
      console.error('Error saving user problem:', error);
      return { success: false, error: error.message || 'Failed to save problem' };
    }

    return { success: true, problemId: data.id };
  } catch (err: any) {
    // Handle case where table doesn't exist
    if (err?.code === '42P01' || err?.message?.includes('does not exist')) {
      return { success: false, error: 'Database tables not set up. Please run the migration first.' };
    }
    console.error('Error in saveUserProblem:', err);
    return { success: false, error: err?.message || 'Failed to save problem' };
  }
}

// Load user's saved problems
export async function loadUserProblems(
  userId: AuthUserId
): Promise<{ success: boolean; problems?: UserProblem[]; error?: string }> {
  if (!isSupabaseConfigured() || !supabase) {
    return { success: false, error: 'Database not configured' };
  }

  try {
    const { data, error } = await supabase
      .from('user_problems')
      .select('*')
      .eq('user_id', userId.id)
      .order('created_at', { ascending: false });

    if (error) {
      // Handle case where table doesn't exist yet (migration not run)
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        console.warn('User problems table does not exist yet. Run the migration first.');
        return { success: true, problems: [] }; // Return empty array instead of error
      }
      console.error('Error loading user problems:', error);
      return { success: false, error: error.message || 'Failed to load problems' };
    }

    return { success: true, problems: data || [] };
  } catch (err: any) {
    // Handle case where table doesn't exist
    if (err?.code === '42P01' || err?.message?.includes('does not exist')) {
      console.warn('User problems table does not exist yet. Run the migration first.');
      return { success: true, problems: [] }; // Return empty array instead of error
    }
    console.error('Error in loadUserProblems:', err);
    return { success: false, error: err?.message || 'Failed to load problems' };
  }
}

// Delete a user problem
export async function deleteUserProblem(
  userId: AuthUserId,
  problemId: string
): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured() || !supabase) {
    return { success: false, error: 'Database not configured' };
  }

  try {
    const { error } = await supabase
      .from('user_problems')
      .delete()
      .eq('id', problemId)
      .eq('user_id', userId.id); // Ensure user owns the problem

    if (error) {
      console.error('Error deleting user problem:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error('Error in deleteUserProblem:', err);
    return { success: false, error: 'Failed to delete problem' };
  }
}

// Post a problem to the forum
export async function postToForum(
  userId: AuthUserId,
  templateId: string | null,
  customWords: CustomWords,
  difficultyLevel: number
): Promise<{ success: boolean; problemId?: string; error?: string }> {
  if (!isSupabaseConfigured() || !supabase) {
    return { success: false, error: 'Database not configured' };
  }

  try {
    const { data, error } = await supabase
      .from('forum_problems')
      .insert({
        user_id: userId.id,
        template_id: templateId,
        custom_words: customWords,
        difficulty_level: difficultyLevel,
        is_active: true,
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error posting to forum:', error);
      return { success: false, error: error.message };
    }

    return { success: true, problemId: data.id };
  } catch (err) {
    console.error('Error in postToForum:', err);
    return { success: false, error: 'Failed to post to forum' };
  }
}

// Load forum problems
export async function loadForumProblems(
  difficultyLevel?: number,
  limit: number = 50
): Promise<{ success: boolean; problems?: ForumProblem[]; error?: string }> {
  if (!isSupabaseConfigured() || !supabase) {
    return { success: false, error: 'Database not configured' };
  }

  try {
    let query = supabase
      .from('forum_problems')
      .select(`
        *,
        user_profiles!forum_problems_user_id_fkey(username, display_name)
      `)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (difficultyLevel !== undefined) {
      query = query.eq('difficulty_level', difficultyLevel);
    }

    const { data, error } = await query;

    if (error) {
      // Handle case where table doesn't exist yet
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        console.warn('Forum problems table does not exist yet. Run the migration first.');
        return { success: true, problems: [] }; // Return empty array instead of error
      }
      console.error('Error loading forum problems:', error);
      return { success: false, error: error.message || 'Failed to load forum problems' };
    }

    // Transform the data to include username/display_name
    const problems: ForumProblem[] = (data || []).map((p: any) => {
      const profile = Array.isArray(p.user_profiles) ? p.user_profiles[0] : p.user_profiles;
      return {
        ...p,
        username: profile?.username,
        display_name: profile?.display_name,
      };
    });

    // Load attempt stats for each problem
    const problemsWithStats = await Promise.all(
      problems.map(async (problem) => {
        const stats = await getProblemStats(problem.id);
        return {
          ...problem,
          attempt_count: stats.attemptCount,
          correct_count: stats.correctCount,
        };
      })
    );

    return { success: true, problems: problemsWithStats };
  } catch (err) {
    console.error('Error in loadForumProblems:', err);
    return { success: false, error: 'Failed to load forum problems' };
  }
}

// Get stats for a forum problem
export async function getProblemStats(
  problemId: string
): Promise<{ attemptCount: number; correctCount: number }> {
  if (!isSupabaseConfigured() || !supabase) {
    return { attemptCount: 0, correctCount: 0 };
  }

  try {
    const { data, error } = await supabase
      .from('problem_attempts')
      .select('is_correct')
      .eq('problem_id', problemId);

    if (error || !data) {
      return { attemptCount: 0, correctCount: 0 };
    }

    return {
      attemptCount: data.length,
      correctCount: data.filter(a => a.is_correct).length,
    };
  } catch (err) {
    return { attemptCount: 0, correctCount: 0 };
  }
}

// Submit an attempt to solve a forum problem
export async function submitProblemAttempt(
  userId: AuthUserId,
  problemId: string,
  userAnswer: number,
  correctAnswer: number,
  generatedNumbers: GeneratedNumbers
): Promise<{ success: boolean; isCorrect?: boolean; error?: string }> {
  if (!isSupabaseConfigured() || !supabase) {
    return { success: false, error: 'Database not configured' };
  }

  const isCorrect = Math.abs(userAnswer - correctAnswer) < 0.01; // Allow small floating point differences

  try {
    const { error } = await supabase
      .from('problem_attempts')
      .insert({
        problem_id: problemId,
        user_id: userId.id,
        user_answer: userAnswer,
        correct_answer: correctAnswer,
        is_correct: isCorrect,
        generated_numbers: generatedNumbers,
      });

    if (error) {
      console.error('Error submitting attempt:', error);
      return { success: false, error: error.message };
    }

    return { success: true, isCorrect };
  } catch (err) {
    console.error('Error in submitProblemAttempt:', err);
    return { success: false, error: 'Failed to submit attempt' };
  }
}

// Delete a forum problem (admin only)
export async function deleteForumProblem(
  problemId: string
): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured() || !supabase) {
    return { success: false, error: 'Database not configured' };
  }

  try {
    // Soft delete by setting is_active to false
    const { error } = await supabase
      .from('forum_problems')
      .update({ is_active: false })
      .eq('id', problemId);

    if (error) {
      console.error('Error deleting forum problem:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error('Error in deleteForumProblem:', err);
    return { success: false, error: 'Failed to delete problem' };
  }
}

// Get attempts for a specific problem
export async function getProblemAttempts(
  problemId: string
): Promise<{ success: boolean; attempts?: ProblemAttempt[]; error?: string }> {
  if (!isSupabaseConfigured() || !supabase) {
    return { success: false, error: 'Database not configured' };
  }

  try {
    const { data, error } = await supabase
      .from('problem_attempts')
      .select(`
        *,
        user_profiles!problem_attempts_user_id_fkey(username, display_name)
      `)
      .eq('problem_id', problemId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading attempts:', error);
      return { success: false, error: error.message };
    }

    const attempts: ProblemAttempt[] = (data || []).map((a: any) => {
      const profile = Array.isArray(a.user_profiles) ? a.user_profiles[0] : a.user_profiles;
      return {
        ...a,
        username: profile?.username,
        display_name: profile?.display_name,
      };
    });

    return { success: true, attempts };
  } catch (err) {
    console.error('Error in getProblemAttempts:', err);
    return { success: false, error: 'Failed to load attempts' };
  }
}

