'use client';

import { Button, Icon, Modal, type IconName } from '@/components/ui';
import { dow, fdt, gcalHref, guests, ics, inviteText, mailHref, platform, t12, teamMails, theirTime, waHref, type AcqLead, type TeamEmails } from '@/lib/acquisition';
import { Avs } from './bits';

type Props = {
  lead: AcqLead;
  emails: TeamEmails;
  onClose: () => void;
  onInvited: () => void; // a channel was used: mark the meeting as invited
  onSettings: () => void;
  onToast: (msg: string, error?: boolean) => void;
};

// Send the meeting invite: WhatsApp, email (team on cc), Google Calendar (guests added) or an .ics file.
// Using any of them marks the meeting as invited.
export function InviteDialog({ lead: l, emails, onClose, onInvited, onSettings, onToast }: Props) {
  const m = l.meet, tt = theirTime(l), g = guests(l, emails).length;
  const missing = (m.attendees ?? []).filter(n => !emails[n]);

  const B = ({ href, icon, title, sub, cls = '' }: { href: string; icon: IconName; title: string; sub: string; cls?: string }) => (
    <a className={`iv-b ${cls}`} href={href} target="_blank" rel="noopener noreferrer" onClick={onInvited}>
      <Icon name={icon} /><span><b>{title}</b><small>{sub}</small></span>
    </a>
  );
  const Off = ({ icon, title, sub }: { icon: IconName; title: string; sub: string }) => (
    <span className="iv-b off"><Icon name={icon} /><span><b>{title}</b><small>{sub}</small></span></span>
  );

  function download() {
    const blob = new Blob([ics(l, emails)], { type: 'text/calendar' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `Mariox_${l.name.replace(/\W+/g, '_')}_${m.date}.ics`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    onInvited();
    onToast('Calendar file downloaded · open it to add the event and send invites');
  }
  function copy() {
    navigator.clipboard?.writeText(inviteText(l)).then(() => { onInvited(); onToast('Invite copied · paste it anywhere'); }, () => onToast('Could not copy', true));
  }

  return (
    <Modal className="acq" open wide title="Send the invite" subtitle={`${l.name}${l.company ? ' · ' + l.company : ''}${m.invited ? ' · already sent once' : ''}`} onClose={onClose}>
      <div className="iv-sum">
        <div className="iv-when">
          <span>{dow(m.date!)}, {fdt(m.date)}</span>
          <b>{t12(m.time)}</b>
          <small>IST{tt ? ' · ' + tt : ''} · {+(m.duration ?? 30) || 30} min</small>
        </div>
        <div className="iv-what">
          <span className="iv-ty">{m.type || 'Meeting'}</span>
          <span className="iv-ln">{m.link ? <><Icon name="video" size="s" />{platform(m.link)}</> : <em>No link yet. Add one with Edit</em>}</span>
          <span className="row" style={{ gap: 8 }}><Avs names={m.attendees} max={5} /><small>{(m.attendees ?? []).join(', ') || 'No one from the team'}</small></span>
          {!!m.prep?.length && <span className="iv-prep">{m.prep.map(x => <i key={x}>{x}</i>)}</span>}
        </div>
      </div>
      <div className="iv-g">
        {l.phone ? <B href={waHref(l, inviteText(l))} icon="whatsapp" title="WhatsApp" sub={l.phone} cls="wa" /> : <Off icon="whatsapp" title="WhatsApp" sub="No phone added" />}
        {l.email ? <B href={mailHref(l, emails)} icon="mail" title="Email" sub={l.email + (teamMails(l, emails).length ? ' + team' : '')} /> : <Off icon="mail" title="Email" sub="No email added" />}
        <B href={gcalHref(l, emails)} icon="cal" title="Google Calendar" sub={g ? `Invites ${g} guest${g === 1 ? '' : 's'}` : 'Add the event'} cls="gc" />
        <button type="button" className="iv-b" onClick={download}><Icon name="download" /><span><b>Calendar file</b><small>Outlook, Apple (.ics)</small></span></button>
      </div>
      {missing.length > 0 && (
        <p className="iv-note">
          <Icon name="alert" size="s" />
          <span>{missing.join(', ')} {missing.length === 1 ? 'has' : 'have'} no email yet. Add team emails in <button type="button" className="lnk" onClick={onSettings}>Settings</button> so they get the calendar invite too.</span>
        </p>
      )}
      <div className="row wrap" style={{ justifyContent: 'flex-end', gap: 8, marginTop: 22 }}>
        <Button variant="ghost" icon="copy" onClick={copy}>Copy text</Button>
        <Button variant="ink" onClick={onClose}>Done</Button>
      </div>
    </Modal>
  );
}
