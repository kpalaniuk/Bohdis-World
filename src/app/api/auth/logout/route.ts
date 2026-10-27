import { NextResponse } from 'next/server';
import { clearSessionCookie, deleteSession } from '@/lib/server/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  await deleteSession(request);
  const response = NextResponse.json({ success: true });
  clearSessionCookie(response);
  return response;
}

