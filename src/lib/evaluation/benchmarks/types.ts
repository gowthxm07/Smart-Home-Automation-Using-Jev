import { EvaluationResult } from "../types";
import { EvaluationTiming } from "../runner";
import { Action } from "@/types/action";
import { HomeState } from "@/types/home";
import { JevDecisionTrace } from "@/lib/jev/trace";

/**
 * Explicit execution status for each benchmark scenario.
 *
 * STRICT RESEARCH INTEGRITY:
 * - SUPPORTED_SUCCESS: Genuine Jev workflow executed and evaluated without simulation or runner errors.
 * - SUPPORTED_FAILURE: Genuine Jev workflow encountered a simulation error, API failure, or exception.
 * - UNSUPPORTED: Scenario requires a capability/workflow not yet implemented in the real Jev engine.
 *   Unsupported scenarios are NEVER converted to failures or evaluated with fabricated actions.
 */
export type JevBenchmarkScenarioStatus =
  | "SUPPORTED_SUCCESS"
  | "SUPPORTED_FAILURE"
  | "UNSUPPORTED";

/**
 * Detailed benchmark result for a single evaluation scenario.
 */
export interface JevScenarioBenchmarkResult {
  scenarioId: string;
  scenarioName: string;
  category: string;
  intent: string;
  status: JevBenchmarkScenarioStatus;
  unsupportedReason?: string;
  evaluationResult?: EvaluationResult | null;
  finalState?: HomeState;
  timing?: EvaluationTiming;
  actions?: readonly Action[];
  jevMetadata?: {
    modelUsed?: string;
    tokenUsage?: unknown;
    trace?: JevDecisionTrace;
    appliedDecisions?: string[];
    skippedRedundantActions?: string[];
  };
  error?: string;
  errorPhase?: string;
}

/**
 * Descriptive aggregate statistics across the benchmark execution.
 *
 * STRICT INTEGRITY RULES:
 * - NO composite "JevScore" or "QualityScore"
 * - NO winner or rankings
 * - Only independent, non-aggregated counts and statistical measurements
 */
export interface JevBenchmarkSummary {
  totalScenarios: number;
  supportedScenarios: number;
  unsupportedScenarios: number;
  successfulRuns: number;
  failedRuns: number;

  // Independent Action Metrics across supported runs
  totalRequiredActions: number;
  totalMatchedRequiredActions: number;
  totalMissedRequiredActions: number;
  totalForbiddenActionsExecuted: number;
  totalUnnecessaryActions: number;

  // Independent Latency Metrics (successful supported runs only)
  meanDecisionLatencyMs: number;
  medianDecisionLatencyMs: number;
  meanTotalExecutionLatencyMs: number;
  medianTotalExecutionLatencyMs: number;
}

/**
 * Complete, reproducible Jev benchmark report.
 */
export interface JevBenchmarkResult {
  benchmarkId: string;
  generatedAt: string;
  gitCommitHash?: string;
  datasetVersion: string;
  engineId: string;
  modelId: string;
  summary: JevBenchmarkSummary;
  scenarioResults: JevScenarioBenchmarkResult[];
}
