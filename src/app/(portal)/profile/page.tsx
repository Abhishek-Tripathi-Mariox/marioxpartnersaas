'use client';

import { DynamicForm, type FieldDef } from '@/components/forms/DynamicForm';
import { VisitingCard } from '@/components/PartnerCard';
import { useUser } from '@/components/UserProvider';
import { usePipeline } from '@/components/SettingsProvider';
import { AppearanceCard, PasswordCard, SessionsCard } from '@/components/account/SecurityCard';
import { Card, Icon, Note, PageHeader, Tabs, useToast } from '@/components/ui';
import { useAccountTab } from '@/hooks/useAccountTab';
import { useApi } from '@/hooks/useApi';
import { api } from '@/lib/client';
import { date, short } from '@/lib/format';
import { earnings, pipeline } from '@/lib/metrics';
import { LOST, WON } from '@/lib/pipeline';
import type { Lead, Project } from '@/types';

const FIELDS: FieldDef[] = [
  { name: 'name', label: 'Full name', required: true },
  { name: 'company', label: 'Company' },
  { name: 'phone', label: 'Phone', type: 'tel' },
  { name: 'city', label: 'City' },
  { name: 'industries', label: 'Industries you sell into', full: true },
  { name: 'pan', label: 'PAN' },
  { name: 'gstin', label: 'GSTIN', placeholder: 'Optional' },
  { name: 'bankAccount', label: 'Bank account number' },
  { name: 'ifsc', label: 'IFSC' },
];

export default function ProfilePage() {
  const { user, reload } = useUser();
  const toast = useToast();
  const cfg = usePipeline();
  const [tab, setTab] = useAccountTab();
  const leads = useApi<{ leads: Lead[] }>('/api/leads');
  const projects = useApi<{ projects: Project[] }>('/api/projects');
  if (!user) return null;

  const m = earnings(projects.data?.projects ?? [], user.commissionRate);
  const p = pipeline(leads.data?.leads ?? [], cfg);

  return (
    <>
      <PageHeader eyebrow="Partner profile" title={user.name} subtitle={`${user.company || 'Mariox partner'} · Certified Mariox partner since ${date(user.createdAt)}`} />
      <div><Tabs tabs={[{ value: 'profile', label: <><Icon name="idcard" size="s" />Profile</> }, { value: 'security', label: <><Icon name="shield" size="s" />Password & security</> }]} value={tab} onChange={setTab} /></div>
      {tab === 'security' ? (
        <div className="split">
          <PasswordCard />
          <div className="stack stick" style={{ gap: 16 }}>
            <SessionsCard user={user} />
            <AppearanceCard />
          </div>
        </div>
      ) : (
      <div className="split pf">
        <div className="stack" style={{ gap: 18 }}>
          <VisitingCard user={user} />
          <div className="g4" style={{ gap: 10 }}>
            <Note label="Clients closed" value={projects.data?.projects.length ?? 0} href="/projects" />
            <Note label="Business won" value={short(m.deal)} href="/projects" info="Contract value of all your projects." />
            <Note label="Lifetime potential" value={short(m.potential)} good href="/earnings" info="Released + processing + future commission on closed deals." />
            <Note label="Win rate" value={p.won + p.lost ? `${p.winRate}%` : '—'} href={`/leads?view=list&stage=${WON},${LOST}`} info="Won ÷ (Won + Lost) leads." />
          </div>
        </div>
        <Card title="Details and payout account" subtitle={`${user.email} · ${user.partnerCode}`}>
          <DynamicForm
            key={user.id}
            fields={FIELDS}
            initial={user as unknown as Record<string, unknown>}
            submitLabel="Save profile"
            onSubmit={async v => {
              await api.patch('/api/me', Object.fromEntries(FIELDS.map(f => [f.name, v[f.name] ?? ''])));
              await reload();
              toast('Profile saved');
            }}
          />
        </Card>
      </div>
      )}
    </>
  );
}
