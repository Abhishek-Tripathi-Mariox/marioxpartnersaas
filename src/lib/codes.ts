import type { Model } from 'mongoose';

// Next free human-readable code like MX-P-243-7 or TK-2051 (width 0 = no leading zeros). Starts after the highest
// existing number so seeded or deleted records never cause a collision.
export async function nextCode(model: Model<any>, field: string, prefix: string, width: number, start: number) { // eslint-disable-line @typescript-eslint/no-explicit-any
  const re = new RegExp(`^${prefix}-(\\d+)$`);
  const docs = await model.find({ [field]: re }, { [field]: 1 }).lean<Record<string, string>[]>();
  const max = docs.reduce((m, d) => Math.max(m, Number(re.exec(d[field])?.[1] ?? 0)), start - 1);
  return `${prefix}-${String(max + 1).padStart(width, '0')}`;
}
