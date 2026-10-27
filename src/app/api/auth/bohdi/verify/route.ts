import { randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';
import {
  CLAIM_COOKIE,
  CLAIM_TOKEN_KEY,
  getBohdiClaimAvailability,
  hashClaimToken,
  normalizeBohdiAnswer,
} from '@/lib/server/bohdiClaim';
import { getDb } from '@/lib/server/db';
import { getClientIp, jsonError, readJson } from '@/lib/server/http';
import { verifyPassword } from '@/lib/server/passwords';
import { RPC, TABLES } from '@/lib/server/tables';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CLAIMED_MESSAGE = "Bohdi's account is already set up. Sign in instead.";
const LOCK_MESSAGE = 'Too many tries. Wait 5 minutes and try again.';

export async function POST(request: Request) {
  const body = await readJson(request);
  const { available, answerHash } = await getBohdiClaimAvailability();
  if (!available || !answerHash) return jsonError(CLAIMED_MESSAGE, 410);

  const db = getDb();
  const ip = getClientIp(request);
  const { data: attempt, error: attemptError } = await db.rpc(RPC.registerClaimAttempt, { p_ip: ip });
  if (attemptError) {
    console.error('claim attempt counter failed', attemptError.message);
    return jsonError('Something went wrong', 500);
  }
  const attemptRow = Array.isArray(attempt) ? attempt[0] : attempt;
  if ((attemptRow?.attempt_count ?? 0) > 5) return jsonError(LOCK_MESSAGE, 429);
  if (typeof body?.answer !== 'string' || body.answer.length > 100) {
    return jsonError("That's not it. Try again!", 401);
  }

  const verified = await verifyPassword(normalizeBohdiAnswer(body.answer), answerHash);
  if (!verified.ok) return jsonError("That's not it. Try again!", 401);

  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + 15 * 60_000).toISOString();
  const { error: tokenError } = await db.from(TABLES.appSecrets).upsert({
    key: CLAIM_TOKEN_KEY,
    value: hashClaimToken(token),
    expires_at: expiresAt,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'key' });
  if (tokenError) return jsonError('Something went wrong', 500);

  await db.from(TABLES.claimAttempts).delete().eq('ip', ip);
  const response = NextResponse.json({ ok: true });
  response.cookies.set(CLAIM_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api/auth/bohdi',
    maxAge: 900,
  });
  return response;
}
