import { NextResponse } from 'next/server';
import { createUserAccount } from '@/lib/server/accounts';
import { cleanUsername, jsonError, readJson, validDisplayName } from '@/lib/server/http';
import { constantTimeSecretEqual } from '@/lib/server/passwords';
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

  const result = await createUserAccount(
    username,
    password,
    typeof requestedDisplayName === 'string' ? requestedDisplayName.trim() : username,
  );
  if (!result.account) return jsonError(result.error, 400);
  const { user } = result.account;

  const token = await createSession(user.id);
  const response = NextResponse.json({ user }, { status: 201 });
  setSessionCookie(response, token);
  return response;
}
