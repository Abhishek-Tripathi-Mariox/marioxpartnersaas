import type { Model, PopulateOptions } from 'mongoose';

// Server-side listing: ?page=&limit=&q=&sort=&<filter>=
//   page/limit  pagination (limit is one of PAGE_SIZES)
//   q           case-insensitive search across `search` fields
//   sort        "field" ascending or "-field" descending, from the `sorts` allow-list
//   filters     each allowed param maps to a Mongo condition; comma-separated values mean "any of"
// Without ?page the full (filtered, sorted) list is returned, for dashboards and the kanban board.

export const PAGE_SIZES = [10, 25, 50, 100] as const;
const MAX_UNPAGED = 2000;

export type ListMeta = { page: number; limit: number; total: number; pages: number };

type FilterFn = (value: string) => Record<string, unknown> | undefined;
export type ListSpec = {
  search: string[];
  sorts: string[];
  defaultSort: string;
  filters?: Record<string, FilterFn>;
};

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Common filter: param value(s) must equal `field`.
export const eq = (field: string, cast: (v: string) => unknown = v => v): FilterFn => v => {
  const vals = v.split(',').filter(Boolean).map(cast);
  if (!vals.length) return undefined;
  return { [field]: vals.length === 1 ? vals[0] : { $in: vals } };
};

export function parseList(req: Request, spec: ListSpec) {
  const p = new URL(req.url).searchParams;
  const conditions: Record<string, unknown>[] = [];

  const q = p.get('q')?.trim();
  if (q) {
    const re = new RegExp(escape(q.slice(0, 100)), 'i');
    conditions.push({ $or: spec.search.map(f => ({ [f]: re })) });
  }
  for (const [param, fn] of Object.entries(spec.filters ?? {})) {
    const v = p.get(param);
    const c = v ? fn(v) : undefined;
    if (c) conditions.push(c);
  }

  const rawSort = p.get('sort') || spec.defaultSort;
  const field = rawSort.replace(/^-/, '');
  const sortKey = spec.sorts.includes(field) ? rawSort : spec.defaultSort;
  const sort: Record<string, 1 | -1> = { [sortKey.replace(/^-/, '')]: sortKey.startsWith('-') ? -1 : 1, _id: -1 };

  const paged = p.has('page');
  const limitParam = Number(p.get('limit'));
  const limit = (PAGE_SIZES as readonly number[]).includes(limitParam) ? limitParam : 25;
  const page = Math.max(1, Math.floor(Number(p.get('page')) || 1));

  return { conditions, sort, paged, page, limit };
}

export async function runList<T>(model: Model<any>, base: Record<string, unknown>, req: Request, spec: ListSpec, populate?: PopulateOptions | string) { // eslint-disable-line @typescript-eslint/no-explicit-any
  const { conditions, sort, paged, page, limit } = parseList(req, spec);
  const filter = conditions.length ? { $and: [base, ...conditions] } : base;

  let query = model.find(filter).sort(sort);
  if (populate) query = query.populate(populate as PopulateOptions);

  if (!paged) {
    const items = (await query.limit(MAX_UNPAGED).lean()) as T[];
    return { items, meta: undefined };
  }

  const [total, items] = await Promise.all([
    model.countDocuments(filter),
    query.skip((page - 1) * limit).limit(limit).lean() as Promise<T[]>,
  ]);
  const meta: ListMeta = { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) };
  return { items, meta };
}
