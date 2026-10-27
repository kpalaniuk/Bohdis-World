import { NextResponse } from 'next/server';
import { getDb } from '@/lib/server/db';
import { TABLES } from '@/lib/server/tables';
import { isErrorResponse, jsonError, requireAdmin, requireUser } from '@/lib/server/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const actor = await requireUser(request);
  if (isErrorResponse(actor)) return actor;
  const denied = requireAdmin(actor);
  if (denied) return denied;
  const db = getDb();
  const { data: users, error } = await db.from(TABLES.simpleUsers)
    .select('id, username, display_name, role, can_gift_items, created_at, last_login_at')
    .order('created_at', { ascending: false });
  if (error) return jsonError('Failed to load users', 400);
  const result = await Promise.all((users || []).map(async user => {
    const { data: profile } = await db.from(TABLES.userProfiles).select('id, has_completed_gate').eq('simple_user_id', user.id).single();
    if (!profile) return user;
    const [{ data: progress }, { data: recentActivities }] = await Promise.all([
      db.from(TABLES.userProgress).select('coins, total_earned, high_score, unlocked_themes, unlocked_powerups').eq('user_id', profile.id).single(),
      db.from(TABLES.userActivities).select('activity_type, activity_data, created_at').eq('user_id', profile.id).order('created_at', { ascending: false }).limit(10),
    ]);
    return { ...user, profile, progress: progress || undefined, recentActivities: recentActivities || [] };
  }));
  return NextResponse.json({ users: result });
}

