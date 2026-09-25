import { NextResponse } from 'next/server';
import {
  createAdminSessionToken,
  isAdminPasswordConfigured,
  verifyAdminPassword,
} from '@/lib/adminAuth';

export async function POST(request) {
  try {
    const { password } = await request.json();
    if (!isAdminPasswordConfigured()) {
      return NextResponse.json({
        success: false,
        message: 'Set ADMIN_PASSWORD to a unique value with at least 16 characters before enabling admin access.',
      }, { status: 503 });
    }

    if (!verifyAdminPassword(password)) {
      return NextResponse.json({ success: false, message: 'Invalid Admin Password/PIN' }, { status: 401 });
    }

    const response = NextResponse.json({ success: true, message: 'Authentication successful' });
    response.cookies.set('cml_admin_session', createAdminSessionToken(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 12 * 60 * 60,
    });
    return response;
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
