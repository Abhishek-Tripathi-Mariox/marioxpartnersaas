import type { Model } from 'mongoose';
import type { ZodType } from 'zod';
import { Booking, Scope, TechRequest, Ticket } from '@/models/Requests';
import { requestCreate } from './schemas';
import { HttpError } from './api';
import { nextCode } from './codes';
import { openFile } from './files';

type KindConfig = { model: Model<any>; create: ZodType<Record<string, unknown>> }; // eslint-disable-line @typescript-eslint/no-explicit-any

// One registry drives /api/requests/[kind] for every partner request type.
export const REQUEST_KINDS: Record<'scope' | 'booking' | 'tech' | 'ticket', KindConfig> = {
  scope: { model: Scope, create: requestCreate.scope },
  booking: { model: Booking, create: requestCreate.booking },
  tech: { model: TechRequest, create: requestCreate.tech },
  ticket: { model: Ticket, create: requestCreate.ticket },
};

export type RequestKind = keyof typeof REQUEST_KINDS;

export function requestKind(kind: string): KindConfig {
  const k = REQUEST_KINDS[kind as RequestKind];
  if (!k) throw new HttpError(404, `Unknown request type "${kind}"`);
  return k;
}

// Extra fields filled in on create, per kind.
export async function createDefaults(kind: string, data: Record<string, unknown>, owner: string) {
  if (kind === 'scope') {
    const lines = (data.lines as { amount: number }[]) || [];
    // Only files this partner uploaded can be attached.
    for (const a of (data.attachments as { fileId: string }[]) || []) {
      const { doc } = await openFile(a.fileId);
      if (String(doc.metadata?.owner) !== owner) throw new HttpError(400, 'Attachment not found');
    }
    return { submitted: lines.reduce((a, l) => a + (l.amount || 0), 0) };
  }
  if (kind === 'ticket') {
    return { code: await nextCode(Ticket, 'code', 'TK', 4, 2001), status: data.escalate ? 'assigned' : 'requested' };
  }
  return {};
}
