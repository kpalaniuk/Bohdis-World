import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({ signupCodeRequired: Boolean(process.env.SIGNUP_CODE) });
}
