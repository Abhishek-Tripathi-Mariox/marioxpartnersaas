import { Schema } from 'mongoose';
import { defineModel } from '@/lib/model';

// Sales kit files shown to every partner.
export const Resource =
  defineModel(
    'Resource',
    new Schema(
      {
        type: { type: String, required: true },
        industry: { type: String, default: 'All' },
        title: { type: String, required: true },
        format: String,
        size: String,
        url: String, // optional external link (used when no file is uploaded)
        // Uploaded file on S3 (see models/File.ts). `type` is wrapped so Mongoose doesn't read it as the field type.
        file: { _id: false, fileId: String, name: String, size: Number, type: { type: String } },
        hidden: { type: Boolean, default: false },
      },
      { timestamps: true },
    ),
  );

// Single document holding portal-wide settings: escalation contacts, announcement and the
// sales pipeline (stages, sources, priorities, lost reasons). Missing parts fall back to
// DEFAULT_PIPELINE in lib/pipeline.ts.
export const Setting =
  defineModel(
    'Setting',
    new Schema(
      {
        key: { type: String, unique: true, default: 'portal' },
        contacts: [{ _id: false, title: String, name: String, role: String, phone: String, email: String, note: String }],
        announcement: String,
        pipeline: {
          stages: [{ _id: false, key: String, name: String, prob: Number }],
          sources: [String],
          priorities: [{ _id: false, name: String, tone: String }],
          lostReasons: [String],
        },
      },
      { timestamps: true },
    ),
  );
