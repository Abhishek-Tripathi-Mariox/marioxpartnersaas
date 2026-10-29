'use client';

import { usePathname, useRouter } from 'next/navigation';
import { TOOLKIT_TABS } from '@/components/nav';
import { Tabs } from '@/components/ui';

// Segmented switcher between the four toolkit pages.
export function ToolkitNav() {
  const path = usePathname();
  const router = useRouter();
  return <div><Tabs tabs={TOOLKIT_TABS} value={path} onChange={v => router.push(v)} /></div>;
}
