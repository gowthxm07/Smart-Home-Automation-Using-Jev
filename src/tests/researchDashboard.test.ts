import { describe, it, expect } from "vitest";
import path from "path";
import fs from "fs";
import os from "os";
import {
  loadDashboardAnalysisData,
  FROZEN_DATASET_HASH,
  EXPECTED_SCENARIO_COUNT,
  DashboardAnalysisData,
} from "@/lib/evaluation/analysis/dashboardLoader";

describe("Milestone 3.13A — Research Comparison Dashboard", () => {
  let dashboardData: DashboardAnalysisData;

  // 1. DASHBOARD LOADER LOADS ALL SIX ANALYSIS ARTIFACTS
  it("1. should successfully load all six predefined analysis artifacts", () => {
    dashboardData = loadDashboardAnalysisData();
    expect(dashboardData).toBeDefined();
    expect(dashboardData.manifest).toBeDefined();
    expect(dashboardData.providerSummaries).toBeDefined();
    expect(dashboardData.scenarioAnalysis).toBeDefined();
    expect(dashboardData.categoryAnalysis).toBeDefined();
    expect(dashboardData.latencyAnalysis).toBeDefined();
    expect(dashboardData.reliabilityAnalysis).toBeDefined();
  });

  // 2. DATASET SHA INTEGRITY
  it("2. should verify cryptographic dataset SHA-256 integrity", () => {
    expect(dashboardData.manifest.datasetHash).toBe(FROZEN_DATASET_HASH);
    expect(dashboardData.manifest.datasetHash).toBe(
      "66de3242d1ba6583dc385a2999f8f8ba556a1f52cf5862cc7f223c9cdbfc0329"
    );
  });

  // 3. SCENARIO COUNT = 36
  it("3. should verify scenario count equals exactly 36", () => {
    expect(dashboardData.manifest.datasetScenarioCount).toBe(EXPECTED_SCENARIO_COUNT);
    expect(dashboardData.manifest.datasetScenarioCount).toBe(36);
    expect(dashboardData.scenarioAnalysis.length).toBe(36);
  });

  // 4. PROVIDER DATA EXISTS
  it("4. should verify provider baseline data exists for LAYA and LLM", () => {
    expect(dashboardData.providerIds).toContain("LAYA");
    expect(dashboardData.providerIds).toContain("LLM");

    const layaSummary = dashboardData.providerSummaries["LAYA"];
    const llmSummary = dashboardData.providerSummaries["LLM"];

    expect(layaSummary).toBeDefined();
    expect(llmSummary).toBeDefined();

    expect(layaSummary.totalRepetitionAttempts).toBe(180);
    expect(llmSummary.totalRepetitionAttempts).toBe(180);

    expect(layaSummary.datasetScenarioCount).toBe(36);
    expect(llmSummary.datasetScenarioCount).toBe(36);
  });

  // 5. SCENARIO METADATA JOINS CORRECTLY
  it("5. should join human-readable scenario metadata from ground truth", () => {
    const sleepScenario = dashboardData.scenarioAnalysis.find(
      (s) => s.scenarioId === "normal-sleep-01"
    );

    expect(sleepScenario).toBeDefined();
    expect(sleepScenario?.name).toBe("Normal Bedtime Routine");
    expect(sleepScenario?.intent).toBe("I'm going to sleep.");
    expect(sleepScenario?.description).toContain("Standard bedtime automation");

    // Verify all 36 scenarios have joined metadata
    for (const s of dashboardData.scenarioAnalysis) {
      expect(s.name).toBeDefined();
      expect(s.name.length).toBeGreaterThan(0);
      expect(s.intent).toBeDefined();
      expect(s.intent.length).toBeGreaterThan(0);
    }
  });

  // 6. CATEGORY DATA EXISTS
  it("6. should verify all seven frozen categories exist with full coverage", () => {
    const expectedCategories = [
      "NORMAL",
      "PARTIAL_STATE",
      "NO_OP",
      "MULTI_DEVICE",
      "CONTEXT_SENSITIVE",
      "SECURITY",
      "AMBIGUOUS",
    ];

    expect(dashboardData.categoryAnalysis.length).toBe(7);

    const categoriesOnRecord = dashboardData.categoryAnalysis.map(
      (c) => c.category
    );
    for (const expected of expectedCategories) {
      expect(categoriesOnRecord).toContain(expected);
    }

    const totalScenariosAcrossCats = dashboardData.categoryAnalysis.reduce(
      (sum, c) => sum + c.scenarioCount,
      0
    );
    expect(totalScenariosAcrossCats).toBe(36);
  });

  // 7. LATENCY DATA EXISTS
  it("7. should verify latency data contains percentiles and distribution buckets", () => {
    const layaLat = dashboardData.latencyAnalysis["LAYA"];
    const llmLat = dashboardData.latencyAnalysis["LLM"];

    expect(layaLat).toBeDefined();
    expect(llmLat).toBeDefined();

    expect(layaLat.decisionLatencyMs.percentiles).toBeDefined();
    expect(layaLat.decisionLatencyMs.percentiles?.p50).toBeGreaterThan(0);
    expect(layaLat.decisionLatencyMs.percentiles?.p99).toBeGreaterThan(0);

    expect(llmLat.decisionLatencyMs.percentiles).toBeDefined();
    expect(llmLat.decisionLatencyMs.percentiles?.p50).toBeGreaterThan(0);
    expect(llmLat.decisionLatencyMs.percentiles?.p99).toBeGreaterThan(0);

    expect(layaLat.distributionBuckets["< 20s"]).toBeDefined();
    expect(llmLat.distributionBuckets["60s - 90s"]).toBeDefined();
  });

  // 8. RELIABILITY DATA EXISTS
  it("8. should verify reliability data preserves unsupported != failure taxonomy", () => {
    const layaRel = dashboardData.reliabilityAnalysis["LAYA"];
    const llmRel = dashboardData.reliabilityAnalysis["LLM"];

    expect(layaRel.totalExecutions).toBe(180);
    expect(layaRel.successfulExecutions).toBe(170);
    expect(layaRel.unsupportedExecutions).toBe(10);
    expect(layaRel.failedExecutions).toBe(0);

    expect(llmRel.totalExecutions).toBe(180);
    expect(llmRel.successfulExecutions).toBe(176);
    expect(llmRel.unsupportedExecutions).toBe(0);
    expect(llmRel.failedExecutions).toBe(4);
    expect(llmRel.failures.length).toBe(4);
  });

  // 9. REPETITION CONSISTENCY DATA EXISTS
  it("9. should verify repetition consistency data across all 36 scenarios", () => {
    const layaCons = dashboardData.providerSummaries["LAYA"].repetitionConsistency;
    const llmCons = dashboardData.providerSummaries["LLM"].repetitionConsistency;

    expect(layaCons.totalScenarios).toBe(36);
    expect(layaCons.actionConsistencyRate).toBe(1.0); // 36 / 36
    expect(layaCons.scenariosWithIdenticalActions).toBe(36);

    expect(llmCons.totalScenarios).toBe(36);
    expect(llmCons.scenariosWithIdenticalActions).toBe(19);
    expect(llmCons.actionConsistencyRate).toBe(0.5278);
    expect(llmCons.scenariosWithIdenticalAccuracy).toBe(29);
    expect(llmCons.accuracyConsistencyRate).toBe(0.8056);
  });

  // 10. MISSING ARTIFACT HANDLING
  it("10. should safely handle and reject missing artifact directories", () => {
    const emptyTempDir = fs.mkdtempSync(
      path.join(os.tmpdir(), "homemind-empty-analysis-")
    );

    try {
      expect(() => loadDashboardAnalysisData(emptyTempDir)).toThrow(
        /missing required file/
      );
    } finally {
      fs.rmSync(emptyTempDir, { recursive: true, force: true });
    }
  });

  // 11. MALFORMED DATA HANDLING
  it("11. should safely handle malformed JSON or hash mismatch integrity errors", () => {
    const tempDir = fs.mkdtempSync(
      path.join(os.tmpdir(), "homemind-bad-analysis-")
    );

    try {
      // Write corrupted manifest
      fs.writeFileSync(
        path.join(tempDir, "baseline-analysis-manifest.json"),
        JSON.stringify({
          datasetHash: "tampered_fake_hash_12345",
          datasetScenarioCount: 36,
        }),
        "utf-8"
      );

      // Create other empty files
      fs.writeFileSync(path.join(tempDir, "provider-summary.json"), "{}", "utf-8");
      fs.writeFileSync(path.join(tempDir, "scenario-analysis.json"), "[]", "utf-8");
      fs.writeFileSync(path.join(tempDir, "category-analysis.json"), "[]", "utf-8");
      fs.writeFileSync(path.join(tempDir, "latency-analysis.json"), "{}", "utf-8");
      fs.writeFileSync(path.join(tempDir, "reliability-analysis.json"), "{}", "utf-8");

      expect(() => loadDashboardAnalysisData(tempDir)).toThrow(
        /dataset hash mismatch/
      );
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  // 12. NO COMPETITIVE FIELDS
  it("12. should strictly maintain provider neutrality with zero competitive fields", () => {
    const forbiddenCompetitiveKeys = [
      "winner",
      "rank",
      "ranking",
      "score",
      "overallScore",
      "compositeScore",
      "bestProvider",
      "leaderboard",
    ];

    const checkNoForbiddenKeys = (obj: unknown, pathTrail: string = "") => {
      if (!obj || typeof obj !== "object") return;

      if (Array.isArray(obj)) {
        obj.forEach((item, idx) => checkNoForbiddenKeys(item, `${pathTrail}[${idx}]`));
        return;
      }

      for (const [key, val] of Object.entries(obj)) {
        for (const forbidden of forbiddenCompetitiveKeys) {
          expect(
            key.toLowerCase(),
            `Forbidden competitive key "${key}" found at ${pathTrail}.${key}`
          ).not.toBe(forbidden.toLowerCase());
        }
        checkNoForbiddenKeys(val, `${pathTrail}.${key}`);
      }
    };

    checkNoForbiddenKeys(dashboardData, "DashboardData");
  });
});
