import { AppShell } from '@/components/AppShell';
import { ADMIN_NAV, ADMIN_TABS } from '@/components/nav';

const ACCOUNT = [
  { href: '/admin/account', label: 'My account', icon: 'user' as const },
  { href: '/admin/account?tab=security', label: 'Password & security', icon: 'shield' as const },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell nav={ADMIN_NAV} tabs={ADMIN_TABS} home="/admin" subtitle="Admin console" menu={[...ACCOUNT, ...ADMIN_NAV.filter(n => !ADMIN_TABS.includes(n.href))]}>
      {children}
    </AppShell>
  );
}
