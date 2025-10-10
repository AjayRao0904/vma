// REGISTRATION DISABLED - Email/password registration disabled until Resend domain is verified
// Users should use Google Sign In only

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  return NextResponse.json(
    { error: 'Registration is temporarily disabled. Please use Google Sign In.' },
    { status: 503 }
  );
}

/*
// ORIGINAL REGISTRATION ROUTE - COMMENTED OUT

import db from '../../../lib/db';
import { hashPassword, validateEmail, validatePassword } from '../../../lib/password';

export async function POST_ORIGINAL(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, confirmPassword, name } = body;

    if (!email || !password || !confirmPassword) {
      return NextResponse.json(
        { error: 'Email, password, and password confirmation are required' },
        { status: 400 }
      );
    }

    if (!validateEmail(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    if (password !== confirmPassword) {
      return NextResponse.json(
        { error: 'Passwords do not match' },
        { status: 400 }
      );
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      return NextResponse.json(
        { error: passwordError },
        { status: 400 }
      );
    }

    const existingUser = await db.findUserByEmail(email);
    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);

    const user = await db.createUser({
      email,
      name: name || email.split('@')[0],
      password_hash: passwordHash
    });

    console.log('User registered successfully:', user.id);

    return NextResponse.json({
      success: true,
      message: 'Account created successfully! Please sign in.',
      userId: user.id
    });

  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Failed to create account', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
*/
