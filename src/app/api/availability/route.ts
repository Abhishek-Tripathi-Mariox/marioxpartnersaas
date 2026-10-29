import { handle, session, ok, HttpError } from '@/lib/api';
import { Booking } from '@/models/Requests';

// GET /api/availability?office=Noida&date=2026-11-03
// Time slots already taken at that office on that day, across all partners (no partner details returned).
export const GET = handle(async req => {
  await session();
  const p = new URL(req.url).searchParams;
  const office = p.get('office'), date = p.get('date');
  if (!office || !date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new HttpError(400, 'office and date (YYYY-MM-DD) are required');
  const taken = await Booking.distinct('time', { office, date, status: { $nin: ['Declined', 'Completed'] } });
  return ok({ taken });
});
