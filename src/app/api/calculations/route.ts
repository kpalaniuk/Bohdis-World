import { NextResponse } from 'next/server';
import { getDb } from '@/lib/server/db';
import { TABLES } from '@/lib/server/tables';
import { isErrorResponse, jsonError, readJson, requireUser } from '@/lib/server/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const user = await requireUser(request);
  if (isErrorResponse(user)) return user;
  const requested = Number(new URL(request.url).searchParams.get('limit') || 5);
  const limit = Number.isInteger(requested) ? Math.min(100, Math.max(1, requested)) : 5;
  const { data, error } = await getDb().from(TABLES.calculationHistory).select('*')
    .eq('user_id', user.profileId).order('created_at', { ascending: false }).limit(limit);
  return error ? jsonError('Failed to load calculations', 400) : NextResponse.json({ calculations: data || [] });
}

export async function POST(request: Request) {
  const user = await requireUser(request);
  if (isErrorResponse(user)) return user;
  const body = await readJson(request);
  if (typeof body?.expression !== 'string' || body.expression.length > 500 || typeof body.result !== 'string' || body.result.length > 500) {
    return jsonError('Invalid calculation', 400);
  }
  const { error } = await getDb().from(TABLES.calculationHistory).insert({
    user_id: user.profileId,
    expression: body.expression,
    result: body.result,
  });
  return error ? jsonError('Failed to save calculation', 400) : NextResponse.json({ success: true });
}

