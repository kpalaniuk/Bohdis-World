import { supabase, isSupabaseConfigured } from './supabase';

export interface SimpleUser {
  id: string;
  username: string;
  display_name: string | null;
  created_at: string;
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
      })
      .select('id, username, display_name, created_at')
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
      .select('id, username, display_name, password_hash, created_at')
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

