import { NextResponse } from 'next/server';
import { getDb } from '@/lib/server/db';
import { TABLES } from '@/lib/server/tables';
import { boundedInteger, isErrorResponse, jsonError, readJson, requireUser } from '@/lib/server/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const user = await requireUser(request);
  if (isErrorResponse(user)) return user;
  const requested = Number(new URL(request.url).searchParams.get('limit') || 100);
  const limit = Number.isInteger(requested) ? Math.min(100, Math.max(1, requested)) : 100;
  const { data, error } = await getDb().from(TABLES.mathHistory).select('*')
    .eq('user_id', user.profileId).order('created_at', { ascending: false }).limit(limit);
  return error ? jsonError('Failed to load math attempts', 400) : NextResponse.json({ attempts: data || [] });
}

export async function POST(request: Request) {
  const user = await requireUser(request);
  if (isErrorResponse(user)) return user;
  const body = await readJson(request);
  if (
    typeof body?.gradeLevel !== 'string' || body.gradeLevel.length > 30 ||
    typeof body.problem !== 'string' || body.problem.length > 500 ||
    (body.userAnswer !== null && (typeof body.userAnswer !== 'string' || body.userAnswer.length > 500)) ||
    typeof body.correctAnswer !== 'string' || body.correctAnswer.length > 500 ||
    typeof body.isCorrect !== 'boolean' || !boundedInteger(body.coinsEarned, 10_000)
  ) return jsonError('Invalid math attempt', 400);
  const { error } = await getDb().from(TABLES.mathHistory).insert({
    user_id: user.profileId,
    grade_level: body.gradeLevel,
    problem: body.problem,
    user_answer: body.userAnswer,
    correct_answer: body.correctAnswer,
    is_correct: body.isCorrect,
    coins_earned: body.coinsEarned,
  });
  return error ? jsonError('Failed to save math attempt', 400) : NextResponse.json({ success: true });
}
