import { NextResponse } from 'next/server';
import { getDb } from '@/lib/server/db';
import { TABLES } from '@/lib/server/tables';
import { boundedInteger, isErrorResponse, jsonError, readJson, requireUser, validCustomWords } from '@/lib/server/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function validInput(body: Record<string, unknown> | null) {
  return !!body && (body.templateId === null || (typeof body.templateId === 'string' && body.templateId.length <= 100))
    && validCustomWords(body.customWords) && boundedInteger(body.difficultyLevel, 10)
    && Number(body.difficultyLevel) >= 1;
}

export async function GET(request: Request) {
  const user = await requireUser(request);
  if (isErrorResponse(user)) return user;
  const { data, error } = await getDb().from(TABLES.userProblems).select('*')
    .eq('user_id', user.profileId).order('created_at', { ascending: false });
  return error ? jsonError('Failed to load problems', 400) : NextResponse.json({ success: true, problems: data || [] });
}

export async function POST(request: Request) {
  const user = await requireUser(request);
  if (isErrorResponse(user)) return user;
  const body = await readJson(request);
  if (!validInput(body)) return jsonError('Invalid word problem', 400);
  const { data, error } = await getDb().from(TABLES.userProblems).insert({
    user_id: user.profileId,
    template_id: body!.templateId,
    custom_words: body!.customWords,
    difficulty_level: body!.difficultyLevel,
  }).select('id').single();
  return error || !data
    ? jsonError('Failed to save problem', 400)
    : NextResponse.json({ success: true, problemId: data.id });
}

export async function PUT(request: Request) {
  const user = await requireUser(request);
  if (isErrorResponse(user)) return user;
  const body = await readJson(request);
  if (!validInput(body) || typeof body?.problemId !== 'string' || body.problemId.length > 100) return jsonError('Invalid word problem', 400);
  const { error } = await getDb().from(TABLES.userProblems).update({
    template_id: body.templateId,
    custom_words: body.customWords,
    difficulty_level: body.difficultyLevel,
    updated_at: new Date().toISOString(),
  }).eq('id', body.problemId).eq('user_id', user.profileId);
  return error ? jsonError('Failed to update problem', 400) : NextResponse.json({ success: true });
}

export async function DELETE(request: Request) {
  const user = await requireUser(request);
  if (isErrorResponse(user)) return user;
  const body = await readJson(request);
  if (typeof body?.problemId !== 'string' || body.problemId.length > 100) return jsonError('Invalid problem id', 400);
  const { error } = await getDb().from(TABLES.userProblems).delete().eq('id', body.problemId).eq('user_id', user.profileId);
  return error ? jsonError('Failed to delete problem', 400) : NextResponse.json({ success: true });
}

