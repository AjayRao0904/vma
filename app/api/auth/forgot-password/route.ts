// FORGOT PASSWORD DISABLED - Email functionality disabled until Resend domain is verified

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  return NextResponse.json(
    { error: 'Password reset is temporarily disabled. Please use Google Sign In.' },
    { status: 503 }
  );
}

/*
// ORIGINAL FORGOT PASSWORD ROUTE - COMMENTED OUT

import db from '../../../lib/db';
import { generateResetToken, validateEmail } from '../../../lib/password';
import { sendPasswordResetEmail } from '../../../lib/email';

export async function POST_ORIGINAL(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    if (!validateEmail(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    const user = await db.findUserByEmail(email);

    if (!user) {
      console.log('Password reset requested for non-existent email:', email);
      return NextResponse.json({
        success: true,
        message: 'If an account exists with this email, a password reset link has been sent.'
      });
    }

    const resetToken = generateResetToken();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await db.setPasswordResetToken(email, resetToken, expiresAt);

    const resetUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/reset-password/${resetToken}`;

    try {
      await sendPasswordResetEmail(user.email, user.name || user.email.split('@')[0], resetUrl);
    } catch (emailError) {
      console.error('Failed to send reset email:', emailError);
    }

    return NextResponse.json({
      success: true,
      message: 'If an account exists with this email, a password reset link has been sent.',
      ...(process.env.NODE_ENV === 'development' && { resetToken, resetUrl })
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { error: 'Failed to process request', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
*/
