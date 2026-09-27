import { describe, it, expect } from "vitest";
import path from "path";
import fs from "fs";
import {
  computeMean,
  computeMedian,
  computeStandardDeviation,
  computePercentile,
  computeDescriptiveStatistics,
} from "@/lib/evaluation/analysis/statistics";
import {
  loadBenchmarkDataset,
  FROZEN_DATASET_HASH,
  EXPECTED_SCENARIO_COUNT,
} from "@/lib/evaluation/analysis/loader";
import {
  analyzeReliability,
  analyzeActionMetrics,
  analyzeLatency,
  analyzeRepetitionConsistency,
  analyzeScenarios,
  analyzeCategories,
  analyzeProvider,
  generateFullBaselineAnalysis,
} from "@/lib/evaluation/analysis/aggregator";
import { NormalizedAnalysisRecord } from "@/lib/evaluation/analysis/types";

describe("Milestone 3.12 — Frozen Baseline Analysis Infrastructure", () => {
  // 1. STATISTICAL UTILITY TESTS
  describe("Statistical Calculations", () => {
    it("should compute accurate mean, median, min, max on known datasets", () => {
      const data = [10, 20, 30, 40, 50];
      expect(computeMean(data)).toBe(30);
      expect(computeMedian(data)).toBe(30);
      expect(Math.min(...data)).toBe(10);
      expect(Math.max(...data)).toBe(50);
    });

    it("should compute even-length median accurately", () => {
      const data = [10, 20, 30, 40];
      expect(computeMedian(data)).toBe(25);
    });

    it("should compute sample standard deviation using N-1 Bessel correction", () => {
      const data = [2, 4, 4, 4, 5, 5, 7, 9];
      // Sample standard deviation for this known set is exactly 2.1381
      expect(computeStandardDeviation(data)).toBe(2.1381);
    });

    it("should handle edge cases for statistics (empty array and single item)", () => {
      expect(computeMean([])).toBe(0);
      expect(computeMedian([])).toBe(0);
      expect(computeStandardDeviation([])).toBe(0);
      expect(computePercentile([], 50)).toBe(0);

      const single = [42];
      expect(computeMean(single)).toBe(42);
      expect(computeMedian(single)).toBe(42);
      expect(computeStandardDeviation(single)).toBe(0);
      expect(computePercentile(single, 90)).toBe(42);
    });

    it("should compute percentiles correctly via linear interpolation", () => {
      const data = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
      expect(computePercentile(data, 50)).toBe(55);
      expect(computePercentile(data, 90)).toBe(91);
      expect(computePercentile(data, 0)).toBe(10);
      expect(computePercentile(data, 100)).toBe(100);
    });

    it("should produce complete DescriptiveStatistics with percentiles", () => {
      const data = [10, 20, 30, 40, 50];
      const stats = computeDescriptiveStatistics(data, true);
      expect(stats.count).toBe(5);
      expect(stats.mean).toBe(30);
      expect(stats.median).toBe(30);
      expect(stats.min).toBe(10);
      expect(stats.max).toBe(50);
      expect(stats.percentiles?.p50).toBe(30);
      expect(stats.percentiles?.p95).toBe(48);
    });
  });

  // 2. DATASET LOADER & VALIDATION TESTS
  describe("Dataset Loader & Schema Validation", () => {
    it("should validate the frozen dataset hash and scenario count constants", () => {
      expect(FROZEN_DATASET_HASH).toBe(
        "66de3242d1ba6583dc385a2999f8f8ba556a1f52cf5862cc7f223c9cdbfc0329"
      );
      expect(EXPECTED_SCENARIO_COUNT).toBe(36);
    });

    it("should successfully load and normalize the frozen Laya benchmark", () => {
      const layaDir = path.resolve("artifacts/benchmarks/exp_laya_readiness_1790440628419");
      const loaded = loadBenchmarkDataset(layaDir);

      expect(loaded.manifest.experimentId).toBe("exp_laya_readiness_1790440628419");
      expect(loaded.manifest.status).toBe("COMPLETED");
      expect(loaded.manifest.datasetHash).toBe(FROZEN_DATASET_HASH);
      expect(loaded.manifest.datasetScenarioCount).toBe(36);
      expect(loaded.records.length).toBe(180);

      // Verify all records are for LAYA
      expect(loaded.records.every((r) => r.providerId === "LAYA")).toBe(true);

      // Verify distinct executions
      const execIds = new Set(loaded.records.map((r) => r.executionId));
      expect(execIds.size).toBe(180);

      // Verify 36 distinct scenarios × 5 repetitions
      const scenarios = new Set(loaded.records.map((r) => r.scenarioId));
      expect(scenarios.size).toBe(36);
    });

    it("should successfully load and normalize the frozen LLM benchmark", () => {
      const llmDir = path.resolve("artifacts/benchmarks/exp_ctrl_1790489343228_255997");
      const loaded = loadBenchmarkDataset(llmDir);

      expect(loaded.manifest.experimentId).toBe("exp_ctrl_1790489343228_255997");
      expect(loaded.manifest.status).toBe("COMPLETED");
      expect(loaded.manifest.datasetHash).toBe(FROZEN_DATASET_HASH);
      expect(loaded.manifest.datasetScenarioCount).toBe(36);
      expect(loaded.records.length).toBe(180);

      // Verify all records are for LLM
      expect(loaded.records.every((r) => r.providerId === "LLM")).toBe(true);

      // Verify distinct executions
      const execIds = new Set(loaded.records.map((r) => r.executionId));
      expect(execIds.size).toBe(180);

      // Verify 36 distinct scenarios × 5 repetitions
      const scenarios = new Set(loaded.records.map((r) => r.scenarioId));
      expect(scenarios.size).toBe(36);
    });
  });

  // 3. AGGREGATOR ENGINE & METRIC CONTRACT TESTS
  describe("Aggregator Engine & Contract Compliance", () => {
    const createMockRecord = (
      scenarioId: string,
      repetition: number,
      status: "SUPPORTED_SUCCESS" | "SUPPORTED_FAILURE" | "UNSUPPORTED" = "SUPPORTED_SUCCESS",
      latencyMs: number = 25000
    ): NormalizedAnalysisRecord => ({
      executionId: `exec_${scenarioId}_${repetition}`,
      experimentId: "test_exp",
      scenarioId,
      scenarioCategory: "NORMAL",
      repetition,
      providerId: "TEST_PROV",
      engineId: "test-engine",
      status,
      initialStateFingerprint: "fp_test_123",
      intent: "Test intent",
      actionAccounting: {
        proposedActionsCount: 2,
        skippedRedundantActionsCount: 1,
        executableActionsCount: 1,
        simulatedActionsCount: 1,
        proposedActions: [],
        skippedRedundantActions: [],
        executableActions: [
          {
            id: "act-1",
            deviceId: "light_living_room",
            actionType: "TURN_ON",
            value: null,
            source: "LLM",
            timestamp: new Date().toISOString(),
          },
        ],
        simulatedActions: [],
      },
      metrics: {
        matchedRequiredActions: 1,
        missedRequiredActions: 0,
        forbiddenActions: 0,
        optionalActions: 0,
        unnecessaryActions: 0,
        redundantActions: 0,
        stateAccuracyRatio: 1.0,
      },
      timing: {
        decisionLatencyMs: latencyMs,
        simulationLatencyMs: 0.5,
        evaluationLatencyMs: 0.2,
        totalLatencyMs: latencyMs + 0.7,
      },
      confidence: null,
      executedAt: new Date().toISOString(),
    });

    it("should compute reliability metrics and failure rates accurately", () => {
      const records = [
        createMockRecord("scen-1", 1, "SUPPORTED_SUCCESS"),
        createMockRecord("scen-1", 2, "SUPPORTED_SUCCESS"),
        createMockRecord("scen-1", 3, "SUPPORTED_FAILURE"),
        createMockRecord("scen-1", 4, "UNSUPPORTED"),
      ];

      const reliability = analyzeReliability(records, "TEST_PROV");
      expect(reliability.totalExecutions).toBe(4);
      expect(reliability.successfulExecutions).toBe(2);
      expect(reliability.unsupportedExecutions).toBe(1);
      expect(reliability.failedExecutions).toBe(1);
      expect(reliability.successRate).toBe(0.5);
      expect(reliability.unsupportedRate).toBe(0.25);
      expect(reliability.failureRate).toBe(0.25);
      expect(reliability.failures.length).toBe(1);
    });

    it("should evaluate action metrics only across successful runs", () => {
      const records = [
        createMockRecord("scen-1", 1, "SUPPORTED_SUCCESS"),
        createMockRecord("scen-1", 2, "SUPPORTED_SUCCESS"),
        createMockRecord("scen-1", 3, "SUPPORTED_FAILURE"),
      ];

      const actionMetrics = analyzeActionMetrics(records, "TEST_PROV");
      expect(actionMetrics.evaluatedRunCount).toBe(2);
      expect(actionMetrics.matchedRequiredActions.mean).toBe(1);
      expect(actionMetrics.stateAccuracyRatio.mean).toBe(1.0);
    });

    it("should compute repetition consistency across 5 repetitions", () => {
      const records = [
        createMockRecord("scen-1", 1, "SUPPORTED_SUCCESS", 20000),
        createMockRecord("scen-1", 2, "SUPPORTED_SUCCESS", 22000),
        createMockRecord("scen-1", 3, "SUPPORTED_SUCCESS", 21000),
        createMockRecord("scen-1", 4, "SUPPORTED_SUCCESS", 20500),
        createMockRecord("scen-1", 5, "SUPPORTED_SUCCESS", 21500),
      ];

      const repConsistency = analyzeRepetitionConsistency(records, "TEST_PROV");
      expect(repConsistency.totalScenarios).toBe(1);
      expect(repConsistency.scenariosWithIdenticalActions).toBe(1);
      expect(repConsistency.scenariosWithIdenticalAccuracy).toBe(1);
      expect(repConsistency.meanLatencyRangeMs).toBe(2000); // 22000 - 20000
    });

    it("should strictly prohibit competitive fields (winner, rank, overallScore, compositeScore)", () => {
      const records = [
        createMockRecord("scen-1", 1),
        createMockRecord("scen-1", 2),
      ];

      const providerSummary = analyzeProvider(records, "exp_test");
      const json = JSON.stringify(providerSummary);

      const forbiddenKeys = [
        "\"winner\"",
        "\"rank\"",
        "\"score\"",
        "\"overallScore\"",
        "\"compositeScore\"",
        "\"bestProvider\"",
      ];

      for (const key of forbiddenKeys) {
        expect(json.includes(key)).toBe(false);
      }
    });

    it("should generate full baseline analysis artifacts matching disk structure", () => {
      const layaDir = path.resolve("artifacts/benchmarks/exp_laya_readiness_1790440628419");
      const llmDir = path.resolve("artifacts/benchmarks/exp_ctrl_1790489343228_255997");

      const analysis = generateFullBaselineAnalysis(
        [
          { providerId: "LAYA", experimentDir: layaDir },
          { providerId: "LLM", experimentDir: llmDir },
        ],
        "test_commit_hash"
      );

      expect(analysis.manifest.datasetScenarioCount).toBe(36);
      expect(analysis.manifest.datasetHash).toBe(FROZEN_DATASET_HASH);
      expect(Object.keys(analysis.providerSummaries)).toEqual(["LAYA", "LLM"]);
      expect(analysis.scenarioAnalysis.length).toBe(36);
      expect(analysis.categoryAnalysis.length).toBe(7);

      // Verify Laya summary
      const layaSummary = analysis.providerSummaries["LAYA"];
      expect(layaSummary.totalRepetitionAttempts).toBe(180);
      expect(layaSummary.reliability.successfulExecutions).toBe(170);
      expect(layaSummary.reliability.unsupportedExecutions).toBe(10);
      expect(layaSummary.reliability.failedExecutions).toBe(0);

      // Verify LLM summary
      const llmSummary = analysis.providerSummaries["LLM"];
      expect(llmSummary.totalRepetitionAttempts).toBe(180);
      expect(llmSummary.reliability.successfulExecutions).toBe(176);
      expect(llmSummary.reliability.unsupportedExecutions).toBe(0);
      expect(llmSummary.reliability.failedExecutions).toBe(4);
    });
  });
});
