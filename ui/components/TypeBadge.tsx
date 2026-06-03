import { Badge, BadgeTone } from '@agnistack/omniflow-ui';

// ── Component Type Badges ─────────────────────────────────────────────────
const COMPONENT_TYPE_TONE: Record<string, BadgeTone> = {
  'operating-system': 'indigo',
  'library':          'info',
  'application':      'success',
  'framework':        'purple',
  'container':        'orange',
  'device':           'neutral',
  'firmware':         'pink',
  'file':             'neutral',
  'data':             'neutral',
};

export function ComponentTypeBadge({ value }: { value: string }) {
  return <Badge tone={COMPONENT_TYPE_TONE[value] ?? 'neutral'}>{value}</Badge>;
}

// ── Package Type Badges ───────────────────────────────────────────────────
const PKG_TYPE_TONE: Record<string, BadgeTone> = {
  'jar':     'orange',
  'redhat':  'danger',
  'rpm':     'danger',
  'npm':     'success',
  'pip':     'info',
  'pypi':    'info',
  'go':      'indigo',
  'gem':     'pink',
  'nuget':   'purple',
  'cargo':   'warn',
};

export function PkgTypeBadge({ value }: { value: string }) {
  if (!value) return <span className="text-gray-400 dark:text-slate-600 text-xs">--</span>;
  return <Badge tone={PKG_TYPE_TONE[value] ?? 'neutral'}>{value}</Badge>;
}

// ── Component Type Colors for Charts ──────────────────────────────────────
export const COMPONENT_TYPE_COLORS: Record<string, string> = {
  'operating-system': '#6366f1',
  'library':          '#0ea5e9',
  'application':      '#16a34a',
  'framework':        '#8b5cf6',
  'container':        '#ea580c',
  'device':           '#475569',
  'firmware':         '#db2777',
  'file':             '#64748b',
  'data':             '#94a3b8',
};

// ── Package Type Colors for Charts ────────────────────────────────────────
export const PKG_TYPE_COLORS: Record<string, string> = {
  'jar':    '#ea580c',
  'redhat': '#dc2626',
  'rpm':    '#dc2626',
  'npm':    '#16a34a',
  'pip':    '#0ea5e9',
  'pypi':   '#0ea5e9',
  'go':     '#6366f1',
  'gem':    '#db2777',
  'nuget':  '#8b5cf6',
  'cargo':  '#ca8a04',
};

export function getComponentTypeColor(type: string): string {
  return COMPONENT_TYPE_COLORS[type] ?? '#475569';
}

export function getPkgTypeColor(type: string): string {
  return PKG_TYPE_COLORS[type] ?? '#475569';
}