import { NextResponse } from 'next/server';
import { getDb } from '@/lib/server/db';
import { TABLES } from '@/lib/server/tables';
import { isErrorResponse, jsonError, readJson, requireAdmin, requireUser } from '@/lib/server/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function DELETE(request: Request) {
  const actor = await requireUser(request);
  if (isErrorResponse(actor)) return actor;
  const denied = requireAdmin(actor);
  if (denied) return denied;
  const body = await readJson(request);
  if (typeof body?.targetUserId !== 'string' || body.targetUserId.length > 100) return jsonError('Invalid user id', 400);
  if (body.targetUserId === actor.id) return jsonError('You cannot delete your own account', 400);
  const db = getDb();
  const { data: target } = await db.from(TABLES.simpleUsers).select('id, role').eq('id', body.targetUserId).single();
  if (!target) return jsonError('User not found', 400);
  if (target.role === 'superuser' && actor.role !== 'superuser') return jsonError('Forbidden', 403);
  const { error } = await db.from(TABLES.simpleUsers).delete().eq('id', target.id);
  return error ? jsonError('Failed to delete user account', 400) : NextResponse.json({ success: true });
}

