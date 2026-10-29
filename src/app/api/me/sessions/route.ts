import { handle, session, ok } from '@/lib/api';
import { setSessionCookie } from '@/lib/cookie';
import { User } from '@/models/User';

// "Sign out of all other devices": invalidates every session except the current one.
export const DELETE = handle(async () => {
  const s = await session();
  const user = await User.findByIdAndUpdate(s.sub, { $inc: { sessionVersion: 1 } }, { new: true });
  await setSessionCookie({ sub: s.sub, role: s.role, name: s.name, v: user.sessionVersion });
  return ok({ ok: true });
});
