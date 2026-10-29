'use client';

import { use } from 'react';
import { LeadDetail } from '@/components/leads/LeadDetail';

export default function AdminLeadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <LeadDetail id={id} admin backHref="/admin/leads" />;
}
