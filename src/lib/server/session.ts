import { createHash, randomBytes } from 'node:crypto';
import { cookies as nextCookies } from 'next/headers';
import type { NextResponse } from 'next/server';
import { getDb } from './db';
import { TABLES } from './tables';

if (typeof window !== 'undefined') {
  throw new Error('Session helpers cannot be used in the browser');
}

export const SESSION_COOKIE = 'bw_session';
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30;
const REFRESH_AFTER_MS = 24 * 60 * 60 * 1000;

export type SessionRole = 'user' | 'admin' | 'superuser';
export interface SessionUser {
  id: string;
  username: string;
  display_name: string | null;
  role: SessionRole;
  can_gift_items: boolean;
  profileId: string;
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function readCookie(request: Request, name: string): string | null {
  const cookies = request.headers.get('cookie') || '';
  for (const part of cookies.split(';')) {
    const [key, ...value] = part.trim().split('=');
    if (key === name) {
      try {
        return decodeURIComponent(value.join('='));
      } catch {
        return null;
      }
    }
  }
  return null;
}

export async function createSession(userId: string): Promise<string> {
  const db = getDb();
  const token = randomBytes(32).toString('base64url');
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_MAX_AGE * 1000);
  const { error } = await db.from(TABLES.sessions).insert({
    user_id: userId,
    token_hash: hashToken(token),
    created_at: now.toISOString(),
    expires_at: expiresAt.toISOString(),
    last_seen_at: now.toISOString(),
  });
  if (error) throw new Error(`Failed to create session: ${error.message}`);
  return token;
}

export function setSessionCookie(response: NextResponse, token: string): void {
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  });
}

export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set(SESSION_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}

export async function deleteSession(request: Request): Promise<void> {
  const token = readCookie(request, SESSION_COOKIE);
  if (!token) return;
  await getDb().from(TABLES.sessions).delete().eq('token_hash', hashToken(token));
}

export async function deleteOtherSessions(request: Request, userId: string): Promise<void> {
  const token = readCookie(request, SESSION_COOKIE);
  if (!token) return;
  await getDb().from(TABLES.sessions).delete().eq('user_id', userId).neq('token_hash', hashToken(token));
}

export async function getSessionUser(request: Request): Promise<SessionUser | null> {
  const token = readCookie(request, SESSION_COOKIE);
  if (!token) return null;

  const db = getDb();
  const tokenHash = hashToken(token);
  const { data: session, error: sessionError } = await db
    .from(TABLES.sessions)
    .select('id, user_id, expires_at, last_seen_at')
    .eq('token_hash', tokenHash)
    .single();
  if (sessionError || !session) return null;

  const now = new Date();
  if (new Date(session.expires_at).getTime() <= now.getTime()) {
    await db.from(TABLES.sessions).delete().eq('id', session.id);
    return null;
  }

  const { data: user, error: userError } = await db
    .from(TABLES.simpleUsers)
    .select('id, username, display_name, role, can_gift_items')
    .eq('id', session.user_id)
    .single();
  if (userError || !user) return null;

  const { data: profile, error: profileError } = await db
    .from(TABLES.userProfiles)
    .select('id')
    .eq('simple_user_id', user.id)
    .single();
  if (profileError || !profile) return null;

  const lastSeen = new Date(session.last_seen_at).getTime();
  if (!Number.isFinite(lastSeen) || now.getTime() - lastSeen >= REFRESH_AFTER_MS) {
    await db.from(TABLES.sessions).update({
      last_seen_at: now.toISOString(),
      expires_at: new Date(now.getTime() + SESSION_MAX_AGE * 1000).toISOString(),
    }).eq('id', session.id);
    try {
      const cookieStore = await nextCookies();
      cookieStore.set(SESSION_COOKIE, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: SESSION_MAX_AGE,
      });
    } catch {
      // Unit tests and non-Next callers do not have a mutable cookie store.
    }
  }

  return { ...user, profileId: profile.id } as SessionUser;
}
