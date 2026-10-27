import { NextResponse } from 'next/server';
import { createUserAccount } from '@/lib/server/accounts';
import {
  CLAIM_COOKIE,
  CLAIM_TOKEN_KEY,
  CLAIMED_USER_KEY,
  getBohdiClaimAvailability,
  hashClaimToken,
  readRequestCookie,
} from '@/lib/server/bohdiClaim';
import { getDb } from '@/lib/server/db';
import { cleanUsername, jsonError, readJson, validDisplayName } from '@/lib/server/http';
import { constantTimeSecretEqual } from '@/lib/server/passwords';
import { createSession, setSessionCookie } from '@/lib/server/session';
import { TABLES } from '@/lib/server/tables';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function clearClaimCookie(response: NextResponse): void {
  response.cookies.set(CLAIM_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api/auth/bohdi',
    maxAge: 0,
  });
}

export async function POST(request: Request) {
  const token = readRequestCookie(request, CLAIM_COOKIE);
  if (!token) return jsonError('Time ran out. Go back and answer the question again.', 403);

  const db = getDb();
  const [{ available }, { data: storedToken }] = await Promise.all([
    getBohdiClaimAvailability(),
    db.from(TABLES.appSecrets).select('value, expires_at').eq('key', CLAIM_TOKEN_KEY).single(),
  ]);
  const tokenValid = storedToken?.value &&
    storedToken.expires_at &&
    new Date(storedToken.expires_at).getTime() > Date.now() &&
    constantTimeSecretEqual(hashClaimToken(token), storedToken.value);
  if (!available) return jsonError("Bohdi's account is already set up. Sign in instead.", 403);
  if (!tokenValid) return jsonError('Time ran out. Go back and answer the question again.', 403);

  const body = await readJson(request);
  const username = cleanUsername(body?.username);
  const password = body?.password;
  const requestedDisplayName = body?.displayName;
  if (!username) return jsonError('Username must be 3–20 characters using letters, numbers, or underscores', 400);
  if (typeof password !== 'string' || password.length < 6 || password.length > 200) {
    return jsonError('Password must be at least 6 characters', 400);
  }
  if (requestedDisplayName !== undefined && !validDisplayName(requestedDisplayName)) {
    return jsonError('Display name must be 1–30 characters', 400);
  }

  const result = await createUserAccount(
    username,
    password,
    typeof requestedDisplayName === 'string' ? requestedDisplayName.trim() : 'Bohdi',
  );
  if (!result.account) return jsonError(result.error, result.usernameTaken ? 409 : 400);

  const { user } = result.account;
  const { data: marker, error: markerError } = await db.from(TABLES.appSecrets).upsert({
    key: CLAIMED_USER_KEY,
    value: user.id,
    expires_at: null,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'key', ignoreDuplicates: true }).select('value').single();
  if (markerError || marker?.value !== user.id) {
    await db.from(TABLES.simpleUsers).delete().eq('id', user.id);
    const response = jsonError('Bohdi account was claimed by another request', 409);
    clearClaimCookie(response);
    return response;
  }

  await db.from(TABLES.appSecrets).delete().eq('key', CLAIM_TOKEN_KEY);
  const sessionToken = await createSession(user.id);
  const response = NextResponse.json({ user }, { status: 201 });
  clearClaimCookie(response);
  setSessionCookie(response, sessionToken);
  return response;
}
