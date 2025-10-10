import { NextRequest, NextResponse } from 'next/server';
import db from '../../../lib/db';
import { logger } from '../../../lib/logger';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { valid: false, error: 'Token is required' },
        { status: 400 }
      );
    }

    // Check if token exists and is not expired
    const user = await db.findUserByResetToken(token);

    if (!user) {
      return NextResponse.json({
        valid: false,
        error: 'Invalid or expired reset token'
      });
    }

    return NextResponse.json({
      valid: true,
      message: 'Token is valid'
    });

  } catch (error) {
    logger.error('Verify reset token error', error);
    return NextResponse.json(
      { valid: false, error: 'Failed to verify token' },
      { status: 500 }
    );
  }
}
