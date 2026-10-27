import { NextResponse } from 'next/server';
import { getDb } from '@/lib/server/db';
import { TABLES } from '@/lib/server/tables';
import { isErrorResponse, jsonError, readJson, requireUser } from '@/lib/server/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const user = await requireUser(request);
  if (isErrorResponse(user)) return user;
  const db = getDb();
  const [{ data: profile }, { data: progress }] = await Promise.all([
    db.from(TABLES.userProfiles).select('*').eq('id', user.profileId).single(),
    db.from(TABLES.userProgress).select('*').eq('user_id', user.profileId).single(),
  ]);
  return NextResponse.json({ profile: profile || null, progress: progress || null });
}

export async function PUT(request: Request) {
  const user = await requireUser(request);
  if (isErrorResponse(user)) return user;
  const body = await readJson(request);
  if (!body) return jsonError('Invalid request body', 400);

  const fields: Record<string, unknown> = { updated_at: new Date().toISOString() };
  const integerFields = [['coins', 'coins'], ['totalEarned', 'total_earned'], ['highScore', 'high_score']] as const;
  for (const [input, column] of integerFields) {
    const value = body[input];
    if (typeof value === 'number' && Number.isFinite(value)) {
      fields[column] = Math.min(10_000_000, Math.max(0, Math.trunc(value)));
    }
  }
  if (body.unlockedThemes !== undefined) {
    if (Array.isArray(body.unlockedThemes)) {
      fields.unlocked_themes = body.unlockedThemes
        .filter((value): value is string => typeof value === 'string' && value.length <= 50)
        .slice(0, 100);
    }
  }
  if (body.ownedPowerUps && typeof body.ownedPowerUps === 'object' && !Array.isArray(body.ownedPowerUps)) {
    const powerUps: string[] = [];
    const allowed = ['double-jump', 'shield', 'slow-mo'] as const;
    const requested = body.ownedPowerUps as Record<string, unknown>;
    for (const name of allowed) {
      const raw = requested[name];
      const count = typeof raw === 'number' && Number.isFinite(raw)
        ? Math.min(999, Math.max(0, Math.trunc(raw)))
        : 0;
      powerUps.push(...Array(count).fill(name));
    }
    fields.unlocked_powerups = powerUps;
  }
  const db = getDb();
  if (typeof body.hasCompletedGate === 'boolean') {
    const { error } = await db.from(TABLES.userProfiles).update({ has_completed_gate: body.hasCompletedGate }).eq('id', user.profileId);
    if (error) return jsonError('Failed to save progress', 400);
  }
  const { error } = await db.from(TABLES.userProgress).update(fields).eq('user_id', user.profileId);
  return error ? jsonError('Failed to save progress', 400) : NextResponse.json({ success: true });
}
