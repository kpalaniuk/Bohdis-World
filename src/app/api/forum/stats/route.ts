import { NextResponse } from 'next/server';
import { getDb } from '@/lib/server/db';
import { TABLES } from '@/lib/server/tables';
import { isErrorResponse, jsonError, requireUser } from '@/lib/server/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const user = await requireUser(request);
  if (isErrorResponse(user)) return user;
  const problemId = new URL(request.url).searchParams.get('problemId');
  if (!problemId || problemId.length > 100) return jsonError('Invalid problem id', 400);
  const { data, error } = await getDb().from(TABLES.problemAttempts).select('is_correct').eq('problem_id', problemId);
  if (error) return jsonError('Failed to load stats', 400);
  return NextResponse.json({
    attemptCount: data?.length || 0,
    correctCount: data?.filter(attempt => attempt.is_correct).length || 0,
  });
}

