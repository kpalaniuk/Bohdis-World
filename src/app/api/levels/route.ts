import { createHash } from 'node:crypto';
import { Buffer } from 'buffer';
import { NextResponse } from 'next/server';
import { parseLev } from '@/components/game/elasto/elma';
import { getDb } from '@/lib/server/db';
import { isErrorResponse, jsonError, readJson, requireAdmin, requireUser } from '@/lib/server/http';
import { getSessionUser } from '@/lib/server/session';
import { TABLES } from '@/lib/server/tables';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const PAGE_SIZE = 50;
const DATABASE_PAGE_SIZE = 1000;
const MAX_USER_LEVEL_BYTES = 100 * 1024 * 1024;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const shelf = url.searchParams.get('shelf');
  if (shelf !== 'community' && shelf !== 'mine') return jsonError('Invalid shelf', 400);
  const user = await getSessionUser(request);
  if (shelf === 'mine' && !user) return jsonError('Unauthorized', 401);
  const requestedPage = Number(url.searchParams.get('page') || 1);
  const page = Number.isInteger(requestedPage) ? Math.max(1, requestedPage) : 1;
  const q = (url.searchParams.get('q') || '').trim().toLowerCase().slice(0, 100);
  const rows: Array<{ id: string; file_name: string; level_name: string; size_bytes: number; sha256: string }> = [];
  for (let offset = 0; ; offset += DATABASE_PAGE_SIZE) {
    let query = getDb().from(TABLES.levels).select('id, file_name, level_name, size_bytes, sha256').eq('shelf', shelf);
    query = shelf === 'mine' ? query.eq('owner_profile_id', user!.profileId) : query;
    const { data, error } = await query.order('file_name', { ascending: true }).range(offset, offset + DATABASE_PAGE_SIZE - 1);
    if (error) return jsonError('Failed to load levels', 400);
    const batch = (data || []) as typeof rows;
    rows.push(...batch);
    if (batch.length < DATABASE_PAGE_SIZE) break;
  }
  const matching = rows.filter((level) => !q || level.file_name.toLowerCase().includes(q) || level.level_name.toLowerCase().includes(q));
  const start = (page - 1) * PAGE_SIZE;
  return NextResponse.json({ levels: matching.slice(start, start + PAGE_SIZE), page, hasMore: start + PAGE_SIZE < matching.length });
}

function decodeFile(value: unknown): { fileName: string; bytes: Buffer; levelName: string; sha256: string } | null {
  if (!value || typeof value !== 'object') return null;
  const file = value as Record<string, unknown>;
  if (typeof file.fileName !== 'string' || file.fileName.length < 1 || file.fileName.length > 255 || typeof file.bytesB64 !== 'string') return null;
  try {
    const bytes = Buffer.from(file.bytesB64, 'base64');
    if (bytes.length === 0 || bytes.length > 300_000 || bytes.toString('base64').replace(/=+$/, '') !== file.bytesB64.replace(/=+$/, '')) return null;
    const level = parseLev(bytes);
    return { fileName: file.fileName, bytes, levelName: level.name, sha256: createHash('sha256').update(bytes).digest('hex') };
  } catch { return null; }
}

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > 10 * 1024 * 1024) return jsonError('Request is too large', 413);
  const user = await requireUser(request);
  if (isErrorResponse(user)) return user;
  const body = await readJson(request);
  if (body && JSON.stringify(body).length > 10 * 1024 * 1024) return jsonError('Request is too large', 413);
  const shelf = body?.shelf;
  if (shelf !== 'mine' && shelf !== 'community') return jsonError('Invalid shelf', 400);
  if (shelf === 'community') { const denied = requireAdmin(user); if (denied) return denied; }
  if (!Array.isArray(body?.files) || body.files.length < 1 || body.files.length > 200) return jsonError('Send 1 to 200 files', 400);
  const files = body.files.map(decodeFile);
  if (files.some((file) => file === null)) return jsonError('Every file must be a valid Elasto Mania level of at most 300 KB', 400);
  const validFiles = files.filter((file): file is NonNullable<typeof file> => file !== null);
  if (validFiles.reduce((sum, file) => sum + file.bytes.length, 0) > 10 * 1024 * 1024) return jsonError('Request is too large', 413);
  const db = getDb();
  if (shelf === 'mine') {
    const { count, error: countError } = await db.from(TABLES.levels)
      .select('id', { count: 'exact', head: true }).eq('shelf', 'mine').eq('owner_profile_id', user.profileId);
    if (countError) return jsonError('Failed to check level limits', 400);
    let ownedBytes = 0;
    const ownedHashes = new Set<string>();
    for (let offset = 0; ; offset += DATABASE_PAGE_SIZE) {
      const { data, error } = await db.from(TABLES.levels).select('size_bytes, sha256').eq('shelf', 'mine')
        .eq('owner_profile_id', user.profileId).range(offset, offset + DATABASE_PAGE_SIZE - 1);
      if (error) return jsonError('Failed to check level limits', 400);
      const batch = (data || []) as Array<{ size_bytes: number; sha256: string }>;
      for (const level of batch) { ownedBytes += level.size_bytes; ownedHashes.add(level.sha256); }
      if (batch.length < DATABASE_PAGE_SIZE) break;
    }
    const uniqueIncoming = [...new Map(validFiles.map((file) => [file.sha256, file])).values()]
      .filter((file) => !ownedHashes.has(file.sha256));
    if ((count || 0) + uniqueIncoming.length > 2000) return jsonError('My levels is limited to 2000 levels', 400);
    if (ownedBytes + uniqueIncoming.reduce((sum, file) => sum + file.bytes.length, 0) > MAX_USER_LEVEL_BYTES) {
      return jsonError('My levels is limited to 100 MB', 400);
    }
  }
  let added = 0; let duplicates = 0;
  for (const file of validFiles) {
    let existingQuery = db.from(TABLES.levels).select('id').eq('shelf', shelf).eq('sha256', file.sha256);
    if (shelf === 'mine') existingQuery = existingQuery.eq('owner_profile_id', user.profileId);
    const { data: existing } = await existingQuery.limit(1);
    if (existing?.length) { duplicates += 1; continue; }
    const { error } = await db.from(TABLES.levels).insert({
      owner_profile_id: shelf === 'mine' ? user.profileId : null, shelf, file_name: file.fileName,
      level_name: file.levelName, sha256: file.sha256, bytes_b64: file.bytes.toString('base64'), size_bytes: file.bytes.length,
    });
    if (error) return jsonError('Failed to save levels', 400);
    added += 1;
  }
  return NextResponse.json({ added, duplicates });
}
