'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { useApi } from '@/hooks/useApi';
import type { User } from '@/types';

type Ctx = { user: User | null; reload: () => Promise<void> };
const UserCtx = createContext<Ctx>({ user: null, reload: async () => {} });

export function UserProvider({ children }: { children: ReactNode }) {
  const { data, reload } = useApi<{ user: User }>('/api/me');
  return <UserCtx.Provider value={{ user: data?.user ?? null, reload }}>{children}</UserCtx.Provider>;
}

export const useUser = () => useContext(UserCtx);
