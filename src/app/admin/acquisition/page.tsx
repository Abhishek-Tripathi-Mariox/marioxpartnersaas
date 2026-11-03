'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Board } from '@/components/acquisition/Board';
import { Celebrate } from '@/components/acquisition/Celebrate';
import { LeadDrawer } from '@/components/acquisition/LeadDrawer';
import { LeadForm, addedMsg } from '@/components/acquisition/LeadForm';
import { InviteDialog } from '@/components/acquisition/InviteDialog';
import { ImportDialog, SettingsDialog } from '@/components/acquisition/SettingsDialog';
import { Summary } from '@/components/acquisition/Summary';
import { TodayPanel } from '@/components/acquisition/TodayPanel';
import { UpdateDialog, updatedMsg, type ConvertedPartner } from '@/components/acquisition/UpdateDialog';
import { Button, Dropdown, Icon, Modal, SkeletonCards, useToast } from '@/components/ui';
import { useApi } from '@/hooks/useApi';
import { api } from '@/lib/client';
import { DEFAULT_QUERY, HOME, RANGES, TEMP, add, flag, inView, overdue, rel, t12, today, type AcqLead, type AcqLists, type Query, type TeamEmails, type Temp, type UpdateOpt } from '@/lib/acquisition';

type Data = { leads: AcqLead[]; lists: AcqLists; emails: TeamEmails; rate: number };
const URL_ = '/api/admin/acquisition';
const UI_KEY = 'mariox.acq.ui4';

// Partner acquisition (Mariox Control v14): summary → filters → six-stage board, with the Today panel alongside.
// Date range is a filter; open leads that are overdue always show. Booking a meeting opens the invite dialog;
// converting a lead creates the partner account, and onboarding continues in Partners.
export default function AcquisitionPage() {
  const toast = useToast();
  const { data, setData, reload } = useApi<Data>(URL_);
  const [Q, setQ] = useState<Query>(DEFAULT_QUERY);
  const [now, setNow] = useState(() => Date.now());
  const [openId, setOpenId] = useState<string | null>(null);
  const [update, setUpdate] = useState<{ lead: AcqLead; pre?: UpdateOpt; back: boolean } | null>(null);
  const [form, setForm] = useState<{ lead: Partial<AcqLead> | null; back: boolean } | null>(null);
  const [dialog, setDialog] = useState<'settings' | 'import' | 'delete' | null>(null);
  const [party, setParty] = useState<{ title: string; sub: string } | null>(null);
  const [inviteId, setInviteId] = useState<string | null>(null);

  // Team filter is remembered per browser, like v12.
  useEffect(() => {
    try { const s = JSON.parse(localStorage.getItem(UI_KEY) || '{}'); if (s.who) setQ(q => ({ ...q, who: s.who })); } catch {}
  }, []);
  const query = (patch: Partial<Query>) => {
    setQ(q => ({ ...q, ...patch }));
    if (patch.who) try { localStorage.setItem(UI_KEY, JSON.stringify({ who: patch.who })); } catch {}
  };
  // Countdowns ("in 1h 34m", "Live now") refresh every 20 seconds.
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 20000); return () => clearInterval(t); }, []);

  const leads = useMemo(() => data?.leads ?? [], [data]);
  const lists = data?.lists;
  const base = useMemo(() => leads.filter(l => inView(l, Q)), [leads, Q, now]); // eslint-disable-line react-hooks/exhaustive-deps
  const late = base.filter(overdue).length;
  const open = openId ? leads.find(l => l._id === openId) ?? null : null;
  const inviting = inviteId ? leads.find(l => l._id === inviteId && l.meet?.date) ?? null : null;

  const put = useCallback((lead: AcqLead) => {
    if (!data) return;
    const has = data.leads.some(l => l._id === lead._id);
    setData({ ...data, leads: has ? data.leads.map(l => (l._id === lead._id ? lead : l)) : [lead, ...data.leads] });
  }, [data, setData]);

  async function patch(l: AcqLead, body: object, msg?: string) {
    try {
      const r = await api.patch<{ lead: AcqLead }>(`${URL_}/${l._id}`, body);
      put(r.lead);
      if (msg) toast(msg);
    } catch (e) {
      toast((e as Error).message, true);
    }
  }

  // A meeting was booked or moved: show it on the board and open the invite dialog (v14).
  function invite(lead: AcqLead, msg: string) {
    setOpenId(null);
    toast(msg);
    if (Q.range === 'today' && lead.meet.date !== today()) query({ range: 'week' });
    setInviteId(lead._id);
  }
  const onboard = (l: AcqLead) => patch(l, { action: 'onboard', today: today() }, `Onboarding started · ${l.name} · continue in Partners`);

  async function remove(l: AcqLead) {
    await api.del(`${URL_}/${l._id}`);
    if (data) setData({ ...data, leads: data.leads.filter(x => x._id !== l._id) });
    setDialog(null);
    setOpenId(null);
    toast('Lead deleted');
  }

  function updated(lead: AcqLead, opt: UpdateOpt, partner: ConvertedPartner | null) {
    put(lead);
    const back = update?.back;
    setUpdate(null);
    if (!back) setOpenId(null);
    if (opt === 'convert' && partner) {
      setParty({
        title: `${lead.name.split(' ')[0]} is a Mariox partner`,
        sub: partner.linked ? `Linked to their existing partner account ${partner.code ?? ''}.` : `Added to Partners as ${partner.code ?? 'a new partner'}. Onboarding continues there.`,
      });
      reload();
    } else if (opt === 'meet' || opt === 'move') invite(lead, updatedMsg(lead, opt));
    else toast(updatedMsg(lead, opt));
  }

  if (!data || !lists) {
    return (
      <section className="stack acq" style={{ gap: 18 }}>
        <div className="rq-head"><div><div className="eyebrow"><span className="dot" />Partner acquisition</div><h1 className="h-lg">Leads</h1></div></div>
        <SkeletonCards count={6} height={220} />
      </section>
    );
  }

  return (
    <section className="stack rq acq" style={{ gap: 18 }}>
      <div className="rq-head rv">
        <div style={{ minWidth: 0 }}>
          <div className="eyebrow"><span className="dot" />Partner acquisition</div>
          <h1 className="h-lg">Leads</h1>
        </div>
        <div className="rq-tools">
          <button type="button" className="tbtn" aria-label="Settings" title="Settings, import and export" onClick={() => setDialog('settings')}><Icon name="sliders" /></button>
          <Button variant="ink" icon="plus" onClick={() => setForm({ lead: null, back: false })}>Add lead</Button>
        </div>
      </div>

      <Summary leads={leads} Q={Q} services={lists.services} />

      <div className="rq-body">
      <div className="rq-main">
      <div className="rq-bar rv">
        <div className="seg">
          {RANGES.map(([k, l]) => (
            <button key={k} type="button" className={Q.range === k ? 'on' : ''}
              onClick={() => query(k === 'custom' && !Q.from && !Q.to ? { range: k, from: add(today(), -30), to: today() } : { range: k })}>
              {k === 'custom' && <Icon name="cal" size="s" />}{l}
            </button>
          ))}
        </div>
        {Q.range === 'custom' && (
          <div className="rq-dates" role="group" aria-label="Custom dates">
            <label><span>From</span><input type="date" className="inp sm" value={Q.from} max={Q.to || undefined} onChange={e => query({ from: e.target.value })} /></label>
            <label><span>To</span><input type="date" className="inp sm" value={Q.to} min={Q.from || undefined} onChange={e => query({ to: e.target.value })} /></label>
            {monthShortcuts().map(([l, from, to]) => (
              <button key={l} type="button" className={`chip sm ${Q.from === from && Q.to === to ? 'on' : ''}`} onClick={() => query({ from, to })}>{l}</button>
            ))}
          </div>
        )}
        <Dropdown small style={{ minWidth: 128 }} aria-label="Team member" value={Q.who} onChange={v => query({ who: v })} options={[{ value: 'all', label: 'Everyone' }, ...lists.team]} />
        <Dropdown small style={{ minWidth: 150 }} aria-label="Hot or not" value={Q.temp} onChange={v => query({ temp: v })}
          options={[{ value: 'all', label: 'Hot, warm, cold' }, ...(Object.entries(TEMP) as [Temp, [string, string, string]][]).map(([k, [l, , e]]) => ({ value: k, label: `${e ? e + ' ' : ''}${l} only` }))]} />
        <Dropdown small style={{ minWidth: 145 }} aria-label="Location" value={Q.where} onChange={v => query({ where: v })}
          options={[{ value: 'all', label: 'All locations' }, { value: 'domestic', label: `Domestic (${HOME})` }, { value: 'international', label: 'International' }, ...lists.countries.filter(c => c !== HOME).map(c => ({ value: c, label: `· ${flag(c)} ${c}` }))]} />
        <Dropdown small style={{ minWidth: 145 }} aria-label="Service" value={Q.svc} onChange={v => query({ svc: v })} options={[{ value: 'all', label: 'All services' }, ...lists.services]} />
        <label className="srch">
          <span className="sr">Search</span>
          <Icon name="search" size="s" />
          <input className="inp sm" placeholder="Search" value={Q.q} onChange={e => setQ(q => ({ ...q, q: e.target.value }))} />
        </label>
        {late > 0 && <span className="late"><Icon name="alert" size="s" />{late} overdue</span>}
      </div>

      <Board
        leads={base}
        range={Q.range}
        now={now}
        onOpen={l => setOpenId(l._id)}
        onUpdate={(l, pre) => setUpdate({ lead: l, pre, back: false })}
        onOnboard={onboard}
        onRefuse={msg => toast(msg, true)}
      />
      </div>
      <TodayPanel
        leads={leads}
        Q={Q}
        onOpen={l => setOpenId(l._id)}
        onUpdate={l => setUpdate({ lead: l, back: false })}
        onEdit={l => setForm({ lead: l, back: false })}
        onInvite={l => setInviteId(l._id)}
      />
      </div>

      {open && !update && !form && !dialog && !inviting && (
        <LeadDrawer
          lead={open}
          now={now}
          rate={data.rate}
          onClose={() => setOpenId(null)}
          onUpdate={() => setUpdate({ lead: open, back: true })}
          onEdit={() => setForm({ lead: open, back: true })}
          onReopen={() => patch(open, { action: 'reopen', today: today() }, `Reopened · ${open.name}`)}
          onOnboard={() => onboard(open)}
          onInvite={() => setInviteId(open._id)}
          onDelete={() => setDialog('delete')}
          onTemp={t => patch(open, { action: 'temp', temp: t }, `${open.name}: ${TEMP[t][0]}`)}
          onNotes={notes => patch(open, { action: 'notes', notes })}
          onToast={m => toast(m)}
        />
      )}

      {update && <UpdateDialog lead={update.lead} pre={update.pre} lists={lists} onClose={() => setUpdate(null)} onSaved={updated} />}

      {form && (
        <LeadForm
          lead={form.lead}
          lists={lists}
          defaultOwner={Q.who !== 'all' ? Q.who : undefined}
          onClose={() => setForm(null)}
          onSaved={(lead, created, needsInvite) => {
            put(lead);
            if (!form.back) setOpenId(null);
            setForm(null);
            if (needsInvite) invite(lead, created ? addedMsg(lead) : `Meeting saved · ${lead.meet.type} ${rel(lead.meet.date).toLowerCase()} · ${t12(lead.meet.time)}`);
            else toast(created ? addedMsg(lead) : 'Saved');
          }}
        />
      )}

      {dialog === 'settings' && (
        <SettingsDialog
          lists={lists}
          emails={data.emails}
          leads={leads}
          Q={Q}
          onClose={() => setDialog(null)}
          onListsSaved={next => setData({ ...data, lists: next })}
          onEmailsSaved={next => setData({ ...data, emails: next })}
          onImport={() => setDialog('import')}
          onChanged={msg => { setDialog(null); reload(); if (msg) toast(msg); }}
        />
      )}
      {dialog === 'import' && (
        <ImportDialog leads={leads} onClose={() => setDialog(null)} onDone={msg => { setDialog(null); query({ range: 'all' }); reload(); toast(msg); }} />
      )}
      {dialog === 'delete' && open && (
        <Modal className="acq" open title={`Delete ${open.name}?`} subtitle="Removes the lead and its history. If they said no, use Update → Rejected instead so it counts in the analytics." onClose={() => setDialog(null)}>
          <div className="row wrap" style={{ justifyContent: 'flex-end', gap: 8, marginTop: 22 }}>
            <Button variant="ghost" onClick={() => setDialog(null)}>Cancel</Button>
            <Button variant="ink" onClick={() => remove(open)}>Delete</Button>
          </div>
        </Modal>
      )}

      {inviting && (
        <InviteDialog
          lead={inviting}
          emails={data.emails}
          onClose={() => setInviteId(null)}
          onInvited={() => { if (!inviting.meet.invited) patch(inviting, { action: 'invited' }); }}
          onSettings={() => { setInviteId(null); setDialog('settings'); }}
          onToast={(m, err) => toast(m, err)}
        />
      )}
      {party && <Celebrate title={party.title} sub={party.sub} onClose={() => setParty(null)} />}
    </section>
  );
}

// Calendar shortcuts for the custom range.
function monthShortcuts(): [string, string, string][] {
  const t = today(), first = t.slice(0, 8) + '01', lastPrev = add(first, -1), firstPrev = lastPrev.slice(0, 8) + '01';
  const nextFirst = add(first, 32).slice(0, 8) + '01';
  return [['This month', first, add(nextFirst, -1)], ['Last month', firstPrev, lastPrev], ['Next 7 days', t, add(t, 7)]];
}
