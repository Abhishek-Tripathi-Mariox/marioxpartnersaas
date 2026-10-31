import { Schema } from 'mongoose';
import { defineModel } from '@/lib/model';

// Index of uploaded files. The bytes live in S3 under `key`; this record holds who may read them.
//  - owner:  the uploader (partner or admin)
//  - shared: readable by every signed-in user (sales kit files that are not hidden)
const FileSchema = new Schema(
  {
    key: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    size: { type: Number, required: true },
    type: { type: String, default: 'application/octet-stream' },
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    shared: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export const FileRecord = defineModel('File', FileSchema);
