import { NextResponse } from 'next/server';
import { getDb } from '@/lib/server/db';
import { RPC, TABLES } from '@/lib/server/tables';
import { cleanUsername, jsonError, readJson } from '@/lib/server/http';
import { hashPassword, verifyPassword } from '@/lib/server/passwords';
import { createSession, setSessionCookie } from '@/lib/server/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const LOCK_MESSAGE = 'Too many tries. Wait 5 minutes and try again.';

export async function POST(request: Request) {
  const body = await readJson(request);
  const username = cleanUsername(body?.username);
  const password = body?.password;
  if (!username || typeof password !== 'string' || password.length < 1 || password.length > 200) {
    return jsonError('Invalid username or password', 400);
  }

  const db = getDb();
  // On Vercel these headers are set by the platform and cannot be spoofed by the client.
  const ip = (
    request.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip')?.trim() ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    'unknown'
  ).slice(0, 200);
  const { data: user, error } = await db
    .from(TABLES.simpleUsers)
    .select('id, username, display_name, password_hash, created_at, role, can_gift_items, failed_login_count, locked_until')
    .eq('username', username)
    .single();
  if (error || !user) return jsonError('Invalid username or password', 401);

  const now = new Date();
  // Count the attempt BEFORE checking the password, atomically in Postgres, so a burst of parallel
  // guesses cannot all be checked. Attempts 1-5 per (username, ip) are checked; later ones are refused
  // without running scrypt until the 5-minute lock expires. A successful login clears the row below.
  const { data: attempt, error: attemptError } = await db.rpc(RPC.registerLoginFailure, {
    p_user_id: user.id,
    p_username: username,
    p_ip: ip,
  });
  const attemptRow = Array.isArray(attempt) ? attempt[0] : attempt;
  if (attemptError) {
    console.error('login attempt counter failed', attemptError.message);
    // Fall back to the stored lock so a broken counter never hides an active lock.
    const { data: ipFailure } = await db.from(TABLES.loginFailures)
      .select('locked_until')
      .eq('username', username)
      .eq('ip', ip)
      .single();
    if (ipFailure?.locked_until && new Date(ipFailure.locked_until).getTime() > now.getTime()) {
      return jsonError(LOCK_MESSAGE, 429);
    }
  } else if ((attemptRow?.failed_login_count ?? 0) > 5) {
    return jsonError(LOCK_MESSAGE, 429);
  }

  const verified = await verifyPassword(password, user.password_hash);
  if (!verified.ok) {
    const lockedNow = !attemptError && (attemptRow?.failed_login_count ?? 0) >= 5;
    return jsonError(lockedNow ? LOCK_MESSAGE : 'Invalid username or password', lockedNow ? 429 : 401);
  }

  const update: Record<string, unknown> = {
    failed_login_count: 0,
    locked_until: null,
    last_login_at: now.toISOString(),
  };
  if (verified.needsRehash) update.password_hash = await hashPassword(password);
  await db.from(TABLES.simpleUsers).update(update).eq('id', user.id);
  await db.from(TABLES.loginFailures).delete().eq('username', username).eq('ip', ip);
  await db.from(TABLES.sessions).delete().eq('user_id', user.id).lt('expires_at', now.toISOString());

  const token = await createSession(user.id);
  const safeUser = {
    id: user.id,
    username: user.username,
    display_name: user.display_name,
    created_at: user.created_at,
    role: user.role,
    can_gift_items: user.can_gift_items,
  };
  const response = NextResponse.json({ user: safeUser });
  setSessionCookie(response, token);

  const { data: profile } = await db.from(TABLES.userProfiles).select('id').eq('simple_user_id', user.id).single();
  if (profile) {
    await db.from(TABLES.userActivities).insert({ user_id: profile.id, activity_type: 'login', activity_data: {} });
  }
  return response;
}
