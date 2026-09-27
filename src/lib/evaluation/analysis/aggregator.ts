import {
  NormalizedAnalysisRecord,
  ProviderReliabilityAnalysis,
  ProviderActionMetricsAnalysis,
  ProviderLatencyAnalysis,
  ProviderRepetitionConsistencyAnalysis,
  ProviderSummaryRecord,
  ScenarioAnalysisRecord,
  CategoryAnalysisRecord,
  BaselineAnalysisManifest,
} from "./types";
import { computeDescriptiveStatistics } from "./statistics";
import { ScenarioCategory } from "../dataset/scenarios";
import { loadBenchmarkDataset, FROZEN_DATASET_HASH, EXPECTED_SCENARIO_COUNT } from "./loader";

/**
 * Analyzes reliability and execution status for a provider's records.
 */
export function analyzeReliability(
  records: NormalizedAnalysisRecord[],
  providerId: string
): ProviderReliabilityAnalysis {
  const total = records.length;
  let successful = 0;
  let unsupported = 0;
  let failed = 0;
  let timeout = 0;
  const failures: Array<{ scenarioId: string; repetition: number; error: string }> = [];

  for (const r of records) {
    if (r.status === "SUPPORTED_SUCCESS") {
      successful++;
    } else if (r.status === "UNSUPPORTED") {
      unsupported++;
    } else {
      failed++;
      const err = r.error || "Unknown execution error";
      if (err.toLowerCase().includes("timed out") || err.toLowerCase().includes("timeout")) {
        timeout++;
      }
      failures.push({
        scenarioId: r.scenarioId,
        repetition: r.repetition,
        error: err,
      });
    }
  }

  return {
    providerId,
    totalExecutions: total,
    successfulExecutions: successful,
    unsupportedExecutions: unsupported,
    failedExecutions: failed,
    timeoutExecutions: timeout,
    successRate: total > 0 ? Math.round((successful / total) * 10000) / 10000 : 0,
    unsupportedRate: total > 0 ? Math.round((unsupported / total) * 10000) / 10000 : 0,
    failureRate: total > 0 ? Math.round((failed / total) * 10000) / 10000 : 0,
    failures,
  };
}

/**
 * Computes descriptive statistics for action metrics across successful runs.
 */
export function analyzeActionMetrics(
  records: NormalizedAnalysisRecord[],
  providerId: string
): ProviderActionMetricsAnalysis {
  const successful = records.filter((r) => r.status === "SUPPORTED_SUCCESS");

  const matched = successful.map((r) => r.metrics.matchedRequiredActions);
  const missed = successful.map((r) => r.metrics.missedRequiredActions);
  const forbidden = successful.map((r) => r.metrics.forbiddenActions);
  const optional = successful.map((r) => r.metrics.optionalActions);
  const unnecessary = successful.map((r) => r.metrics.unnecessaryActions);
  const redundant = successful.map((r) => r.metrics.redundantActions);
  const accuracy = successful.map((r) => r.metrics.stateAccuracyRatio);

  return {
    providerId,
    evaluatedRunCount: successful.length,
    matchedRequiredActions: computeDescriptiveStatistics(matched),
    missedRequiredActions: computeDescriptiveStatistics(missed),
    forbiddenActions: computeDescriptiveStatistics(forbidden),
    optionalActions: computeDescriptiveStatistics(optional),
    unnecessaryActions: computeDescriptiveStatistics(unnecessary),
    redundantActions: computeDescriptiveStatistics(redundant),
    stateAccuracyRatio: computeDescriptiveStatistics(accuracy),
  };
}

/**
 * Computes latency distributions and percentiles across successful runs.
 */
export function analyzeLatency(
  records: NormalizedAnalysisRecord[],
  providerId: string
): ProviderLatencyAnalysis {
  const successful = records.filter((r) => r.status === "SUPPORTED_SUCCESS");

  const decision = successful.map((r) => r.timing.decisionLatencyMs);
  const simulation = successful.map((r) => r.timing.simulationLatencyMs);
  const evaluation = successful.map((r) => r.timing.evaluationLatencyMs);
  const total = successful.map((r) => r.timing.totalLatencyMs);

  const bucketDefs = [
    { label: "< 20s", max: 20000, min: 0 },
    { label: "20s - 30s", max: 30000, min: 20000 },
    { label: "30s - 45s", max: 45000, min: 30000 },
    { label: "45s - 60s", max: 60000, min: 45000 },
    { label: "60s - 90s", max: 90000, min: 60000 },
    { label: "90s - 120s", max: 120000, min: 90000 },
    { label: "120s - 150s", max: 150000, min: 120000 },
    { label: "150s - 180s", max: 180000, min: 150000 },
    { label: "> 180s", max: Infinity, min: 180000 },
  ];

  const distributionBuckets: Record<string, { count: number; percentage: number }> = {};
  for (const b of bucketDefs) {
    const inBucket = decision.filter((l) => l >= b.min && l < b.max);
    distributionBuckets[b.label] = {
      count: inBucket.length,
      percentage:
        decision.length > 0
          ? Math.round((inBucket.length / decision.length) * 10000) / 100
          : 0,
    };
  }

  return {
    providerId,
    evaluatedRunCount: successful.length,
    decisionLatencyMs: computeDescriptiveStatistics(decision, true),
    simulationLatencyMs: computeDescriptiveStatistics(simulation, true),
    evaluationLatencyMs: computeDescriptiveStatistics(evaluation, true),
    totalLatencyMs: computeDescriptiveStatistics(total, true),
    distributionBuckets,
  };
}

/**
 * Analyzes repetition consistency across the 5 repetitions of each scenario.
 */
export function analyzeRepetitionConsistency(
  records: NormalizedAnalysisRecord[],
  providerId: string
): ProviderRepetitionConsistencyAnalysis {
  const scenarioMap = new Map<string, NormalizedAnalysisRecord[]>();
  for (const r of records) {
    if (!scenarioMap.has(r.scenarioId)) {
      scenarioMap.set(r.scenarioId, []);
    }
    scenarioMap.get(r.scenarioId)!.push(r);
  }

  let identicalActions = 0;
  let identicalAccuracy = 0;
  let identicalMetrics = 0;
  const latencyRanges: number[] = [];
  const scenarioConsistency: Record<
    string,
    {
      identicalActions: boolean;
      identicalAccuracy: boolean;
      identicalMetrics: boolean;
      latencyRangeMs: number;
    }
  > = {};

  for (const [scenarioId, runs] of scenarioMap.entries()) {
    runs.sort((a, b) => a.repetition - b.repetition);

    const actionSigs = runs.map((r) =>
      r.status === "SUPPORTED_SUCCESS"
        ? r.actionAccounting.executableActions
            .map((a) => `${a.deviceId}:${a.actionType}:${a.value}`)
            .sort()
            .join("|")
        : `FAIL:${r.error}`
    );
    const accuracies = runs.map((r) =>
      r.status === "SUPPORTED_SUCCESS" ? r.metrics.stateAccuracyRatio : -1
    );
    const metricSigs = runs.map((r) =>
      r.status === "SUPPORTED_SUCCESS"
        ? `${r.metrics.matchedRequiredActions}:${r.metrics.missedRequiredActions}:${r.metrics.forbiddenActions}:${r.metrics.unnecessaryActions}:${r.metrics.redundantActions}`
        : "FAIL"
    );

    const lats = runs.map((r) => r.timing.decisionLatencyMs);
    const range = lats.length > 0 ? Math.max(...lats) - Math.min(...lats) : 0;
    latencyRanges.push(range);

    const hasIdenticalActions = new Set(actionSigs).size === 1;
    const hasIdenticalAccuracy = new Set(accuracies).size === 1;
    const hasIdenticalMetrics = new Set(metricSigs).size === 1;

    if (hasIdenticalActions) identicalActions++;
    if (hasIdenticalAccuracy) identicalAccuracy++;
    if (hasIdenticalMetrics) identicalMetrics++;

    scenarioConsistency[scenarioId] = {
      identicalActions: hasIdenticalActions,
      identicalAccuracy: hasIdenticalAccuracy,
      identicalMetrics: hasIdenticalMetrics,
      latencyRangeMs: Math.round(range * 100) / 100,
    };
  }

  const totalScenarios = scenarioMap.size;
  const meanRange =
    latencyRanges.length > 0
      ? latencyRanges.reduce((a, b) => a + b, 0) / latencyRanges.length
      : 0;

  return {
    providerId,
    totalScenarios,
    scenariosWithIdenticalActions: identicalActions,
    scenariosWithIdenticalAccuracy: identicalAccuracy,
    scenariosWithIdenticalMetrics: identicalMetrics,
    actionConsistencyRate:
      totalScenarios > 0 ? Math.round((identicalActions / totalScenarios) * 10000) / 10000 : 0,
    accuracyConsistencyRate:
      totalScenarios > 0 ? Math.round((identicalAccuracy / totalScenarios) * 10000) / 10000 : 0,
    metricConsistencyRate:
      totalScenarios > 0 ? Math.round((identicalMetrics / totalScenarios) * 10000) / 10000 : 0,
    meanLatencyRangeMs: Math.round(meanRange * 100) / 100,
    scenarioConsistency,
  };
}

/**
 * Computes action accounting totals.
 */
export function analyzeActionAccounting(records: NormalizedAnalysisRecord[]) {
  const totalProposed = records.reduce((acc, r) => acc + r.actionAccounting.proposedActionsCount, 0);
  const totalSkipped = records.reduce((acc, r) => acc + r.actionAccounting.skippedRedundantActionsCount, 0);
  const totalExecutable = records.reduce((acc, r) => acc + r.actionAccounting.executableActionsCount, 0);
  const totalSimulated = records.reduce((acc, r) => acc + r.actionAccounting.simulatedActionsCount, 0);
  const count = records.length;

  return {
    totalProposed,
    totalSkipped,
    totalExecutable,
    totalSimulated,
    meanProposedPerRun: count > 0 ? Math.round((totalProposed / count) * 100) / 100 : 0,
    meanSkippedPerRun: count > 0 ? Math.round((totalSkipped / count) * 100) / 100 : 0,
    meanExecutablePerRun: count > 0 ? Math.round((totalExecutable / count) * 100) / 100 : 0,
  };
}

/**
 * Analyzes confidence information without requiring it.
 */
export function analyzeConfidence(records: NormalizedAnalysisRecord[]) {
  const validConfidences = records
    .map((r) => r.confidence)
    .filter((c): c is number => c !== null && c !== undefined && !isNaN(c));

  if (validConfidences.length === 0) {
    return {
      available: false,
      uncalibrated: false,
      sampleCount: 0,
    };
  }

  return {
    available: true,
    uncalibrated: true, // Laya confidence is uncalibrated model-reported probability
    sampleCount: validConfidences.length,
    mean: computeDescriptiveStatistics(validConfidences).mean,
    min: Math.min(...validConfidences),
    max: Math.max(...validConfidences),
  };
}

/**
 * Produces a complete summary for a single provider.
 */
export function analyzeProvider(
  records: NormalizedAnalysisRecord[],
  experimentId: string
): ProviderSummaryRecord {
  const providerId = records[0]?.providerId || "UNKNOWN";
  const engineId = records[0]?.engineId || providerId;
  const uniqueScenarios = new Set(records.map((r) => r.scenarioId)).size;

  return {
    providerId,
    engineId,
    experimentId,
    datasetScenarioCount: uniqueScenarios,
    totalRepetitionAttempts: records.length,
    reliability: analyzeReliability(records, providerId),
    actionMetrics: analyzeActionMetrics(records, providerId),
    latency: analyzeLatency(records, providerId),
    repetitionConsistency: analyzeRepetitionConsistency(records, providerId),
    actionAccounting: analyzeActionAccounting(records),
    confidenceSummary: analyzeConfidence(records),
  };
}

/**
 * Computes scenario-level breakdown across providers.
 */
export function analyzeScenarios(
  recordsByProvider: Record<string, NormalizedAnalysisRecord[]>
): ScenarioAnalysisRecord[] {
  const scenarioIds = new Set<string>();
  const scenarioCategories = new Map<string, ScenarioCategory>();

  for (const records of Object.values(recordsByProvider)) {
    for (const r of records) {
      scenarioIds.add(r.scenarioId);
      if (!scenarioCategories.has(r.scenarioId)) {
        scenarioCategories.set(r.scenarioId, r.scenarioCategory);
      }
    }
  }

  const results: ScenarioAnalysisRecord[] = [];

  for (const scenarioId of Array.from(scenarioIds).sort()) {
    const category = scenarioCategories.get(scenarioId) || "NORMAL";
    const providerStats: ScenarioAnalysisRecord["providers"] = {};

    for (const [providerId, records] of Object.entries(recordsByProvider)) {
      const scenRuns = records.filter((r) => r.scenarioId === scenarioId);
      const successfulRuns = scenRuns.filter((r) => r.status === "SUPPORTED_SUCCESS");

      providerStats[providerId] = {
        repetitions: scenRuns.length,
        successfulRepetitions: successfulRuns.length,
        unsupportedRepetitions: scenRuns.filter((r) => r.status === "UNSUPPORTED").length,
        failedRepetitions: scenRuns.filter((r) => r.status === "SUPPORTED_FAILURE").length,
        matchedRequired: computeDescriptiveStatistics(
          successfulRuns.map((r) => r.metrics.matchedRequiredActions)
        ),
        missedRequired: computeDescriptiveStatistics(
          successfulRuns.map((r) => r.metrics.missedRequiredActions)
        ),
        forbidden: computeDescriptiveStatistics(
          successfulRuns.map((r) => r.metrics.forbiddenActions)
        ),
        unnecessary: computeDescriptiveStatistics(
          successfulRuns.map((r) => r.metrics.unnecessaryActions)
        ),
        redundant: computeDescriptiveStatistics(
          successfulRuns.map((r) => r.metrics.redundantActions)
        ),
        stateAccuracy: computeDescriptiveStatistics(
          successfulRuns.map((r) => r.metrics.stateAccuracyRatio)
        ),
        decisionLatencyMs: computeDescriptiveStatistics(
          successfulRuns.map((r) => r.timing.decisionLatencyMs)
        ),
        totalLatencyMs: computeDescriptiveStatistics(
          successfulRuns.map((r) => r.timing.totalLatencyMs)
        ),
      };
    }

    results.push({
      scenarioId,
      scenarioCategory: category,
      providers: providerStats,
    });
  }

  return results;
}

/**
 * Computes category-level breakdown across providers.
 */
export function analyzeCategories(
  recordsByProvider: Record<string, NormalizedAnalysisRecord[]>
): CategoryAnalysisRecord[] {
  const categories: ScenarioCategory[] = [
    "NORMAL",
    "PARTIAL_STATE",
    "NO_OP",
    "MULTI_DEVICE",
    "CONTEXT_SENSITIVE",
    "SECURITY",
    "AMBIGUOUS",
  ];

  const results: CategoryAnalysisRecord[] = [];

  for (const cat of categories) {
    const providerStats: CategoryAnalysisRecord["providers"] = {};
    let categoryScenarioCount = 0;

    for (const [providerId, records] of Object.entries(recordsByProvider)) {
      const catRuns = records.filter((r) => r.scenarioCategory === cat);
      const uniqueScenariosInCat = new Set(catRuns.map((r) => r.scenarioId)).size;
      categoryScenarioCount = Math.max(categoryScenarioCount, uniqueScenariosInCat);
      const successfulRuns = catRuns.filter((r) => r.status === "SUPPORTED_SUCCESS");

      providerStats[providerId] = {
        executionCount: catRuns.length,
        successCount: successfulRuns.length,
        unsupportedCount: catRuns.filter((r) => r.status === "UNSUPPORTED").length,
        failureCount: catRuns.filter((r) => r.status === "SUPPORTED_FAILURE").length,
        matchedRequired: computeDescriptiveStatistics(
          successfulRuns.map((r) => r.metrics.matchedRequiredActions)
        ),
        missedRequired: computeDescriptiveStatistics(
          successfulRuns.map((r) => r.metrics.missedRequiredActions)
        ),
        forbidden: computeDescriptiveStatistics(
          successfulRuns.map((r) => r.metrics.forbiddenActions)
        ),
        unnecessary: computeDescriptiveStatistics(
          successfulRuns.map((r) => r.metrics.unnecessaryActions)
        ),
        redundant: computeDescriptiveStatistics(
          successfulRuns.map((r) => r.metrics.redundantActions)
        ),
        stateAccuracy: computeDescriptiveStatistics(
          successfulRuns.map((r) => r.metrics.stateAccuracyRatio)
        ),
        decisionLatencyMs: computeDescriptiveStatistics(
          successfulRuns.map((r) => r.timing.decisionLatencyMs)
        ),
        totalLatencyMs: computeDescriptiveStatistics(
          successfulRuns.map((r) => r.timing.totalLatencyMs)
        ),
      };
    }

    results.push({
      category: cat,
      scenarioCount: categoryScenarioCount,
      providers: providerStats,
    });
  }

  return results;
}

/**
 * Generates the full baseline analysis across multiple benchmark directories.
 */
export function generateFullBaselineAnalysis(
  datasetConfigs: Array<{ providerId: string; experimentDir: string }>,
  gitCommitHash: string
) {
  const recordsByProvider: Record<string, NormalizedAnalysisRecord[]> = {};
  const providerSummaries: Record<string, ProviderSummaryRecord> = {};
  const sourceExperiments: BaselineAnalysisManifest["sourceExperiments"] = [];

  for (const config of datasetConfigs) {
    const loaded = loadBenchmarkDataset(config.experimentDir);
    recordsByProvider[config.providerId] = loaded.records;
    providerSummaries[config.providerId] = analyzeProvider(
      loaded.records,
      loaded.manifest.experimentId
    );
    sourceExperiments.push({
      providerId: config.providerId,
      experimentId: loaded.manifest.experimentId,
      directory: config.experimentDir,
      recordCount: loaded.records.length,
      status: loaded.manifest.status,
    });
  }

  const scenarioAnalysis = analyzeScenarios(recordsByProvider);
  const categoryAnalysis = analyzeCategories(recordsByProvider);

  const latencyAnalysis: Record<string, ProviderLatencyAnalysis> = {};
  const reliabilityAnalysis: Record<string, ProviderReliabilityAnalysis> = {};
  for (const [providerId, records] of Object.entries(recordsByProvider)) {
    latencyAnalysis[providerId] = analyzeLatency(records, providerId);
    reliabilityAnalysis[providerId] = analyzeReliability(records, providerId);
  }

  const manifest: BaselineAnalysisManifest = {
    analysisId: `analysis_baseline_${Date.now()}`,
    analysisVersion: "1.0.0",
    generatedAt: new Date().toISOString(),
    gitCommitHash,
    datasetHash: FROZEN_DATASET_HASH,
    datasetScenarioCount: EXPECTED_SCENARIO_COUNT,
    sourceExperiments,
    metricDefinitions: {
      matchedRequiredActions:
        "Count of ground-truth required device actions accurately produced and executed.",
      missedRequiredActions:
        "Count of ground-truth required device actions omitted by the decision engine.",
      forbiddenActions:
        "Count of safety-violating, forbidden, or hazardous device actions executed.",
      optionalActions:
        "Count of valid but non-mandatory contextual actions executed.",
      unnecessaryActions:
        "Count of actions generated that were neither required nor optional in the scenario context.",
      redundantActions:
        "Count of actions that targeted devices already physically in the desired state.",
      stateAccuracyRatio:
        "Proportion (0.0 to 1.0) of evaluated devices whose post-simulation physical state matches ground truth.",
      decisionLatencyMs:
        "Wall-clock latency in milliseconds of the provider decision pipeline.",
      simulationLatencyMs:
        "Wall-clock latency in milliseconds of the local discrete-event simulation engine.",
      evaluationLatencyMs:
        "Wall-clock latency in milliseconds of the evaluation comparison engine.",
      totalLatencyMs:
        "Total end-to-end scenario execution latency in milliseconds.",
    },
  };

  return {
    manifest,
    providerSummaries,
    scenarioAnalysis,
    categoryAnalysis,
    latencyAnalysis,
    reliabilityAnalysis,
  };
}
