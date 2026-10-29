import { AppShell } from '@/components/AppShell';
import { PARTNER_NAV, PARTNER_TABS } from '@/components/nav';

const MENU = [
  { href: '/profile', label: 'Profile & partner card', icon: 'idcard' as const },
  { href: '/profile?tab=security', label: 'Password & security', icon: 'shield' as const },
  { href: '/visits', label: 'Book office visit', icon: 'cal' as const },
  { href: '/kit', label: 'Sales kit', icon: 'file' as const },
  { href: '/support', label: 'Support', icon: 'help' as const },
];

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell nav={PARTNER_NAV} tabs={PARTNER_TABS} home="/dashboard" subtitle="Partner portal" menu={MENU}>
      {children}
    </AppShell>
  );
}
