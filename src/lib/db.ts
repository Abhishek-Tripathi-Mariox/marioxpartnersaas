import mongoose from 'mongoose';

// Reuse one connection across hot reloads and serverless invocations.
const g = globalThis as unknown as { _mongo?: Promise<typeof mongoose> };

export function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not set');
  if (!g._mongo) g._mongo = mongoose.connect(uri, { bufferCommands: false });
  return g._mongo;
}
