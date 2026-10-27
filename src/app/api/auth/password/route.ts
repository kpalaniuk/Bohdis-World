import { NextResponse } from 'next/server';
import { getDb } from '@/lib/server/db';
import { TABLES } from '@/lib/server/tables';
import { isErrorResponse, jsonError, readJson, requireUser } from '@/lib/server/http';
import { hashPassword, verifyPassword } from '@/lib/server/passwords';
import { deleteOtherSessions } from '@/lib/server/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PUT(request: Request) {
  const user = await requireUser(request);
  if (isErrorResponse(user)) return user;
  const body = await readJson(request);
  const currentPassword = body?.currentPassword;
  const newPassword = body?.newPassword;
  if (typeof currentPassword !== 'string' || typeof newPassword !== 'string' || newPassword.length < 6 || newPassword.length > 200) {
    return jsonError('New password must be at least 6 characters', 400);
  }
  const db = getDb();
  const { data: stored } = await db.from(TABLES.simpleUsers).select('password_hash').eq('id', user.id).single();
  if (!stored || !(await verifyPassword(currentPassword, stored.password_hash)).ok) {
    return jsonError('Current password is incorrect', 400);
  }
  const { error } = await db.from(TABLES.simpleUsers).update({ password_hash: await hashPassword(newPassword) }).eq('id', user.id);
  if (error) return jsonError('Failed to change password', 400);
  await deleteOtherSessions(request, user.id);
  return NextResponse.json({ success: true });
}
