import { getDb } from './db';
import { hashPassword } from './passwords';
import { TABLES } from './tables';

export interface CreatedAccount {
  user: {
    id: string;
    username: string;
    display_name: string | null;
    created_at: string;
    role: 'user';
    can_gift_items: boolean;
  };
  profileId: string;
}

export type CreateAccountResult =
  | { account: CreatedAccount; error: null; usernameTaken: false }
  | { account: null; error: string; usernameTaken: boolean };

export async function createUserAccount(
  username: string,
  password: string,
  displayName: string,
): Promise<CreateAccountResult> {
  const db = getDb();
  const { data: existing } = await db.from(TABLES.simpleUsers).select('id').eq('username', username).single();
  if (existing) return { account: null, error: 'Username already taken', usernameTaken: true };

  const { data: user, error } = await db.from(TABLES.simpleUsers).insert({
    username,
    password_hash: await hashPassword(password),
    display_name: displayName,
    role: 'user',
    can_gift_items: false,
  }).select('id, username, display_name, created_at, role, can_gift_items').single();
  if (error || !user) {
    const usernameTaken = error?.code === '23505';
    return { account: null, error: usernameTaken ? 'Username already taken' : 'Failed to create account', usernameTaken };
  }

  const { data: profile, error: profileError } = await db.from(TABLES.userProfiles).insert({
    simple_user_id: user.id,
    username,
  }).select('id').single();
  if (profileError || !profile) {
    await db.from(TABLES.simpleUsers).delete().eq('id', user.id);
    return { account: null, error: 'Failed to create account', usernameTaken: false };
  }

  const { error: progressError } = await db.from(TABLES.userProgress).insert({
    user_id: profile.id,
    coins: 0,
    total_earned: 0,
    high_score: 0,
    unlocked_themes: ['default'],
    unlocked_powerups: [],
  });
  if (progressError) {
    await db.from(TABLES.simpleUsers).delete().eq('id', user.id);
    return { account: null, error: 'Failed to create account', usernameTaken: false };
  }

  await db.from(TABLES.userActivities).insert({
    user_id: profile.id,
    activity_type: 'signup',
    activity_data: {},
  });
  return { account: { user, profileId: profile.id } as CreatedAccount, error: null, usernameTaken: false };
}
