import { NextResponse } from 'next/server';
import { getDb } from '@/lib/server/db';
import { EMBEDS, TABLES } from '@/lib/server/tables';
import { boundedInteger, isErrorResponse, jsonError, readJson, requireUser, validCustomWords } from '@/lib/server/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const user = await requireUser(request);
  if (isErrorResponse(user)) return user;
  const url = new URL(request.url);
  const difficulty = url.searchParams.get('difficultyLevel');
  const requestedLimit = Number(url.searchParams.get('limit') || 50);
  const limit = Number.isInteger(requestedLimit) ? Math.min(100, Math.max(1, requestedLimit)) : 50;
  let query = getDb().from(TABLES.forumProblems).select(EMBEDS.forumProblemAuthor)
    .eq('is_active', true);
  if (difficulty !== null) {
    const level = Number(difficulty);
    if (!boundedInteger(level, 10) || level < 1) return jsonError('Invalid difficulty level', 400);
    query = query.eq('difficulty_level', level);
  }
  const { data, error } = await query.order('created_at', { ascending: false }).limit(limit);
  if (error) return jsonError('Failed to load forum problems', 400);
  const db = getDb();
  const problems = await Promise.all((data || []).map(async problem => {
    const profile = Array.isArray(problem.bohdi_user_profiles) ? problem.bohdi_user_profiles[0] : problem.bohdi_user_profiles;
    const { data: attempts } = await db.from(TABLES.problemAttempts).select('is_correct').eq('problem_id', problem.id);
    return {
      ...problem,
      username: profile?.username,
      display_name: profile?.bohdi_simple_users?.display_name,
      attempt_count: attempts?.length || 0,
      correct_count: attempts?.filter(item => item.is_correct).length || 0,
    };
  }));
  return NextResponse.json({ success: true, problems });
}

export async function POST(request: Request) {
  const user = await requireUser(request);
  if (isErrorResponse(user)) return user;
  const body = await readJson(request);
  if (!body || (body.templateId !== null && (typeof body.templateId !== 'string' || body.templateId.length > 100))
    || !validCustomWords(body.customWords) || !boundedInteger(body.difficultyLevel, 10) || Number(body.difficultyLevel) < 1) {
    return jsonError('Invalid word problem', 400);
  }
  const { data, error } = await getDb().from(TABLES.forumProblems).insert({
    user_id: user.profileId,
    template_id: body.templateId,
    custom_words: body.customWords,
    difficulty_level: body.difficultyLevel,
    is_active: true,
  }).select('id').single();
  return error || !data ? jsonError('Failed to post problem', 400) : NextResponse.json({ success: true, problemId: data.id });
}

export async function DELETE(request: Request) {
  const user = await requireUser(request);
  if (isErrorResponse(user)) return user;
  const body = await readJson(request);
  if (typeof body?.problemId !== 'string' || body.problemId.length > 100) return jsonError('Invalid problem id', 400);
  const db = getDb();
  const { data: problem } = await db.from(TABLES.forumProblems).select('user_id').eq('id', body.problemId).single();
  if (!problem) return jsonError('Problem not found', 400);
  const admin = user.role === 'admin' || user.role === 'superuser';
  if (problem.user_id !== user.profileId && !admin) return jsonError('Forbidden', 403);
  const { error } = await db.from(TABLES.forumProblems).update({ is_active: false, updated_at: new Date().toISOString() }).eq('id', body.problemId);
  return error ? jsonError('Failed to delete problem', 400) : NextResponse.json({ success: true });
}
