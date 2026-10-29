import mongoose from 'mongoose';

// Reuse one connection across hot reloads and serverless invocations.
const g = globalThis as unknown as { _mongo?: Promise<typeof mongoose> };

export function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not set (add it to .env.local or the server environment)');
  if (!g._mongo) {
    // Fail in seconds, not 30s, when MongoDB is unreachable, and allow a retry on the next request.
    g._mongo = mongoose.connect(uri, { bufferCommands: false, serverSelectionTimeoutMS: 5000 }).catch(err => {
      g._mongo = undefined;
      throw err;
    });
  }
  return g._mongo;
}
