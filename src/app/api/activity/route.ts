import { NextResponse } from 'next/server';
import { getDb } from '@/lib/server/db';
import { TABLES } from '@/lib/server/tables';
import { isErrorResponse, jsonError, readJson, requireUser } from '@/lib/server/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TYPES = new Set(['login', 'signup', 'game_played', 'math_problem', 'calculator_used', 'shop_purchase', 'level_complete', 'high_score']);

export async function GET(request: Request) {
  const user = await requireUser(request);
  if (isErrorResponse(user)) return user;
  const requested = Number(new URL(request.url).searchParams.get('limit') || 50);
  const limit = Number.isInteger(requested) ? Math.min(100, Math.max(1, requested)) : 50;
  const { data, error } = await getDb().from(TABLES.userActivities).select('*')
    .eq('user_id', user.profileId).order('created_at', { ascending: false }).limit(limit);
  return error ? jsonError('Failed to load activities', 400) : NextResponse.json({ activities: data || [] });
}

export async function POST(request: Request) {
  const user = await requireUser(request);
  if (isErrorResponse(user)) return user;
  const body = await readJson(request);
  if (typeof body?.activityType !== 'string' || !TYPES.has(body.activityType) || !body.activityData || typeof body.activityData !== 'object' || Array.isArray(body.activityData)) {
    return jsonError('Invalid activity', 400);
  }
  if (JSON.stringify(body.activityData).length > 10_000) return jsonError('Activity data is too large', 400);
  const { error } = await getDb().from(TABLES.userActivities).insert({
    user_id: user.profileId,
    activity_type: body.activityType,
    activity_data: body.activityData,
  });
  return error ? jsonError('Failed to log activity', 400) : NextResponse.json({ success: true });
}

