import { Schema, type InferSchemaType } from 'mongoose';
import { defineModel } from '@/lib/model';
import { DEFAULT_COMMISSION_RATE } from '@/lib/constants';

const UserSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, select: false },
    role: { type: String, enum: ['admin', 'partner'], default: 'partner' },
    status: { type: String, enum: ['invited', 'active', 'disabled'], default: 'invited' },
    partnerCode: { type: String, unique: true, sparse: true },
    company: String,
    phone: String,
    city: String,
    industries: String,
    pan: String,
    gstin: String,
    bankAccount: String,
    ifsc: String,
    commissionRate: { type: Number, default: DEFAULT_COMMISSION_RATE },
    // Where the account came from, e.g. "main-site" when created through /api/v1/users.
    source: { type: String, default: 'admin' },
    externalId: { type: String, index: true, sparse: true },
    inviteToken: { type: String, index: true, select: false },
    inviteExpires: { type: Date, select: false },
    lastLoginAt: Date,
    // Bumped on password change / admin reset; sessions signed with an older value stop working.
    sessionVersion: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export type UserDoc = InferSchemaType<typeof UserSchema>;
export const User = defineModel('User', UserSchema);
