import { ScenarioCategory } from "../dataset/scenarios";
import { Action } from "@/types/action";

/**
 * Normalized read-only record representing a single benchmark execution.
 */
export interface NormalizedAnalysisRecord {
  executionId: string;
  experimentId: string;
  scenarioId: string;
  scenarioCategory: ScenarioCategory;
  repetition: number;
  providerId: string;
  engineId: string;
  status: "SUPPORTED_SUCCESS" | "SUPPORTED_FAILURE" | "UNSUPPORTED";
  initialStateFingerprint: string;
  intent: string;
  actionAccounting: {
    proposedActionsCount: number;
    skippedRedundantActionsCount: number;
    executableActionsCount: number;
    simulatedActionsCount: number;
    proposedActions: Action[];
    skippedRedundantActions: Action[];
    executableActions: Action[];
    simulatedActions: Action[];
  };
  metrics: {
    matchedRequiredActions: number;
    missedRequiredActions: number;
    forbiddenActions: number;
    optionalActions: number;
    unnecessaryActions: number;
    redundantActions: number;
    stateAccuracyRatio: number;
  };
  timing: {
    decisionLatencyMs: number;
    simulationLatencyMs: number;
    evaluationLatencyMs: number;
    totalLatencyMs: number;
  };
  confidence: number | null;
  error?: string;
  executedAt: string;
}

/**
 * Descriptive statistics for a single numerical metric distribution.
 */
export interface DescriptiveStatistics {
  count: number;
  mean: number;
  median: number;
  standardDeviation: number;
  min: number;
  max: number;
  percentiles?: {
    p50: number;
    p75: number;
    p90: number;
    p95: number;
    p99: number;
  };
}

/**
 * Reliability & status metrics for a provider.
 */
export interface ProviderReliabilityAnalysis {
  providerId: string;
  totalExecutions: number;
  successfulExecutions: number;
  unsupportedExecutions: number;
  failedExecutions: number;
  timeoutExecutions: number;
  successRate: number;
  unsupportedRate: number;
  failureRate: number;
  failures: Array<{
    scenarioId: string;
    repetition: number;
    error: string;
  }>;
}

/**
 * Action quality metrics for a provider across successful executions.
 */
export interface ProviderActionMetricsAnalysis {
  providerId: string;
  evaluatedRunCount: number;
  matchedRequiredActions: DescriptiveStatistics;
  missedRequiredActions: DescriptiveStatistics;
  forbiddenActions: DescriptiveStatistics;
  optionalActions: DescriptiveStatistics;
  unnecessaryActions: DescriptiveStatistics;
  redundantActions: DescriptiveStatistics;
  stateAccuracyRatio: DescriptiveStatistics;
}

/**
 * Latency distributions across successful executions.
 */
export interface ProviderLatencyAnalysis {
  providerId: string;
  evaluatedRunCount: number;
  decisionLatencyMs: DescriptiveStatistics;
  simulationLatencyMs: DescriptiveStatistics;
  evaluationLatencyMs: DescriptiveStatistics;
  totalLatencyMs: DescriptiveStatistics;
  distributionBuckets: Record<string, { count: number; percentage: number }>;
}

/**
 * Repetition consistency metrics across the 5 repetitions of each scenario.
 */
export interface ProviderRepetitionConsistencyAnalysis {
  providerId: string;
  totalScenarios: number;
  scenariosWithIdenticalActions: number;
  scenariosWithIdenticalAccuracy: number;
  scenariosWithIdenticalMetrics: number;
  actionConsistencyRate: number;
  accuracyConsistencyRate: number;
  metricConsistencyRate: number;
  meanLatencyRangeMs: number;
  scenarioConsistency: Record<
    string,
    {
      identicalActions: boolean;
      identicalAccuracy: boolean;
      identicalMetrics: boolean;
      latencyRangeMs: number;
    }
  >;
}

/**
 * Scenario-level metrics for all evaluated providers.
 */
export interface ScenarioAnalysisRecord {
  scenarioId: string;
  scenarioCategory: ScenarioCategory;
  providers: Record<
    string,
    {
      repetitions: number;
      successfulRepetitions: number;
      unsupportedRepetitions: number;
      failedRepetitions: number;
      matchedRequired: DescriptiveStatistics;
      missedRequired: DescriptiveStatistics;
      forbidden: DescriptiveStatistics;
      unnecessary: DescriptiveStatistics;
      redundant: DescriptiveStatistics;
      stateAccuracy: DescriptiveStatistics;
      decisionLatencyMs: DescriptiveStatistics;
      totalLatencyMs: DescriptiveStatistics;
    }
  >;
}

/**
 * Category-level metrics for all evaluated providers.
 */
export interface CategoryAnalysisRecord {
  category: ScenarioCategory;
  scenarioCount: number;
  providers: Record<
    string,
    {
      executionCount: number;
      successCount: number;
      unsupportedCount: number;
      failureCount: number;
      matchedRequired: DescriptiveStatistics;
      missedRequired: DescriptiveStatistics;
      forbidden: DescriptiveStatistics;
      unnecessary: DescriptiveStatistics;
      redundant: DescriptiveStatistics;
      stateAccuracy: DescriptiveStatistics;
      decisionLatencyMs: DescriptiveStatistics;
      totalLatencyMs: DescriptiveStatistics;
    }
  >;
}

/**
 * High-level provider summary without composite scoring or ranking.
 */
export interface ProviderSummaryRecord {
  providerId: string;
  engineId: string;
  experimentId: string;
  datasetScenarioCount: number;
  totalRepetitionAttempts: number;
  reliability: ProviderReliabilityAnalysis;
  actionMetrics: ProviderActionMetricsAnalysis;
  latency: ProviderLatencyAnalysis;
  repetitionConsistency: ProviderRepetitionConsistencyAnalysis;
  actionAccounting: {
    totalProposed: number;
    totalSkipped: number;
    totalExecutable: number;
    totalSimulated: number;
    meanProposedPerRun: number;
    meanSkippedPerRun: number;
    meanExecutablePerRun: number;
  };
  confidenceSummary: {
    available: boolean;
    uncalibrated: boolean;
    sampleCount: number;
    mean?: number;
    min?: number;
    max?: number;
  };
}

/**
 * Manifest file describing the analysis batch.
 */
export interface BaselineAnalysisManifest {
  analysisId: string;
  analysisVersion: string;
  generatedAt: string;
  gitCommitHash: string;
  datasetHash: string;
  datasetScenarioCount: number;
  sourceExperiments: Array<{
    providerId: string;
    experimentId: string;
    directory: string;
    recordCount: number;
    status: string;
  }>;
  metricDefinitions: Record<string, string>;
}
