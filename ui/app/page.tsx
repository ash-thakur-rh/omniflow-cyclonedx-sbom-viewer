'use client';

import { useState, Suspense } from 'react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { ReportsProvider, useReports } from '@/components/ReportsProvider';
import { Pagination, paginate } from '@/components/Pagination';
import { ComponentTypeBadge, getComponentTypeColor, getPkgTypeColor } from '@/components/TypeBadge';
import { useFilter, StatCard, useRechartsTheme, cls } from '@agnistack/omniflow-ui';

function fmtTime(iso: string) {
  if (!iso) return '--';
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function Overview() {
  const { reports, isLoading } = useReports();
  const [reportsPage, setReportsPage] = useState(0);
  const { tooltipStyle, gridStroke, axisTick, pieLabelStroke } = useRechartsTheme();

  if (isLoading) return <p className="text-gray-500 dark:text-slate-500 text-sm">Loading SBOM reports...</p>;

  if (!reports.length) return (
    <div className="text-center py-20">
      <p className="text-gray-500 dark:text-slate-400 mb-2">No SBOM reports found for the selected filters.</p>
      <p className="text-gray-400 dark:text-slate-600 text-sm">
        Upload a CycloneDX BOM JSON file via{' '}
        <code className="text-gray-500 dark:text-slate-500">POST /api/v1/ingest/cyclonedx-sbom</code>.
      </p>
    </div>
  );

  // Aggregate across all reports
  const totalReports = reports.length;
  const latestReport = reports[0];
  const latestFields = latestReport?.fields;

  // Sum totals from latest report for KPIs
  const totalComponents = latestFields?.totalComponents ?? 0;
  const totalDeps = latestFields?.totalDependencies ?? 0;
  const libCount = latestFields?.componentTypeCounts?.['library'] ?? 0;
  const osCount = latestFields?.componentTypeCounts?.['operating-system'] ?? 0;
  const toolNames = (latestFields?.tools ?? []).map(t => `${t.name} ${t.version}`).join(', ') || '--';

  // Component type pie data from latest report
  const typeCounts = latestFields?.componentTypeCounts ?? {};
  const typePieData = Object.entries(typeCounts).map(([name, value]) => ({
    name, value, color: getComponentTypeColor(name),
  })).filter(d => d.value > 0);

  // Package ecosystem bar data from latest report
  const pkgCounts = latestFields?.pkgTypeCounts ?? {};
  const pkgBarData = Object.entries(pkgCounts)
    .map(([name, count]) => ({ name, count, fill: getPkgTypeColor(name) }))
    .sort((a, b) => b.count - a.count);

  // Components over time (per report, reversed for chronological)
  const timelineData = [...reports].reverse().map(r => ({
    t: fmtTime(r.timestamp),
    components: r.fields?.totalComponents ?? 0,
  }));

  const cardCls = cls.card + ' p-4';
  const headingCls = cls.heading + ' mb-3';

  return (
    <div className="max-w-6xl space-y-6">

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard label="Total Components" value={totalComponents} />
        <StatCard label="Libraries" value={libCount} sub={`${totalComponents > 0 ? ((libCount / totalComponents) * 100).toFixed(0) : 0}% of total`} />
        <StatCard label="OS Packages" value={osCount} />
        <StatCard label="Dependencies" value={totalDeps} />
        <StatCard label="Tool" value={toolNames.length > 20 ? toolNames.slice(0, 20) + '...' : toolNames} sub="scan tool" />
      </div>

      {/* Charts row 1: Component Types + Package Ecosystem */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className={cardCls}>
          <p className={headingCls}>Component Types</p>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={typePieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label={d => `${d.name} (${d.value})`}
                labelLine={{ stroke: pieLabelStroke }}
              >
                {typePieData.map((e, i) => <Cell key={i} fill={e.color} />)}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className={cardCls}>
          <p className={headingCls}>Package Ecosystem</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={pkgBarData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
              <XAxis type="number" tick={axisTick} />
              <YAxis type="category" dataKey="name" tick={axisTick} width={80} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="count" name="Components">
                {pkgBarData.map((d, i) => <Cell key={i} fill={d.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Chart row 2: Components over time */}
      {timelineData.length > 1 && (
        <div className={cardCls}>
          <p className={headingCls}>Components Over Time</p>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={timelineData}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
              <XAxis dataKey="t" tick={false} />
              <YAxis tick={axisTick} />
              <Tooltip contentStyle={tooltipStyle} />
              <Line type="monotone" dataKey="components" stroke="#0ea5e9" strokeWidth={2} dot={false} name="Components" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Recent Reports table */}
      {(() => {
        const { paged, total: rTotal, totalPages } = paginate(reports, reportsPage);
        return (
          <div className={cardCls}>
            <p className={headingCls}>Recent Reports ({reports.length})</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className={cls.table.header}>
                    <th className="text-left py-2 px-2">Subject</th>
                    <th className="text-left py-2 px-2">Type</th>
                    <th className="text-left py-2 px-2">Spec Version</th>
                    <th className="text-right py-2 px-2">Components</th>
                    <th className="text-right py-2 px-2">Dependencies</th>
                    <th className="text-left py-2 px-2">Tool</th>
                    <th className="text-left py-2 px-2">Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map(r => {
                    const f = r.fields;
                    const subject = f?.subjectComponent;
                    const toolName = f?.tools?.[0] ? `${f.tools[0].name} ${f.tools[0].version}` : '--';
                    return (
                      <tr key={r.id} className={cls.table.row}>
                        <td className="py-2 px-2 text-gray-700 dark:text-slate-300 font-mono text-xs">
                          {subject?.name || f?.projectName || '--'}
                        </td>
                        <td className="py-2 px-2">
                          {subject?.type ? <ComponentTypeBadge value={subject.type} /> : '--'}
                        </td>
                        <td className="py-2 px-2 text-gray-500 dark:text-slate-400">{f?.specVersion || '--'}</td>
                        <td className="py-2 px-2 text-right">{f?.totalComponents ?? '--'}</td>
                        <td className="py-2 px-2 text-right">{f?.totalDependencies ?? '--'}</td>
                        <td className="py-2 px-2 text-gray-500 dark:text-slate-400 text-xs">{toolName}</td>
                        <td className="py-2 px-2 text-gray-400 dark:text-slate-500 text-xs">{fmtTime(r.timestamp)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Pagination page={reportsPage} totalPages={totalPages} total={rTotal} onPageChange={setReportsPage} />
          </div>
        );
      })()}
    </div>
  );
}

function OverviewContent() {
  const { filter: f } = useFilter();
  return (
    <ReportsProvider filter={{
      projectName: f.projectName || undefined,
      limit:       Number(f.limit) || 50,
    }}>
      <Overview />
    </ReportsProvider>
  );
}

export default function OverviewPage() {
  return <Suspense fallback={<p className="text-gray-500 text-sm p-4">Loading...</p>}><OverviewContent /></Suspense>;
}