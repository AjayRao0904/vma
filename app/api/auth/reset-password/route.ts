// RESET PASSWORD DISABLED - Email functionality disabled until Resend domain is verified

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  return NextResponse.json(
    { error: 'Password reset is temporarily disabled. Please use Google Sign In.' },
    { status: 503 }
  );
}

/*
// ORIGINAL RESET PASSWORD ROUTE - COMMENTED OUT

import db from '../../../lib/db';
import { hashPassword, validatePassword } from '../../../lib/password';

// ... original implementation commented out for brevity
// Uncomment when Resend domain is verified
*/
