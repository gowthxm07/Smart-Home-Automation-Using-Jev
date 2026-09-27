import fs from "fs";
import path from "path";
import {
  BaselineAnalysisManifest,
  ProviderSummaryRecord,
  ScenarioAnalysisRecord,
  CategoryAnalysisRecord,
  ProviderLatencyAnalysis,
  ProviderReliabilityAnalysis,
} from "./types";
import { evaluationScenarios } from "../dataset/scenarios";

export const FROZEN_DATASET_HASH =
  "66de3242d1ba6583dc385a2999f8f8ba556a1f52cf5862cc7f223c9cdbfc0329";
export const EXPECTED_SCENARIO_COUNT = 36;

export interface EnrichedScenarioAnalysisRecord extends ScenarioAnalysisRecord {
  name: string;
  description: string;
  intent: string;
}

export interface DashboardAnalysisData {
  manifest: BaselineAnalysisManifest;
  providerSummaries: Record<string, ProviderSummaryRecord>;
  scenarioAnalysis: EnrichedScenarioAnalysisRecord[];
  categoryAnalysis: CategoryAnalysisRecord[];
  latencyAnalysis: Record<string, ProviderLatencyAnalysis>;
  reliabilityAnalysis: Record<string, ProviderReliabilityAnalysis>;
  providerIds: string[];
}

/**
 * Loads, verifies, and joins the six frozen baseline analysis artifacts.
 *
 * Strict read-only loader:
 * - Reads only the 6 predefined filenames
 * - Validates cryptographic dataset SHA-256
 * - Validates scenario count = 36
 * - Sanitizes absolute file paths from source experiments
 * - Joins ground-truth scenario metadata (name, description, intent)
 * - Returns a typed, immutable data model
 */
export function loadDashboardAnalysisData(
  customAnalysisDir?: string
): DashboardAnalysisData {
  const analysisDir = customAnalysisDir
    ? path.resolve(customAnalysisDir)
    : path.join(process.cwd(), "artifacts", "analysis");

  // Strictly fixed file names — no arbitrary filenames allowed
  const manifestPath = path.join(analysisDir, "baseline-analysis-manifest.json");
  const providerSummaryPath = path.join(analysisDir, "provider-summary.json");
  const scenarioAnalysisPath = path.join(analysisDir, "scenario-analysis.json");
  const categoryAnalysisPath = path.join(analysisDir, "category-analysis.json");
  const latencyAnalysisPath = path.join(analysisDir, "latency-analysis.json");
  const reliabilityAnalysisPath = path.join(
    analysisDir,
    "reliability-analysis.json"
  );

  const requiredFiles = [
    { name: "baseline-analysis-manifest.json", path: manifestPath },
    { name: "provider-summary.json", path: providerSummaryPath },
    { name: "scenario-analysis.json", path: scenarioAnalysisPath },
    { name: "category-analysis.json", path: categoryAnalysisPath },
    { name: "latency-analysis.json", path: latencyAnalysisPath },
    { name: "reliability-analysis.json", path: reliabilityAnalysisPath },
  ];

  for (const file of requiredFiles) {
    if (!fs.existsSync(file.path)) {
      throw new Error(
        `Research analysis artifacts could not be loaded: missing required file "${file.name}".`
      );
    }
  }

  // 1. Read & parse manifest
  let rawManifest: unknown;
  try {
    rawManifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
  } catch {
    throw new Error(
      'Research analysis artifacts could not be loaded: malformed "baseline-analysis-manifest.json".'
    );
  }

  const manifest = rawManifest as BaselineAnalysisManifest;

  if (!manifest || typeof manifest !== "object") {
    throw new Error(
      'Research analysis artifacts could not be loaded: invalid manifest structure.'
    );
  }

  // Verify dataset hash
  if (manifest.datasetHash !== FROZEN_DATASET_HASH) {
    throw new Error(
      `Research analysis integrity error: dataset hash mismatch. Expected ${FROZEN_DATASET_HASH}, found ${manifest.datasetHash}.`
    );
  }

  // Verify scenario count
  if (manifest.datasetScenarioCount !== EXPECTED_SCENARIO_COUNT) {
    throw new Error(
      `Research analysis integrity error: scenario count mismatch. Expected ${EXPECTED_SCENARIO_COUNT}, found ${manifest.datasetScenarioCount}.`
    );
  }

  // Sanitize source experiment paths (strip absolute local machine paths)
  const sanitizedSourceExperiments = (manifest.sourceExperiments || []).map(
    (exp) => ({
      ...exp,
      directory: `artifacts/benchmarks/${exp.experimentId}`,
    })
  );

  const sanitizedManifest: BaselineAnalysisManifest = {
    ...manifest,
    sourceExperiments: sanitizedSourceExperiments,
  };

  // 2. Read & parse provider summaries
  let providerSummaries: Record<string, ProviderSummaryRecord>;
  try {
    providerSummaries = JSON.parse(
      fs.readFileSync(providerSummaryPath, "utf-8")
    );
  } catch {
    throw new Error(
      'Research analysis artifacts could not be loaded: malformed "provider-summary.json".'
    );
  }

  // 3. Read & parse scenario analysis
  let scenarioAnalysisRaw: ScenarioAnalysisRecord[];
  try {
    scenarioAnalysisRaw = JSON.parse(
      fs.readFileSync(scenarioAnalysisPath, "utf-8")
    );
  } catch {
    throw new Error(
      'Research analysis artifacts could not be loaded: malformed "scenario-analysis.json".'
    );
  }

  if (
    !Array.isArray(scenarioAnalysisRaw) ||
    scenarioAnalysisRaw.length !== EXPECTED_SCENARIO_COUNT
  ) {
    throw new Error(
      `Research analysis integrity error: scenario analysis count mismatch. Expected ${EXPECTED_SCENARIO_COUNT}, found ${
        Array.isArray(scenarioAnalysisRaw) ? scenarioAnalysisRaw.length : 0
      }.`
    );
  }

  // 4. Read & parse category analysis
  let categoryAnalysis: CategoryAnalysisRecord[];
  try {
    categoryAnalysis = JSON.parse(
      fs.readFileSync(categoryAnalysisPath, "utf-8")
    );
  } catch {
    throw new Error(
      'Research analysis artifacts could not be loaded: malformed "category-analysis.json".'
    );
  }

  // 5. Read & parse latency analysis
  let latencyAnalysis: Record<string, ProviderLatencyAnalysis>;
  try {
    latencyAnalysis = JSON.parse(fs.readFileSync(latencyAnalysisPath, "utf-8"));
  } catch {
    throw new Error(
      'Research analysis artifacts could not be loaded: malformed "latency-analysis.json".'
    );
  }

  // 6. Read & parse reliability analysis
  let reliabilityAnalysis: Record<string, ProviderReliabilityAnalysis>;
  try {
    reliabilityAnalysis = JSON.parse(
      fs.readFileSync(reliabilityAnalysisPath, "utf-8")
    );
  } catch {
    throw new Error(
      'Research analysis artifacts could not be loaded: malformed "reliability-analysis.json".'
    );
  }

  // Join scenario metadata from evaluationScenarios
  const scenarioMetaMap = new Map<
    string,
    { name: string; description: string; intent: string }
  >();
  for (const s of evaluationScenarios) {
    scenarioMetaMap.set(s.id, {
      name: s.name,
      description: s.description,
      intent: s.intent,
    });
  }

  const enrichedScenarioAnalysis: EnrichedScenarioAnalysisRecord[] =
    scenarioAnalysisRaw.map((record) => {
      const meta = scenarioMetaMap.get(record.scenarioId);
      return {
        ...record,
        name: meta?.name || record.scenarioId,
        description: meta?.description || "",
        intent: meta?.intent || "",
      };
    });

  const providerIds = Object.keys(providerSummaries);

  return {
    manifest: sanitizedManifest,
    providerSummaries,
    scenarioAnalysis: enrichedScenarioAnalysis,
    categoryAnalysis,
    latencyAnalysis,
    reliabilityAnalysis,
    providerIds,
  };
}
