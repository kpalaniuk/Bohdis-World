import { NextResponse } from 'next/server';
import { getDb } from '@/lib/server/db';
import { TABLES } from '@/lib/server/tables';
import { isErrorResponse, jsonError, readJson, requireUser, validDisplayName } from '@/lib/server/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PUT(request: Request) {
  const user = await requireUser(request);
  if (isErrorResponse(user)) return user;
  const body = await readJson(request);
  if (!validDisplayName(body?.displayName)) return jsonError('Display name must be 1–30 characters', 400);
  const displayName = body.displayName.trim();
  const { error } = await getDb().from(TABLES.simpleUsers).update({ display_name: displayName }).eq('id', user.id);
  return error ? jsonError('Failed to update display name', 400) : NextResponse.json({ success: true, display_name: displayName });
}

