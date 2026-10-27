import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/server/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ user: null }, { status: 401 });
  const safeUser = {
    id: user.id,
    username: user.username,
    display_name: user.display_name,
    role: user.role,
    can_gift_items: user.can_gift_items,
  };
  return NextResponse.json({ user: safeUser });
}
