import { z } from 'zod';

// One set of input rules for the whole app. Each rule takes the (trimmed) text and returns an error
// message or null. The same rules run in the browser (inline field errors) and on the server (zod),
// so a request sent around the UI is checked just the same.

export type Rule = (v: string) => string | null;

/* ------------------------------------------------------------------ phone numbers with a country code */
// dial: country calling code; len: allowed lengths of the national number (without the leading 0).
export type Country = { iso: string; name: string; dial: string; len: number[]; flag: string; start?: RegExp };
export const COUNTRIES: Country[] = [
  { iso: 'IN', name: 'India', dial: '91', len: [10], flag: '🇮🇳', start: /^[6-9]/ },
  { iso: 'AE', name: 'UAE', dial: '971', len: [9], flag: '🇦🇪', start: /^[2-9]/ },
  { iso: 'US', name: 'USA', dial: '1', len: [10], flag: '🇺🇸', start: /^[2-9]/ },
  { iso: 'GB', name: 'UK', dial: '44', len: [10], flag: '🇬🇧', start: /^[1-9]/ },
  { iso: 'SA', name: 'Saudi Arabia', dial: '966', len: [9], flag: '🇸🇦', start: /^[1-9]/ },
  { iso: 'QA', name: 'Qatar', dial: '974', len: [8], flag: '🇶🇦' },
  { iso: 'OM', name: 'Oman', dial: '968', len: [8], flag: '🇴🇲' },
  { iso: 'KW', name: 'Kuwait', dial: '965', len: [8], flag: '🇰🇼' },
  { iso: 'BH', name: 'Bahrain', dial: '973', len: [8], flag: '🇧🇭' },
  { iso: 'SG', name: 'Singapore', dial: '65', len: [8], flag: '🇸🇬' },
  { iso: 'MY', name: 'Malaysia', dial: '60', len: [9, 10], flag: '🇲🇾' },
  { iso: 'CA', name: 'Canada', dial: '1', len: [10], flag: '🇨🇦', start: /^[2-9]/ },
  { iso: 'AU', name: 'Australia', dial: '61', len: [9], flag: '🇦🇺' },
  { iso: 'NZ', name: 'New Zealand', dial: '64', len: [8, 9, 10], flag: '🇳🇿' },
  { iso: 'DE', name: 'Germany', dial: '49', len: [10, 11], flag: '🇩🇪' },
  { iso: 'FR', name: 'France', dial: '33', len: [9], flag: '🇫🇷' },
  { iso: 'NL', name: 'Netherlands', dial: '31', len: [9], flag: '🇳🇱' },
  { iso: 'IE', name: 'Ireland', dial: '353', len: [9], flag: '🇮🇪' },
  { iso: 'ZA', name: 'South Africa', dial: '27', len: [9], flag: '🇿🇦' },
  { iso: 'KE', name: 'Kenya', dial: '254', len: [9], flag: '🇰🇪' },
  { iso: 'NG', name: 'Nigeria', dial: '234', len: [10], flag: '🇳🇬' },
  { iso: 'NP', name: 'Nepal', dial: '977', len: [10], flag: '🇳🇵' },
  { iso: 'BD', name: 'Bangladesh', dial: '880', len: [10], flag: '🇧🇩' },
  { iso: 'LK', name: 'Sri Lanka', dial: '94', len: [9], flag: '🇱🇰' },
  { iso: 'JP', name: 'Japan', dial: '81', len: [10], flag: '🇯🇵' },
  { iso: 'HK', name: 'Hong Kong', dial: '852', len: [8], flag: '🇭🇰' },
];
export const DEFAULT_COUNTRY = COUNTRIES[0];
export const countryByIso = (iso?: string) => COUNTRIES.find(c => c.iso === iso);

// "+91 98765 43210" → { country, digits }. Numbers saved before country codes existed ("9876543210")
// are read as Indian. The longest matching calling code wins (+971 before +9…).
export function parsePhone(raw?: string | null, prefer?: string): { country: Country; digits: string } {
  const s = String(raw ?? '').trim();
  const all = s.replace(/\D/g, '');
  if (!s.startsWith('+')) return { country: countryByIso(prefer) ?? DEFAULT_COUNTRY, digits: all.replace(/^0+/, '') };
  const byDial = [...COUNTRIES].sort((a, b) => b.dial.length - a.dial.length);
  const hit = byDial.filter(c => all.startsWith(c.dial));
  // +1 is shared by the USA and Canada: keep the one the form asked for.
  const country = hit.find(c => c.iso === prefer && c.dial === hit[0]?.dial) ?? hit[0] ?? DEFAULT_COUNTRY;
  return { country, digits: hit.length ? all.slice(country.dial.length) : all };
}
export const formatPhone = (c: Country, digits: string) => (digits ? `+${c.dial} ${digits}` : '');

export const phoneError = (raw: string): string | null => {
  if (!raw.trim()) return null;
  if (/[^\d\s()+-]/.test(raw)) return 'Use digits only';
  // Without a "+code" the number is read as Indian (older records); it is saved as +91 … from then on.
  const { country, digits } = parsePhone(raw);
  if (raw.trim().startsWith('+') && !raw.replace(/\D/g, '').startsWith(country.dial)) return 'Unknown country code';
  if (!country.len.includes(digits.length)) return `${country.name} numbers have ${country.len.join(' or ')} digits`;
  if (country.start && !country.start.test(digits)) return `That is not a valid ${country.name} number`;
  return null;
};

/* ------------------------------------------------------------------ text */
const LETTER = /\p{L}/u;
const fail = (ok: boolean, msg: string) => (ok ? null : msg);

export const R = {
  required: (label = 'This field'): Rule => v => fail(!!v.trim(), `${label} is required`),
  // People: letters, spaces and . ' - , (e.g. "Bhanu, CEO").
  person: (v: string) => fail(!v || (/^[\p{L}\p{M}][\p{L}\p{M} .,'’-]*$/u.test(v) && v.length >= 2 && v.length <= 80), 'Use letters only (2–80), e.g. Rahul Sharma'),
  // Companies and project names: need at least one letter and can't be only digits or symbols.
  company: (v: string) => fail(!v || (LETTER.test(v) && v.length >= 2 && v.length <= 120), 'Enter a real name with letters (2–120 characters)'),
  title: (v: string) => fail(!v || (LETTER.test(v) && v.trim().length >= 3 && v.length <= 120), 'Title needs words, not only numbers (3–120 characters)'),
  city: (v: string) => fail(!v || (/^[\p{L}\p{M}][\p{L}\p{M} .'’-]*$/u.test(v) && v.length >= 2 && v.length <= 60), 'City should be letters only, e.g. Noida'),
  // Notes, updates, activity: real words, not just digits.
  words: (min = 3, max = 2000): Rule => v => fail(!v || (LETTER.test(v) && v.trim().length >= min && v.length <= max), `Write a few words (${min}–${max} characters), not only numbers`),
  // A short label or list of words, e.g. "IT, Healthcare, Retail".
  tags: (v: string) => fail(!v || (/^[\p{L}\p{M}0-9 &/.,'’()-]+$/u.test(v) && LETTER.test(v) && v.length <= 200), 'Use words separated by commas, e.g. IT, Healthcare'),
  email: (v: string) => fail(!v || (v.length <= 254 && /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(v)), 'Enter a valid email, e.g. name@company.com'),
  url: (v: string) => fail(!v || (/^https?:\/\/[^\s.]+\.[^\s]{2,}$/i.test(v) && v.length <= 500), 'Enter a full link starting with https://'),
  phone: (v: string) => phoneError(v),
  pan: (v: string) => fail(!v || /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(v.toUpperCase()), 'PAN looks like ABCDE1234F'),
  gstin: (v: string) => fail(!v || /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(v.toUpperCase()), 'GSTIN is 15 characters, e.g. 09ABCDE1234F1Z5'),
  ifsc: (v: string) => fail(!v || /^[A-Z]{4}0[A-Z0-9]{6}$/.test(v.toUpperCase()), 'IFSC looks like HDFC0001234'),
  bankAccount: (v: string) => fail(!v || /^\d{9,18}$/.test(v), 'Account number is 9–18 digits'),
  // Money in rupees: a whole positive number up to ₹1,000 crore.
  money: (label = 'Amount', max = 1e10): Rule => v => {
    if (v === '' || v == null) return null;
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 && n <= max ? null : `${label} must be between ₹0 and ₹${(max / 1e7).toLocaleString('en-IN')} crore`;
  },
  // Calendar dates, YYYY-MM-DD, in a sensible range (stops typos like year 0026).
  date: (v: string) => {
    if (!v) return null;
    if (!/^\d{4}-\d\d-\d\d$/.test(v) || isNaN(Date.parse(v))) return 'Pick a valid date';
    const y = +v.slice(0, 4);
    return y < 2000 || y > 2100 ? 'Pick a date between 2000 and 2100' : null;
  },
  time: (v: string) => fail(!v || /^([01]\d|2[0-3]):[0-5]\d$/.test(v), 'Pick a valid time'),
};

// Several rules on one field; the first error wins.
export const all = (...rules: (Rule | undefined)[]): Rule => v => {
  for (const r of rules) { const e = r?.(v); if (e) return e; }
  return null;
};

/* ------------------------------------------------------------------ dates and times that must not be in the past */
// The local day / clock in India (IST), which is how the team books meetings. Works the same on the server.
const IST = 5.5 * 36e5;
export const istNow = () => new Date(Date.now() + IST);
export const istToday = () => istNow().toISOString().slice(0, 10);
export const istTime = () => istNow().toISOString().slice(11, 16);

export const notPast = (v: string, what = 'Date') => (R.date(v) ?? (v && v < istToday() ? `${what} can't be in the past` : null));
// A slot on a day: on today's date the time must still be ahead (with a few minutes' grace).
export function slotError(date: string, time: string, what = 'That time') {
  const d = notPast(date);
  if (d) return d;
  if (!time) return null;
  const t = to24(time);
  if (!t) return 'Pick a valid time';
  if (date === istToday() && t < istTime()) return `${what} has already passed today. Pick a later time.`;
  return null;
}
// "10:30 AM" → "10:30", "16:00" → "16:00"
export function to24(s: string) {
  const m = /^(\d{1,2}):(\d\d)\s*(AM|PM)?$/i.exec(s.trim());
  if (!m) return '';
  let h = +m[1];
  if (m[3]) h = (h % 12) + (/pm/i.test(m[3]) ? 12 : 0);
  return h > 23 || +m[2] > 59 ? '' : `${String(h).padStart(2, '0')}:${m[2]}`;
}
export const slotPassed = (date: string, time: string) => date === istToday() && to24(time) !== '' && to24(time) < istTime();

/* ------------------------------------------------------------------ zod, for the API */
// zs(rule): optional text field checked by the rule. zs(rule, true): required.
export function zs(rule: Rule | undefined, required: true, max?: number): z.ZodType<string, z.ZodTypeDef, string>;
export function zs(rule?: Rule, required?: false, max?: number): z.ZodType<string | undefined, z.ZodTypeDef, string | undefined>;
export function zs(rule?: Rule, required = false, max = 2000): z.ZodTypeAny {
  const base = z.string().trim().max(max, `Keep it under ${max} characters`);
  const s = required ? base.min(1, 'This field is required') : base;
  const withRule = rule ? s.superRefine((v, ctx) => { const e = rule(v); if (e) ctx.addIssue({ code: z.ZodIssueCode.custom, message: e }); }) : s;
  return required ? withRule : withRule.optional();
}
// Stored in a clean form: PAN / GSTIN / IFSC upper case, phone as "+91 9876543210".
export const zUpper = (rule: Rule) => zs(rule).transform(v => (v ? v.toUpperCase() : v));
export const zPhone = (required = false) => (required ? zs(R.phone, true) : zs(R.phone)).transform(v => (v ? formatPhone(parsePhone(v).country, parsePhone(v).digits) : v));
export const zMoney = (label?: string, max?: number) => z.coerce.number().refine(n => !R.money(label, max)(String(n)), { message: R.money(label, max)('-1') ?? 'Invalid amount' });
