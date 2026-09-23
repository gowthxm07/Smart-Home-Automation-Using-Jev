import { describe, it, expect, vi } from "vitest";
import {
  runJevBenchmark,
  isScenarioSupportedByJev,
  getUnsupportedReason,
  saveBenchmarkResult,
} from "@/lib/evaluation/benchmarks/jevBenchmark";
import { JevDecisionEngine } from "@/lib/jev/JevDecisionEngine";
import { TypeSafeClient } from "@/lib/typesafe/client";
import {
  getEvaluationScenario,
  getAllEvaluationScenarios,
} from "@/lib/evaluation/dataset";
import { SystemOneRequest, SystemOneResponse } from "@/lib/typesafe/types";
import { Action } from "@/types/action";
import fs from "fs";
import path from "path";

/**
 * Creates a deterministic mock TypeSafeClient that answers GOING_TO_SLEEP questions
 * without making external network calls.
 */
function createMockTypeSafeClient(overrides?: {
  shouldFail?: boolean;
  errorMessage?: string;
  isConfigured?: boolean;
}): TypeSafeClient {
  const isConfigured = overrides?.isConfigured ?? true;

  const mockClient = {
    isConfigured: () => isConfigured,
    listModels: async () => ({
      models: [
        {
          id: "jev-system-one",
          name: "Jev System One",
          version: "1.0",
          description: "Deterministic smart home decision model",
        },
      ],
    }),
    evaluateSystemOne: async (req: SystemOneRequest): Promise<SystemOneResponse> => {
      if (overrides?.shouldFail) {
        throw new Error(overrides.errorMessage || "Simulated TypeSafe API connection failure (HTTP 503)");
      }

      return {
        model: req.model || "jev-system-one",
        answers: {
          lock_main_door: { type: "noul", noul: 0.98 },
          light_living_room: { type: "noul", noul: 0.95 },
          tv_living_room: { type: "noul", noul: 0.99 },
          curtain_living_room: { type: "noul", noul: 0.92 },
          curtain_bedroom: { type: "noul", noul: 0.94 },
          security_system: { type: "noul", noul: 0.97 },
          fan_bedroom: {
            type: "choice",
            choice: "low",
            confidence: 0.91,
            probabilities: { off: 0.05, low: 0.85, medium: 0.08, high: 0.02 },
          },
          ac_living_room: { type: "noul", noul: 0.96 },
        },
        usage: {
          input_tokens: 250,
          output_tokens: 48,
        },
      };
    },
  } as unknown as TypeSafeClient;

  return mockClient;
}

describe("Milestone 3.4 — Jev Benchmark Execution", () => {
  it("Test 1: Supported scenario executes through generic runner and produces SUPPORTED_SUCCESS", async () => {
    const mockClient = createMockTypeSafeClient();
    const engine = new JevDecisionEngine({ client: mockClient });

    const sleepScenario = getEvaluationScenario("normal-sleep-01")!;
    expect(sleepScenario).toBeDefined();

    const benchmark = await runJevBenchmark({
      engine,
      scenarios: [sleepScenario],
    });

    expect(benchmark.summary.supportedScenarios).toBe(1);
    expect(benchmark.summary.successfulRuns).toBe(1);
    expect(benchmark.summary.failedRuns).toBe(0);

    const scenarioResult = benchmark.scenarioResults[0];
    expect(scenarioResult.status).toBe("SUPPORTED_SUCCESS");
    expect(scenarioResult.scenarioId).toBe("normal-sleep-01");
    expect(scenarioResult.evaluationResult).toBeDefined();
    expect(scenarioResult.evaluationResult).not.toBeNull();
    expect(scenarioResult.actions).toBeDefined();
    expect(scenarioResult.actions!.length).toBeGreaterThan(0);
  });

  it("Test 2 & 3: Unsupported scenario is explicitly classified as UNSUPPORTED and executes zero fake actions", async () => {
    const mockClient = createMockTypeSafeClient();
    const engine = new JevDecisionEngine({ client: mockClient });

    // Departure scenario is not currently supported by real Jev engine
    const leaveScenario = getEvaluationScenario("normal-leave-01")!;
    expect(leaveScenario).toBeDefined();

    const isSupported = isScenarioSupportedByJev(leaveScenario, engine);
    expect(isSupported).toBe(false);

    const benchmark = await runJevBenchmark({
      engine,
      scenarios: [leaveScenario],
    });

    expect(benchmark.summary.supportedScenarios).toBe(0);
    expect(benchmark.summary.unsupportedScenarios).toBe(1);
    expect(benchmark.summary.successfulRuns).toBe(0);
    expect(benchmark.summary.failedRuns).toBe(0);

    const scenarioResult = benchmark.scenarioResults[0];
    expect(scenarioResult.status).toBe("UNSUPPORTED");
    expect(scenarioResult.unsupportedReason).toBeDefined();
    expect(scenarioResult.unsupportedReason).toContain("GOING_TO_SLEEP");
    // Absolutely zero actions executed and no evaluation result produced
    expect(scenarioResult.actions).toBeUndefined();
    expect(scenarioResult.evaluationResult).toBeUndefined();
  });

  it("Test 4 & 5: Supported execution preserves generic EvaluationResult and timing telemetry", async () => {
    const mockClient = createMockTypeSafeClient();
    const engine = new JevDecisionEngine({ client: mockClient });

    const sleepScenario = getEvaluationScenario("normal-sleep-01")!;
    const benchmark = await runJevBenchmark({
      engine,
      scenarios: [sleepScenario],
    });

    const res = benchmark.scenarioResults[0];
    expect(res.status).toBe("SUPPORTED_SUCCESS");
    expect(res.evaluationResult).toBeDefined();
    expect(res.evaluationResult!.scenarioId).toBe("normal-sleep-01");
    expect(res.evaluationResult!.metrics.length).toBeGreaterThan(0);

    // High-resolution timing
    expect(res.timing).toBeDefined();
    expect(res.timing!.decisionLatencyMs).toBeGreaterThanOrEqual(0);
    expect(res.timing!.simulationLatencyMs).toBeGreaterThanOrEqual(0);
    expect(res.timing!.evaluationLatencyMs).toBeGreaterThanOrEqual(0);
    expect(res.timing!.totalExecutionLatencyMs).toBeGreaterThanOrEqual(0);
  });

  it("Test 6: Scenario initial state isolation is strictly maintained across benchmark executions", async () => {
    const mockClient = createMockTypeSafeClient();
    const engine = new JevDecisionEngine({ client: mockClient });

    const sleepScenario = getEvaluationScenario("normal-sleep-01")!;
    const initialStateSnapshot = JSON.stringify(sleepScenario.initialState);

    await runJevBenchmark({
      engine,
      scenarios: [sleepScenario],
    });

    // Scenario initial state must be 100% identical and unmutated
    expect(JSON.stringify(sleepScenario.initialState)).toBe(initialStateSnapshot);
  });

  it("Test 7 & 8: Engine ID is preserved and real Jev metadata is captured without altering evaluator metrics", async () => {
    const mockClient = createMockTypeSafeClient();
    const engine = new JevDecisionEngine({ client: mockClient, modelName: "jev-system-one-pro" });

    const sleepScenario = getEvaluationScenario("normal-sleep-01")!;
    const benchmark = await runJevBenchmark({
      engine,
      scenarios: [sleepScenario],
    });

    expect(benchmark.engineId).toBe("jev-system-one");
    const res = benchmark.scenarioResults[0];
    expect(res.jevMetadata).toBeDefined();
    expect(res.jevMetadata?.modelUsed).toBe("jev-system-one-pro");
    expect(res.jevMetadata?.tokenUsage).toBeDefined();
    expect(res.jevMetadata?.appliedDecisions).toBeDefined();
    expect(res.jevMetadata?.skippedRedundantActions).toBeDefined();

    // Verify evaluator metrics remain purely domain-based and decoupled
    const metrics = res.evaluationResult!.metrics;
    expect(metrics.find((m) => m.name === "matched_required_actions_count")).toBeDefined();
    expect(metrics.find((m) => m.name === "state_accuracy_ratio")).toBeDefined();
  });

  it("Test 9: Provider / API failure is safely represented as SUPPORTED_FAILURE", async () => {
    const failingClient = createMockTypeSafeClient({
      shouldFail: true,
      errorMessage: "TypeSafe service unavailable (HTTP 503)",
    });
    const engine = new JevDecisionEngine({ client: failingClient });

    const sleepScenario = getEvaluationScenario("normal-sleep-01")!;
    const benchmark = await runJevBenchmark({
      engine,
      scenarios: [sleepScenario],
    });

    expect(benchmark.summary.supportedScenarios).toBe(1);
    expect(benchmark.summary.successfulRuns).toBe(0);
    expect(benchmark.summary.failedRuns).toBe(1);

    const res = benchmark.scenarioResults[0];
    expect(res.status).toBe("SUPPORTED_FAILURE");
    expect(res.error).toContain("TypeSafe service unavailable");
    expect(res.evaluationResult).toBeUndefined();
  });

  it("Test 10: Evaluation dataset (36 scenarios) remains unmodified after full benchmark execution", async () => {
    const mockClient = createMockTypeSafeClient();
    const engine = new JevDecisionEngine({ client: mockClient });

    const allScenarios = getAllEvaluationScenarios();
    expect(allScenarios).toHaveLength(36);

    const datasetSnapshot = JSON.stringify(allScenarios);

    const benchmark = await runJevBenchmark({
      engine,
    });

    expect(benchmark.summary.totalScenarios).toBe(36);
    expect(benchmark.summary.supportedScenarios).toBe(9);
    expect(benchmark.summary.unsupportedScenarios).toBe(27);

    // Verify all 36 original scenarios in memory were not mutated
    expect(JSON.stringify(getAllEvaluationScenarios())).toBe(datasetSnapshot);
  });

  it("Test 11: No overallScore, winner, ranking, or composite score fields exist in benchmark result", async () => {
    const mockClient = createMockTypeSafeClient();
    const engine = new JevDecisionEngine({ client: mockClient });

    const benchmark = await runJevBenchmark({
      engine,
    });

    const b = benchmark as any;
    expect(b.overallScore).toBeUndefined();
    expect(b.score).toBeUndefined();
    expect(b.winner).toBeUndefined();
    expect(b.ranking).toBeUndefined();
    expect(b.jevScore).toBeUndefined();
    expect(b.JevScore).toBeUndefined();

    for (const res of benchmark.scenarioResults) {
      const r = res as any;
      expect(r.overallScore).toBeUndefined();
      expect(r.winner).toBeUndefined();
      expect(r.ranking).toBeUndefined();
      if (r.evaluationResult) {
        expect(r.evaluationResult.overallScore).toBeUndefined();
        expect(r.evaluationResult.winner).toBeUndefined();
      }
    }
  });

  it("Test 12: Benchmark summary preserves independent action and latency measurements", async () => {
    const mockClient = createMockTypeSafeClient();
    const engine = new JevDecisionEngine({ client: mockClient });

    const benchmark = await runJevBenchmark({
      engine,
    });

    const s = benchmark.summary;
    expect(s.totalRequiredActions).toBeGreaterThan(0);
    expect(s.totalMatchedRequiredActions).toBeGreaterThan(0);
    expect(s.meanDecisionLatencyMs).toBeGreaterThanOrEqual(0);
    expect(s.medianDecisionLatencyMs).toBeGreaterThanOrEqual(0);
    expect(s.meanTotalExecutionLatencyMs).toBeGreaterThanOrEqual(0);
    expect(s.medianTotalExecutionLatencyMs).toBeGreaterThanOrEqual(0);
  });

  it("Test 13: Credentials and API keys are strictly excluded from benchmark artifact serialization", () => {
    const mockClient = createMockTypeSafeClient();
    const engine = new JevDecisionEngine({ client: mockClient });

    const fakeResult = {
      benchmarkId: "test_sec_check_01",
      generatedAt: new Date().toISOString(),
      datasetVersion: "v1.0",
      engineId: engine.id,
      modelId: "jev-latest",
      summary: {
        totalScenarios: 1,
        supportedScenarios: 1,
        unsupportedScenarios: 0,
        successfulRuns: 1,
        failedRuns: 0,
        totalRequiredActions: 2,
        totalMatchedRequiredActions: 2,
        totalMissedRequiredActions: 0,
        totalForbiddenActionsExecuted: 0,
        totalUnnecessaryActions: 0,
        meanDecisionLatencyMs: 15,
        medianDecisionLatencyMs: 15,
        meanTotalExecutionLatencyMs: 25,
        medianTotalExecutionLatencyMs: 25,
      },
      scenarioResults: [],
    };

    const tempDir = path.resolve(process.cwd(), "artifacts/test_benchmarks");
    const savedPath = saveBenchmarkResult(fakeResult, tempDir);

    expect(fs.existsSync(savedPath)).toBe(true);
    const content = fs.readFileSync(savedPath, "utf-8");

    // Clean up
    fs.unlinkSync(savedPath);
    if (fs.existsSync(tempDir)) {
      fs.rmdirSync(tempDir);
    }

    expect(content).not.toContain("TYPESAFE_API_KEY");
    expect(content).not.toContain("Bearer");
    expect(content).not.toContain("secret");
  });

  it("Test 14: Real Jev network client is never invoked during unit tests", async () => {
    // Calling runJevBenchmark with an unconfigured engine would throw TypeSafeConfigurationError
    // if it attempted to reach real endpoints without a key.
    const unconfiguredClient = createMockTypeSafeClient({ isConfigured: false });
    const unconfiguredEngine = new JevDecisionEngine({ client: unconfiguredClient });

    const sleepScenario = getEvaluationScenario("normal-sleep-01")!;
    const benchmark = await runJevBenchmark({
      engine: unconfiguredEngine,
      scenarios: [sleepScenario],
    });

    // Surfaces safely as SUPPORTED_FAILURE without network access
    expect(benchmark.summary.failedRuns).toBe(1);
    expect(benchmark.scenarioResults[0].status).toBe("SUPPORTED_FAILURE");
    expect(benchmark.scenarioResults[0].error).toContain("TYPESAFE_API_KEY is not configured");
  });
});
