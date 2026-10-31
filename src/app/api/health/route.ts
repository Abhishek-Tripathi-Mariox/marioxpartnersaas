import mongoose from 'mongoose';
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { storageStatus } from '@/lib/files';

export const dynamic = 'force-dynamic';

// Public deployment check: GET /api/health
// Reports whether MongoDB is reachable and which settings are missing. Never returns secret values.
export async function GET() {
  const checks = {
    mode: process.env.NODE_ENV,
    node: process.version,
    MONGODB_URI: Boolean(process.env.MONGODB_URI),
    JWT_SECRET: Boolean(process.env.JWT_SECRET) && process.env.JWT_SECRET !== 'change-me-to-a-long-random-string',
    MAIN_SITE_API_KEY: Boolean(process.env.MAIN_SITE_API_KEY),
    APP_URL: process.env.APP_URL ?? null,
  };
  const started = Date.now();
  try {
    await connectDB();
    await mongoose.connection.db!.admin().ping();
    const storage = await storageStatus();
    return NextResponse.json({ ok: storage.storage === 'up', db: 'up', dbMs: Date.now() - started, ...storage, ...checks }, { status: storage.storage === 'up' ? 200 : 503 });
  } catch (e) {
    return NextResponse.json({ ok: false, db: 'down', error: (e as Error).message, ...checks }, { status: 503 });
  }
}
