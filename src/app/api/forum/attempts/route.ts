import { NextResponse } from 'next/server';
import { getDb } from '@/lib/server/db';
import { EMBEDS, TABLES } from '@/lib/server/tables';
import { isErrorResponse, jsonError, readJson, requireUser } from '@/lib/server/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const user = await requireUser(request);
  if (isErrorResponse(user)) return user;
  const problemId = new URL(request.url).searchParams.get('problemId');
  if (!problemId || problemId.length > 100) return jsonError('Invalid problem id', 400);
  const { data, error } = await getDb().from(TABLES.problemAttempts)
    .select(EMBEDS.attemptAuthor)
    .eq('problem_id', problemId).order('created_at', { ascending: false });
  if (error) return jsonError('Failed to load attempts', 400);
  const attempts = (data || []).map(attempt => {
    const profile = Array.isArray(attempt.bohdi_user_profiles) ? attempt.bohdi_user_profiles[0] : attempt.bohdi_user_profiles;
    return { ...attempt, username: profile?.username, display_name: profile?.bohdi_simple_users?.display_name };
  });
  return NextResponse.json({ success: true, attempts });
}

export async function POST(request: Request) {
  const user = await requireUser(request);
  if (isErrorResponse(user)) return user;
  const body = await readJson(request);
  if (typeof body?.problemId !== 'string' || body.problemId.length > 100 || typeof body.userAnswer !== 'number'
    || !Number.isFinite(body.userAnswer) || typeof body.correctAnswer !== 'number' || !Number.isFinite(body.correctAnswer)
    || !body.generatedNumbers || typeof body.generatedNumbers !== 'object' || Array.isArray(body.generatedNumbers)
    || JSON.stringify(body.generatedNumbers).length > 5_000) return jsonError('Invalid attempt', 400);
  const isCorrect = Math.abs(body.userAnswer - body.correctAnswer) < 0.01;
  const { error } = await getDb().from(TABLES.problemAttempts).insert({
    problem_id: body.problemId,
    user_id: user.profileId,
    user_answer: body.userAnswer,
    correct_answer: body.correctAnswer,
    is_correct: isCorrect,
    generated_numbers: body.generatedNumbers,
  });
  return error ? jsonError('Failed to submit attempt', 400) : NextResponse.json({ success: true, isCorrect });
}
