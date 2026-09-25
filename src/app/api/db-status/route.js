import { NextResponse } from 'next/server';
import { connectToDatabase, getDbStatus } from '@/lib/db';

export async function GET() {
  try {
    const conn = await connectToDatabase();
    const status = getDbStatus();
    return NextResponse.json({
      success: true,
      connected: Boolean(conn),
      status: status.status,
      dbName: status.dbName,
      isConfigured: status.isConfigured,
      error: status.error,
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      connected: false,
      error: error.message,
    }, { status: 500 });
  }
}
