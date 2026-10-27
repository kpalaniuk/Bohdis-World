import { NextResponse } from 'next/server';
import { getDb } from '@/lib/server/db';
import { EMBEDS, TABLES } from '@/lib/server/tables';
import { isErrorResponse, jsonError, readJson, requireUser } from '@/lib/server/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function superuser(request: Request) {
  const actor = await requireUser(request);
  if (isErrorResponse(actor)) return actor;
  return actor.role === 'superuser' ? actor : jsonError('Forbidden', 403);
}

export async function GET(request: Request) {
  const actor = await superuser(request);
  if (isErrorResponse(actor)) return actor;
  const { data, error } = await getDb().from(TABLES.gameSettings)
    .select(EMBEDS.gameSettingsUser)
    .order('updated_at', { ascending: false });
  if (error) return jsonError('Failed to load game settings', 400);
  const settings = (data || []).map(setting => ({
    ...setting,
    username: setting.bohdi_user_profiles?.username || 'unknown',
    display_name: setting.bohdi_user_profiles?.bohdi_simple_users?.display_name || null,
  }));
  return NextResponse.json({ settings });
}

export async function PUT(request: Request) {
  const actor = await superuser(request);
  if (isErrorResponse(actor)) return actor;
  const body = await readJson(request);
  if (typeof body?.targetUserId !== 'string' || body.targetUserId.length > 100 || typeof body.gameName !== 'string'
    || body.gameName.length < 1 || body.gameName.length > 50 || !body.settings || typeof body.settings !== 'object'
    || Array.isArray(body.settings) || JSON.stringify(body.settings).length > 20_000) return jsonError('Invalid game settings', 400);
  const db = getDb();
  const { data: profile } = await db.from(TABLES.userProfiles).select('id').eq('simple_user_id', body.targetUserId).single();
  if (!profile) return jsonError('User profile not found', 400);
  const { data: existing } = await db.from(TABLES.gameSettings).select('id').eq('user_id', profile.id).eq('game_name', body.gameName).single();
  const result = existing
    ? await db.from(TABLES.gameSettings).update({ settings: body.settings, updated_at: new Date().toISOString() }).eq('id', existing.id)
    : await db.from(TABLES.gameSettings).insert({ user_id: profile.id, game_name: body.gameName, settings: body.settings });
  return result.error ? jsonError('Failed to save game settings', 400) : NextResponse.json({ success: true });
}
