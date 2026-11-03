'use client';

import { useEffect, useRef, useState } from 'react';
import { Button, Icon, Modal } from '@/components/ui';
import { api } from '@/lib/client';
import XLSX from '@/lib/xlsx-mini';
import { ALIAS, HOME, LAB, ST, TEMP, mkt, outcomes, today, toISO, type AcqLead, type AcqListKey, type AcqLists, type Query, type TeamEmails } from '@/lib/acquisition';
import { Av } from './bits';

const LISTS: [AcqListKey, string][] = [
  ['team', 'Team (who adds leads)'],
  ['sources', 'Where leads are found'],
  ['channels', 'How they were contacted'],
  ['services', 'Services leads provide'],
  ['countries', 'Countries'],
  ['reasons', 'Rejection reasons'],
];

type Props = { lists: AcqLists; emails: TeamEmails; leads: AcqLead[]; Q: Query; onClose: () => void; onChanged: (msg?: string) => void; onListsSaved: (lists: AcqLists) => void; onEmailsSaved: (emails: TeamEmails) => void; onImport: () => void };

// Lists the team picks from, team emails for calendar invites, plus import / export and sample data.
export function SettingsDialog({ lists, emails, leads, Q, onClose, onChanged, onListsSaved, onEmailsSaved, onImport }: Props) {
  const [draft, setDraft] = useState(lists);
  const [mails, setMails] = useState<TeamEmails>(emails);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const samples = leads.filter(l => l.sample).length;

  async function saveLists(next: AcqLists) {
    setDraft(next);
    setError(null);
    try {
      onListsSaved((await api.put<{ lists: AcqLists }>('/api/admin/acquisition/settings', { lists: next })).lists);
    } catch (e) {
      setError((e as Error).message);
      setDraft(lists);
    }
  }
  const remove = (k: AcqListKey, i: number) => {
    if (draft[k].length <= 1) return setError('Keep at least one');
    saveLists({ ...draft, [k]: draft[k].filter((_, j) => j !== i) });
  };
  const addTo = (k: AcqListKey, v: string) => {
    v = v.trim();
    if (!v || draft[k].includes(v)) return false;
    saveLists({ ...draft, [k]: [...draft[k], v] });
    return true;
  };

  // Saved when the field is left, like v14.
  async function saveEmail(name: string, value: string) {
    if ((emails[name] ?? '') === value.trim()) return;
    setError(null);
    try {
      onEmailsSaved((await api.put<{ emails: TeamEmails }>('/api/admin/acquisition/settings', { emails: { ...mails, [name]: value.trim() } })).emails);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function sample(action: 'load' | 'clear') {
    setBusy(true);
    await api.post('/api/admin/acquisition/sample', { action, today: today() }).catch(e => setError((e as Error).message));
    setBusy(false);
    onChanged(action === 'clear' ? 'Sample leads cleared · you are live' : 'Sample leads loaded');
  }

  function exportXlsx() {
    const sheets = buildSheets(leads, Q, draft.services);
    try {
      const buf = XLSX.write(sheets);
      save(new Blob([buf as BlobPart], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `Mariox_leads_${today()}.xlsx`);
    } catch {
      save(new Blob([toCsv(sheets[0][1])], { type: 'text/csv' }), 'Mariox_leads.csv');
    }
    onClose();
  }

  return (
    <Modal className="acq" open wide title="Settings" onClose={onClose}>
      <div className="stack" style={{ gap: 10, marginTop: 14 }}>
        {LISTS.map(([k, t]) => <ListCard key={k} title={t} values={draft[k]} onRemove={i => remove(k, i)} onAdd={v => addTo(k, v)} />)}
        <div className="card flat tight">
          <div className="lbl" style={{ marginBottom: 8 }}>Team emails · for calendar invites</div>
          <div className="stack" style={{ gap: 6 }}>
            {draft.team.map(n => (
              <label key={n} className="row" style={{ gap: 10 }}>
                <Av name={n} size="xs" />
                <span style={{ width: 70, fontSize: 13, fontWeight: 600 }}>{n}</span>
                <input className="inp sm" style={{ flex: 1 }} type="email" inputMode="email" placeholder={`${n.toLowerCase()}@marioxsoftware.com`}
                  value={mails[n] ?? ''} onChange={e => setMails(m => ({ ...m, [n]: e.target.value }))} onBlur={e => saveEmail(n, e.target.value)} />
              </label>
            ))}
          </div>
        </div>
        <div className="card flat tight">
          <div className="lbl" style={{ marginBottom: 8 }}>Data</div>
          <div className="row wrap" style={{ gap: 6 }}>
            <Button size="sm" icon="upload" onClick={onImport}>Import CSV / Excel</Button>
            <Button size="sm" icon="download" onClick={exportXlsx}>Export Excel</Button>
            {samples ? (
              <Button size="sm" variant="fire" icon="trash" loading={busy} onClick={() => sample('clear')}>Clear {samples} sample leads</Button>
            ) : (
              <Button size="sm" variant="ghost" loading={busy} onClick={() => sample('load')}>Load sample leads</Button>
            )}
          </div>
        </div>
        {error && <div className="ai-err"><Icon name="alert" size="s" />{error}</div>}
      </div>
    </Modal>
  );
}

function ListCard({ title, values, onRemove, onAdd }: { title: string; values: string[]; onRemove: (i: number) => void; onAdd: (v: string) => boolean }) {
  const [v, setV] = useState('');
  const input = useRef<HTMLInputElement>(null);
  return (
    <div className="card flat tight">
      <div className="lbl" style={{ marginBottom: 8 }}>{title}</div>
      <div className="tags">
        {values.map((x, i) => (
          <span key={x} className="tag">{x}<button type="button" onClick={() => onRemove(i)} aria-label={`Remove ${x}`}><Icon name="x" size="s" /></button></span>
        ))}
      </div>
      <form className="row" style={{ gap: 6, marginTop: 10 }} onSubmit={e => { e.preventDefault(); if (onAdd(v)) setV(''); input.current?.focus(); }}>
        <input ref={input} className="inp sm" placeholder="Add" aria-label={`Add to ${title}`} value={v} onChange={e => setV(e.target.value)} />
        <button className="btn sm" type="submit">Add</button>
      </form>
    </div>
  );
}

/* ------------------------------------------------------------------ import */
type ImportRow = Record<keyof typeof ALIAS, string>;

function parseCSV(text: string) {
  const t = String(text || '').replace(/^﻿/, ''), first = t.split(/\r?\n/)[0] || '';
  const dl = (first.match(/\t/g) || []).length > (first.match(/,/g) || []).length ? '\t' : ',';
  const rows: string[][] = [];
  let row: string[] = [], cur = '', q = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (q) { if (c === '"') { if (t[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
    else if (c === '"') q = true;
    else if (c === dl) { row.push(cur); cur = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && t[i + 1] === '\n') i++; row.push(cur); rows.push(row); row = []; cur = ''; }
    else cur += c;
  }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  return rows.filter(r => r.some(c => String(c).trim()));
}

function mapRows(rows: unknown[][] | null): ImportRow[] {
  if (!rows || rows.length < 2) return [];
  const H = rows[0].map(h => String(h).trim().toLowerCase()), col: Record<string, number> = {};
  Object.entries(ALIAS).forEach(([k, al]) => { const i = H.findIndex(h => al.includes(h)); if (i >= 0) col[k] = i; });
  return rows.slice(1).map(r => {
    const g = (k: string) => (col[k] != null ? String(r[col[k]] ?? '').trim() : '');
    const raw = (k: string) => (col[k] != null ? r[col[k]] : '');
    const out = Object.fromEntries(Object.keys(ALIAS).map(k => [k, g(k)])) as ImportRow;
    out.cdate = toISO(raw('cdate'));
    out.mdate = toISO(raw('mdate'));
    return out;
  }).filter(r => r.name);
}

export function ImportDialog({ leads, onClose, onDone }: { leads: AcqLead[]; onClose: () => void; onDone: (msg: string) => void }) {
  const [rows, setRows] = useState<ImportRow[] | null>(null);
  const [file, setFile] = useState('');
  const [paste, setPaste] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function read(f: File | null) {
    setError(null);
    try {
      let raw: unknown[][] | null;
      if (f && /\.xlsx$/i.test(f.name)) {
        const R = await XLSX.read(await f.arrayBuffer());
        const sh = R.SheetNames.find(n => /lead/i.test(n) && !/hidden/i.test(n)) || R.SheetNames[0];
        raw = await R.rows(sh);
      } else raw = parseCSV(f ? await f.text() : paste);
      setRows(mapRows(raw));
    } catch {
      setRows(null);
      setError('Could not read that file. Save it as CSV and try again.');
    }
  }
  useEffect(() => {
    if (file || !paste.trim()) return;
    const t = setTimeout(() => read(null), 300);
    return () => clearTimeout(t);
  }, [paste]); // eslint-disable-line react-hooks/exhaustive-deps

  const isDup = (r: ImportRow) => leads.some(l => l.name.toLowerCase() === r.name.toLowerCase() && (l.company || '').toLowerCase() === (r.company || '').toLowerCase());
  const n = rows?.length ?? 0, d = rows?.filter(isDup).length ?? 0;

  async function go() {
    if (!rows) return;
    setBusy(true);
    try {
      const r = await api.post<{ imported: number }>('/api/admin/acquisition/import', { rows: rows.filter(x => !isDup(x)), today: today() });
      onDone(`${r.imported} lead${r.imported === 1 ? '' : 's'} imported`);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <Modal className="acq" open wide title="Import leads" subtitle="CSV or Excel. First row = headers like Name, Company, Found on, Email, Phone, Meeting date, Meeting link." onClose={onClose}>
      <label className="dropz">
        <input type="file" accept=".csv,.tsv,.txt,.xlsx" onChange={e => { const f = e.target.files?.[0]; if (f) { setFile(f.name); read(f); } }} />
        <span className="ico t-fire"><Icon name="upload" /></span>
        <b>{file || 'Choose a file'}</b>
        <span className="sub">or paste rows below</span>
      </label>
      <textarea className="inp mono" rows={4} style={{ marginTop: 10 }} placeholder="Name,Company,Found on,Email,Meeting date,Meeting link" value={paste} onChange={e => { setFile(''); setPaste(e.target.value); }} />
      <div style={{ marginTop: 10 }}>
        {error ? <div className="ai-err"><Icon name="alert" size="s" />{error}</div>
          : rows && (n ? <div className="note good"><span>{n} rows · <b>{n - d} new</b>{d ? ` · ${d} already here (skipped)` : ''}</span></div>
          : <div className="ai-err"><Icon name="alert" size="s" />No rows with a Name column found.</div>)}
      </div>
      <div className="row wrap" style={{ justifyContent: 'flex-end', gap: 8, marginTop: 22 }}>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="fire" loading={busy} disabled={!(n - d)} onClick={go}>Import</Button>
      </div>
    </Modal>
  );
}

/* ------------------------------------------------------------------ export */
type Cell = string | number | null | undefined;
function save(blob: Blob, name: string) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
const toCsv = (rows: Cell[][]) => rows.map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');

// Three sheets, as in v12: Leads, History and an Outcome summary for the selected range.
function buildSheets(leads: AcqLead[], Q: Query, services: string[]): [string, Cell[][]][] {
  const t = today(), o = outcomes(leads, Q, services);
  const rows: Cell[][] = [
    ['Lead ID', 'Name', 'Company', 'Found on', 'Contacted by', 'Contacted on', 'Added by', 'Email', 'Phone', 'LinkedIn / URL', 'Status', 'Meeting date', 'Meeting time', 'Meeting link', 'Next follow-up', 'Follow-ups done', 'Converted on', 'Rejected on', 'Rejection reason', 'Notes', 'Services they provide', 'Hot / warm / cold', 'Country', 'City', 'Domestic / international', 'Attending (team)', 'Missed meetings'],
    ...leads.map(l => [l.code, l.name, l.company, l.source, l.channel, l.contactedAt, l.owner, l.email, l.phone, l.linkedin, ST[l.status][0], l.meet?.date, l.meet?.time, l.meet?.link, l.next, l.steps.filter(s => s.k === 'followup').length, l.convertedAt, l.rejectedAt, l.reason, l.notes, (l.services || []).join(', '), TEMP[l.temp]?.[0] || '', l.country || HOME, l.city, mkt(l) === 'domestic' ? 'Domestic' : 'International', (l.meet?.attendees || []).join(', '), l.steps.filter(s => s.k === 'moved' && s.missed).length].map(v => v ?? '')),
  ];
  const hist: Cell[][] = [['Lead ID', 'Name', 'Step', 'Date', 'Reason', 'Note'], ...leads.flatMap(l => l.steps.map(s => [l.code, l.name, LAB[s.k] || s.k, s.date, s.reason || '', s.note || '']))];
  const sum: Cell[][] = [
    ['Partner acquisition', `Exported ${t} · ${o.label}`], [],
    ['Contacted', o.contacted], ['Meetings held', o.held], ['Meetings missed', o.missed], ['Show-up rate', o.show == null ? '–' : o.show + '%'],
    ['Converted', o.conv], ['Rejected', o.rej], ['Win rate', o.rate == null ? '–' : o.rate + '%'], ['Avg days to convert', o.days ?? '–'], [],
    ['Rejection reason', 'Leads'], ...o.why, [],
    ['Service', 'Converted', 'Decided'], ...o.bySvc, [],
    ['Market', 'Converted', 'Decided', 'Leads'], ...o.byMkt.map(([m, c, n, all]) => [m === 'domestic' ? 'Domestic' : 'International', c, n, all]), [],
    ['Country', 'Leads', 'Converted'], ...o.byLoc.map(([c, v]) => [c, v[0], v[1]]), [],
    ['Temperature', 'Converted', 'Decided'], ...o.byTemp.map(([k, c, n]) => [TEMP[k][0], c, n]),
  ];
  return [['Leads', rows], ['History', hist], ['Outcome', sum]];
}
