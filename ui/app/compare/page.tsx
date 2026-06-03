'use client';

import { useState, useMemo, Suspense } from 'react';
import { ReportsProvider, useReports } from '@/components/ReportsProvider';
import { Pagination, paginate } from '@/components/Pagination';
import { ComponentTypeBadge, PkgTypeBadge } from '@/components/TypeBadge';
import { useFilter, StatCard, cls } from '@agnistack/omniflow-ui';
import type { ComponentEntry } from '@/lib/api';

function fmtTime(iso: string) {
  if (!iso) return '--';
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

interface DiffResult {
  added:    ComponentEntry[];
  removed:  ComponentEntry[];
  changed:  Array<{ name: string; type: string; group: string; versionA: string; versionB: string }>;
  totalDelta: number;
}

function diffComponents(compsA: ComponentEntry[], compsB: ComponentEntry[]): DiffResult {
  // Key: name + type
  const key = (c: ComponentEntry) => `${c.name}::${c.type}`;
  const mapA = new Map<string, ComponentEntry>();
  const mapB = new Map<string, ComponentEntry>();
  compsA.forEach(c => mapA.set(key(c), c));
  compsB.forEach(c => mapB.set(key(c), c));

  const added: ComponentEntry[] = [];
  const removed: ComponentEntry[] = [];
  const changed: Array<{ name: string; type: string; group: string; versionA: string; versionB: string }> = [];

  // Components in B not in A = added
  for (const [k, c] of mapB) {
    if (!mapA.has(k)) {
      added.push(c);
    }
  }

  // Components in A not in B = removed
  for (const [k, c] of mapA) {
    if (!mapB.has(k)) {
      removed.push(c);
    }
  }

  // Components in both but with different version = changed
  for (const [k, cA] of mapA) {
    const cB = mapB.get(k);
    if (cB && cA.version !== cB.version) {
      changed.push({
        name: cA.name,
        type: cA.type,
        group: cA.group,
        versionA: cA.version,
        versionB: cB.version,
      });
    }
  }

  return {
    added,
    removed,
    changed,
    totalDelta: added.length - removed.length,
  };
}

function Compare() {
  const { reports, isLoading } = useReports();
  const [idA, setIdA] = useState('');
  const [idB, setIdB] = useState('');
  const [addedPage, setAddedPage] = useState(0);
  const [removedPage, setRemovedPage] = useState(0);
  const [changedPage, setChangedPage] = useState(0);

  if (isLoading) return <p className="text-gray-500 dark:text-slate-500 text-sm">Loading reports...</p>;
  if (!reports.length) return <p className="text-gray-500 dark:text-slate-500 text-sm">No SBOM reports to compare.</p>;

  const reportA = reports.find(r => r.id === idA);
  const reportB = reports.find(r => r.id === idB);

  const shouldCompare = idA && idB && idA !== idB && reportA && reportB;

  const diff = useMemo<DiffResult | null>(() => {
    if (!shouldCompare || !reportA || !reportB) return null;
    const compsA = reportA.fields?.components ?? [];
    const compsB = reportB.fields?.components ?? [];
    return diffComponents(compsA, compsB);
  }, [shouldCompare, reportA, reportB]);

  const cardCls = cls.card + ' p-4';
  const headingCls = cls.heading + ' mb-3';

  return (
    <div className="max-w-6xl space-y-6">
      {/* Selectors */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-xs text-gray-500 dark:text-slate-500 mb-1 block">Report A (baseline)</label>
          <select value={idA} onChange={e => { setIdA(e.target.value); setAddedPage(0); setRemovedPage(0); setChangedPage(0); }} className={cls.select + ' w-full'}>
            <option value="">Select a report...</option>
            {reports.map(r => (
              <option key={r.id} value={r.id}>
                {fmtTime(r.timestamp)} -- {r.fields?.subjectComponent?.name || r.fields?.projectName || 'SBOM'} ({r.fields?.totalComponents} components)
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500 dark:text-slate-500 mb-1 block">Report B (current)</label>
          <select value={idB} onChange={e => { setIdB(e.target.value); setAddedPage(0); setRemovedPage(0); setChangedPage(0); }} className={cls.select + ' w-full'}>
            <option value="">Select a report...</option>
            {reports.map(r => (
              <option key={r.id} value={r.id}>
                {fmtTime(r.timestamp)} -- {r.fields?.subjectComponent?.name || r.fields?.projectName || 'SBOM'} ({r.fields?.totalComponents} components)
              </option>
            ))}
          </select>
        </div>
      </div>

      {idA && idB && idA === idB && (
        <p className="text-amber-600 dark:text-amber-400 text-sm">Select two different reports to compare.</p>
      )}

      {diff && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard
              label="Added Components"
              value={diff.added.length}
              tone={diff.added.length > 0 ? 'success' : undefined}
            />
            <StatCard
              label="Removed Components"
              value={diff.removed.length}
              tone={diff.removed.length > 0 ? 'danger' : undefined}
            />
            <StatCard
              label="Version Changes"
              value={diff.changed.length}
              tone={diff.changed.length > 0 ? 'warn' : undefined}
            />
            <StatCard
              label="Total Delta"
              value={(diff.totalDelta > 0 ? '+' : '') + diff.totalDelta}
              sub={`${reportA!.fields?.totalComponents ?? 0} -> ${reportB!.fields?.totalComponents ?? 0}`}
            />
          </div>

          {/* Added Components */}
          {diff.added.length > 0 && (() => {
            const { paged, total, totalPages } = paginate(diff.added, addedPage);
            return (
              <div className={cardCls}>
                <p className={headingCls + ' text-green-700 dark:text-green-400'}>Added Components ({diff.added.length})</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className={cls.table.header}>
                        <th className="text-left py-2 px-2">Name</th>
                        <th className="text-left py-2 px-2">Version</th>
                        <th className="text-left py-2 px-2">Group</th>
                        <th className="text-left py-2 px-2">Type</th>
                        <th className="text-left py-2 px-2">Pkg Type</th>
                        <th className="text-left py-2 px-2">PURL</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paged.map(c => (
                        <tr key={c.bomRef || c.name} className={cls.table.row + ' bg-green-50/50 dark:bg-green-950/20'}>
                          <td className="py-1.5 px-2 font-mono text-xs text-green-700 dark:text-green-400 font-medium">{c.name}</td>
                          <td className="py-1.5 px-2 text-xs">{c.version || '--'}</td>
                          <td className="py-1.5 px-2 text-xs text-gray-500 dark:text-slate-500">{c.group || '--'}</td>
                          <td className="py-1.5 px-2"><ComponentTypeBadge value={c.type} /></td>
                          <td className="py-1.5 px-2"><PkgTypeBadge value={c.pkgType} /></td>
                          <td className="py-1.5 px-2 text-xs text-gray-400 dark:text-slate-500 font-mono max-w-[200px] truncate" title={c.purl}>{c.purl || '--'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Pagination page={addedPage} totalPages={totalPages} total={total} onPageChange={setAddedPage} />
              </div>
            );
          })()}

          {/* Removed Components */}
          {diff.removed.length > 0 && (() => {
            const { paged, total, totalPages } = paginate(diff.removed, removedPage);
            return (
              <div className={cardCls}>
                <p className={headingCls + ' text-red-700 dark:text-red-400'}>Removed Components ({diff.removed.length})</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className={cls.table.header}>
                        <th className="text-left py-2 px-2">Name</th>
                        <th className="text-left py-2 px-2">Version</th>
                        <th className="text-left py-2 px-2">Group</th>
                        <th className="text-left py-2 px-2">Type</th>
                        <th className="text-left py-2 px-2">Pkg Type</th>
                        <th className="text-left py-2 px-2">PURL</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paged.map(c => (
                        <tr key={c.bomRef || c.name} className={cls.table.row + ' bg-red-50/50 dark:bg-red-950/20'}>
                          <td className="py-1.5 px-2 font-mono text-xs text-red-700 dark:text-red-400 font-medium">{c.name}</td>
                          <td className="py-1.5 px-2 text-xs">{c.version || '--'}</td>
                          <td className="py-1.5 px-2 text-xs text-gray-500 dark:text-slate-500">{c.group || '--'}</td>
                          <td className="py-1.5 px-2"><ComponentTypeBadge value={c.type} /></td>
                          <td className="py-1.5 px-2"><PkgTypeBadge value={c.pkgType} /></td>
                          <td className="py-1.5 px-2 text-xs text-gray-400 dark:text-slate-500 font-mono max-w-[200px] truncate" title={c.purl}>{c.purl || '--'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Pagination page={removedPage} totalPages={totalPages} total={total} onPageChange={setRemovedPage} />
              </div>
            );
          })()}

          {/* Version Changes */}
          {diff.changed.length > 0 && (() => {
            const { paged, total, totalPages } = paginate(diff.changed, changedPage);
            return (
              <div className={cardCls}>
                <p className={headingCls + ' text-amber-700 dark:text-amber-400'}>Version Changes ({diff.changed.length})</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className={cls.table.header}>
                        <th className="text-left py-2 px-2">Name</th>
                        <th className="text-left py-2 px-2">Group</th>
                        <th className="text-left py-2 px-2">Type</th>
                        <th className="text-left py-2 px-2">Version A</th>
                        <th className="text-center py-2 px-2"></th>
                        <th className="text-left py-2 px-2">Version B</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paged.map(c => (
                        <tr key={c.name + c.type} className={cls.table.row + ' bg-amber-50/50 dark:bg-amber-950/20'}>
                          <td className="py-1.5 px-2 font-mono text-xs text-amber-700 dark:text-amber-400 font-medium">{c.name}</td>
                          <td className="py-1.5 px-2 text-xs text-gray-500 dark:text-slate-500">{c.group || '--'}</td>
                          <td className="py-1.5 px-2"><ComponentTypeBadge value={c.type} /></td>
                          <td className="py-1.5 px-2 text-xs font-mono text-red-600 dark:text-red-400">{c.versionA}</td>
                          <td className="py-1.5 px-2 text-xs text-gray-400 dark:text-slate-500 text-center">&rarr;</td>
                          <td className="py-1.5 px-2 text-xs font-mono text-green-600 dark:text-green-400">{c.versionB}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Pagination page={changedPage} totalPages={totalPages} total={total} onPageChange={setChangedPage} />
              </div>
            );
          })()}

          {/* No changes */}
          {diff.added.length === 0 && diff.removed.length === 0 && diff.changed.length === 0 && (
            <div className={cardCls + ' text-center py-8'}>
              <p className="text-gray-500 dark:text-slate-400">No differences found between the two reports.</p>
              <p className="text-gray-400 dark:text-slate-600 text-xs mt-1">Both SBOMs contain the same components with identical versions.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function CompareContent() {
  const { filter: f } = useFilter();
  return (
    <ReportsProvider filter={{
      projectName: f.projectName || undefined,
      limit:       Number(f.limit) || 50,
    }}>
      <Compare />
    </ReportsProvider>
  );
}

export default function ComparePage() {
  return <Suspense fallback={<p className="text-gray-500 text-sm p-4">Loading...</p>}><CompareContent /></Suspense>;
}
