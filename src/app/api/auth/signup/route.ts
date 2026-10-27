import { NextResponse } from 'next/server';
import { getDb } from '@/lib/server/db';
import { TABLES } from '@/lib/server/tables';
import { cleanUsername, jsonError, readJson, validDisplayName } from '@/lib/server/http';
import { constantTimeSecretEqual, hashPassword } from '@/lib/server/passwords';
import { createSession, setSessionCookie } from '@/lib/server/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const body = await readJson(request);
  const username = cleanUsername(body?.username);
  const password = body?.password;
  const requestedDisplayName = body?.displayName;
  const signupCode = process.env.SIGNUP_CODE;
  if (!username) return jsonError('Username must be 3–20 characters using letters, numbers, or underscores', 400);
  if (typeof password !== 'string' || password.length < 6 || password.length > 200) {
    return jsonError('Password must be at least 6 characters', 400);
  }
  if (requestedDisplayName !== undefined && !validDisplayName(requestedDisplayName)) {
    return jsonError('Display name must be 1–30 characters', 400);
  }
  if (signupCode && (typeof body?.code !== 'string' || !constantTimeSecretEqual(body.code, signupCode))) {
    return jsonError('Invalid signup code', 403);
  }

  const db = getDb();
  const { data: existing } = await db.from(TABLES.simpleUsers).select('id').eq('username', username).single();
  if (existing) return jsonError('Username already taken', 400);

  const { data: user, error } = await db.from(TABLES.simpleUsers).insert({
    username,
    password_hash: await hashPassword(password),
    display_name: typeof requestedDisplayName === 'string' ? requestedDisplayName.trim() : username,
    role: 'user',
    can_gift_items: false,
  }).select('id, username, display_name, created_at, role, can_gift_items').single();
  if (error || !user) return jsonError('Failed to create account', 400);

  const { data: profile, error: profileError } = await db.from(TABLES.userProfiles).insert({
    simple_user_id: user.id,
    username,
  }).select('id').single();
  if (profileError || !profile) {
    await db.from(TABLES.simpleUsers).delete().eq('id', user.id);
    return jsonError('Failed to create account', 400);
  }
  await db.from(TABLES.userProgress).insert({
    user_id: profile.id,
    coins: 0,
    total_earned: 0,
    high_score: 0,
    unlocked_themes: ['default'],
    unlocked_powerups: [],
  });
  await db.from(TABLES.userActivities).insert({ user_id: profile.id, activity_type: 'signup', activity_data: {} });

  const token = await createSession(user.id);
  const response = NextResponse.json({ user }, { status: 201 });
  setSessionCookie(response, token);
  return response;
}
