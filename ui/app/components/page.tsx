'use client';

import { useState, useMemo, Suspense } from 'react';
import { ReportsProvider, useReports } from '@/components/ReportsProvider';
import { Pagination, paginate } from '@/components/Pagination';
import { ComponentTypeBadge, PkgTypeBadge } from '@/components/TypeBadge';
import { useFilter, cls } from '@agnistack/omniflow-ui';
import type { ComponentEntry } from '@/lib/api';

function Components() {
  const { reports, isLoading } = useReports();
  const [selectedReport, setSelectedReport] = useState<string>('');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [pkgFilter, setPkgFilter] = useState('all');
  const [page, setPage] = useState(0);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  if (isLoading) return <p className="text-gray-500 dark:text-slate-500 text-sm">Loading reports...</p>;
  if (!reports.length) return <p className="text-gray-500 dark:text-slate-500 text-sm">No SBOM reports found.</p>;

  const report = reports.find(r => r.id === selectedReport) ?? reports[0];
  const components: ComponentEntry[] = report?.fields?.components ?? [];

  // Unique types/pkgTypes for filter buttons
  const allTypes = useMemo(() => {
    const s = new Set<string>();
    components.forEach(c => s.add(c.type));
    return Array.from(s).sort();
  }, [components]);

  const allPkgTypes = useMemo(() => {
    const s = new Set<string>();
    components.forEach(c => { if (c.pkgType) s.add(c.pkgType); });
    return Array.from(s).sort();
  }, [components]);

  // Filtering
  const filtered = useMemo(() => {
    let list = components;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.group.toLowerCase().includes(q) ||
        c.purl.toLowerCase().includes(q)
      );
    }
    if (typeFilter !== 'all') {
      list = list.filter(c => c.type === typeFilter);
    }
    if (pkgFilter !== 'all') {
      list = list.filter(c => c.pkgType === pkgFilter);
    }
    return list;
  }, [components, search, typeFilter, pkgFilter]);

  const { paged, total, totalPages } = paginate(filtered, page);

  const toggleExpand = (bomRef: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(bomRef)) next.delete(bomRef);
      else next.add(bomRef);
      return next;
    });
  };

  const cardCls = cls.card + ' p-4';
  const headingCls = cls.heading + ' mb-3';

  return (
    <div className="max-w-6xl space-y-4">
      {/* Report selector */}
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-xs text-gray-500 dark:text-slate-500">Report:</label>
        <select
          value={report?.id ?? ''}
          onChange={e => { setSelectedReport(e.target.value); setPage(0); }}
          className={cls.select}
        >
          {reports.map(r => (
            <option key={r.id} value={r.id}>
              {r.fields?.subjectComponent?.name || r.fields?.projectName || 'SBOM'} — {new Date(r.timestamp).toLocaleDateString()} ({r.fields?.totalComponents} components)
            </option>
          ))}
        </select>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="Search by name, group, or PURL..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(0); }}
          className="px-3 py-1.5 text-sm border border-gray-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-300 w-64 focus:outline-none focus:ring-1 focus:ring-sky-400"
        />

        <div className="flex gap-1">
          <button
            onClick={() => { setTypeFilter('all'); setPage(0); }}
            className={`px-2.5 py-1 text-xs rounded-md transition-colors ${typeFilter === 'all' ? 'bg-sky-100 dark:bg-sky-900/50 text-sky-700 dark:text-sky-300 font-semibold' : 'text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800'}`}
          >All</button>
          {allTypes.map(t => (
            <button
              key={t}
              onClick={() => { setTypeFilter(t); setPage(0); }}
              className={`px-2.5 py-1 text-xs rounded-md transition-colors capitalize ${typeFilter === t ? 'bg-sky-100 dark:bg-sky-900/50 text-sky-700 dark:text-sky-300 font-semibold' : 'text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800'}`}
            >{t}</button>
          ))}
        </div>

        {allPkgTypes.length > 0 && (
          <div className="flex gap-1">
            <span className="text-xs text-gray-400 dark:text-slate-600 self-center mr-1">Pkg:</span>
            <button
              onClick={() => { setPkgFilter('all'); setPage(0); }}
              className={`px-2.5 py-1 text-xs rounded-md transition-colors ${pkgFilter === 'all' ? 'bg-sky-100 dark:bg-sky-900/50 text-sky-700 dark:text-sky-300 font-semibold' : 'text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800'}`}
            >All</button>
            {allPkgTypes.map(t => (
              <button
                key={t}
                onClick={() => { setPkgFilter(t); setPage(0); }}
                className={`px-2.5 py-1 text-xs rounded-md transition-colors ${pkgFilter === t ? 'bg-sky-100 dark:bg-sky-900/50 text-sky-700 dark:text-sky-300 font-semibold' : 'text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800'}`}
              >{t}</button>
            ))}
          </div>
        )}
      </div>

      {/* Component count */}
      <p className="text-xs text-gray-500 dark:text-slate-500">
        Showing {filtered.length} of {components.length} components
      </p>

      {/* Table */}
      <div className={cardCls}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className={cls.table.header}>
                <th className="text-left py-2 px-2 w-6"></th>
                <th className="text-left py-2 px-2">Name</th>
                <th className="text-left py-2 px-2">Version</th>
                <th className="text-left py-2 px-2">Group</th>
                <th className="text-left py-2 px-2">Type</th>
                <th className="text-left py-2 px-2">Pkg Type</th>
                <th className="text-left py-2 px-2">PURL</th>
                <th className="text-left py-2 px-2">File Path</th>
              </tr>
            </thead>
            <tbody>
              {paged.map(c => {
                const isExpanded = expanded.has(c.bomRef || c.name);
                const key = c.bomRef || c.name;
                return (
                  <>
                    <tr
                      key={key}
                      className={cls.table.row + ' cursor-pointer'}
                      onClick={() => toggleExpand(key)}
                    >
                      <td className="py-1.5 px-2 text-gray-400 dark:text-slate-500 text-xs">
                        {isExpanded ? '▼' : '▶'}
                      </td>
                      <td className="py-1.5 px-2 font-mono text-xs text-gray-700 dark:text-slate-300 font-medium">
                        {c.name}
                      </td>
                      <td className="py-1.5 px-2 text-xs text-gray-600 dark:text-slate-400">{c.version || '--'}</td>
                      <td className="py-1.5 px-2 text-xs text-gray-500 dark:text-slate-500">{c.group || '--'}</td>
                      <td className="py-1.5 px-2"><ComponentTypeBadge value={c.type} /></td>
                      <td className="py-1.5 px-2"><PkgTypeBadge value={c.pkgType} /></td>
                      <td className="py-1.5 px-2 text-xs text-gray-400 dark:text-slate-500 font-mono max-w-[200px] truncate" title={c.purl}>
                        {c.purl || '--'}
                      </td>
                      <td className="py-1.5 px-2 text-xs text-gray-400 dark:text-slate-500 font-mono max-w-[180px] truncate" title={c.filePath}>
                        {c.filePath || '--'}
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr key={key + '-detail'} className="bg-gray-50 dark:bg-slate-900/50">
                        <td colSpan={8} className="py-3 px-6">
                          <div className="space-y-3 text-xs">
                            {/* Full PURL */}
                            {c.purl && (
                              <div>
                                <span className="font-semibold text-gray-600 dark:text-slate-400">PURL: </span>
                                <span className="font-mono text-gray-700 dark:text-slate-300 break-all">{c.purl}</span>
                              </div>
                            )}

                            {/* Hashes */}
                            {c.hashes?.length > 0 && (
                              <div>
                                <span className="font-semibold text-gray-600 dark:text-slate-400">Hashes:</span>
                                <div className="mt-1 space-y-0.5">
                                  {c.hashes.map((h, i) => (
                                    <div key={i} className="font-mono text-gray-500 dark:text-slate-500">
                                      <span className="text-gray-600 dark:text-slate-400">{h.alg}:</span> {h.content}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Licenses */}
                            {c.licenses?.length > 0 && (
                              <div>
                                <span className="font-semibold text-gray-600 dark:text-slate-400">Licenses: </span>
                                {c.licenses.map((l, i) => (
                                  <span key={i} className="inline-block bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300 px-1.5 py-0.5 rounded text-[10px] mr-1">
                                    {l.id || l.name || l.expression || 'Unknown'}
                                  </span>
                                ))}
                              </div>
                            )}

                            {/* Properties */}
                            {c.properties?.length > 0 && (
                              <div>
                                <span className="font-semibold text-gray-600 dark:text-slate-400">Properties:</span>
                                <div className="mt-1 grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-0.5">
                                  {c.properties.map((p, i) => (
                                    <div key={i} className="font-mono text-gray-500 dark:text-slate-500">
                                      <span className="text-gray-600 dark:text-slate-400">{p.name}:</span> {p.value}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Source info */}
                            {(c.srcName || c.srcVersion) && (
                              <div>
                                <span className="font-semibold text-gray-600 dark:text-slate-400">Source: </span>
                                <span className="text-gray-700 dark:text-slate-300">{c.srcName} {c.srcVersion}</span>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
        <Pagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />
      </div>
    </div>
  );
}

function ComponentsContent() {
  const { filter: f } = useFilter();
  return (
    <ReportsProvider filter={{
      projectName: f.projectName || undefined,
      limit:       Number(f.limit) || 50,
    }}>
      <Components />
    </ReportsProvider>
  );
}

export default function ComponentsPage() {
  return <Suspense fallback={<p className="text-gray-500 text-sm p-4">Loading...</p>}><ComponentsContent /></Suspense>;
}
