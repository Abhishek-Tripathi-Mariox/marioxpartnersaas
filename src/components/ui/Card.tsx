import Link from 'next/link';
import type { CSSProperties, ReactNode } from 'react';
import { Icon, type IconName } from './Icon';
import type { Tone } from './Badge';

type CardProps = {
  title?: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  children?: ReactNode;
  className?: string;
  tight?: boolean;
  style?: CSSProperties;
};

export function Card({ title, subtitle, action, children, className = '', tight, style }: CardProps) {
  return (
    <section className={['card', tight && 'tight', className].filter(Boolean).join(' ')} style={style}>
      {(title || action) && (
        <div className="card-h">
          <div>
            {title && <div className="card-t">{title}</div>}
            {subtitle && <div className="card-s">{subtitle}</div>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

// "All →" style link used in card headers.
export function MoreLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link className="more" href={href}>
      {children} <Icon name="arr" size="s" />
    </Link>
  );
}

// Small "i" with a hover/focus tooltip that explains how a number is calculated.
export function InfoTip({ text }: { text: string }) {
  return (
    <span className="info" tabIndex={0} role="img" aria-label={text} data-tip={text} onClick={e => { e.preventDefault(); e.stopPropagation(); }}>
      i
    </span>
  );
}

type StatProps = {
  icon?: IconName;
  tone?: Tone;
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  extra?: ReactNode;
  info?: string;           // how the value is calculated (tooltip)
  href?: string;           // go to the filtered data behind the number
  onClick?: () => void;    // or filter the current page
  active?: boolean;        // highlighted when its filter is applied
  good?: boolean;          // green value (money earned)
};

// Compact KPI tile. Clickable tiles show an arrow and lift on hover.
export function StatCard({ icon, tone = 'mute', label, value, hint, extra, info, href, onClick, active, good }: StatProps) {
  const body = (
    <>
      {icon && <span className={`ico t-${tone}`}><Icon name={icon} size="s" /></span>}
      <span className="stat-b">
        <span className="stat-l">{label}{info && <InfoTip text={info} />}</span>
        <span className="stat-v num" style={good ? { color: 'var(--good)' } : undefined}>{value}</span>
        {hint && <span className="stat-h">{hint}</span>}
        {extra}
      </span>
      {(href || onClick) && <span className="stat-go"><Icon name="arr" size="s" /></span>}
    </>
  );
  const cls = ['stat', (href || onClick) && 'link', active && 'on', good && 'good'].filter(Boolean).join(' ');
  if (href) return <Link className={cls} href={href}>{body}</Link>;
  if (onClick) return <button type="button" className={cls} onClick={onClick} aria-pressed={active}>{body}</button>;
  return <div className={cls}>{body}</div>;
}

// Responsive row of StatCards.
export function Stats({ children, min = 210 }: { children: ReactNode; min?: number }) {
  return <div className="stats" style={{ gridTemplateColumns: `repeat(auto-fit,minmax(${min}px,1fr))` }}>{children}</div>;
}

// Small labelled value box (".note"), optionally green and clickable.
export function Note({ label, value, good, style, href, info }: { label: string; value: ReactNode; good?: boolean; style?: CSSProperties; href?: string; info?: string }) {
  const content = (
    <>
      <span className="lbl row" style={{ gap: 6, ...(good ? { color: 'var(--good)' } : {}) }}>{label}{info && <InfoTip text={info} />}</span>
      <span className="val s num" style={good ? { color: 'var(--good)' } : undefined}>{value}</span>
    </>
  );
  return href ? (
    <Link className={`note link ${good ? 'good' : ''}`} style={style} href={href}>{content}</Link>
  ) : (
    <div className={`note ${good ? 'good' : ''}`} style={style}>{content}</div>
  );
}

type HeaderProps = { eyebrow?: ReactNode; title: ReactNode; subtitle?: ReactNode; actions?: ReactNode; big?: boolean };

export function PageHeader({ eyebrow, title, subtitle, actions, big }: HeaderProps) {
  return (
    <div className="head">
      <div style={{ minWidth: 0 }}>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1 className={big ? 'h-xl' : 'h-lg'}>{title}</h1>
        {subtitle && <p className="lede">{subtitle}</p>}
      </div>
      {actions && <div className="head-act">{actions}</div>}
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="empty">
      <b style={{ display: 'block', color: 'var(--ink-2)', marginBottom: children ? 4 : 0 }}>{title}</b>
      {children}
    </div>
  );
}

export function Progress({ value, tone, size }: { value: number; tone?: 'fire' | 'warn'; size?: 'lg' | 'xl' }) {
  return (
    <div className={`bar ${size ?? ''}`} role="progressbar" aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={100}>
      <i className={tone} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}

// Five-step delivery indicator used on project rows.
export function Steps({ total, current }: { total: number; current: number }) {
  return (
    <div className="steps">
      {Array.from({ length: total }, (_, i) => (
        <i key={i} className={i < current ? 'd' : i === current ? 'c' : ''} />
      ))}
    </div>
  );
}
