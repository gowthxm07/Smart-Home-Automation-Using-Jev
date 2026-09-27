import fs from "fs";
import path from "path";
import { NormalizedAnalysisRecord } from "./types";
import { ScenarioCategory } from "../dataset/scenarios";

export const FROZEN_DATASET_HASH =
  "66de3242d1ba6583dc385a2999f8f8ba556a1f52cf5862cc7f223c9cdbfc0329";
export const EXPECTED_SCENARIO_COUNT = 36;
export const EXPECTED_REPETITIONS = 5;
export const EXPECTED_TOTAL_EXECUTIONS = EXPECTED_SCENARIO_COUNT * EXPECTED_REPETITIONS; // 180

export interface LoadedBenchmarkDataset {
  manifest: {
    experimentId: string;
    mode: string;
    providerIds: string[];
    datasetScenarioCount: number;
    datasetHash: string;
    datasetVersion: string;
    repetitions: number;
    scheduledExecutions: number;
    status: string;
    gitCommitHash: string;
    startedAt: string;
    completedAt?: string;
  };
  records: NormalizedAnalysisRecord[];
}

/**
 * Loads and validates a frozen benchmark directory.
 * Strictly read-only: does not modify or write to the source directory.
 */
export function loadBenchmarkDataset(experimentDir: string): LoadedBenchmarkDataset {
  const manifestPath = path.join(experimentDir, "manifest.json");
  const runsPath = path.join(experimentDir, "runs.jsonl");

  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Benchmark manifest not found: ${manifestPath}`);
  }
  if (!fs.existsSync(runsPath)) {
    throw new Error(`Benchmark runs.jsonl not found: ${runsPath}`);
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));

  // 1. Validate manifest integrity
  if (manifest.datasetHash !== FROZEN_DATASET_HASH) {
    throw new Error(
      `Dataset hash mismatch in manifest for ${experimentDir}. Expected: ${FROZEN_DATASET_HASH}, Found: ${manifest.datasetHash}`
    );
  }
  if (manifest.datasetScenarioCount !== EXPECTED_SCENARIO_COUNT) {
    throw new Error(
      `Dataset scenario count mismatch. Expected: ${EXPECTED_SCENARIO_COUNT}, Found: ${manifest.datasetScenarioCount}`
    );
  }
  if (manifest.status !== "COMPLETED") {
    throw new Error(`Benchmark status is not COMPLETED: ${manifest.status}`);
  }

  // 2. Read and parse runs.jsonl
  const content = fs.readFileSync(runsPath, "utf-8");
  const lines = content.split("\n").filter((l) => l.trim().length > 0);

  if (lines.length !== manifest.scheduledExecutions) {
    throw new Error(
      `Record count mismatch in ${runsPath}. Manifest scheduled: ${manifest.scheduledExecutions}, actual lines: ${lines.length}`
    );
  }

  const records: NormalizedAnalysisRecord[] = [];
  const seenExecutionIds = new Set<string>();
  const seenExecutionTuples = new Set<string>();

  for (let i = 0; i < lines.length; i++) {
    const raw = JSON.parse(lines[i]);

    // Validate execution uniqueness
    const executionId = raw.executionId || `rec_${i}`;
    if (seenExecutionIds.has(executionId)) {
      throw new Error(`Duplicate executionId detected in ${runsPath}: ${executionId}`);
    }
    seenExecutionIds.add(executionId);

    const tupleKey = `${raw.scenarioId}_rep${raw.repetition}_${raw.providerId}`;
    if (seenExecutionTuples.has(tupleKey)) {
      throw new Error(`Duplicate scenario/rep/provider tuple in ${runsPath}: ${tupleKey}`);
    }
    seenExecutionTuples.add(tupleKey);

    // Extract metrics dictionary
    const metricsList: Array<{ name: string; value: number }> =
      raw.evaluationResult?.metrics || [];
    const metricMap = new Map<string, number>();
    for (const m of metricsList) {
      metricMap.set(m.name, m.value);
    }

    const proposedActions = raw.proposedActions || [];
    const skippedRedundantActions = raw.skippedRedundantActions || [];
    const executableActions = raw.executableActions || [];
    const simulatedActions = raw.simulatedActions || [];

    const timing = raw.timing || {};
    const decisionLatencyMs =
      raw.decisionLatencyMs ?? timing.decisionLatencyMs ?? 0;
    const simulationLatencyMs =
      raw.simulationLatencyMs ?? timing.simulationLatencyMs ?? 0;
    const evaluationLatencyMs =
      raw.evaluationLatencyMs ?? timing.evaluationLatencyMs ?? 0;
    const totalLatencyMs =
      raw.totalLatencyMs ?? timing.totalExecutionLatencyMs ?? decisionLatencyMs;

    const record: NormalizedAnalysisRecord = {
      executionId,
      experimentId: raw.experimentId || manifest.experimentId,
      scenarioId: raw.scenarioId,
      scenarioCategory: (raw.scenarioCategory || "NORMAL") as ScenarioCategory,
      repetition: raw.repetition,
      providerId: raw.providerId,
      engineId: raw.engineId || raw.providerId,
      status: raw.status,
      initialStateFingerprint: raw.initialStateFingerprint || "",
      intent: raw.intent || "",
      actionAccounting: {
        proposedActionsCount: proposedActions.length,
        skippedRedundantActionsCount: skippedRedundantActions.length,
        executableActionsCount: executableActions.length,
        simulatedActionsCount: simulatedActions.length,
        proposedActions,
        skippedRedundantActions,
        executableActions,
        simulatedActions,
      },
      metrics: {
        matchedRequiredActions:
          metricMap.get("matched_required_actions_count") ?? 0,
        missedRequiredActions:
          metricMap.get("missed_required_actions_count") ?? 0,
        forbiddenActions: metricMap.get("forbidden_actions_count") ?? 0,
        optionalActions: metricMap.get("optional_actions_count") ?? 0,
        unnecessaryActions: metricMap.get("unnecessary_actions_count") ?? 0,
        redundantActions: metricMap.get("redundant_actions_count") ?? 0,
        stateAccuracyRatio:
          metricMap.get("state_accuracy_ratio") ??
          raw.evaluationResult?.stateComparison?.stateAccuracyRatio ??
          0,
      },
      timing: {
        decisionLatencyMs: Math.round(decisionLatencyMs * 100) / 100,
        simulationLatencyMs: Math.round(simulationLatencyMs * 100) / 100,
        evaluationLatencyMs: Math.round(evaluationLatencyMs * 100) / 100,
        totalLatencyMs: Math.round(totalLatencyMs * 100) / 100,
      },
      confidence:
        raw.confidence ??
        raw.modelReportedConfidence ??
        raw.observation?.decisionResult?.confidence ??
        null,
      error: raw.error || (raw.simulationErrors && raw.simulationErrors.length > 0 ? raw.simulationErrors.join("; ") : undefined),
      executedAt: raw.executedAt || new Date().toISOString(),
    };

    records.push(record);
  }

  return {
    manifest,
    records,
  };
}
