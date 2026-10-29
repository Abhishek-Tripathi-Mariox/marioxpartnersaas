'use client';

import { AppearanceCard, PasswordCard, SessionsCard } from '@/components/account/SecurityCard';
import { DynamicForm, type FieldDef } from '@/components/forms/DynamicForm';
import { useUser } from '@/components/UserProvider';
import { Card, Icon, PageHeader, SkeletonCards, Tabs, hue, initials, useToast } from '@/components/ui';
import { useAccountTab } from '@/hooks/useAccountTab';
import { api } from '@/lib/client';

const FIELDS: FieldDef[] = [
  { name: 'name', label: 'Full name', required: true },
  { name: 'phone', label: 'Phone', type: 'tel' },
  { name: 'city', label: 'City' },
];

// The signed-in admin's own account: profile, password, sessions and theme.
export default function AdminAccountPage() {
  const { user, reload } = useUser();
  const toast = useToast();
  const [tab, setTab] = useAccountTab();
  if (!user) return <SkeletonCards count={2} />;

  return (
    <>
      <PageHeader eyebrow="Admin" title="My account" subtitle="Your own profile and sign-in security." />
      <div><Tabs tabs={[{ value: 'profile', label: <><Icon name="user" size="s" />Profile</> }, { value: 'security', label: <><Icon name="shield" size="s" />Password & security</> }]} value={tab} onChange={setTab} /></div>

      {tab === 'profile' ? (
        <div className="split">
          <Card title="Profile" subtitle="Your email is your sign-in ID. Another admin can change it from Partners.">
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
          <div className="ccard stick" style={{ ['--glow' as string]: `hsla(${hue(user.name)},70%,55%,.5)`, padding: 24 }}>
            <div className="row" style={{ gap: 14 }}>
              <span className="big-av" style={{ background: 'linear-gradient(135deg,var(--accent),#c2340b)' }}>{initials(user.name)}</span>
              <div>
                <div style={{ font: '700 22px var(--display)', letterSpacing: '-.02em' }}>{user.name}</div>
                <div className="muted" style={{ fontSize: 13.5 }}>{user.email}</div>
                <div className="lbl" style={{ marginTop: 8 }}>Mariox admin</div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="split">
          <PasswordCard />
          <div className="stack stick" style={{ gap: 16 }}>
            <SessionsCard user={user} />
            <AppearanceCard />
          </div>
        </div>
      )}
    </>
  );
}
