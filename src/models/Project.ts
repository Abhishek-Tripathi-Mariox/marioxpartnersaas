import { Schema } from 'mongoose';
import { defineModel } from '@/lib/model';

const PaymentSchema = new Schema({
  label: { type: String, required: true },
  amount: { type: Number, required: true },
  due: String,
  status: { type: String, enum: ['upcoming', 'due', 'received'], default: 'upcoming' },
  // Set when the partner's commission on this payment has been paid out.
  releasedAt: String,
  utr: String,
});

// A won deal that Mariox is delivering. Created and updated by admins only.
const ProjectSchema = new Schema(
  {
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    lead: { type: Schema.Types.ObjectId, ref: 'Lead' },
    client: { type: String, required: true },
    contact: String,
    city: String,
    title: { type: String, required: true },
    deal: { type: Number, default: 0 },
    // Commission share for THIS deal (0–1), locked when the project is created so a later change
    // to the partner's default rate never rewrites commission already earned.
    commissionRate: { type: Number, min: 0, max: 1 },
    closedAt: String,
    stage: { type: Number, default: 0, min: 0, max: 4 },
    pm: String,
    update: String,
    milestones: [String], // one date per PROJECT_STAGES entry
    payments: [PaymentSchema],
  },
  { timestamps: true },
);

export const Project = defineModel('Project', ProjectSchema);
