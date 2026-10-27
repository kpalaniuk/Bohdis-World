import { NextResponse } from 'next/server';
import { getDb } from '@/lib/server/db';
import { isErrorResponse, jsonError, requireAdmin, requireUser, validUuid } from '@/lib/server/http';
import { getSessionUser } from '@/lib/server/session';
import { TABLES } from '@/lib/server/tables';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: Context) {
  const { id } = await context.params;
  if (!validUuid(id)) return jsonError('Invalid level id', 400);
  const { data: level } = await getDb().from(TABLES.levels).select('id, shelf, owner_profile_id, file_name, level_name, sha256, bytes_b64, size_bytes').eq('id', id).single();
  if (!level) return jsonError('Level not found', 404);
  if (level.shelf === 'mine') {
    const user = await getSessionUser(request);
    if (!user) return jsonError('Unauthorized', 401);
    if (level.owner_profile_id !== user.profileId) return jsonError('Forbidden', 403);
  }
  return NextResponse.json({ level });
}

export async function DELETE(request: Request, context: Context) {
  const user = await requireUser(request);
  if (isErrorResponse(user)) return user;
  const { id } = await context.params;
  if (!validUuid(id)) return jsonError('Invalid level id', 400);
  const db = getDb();
  const { data: level } = await db.from(TABLES.levels).select('id, shelf, owner_profile_id').eq('id', id).single();
  if (!level) return jsonError('Level not found', 404);
  if (level.shelf === 'community') { const denied = requireAdmin(user); if (denied) return denied; }
  else if (level.owner_profile_id !== user.profileId) return jsonError('Forbidden', 403);
  const { error } = await db.from(TABLES.levels).delete().eq('id', id);
  return error ? jsonError('Failed to delete level', 400) : NextResponse.json({ success: true });
}
