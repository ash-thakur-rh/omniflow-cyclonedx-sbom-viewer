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

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.github.agnistack.omniflow.pluginapi.PluginIngestor;
import io.github.agnistack.omniflow.pluginapi.SimplePluginDataRecord;
import java.io.InputStream;
import java.util.*;

/**
 * Parses a CycloneDX BOM JSON payload (spec version 1.4 - 1.6) into a {@code BuildReport} record.
 *
 * <p>Expected JSON structure (CycloneDX BOM format):
 *
 * <pre>
 * {
 *   "$schema": "http://cyclonedx.org/schema/bom-1.6.schema.json",
 *   "bomFormat": "CycloneDX",
 *   "specVersion": "1.6",
 *   "serialNumber": "urn:uuid:...",
 *   "version": 1,
 *   "metadata": {
 *     "timestamp": "2026-05-28T09:10:22+00:00",
 *     "tools": { "components": [{ "type": "application", "name": "trivy", "version": "0.70.0" }] },
 *     "component": { "type": "container", "name": "quay.io/jkube/jkube-java-11:latest" }
 *   },
 *   "components": [
 *     {
 *       "bom-ref": "...",
 *       "type": "library",
 *       "group": "org.jolokia",
 *       "name": "jolokia-agent-jvm",
 *       "version": "2.1.2",
 *       "hashes": [{ "alg": "SHA-1", "content": "..." }],
 *       "purl": "pkg:maven/org.jolokia/jolokia-agent-jvm@2.1.2",
 *       "licenses": [{ "license": { "id": "Apache-2.0" } }],
 *       "properties": [
 *         { "name": "aquasecurity:trivy:PkgType", "value": "jar" },
 *         { "name": "aquasecurity:trivy:FilePath", "value": "usr/share/java/..." }
 *       ]
 *     }
 *   ],
 *   "dependencies": [
 *     { "ref": "...", "dependsOn": ["pkg:...@...", "pkg:...@..."] }
 *   ]
 * }
 * </pre>
 */
class CycloneDxSbomIngestor implements PluginIngestor<SimplePluginDataRecord> {

  private static final ObjectMapper JSON = new ObjectMapper();

  @Override
  public String getType() {
    return "cyclonedx-sbom";
  }

  @Override
  public SimplePluginDataRecord ingest(InputStream data) throws Exception {
    JsonNode root = JSON.readTree(data);

    // ── Top-level BOM fields ───────────────────────────────────────────────
    String bomFormat = text(root, "bomFormat", "CycloneDX");
    String specVersion = text(root, "specVersion", "");
    String serialNumber = text(root, "serialNumber", "");
    int bomVersion = root.path("version").asInt(1);

    // ── Metadata ───────────────────────────────────────────────────────────
    JsonNode metadata = root.path("metadata");
    String timestamp = text(metadata, "timestamp", "");

    // Subject component (what was scanned)
    Map<String, Object> subjectComponent = new LinkedHashMap<>();
    JsonNode metaComp = metadata.path("component");
    if (metaComp.isObject()) {
      subjectComponent.put("name", text(metaComp, "name", ""));
      subjectComponent.put("type", text(metaComp, "type", ""));
      subjectComponent.put("version", text(metaComp, "version", ""));
      if (metaComp.has("bom-ref")) {
        subjectComponent.put("bomRef", text(metaComp, "bom-ref", ""));
      }
    }

    // Tools
    List<Map<String, Object>> tools = new ArrayList<>();
    // CycloneDX 1.5+ uses metadata.tools.components array
    JsonNode toolsNode = metadata.path("tools");
    if (toolsNode.isObject() && toolsNode.has("components")) {
      for (JsonNode tc : toolsNode.path("components")) {
        Map<String, Object> tool = new LinkedHashMap<>();
        tool.put("type", text(tc, "type", ""));
        tool.put("name", text(tc, "name", ""));
        tool.put("version", text(tc, "version", ""));
        if (tc.has("vendor")) tool.put("vendor", text(tc, "vendor", ""));
        tools.add(tool);
      }
    }
    // CycloneDX 1.4 uses metadata.tools as array directly
    else if (toolsNode.isArray()) {
      for (JsonNode tc : toolsNode) {
        Map<String, Object> tool = new LinkedHashMap<>();
        tool.put("name", text(tc, "name", ""));
        tool.put("version", text(tc, "version", ""));
        if (tc.has("vendor")) tool.put("vendor", text(tc, "vendor", ""));
        tools.add(tool);
      }
    }

    // ── Components ─────────────────────────────────────────────────────────
    List<Map<String, Object>> components = new ArrayList<>();
    Map<String, Long> componentTypeCounts = new LinkedHashMap<>();
    Map<String, Long> pkgTypeCounts = new LinkedHashMap<>();

    JsonNode compsNode = root.path("components");
    if (compsNode.isArray()) {
      for (JsonNode c : compsNode) {
        Map<String, Object> comp = new LinkedHashMap<>();
        String bomRef = text(c, "bom-ref", "");
        String type = text(c, "type", "unknown");
        String name = text(c, "name", "");
        String version = text(c, "version", "");
        String group = text(c, "group", "");
        String purl = text(c, "purl", "");

        comp.put("bomRef", bomRef);
        comp.put("type", type);
        comp.put("name", name);
        comp.put("version", version);
        comp.put("group", group);
        comp.put("purl", purl);

        // Hashes
        List<Map<String, String>> hashes = new ArrayList<>();
        JsonNode hashesNode = c.path("hashes");
        if (hashesNode.isArray()) {
          for (JsonNode h : hashesNode) {
            Map<String, String> hash = new LinkedHashMap<>();
            hash.put("alg", text(h, "alg", ""));
            hash.put("content", text(h, "content", ""));
            hashes.add(hash);
          }
        }
        comp.put("hashes", hashes);

        // Licenses
        List<Map<String, Object>> licenses = new ArrayList<>();
        JsonNode licensesNode = c.path("licenses");
        if (licensesNode.isArray()) {
          for (JsonNode ln : licensesNode) {
            Map<String, Object> lic = new LinkedHashMap<>();
            JsonNode licNode = ln.path("license");
            if (licNode.isObject()) {
              lic.put("id", text(licNode, "id", ""));
              lic.put("name", text(licNode, "name", ""));
              if (licNode.has("url")) lic.put("url", text(licNode, "url", ""));
            } else if (ln.has("expression")) {
              lic.put("expression", text(ln, "expression", ""));
            }
            licenses.add(lic);
          }
        }
        comp.put("licenses", licenses);

        // Properties
        List<Map<String, String>> properties = new ArrayList<>();
        String pkgType = "";
        String filePath = "";
        String srcName = "";
        String srcVersion = "";
        JsonNode propsNode = c.path("properties");
        if (propsNode.isArray()) {
          for (JsonNode p : propsNode) {
            String pName = text(p, "name", "");
            String pValue = text(p, "value", "");
            Map<String, String> prop = new LinkedHashMap<>();
            prop.put("name", pName);
            prop.put("value", pValue);
            properties.add(prop);

            // Extract well-known Trivy properties
            if (pName.endsWith(":PkgType") || pName.endsWith(":Type")) {
              pkgType = pValue;
            } else if (pName.endsWith(":FilePath")) {
              filePath = pValue;
            } else if (pName.endsWith(":SrcName")) {
              srcName = pValue;
            } else if (pName.endsWith(":SrcVersion")) {
              srcVersion = pValue;
            }
          }
        }
        comp.put("properties", properties);
        comp.put("pkgType", pkgType);
        comp.put("filePath", filePath);
        comp.put("srcName", srcName);
        comp.put("srcVersion", srcVersion);

        components.add(comp);

        // Aggregate counts
        componentTypeCounts.merge(type, 1L, Long::sum);
        if (!pkgType.isEmpty()) {
          pkgTypeCounts.merge(pkgType, 1L, Long::sum);
        }
      }
    }

    // ── Dependencies ───────────────────────────────────────────────────────
    List<Map<String, Object>> dependencies = new ArrayList<>();
    JsonNode depsNode = root.path("dependencies");
    if (depsNode.isArray()) {
      for (JsonNode d : depsNode) {
        Map<String, Object> dep = new LinkedHashMap<>();
        dep.put("ref", text(d, "ref", ""));
        List<String> dependsOn = new ArrayList<>();
        JsonNode depOnNode = d.path("dependsOn");
        if (depOnNode.isArray()) {
          for (JsonNode don : depOnNode) {
            dependsOn.add(don.asText());
          }
        }
        dep.put("dependsOn", dependsOn);
        dependencies.add(dep);
      }
    }

    // ── Computed fields ────────────────────────────────────────────────────
    int totalComponents = components.size();
    int totalDependencies = dependencies.size();
    int componentCount = totalComponents; // alias for compatibility

    // Derive a project name from the subject component or serial number
    String projectName =
        !subjectComponent.isEmpty()
            ? (String) subjectComponent.getOrDefault("name", "sbom")
            : serialNumber.isEmpty() ? "sbom" : serialNumber;

    // ── Build the record ───────────────────────────────────────────────────
    Map<String, Object> fields = new LinkedHashMap<>();
    fields.put("bomFormat", bomFormat);
    fields.put("specVersion", specVersion);
    fields.put("serialNumber", serialNumber);
    fields.put("bomVersion", bomVersion);
    fields.put("timestamp", timestamp);
    fields.put("subjectComponent", subjectComponent);
    fields.put("tools", tools);
    fields.put("components", components);
    fields.put("dependencies", dependencies);
    fields.put("totalComponents", totalComponents);
    fields.put("totalDependencies", totalDependencies);
    fields.put("componentCount", componentCount);
    fields.put("componentTypeCounts", componentTypeCounts);
    fields.put("pkgTypeCounts", pkgTypeCounts);
    fields.put("projectName", projectName);
    fields.put("status", "SUCCESS");
    fields.put("healthy", true);

    return SimplePluginDataRecord.of("cyclonedx-sbom", fields);
  }

  private static String text(JsonNode node, String field, String fallback) {
    JsonNode v = node.path(field);
    return v.isMissingNode() || v.isNull() ? fallback : v.asText(fallback);
  }
}
