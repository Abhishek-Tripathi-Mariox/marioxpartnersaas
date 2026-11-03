'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

// Confetti burst from both sides and the centre (v12 acquire.js), skipped for reduced motion.
function confetti() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const cv = document.createElement('canvas');
  cv.className = 'confetti';
  document.body.appendChild(cv);
  const dpr = Math.min(2, devicePixelRatio || 1), W = innerWidth, H = innerHeight;
  cv.width = W * dpr;
  cv.height = H * dpr;
  const x = cv.getContext('2d')!;
  x.scale(dpr, dpr);
  const cs = getComputedStyle(document.documentElement);
  const col = ['--accent', '--good', '--info', '--violet', '--warn'].map(v => cs.getPropertyValue(v).trim()).concat(['#ffd166', '#ffffff']);
  type P = { x: number; y: number; vx: number; vy: number; w: number; h: number; r: number; vr: number; c: string; life: number; max: number; round: boolean };
  const P: P[] = [];
  const emit = (ox: number, oy: number, n: number, ang: number, spr: number, spd: number) => {
    for (let i = 0; i < n; i++) {
      const a = ang + (Math.random() - 0.5) * spr, s = spd * (0.55 + Math.random() * 0.7);
      P.push({ x: ox, y: oy, vx: Math.cos(a) * s, vy: Math.sin(a) * s, w: 5 + Math.random() * 7, h: 3 + Math.random() * 5, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.35, c: col[i % col.length], life: 0, max: 120 + Math.random() * 60, round: Math.random() < 0.3 });
    }
  };
  emit(0, H * 0.75, 90, -Math.PI / 3.2, 0.9, 21);
  emit(W, H * 0.75, 90, -Math.PI + Math.PI / 3.2, 0.9, 21);
  emit(W / 2, H * 0.42, 70, -Math.PI / 2, Math.PI * 2, 13);
  const tick = () => {
    x.clearRect(0, 0, W, H);
    let alive = 0;
    for (const p of P) {
      if (p.life++ > p.max) continue;
      alive++;
      p.vy += 0.32; p.vx *= 0.985; p.vy *= 0.985; p.x += p.vx; p.y += p.vy; p.r += p.vr;
      x.save();
      x.globalAlpha = Math.min(1, (p.max - p.life) / 30);
      x.translate(p.x, p.y);
      x.rotate(p.r);
      x.fillStyle = p.c;
      if (p.round) { x.beginPath(); x.arc(0, 0, p.h / 1.4, 0, 7); x.fill(); }
      else x.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.cos(p.life / 6)));
      x.restore();
    }
    if (alive) requestAnimationFrame(tick);
    else cv.remove();
  };
  requestAnimationFrame(tick);
}

// Closes by itself after 6.5 s, like v12.
export function Celebrate({ title, sub, children, onClose }: { title: string; sub: string; children?: ReactNode; onClose: () => void }) {
  const ok = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    confetti();
    const t = setTimeout(() => ok.current?.focus({ preventScroll: true }), 300);
    const auto = setTimeout(onClose, 6500);
    return () => { clearTimeout(t); clearTimeout(auto); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return createPortal(
    <div className="party">
      <div className="scrim" onClick={onClose} />
      <div className="cele" role="alertdialog" aria-label={title}>
        <div className="badge good"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg></div>
        <h3>{title}</h3>
        <p>{sub}</p>
        {children}
        <div className="act"><button ref={ok} className="btn fire" onClick={onClose}>Great</button></div>
      </div>
    </div>,
    document.body,
  );
}
