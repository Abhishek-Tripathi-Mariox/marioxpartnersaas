'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { api } from '@/lib/client';
import { prefetchApi } from '@/hooks/useApi';
import { Icon, ToastProvider, initials } from './ui';
import { UserProvider, useUser } from './UserProvider';
import { SettingsProvider } from './SettingsProvider';
import { isActive, type NavItem } from './nav';
import { ThemeSwitch } from './account/ThemeSwitch';

type ShellProps = { nav: NavItem[]; tabs: string[]; home: string; subtitle: string; menu: NavItem[] };

// Floating glass dock with a sliding indicator under the active item.
function Dock({ nav }: { nav: NavItem[] }) {
  const path = usePathname();
  const ref = useRef<HTMLElement>(null);
  const [ind, setInd] = useState({ width: 0, x: 0 });

  useLayoutEffect(() => {
    const on = ref.current?.querySelector<HTMLElement>('a.on');
    setInd(on ? { width: on.offsetWidth, x: on.offsetLeft } : { width: 0, x: 0 });
  }, [path]);

  // Once the current page has settled, quietly load every section's first data
  // so moving between sections shows content immediately.
  useEffect(() => {
    const t = setTimeout(() => nav.forEach(n => n.prefetch?.forEach(prefetchApi)), 1200);
    return () => clearTimeout(t);
  }, [nav]);

  return (
    <nav className="dock" ref={ref} aria-label="Sections">
      <span className="dock-ind" style={{ width: ind.width, transform: `translateX(${ind.x}px)` }} />
      {nav.map(n => {
        const on = isActive(n, path, nav);
        return (
          <Link key={n.href} href={n.href} className={on ? 'on' : ''} aria-current={on ? 'page' : undefined} onMouseEnter={() => n.prefetch?.forEach(prefetchApi)} onFocus={() => n.prefetch?.forEach(prefetchApi)}>
            <Icon name={n.icon} />
            <span className="t">{n.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function AccountMenu({ items }: { items: NavItem[] }) {
  const { user } = useUser();
  const [open, setOpen] = useState(false);
  const path = usePathname();
  useEffect(() => setOpen(false), [path]);

  async function logout() {
    await api.post('/api/auth/logout');
    window.location.href = '/login';
  }

  return (
    <div className="acct">
      <button className="ava" onClick={() => setOpen(o => !o)} aria-label="Account menu" aria-expanded={open}>
        {user ? initials(user.name) : ''}
      </button>
      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 84 }} onClick={() => setOpen(false)} />
          <div className="menu" role="menu">
            <div className="who">
              <b>{user?.name}</b>
              <span className="sub">{user?.role === 'admin' ? 'Mariox admin' : `${user?.partnerCode ?? ''} · ${user?.company ?? ''}`}</span>
            </div>
            <hr />
            {items.map(i => (
              <Link key={i.href} href={i.href} role="menuitem" onClick={() => setTimeout(() => window.dispatchEvent(new Event('mariox-url')), 60)}>
                <Icon name={i.icon} size="s" />
                {i.label}
              </Link>
            ))}
            <hr />
            <div className="mh">Theme</div>
            <ThemeSwitch />
            <hr />
            <button onClick={logout} role="menuitem">
              <Icon name="x" size="s" />
              Sign out
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function TabBar({ nav, tabs }: { nav: NavItem[]; tabs: string[] }) {
  const path = usePathname();
  return (
    <nav className="tabbar" aria-label="Primary">
      {nav
        .filter(n => tabs.includes(n.href))
        .map(n => (
          <Link key={n.href} href={n.href} className={`tab ${isActive(n, path, nav) ? 'on' : ''}`}>
            <Icon name={n.icon} />
            {n.label}
          </Link>
        ))}
    </nav>
  );
}

function Shell({ nav, tabs, home, subtitle, menu, children }: ShellProps & { children: ReactNode }) {
  return (
    <>
      <header className="top">
        <div className="top-in">
          <Link className="brand" href={home} aria-label="Mariox Partners home">
            <span className="mark"><b>M</b></span>
            <span className="brand-t">
              <b>Mariox</b>
              <span>{subtitle}</span>
            </span>
          </Link>
          <Dock nav={nav} />
          <div className="top-r">
            <AccountMenu items={menu} />
          </div>
        </div>
      </header>
      <main className="main">
        <section className="view">{children}</section>
      </main>
      <TabBar nav={nav} tabs={tabs} />
    </>
  );
}

export function AppShell(props: ShellProps & { children: ReactNode }) {
  return (
    <UserProvider>
      <SettingsProvider>
        <ToastProvider>
          <Shell {...props} />
        </ToastProvider>
      </SettingsProvider>
    </UserProvider>
  );
}
