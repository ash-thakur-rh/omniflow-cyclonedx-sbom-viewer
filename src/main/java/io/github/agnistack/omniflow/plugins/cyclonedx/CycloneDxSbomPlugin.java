/*
 * Copyright 2026 Ashish Thakur ashish.thakur1110@gmail.com
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
package io.github.agnistack.omniflow.plugins.cyclonedx;

import io.github.agnistack.omniflow.pluginapi.*;
import java.util.List;

/**
 * OmniFlow Plugin: CycloneDX SBOM Viewer
 *
 * <p>Ingests CycloneDX BOM JSON files (spec version 1.4 - 1.6) and stores them as {@code
 * BuildReport} records. The record includes:
 *
 * <ul>
 *   <li>BOM metadata: format, specVersion, serialNumber, timestamp
 *   <li>Subject component: name, type, version from metadata.component
 *   <li>Tool information from metadata.tools.components
 *   <li>All components with bomRef, type, name, version, group, purl, hashes, licenses, properties
 *   <li>All dependency relationships with ref and dependsOn lists
 *   <li>Computed aggregates: totalComponents, componentTypeCounts, pkgTypeCounts, totalDependencies
 * </ul>
 *
 * Build:
 *
 * <pre>
 *   ./gradlew :cyclonedx-sbom:jar
 * </pre>
 *
 * Upload:
 *
 * <pre>
 *   curl -X POST http://localhost:8080/api/plugins/upload \
 *        -F "file=@cyclonedx-sbom/build/libs/cyclonedx-sbom-0.1.0.jar"
 * </pre>
 *
 * Ingest endpoint:
 *
 * <pre>
 *   POST http://localhost:8080/api/v1/ingest/cyclonedx-sbom
 *   Content-Type: application/json
 *   Body: &lt;CycloneDX BOM JSON&gt;
 * </pre>
 */
public class CycloneDxSbomPlugin implements OmniflowPlugin {

  @Override
  public PluginMetadata metadata() {
    return new PluginMetadata(
        "cyclonedx-sbom",
        "CycloneDX SBOM Viewer",
        PluginMetadata.resolveVersion(CycloneDxSbomPlugin.class, "0.1.0"),
        "Ingests CycloneDX BOM JSON files: component inventory, dependency tree, package ecosystem analysis. Includes an embedded SBOM analytics micro UI.",
        "OmniFlow Security & Compliance");
  }

  @Override
  public List<PluginIngestor<?>> ingestors() {
    return List.of(new CycloneDxSbomIngestor());
  }

  @Override
  public boolean hasUi() {
    return true;
  }

  @Override
  public void onLoad(PluginContext ctx) {
    ctx.registerSchemaExtension(
        "BuildReport", "bomFormat", "String", "BOM format identifier (e.g. CycloneDX)");
    ctx.registerSchemaExtension(
        "BuildReport", "specVersion", "String", "CycloneDX specification version (e.g. 1.6)");
    ctx.registerSchemaExtension(
        "BuildReport", "serialNumber", "String", "Unique serial number of the BOM");
    ctx.registerSchemaExtension(
        "BuildReport",
        "components",
        "List",
        "All BOM components with bomRef, type, name, version, group, purl, hashes, licenses, properties");
    ctx.registerSchemaExtension(
        "BuildReport",
        "dependencies",
        "List",
        "Dependency relationships: ref component and its dependsOn list");
    ctx.registerSchemaExtension(
        "BuildReport",
        "componentTypeCounts",
        "Map",
        "Count of components by type (library, operating-system, application, etc.)");
    ctx.registerSchemaExtension(
        "BuildReport",
        "pkgTypeCounts",
        "Map",
        "Count of components by package type (jar, redhat, npm, pip, go, etc.)");
    ctx.registerSchemaExtension(
        "BuildReport",
        "totalComponents",
        "Integer",
        "Total number of components in the BOM");
    ctx.registerSchemaExtension(
        "BuildReport",
        "totalDependencies",
        "Integer",
        "Total number of dependency entries in the BOM");
    ctx.registerSchemaExtension(
        "BuildReport", "tools", "List", "Tools used to generate the BOM");
    ctx.registerSchemaExtension(
        "BuildReport",
        "subjectComponent",
        "Map",
        "The subject component from BOM metadata (name, type, version)");
    ctx.log("CycloneDX SBOM Viewer plugin loaded -> ingestor type: cyclonedx-sbom");
  }
}
