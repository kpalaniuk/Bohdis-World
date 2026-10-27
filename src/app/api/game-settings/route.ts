import { NextResponse } from 'next/server';
import { getDb } from '@/lib/server/db';
import { TABLES } from '@/lib/server/tables';
import { isErrorResponse, jsonError, requireUser } from '@/lib/server/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const user = await requireUser(request);
  if (isErrorResponse(user)) return user;
  const gameName = new URL(request.url).searchParams.get('gameName');
  if (gameName !== null && (gameName.length < 1 || gameName.length > 50)) return jsonError('Invalid game name', 400);
  let query = getDb().from(TABLES.gameSettings).select('*').eq('user_id', user.profileId);
  if (gameName) query = query.eq('game_name', gameName);
  const { data, error } = await query.order('updated_at', { ascending: false });
  return error ? jsonError('Failed to load game settings', 400) : NextResponse.json({ settings: data || [] });
}

