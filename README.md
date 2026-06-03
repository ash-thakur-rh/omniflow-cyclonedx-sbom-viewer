# CycloneDX SBOM Viewer

OmniFlow plugin that ingests CycloneDX BOM JSON files and provides a component inventory, dependency tree, and SBOM comparison UI.

<!-- TODO: add screenshot -->

## Features

- **Overview dashboard** with KPI cards (total components, libraries, OS packages, dependencies), component type pie chart, package ecosystem bar chart, and components-over-time trend line
- **Component inventory** with search, filtering by component type and package type, expandable rows showing hashes, licenses, PURLs, and properties
- **Dependency tree** with collapsible nodes, expand/collapse all, search, and a top-dependencies ranking table
- **SBOM comparison** to diff two reports side-by-side: added components, removed components, version changes, and total delta

## Quick Start

```bash
# 1. Build the plugin JAR (includes the embedded Next.js UI)
./gradlew jar

# 2. Upload to OmniFlow
curl -X POST http://localhost:8080/api/plugins/upload \
     -F "file=@build/libs/cyclonedx-sbom-0.1.0.jar"

# 3. Generate a CycloneDX SBOM and ingest it
trivy image --format cyclonedx -o sbom.json your-image:latest
curl -X POST http://localhost:8080/api/v1/ingest/cyclonedx-sbom \
     -H "Content-Type: application/json" \
     -d @sbom.json
```

## Build

```bash
./gradlew jar
```

This produces a fat JAR at `build/libs/cyclonedx-sbom-<version>.jar` containing the Java ingestor, Jackson runtime dependency, and the statically-exported Next.js UI assets.

To skip the UI build (useful during backend-only development):

```bash
./gradlew jar -PskipUi=true
```

Requires Java 21.

## Install

Upload the JAR to a running OmniFlow instance:

```bash
curl -X POST http://localhost:8080/api/plugins/upload \
     -F "file=@build/libs/cyclonedx-sbom-0.1.0.jar"
```

The plugin registers the `cyclonedx-sbom` ingestor type and serves its UI at `/api/plugins/cyclonedx-sbom/ui`.

## Ingest

POST a CycloneDX BOM JSON file to the ingest endpoint:

```bash
curl -X POST http://localhost:8080/api/v1/ingest/cyclonedx-sbom \
     -H "Content-Type: application/json" \
     -d @sbom.json
```

### Generating an SBOM

With [Trivy](https://github.com/aquasecurity/trivy):

```bash
trivy image --format cyclonedx -o sbom.json <image>
```

With [Syft](https://github.com/anchore/syft):

```bash
syft <image> -o cyclonedx-json > sbom.json
```

## Supported Formats

- **CycloneDX BOM** specification versions **1.4**, **1.5**, and **1.6**
- **JSON** format only (XML is not supported)

The ingestor extracts BOM metadata, all components (with bomRef, type, name, version, group, PURL, hashes, licenses, properties), dependency relationships, and computes aggregate counts by component type and package ecosystem.

## UI Pages

| Page | Path | Description |
|------|------|-------------|
| **Overview** | `/` | KPI cards, component type distribution (pie chart), package ecosystem breakdown (bar chart), components-over-time trend, and a recent reports table. |
| **Components** | `/components` | Searchable, filterable component inventory. Click a row to expand and see hashes, licenses, PURLs, source info, and all properties. |
| **Dependencies** | `/dependencies` | Interactive dependency tree with expand/collapse controls, search, stats (total relationships, avg deps/component, max), and a top-dependencies table. |
| **Compare** | `/compare` | Select two SBOM reports to diff. Shows added components, removed components, version changes, and a total component delta. |

## Development

To run the UI locally for development:

```bash
cd ui
npm install
npm run dev
```

The dev server starts on port **3003**. Set `NEXT_PUBLIC_API_URL` to point at your OmniFlow backend:

```bash
NEXT_PUBLIC_API_URL=http://localhost:8080 npm run dev
```

When not set, the UI defaults to the same origin (the production behavior when served from within OmniFlow).

## Release

Push a tag matching `v*` to trigger the GitHub Actions release workflow:

```bash
git tag v0.2.0
git push origin v0.2.0
```

The workflow builds the fat JAR with `./gradlew jar -PreleaseVersion=<version>` and creates a GitHub Release with the JAR attached and auto-generated release notes.

## License

[Apache License 2.0](https://www.apache.org/licenses/LICENSE-2.0)