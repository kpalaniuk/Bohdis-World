import { supabase, isSupabaseConfigured } from './supabase';

export interface GameSettings {
  id?: string;
  user_id: string;
  game_name: string;
  settings: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
}

export interface GameSettingsConfig {
  // Surfrider/GameCanvas
  surfrider?: {
    startingLives?: number;
    obstacleSpeed?: number;
    obstacleSpawnRate?: number;
    coinValue?: number;
    powerUpChance?: number;
  };
  
  // BrickBreaker
  brickBreaker?: {
    startingLives?: number;
    ballSpeed?: number;
    paddleSpeed?: number;
    brickRows?: number;
    brickCols?: number;
    powerUpChance?: number;
  };
  
  // Asteroids
  asteroids?: {
    startingLives?: number;
    shipSpeed?: number;
    asteroidSpeed?: number;
    asteroidCount?: number;
    bulletSpeed?: number;
    powerUpChance?: number;
  };
  
  // SkyClimber
  skyClimber?: {
    startingLives?: number;
    jumpStrength?: number;
    gravity?: number;
    spikeFrequency?: number;
    coinFrequency?: number;
  };
}

export async function getUserGameSettings(
  userId: string,
  gameName?: string
): Promise<GameSettings[]> {
  if (!isSupabaseConfigured() || !supabase) {
    return [];
  }

  try {
    // Get user profile to find profile ID
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('simple_user_id', userId)
      .single();

    if (!profile) {
      return [];
    }

    let query = supabase
      .from('game_settings')
      .select('*')
      .eq('user_id', profile.id);

    if (gameName) {
      query = query.eq('game_name', gameName);
    }

    const { data, error } = await query.order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching game settings:', error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('Error in getUserGameSettings:', err);
    return [];
  }
}

export async function setUserGameSettings(
  userId: string,
  gameName: string,
  settings: Record<string, unknown>
): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) {
    return false;
  }

  try {
    // Get user profile to find profile ID
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('simple_user_id', userId)
      .single();

    if (!profile) {
      return false;
    }

    // Check if settings exist
    const { data: existing } = await supabase
      .from('game_settings')
      .select('id')
      .eq('user_id', profile.id)
      .eq('game_name', gameName)
      .single();

    if (existing) {
      // Update existing
      const { error } = await supabase
        .from('game_settings')
        .update({
          settings,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);

      if (error) {
        console.error('Error updating game settings:', error);
        return false;
      }
    } else {
      // Create new
      const { error } = await supabase
        .from('game_settings')
        .insert({
          user_id: profile.id,
          game_name: gameName,
          settings,
        });

      if (error) {
        console.error('Error creating game settings:', error);
        return false;
      }
    }

    return true;
  } catch (err) {
    console.error('Error in setUserGameSettings:', err);
    return false;
  }
}

export async function getAllGameSettings(): Promise<Array<GameSettings & { username: string; display_name: string | null }>> {
  if (!isSupabaseConfigured() || !supabase) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('game_settings')
      .select(`
        *,
        user_profiles!inner(
          username,
          display_name,
          simple_user_id
        )
      `)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching all game settings:', error);
      return [];
    }

    return (data || []).map((setting: any) => ({
      ...setting,
      username: setting.user_profiles?.username || 'unknown',
      display_name: setting.user_profiles?.display_name || null,
    }));
  } catch (err) {
    console.error('Error in getAllGameSettings:', err);
    return [];
  }
}

export async function getGameSettingsForUser(
  userId: string,
  gameName: string
): Promise<Record<string, unknown> | null> {
  const settings = await getUserGameSettings(userId, gameName);
  if (settings.length > 0) {
    return settings[0].settings;
  }
  return null;
}

