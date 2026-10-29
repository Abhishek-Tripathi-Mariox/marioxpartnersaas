'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { Button, Card, Chips, Icon, Input, Select } from '@/components/ui';
import { useApi } from '@/hooks/useApi';
import { useClientOptions } from '@/hooks/useClientOptions';
import { OFFICE_INFO, OFFICES, SLOTS, TEAMS, VISIT_PURPOSES } from '@/lib/constants';
import { date as fmtDate } from '@/lib/format';

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// Next 10 working days, starting tomorrow.
function workingDays(n = 10) {
  const out: Date[] = [];
  const d = new Date();
  while (out.length < n) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() !== 0 && d.getDay() !== 6) out.push(new Date(d));
  }
  return out;
}

export type VisitValues = { office: string; date: string; time: string; client: string; guests: number; purpose: string; team: string };

function Step({ n, title, extra, children }: { n: number; title: string; extra?: ReactNode; children: ReactNode }) {
  return (
    <div className="stack">
      <div className="sn"><i>{n}</i>{title}{extra}</div>
      {children}
    </div>
  );
}

// "Book an office visit" from the original portal: office → day → slot → details,
// with a live booking summary. Slots already booked at that office are disabled.
export function VisitBooking({ onSubmit, list }: { onSubmit: (v: VisitValues) => Promise<unknown>; list: ReactNode }) {
  const days = useMemo(() => workingDays(), []);
  const clients = useClientOptions();
  const [v, setV] = useState<VisitValues>({ office: OFFICES[0], date: iso(days[0]), time: '', client: '', guests: 3, purpose: VISIT_PURPOSES[0], team: TEAMS[1] });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof VisitValues>(k: K, val: VisitValues[K]) => setV(p => ({ ...p, [k]: val }));

  const avail = useApi<{ taken: string[] }>(`/api/availability?office=${encodeURIComponent(v.office)}&date=${v.date}`);
  const taken = avail.data?.taken ?? [];
  const client = v.client || clients[0] || '';
  const day = days.find(d => iso(d) === v.date) ?? days[0];

  async function confirm() {
    if (!v.time) return;
    setBusy(true);
    setError(null);
    try {
      await onSubmit({ ...v, client });
      setV(p => ({ ...p, time: '' }));
      avail.reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="split">
      <Card style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
        <Step n={1} title="Office">
          <div className="g2" style={{ gap: 10 }}>
            {OFFICES.map(o => (
              <button key={o} type="button" className={`tile ${v.office === o ? 'on' : ''}`} onClick={() => setV(p => ({ ...p, office: o, time: '' }))}>
                <span className="row" style={{ gap: 8, color: 'var(--accent)' }}><Icon name="map" size="s" /></span>
                <b>{o}</b>
                <span>{OFFICE_INFO[o]}</span>
              </button>
            ))}
          </div>
        </Step>

        <Step n={2} title="Date">
          <div className="days">
            {days.map(d => (
              <button key={iso(d)} type="button" className={`day ${iso(d) === v.date ? 'on' : ''}`} onClick={() => setV(p => ({ ...p, date: iso(d), time: '' }))}>
                <small>{DOW[d.getDay()]}</small>
                <b>{d.getDate()}</b>
                <small>{MON[d.getMonth()]}</small>
              </button>
            ))}
          </div>
        </Step>

        <Step n={3} title="Time slot" extra={<span className="sub" style={{ font: '400 13px var(--sans)' }}>· 90 min</span>}>
          <div className="slots">
            {SLOTS.map(t => {
              const booked = taken.includes(t);
              return (
                <button key={t} type="button" className={`slot ${v.time === t ? 'on' : ''}`} disabled={booked} aria-label={booked ? `${t} booked` : t} onClick={() => set('time', t)}>
                  {t}
                </button>
              );
            })}
          </div>
        </Step>

        <Step n={4} title="Meeting details">
          <div className="grid-f">
            <Select label="Client" options={clients} value={client} onChange={e => set('client', e.target.value)} />
            <Input label="Guests from client side" type="number" min={1} max={20} value={v.guests} onChange={e => set('guests', Number(e.target.value))} />
          </div>
          <Chips tabs={VISIT_PURPOSES} value={v.purpose} onChange={p => set('purpose', p)} />
          <div style={{ maxWidth: 380 }}>
            <Select label="Mariox team required in the meeting" options={TEAMS} value={v.team} onChange={e => set('team', e.target.value)} />
          </div>
        </Step>
      </Card>

      <div className="stack stick">
        <div className="hero sum" style={{ padding: 24 }}>
          <div className="between">
            <span className="lbl">Your booking</span>
            <span className="pill nd" style={{ background: 'rgba(255,255,255,.08)', color: 'var(--hero-ink)' }}>90 min</span>
          </div>
          <div style={{ font: '700 30px/1.05 var(--display)', letterSpacing: '-.035em', margin: '14px 0 6px' }}>
            {DOW[day.getDay()]}, {fmtDate(v.date)}
          </div>
          <div className="muted" style={{ marginBottom: 12 }}>{v.time ? `${v.time} – 90 min` : 'Pick a time slot'} · {v.office} office</div>
          <div className="kv"><span>Client</span><span>{client || '—'}</span></div>
          <div className="kv"><span>Guests</span><span>{v.guests || '—'}</span></div>
          <div className="kv"><span>Purpose</span><span>{v.purpose}</span></div>
          <div className="kv"><span>Mariox team</span><span>{v.team}</span></div>
          {error && <div className="form-error" style={{ marginTop: 12 }}>{error}</div>}
          <Button variant="fire" block style={{ marginTop: 16 }} disabled={!v.time} loading={busy} onClick={confirm}>
            {v.time ? 'Confirm booking' : 'Select a time slot'}
          </Button>
        </div>
        {list}
      </div>
    </div>
  );
}
