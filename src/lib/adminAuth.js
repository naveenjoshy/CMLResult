import { createHmac, timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';

export const ADMIN_SESSION_COOKIE = 'cml_admin_session';
const SESSION_DURATION_SECONDS = 12 * 60 * 60;
const MIN_ADMIN_PASSWORD_LENGTH = 16;

function getAdminPassword() {
  const password = process.env.ADMIN_PASSWORD || '';
  if (password.length < MIN_ADMIN_PASSWORD_LENGTH || password === 'admin123') return '';
  return password;
}

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(String(left));
  const rightBuffer = Buffer.from(String(right));
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function sign(payload, secret) {
  return createHmac('sha256', secret).update(payload).digest('base64url');
}

export function isAdminPasswordConfigured() {
  return Boolean(getAdminPassword());
}

export function verifyAdminPassword(input) {
  const password = getAdminPassword();
  return Boolean(password) && safeEqual(input || '', password);
}

export function createAdminSessionToken() {
  const password = getAdminPassword();
  if (!password) throw new Error('ADMIN_PASSWORD must be set to a unique value with at least 16 characters.');
  const payload = Buffer.from(JSON.stringify({
    expiresAt: Date.now() + SESSION_DURATION_SECONDS * 1000,
  })).toString('base64url');
  return `${payload}.${sign(payload, password)}`;
}

export function isAdminAuthenticated(request) {
  const password = getAdminPassword();
  if (!password) return false;

  const cookieHeader = request.headers.get('cookie') || '';
  const cookie = cookieHeader.split(';').map(part => part.trim()).find(part => part.startsWith(`${ADMIN_SESSION_COOKIE}=`));
  if (!cookie) return false;

  const token = cookie.slice(ADMIN_SESSION_COOKIE.length + 1);
  const [payload, signature] = token.split('.');
  if (!payload || !signature || !safeEqual(signature, sign(payload, password))) return false;

  try {
    const session = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return Number.isFinite(session.expiresAt) && session.expiresAt > Date.now();
  } catch {
    return false;
  }
}

export function requireAdmin(request) {
  if (isAdminAuthenticated(request)) return null;
  const configured = isAdminPasswordConfigured();
  return NextResponse.json({
    success: false,
    message: configured ? 'Admin authentication required.' : 'Admin password must be configured securely.',
  }, { status: configured ? 401 : 503 });
}

export function setAdminSessionCookie(response) {
  response.cookies.set(ADMIN_SESSION_COOKIE, createAdminSessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: SESSION_DURATION_SECONDS,
  });
  return response;
}

export function clearAdminSessionCookie(response) {
  response.cookies.set(ADMIN_SESSION_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 0,
  });
  return response;
}