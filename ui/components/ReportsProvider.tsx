'use client';

import { createContext, useContext } from 'react';
import useSWR from 'swr';
import { SbomRecord } from '@/lib/api';

const BASE = process.env.NEXT_PUBLIC_API_URL ?? '';
const fetcher = (url: string) => fetch(BASE + url).then(r => r.ok ? r.json() : []);

export interface ReportFilter {
  projectName?: string;
  limit?: number;
}

interface ReportsContext { reports: SbomRecord[]; isLoading: boolean; }
const Ctx = createContext<ReportsContext>({ reports: [], isLoading: true });

export function ReportsProvider({
  children,
  filter = {},
  limit,
}: { children: React.ReactNode; filter?: ReportFilter; limit?: number }) {
  const params = new URLSearchParams({ type: 'cyclonedx-sbom', size: String(filter.limit ?? limit ?? 50) });
  if (filter.projectName) params.set('projectName', filter.projectName);

  const { data, isLoading } = useSWR<{ entries: SbomRecord[] }>(
    `/api/v1/analytics/builds?${params}`,
    fetcher,
    { refreshInterval: 30_000 },
  );
  return <Ctx.Provider value={{ reports: data?.entries ?? [], isLoading }}>{children}</Ctx.Provider>;
}

export const useReports = () => useContext(Ctx);