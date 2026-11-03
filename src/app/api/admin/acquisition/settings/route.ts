import { z } from 'zod';
import { handle, admin, body, ok } from '@/lib/api';
import { emailsSchema, listsSchema, saveEmails, saveLists } from '@/lib/acquisition-server';

// PUT /api/admin/acquisition/settings
//   { lists }  team, sources, channels, services, countries, rejection reasons
//   { emails } team member → email, so they get calendar invites
export const PUT = handle(async req => {
  await admin();
  const r = await body(req, z.object({ lists: listsSchema.optional(), emails: emailsSchema.optional() }));
  return ok({
    ...(r.lists ? { lists: await saveLists(r.lists) } : {}),
    ...(r.emails ? { emails: await saveEmails(r.emails) } : {}),
  });
});
