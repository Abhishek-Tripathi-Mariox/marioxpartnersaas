'use client';

import Link from 'next/link';
import { useState } from 'react';
import { date } from '@/lib/format';
import type { User } from '@/types';
import { Icon } from './ui';

const pctLabel = (u: User) => `${Math.round(u.commissionRate * 100)}%`;

// Small card on the home page that links to the profile.
export function MiniPartnerCard({ user }: { user: User }) {
  return (
    <Link className="mini-wrap" href="/profile" aria-label="Open your partner card">
      <div className="mini-vc">
        <div className="between">
          <span className="vc-logo">
            <span className="mark" style={{ width: 26, height: 26, borderRadius: 8 }}><b style={{ fontSize: 13 }}>M</b></span>
            Mariox Partners
          </span>
          <span className="vc-tier">{pctLabel(user)}</span>
        </div>
        <div>
          <div style={{ font: '700 24px/1 var(--display)', letterSpacing: '-.035em' }}>{user.name}</div>
          <div style={{ opacity: 0.7, fontSize: 12.5, marginTop: 5 }}>Certified partner · {user.company}</div>
        </div>
        <div className="between" style={{ font: '500 11px var(--mono)', letterSpacing: '.06em', opacity: 0.8 }}>
          <span>{user.partnerCode}</span>
          <span className="row" style={{ gap: 4 }}>Your card <Icon name="arrUR" size="s" /></span>
        </div>
      </div>
    </Link>
  );
}

// Full flip card for the profile page.
export function VisitingCard({ user }: { user: User }) {
  const [flip, setFlip] = useState(false);
  return (
    <div className="stack" style={{ gap: 12 }}>
      <div className="vc-wrap">
        <div className="vc-tilt">
          <div className={`vc ${flip ? 'flip' : ''}`} role="button" tabIndex={0} aria-label="Flip partner card" onClick={() => setFlip(f => !f)} onKeyDown={e => e.key === 'Enter' && setFlip(f => !f)}>
            <div className="vc-f">
              <div className="between">
                <span className="vc-logo"><span className="mark"><b>M</b></span>Mariox Partners</span>
                <span className="vc-tier">{pctLabel(user)} PARTNER</span>
              </div>
              <div>
                <div className="vc-name">{user.name}</div>
                <div className="vc-role">Certified Mariox Partner · {user.company}</div>
              </div>
              <div className="vc-meta">
                <span className="vc-chip" />
                <span style={{ textAlign: 'right' }}>{user.partnerCode}<br />Since {date(user.createdAt)}</span>
              </div>
            </div>
            <div className="vc-b">
              <div className="between">
                <span className="vc-logo"><span className="mark" style={{ background: '#0d0e12', color: '#fff' }}><b>M</b></span>{user.company}</span>
                <span style={{ font: '500 11px var(--mono)', letterSpacing: '.06em' }}>{user.partnerCode}</span>
              </div>
              <div className="kv">
                <span>Phone</span><span>{user.phone || '—'}</span>
                <span>Email</span><span>{user.email}</span>
                <span>City</span><span>{user.city || '—'}</span>
                <span>Sells into</span><span>{user.industries || '—'}</span>
              </div>
              <div style={{ font: '500 11px var(--mono)', letterSpacing: '.06em', opacity: 0.6 }}>MARIOX SOFTWARE · PARTNER NETWORK</div>
            </div>
          </div>
        </div>
      </div>
      <div className="row wrap" style={{ gap: 8 }}>
        <button className="btn sm" onClick={() => setFlip(f => !f)}><Icon name="rotate" size="s" />Flip card</button>
        <button className="btn sm" onClick={() => navigator.clipboard.writeText(user.partnerCode || '')}><Icon name="copy" size="s" />Copy partner ID</button>
        <span className="sub">Tap the card to flip</span>
      </div>
    </div>
  );
}
