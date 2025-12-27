import { supabase, isSupabaseConfigured } from './supabase';

export type ActivityType = 
  | 'login'
  | 'signup'
  | 'game_played'
  | 'math_problem'
  | 'calculator_used'
  | 'shop_purchase'
  | 'level_complete'
  | 'high_score';

export interface UserActivity {
  id: string;
  user_id: string;
  activity_type: ActivityType;
  activity_data: Record<string, unknown>;
  created_at: string;
}

export async function logActivity(
  userId: string,
  activityType: ActivityType,
  activityData: Record<string, unknown> = {}
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

    const { error } = await supabase
      .from('user_activities')
      .insert({
        user_id: profile.id,
        activity_type: activityType,
        activity_data: activityData,
      });

    if (error) {
      // Silently fail if table doesn't exist yet - activity tracking is optional
      if (error.code === '42P01') {
        console.warn('user_activities table does not exist. Run migration to enable activity tracking.');
      } else {
        console.error('Error logging activity:', error);
      }
      return false;
    }

    return true;
  } catch (err) {
    // Silently fail - activity tracking is optional
    console.warn('Error in logActivity (non-critical):', err);
    return false;
  }
}

export async function getUserActivities(
  userId: string,
  limit: number = 50
): Promise<UserActivity[]> {
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

    const { data, error } = await supabase
      .from('user_activities')
      .select('*')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching activities:', error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('Error in getUserActivities:', err);
    return [];
  }
}

export async function getAllUserActivities(limit: number = 100): Promise<Array<UserActivity & { username: string; display_name: string | null }>> {
  if (!isSupabaseConfigured() || !supabase) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('user_activities')
      .select(`
        *,
        user_profiles!inner(
          username,
          display_name,
          simple_user_id
        )
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching all activities:', error);
      return [];
    }

    return (data || []).map((activity: any) => ({
      ...activity,
      username: activity.user_profiles?.username || 'unknown',
      display_name: activity.user_profiles?.display_name || null,
    }));
  } catch (err) {
    console.error('Error in getAllUserActivities:', err);
    return [];
  }
}

