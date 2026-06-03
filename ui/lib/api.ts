// The OmniFlow backend URL. Defaults to same origin in production (assets
// are served by the OmniFlow host at /api/plugins/cyclonedx-sbom/ui).
const BASE = process.env.NEXT_PUBLIC_API_URL ?? '';

async function get<T>(path: string): Promise<T> {
  const res = await fetch(BASE + path);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}

// -- Types ------------------------------------------------------------------

export interface HashEntry {
  alg:     string;
  content: string;
}

export interface LicenseEntry {
  id?:         string;
  name?:       string;
  url?:        string;
  expression?: string;
}

export interface PropertyEntry {
  name:  string;
  value: string;
}

export interface ComponentEntry {
  bomRef:     string;
  type:       string;
  name:       string;
  version:    string;
  group:      string;
  purl:       string;
  hashes:     HashEntry[];
  licenses:   LicenseEntry[];
  properties: PropertyEntry[];
  pkgType:    string;
  filePath:   string;
  srcName:    string;
  srcVersion: string;
}

export interface DependencyEntry {
  ref:       string;
  dependsOn: string[];
}

export interface ToolEntry {
  type?:    string;
  name:     string;
  version:  string;
  vendor?:  string;
}

export interface SubjectComponent {
  name:     string;
  type:     string;
  version:  string;
  bomRef?:  string;
}

export interface SbomFields {
  bomFormat:           string;
  specVersion:         string;
  serialNumber:        string;
  bomVersion:          number;
  timestamp:           string;
  subjectComponent:    SubjectComponent;
  tools:               ToolEntry[];
  components:          ComponentEntry[];
  dependencies:        DependencyEntry[];
  totalComponents:     number;
  totalDependencies:   number;
  componentCount:      number;
  componentTypeCounts: Record<string, number>;
  pkgTypeCounts:       Record<string, number>;
  projectName:         string;
  status:              string;
  healthy:             boolean;
}

export interface SbomRecord {
  id:        string;
  type:      string;
  timestamp: string;
  projectName?: string;
  fields:    SbomFields;
}

// -- API calls --------------------------------------------------------------

export const fetchReports = (limit = 50) =>
  get<SbomRecord[]>(`/api/v1/analytics/builds?type=cyclonedx-sbom&limit=${limit}`);