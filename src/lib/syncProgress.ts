import { supabase, isSupabaseConfigured, UserProfile, UserProgress } from './supabase';
import { GameTheme, PowerUp } from '@/stores/gameStore';

// Debounce helper
let saveTimeout: NodeJS.Timeout | null = null;

// Auth user type - works with both Clerk IDs and simple user IDs
export interface AuthUserId {
  type: 'clerk' | 'simple';
  id: string;
}

export async function getOrCreateUserProfile(
  userId: AuthUserId, 
  username?: string
): Promise<UserProfile | null> {
  if (!isSupabaseConfigured() || !supabase) {
    return null;
  }

  // Build the query based on auth type
  const idColumn = userId.type === 'clerk' ? 'clerk_id' : 'simple_user_id';

  // Try to get existing profile
  const { data: existingProfile, error: fetchError } = await supabase
    .from('user_profiles')
    .select('*')
    .eq(idColumn, userId.id)
    .single();

  if (existingProfile) {
    return existingProfile;
  }

  // Create new profile if doesn't exist
  if (fetchError?.code === 'PGRST116') {
    const insertData = userId.type === 'clerk' 
      ? { clerk_id: userId.id, username: username || null }
      : { simple_user_id: userId.id, username: username || null };

    const { data: newProfile, error: createError } = await supabase
      .from('user_profiles')
      .insert(insertData)
      .select()
      .single();

    if (createError) {
      console.error('Error creating user profile:', createError);
      return null;
    }

    // Also create initial progress record
    if (newProfile) {
      await supabase.from('user_progress').insert({
        user_id: newProfile.id,
        coins: 0,
        total_earned: 0,
        high_score: 0,
        unlocked_themes: ['default'],
        unlocked_powerups: [],
      });
    }

    return newProfile;
  }

  console.error('Error fetching user profile:', fetchError);
  return null;
}

// Legacy function for backward compatibility
export async function getOrCreateUserProfileByClerkId(
  clerkId: string, 
  username?: string
): Promise<UserProfile | null> {
  return getOrCreateUserProfile({ type: 'clerk', id: clerkId }, username);
}

export async function loadUserProgress(userId: AuthUserId): Promise<{
  profile: UserProfile | null;
  progress: UserProgress | null;
}> {
  if (!isSupabaseConfigured() || !supabase) {
    return { profile: null, progress: null };
  }

  const profile = await getOrCreateUserProfile(userId);
  
  if (!profile) {
    return { profile: null, progress: null };
  }

  const { data: progress, error } = await supabase
    .from('user_progress')
    .select('*')
    .eq('user_id', profile.id)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching user progress:', error);
  }

  return { profile, progress };
}

export async function saveUserProgress(
  userId: AuthUserId,
  data: {
    coins?: number;
    totalEarned?: number;
    highScore?: number;
    unlockedThemes?: GameTheme[];
    ownedPowerUps?: Record<PowerUp, number>;
    hasCompletedGate?: boolean;
  }
): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) {
    return false;
  }

  // Clear any pending save
  if (saveTimeout) {
    clearTimeout(saveTimeout);
  }

  // Debounce saves to avoid too many requests
  return new Promise((resolve) => {
    saveTimeout = setTimeout(async () => {
      try {
        const profile = await getOrCreateUserProfile(userId);
        if (!profile || !supabase) {
          resolve(false);
          return;
        }

        // Update profile if gate completion changed
        if (data.hasCompletedGate !== undefined) {
          await supabase
            .from('user_profiles')
            .update({ has_completed_gate: data.hasCompletedGate })
            .eq('id', profile.id);
        }

        // Build progress update object
        const progressUpdate: Record<string, unknown> = {
          updated_at: new Date().toISOString(),
        };

        if (data.coins !== undefined) progressUpdate.coins = data.coins;
        if (data.totalEarned !== undefined) progressUpdate.total_earned = data.totalEarned;
        if (data.highScore !== undefined) progressUpdate.high_score = data.highScore;
        if (data.unlockedThemes !== undefined) progressUpdate.unlocked_themes = data.unlockedThemes;
        if (data.ownedPowerUps !== undefined) {
          // Convert power-ups to array format for storage
          progressUpdate.unlocked_powerups = Object.entries(data.ownedPowerUps)
            .flatMap(([key, count]) => Array(count).fill(key));
        }

        const { error } = await supabase
          .from('user_progress')
          .update(progressUpdate)
          .eq('user_id', profile.id);

        if (error) {
          console.error('Error saving user progress:', error);
          resolve(false);
          return;
        }

        resolve(true);
      } catch (err) {
        console.error('Error in saveUserProgress:', err);
        resolve(false);
      }
    }, 1000); // 1 second debounce
  });
}

export interface LocalProgress {
  coins: number;
  totalEarned: number;
  highScore: number;
  unlockedThemes: GameTheme[];
  ownedPowerUps: Record<PowerUp, number>;
  hasCompletedGate: boolean;
}

export interface CloudProgress {
  coins: number;
  total_earned: number;
  high_score: number;
  unlocked_themes: string[];
  unlocked_powerups: string[];
  has_completed_gate: boolean;
}

export function mergeProgress(local: LocalProgress, cloud: CloudProgress): LocalProgress {
  // Take the maximum values
  const mergedCoins = Math.max(local.coins, cloud.coins);
  const mergedTotalEarned = Math.max(local.totalEarned, cloud.total_earned);
  const mergedHighScore = Math.max(local.highScore, cloud.high_score);
  
  // Merge unlocked themes (union)
  const mergedThemes = [...new Set([
    ...local.unlockedThemes,
    ...(cloud.unlocked_themes as GameTheme[]),
  ])];
  
  // Merge power-ups (take max of each)
  const cloudPowerUps = countPowerUps(cloud.unlocked_powerups as PowerUp[]);
  const mergedPowerUps: Record<PowerUp, number> = {
    'double-jump': Math.max(local.ownedPowerUps['double-jump'], cloudPowerUps['double-jump']),
    'shield': Math.max(local.ownedPowerUps['shield'], cloudPowerUps['shield']),
    'slow-mo': Math.max(local.ownedPowerUps['slow-mo'], cloudPowerUps['slow-mo']),
  };
  
  // Gate completion - if either is true, it's true
  const mergedGateCompleted = local.hasCompletedGate || cloud.has_completed_gate;

  return {
    coins: mergedCoins,
    totalEarned: mergedTotalEarned,
    highScore: mergedHighScore,
    unlockedThemes: mergedThemes,
    ownedPowerUps: mergedPowerUps,
    hasCompletedGate: mergedGateCompleted,
  };
}

function countPowerUps(powerUps: PowerUp[]): Record<PowerUp, number> {
  const counts: Record<PowerUp, number> = {
    'double-jump': 0,
    'shield': 0,
    'slow-mo': 0,
  };
  
  for (const powerUp of powerUps) {
    if (powerUp in counts) {
      counts[powerUp]++;
    }
  }
  
  return counts;
}

// Save calculation to history
export async function saveCalculation(
  userId: AuthUserId,
  expression: string,
  result: string
): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) {
    return false;
  }

  try {
    const profile = await getOrCreateUserProfile(userId);
    if (!profile) return false;

    const { error } = await supabase.from('calculation_history').insert({
      user_id: profile.id,
      expression,
      result,
    });

    if (error) {
      console.error('Error saving calculation:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Error in saveCalculation:', err);
    return false;
  }
}

// Get calculation history
export async function getCalculationHistory(userId: AuthUserId, limit = 5) {
  if (!isSupabaseConfigured() || !supabase) {
    return [];
  }

  try {
    const profile = await getOrCreateUserProfile(userId);
    if (!profile) return [];

    const { data, error } = await supabase
      .from('calculation_history')
      .select('*')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching calculation history:', error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('Error in getCalculationHistory:', err);
    return [];
  }
}

// Save math problem attempt
export async function saveMathAttempt(
  userId: AuthUserId,
  gradeLevel: string,
  problem: string,
  userAnswer: string | null,
  correctAnswer: string,
  isCorrect: boolean,
  coinsEarned: number
): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) {
    return false;
  }

  try {
    const profile = await getOrCreateUserProfile(userId);
    if (!profile) return false;

    const { error } = await supabase.from('math_history').insert({
      user_id: profile.id,
      grade_level: gradeLevel,
      problem,
      user_answer: userAnswer,
      correct_answer: correctAnswer,
      is_correct: isCorrect,
      coins_earned: coinsEarned,
    });

    if (error) {
      console.error('Error saving math attempt:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Error in saveMathAttempt:', err);
    return false;
  }
}

// Helper to create AuthUserId from auth context
export function createAuthUserId(
  authMethod: 'clerk' | 'simple' | null, 
  userId: string
): AuthUserId | null {
  if (!authMethod || !userId) return null;
  return { type: authMethod, id: userId };
}
