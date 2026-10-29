import type { CSSProperties } from 'react';

export function Skeleton({ w = '100%', h = 14, r = 8, style }: { w?: number | string; h?: number; r?: number; style?: CSSProperties }) {
  return <span className="skel" style={{ display: 'block', width: w, height: h, borderRadius: r, ...style }} aria-hidden="true" />;
}

// Placeholder rows for tables while the first page loads.
export function SkeletonRows({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="tr" style={{ gridTemplateColumns: `minmax(0,1.8fr) repeat(${cols - 1}, minmax(0,1fr))` }}>
          <div className="row" style={{ gap: 10 }}>
            <Skeleton w={30} h={30} r={10} />
            <div style={{ flex: 1 }}><Skeleton w="60%" /><Skeleton w="35%" h={10} style={{ marginTop: 6 }} /></div>
          </div>
          {Array.from({ length: cols - 1 }, (_, j) => <Skeleton key={j} w={`${50 + ((i + j) % 3) * 15}%`} />)}
        </div>
      ))}
    </div>
  );
}

// Card-shaped placeholders for card lists and detail pages.
export function SkeletonCards({ count = 3, height = 180 }: { count?: number; height?: number }) {
  return (
    <div className="stack" style={{ gap: 16 }} aria-busy="true" aria-label="Loading">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14, minHeight: height }}>
          <div className="row" style={{ gap: 14 }}>
            <Skeleton w={40} h={40} r={13} />
            <div style={{ flex: 1 }}><Skeleton w="40%" h={18} /><Skeleton w="25%" h={12} style={{ marginTop: 8 }} /></div>
          </div>
          <Skeleton h={10} />
          <Skeleton w="80%" h={10} />
          <Skeleton w="55%" h={10} />
        </div>
      ))}
    </div>
  );
}
