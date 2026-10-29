'use client';

import { useEffect, useState } from 'react';
import { REQUESTS, type RequestKind } from '@/components/requests/config';
import { RequestsView } from '@/components/requests/RequestsView';
import { PageHeader, Tabs } from '@/components/ui';

const KINDS = Object.keys(REQUESTS) as RequestKind[];

export default function AdminRequestsPage() {
  const [kind, setKind] = useState<RequestKind>('scope');
  const [initial, setInitial] = useState<{ status?: string } | null>(null);

  // Deep link from overview tiles: /admin/requests?kind=ticket&status=requested,assigned
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const k = p.get('kind') as RequestKind | null;
    if (k && k in REQUESTS) setKind(k);
    setInitial({ status: p.get('status') ?? undefined });
  }, []);

  const switchKind = (k: RequestKind) => {
    setInitial({});
    setKind(k);
  };
  return (
    <>
      <PageHeader eyebrow="Admin" title="Partner requests" subtitle="Click a row to approve, assign, reschedule or reply." />
      <div><Tabs tabs={KINDS.map(k => ({ value: k, label: REQUESTS[k].title }))} value={kind} onChange={switchKind} /></div>
      {initial && <RequestsView key={kind} kind={kind} admin embedded initialStatus={initial.status} />}
    </>
  );
}
