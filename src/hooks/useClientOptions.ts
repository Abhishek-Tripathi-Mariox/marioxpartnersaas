'use client';

import { isOpen } from '@/lib/pipeline';
import type { Lead, Project } from '@/types';
import { useApi } from './useApi';

// Client picker options, as in the original portal: clients you are delivering for,
// then your open leads, then "New prospect". Uses the same cached data as the dashboard.
export function useClientOptions() {
  const projects = useApi<{ projects: Project[] }>('/api/projects');
  const leads = useApi<{ leads: Lead[] }>('/api/leads');
  const names = [
    ...(projects.data?.projects ?? []).map(p => p.client),
    ...(leads.data?.leads ?? []).filter(l => isOpen(l.stage)).map(l => l.company),
  ];
  return [...new Set(names.filter(Boolean)), 'New prospect'];
}
