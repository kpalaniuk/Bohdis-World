import { NextResponse } from 'next/server';
import { getDb } from '@/lib/server/db';
import { TABLES } from '@/lib/server/tables';
import { isErrorResponse, jsonError, readJson, requireUser } from '@/lib/server/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const actor = await requireUser(request);
  if (isErrorResponse(actor)) return actor;
  if (actor.role === 'user' && !actor.can_gift_items) return jsonError('Forbidden', 403);
  const body = await readJson(request);
  if (typeof body?.targetUserId !== 'string' || body.targetUserId.length > 100 || !['theme', 'powerup'].includes(String(body.itemType))
    || typeof body.itemId !== 'string' || body.itemId.length < 1 || body.itemId.length > 50) return jsonError('Invalid item', 400);
  const db = getDb();
  const { data: profile } = await db.from(TABLES.userProfiles).select('id').eq('simple_user_id', body.targetUserId).single();
  if (!profile) return jsonError('User profile not found', 400);
  const { data: progress } = await db.from(TABLES.userProgress).select('unlocked_themes, unlocked_powerups').eq('user_id', profile.id).single();
  if (!progress) return jsonError('User progress not found', 400);
  const column = body.itemType === 'theme' ? 'unlocked_themes' : 'unlocked_powerups';
  const items: string[] = progress[column] || [];
  if (!items.includes(body.itemId)) items.push(body.itemId);
  const { error } = await db.from(TABLES.userProgress).update({ [column]: items, updated_at: new Date().toISOString() }).eq('user_id', profile.id);
  return error ? jsonError('Failed to unlock item', 400) : NextResponse.json({ success: true });
}

