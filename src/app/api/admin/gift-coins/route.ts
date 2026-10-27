import { NextResponse } from 'next/server';
import { getDb } from '@/lib/server/db';
import { RPC, TABLES } from '@/lib/server/tables';
import { boundedInteger, isErrorResponse, jsonError, readJson, requireUser } from '@/lib/server/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const actor = await requireUser(request);
  if (isErrorResponse(actor)) return actor;
  if (actor.role === 'user' && !actor.can_gift_items) return jsonError('Forbidden', 403);
  const body = await readJson(request);
  if (typeof body?.targetUserId !== 'string' || body.targetUserId.length > 100 || !boundedInteger(body.amount) || body.amount === 0
    || (body.reason !== undefined && (typeof body.reason !== 'string' || body.reason.length > 200))) return jsonError('Invalid gift', 400);
  if (actor.role === 'user' && (body.targetUserId === actor.id || body.amount < 1 || body.amount > 100)) {
    return jsonError('Gift permission allows 1–100 coins to another user', 403);
  }
  const db = getDb();
  const { data: profile } = await db.from(TABLES.userProfiles).select('id').eq('simple_user_id', body.targetUserId).single();
  if (!profile) return jsonError('User profile not found', 400);
  const { data, error } = await db.rpc(RPC.giftCoins, { p_profile_id: profile.id, p_amount: body.amount });
  const result = Array.isArray(data) ? data[0] : data;
  if (error || !result) return jsonError('Failed to gift coins', 400);
  return NextResponse.json({ success: true, newBalance: result.new_balance });
}
