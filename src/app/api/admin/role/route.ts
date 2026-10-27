import { NextResponse } from 'next/server';
import { getDb } from '@/lib/server/db';
import { TABLES } from '@/lib/server/tables';
import { isErrorResponse, jsonError, readJson, requireUser } from '@/lib/server/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PUT(request: Request) {
  const actor = await requireUser(request);
  if (isErrorResponse(actor)) return actor;
  if (actor.role !== 'superuser') return jsonError('Forbidden', 403);
  const body = await readJson(request);
  if (typeof body?.targetUserId !== 'string' || body.targetUserId.length > 100 || !['user', 'admin', 'superuser'].includes(String(body.role))) {
    return jsonError('Invalid role change', 400);
  }
  if (body.targetUserId === actor.id) return jsonError('You cannot change your own role', 400);
  const { error } = await getDb().from(TABLES.simpleUsers).update({ role: body.role }).eq('id', body.targetUserId);
  return error ? jsonError('Failed to update role', 400) : NextResponse.json({ success: true });
}

