import { supabase, isSupabaseConfigured } from './supabase';

export type UserRole = 'user' | 'admin' | 'superuser';

export interface SimpleUser {
  id: string;
  username: string;
  display_name: string | null;
  created_at: string;
  role: UserRole;
  can_gift_items: boolean;
}

export function isAdmin(user: SimpleUser | null): boolean {
  return user?.role === 'admin' || user?.role === 'superuser';
}

export function isSuperuser(user: SimpleUser | null): boolean {
  return user?.role === 'superuser';
}

// Simple hash function for passwords (not cryptographically secure, but sufficient for a kid's game)
// For production, you'd want bcrypt on a server
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + 'bohdi_salt_2024');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const inputHash = await hashPassword(password);
  return inputHash === hash;
}

export async function signUpSimple(
  username: string, 
  password: string, 
  displayName?: string
): Promise<{ user: SimpleUser | null; error: string | null }> {
  if (!isSupabaseConfigured() || !supabase) {
    return { user: null, error: 'Database not configured' };
  }

  // Validate username
  const cleanUsername = username.toLowerCase().trim();
  if (cleanUsername.length < 3) {
    return { user: null, error: 'Username must be at least 3 characters' };
  }
  if (!/^[a-z0-9_]+$/.test(cleanUsername)) {
    return { user: null, error: 'Username can only contain letters, numbers, and underscores' };
  }

  // Validate password
  if (password.length < 4) {
    return { user: null, error: 'Password must be at least 4 characters' };
  }

  try {
    // Check if username exists
    const { data: existing } = await supabase
      .from('simple_users')
      .select('id')
      .eq('username', cleanUsername)
      .single();

    if (existing) {
      return { user: null, error: 'Username already taken' };
    }

    // Hash password and create user
    const passwordHash = await hashPassword(password);
    
    const { data: newUser, error: createError } = await supabase
      .from('simple_users')
      .insert({
        username: cleanUsername,
        password_hash: passwordHash,
        display_name: displayName || cleanUsername,
        role: 'user',
        can_gift_items: false,
      })
      .select('id, username, display_name, created_at, role, can_gift_items')
      .single();

    if (createError) {
      console.error('Error creating user:', createError);
      return { user: null, error: 'Failed to create account' };
    }

    // Create user profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .insert({
        simple_user_id: newUser.id,
        username: cleanUsername,
      })
      .select()
      .single();

    // Create initial progress
    if (profile) {
      await supabase.from('user_progress').insert({
        user_id: profile.id,
        coins: 0,
        total_earned: 0,
        high_score: 0,
        unlocked_themes: ['default'],
        unlocked_powerups: [],
      });
    }

    return { user: newUser as SimpleUser, error: null };
  } catch (err) {
    console.error('Signup error:', err);
    return { user: null, error: 'Something went wrong' };
  }
}

export async function signInSimple(
  username: string, 
  password: string
): Promise<{ user: SimpleUser | null; error: string | null }> {
  if (!isSupabaseConfigured() || !supabase) {
    return { user: null, error: 'Database not configured' };
  }

  const cleanUsername = username.toLowerCase().trim();

  try {
    // Get user by username
    const { data: user, error: fetchError } = await supabase
      .from('simple_users')
      .select('id, username, display_name, password_hash, created_at, role, can_gift_items')
      .eq('username', cleanUsername)
      .single();

    if (fetchError || !user) {
      return { user: null, error: 'Invalid username or password' };
    }

    // Verify password
    const isValid = await verifyPassword(password, user.password_hash);
    if (!isValid) {
      return { user: null, error: 'Invalid username or password' };
    }

    // Update last login
    await supabase
      .from('simple_users')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', user.id);

    // Return user without password hash
    const { password_hash: _, ...safeUser } = user;
    return { user: safeUser as SimpleUser, error: null };
  } catch (err) {
    console.error('Sign in error:', err);
    return { user: null, error: 'Something went wrong' };
  }
}

export async function getSimpleUserProfile(userId: string) {
  if (!isSupabaseConfigured() || !supabase) {
    return null;
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('simple_user_id', userId)
    .single();

  return profile;
}

// Local storage helpers for session management
const SESSION_KEY = 'bohdi_simple_user';

export function saveSession(user: SimpleUser) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  }
}

export function getSession(): SimpleUser | null {
  if (typeof window !== 'undefined') {
    const data = localStorage.getItem(SESSION_KEY);
    if (data) {
      try {
        return JSON.parse(data);
      } catch {
        return null;
      }
    }
  }
  return null;
}

export function clearSession() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(SESSION_KEY);
  }
}

// ================================
// ADMIN FUNCTIONS
// ================================

export interface AdminUserView {
  id: string;
  username: string;
  display_name: string | null;
  role: UserRole;
  can_gift_items: boolean;
  created_at: string;
  last_login_at: string | null;
  profile?: {
    id: string;
    has_completed_gate: boolean;
  };
  progress?: {
    coins: number;
    total_earned: number;
    high_score: number;
    unlocked_themes: string[];
    unlocked_powerups: string[];
  };
}

export async function getAllUsers(): Promise<AdminUserView[]> {
  if (!isSupabaseConfigured() || !supabase) {
    return [];
  }

  try {
    const { data: users, error } = await supabase
      .from('simple_users')
      .select(`
        id,
        username,
        display_name,
        role,
        can_gift_items,
        created_at,
        last_login_at
      `)
      .order('created_at', { ascending: false });

    if (error || !users) {
      console.error('Error fetching users:', error);
      return [];
    }

    // Fetch profiles and progress for each user
    const usersWithDetails: AdminUserView[] = await Promise.all(
      users.map(async (user) => {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('id, has_completed_gate')
          .eq('simple_user_id', user.id)
          .single();

        let progress = null;
        if (profile) {
          const { data: progressData } = await supabase
            .from('user_progress')
            .select('coins, total_earned, high_score, unlocked_themes, unlocked_powerups')
            .eq('user_id', profile.id)
            .single();
          progress = progressData;
        }

        return {
          ...user,
          profile: profile || undefined,
          progress: progress || undefined,
        };
      })
    );

    return usersWithDetails;
  } catch (err) {
    console.error('Error in getAllUsers:', err);
    return [];
  }
}

export async function giftCoins(
  adminUser: SimpleUser,
  targetUserId: string,
  amount: number,
  reason?: string
): Promise<{ success: boolean; error: string | null; newBalance?: number }> {
  if (!isSupabaseConfigured() || !supabase) {
    return { success: false, error: 'Database not configured' };
  }

  // Verify admin has permission
  if (!adminUser.can_gift_items && !isAdmin(adminUser)) {
    return { success: false, error: 'You do not have permission to gift coins' };
  }

  try {
    // Get the user's profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('simple_user_id', targetUserId)
      .single();

    if (!profile) {
      return { success: false, error: 'User profile not found' };
    }

    // Get current progress
    const { data: progress } = await supabase
      .from('user_progress')
      .select('coins, total_earned')
      .eq('user_id', profile.id)
      .single();

    if (!progress) {
      return { success: false, error: 'User progress not found' };
    }

    const newCoins = Math.max(0, progress.coins + amount);
    const newTotalEarned = amount > 0 ? progress.total_earned + amount : progress.total_earned;

    // Update progress
    const { error: updateError } = await supabase
      .from('user_progress')
      .update({
        coins: newCoins,
        total_earned: newTotalEarned,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', profile.id);

    if (updateError) {
      console.error('Error gifting coins:', updateError);
      return { success: false, error: 'Failed to gift coins' };
    }

    console.log(`Admin ${adminUser.username} gifted ${amount} coins to user ${targetUserId}. Reason: ${reason || 'N/A'}`);
    return { success: true, error: null, newBalance: newCoins };
  } catch (err) {
    console.error('Error in giftCoins:', err);
    return { success: false, error: 'Something went wrong' };
  }
}

export async function updateUserRole(
  adminUser: SimpleUser,
  targetUserId: string,
  newRole: UserRole
): Promise<{ success: boolean; error: string | null }> {
  if (!isSupabaseConfigured() || !supabase) {
    return { success: false, error: 'Database not configured' };
  }

  // Only superusers can change roles
  if (!isSuperuser(adminUser)) {
    return { success: false, error: 'Only superusers can change user roles' };
  }

  // Prevent changing own role
  if (targetUserId === adminUser.id) {
    return { success: false, error: 'You cannot change your own role' };
  }

  try {
    const { error } = await supabase
      .from('simple_users')
      .update({ role: newRole })
      .eq('id', targetUserId);

    if (error) {
      console.error('Error updating role:', error);
      return { success: false, error: 'Failed to update role' };
    }

    return { success: true, error: null };
  } catch (err) {
    console.error('Error in updateUserRole:', err);
    return { success: false, error: 'Something went wrong' };
  }
}

export async function resetUserPassword(
  adminUser: SimpleUser,
  targetUserId: string,
  newPassword: string
): Promise<{ success: boolean; error: string | null }> {
  if (!isSupabaseConfigured() || !supabase) {
    return { success: false, error: 'Database not configured' };
  }

  // Only admins/superusers can reset passwords
  if (!isAdmin(adminUser)) {
    return { success: false, error: 'You do not have permission to reset passwords' };
  }

  if (newPassword.length < 4) {
    return { success: false, error: 'Password must be at least 4 characters' };
  }

  try {
    const passwordHash = await hashPassword(newPassword);
    
    const { error } = await supabase
      .from('simple_users')
      .update({ password_hash: passwordHash })
      .eq('id', targetUserId);

    if (error) {
      console.error('Error resetting password:', error);
      return { success: false, error: 'Failed to reset password' };
    }

    return { success: true, error: null };
  } catch (err) {
    console.error('Error in resetUserPassword:', err);
    return { success: false, error: 'Something went wrong' };
  }
}

export async function updateDisplayName(
  userId: string,
  newDisplayName: string
): Promise<{ success: boolean; error: string | null }> {
  if (!isSupabaseConfigured() || !supabase) {
    return { success: false, error: 'Database not configured' };
  }

  if (newDisplayName.trim().length < 1) {
    return { success: false, error: 'Display name cannot be empty' };
  }

  try {
    const { error } = await supabase
      .from('simple_users')
      .update({ display_name: newDisplayName.trim() })
      .eq('id', userId);

    if (error) {
      console.error('Error updating display name:', error);
      return { success: false, error: 'Failed to update display name' };
    }

    return { success: true, error: null };
  } catch (err) {
    console.error('Error in updateDisplayName:', err);
    return { success: false, error: 'Something went wrong' };
  }
}

export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<{ success: boolean; error: string | null }> {
  if (!isSupabaseConfigured() || !supabase) {
    return { success: false, error: 'Database not configured' };
  }

  if (newPassword.length < 4) {
    return { success: false, error: 'Password must be at least 4 characters' };
  }

  try {
    // Get current password hash
    const { data: user } = await supabase
      .from('simple_users')
      .select('password_hash')
      .eq('id', userId)
      .single();

    if (!user) {
      return { success: false, error: 'User not found' };
    }

    // Verify current password
    const isValid = await verifyPassword(currentPassword, user.password_hash);
    if (!isValid) {
      return { success: false, error: 'Current password is incorrect' };
    }

    // Update to new password
    const newHash = await hashPassword(newPassword);
    const { error } = await supabase
      .from('simple_users')
      .update({ password_hash: newHash })
      .eq('id', userId);

    if (error) {
      console.error('Error changing password:', error);
      return { success: false, error: 'Failed to change password' };
    }

    return { success: true, error: null };
  } catch (err) {
    console.error('Error in changePassword:', err);
    return { success: false, error: 'Something went wrong' };
  }
}

export async function unlockItemForUser(
  adminUser: SimpleUser,
  targetUserId: string,
  itemType: 'theme' | 'powerup',
  itemId: string
): Promise<{ success: boolean; error: string | null }> {
  if (!isSupabaseConfigured() || !supabase) {
    return { success: false, error: 'Database not configured' };
  }

  if (!adminUser.can_gift_items && !isAdmin(adminUser)) {
    return { success: false, error: 'You do not have permission to gift items' };
  }

  try {
    // Get user's profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('simple_user_id', targetUserId)
      .single();

    if (!profile) {
      return { success: false, error: 'User profile not found' };
    }

    // Get current progress
    const { data: progress } = await supabase
      .from('user_progress')
      .select('unlocked_themes, unlocked_powerups')
      .eq('user_id', profile.id)
      .single();

    if (!progress) {
      return { success: false, error: 'User progress not found' };
    }

    const updateData: Record<string, string[]> = {};
    
    if (itemType === 'theme') {
      const themes = progress.unlocked_themes || [];
      if (!themes.includes(itemId)) {
        updateData.unlocked_themes = [...themes, itemId];
      } else {
        return { success: true, error: null }; // Already unlocked
      }
    } else {
      const powerups = progress.unlocked_powerups || [];
      if (!powerups.includes(itemId)) {
        updateData.unlocked_powerups = [...powerups, itemId];
      } else {
        return { success: true, error: null }; // Already unlocked
      }
    }

    const { error } = await supabase
      .from('user_progress')
      .update({
        ...updateData,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', profile.id);

    if (error) {
      console.error('Error unlocking item:', error);
      return { success: false, error: 'Failed to unlock item' };
    }

    return { success: true, error: null };
  } catch (err) {
    console.error('Error in unlockItemForUser:', err);
    return { success: false, error: 'Something went wrong' };
  }
}

