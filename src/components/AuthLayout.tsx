import type { ReactNode } from 'react';
import { Icon, type IconName } from './ui';

const POINTS: [IconName, string, string][] = [
  ['pipe', 'Track every lead', 'Board, follow-ups and activity log for your whole pipeline.'],
  ['wallet', 'See every rupee', 'Commission released, processing and upcoming, milestone by milestone.'],
  ['tool', 'Sell with Mariox', 'Scope approvals, office visits, experts and the sales kit.'],
];

// Split screen used by login and set-password: dark brand panel + form.
export function AuthLayout({ eyebrow, title, subtitle, children }: { eyebrow: string; title: ReactNode; subtitle: string; children: ReactNode }) {
  return (
    <div className="auth">
      <div className="ob-l">
        <div className="row" style={{ gap: 10 }}>
          <span className="mark" style={{ background: '#fff', color: '#0d0e12' }}><b>M</b></span>
          <b style={{ font: '700 17px var(--display)' }}>Mariox Partners</b>
        </div>
        <div className="stack" style={{ gap: 22 }}>
          <h1 className="h-xl" style={{ color: 'var(--hero-ink)' }}>Grow with<br /><em style={{ color: 'var(--hero-muted)' }}>Mariox.</em></h1>
          <div className="ob-steps">
            {POINTS.map(([icon, t, d]) => (
              <div key={t} className="ob-st on" style={{ alignItems: 'flex-start' }}>
                <b><Icon name={icon} size="s" /></b>
                <span><span style={{ fontWeight: 600, display: 'block' }}>{t}</span><span style={{ color: 'var(--hero-muted)', fontSize: 13.5 }}>{d}</span></span>
              </div>
            ))}
          </div>
        </div>
        <span className="lbl">Mariox Software · Partner network</span>
      </div>
      <div className="auth-form">
        <div>
          <div className="eyebrow">{eyebrow}</div>
          <h2 className="h-lg">{title}</h2>
          <p className="lede">{subtitle}</p>
        </div>
        {children}
      </div>
    </div>
  );
}
