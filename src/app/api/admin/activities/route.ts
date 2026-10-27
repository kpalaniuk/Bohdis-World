import { NextResponse } from 'next/server';
import { getDb } from '@/lib/server/db';
import { EMBEDS, TABLES } from '@/lib/server/tables';
import { isErrorResponse, jsonError, requireAdmin, requireUser } from '@/lib/server/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const actor = await requireUser(request);
  if (isErrorResponse(actor)) return actor;
  const denied = requireAdmin(actor);
  if (denied) return denied;
  const requested = Number(new URL(request.url).searchParams.get('limit') || 100);
  const limit = Number.isInteger(requested) ? Math.min(500, Math.max(1, requested)) : 100;
  const { data, error } = await getDb().from(TABLES.userActivities)
    .select(EMBEDS.activityUser)
    .order('created_at', { ascending: false }).limit(limit);
  if (error) return jsonError('Failed to load activities', 400);
  const activities = (data || []).map(activity => ({
    ...activity,
    username: activity.bohdi_user_profiles?.username || 'unknown',
    display_name: activity.bohdi_user_profiles?.bohdi_simple_users?.display_name || null,
  }));
  return NextResponse.json({ activities });
}
