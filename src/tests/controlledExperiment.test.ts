import { describe, it, expect, vi } from "vitest";
import {
  computeDatasetHash,
  calculateMean,
  calculateMedian,
  calculateMin,
  calculateMax,
  calculateStandardDeviation,
  computeMetricDistribution,
  computeProviderAggregates,
  runPreFlightValidation,
  runPreFlightDryRun,
  runControlledExperiment,
  saveControlledExperimentReport,
} from "@/lib/evaluation/comparison/experiment";
import { getAllEvaluationScenarios, getEvaluationScenario } from "@/lib/evaluation/dataset";
import { ComparativeProviderEntry, ControlledExperimentReport } from "@/lib/evaluation/comparison/types";
import { DecisionEngine } from "@/types/engine";
import fs from "fs";
import path from "path";

describe("Milestone 3.8 — Controlled Empirical Experiment Protocol & Infrastructure", () => {
  const allScenarios = getAllEvaluationScenarios();

  describe("Dataset Immutability & SHA-256 Hashing", () => {
    it("should compute a deterministic 64-character hex hash over the 36-scenario dataset", () => {
      const hash1 = computeDatasetHash(allScenarios);
      const hash2 = computeDatasetHash(allScenarios);

      expect(hash1).toHaveLength(64);
      expect(hash1).toMatch(/^[a-f0-9]{64}$/);
      expect(hash1).toBe(hash2);
    });

    it("should produce the identical hash regardless of scenario input ordering", () => {
      const reversed = [...allScenarios].reverse();
      const hashOriginal = computeDatasetHash(allScenarios);
      const hashReversed = computeDatasetHash(reversed);

      expect(hashOriginal).toBe(hashReversed);
    });

    it("should detect mutations to scenario intent or initial state", () => {
      const cloned = JSON.parse(JSON.stringify(allScenarios));
      cloned[0].intent = "mutated intent";

      const hashOriginal = computeDatasetHash(allScenarios);
      const hashMutated = computeDatasetHash(cloned);

      expect(hashOriginal).not.toBe(hashMutated);
    });
  });

  describe("Descriptive Statistics Math", () => {
    it("should compute mean, median, min, max, and standard deviation accurately", () => {
      const samples = [10, 20, 30, 40, 50];

      expect(calculateMean(samples)).toBe(30);
      expect(calculateMedian(samples)).toBe(30);
      expect(calculateMin(samples)).toBe(10);
      expect(calculateMax(samples)).toBe(50);
      expect(calculateStandardDeviation(samples)).toBe(15.81);
    });

    it("should handle even-length arrays for median calculation", () => {
      const samples = [10, 20, 30, 40];
      expect(calculateMedian(samples)).toBe(25);
    });

    it("should handle empty and single-element edge cases gracefully", () => {
      expect(calculateMean([])).toBe(0);
      expect(calculateMedian([])).toBe(0);
      expect(calculateMin([])).toBe(0);
      expect(calculateMax([])).toBe(0);
      expect(calculateStandardDeviation([])).toBe(0);

      expect(calculateMean([42])).toBe(42);
      expect(calculateMedian([42])).toBe(42);
      expect(calculateMin([42])).toBe(42);
      expect(calculateMax([42])).toBe(42);
      expect(calculateStandardDeviation([42])).toBe(0);
    });

    it("should generate a complete DescriptiveMetricDistribution object", () => {
      const dist = computeMetricDistribution([5, 15, 25]);
      expect(dist.count).toBe(3);
      expect(dist.mean).toBe(15);
      expect(dist.median).toBe(15);
      expect(dist.min).toBe(5);
      expect(dist.max).toBe(25);
      expect(dist.standardDeviation).toBe(10);
    });
  });

  describe("Pre-Flight Validation Protocol (Part 21)", () => {
    it("should contain exactly 15 sequential pre-flight check items", async () => {
      const result = await runPreFlightValidation({
        scenarios: allScenarios,
        repetitions: 5,
        gitCommitHash: "0123456789abcdef0123456789abcdef01234567",
      });

      expect(result.checks).toHaveLength(15);
      expect(result.checks.map((c) => c.id)).toEqual([
        1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
      ]);
    });

    it("should verify dataset count is strictly 36 in check 3", async () => {
      const result = await runPreFlightValidation({
        scenarios: allScenarios.slice(0, 10),
        repetitions: 5,
      });

      const check3 = result.checks.find((c) => c.id === 3);
      expect(check3?.passed).toBe(false);
      expect(check3?.detail).toContain("expected 36");
    });

    it("should verify repetitions count is strictly 5 in check 9", async () => {
      const result = await runPreFlightValidation({
        scenarios: allScenarios,
        repetitions: 3,
      });

      const check9 = result.checks.find((c) => c.id === 9);
      expect(check9?.passed).toBe(false);
      expect(check9?.detail).toContain("expected 5");
    });

    it("should verify secret sanitizer in check 13", async () => {
      const result = await runPreFlightValidation({
        scenarios: allScenarios,
        repetitions: 5,
      });

      const check13 = result.checks.find((c) => c.id === 13);
      expect(check13?.passed).toBe(true);
    });
  });

  describe("Pre-Flight Dry Run Orchestration (Part 22)", () => {
    it("should execute 36 scenarios with 5 repetitions across 2 mock providers without network calls", async () => {
      const dryReport = await runPreFlightDryRun(allScenarios);

      expect(dryReport.protocol.datasetScenarioCount).toBe(36);
      expect(dryReport.protocol.repetitions).toBe(5);
      expect(dryReport.protocol.providerIds).toEqual(["JEV", "LLM"]);
      expect(dryReport.scenarioResults).toHaveLength(36);

      // Verify each scenario has 5 repetitions
      for (const sResult of dryReport.scenarioResults) {
        expect(sResult.repetitions).toHaveLength(5);
        for (const rep of sResult.repetitions) {
          expect(rep.providers).toHaveLength(2);
          const jevRun = rep.providers.find((p) => p.providerId === "JEV");
          const llmRun = rep.providers.find((p) => p.providerId === "LLM");
          expect(jevRun).toBeDefined();
          expect(llmRun).toBeDefined();
        }
      }
    });

    it("should maintain identical initialStateFingerprint across repetitions and providers", async () => {
      const dryReport = await runPreFlightDryRun(allScenarios.slice(0, 3));

      for (const sResult of dryReport.scenarioResults) {
        const canonicalFingerprint = sResult.initialStateFingerprint;
        expect(canonicalFingerprint).toHaveLength(64);

        for (const rep of sResult.repetitions) {
          for (const prov of rep.providers) {
            expect(prov.initialStateFingerprint).toBe(canonicalFingerprint);
          }
        }
      }
    });

    it("should mark unsupported scenarios as UNSUPPORTED for Jev across all repetitions", async () => {
      const dryReport = await runPreFlightDryRun(allScenarios);

      const lockdownResult = dryReport.scenarioResults.find(
        (s) => s.scenarioId === "security-lockdown-01"
      );
      expect(lockdownResult).toBeDefined();

      for (const rep of lockdownResult!.repetitions) {
        const jevRun = rep.providers.find((p) => p.providerId === "JEV");
        expect(jevRun?.status).toBe("UNSUPPORTED");
        expect(jevRun?.unsupportedReason).toBeDefined();
        expect(jevRun?.executableActions).toEqual([]);
        expect(jevRun?.evaluationResult).toBeNull();
      }
    });

    it("should record simulated failures as SUPPORTED_FAILURE with errorPhase", async () => {
      const dryReport = await runPreFlightDryRun(allScenarios.slice(0, 2));

      // Dry run mock injects a simulated failure on call 3 of LLM
      const allLLMRuns = dryReport.scenarioResults.flatMap((s) =>
        s.repetitions.flatMap((r) => r.providers.filter((p) => p.providerId === "LLM"))
      );

      const failedRuns = allLLMRuns.filter((r) => r.status === "SUPPORTED_FAILURE");
      expect(failedRuns.length).toBeGreaterThanOrEqual(1);
      expect(failedRuns[0].errorPhase).toBe("DECISION");
      expect(failedRuns[0].error).toContain("Simulated dry-run transient error");
      expect(failedRuns[0].evaluationResult).toBeNull();
    });

    it("should compute independent descriptive aggregates without composite scores or rankings", async () => {
      const dryReport = await runPreFlightDryRun(allScenarios.slice(0, 5));

      expect(dryReport.aggregates).toHaveLength(2);
      const jevAgg = dryReport.aggregates.find((a) => a.providerId === "JEV");
      const llmAgg = dryReport.aggregates.find((a) => a.providerId === "LLM");

      expect(jevAgg).toBeDefined();
      expect(llmAgg).toBeDefined();

      expect(jevAgg?.coverage.totalScenarios).toBe(5);
      expect(jevAgg?.coverage.totalRepetitionAttempts).toBe(25); // 5 scenarios * 5 repetitions

      // Ensure NO composite score or winner exists
      expect((dryReport as any).winner).toBeUndefined();
      expect((dryReport as any).overallScore).toBeUndefined();
      expect((dryReport as any).ranking).toBeUndefined();
      expect((dryReport as any).JevScore).toBeUndefined();
      expect((dryReport as any).LLMScore).toBeUndefined();
    });
  });

  describe("Controlled Scenario Runner Isolation & Action Accounting", () => {
    it("should provide deep-cloned state isolation for each repetition", async () => {
      const scenario = getEvaluationScenario("normal-sleep-01")!;
      let observedInitialStates: any[] = [];

      const trackingEngine: DecisionEngine = {
        id: "tracking-engine",
        name: "Tracking Engine",
        provider: "JEV",
        evaluate: async (intent, homeState) => {
          // Mutate the passed homeState to test isolation
          homeState.simulationTime = "MUTATED_TIME";
          observedInitialStates.push(JSON.parse(JSON.stringify(homeState)));
          return {
            engineId: "tracking-engine",
            source: "JEV",
            intent,
            actions: [],
            confidence: 1.0,
            decisionTimeMs: 5,
            timestamp: new Date().toISOString(),
          };
        },
      };

      const mockLLM: DecisionEngine = {
        id: "mock-llm",
        name: "Mock LLM",
        provider: "LLM",
        evaluate: async (intent) => ({
          engineId: "mock-llm",
          source: "LLM",
          intent,
          actions: [],
          decisionTimeMs: 5,
          timestamp: new Date().toISOString(),
        }),
      };

      const providers: ComparativeProviderEntry[] = [
        {
          providerId: "JEV",
          engine: trackingEngine,
          isScenarioSupported: () => true,
        },
        {
          providerId: "LLM",
          engine: mockLLM,
          isScenarioSupported: () => true,
        },
      ];

      await runControlledExperiment([scenario], providers, { repetitions: 3 });

      // Canonical scenario initial state must remain pristine
      expect(scenario.initialState.simulationTime).not.toBe("MUTATED_TIME");
      expect(observedInitialStates).toHaveLength(3);
    });

    it("should preserve proposedActions, executableActions, and skippedRedundantActions", async () => {
      const scenario = getEvaluationScenario("normal-sleep-01")!;

      const mockEngine: DecisionEngine = {
        id: "mock-redundancy-engine",
        name: "Mock Redundancy Engine",
        provider: "LLM",
        evaluate: async (intent) => ({
          engineId: "mock-redundancy-engine",
          source: "LLM",
          intent,
          decisionTimeMs: 10,
          actions: [
            {
              id: "act-1",
              source: "LLM",
              timestamp: new Date().toISOString(),
              deviceId: "light_living_room",
              actionType: "TURN_OFF",
              value: null,
              reasoning: "Turn off",
            },
          ],
          timestamp: new Date().toISOString(),
          metadata: {
            proposedActions: [
              { deviceId: "light_living_room", actionType: "TURN_OFF", value: null },
              { deviceId: "lock_main_door", actionType: "LOCK", value: null },
            ],
            skippedRedundantActions: [
              { deviceId: "lock_main_door", actionType: "LOCK", value: null },
            ],
          },
        }),
      };

      const providers: ComparativeProviderEntry[] = [
        {
          providerId: "LLM",
          engine: mockEngine,
          isScenarioSupported: () => true,
        },
      ];

      const report = await runControlledExperiment([scenario], providers, {
        mode: "LLM_ONLY_READINESS",
        repetitions: 1,
      });
      const run = report.scenarioResults[0].repetitions[0].providers[0];

      expect(run.executableActions).toHaveLength(1);
      expect(run.proposedActions).toHaveLength(2);
      expect(run.skippedRedundantActions).toHaveLength(1);
    });
  });

  describe("Provider Availability & Multi-Mode Experiment Protocol", () => {
    it("should strictly match the reference dataset hash and 36 scenario count", () => {
      expect(allScenarios).toHaveLength(36);
      const hash = computeDatasetHash(allScenarios);
      expect(hash).toBe("66de3242d1ba6583dc385a2999f8f8ba556a1f52cf5862cc7f223c9cdbfc0329");
    });

    it("should classify missing TYPESAFE_API_KEY as UNAVAILABLE_CONFIGURATION in pre-flight", async () => {
      const originalKey = process.env.TYPESAFE_API_KEY;
      delete process.env.TYPESAFE_API_KEY;

      try {
        const preflight = await runPreFlightValidation({
          scenarios: allScenarios,
          repetitions: 5,
          mode: "FULL_COMPARISON",
        });

        expect(preflight.providerAvailability["JEV"].status).toBe("UNAVAILABLE_CONFIGURATION");
        const check6 = preflight.checks.find((c) => c.id === 6);
        expect(check6?.passed).toBe(false);
        expect(check6?.detail).toContain("UNAVAILABLE_CONFIGURATION");
      } finally {
        if (originalKey) {
          process.env.TYPESAFE_API_KEY = originalKey;
        }
      }
    });

    it("should pass check 6 as N/A in LLM_ONLY_READINESS mode even when Jev key is missing", async () => {
      const originalKey = process.env.TYPESAFE_API_KEY;
      delete process.env.TYPESAFE_API_KEY;

      try {
        const preflight = await runPreFlightValidation({
          scenarios: allScenarios,
          repetitions: 5,
          mode: "LLM_ONLY_READINESS",
        });

        const check6 = preflight.checks.find((c) => c.id === 6);
        expect(check6?.passed).toBe(true);
        expect(check6?.detail).toContain("N/A — LLM_ONLY_READINESS");
      } finally {
        if (originalKey) {
          process.env.TYPESAFE_API_KEY = originalKey;
        }
      }
    });

    it("should safely halt FULL_COMPARISON when Jev is unavailable without generating partial results", async () => {
      const originalKey = process.env.TYPESAFE_API_KEY;
      delete process.env.TYPESAFE_API_KEY;

      try {
        const scenario = getEvaluationScenario("normal-sleep-01")!;
        const { JevDecisionEngine } = await import("@/lib/jev/JevDecisionEngine");
        const { LLMDecisionEngine } = await import("@/lib/llm/LLMDecisionEngine");

        const jevEngine = new JevDecisionEngine();
        const llmEngine = new LLMDecisionEngine();

        const providers: ComparativeProviderEntry[] = [
          { providerId: "JEV", engine: jevEngine, isScenarioSupported: () => true },
          { providerId: "LLM", engine: llmEngine, isScenarioSupported: () => true },
        ];

        await expect(
          runControlledExperiment([scenario], providers, { mode: "FULL_COMPARISON" })
        ).rejects.toThrow(/Cannot execute FULL_COMPARISON mode: Provider 'JEV' is unavailable/);
      } finally {
        if (originalKey) {
          process.env.TYPESAFE_API_KEY = originalKey;
        }
      }
    });

    it("should throw in runControlledExperiment if mode is PREFLIGHT_ONLY", async () => {
      const scenario = getEvaluationScenario("normal-sleep-01")!;
      await expect(
        runControlledExperiment([scenario], [], { mode: "PREFLIGHT_ONLY" })
      ).rejects.toThrow("Cannot execute scenario evaluations in PREFLIGHT_ONLY mode.");
    });

    it("should execute LLM_ONLY_READINESS with zero Jev observations and include explicit disclaimer", async () => {
      const scenario = getEvaluationScenario("normal-sleep-01")!;
      const mockLLM: DecisionEngine = {
        id: "mock-llm-readiness",
        name: "Mock LLM Readiness",
        provider: "LLM",
        evaluate: async (intent) => ({
          engineId: "mock-llm-readiness",
          source: "LLM",
          intent,
          actions: [],
          decisionTimeMs: 15,
          timestamp: new Date().toISOString(),
        }),
      };

      const providers: ComparativeProviderEntry[] = [
        {
          providerId: "LLM",
          engine: mockLLM,
          isScenarioSupported: () => true,
        },
      ];

      const report = await runControlledExperiment([scenario], providers, {
        mode: "LLM_ONLY_READINESS",
        repetitions: 2,
      });

      expect(report.mode).toBe("LLM_ONLY_READINESS");
      expect(report.disclaimer).toContain("NOT A JEV VS LLM COMPARISON");
      expect(report.protocol.providerIds).toEqual(["LLM"]);
      expect(report.protocol.jevConfiguration).toBeUndefined();
      expect(report.aggregates).toHaveLength(1);
      expect(report.aggregates[0].providerId).toBe("LLM");

      for (const sResult of report.scenarioResults) {
        for (const rep of sResult.repetitions) {
          expect(rep.providers).toHaveLength(1);
          expect(rep.providers[0].providerId).toBe("LLM");
          const jevEntry = rep.providers.find((p) => p.providerId === "JEV");
          expect(jevEntry).toBeUndefined();
        }
      }
    });

    it("should verify that Jev integration code contains zero OpenRouter or proxy references", () => {
      const jevFiles = [
        path.resolve(process.cwd(), "src/lib/jev/JevDecisionEngine.ts"),
        path.resolve(process.cwd(), "src/lib/typesafe/client.ts"),
        path.resolve(process.cwd(), "src/lib/typesafe/types.ts"),
      ];

      for (const filePath of jevFiles) {
        const content = fs.readFileSync(filePath, "utf-8");
        expect(content).not.toMatch(/openrouter/i);
        expect(content).not.toMatch(/gpt-4/i);
        expect(content).not.toMatch(/claude/i);
      }
    });

    it("should produce distinct filenames for full, llm-only, and dryrun artifacts", () => {
      const testDir = path.resolve(process.cwd(), "artifacts/benchmarks");

      const baseProtocol = {
        datasetVersion: "v1.0",
        datasetScenarioCount: 1,
        datasetHash: "mock_hash",
        repetitions: 1,
        providerIds: ["LLM"],
        llmConfiguration: {
          engineId: "llm",
          engineName: "LLM",
          model: "llama3.2:3b",
          baseUrl: "http://127.0.0.1:11434",
          timeoutMs: 30000,
          promptVersion: "v1",
          temperature: 0.0,
        },
        timeoutConfiguration: { jevTimeoutMs: 15000, llmTimeoutMs: 30000, perScenarioTimeoutMs: 45000 },
        executionOrder: "SEQUENTIAL",
        gitCommitHash: "0123456789abcdef0123456789abcdef01234567",
        startedAt: new Date().toISOString(),
      };

      const fullReport: ControlledExperimentReport = {
        experimentId: "id1",
        mode: "FULL_COMPARISON",
        generatedAt: new Date().toISOString(),
        protocol: { ...baseProtocol, mode: "FULL_COMPARISON" },
        scenarioResults: [],
        aggregates: [],
      };

      const llmReport: ControlledExperimentReport = {
        experimentId: "id2",
        mode: "LLM_ONLY_READINESS",
        disclaimer: "NOT A JEV VS LLM COMPARISON",
        generatedAt: new Date().toISOString(),
        protocol: { ...baseProtocol, mode: "LLM_ONLY_READINESS" },
        scenarioResults: [],
        aggregates: [],
      };

      const dryReport: ControlledExperimentReport = {
        experimentId: "dryrun_id3",
        mode: "FULL_COMPARISON",
        generatedAt: new Date().toISOString(),
        protocol: { ...baseProtocol, mode: "FULL_COMPARISON" },
        scenarioResults: [],
        aggregates: [],
      };

      const resFull = saveControlledExperimentReport(fullReport, testDir);
      const resLLM = saveControlledExperimentReport(llmReport, testDir);
      const resDry = saveControlledExperimentReport(dryReport, testDir);

      expect(path.basename(resFull.filePath)).toBe("controlled-experiment-full_id1.json");
      expect(path.basename(resLLM.filePath)).toBe("controlled-experiment-llm-only_id2.json");
      expect(path.basename(resDry.filePath)).toBe("controlled-experiment-dryrun_dryrun_id3.json");

      // Clean up test files
      fs.unlinkSync(resFull.filePath);
      fs.unlinkSync(resLLM.filePath);
      fs.unlinkSync(resDry.filePath);
    });
  });

  describe("Report Serialization & Credential Sanitization", () => {
    it("should serialize report and successfully save without credential leakage", () => {
      const mockReport: ControlledExperimentReport = {
        experimentId: "test_save_01",
        mode: "FULL_COMPARISON",
        generatedAt: new Date().toISOString(),
        protocol: {
          mode: "FULL_COMPARISON",
          datasetVersion: "v1.0",
          datasetScenarioCount: 1,
          datasetHash: "mock_hash_12345",
          repetitions: 1,
          providerIds: ["JEV"],
          jevConfiguration: {
            engineId: "jev",
            engineName: "Jev",
            defaultModel: "jev-latest",
            baseUrl: "https://api.typesafe.ai",
            timeoutMs: 15000,
          },
          llmConfiguration: {
            engineId: "llm",
            engineName: "LLM",
            model: "llama3.2:3b",
            baseUrl: "http://127.0.0.1:11434",
            timeoutMs: 30000,
            promptVersion: "v1",
            temperature: 0.0,
          },
          timeoutConfiguration: { jevTimeoutMs: 15000, llmTimeoutMs: 30000, perScenarioTimeoutMs: 45000 },
          executionOrder: "SEQUENTIAL",
          gitCommitHash: "0123456789abcdef0123456789abcdef01234567",
          startedAt: new Date().toISOString(),
        },
        scenarioResults: [],
        aggregates: [],
      };

      const testDir = path.resolve(process.cwd(), "artifacts/benchmarks");
      const { filePath, sanitizedJson } = saveControlledExperimentReport(mockReport, testDir);

      expect(fs.existsSync(filePath)).toBe(true);
      expect(sanitizedJson).not.toMatch(/api_key/i);
      expect(sanitizedJson).not.toMatch(/bearer\s+eyJ/i);

      // Clean up test file
      fs.unlinkSync(filePath);
    });
  });
});
