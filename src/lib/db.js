import mongoose from 'mongoose';

/**
 * MongoDB connection helper for Next.js
 * Database name: CMLResult
 */
const MONGODB_DB = process.env.MONGODB_DB || 'CMLResult';

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null, status: 'disconnected', error: null };
}

export async function connectToDatabase() {
  if (cached.conn) {
    return cached.conn;
  }

  const uri = process.env.MONGODB_URI;

  if (!uri || uri.trim() === '') {
    cached.status = 'unconfigured';
    cached.error = 'MONGODB_URI is not set in environment';
    throw new Error(cached.error);
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      dbName: MONGODB_DB,
      serverSelectionTimeoutMS: 5000,
    };

    cached.promise = mongoose.connect(uri, opts).then((m) => {
      cached.status = 'connected';
      cached.error = null;
      console.log(`[MongoDB] Connected successfully to database: ${MONGODB_DB}`);
      return m;
    }).catch((err) => {
      cached.status = 'error';
      cached.error = err.message;
      cached.promise = null;
      console.error('[MongoDB] Connection error:', err.message);
      throw err;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    cached.status = 'error';
    cached.error = e.message;
    throw e;
  }

  return cached.conn;
}

export function getDbStatus() {
  return {
    status: cached.status,
    dbName: MONGODB_DB,
    isConfigured: Boolean(process.env.MONGODB_URI && process.env.MONGODB_URI.trim() !== ''),
    error: cached.error,
  };
}
