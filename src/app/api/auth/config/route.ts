import { NextResponse } from 'next/server';
import { getBohdiClaimAvailability } from '@/lib/server/bohdiClaim';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const { available } = await getBohdiClaimAvailability();
  return NextResponse.json({
    signupCodeRequired: Boolean(process.env.SIGNUP_CODE),
    bohdiClaimAvailable: available,
  });
}
