// Coloured initials square, colour derived from the name (same hash as the original portal).
export const initials = (s: string) =>
  String(s).split(/[ ,]+/).filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase();

export const hue = (s: string) => {
  let h = 0;
  for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) % 360;
  return h;
};

export function Avatar({ name, size }: { name: string; size?: 's' | 'xs' }) {
  return (
    <span className={`av ${size ?? ''}`} style={{ background: `hsl(${hue(name)} 52% 46%)` }}>
      {initials(name)}
    </span>
  );
}
