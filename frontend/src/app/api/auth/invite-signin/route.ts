import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import crypto from 'crypto';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function POST(request: NextRequest) {
  const { token } = await request.json();
  if (!token) {
    return NextResponse.json({ error: 'Missing token' }, { status: 400 });
  }

  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  // 1. Validate the invitation
  const previewRes = await fetch(`${apiBase}/api/invitations/${token}`);
  if (!previewRes.ok) {
    return NextResponse.json({ error: 'Invalid invitation' }, { status: 400 });
  }
  const preview = await previewRes.json();
  if (preview.status !== 'pending') {
    return NextResponse.json({ error: 'Invitation is no longer pending' }, { status: 400 });
  }
  if (!preview.user_exists) {
    return NextResponse.json({ error: 'No account found for this email' }, { status: 400 });
  }

  // 2. Find the user by email
  const userResult = await pool.query(
    `SELECT id FROM public."user" WHERE email = $1 LIMIT 1`,
    [preview.email],
  );
  if (userResult.rows.length === 0) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }
  const userId: string = userResult.rows[0].id;

  // 3. Create a Better Auth session directly in the DB
  const sessionId = crypto.randomUUID();
  const sessionToken = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days — match Better Auth default

  await pool.query(
    `INSERT INTO public.session (id, "expiresAt", token, "createdAt", "updatedAt", "userId")
     VALUES ($1, $2, $3, NOW(), NOW(), $4)`,
    [sessionId, expiresAt, sessionToken, userId],
  );

  // 4. Set the session cookie on the Next.js domain so useAuth picks it up
  const response = NextResponse.json({ success: true, sessionToken });
  response.cookies.set('better-auth.session_token', sessionToken, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    expires: expiresAt,
    secure: process.env.NODE_ENV === 'production',
  });
  return response;
}
