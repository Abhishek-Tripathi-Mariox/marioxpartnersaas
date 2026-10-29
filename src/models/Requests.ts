import { Schema } from 'mongoose';
import { defineModel } from '@/lib/model';

// Things a partner asks Mariox for. Partner creates, admin changes status and replies.
const owner = { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true };
const opts = { timestamps: true };

export const Scope =
  defineModel(
    'Scope',
    new Schema(
      {
        owner,
        client: { type: String, required: true },
        project: { type: String, required: true },
        needs: String,
        lines: [{ name: String, amount: Number }],
        // `type` must be wrapped: a bare `type: String` would make Mongoose treat the whole object as a String.
        attachments: [{ _id: false, fileId: String, name: String, size: Number, type: { type: String } }],
        submitted: { type: Number, default: 0 },
        approved: Number,
        status: { type: String, default: 'review' },
        comment: String,
      },
      opts,
    ),
  );

export const Booking =
  defineModel(
    'Booking',
    new Schema(
      {
        owner,
        client: { type: String, required: true },
        office: String,
        date: String,
        time: String,
        purpose: String,
        team: String,
        guests: Number,
        status: { type: String, default: 'Requested' },
        comment: String,
      },
      opts,
    ),
  );

export const TechRequest =
  defineModel(
    'TechRequest',
    new Schema(
      {
        owner,
        type: { type: String, required: true },
        client: { type: String, required: true },
        date: String,
        time: String,
        duration: String,
        mode: String,
        link: String,
        context: String,
        status: { type: String, default: 'requested' },
        assignee: String,
        comment: String,
      },
      opts,
    ),
  );

export const Ticket =
  defineModel(
    'Ticket',
    new Schema(
      {
        owner,
        code: { type: String, unique: true },
        subject: { type: String, required: true },
        category: String,
        body: String,
        escalate: { type: Boolean, default: false },
        status: { type: String, default: 'requested' },
        assignee: String,
        comment: String,
      },
      opts,
    ),
  );
