'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { useApi } from '@/hooks/useApi';
import { DEFAULT_PIPELINE, type PipelineConfig } from '@/lib/pipeline';
import type { Contact } from '@/types';

export type PortalSettings = { contacts: Contact[]; announcement: string; pipeline: PipelineConfig };

const FALLBACK: PortalSettings = { contacts: [], announcement: '', pipeline: DEFAULT_PIPELINE };
type Ctx = { settings: PortalSettings; loaded: boolean; reload: () => Promise<void> };
const SettingsCtx = createContext<Ctx>({ settings: FALLBACK, loaded: false, reload: async () => {} });

// Loads portal settings once per session so every screen uses the admin's pipeline config.
export function SettingsProvider({ children }: { children: ReactNode }) {
  const { data, reload } = useApi<{ settings: PortalSettings }>('/api/settings');
  return <SettingsCtx.Provider value={{ settings: data?.settings ?? FALLBACK, loaded: !!data, reload }}>{children}</SettingsCtx.Provider>;
}

export const useSettings = () => useContext(SettingsCtx);
export const usePipeline = () => useContext(SettingsCtx).settings.pipeline;
