'use client';

import { useState, useMemo, Suspense } from 'react';
import { ReportsProvider, useReports } from '@/components/ReportsProvider';
import { ComponentTypeBadge } from '@/components/TypeBadge';
import { useFilter, StatCard, cls } from '@agnistack/omniflow-ui';
import type { ComponentEntry, DependencyEntry } from '@/lib/api';

function DependencyNode({
  bomRef,
  componentMap,
  dependencyMap,
  depth,
  expandedNodes,
  toggleNode,
}: {
  bomRef: string;
  componentMap: Map<string, ComponentEntry>;
  dependencyMap: Map<string, string[]>;
  depth: number;
  expandedNodes: Set<string>;
  toggleNode: (ref: string) => void;
}) {
  const comp = componentMap.get(bomRef);
  const deps = dependencyMap.get(bomRef) ?? [];
  const isExpanded = expandedNodes.has(bomRef);
  const hasDeps = deps.length > 0;
  const maxDepth = 6;

  const displayName = comp
    ? `${comp.group ? comp.group + '/' : ''}${comp.name}`
    : bomRef.length > 60 ? bomRef.slice(0, 60) + '...' : bomRef;
  const version = comp?.version ?? '';

  return (
    <div className={depth > 0 ? 'ml-5 border-l border-gray-200 dark:border-slate-800 pl-3' : ''}>
      <div
        className={`flex items-center gap-2 py-1 ${hasDeps ? 'cursor-pointer' : ''} group`}
        onClick={() => hasDeps && toggleNode(bomRef)}
      >
        {hasDeps ? (
          <span className="text-gray-400 dark:text-slate-500 text-xs w-3 flex-shrink-0 select-none">
            {isExpanded ? '▼' : '▶'}
          </span>
        ) : (
          <span className="text-gray-300 dark:text-slate-700 text-xs w-3 flex-shrink-0">-</span>
        )}
        <span className="font-mono text-xs text-gray-700 dark:text-slate-300 group-hover:text-gray-900 dark:group-hover:text-slate-100 transition-colors">
          {displayName}
        </span>
        {version && (
          <span className="text-xs text-gray-400 dark:text-slate-500">@{version}</span>
        )}
        {comp && (
          <ComponentTypeBadge value={comp.type} />
        )}
        {hasDeps && (
          <span className="text-[10px] text-gray-400 dark:text-slate-600">({deps.length})</span>
        )}
      </div>
      {isExpanded && depth < maxDepth && (
        <div>
          {deps.map(depRef => (
            <DependencyNode
              key={depRef}
              bomRef={depRef}
              componentMap={componentMap}
              dependencyMap={dependencyMap}
              depth={depth + 1}
              expandedNodes={expandedNodes}
              toggleNode={toggleNode}
            />
          ))}
        </div>
      )}
      {isExpanded && depth >= maxDepth && deps.length > 0 && (
        <div className="ml-5 py-1 text-xs text-gray-400 dark:text-slate-600 italic">
          ... {deps.length} more dependencies (max depth reached)
        </div>
      )}
    </div>
  );
}

function Dependencies() {
  const { reports, isLoading } = useReports();
  const [selectedReport, setSelectedReport] = useState<string>('');
  const [search, setSearch] = useState('');
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  if (isLoading) return <p className="text-gray-500 dark:text-slate-500 text-sm">Loading reports...</p>;
  if (!reports.length) return <p className="text-gray-500 dark:text-slate-500 text-sm">No SBOM reports found.</p>;

  const report = reports.find(r => r.id === selectedReport) ?? reports[0];
  const components: ComponentEntry[] = report?.fields?.components ?? [];
  const dependencies: DependencyEntry[] = report?.fields?.dependencies ?? [];

  // Build lookup maps
  const componentMap = useMemo(() => {
    const m = new Map<string, ComponentEntry>();
    components.forEach(c => { if (c.bomRef) m.set(c.bomRef, c); });
    return m;
  }, [components]);

  const dependencyMap = useMemo(() => {
    const m = new Map<string, string[]>();
    dependencies.forEach(d => { m.set(d.ref, d.dependsOn ?? []); });
    return m;
  }, [dependencies]);

  // Stats
  const totalRelationships = useMemo(() => {
    return dependencies.reduce((sum, d) => sum + (d.dependsOn?.length ?? 0), 0);
  }, [dependencies]);

  const depsPerComponent = useMemo(() => {
    const counts = dependencies.map(d => d.dependsOn?.length ?? 0);
    if (!counts.length) return 0;
    return counts.reduce((a, b) => a + b, 0) / counts.length;
  }, [dependencies]);

  const maxDeps = useMemo(() => {
    return dependencies.reduce((max, d) => Math.max(max, d.dependsOn?.length ?? 0), 0);
  }, [dependencies]);

  // Filter deps by search
  const filteredDeps = useMemo(() => {
    if (!search) return dependencies;
    const q = search.toLowerCase();
    return dependencies.filter(d => {
      const refComp = componentMap.get(d.ref);
      const refName = refComp ? `${refComp.group ? refComp.group + '/' : ''}${refComp.name}` : d.ref;
      if (refName.toLowerCase().includes(q)) return true;
      return (d.dependsOn ?? []).some(depRef => {
        const c = componentMap.get(depRef);
        const name = c ? `${c.group ? c.group + '/' : ''}${c.name}` : depRef;
        return name.toLowerCase().includes(q);
      });
    });
  }, [dependencies, componentMap, search]);

  const toggleNode = (ref: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(ref)) next.delete(ref);
      else next.add(ref);
      return next;
    });
  };

  const expandAll = () => {
    const all = new Set<string>();
    filteredDeps.forEach(d => {
      all.add(d.ref);
      (d.dependsOn ?? []).forEach(dep => all.add(dep));
    });
    setExpandedNodes(all);
  };

  const collapseAll = () => setExpandedNodes(new Set());

  const cardCls = cls.card + ' p-4';
  const headingCls = cls.heading + ' mb-3';

  return (
    <div className="max-w-6xl space-y-4">
      {/* Report selector */}
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-xs text-gray-500 dark:text-slate-500">Report:</label>
        <select
          value={report?.id ?? ''}
          onChange={e => { setSelectedReport(e.target.value); setExpandedNodes(new Set()); }}
          className={cls.select}
        >
          {reports.map(r => (
            <option key={r.id} value={r.id}>
              {r.fields?.subjectComponent?.name || r.fields?.projectName || 'SBOM'} — {new Date(r.timestamp).toLocaleDateString()} ({r.fields?.totalDependencies} deps)
            </option>
          ))}
        </select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Dependency Entries" value={dependencies.length} />
        <StatCard label="Total Relationships" value={totalRelationships} />
        <StatCard label="Avg Deps/Component" value={depsPerComponent.toFixed(1)} />
        <StatCard label="Max Dependencies" value={maxDeps} />
      </div>

      {/* Search + Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="Search components..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="px-3 py-1.5 text-sm border border-gray-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-300 w-64 focus:outline-none focus:ring-1 focus:ring-sky-400"
        />
        <button
          onClick={expandAll}
          className="px-3 py-1.5 text-xs border border-gray-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
        >
          Expand All
        </button>
        <button
          onClick={collapseAll}
          className="px-3 py-1.5 text-xs border border-gray-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
        >
          Collapse All
        </button>
        <span className="text-xs text-gray-400 dark:text-slate-600">
          {filteredDeps.length} of {dependencies.length} entries
        </span>
      </div>

      {/* Dependency Tree */}
      <div className={cardCls}>
        <p className={headingCls}>Dependency Tree</p>
        <div className="max-h-[600px] overflow-y-auto">
          {filteredDeps.length === 0 && (
            <p className="text-gray-400 dark:text-slate-600 text-sm py-4 text-center">
              No dependencies match your search.
            </p>
          )}
          {filteredDeps.map(d => (
            <DependencyNode
              key={d.ref}
              bomRef={d.ref}
              componentMap={componentMap}
              dependencyMap={dependencyMap}
              depth={0}
              expandedNodes={expandedNodes}
              toggleNode={toggleNode}
            />
          ))}
        </div>
      </div>

      {/* Top dependencies table */}
      {(() => {
        const topDeps = [...dependencies]
          .filter(d => (d.dependsOn?.length ?? 0) > 0)
          .sort((a, b) => (b.dependsOn?.length ?? 0) - (a.dependsOn?.length ?? 0))
          .slice(0, 10);

        if (!topDeps.length) return null;

        return (
          <div className={cardCls}>
            <p className={headingCls}>Top Dependencies (Most dependsOn)</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className={cls.table.header}>
                    <th className="text-left py-2 px-2">Component</th>
                    <th className="text-left py-2 px-2">Type</th>
                    <th className="text-right py-2 px-2">Dependencies</th>
                  </tr>
                </thead>
                <tbody>
                  {topDeps.map(d => {
                    const c = componentMap.get(d.ref);
                    return (
                      <tr key={d.ref} className={cls.table.row}>
                        <td className="py-1.5 px-2 font-mono text-xs text-gray-700 dark:text-slate-300">
                          {c ? `${c.group ? c.group + '/' : ''}${c.name}@${c.version}` : d.ref.slice(0, 60)}
                        </td>
                        <td className="py-1.5 px-2">
                          {c ? <ComponentTypeBadge value={c.type} /> : '--'}
                        </td>
                        <td className="py-1.5 px-2 text-right font-mono">{d.dependsOn?.length ?? 0}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

function DependenciesContent() {
  const { filter: f } = useFilter();
  return (
    <ReportsProvider filter={{
      projectName: f.projectName || undefined,
      limit:       Number(f.limit) || 50,
    }}>
      <Dependencies />
    </ReportsProvider>
  );
}

export default function DependenciesPage() {
  return <Suspense fallback={<p className="text-gray-500 text-sm p-4">Loading...</p>}><DependenciesContent /></Suspense>;
}
