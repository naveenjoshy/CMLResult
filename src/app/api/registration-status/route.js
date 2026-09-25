import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

function getRegistrationEndDate() {
  if (process.env.REGISTRATION_END_DATE && process.env.REGISTRATION_END_DATE.trim() !== '') {
    return process.env.REGISTRATION_END_DATE.trim();
  }
  try {
    const envPath = path.resolve(process.cwd(), '.env.local');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      const match = content.match(/^REGISTRATION_END_DATE=(.*)$/m);
      if (match) {
        return match[1].trim();
      }
    }
  } catch (e) {
    // ignore
  }
  return null;
}

export function isRegistrationOpen() {
  const endDateStr = getRegistrationEndDate();
  if (!endDateStr || endDateStr === '') {
    return { isOpen: true, endDate: null, endDateFormatted: '' };
  }

  const endDate = new Date(endDateStr);
  if (isNaN(endDate.getTime())) {
    return { isOpen: true, endDate: null, endDateFormatted: '' };
  }

  const now = new Date();
  const isOpen = now <= endDate;
  return {
    isOpen,
    endDate: endDateStr,
    endDateFormatted: endDate.toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }),
  };
}

export async function GET() {
  const status = isRegistrationOpen();
  return NextResponse.json({
    success: true,
    ...status,
    message: status.isOpen
      ? 'Registration is currently open.'
      : 'registration date is over, contact admin for more details.',
  });
}
