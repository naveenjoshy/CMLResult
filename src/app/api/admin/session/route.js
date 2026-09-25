import { NextResponse } from 'next/server';
import { isAdminAuthenticated, isAdminPasswordConfigured } from '@/lib/adminAuth';

export async function GET(request) {
  if (!isAdminPasswordConfigured()) {
    return NextResponse.json({ authenticated: false, message: 'Admin password must be configured securely.' }, { status: 503 });
  }
  if (!isAdminAuthenticated(request)) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
  return NextResponse.json({ authenticated: true });
}