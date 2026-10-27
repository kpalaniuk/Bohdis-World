import { NextResponse } from 'next/server';
import { getSessionUser, type SessionUser } from './session';

export function jsonError(error: string, status: number): NextResponse {
  return NextResponse.json({ error }, { status });
}

export function getClientIp(request: Request): string {
  // Vercel supplies these headers at the edge. Keep the same precedence for every auth limiter.
  return (
    request.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip')?.trim() ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    'unknown'
  ).slice(0, 200);
}

export async function readJson(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const value: unknown = await request.json();
    return value !== null && typeof value === 'object' && !Array.isArray(value)
      ? value as Record<string, unknown>
      : null;
  } catch {
    return null;
  }
}

export async function requireUser(request: Request): Promise<SessionUser | NextResponse> {
  const user = await getSessionUser(request);
  return user ?? jsonError('Unauthorized', 401);
}

export function isErrorResponse(value: SessionUser | NextResponse): value is NextResponse {
  return value instanceof NextResponse;
}

export function requireAdmin(user: SessionUser): NextResponse | null {
  return user.role === 'admin' || user.role === 'superuser' ? null : jsonError('Forbidden', 403);
}

export function cleanUsername(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const username = value.trim().toLowerCase();
  return /^[a-z0-9_]{3,20}$/.test(username) ? username : null;
}

export function validDisplayName(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length >= 1 && value.trim().length <= 30;
}

export function validUuid(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function boundedInteger(value: unknown, maximum = 10_000): value is number {
  return typeof value === 'number' && Number.isInteger(value) && Math.abs(value) <= maximum;
}

export function validCustomWords(value: unknown): value is Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const entries = Object.entries(value);
  return entries.length <= 30 && entries.every(([key, word]) =>
    key.length <= 50 && typeof word === 'string' && word.length <= 500
  ) && JSON.stringify(value).length <= 5_000;
}
