import { createHash } from 'node:crypto';
import { getDb } from './db';
import { TABLES } from './tables';

export const CLAIM_ANSWER_KEY = 'bohdi_claim_answer_hash';
export const CLAIM_TOKEN_KEY = 'bohdi_claim_token_hash';
export const CLAIMED_USER_KEY = 'bohdi_claimed_user_id';
export const CLAIM_COOKIE = 'bw_claim';

export function normalizeBohdiAnswer(answer: string): string {
  return answer.toLowerCase().replace(/[^a-z]/g, '');
}

export function hashClaimToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function readRequestCookie(request: Request, name: string): string | null {
  for (const part of (request.headers.get('cookie') || '').split(';')) {
    const [key, ...value] = part.trim().split('=');
    if (key !== name) continue;
    try {
      return decodeURIComponent(value.join('='));
    } catch {
      return null;
    }
  }
  return null;
}

export async function getBohdiClaimAvailability(): Promise<{ available: boolean; answerHash: string | null }> {
  const db = getDb();
  const [{ data: answer, error: answerError }, { data: claimed, error: claimedError }] = await Promise.all([
    db.from(TABLES.appSecrets).select('value').eq('key', CLAIM_ANSWER_KEY).single(),
    db.from(TABLES.appSecrets).select('value').eq('key', CLAIMED_USER_KEY).single(),
  ]);
  // Fail closed: if either read errors, treat the claim as unavailable rather than re-opening it.
  // PGRST116 = no row, which is a normal answer here; anything else is a real error.
  const realError = (e: { code?: string } | null) => Boolean(e && e.code !== 'PGRST116');
  if (realError(answerError) || realError(claimedError)) return { available: false, answerHash: null };
  return { available: Boolean(answer?.value && !claimed), answerHash: answer?.value || null };
}
