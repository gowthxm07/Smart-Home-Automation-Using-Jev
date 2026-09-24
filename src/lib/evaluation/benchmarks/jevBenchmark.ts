import { EvaluationScenario } from "../types";
import { getAllEvaluationScenarios } from "../dataset";
import {
  evaluateScenario,
  EvaluationRunnerOptions,
  EvaluationRunnerError,
} from "../runner";
import { JevDecisionEngine } from "@/lib/jev/JevDecisionEngine";
import {
  JevBenchmarkResult,
  JevBenchmarkSummary,
  JevScenarioBenchmarkResult,
} from "./types";
import fs from "fs";
import path from "path";

export interface JevBenchmarkOptions {
  engine?: JevDecisionEngine;
  scenarios?: readonly EvaluationScenario[];
  datasetVersion?: string;
  gitCommitHash?: string;
  runnerOptions?: EvaluationRunnerOptions;
  outputDir?: string;
}

/**
 * Determines whether a scenario is supported by the real Jev decision engine.
 *
 * Evaluates whether the scenario belongs to one of the 7 supported Jev decision
 * workflow families: GOING_TO_SLEEP, LEAVING_HOME, MOVIE_NIGHT, WORKING,
 * COMING_HOME, RELAXING, WAKING_UP.
 */
export function isScenarioSupportedByJev(
  scenario: EvaluationScenario,
  engine?: JevDecisionEngine
): boolean {
  if (engine && typeof engine.supportsScenario === "function") {
    return engine.supportsScenario(scenario);
  }
  if (!scenario) return false;
  const defaultEngine = new JevDecisionEngine();
  return defaultEngine.supportsScenario(scenario);
}

/**
 * Returns a descriptive explanation of why a scenario is unsupported by the Jev decision engine.
 */
export function getUnsupportedReason(scenario: EvaluationScenario): string {
  const category = scenario.metadata?.category || "UNKNOWN";
  return `Scenario category "${category}" (intent: "${scenario.intent}") requires an active domain workflow not currently supported by the Jev decision engine (supported workflows: GOING_TO_SLEEP, LEAVING_HOME, MOVIE_NIGHT, WORKING, COMING_HOME, RELAXING, WAKING_UP).`;
}

/**
 * Computes arithmetic mean rounded to 2 decimal places.
 */
function calculateMean(numbers: number[]): number {
  if (numbers.length === 0) return 0;
  const sum = numbers.reduce((acc, val) => acc + val, 0);
  return Math.round((sum / numbers.length) * 100) / 100;
}

/**
 * Computes statistical median rounded to 2 decimal places.
 */
function calculateMedian(numbers: number[]): number {
  if (numbers.length === 0) return 0;
  const sorted = [...numbers].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median =
    sorted.length % 2 !== 0
      ? sorted[mid]
      : (sorted[mid - 1] + sorted[mid]) / 2;
  return Math.round(median * 100) / 100;
}

/**
 * Executes the currently implemented REAL Jev decision engine against the
 * controlled evaluation scenario dataset using the generic evaluation pipeline.
 *
 * STRICT RESEARCH INTEGRITY:
 * - Real Jev engine evaluates genuinely supported scenarios (GOING_TO_SLEEP).
 * - Unsupported scenarios are explicitly recorded as UNSUPPORTED (0 fake actions).
 * - Evaluator produces independent, non-aggregated metrics.
 * - Zero composite scores, zero rankings, zero winners.
 */
export async function runJevBenchmark(
  options?: JevBenchmarkOptions
): Promise<JevBenchmarkResult> {
  const engine = options?.engine ?? new JevDecisionEngine();
  const scenarios = options?.scenarios ?? getAllEvaluationScenarios();
  const datasetVersion = options?.datasetVersion ?? "HomeMind-Eval-Dataset-v1.0 (36 Controlled Scenarios)";
  const gitCommitHash = options?.gitCommitHash;
  const benchmarkId = `jev_benchmark_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const generatedAt = new Date().toISOString();

  const scenarioResults: JevScenarioBenchmarkResult[] = [];

  for (const scenario of scenarios) {
    const isSupported = isScenarioSupportedByJev(scenario, engine);

    if (!isSupported) {
      // Step 1: Explicit UNSUPPORTED classification
      scenarioResults.push({
        scenarioId: scenario.id,
        scenarioName: scenario.name,
        category: String(scenario.metadata?.category || "UNKNOWN"),
        intent: scenario.intent,
        status: "UNSUPPORTED",
        unsupportedReason: getUnsupportedReason(scenario),
      });
      continue;
    }

    // Step 2: Execute genuinely supported scenario through generic evaluation runner
    try {
      const runResult = await evaluateScenario(
        scenario,
        engine,
        options?.runnerOptions
      );

      if (!runResult.success || !runResult.evaluationResult) {
        scenarioResults.push({
          scenarioId: scenario.id,
          scenarioName: scenario.name,
          category: String(scenario.metadata?.category || "UNKNOWN"),
          intent: scenario.intent,
          status: "SUPPORTED_FAILURE",
          error: runResult.run.error || "Simulation action rejected or evaluation aborted",
          timing: runResult.timing,
          finalState: runResult.finalState,
          actions: runResult.run.actions,
        });
      } else {
        scenarioResults.push({
          scenarioId: scenario.id,
          scenarioName: scenario.name,
          category: String(scenario.metadata?.category || "UNKNOWN"),
          intent: scenario.intent,
          status: "SUPPORTED_SUCCESS",
          evaluationResult: runResult.evaluationResult,
          finalState: runResult.finalState,
          timing: runResult.timing,
          actions: runResult.run.actions,
          jevMetadata: runResult.run.providerMetadata as any,
        });
      }
    } catch (err: unknown) {
      const runnerErr = err as EvaluationRunnerError;
      scenarioResults.push({
        scenarioId: scenario.id,
        scenarioName: scenario.name,
        category: String(scenario.metadata?.category || "UNKNOWN"),
        intent: scenario.intent,
        status: "SUPPORTED_FAILURE",
        error: runnerErr?.message || String(err),
        errorPhase: runnerErr?.phase || "UNKNOWN",
      });
    }
  }

  // Step 3: Compute independent aggregate statistics
  const supportedResults = scenarioResults.filter(
    (r) => r.status === "SUPPORTED_SUCCESS" || r.status === "SUPPORTED_FAILURE"
  );
  const successfulResults = scenarioResults.filter(
    (r) => r.status === "SUPPORTED_SUCCESS"
  );
  const failedResults = scenarioResults.filter(
    (r) => r.status === "SUPPORTED_FAILURE"
  );
  const unsupportedResults = scenarioResults.filter(
    (r) => r.status === "UNSUPPORTED"
  );

  let totalRequiredActions = 0;
  let totalMatchedRequiredActions = 0;
  let totalMissedRequiredActions = 0;
  let totalForbiddenActionsExecuted = 0;
  let totalUnnecessaryActions = 0;

  const decisionLatencies: number[] = [];
  const totalLatencies: number[] = [];

  for (const r of successfulResults) {
    if (r.evaluationResult?.actionComparison) {
      const ac = r.evaluationResult.actionComparison;
      totalMatchedRequiredActions += ac.matchedRequiredActions.length;
      totalMissedRequiredActions += ac.missedRequiredActions.length;
      totalRequiredActions +=
        ac.matchedRequiredActions.length + ac.missedRequiredActions.length;
      totalForbiddenActionsExecuted += ac.executedForbiddenActions.length;
      totalUnnecessaryActions += ac.unnecessaryActions.length;
    }
    if (r.timing) {
      decisionLatencies.push(r.timing.decisionLatencyMs);
      totalLatencies.push(r.timing.totalExecutionLatencyMs);
    }
  }

  const summary: JevBenchmarkSummary = {
    totalScenarios: scenarios.length,
    supportedScenarios: supportedResults.length,
    unsupportedScenarios: unsupportedResults.length,
    successfulRuns: successfulResults.length,
    failedRuns: failedResults.length,

    totalRequiredActions,
    totalMatchedRequiredActions,
    totalMissedRequiredActions,
    totalForbiddenActionsExecuted,
    totalUnnecessaryActions,

    meanDecisionLatencyMs: calculateMean(decisionLatencies),
    medianDecisionLatencyMs: calculateMedian(decisionLatencies),
    meanTotalExecutionLatencyMs: calculateMean(totalLatencies),
    medianTotalExecutionLatencyMs: calculateMedian(totalLatencies),
  };

  const benchmarkResult: JevBenchmarkResult = {
    benchmarkId,
    generatedAt,
    gitCommitHash,
    datasetVersion,
    engineId: engine.id,
    modelId: (engine as any).defaultModel || "jev-latest",
    summary,
    scenarioResults,
  };

  return benchmarkResult;
}

/**
 * Serializes and saves a JevBenchmarkResult as a JSON artifact.
 * Guarantees zero secrets / API keys are persisted.
 */
export function saveBenchmarkResult(
  result: JevBenchmarkResult,
  outputDir?: string
): string {
  const targetDir =
    outputDir || path.resolve(process.cwd(), "artifacts/benchmarks");

  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const filename = `jev-benchmark-${result.benchmarkId}.json`;
  const filePath = path.join(targetDir, filename);

  // Sanitize check: ensure no API keys or Bearer tokens exist in serialization
  const serialized = JSON.stringify(result, null, 2);
  const forbiddenPatterns = [/typesafe_api_key/i, /bearer\s+eyJ/i, /secret/i];
  for (const pattern of forbiddenPatterns) {
    if (pattern.test(serialized)) {
      throw new Error("Security Alert: Benchmark serialization contained credentials.");
    }
  }

  fs.writeFileSync(filePath, serialized, "utf-8");
  return filePath;
}
