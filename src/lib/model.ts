import mongoose, { type Schema } from 'mongoose';

// Registers a Mongoose model once per process. In development, hot reload re-runs model files
// but `mongoose.models` survives, so a plain `models.X || model(...)` keeps the OLD schema and
// silently drops newly added fields. Replacing the cached model makes schema edits apply at once.
export function defineModel(name: string, schema: Schema) {
  if (process.env.NODE_ENV !== 'production' && mongoose.models[name]) mongoose.deleteModel(name);
  return mongoose.models[name] || mongoose.model(name, schema);
}
