import { NextResponse } from 'next/server';
import { getDb } from '@/lib/server/db';
import { TABLES } from '@/lib/server/tables';
import { isErrorResponse, jsonError, readJson, requireAdmin, requireUser } from '@/lib/server/http';
import { hashPassword } from '@/lib/server/passwords';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const actor = await requireUser(request);
  if (isErrorResponse(actor)) return actor;
  const denied = requireAdmin(actor);
  if (denied) return denied;
  const body = await readJson(request);
  if (typeof body?.targetUserId !== 'string' || body.targetUserId.length > 100 || typeof body.newPassword !== 'string'
    || body.newPassword.length < 6 || body.newPassword.length > 200) return jsonError('Password must be at least 6 characters', 400);
  if (body.targetUserId === actor.id) return jsonError('Use change password for your own account', 400);
  const db = getDb();
  const { data: target } = await db.from(TABLES.simpleUsers).select('id, role').eq('id', body.targetUserId).single();
  if (!target) return jsonError('User not found', 400);
  if (actor.role !== 'superuser' && target.role !== 'user') return jsonError('Forbidden', 403);
  const { error } = await db.from(TABLES.simpleUsers).update({ password_hash: await hashPassword(body.newPassword) }).eq('id', target.id);
  if (error) return jsonError('Failed to reset password', 400);
  await db.from(TABLES.sessions).delete().eq('user_id', target.id);
  return NextResponse.json({ success: true });
}
