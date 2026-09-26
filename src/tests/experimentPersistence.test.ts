import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import fs from "fs";
import path from "path";
import {
  ExperimentPersistenceManager,
  buildExecutionId,
  observationToRecord,
  recordToObservation,
  appendExecutionRecordSync,
  loadExecutionRecordsSync,
  saveManifestSync,
  loadManifestSync,
  validateManifestForResume,
  reconstructExperimentReport,
  findLatestIncompleteExperiment,
  PersistenceError,
  DuplicateExecutionError,
  IncompatibleExperimentError,
  MalformedRecordError,
} from "@/lib/evaluation/comparison/persistence";
import {
  computeDatasetHash,
  runControlledExperiment,
} from "@/lib/evaluation/comparison/experiment";
import {
  ComparativeProviderEntry,
  ControlledExperimentReport,
  ExperimentManifest,
  PersistedExecutionRecord,
} from "@/lib/evaluation/comparison/types";
import { EvaluationScenario } from "@/lib/evaluation/types";
import { getEvaluationScenario } from "@/lib/evaluation/dataset";
import { DecisionEngine } from "@/types/engine";

// =============================================================================
// Test Fixtures
// =============================================================================

const mockScenario1: EvaluationScenario = getEvaluationScenario("normal-sleep-01")!;
const mockScenario2: EvaluationScenario = getEvaluationScenario("normal-leave-01")!;
const testScenarios: EvaluationScenario[] = [mockScenario1, mockScenario2];

function createMockEngine(id: string, provider: "LAYA" | "JEV" | "LLM"): DecisionEngine {
  return {
    id,
    name: `Mock Engine ${id} [DRY-RUN MOCK]`,
    provider,
    evaluate: async (intent: string) => ({
      engineId: id,
      source: provider,
      intent,
      actions: [],
      decisionTimeMs: 12,
      timestamp: new Date().toISOString(),
      metadata: {
        checkpoint: "test-checkpoint",
        repository: "test-repo",
      },
    }),
  };
}

describe("Milestone 3.10A — Experiment Persistence & Recovery Hardening", () => {
  let testBaseDir: string;

  beforeEach(() => {
    testBaseDir = path.resolve(
      process.cwd(),
      "artifacts",
      "benchmarks",
      `test-persistence-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
    );
    if (!fs.existsSync(testBaseDir)) {
      fs.mkdirSync(testBaseDir, { recursive: true });
    }
  });

  afterEach(() => {
    if (fs.existsSync(testBaseDir)) {
      fs.rmSync(testBaseDir, { recursive: true, force: true });
    }
  });

  // ---------------------------------------------------------------------------
  // TEST 1: Immediate persistence of records after each execution
  // ---------------------------------------------------------------------------
  describe("TEST 1: Immediate Record Persistence", () => {
    it("should immediately write and fsync every execution record to disk upon completion", async () => {
      const persistedRecords: PersistedExecutionRecord[] = [];
      const layaEngine = createMockEngine("laya-mock", "LAYA");
      const provider: ComparativeProviderEntry = {
        providerId: "LAYA",
        engine: layaEngine,
        isScenarioSupported: () => true,
      };

      const expDir = path.join(testBaseDir, "immediate-test");
      const runsPath = path.join(expDir, "runs.jsonl");

      await runControlledExperiment([mockScenario1], [provider], {
        mode: "LAYA_ONLY_READINESS",
        repetitions: 2,
        persistenceDir: expDir,
        onRecordPersisted: (rec) => {
          persistedRecords.push(rec);
          // Verify runs.jsonl exists and contains this record immediately
          expect(fs.existsSync(runsPath)).toBe(true);
          const lines = fs.readFileSync(runsPath, "utf-8").trim().split("\n");
          expect(lines.length).toBe(persistedRecords.length);
          const lastLine = JSON.parse(lines[lines.length - 1]);
          expect(lastLine.executionId).toBe(rec.executionId);
        },
      });

      expect(persistedRecords).toHaveLength(2);
      expect(persistedRecords[0].repetition).toBe(1);
      expect(persistedRecords[1].repetition).toBe(2);

      // Verify the persisted JSONL contains valid records
      const onDiskRecords = loadExecutionRecordsSync(runsPath);
      expect(onDiskRecords).toHaveLength(2);
      expect(onDiskRecords[0].scenarioId).toBe(mockScenario1.id);
      expect(onDiskRecords[0].providerId).toBe("LAYA");
      expect(onDiskRecords[0].timing).toBeDefined();
    });
  });

  // ---------------------------------------------------------------------------
  // TEST 2: Process interruption simulation (N executions persist and survive)
  // ---------------------------------------------------------------------------
  describe("TEST 2: Process Interruption Simulation", () => {
    it("should persist all completed executions up to the point of simulated process termination", async () => {
      const expDir = path.join(testBaseDir, "interrupt-test");
      let executionCount = 0;

      const engine = createMockEngine("interrupt-engine", "LAYA");
      const provider: ComparativeProviderEntry = {
        providerId: "LAYA",
        engine,
        isScenarioSupported: () => true,
      };

      // 2 scenarios * 2 repetitions = 4 total planned executions
      // Should fail right after the 2nd execution is persisted
      await expect(
        runControlledExperiment(testScenarios, [provider], {
          mode: "LAYA_ONLY_READINESS",
          repetitions: 2,
          persistenceDir: expDir,
          onRecordPersisted: () => {
            executionCount++;
            if (executionCount === 2) {
              throw new Error("SIMULATED_PROCESS_TERMINATION_OR_CRASH");
            }
          },
        })
      ).rejects.toThrow("SIMULATED_PROCESS_TERMINATION_OR_CRASH");

      // Verify that manifest is IN_PROGRESS
      const manifestPath = path.join(expDir, "manifest.json");
      expect(fs.existsSync(manifestPath)).toBe(true);
      const manifest = loadManifestSync(manifestPath);
      expect(manifest.status).toBe("IN_PROGRESS");
      expect(manifest.completedAt).toBeUndefined();

      // Verify exactly 2 records were durably written to runs.jsonl
      const runsPath = path.join(expDir, "runs.jsonl");
      expect(fs.existsSync(runsPath)).toBe(true);
      const records = loadExecutionRecordsSync(runsPath);
      expect(records).toHaveLength(2);
      expect(records[0].scenarioId).toBe(mockScenario1.id);
      expect(records[0].repetition).toBe(1);
      expect(records[1].scenarioId).toBe(mockScenario1.id);
      expect(records[1].repetition).toBe(2);
    });
  });

  // ---------------------------------------------------------------------------
  // TEST 3: Resume skips completed executions and runs only missing pairs
  // ---------------------------------------------------------------------------
  describe("TEST 3: Resume Completed Records", () => {
    it("should resume an interrupted experiment, skipping completed executions and running only missing pairs", async () => {
      const expDir = path.join(testBaseDir, "resume-test");
      let executionCount = 0;

      // Phase A: Runs 2 executions and fails on 2nd persisted record
      let phaseAEngineCalls = 0;
      const initialEngine: DecisionEngine = {
        id: "laya-resumable",
        name: "Laya Resumable [DRY-RUN MOCK]",
        provider: "LAYA",
        evaluate: async (intent: string) => {
          phaseAEngineCalls++;
          return {
            engineId: "laya-resumable",
            source: "LAYA",
            intent,
            actions: [],
            decisionTimeMs: 10,
            timestamp: new Date().toISOString(),
          };
        },
      };

      const initialProvider: ComparativeProviderEntry = {
        providerId: "LAYA",
        engine: initialEngine,
        isScenarioSupported: () => true,
      };

      await expect(
        runControlledExperiment(testScenarios, [initialProvider], {
          mode: "LAYA_ONLY_READINESS",
          repetitions: 2,
          persistenceDir: expDir,
          onRecordPersisted: () => {
            executionCount++;
            if (executionCount === 2) {
              throw new Error("ABORT_MIDWAY");
            }
          },
        })
      ).rejects.toThrow("ABORT_MIDWAY");

      expect(loadExecutionRecordsSync(path.join(expDir, "runs.jsonl"))).toHaveLength(2);
      expect(phaseAEngineCalls).toBe(2);

      // Phase B: Resume with working engine. Track how many new evaluations occur.
      let resumedEvaluations = 0;
      const resumedEngine: DecisionEngine = {
        id: "laya-resumable",
        name: "Laya Resumable [DRY-RUN MOCK]",
        provider: "LAYA",
        evaluate: async (intent: string) => {
          resumedEvaluations++;
          return {
            engineId: "laya-resumable",
            source: "LAYA",
            intent,
            actions: [],
            decisionTimeMs: 10,
            timestamp: new Date().toISOString(),
          };
        },
      };

      const resumedProvider: ComparativeProviderEntry = {
        providerId: "LAYA",
        engine: resumedEngine,
        isScenarioSupported: () => true,
      };

      const report = await runControlledExperiment(testScenarios, [resumedProvider], {
        mode: "LAYA_ONLY_READINESS",
        repetitions: 2,
        persistenceDir: expDir,
        resume: true,
      });

      // Exactly 2 remaining executions should have been evaluated (scenario 2, reps 1 and 2)
      expect(resumedEvaluations).toBe(2);

      // Total records in runs.jsonl should now be 4
      const allRecords = loadExecutionRecordsSync(path.join(expDir, "runs.jsonl"));
      expect(allRecords).toHaveLength(4);

      // Manifest should now be COMPLETED
      const manifest = loadManifestSync(path.join(expDir, "manifest.json"));
      expect(manifest.status).toBe("COMPLETED");
      expect(manifest.completedAt).toBeDefined();

      // Summary file should exist and match report
      expect(fs.existsSync(path.join(expDir, "summary.json"))).toBe(true);
      expect(report.scenarioResults).toHaveLength(2);
    });
  });

  // ---------------------------------------------------------------------------
  // TEST 4: Duplicate execution identity prevention/rejection
  // ---------------------------------------------------------------------------
  describe("TEST 4: Duplicate Execution Identity Prevention", () => {
    it("should reject invalid buildExecutionId parameters", () => {
      expect(() => buildExecutionId("", "scen-1", 1, "LAYA")).toThrow(PersistenceError);
      expect(() => buildExecutionId("exp-1", "", 1, "LAYA")).toThrow(PersistenceError);
      expect(() => buildExecutionId("exp-1", "scen-1", 0, "LAYA")).toThrow(PersistenceError);
      expect(() => buildExecutionId("exp-1", "scen-1", 1, "")).toThrow(PersistenceError);
    });

    it("should build deterministic unique execution identities", () => {
      const id = buildExecutionId("exp-001", "normal-sleep-01", 3, "LAYA");
      expect(id).toBe("exp-001:normal-sleep-01:3:LAYA");
    });

    it("should throw DuplicateExecutionError when appending a duplicate record in manager", () => {
      const expDir = path.join(testBaseDir, "dup-test");
      const manager = new ExperimentPersistenceManager(expDir);

      const manifest: ExperimentManifest = {
        experimentId: "test-dup-exp",
        mode: "LAYA_ONLY_READINESS",
        datasetVersion: "v1.0",
        datasetScenarioCount: 1,
        datasetHash: "dummy-hash",
        repetitions: 1,
        scheduledExecutions: 1,
        gitCommitHash: "0123456789abcdef0123456789abcdef01234567",
        persistenceFormat: "jsonl-v1",
        providerIds: ["LAYA"],
        providers: [{ providerId: "LAYA", engineId: "laya-engine" }],
        startedAt: new Date().toISOString(),
        status: "IN_PROGRESS",
      };

      manager.init(manifest);

      const record: PersistedExecutionRecord = {
        executionId: "test-dup-exp:normal-sleep-01:1:LAYA",
        experimentId: "test-dup-exp",
        scenarioId: "normal-sleep-01",
        scenarioCategory: "NORMAL",
        intent: "I'm going to sleep.",
        repetition: 1,
        providerId: "LAYA",
        engineId: "laya-engine",
        status: "SUPPORTED_SUCCESS",
        initialStateFingerprint: "fp123",
        simulatedActions: [],
        executableActions: [],
        proposedActions: [],
        skippedRedundantActions: [],
        simulationSuccess: true,
        simulationErrors: [],
        executedAt: new Date().toISOString(),
      };

      // First append succeeds
      manager.appendRecord(record);
      expect(manager.getCompletedCount()).toBe(1);

      // Second append with same scenario + rep + provider must throw DuplicateExecutionError
      expect(() => manager.appendRecord(record)).toThrow(DuplicateExecutionError);
    });

    it("should throw DuplicateExecutionError when loading a runs.jsonl file with duplicate execution IDs", () => {
      const filePath = path.join(testBaseDir, "corrupt-dup.jsonl");
      const record = {
        executionId: "exp:scen:1:LAYA",
        scenarioId: "scen",
        repetition: 1,
        providerId: "LAYA",
        engineId: "laya",
        status: "SUPPORTED_SUCCESS",
      };

      const line = JSON.stringify(record) + "\n";
      fs.writeFileSync(filePath, line + line, "utf-8"); // Duplicate lines

      expect(() => loadExecutionRecordsSync(filePath)).toThrow(DuplicateExecutionError);
    });
  });

  // ---------------------------------------------------------------------------
  // TEST 5: Dataset hash mutation blocks resume (IncompatibleExperimentError)
  // ---------------------------------------------------------------------------
  describe("TEST 5: Dataset Hash Mutation Detection", () => {
    it("should reject resume if dataset hash does not match manifest hash", () => {
      const manifest: ExperimentManifest = {
        experimentId: "hash-check-exp",
        mode: "LAYA_ONLY_READINESS",
        datasetVersion: "v1.0",
        datasetScenarioCount: 36,
        datasetHash: "original_64_character_hash_abcdef0123456789abcdef0123456789abcdef01",
        repetitions: 5,
        scheduledExecutions: 180,
        gitCommitHash: "0123456789abcdef0123456789abcdef01234567",
        persistenceFormat: "jsonl-v1",
        providerIds: ["LAYA"],
        providers: [{ providerId: "LAYA", engineId: "laya-mock" }],
        startedAt: new Date().toISOString(),
        status: "IN_PROGRESS",
      };

      expect(() =>
        validateManifestForResume(manifest, {
          datasetHash: "different_mutated_hash_abcdef0123456789abcdef0123456789abcdef01",
          datasetScenarioCount: 36,
          mode: "LAYA_ONLY_READINESS",
          providerIds: ["LAYA"],
          repetitions: 5,
        })
      ).toThrow(IncompatibleExperimentError);

      try {
        validateManifestForResume(manifest, {
          datasetHash: "different_hash",
          datasetScenarioCount: 36,
          mode: "LAYA_ONLY_READINESS",
          providerIds: ["LAYA"],
          repetitions: 5,
        });
      } catch (err: any) {
        expect(err.message).toContain("Dataset hash mismatch");
      }
    });
  });

  // ---------------------------------------------------------------------------
  // TEST 6: Provider / mode / repetition / scenario count mutation blocks resume
  // ---------------------------------------------------------------------------
  describe("TEST 6: Experiment Configuration Mutation Detection", () => {
    const baseManifest: ExperimentManifest = {
      experimentId: "mutation-check-exp",
      mode: "LAYA_ONLY_READINESS",
      datasetVersion: "v1.0",
      datasetScenarioCount: 36,
      datasetHash: "correct_hash",
      repetitions: 5,
      scheduledExecutions: 180,
      gitCommitHash: "0123456789abcdef0123456789abcdef01234567",
      persistenceFormat: "jsonl-v1",
      providerIds: ["LAYA"],
      providers: [{ providerId: "LAYA", engineId: "laya-mock" }],
      startedAt: new Date().toISOString(),
      status: "IN_PROGRESS",
    };

    it("should reject resume on scenario count mismatch", () => {
      expect(() =>
        validateManifestForResume(baseManifest, {
          datasetHash: "correct_hash",
          datasetScenarioCount: 18, // changed from 36
          mode: "LAYA_ONLY_READINESS",
          providerIds: ["LAYA"],
          repetitions: 5,
        })
      ).toThrow(/Scenario count mismatch/);
    });

    it("should reject resume on experiment mode mismatch", () => {
      expect(() =>
        validateManifestForResume(baseManifest, {
          datasetHash: "correct_hash",
          datasetScenarioCount: 36,
          mode: "FULL_COMPARISON", // changed from LAYA_ONLY_READINESS
          providerIds: ["LAYA"],
          repetitions: 5,
        })
      ).toThrow(/Experiment mode mismatch/);
    });

    it("should reject resume on repetition count mismatch", () => {
      expect(() =>
        validateManifestForResume(baseManifest, {
          datasetHash: "correct_hash",
          datasetScenarioCount: 36,
          mode: "LAYA_ONLY_READINESS",
          providerIds: ["LAYA"],
          repetitions: 3, // changed from 5
        })
      ).toThrow(/Repetition count mismatch/);
    });

    it("should reject resume on provider set mismatch", () => {
      expect(() =>
        validateManifestForResume(baseManifest, {
          datasetHash: "correct_hash",
          datasetScenarioCount: 36,
          mode: "LAYA_ONLY_READINESS",
          providerIds: ["LAYA", "JEV"], // changed from ["LAYA"]
          repetitions: 5,
        })
      ).toThrow(/Provider set mismatch/);
    });
  });

  // ---------------------------------------------------------------------------
  // TEST 7: Malformed / incomplete records in runs.jsonl are detected
  // ---------------------------------------------------------------------------
  describe("TEST 7: Malformed JSONL Record Detection", () => {
    it("should throw MalformedRecordError when runs.jsonl has invalid JSON syntax", () => {
      const filePath = path.join(testBaseDir, "invalid-json.jsonl");
      fs.writeFileSync(filePath, '{this is not valid json}\n', "utf-8");

      expect(() => loadExecutionRecordsSync(filePath)).toThrow(MalformedRecordError);
      try {
        loadExecutionRecordsSync(filePath);
      } catch (err: any) {
        expect(err.name).toBe("MalformedRecordError");
        expect(err.rawLine).toContain("{this is not valid json}");
      }
    });

    it("should throw MalformedRecordError when record is missing mandatory identity fields", () => {
      const filePath = path.join(testBaseDir, "missing-fields.jsonl");
      const badRecord = { someRandomProperty: true };
      fs.writeFileSync(filePath, JSON.stringify(badRecord) + "\n", "utf-8");

      expect(() => loadExecutionRecordsSync(filePath)).toThrow(MalformedRecordError);
      try {
        loadExecutionRecordsSync(filePath);
      } catch (err: any) {
        expect(err.message).toContain("missing mandatory execution identity fields");
      }
    });

    it("should ignore blank lines and whitespace gracefully in runs.jsonl", () => {
      const filePath = path.join(testBaseDir, "blank-lines.jsonl");
      const record = {
        executionId: "exp:scen:1:LAYA",
        scenarioId: "scen",
        repetition: 1,
        providerId: "LAYA",
        engineId: "laya",
        status: "SUPPORTED_SUCCESS",
      };

      fs.writeFileSync(
        filePath,
        `\n\n  \n${JSON.stringify(record)}\n\n   \n`,
        "utf-8"
      );

      const records = loadExecutionRecordsSync(filePath);
      expect(records).toHaveLength(1);
      expect(records[0].executionId).toBe("exp:scen:1:LAYA");
    });
  });

  // ---------------------------------------------------------------------------
  // TEST 8: Summary reconstruction from manifest.json + runs.jsonl
  // ---------------------------------------------------------------------------
  describe("TEST 8: Summary Reconstruction", () => {
    it("should reconstruct an identical full ControlledExperimentReport from disk artifacts", async () => {
      const expDir = path.join(testBaseDir, "reconstruct-test");
      const layaEngine = createMockEngine("laya-mock", "LAYA");
      const provider: ComparativeProviderEntry = {
        providerId: "LAYA",
        engine: layaEngine,
        isScenarioSupported: () => true,
      };

      const originalReport = await runControlledExperiment(testScenarios, [provider], {
        mode: "LAYA_ONLY_READINESS",
        repetitions: 2,
        persistenceDir: expDir,
      });

      // Reconstruct report independently using reconstructExperimentReport
      const reconstructed = reconstructExperimentReport(expDir, testScenarios);

      expect(reconstructed.experimentId).toBe(originalReport.experimentId);
      expect(reconstructed.mode).toBe("LAYA_ONLY_READINESS");
      expect(reconstructed.protocol.providerIds).toEqual(["LAYA"]);
      expect(reconstructed.scenarioResults).toHaveLength(2);
      expect(reconstructed.aggregates).toHaveLength(1);
      expect(reconstructed.aggregates[0].providerId).toBe("LAYA");
      expect(reconstructed.aggregates[0].coverage.totalRepetitionAttempts).toBe(4); // 2 scenarios * 2 reps

      // Check scenario structure
      for (let i = 0; i < testScenarios.length; i++) {
        const origScen = originalReport.scenarioResults[i];
        const reconScen = reconstructed.scenarioResults[i];
        expect(reconScen.scenarioId).toBe(origScen.scenarioId);
        expect(reconScen.repetitions).toHaveLength(2);
        expect(reconScen.repetitions[0].providers[0].providerId).toBe("LAYA");
      }

      // Check summary.json save and read
      const manager = new ExperimentPersistenceManager(expDir);
      const summaryFile = manager.saveSummary(reconstructed);
      expect(fs.existsSync(summaryFile)).toBe(true);

      const summaryContent = JSON.parse(fs.readFileSync(summaryFile, "utf-8"));
      expect(summaryContent.experimentId).toBe(originalReport.experimentId);
      expect(summaryContent.aggregates[0].coverage.totalRepetitionAttempts).toBe(4);
    });
  });

  // ---------------------------------------------------------------------------
  // TEST 9: LAYA readiness configuration compatibility with persistence layer
  // ---------------------------------------------------------------------------
  describe("TEST 9: LAYA Readiness Configuration Compatibility", () => {
    it("should properly persist LAYA readiness experiment metadata, manifest, and execution records", async () => {
      const expDir = path.join(testBaseDir, "laya-readiness-persistence");
      const layaEngine: DecisionEngine = {
        id: "laya-readiness-engine",
        name: "Laya Readiness Engine [DRY-RUN MOCK]",
        provider: "LAYA",
        evaluate: async (intent: string) => ({
          engineId: "laya-readiness-engine",
          source: "LAYA",
          intent,
          actions: [],
          confidence: 0.95,
          decisionTimeMs: 42,
          timestamp: new Date().toISOString(),
          metadata: {
            checkpoint: "english",
            repository: "convaiinnovations/laya",
            device: "cpu",
            runtime: "PyTorch 2.7.1+cpu",
            probabilities: { LIGHTING: 0.95, OTHER: 0.05 },
            rawAnswers: {
              intent_family: { choice: "LIGHTING", confidence: 0.95 },
            },
          },
        }),
      };

      const provider: ComparativeProviderEntry = {
        providerId: "LAYA",
        engine: layaEngine,
        isScenarioSupported: () => true,
      };

      const report = await runControlledExperiment([mockScenario1], [provider], {
        mode: "LAYA_ONLY_READINESS",
        repetitions: 3,
        persistenceDir: expDir,
      });

      expect(report.mode).toBe("LAYA_ONLY_READINESS");
      expect(report.disclaimer).toContain("NOT A COMPARATIVE EXPERIMENT");

      // Verify manifest
      const manifest = loadManifestSync(path.join(expDir, "manifest.json"));
      expect(manifest.mode).toBe("LAYA_ONLY_READINESS");
      expect(manifest.providerIds).toEqual(["LAYA"]);
      expect(manifest.repetitions).toBe(3);
      expect(manifest.status).toBe("COMPLETED");

      // Verify execution records preserve Laya-specific metadata
      const records = loadExecutionRecordsSync(path.join(expDir, "runs.jsonl"));
      expect(records).toHaveLength(3);
      for (const rec of records) {
        expect(rec.providerId).toBe("LAYA");
        expect(rec.checkpoint).toBe("english");
        expect(rec.repository).toBe("convaiinnovations/laya");
        expect(rec.device).toBe("cpu");
        expect(rec.runtime).toBe("PyTorch 2.7.1+cpu");
        expect(rec.modelReportedConfidence).toBe(0.95);
        expect(rec.probabilities).toEqual({ LIGHTING: 0.95, OTHER: 0.05 });
      }
    });
  });

  // ---------------------------------------------------------------------------
  // TEST 10: Provider-neutral comparative experiment infrastructure compatibility
  // ---------------------------------------------------------------------------
  describe("TEST 10: Multi-Provider Comparative Persistence Compatibility", () => {
    it("should handle multi-provider executions with atomic per-provider logging, resumption, and comparative reconstruction", async () => {
      const expDir = path.join(testBaseDir, "multi-provider-persistence");

      let jevCalls = 0;
      let layaCalls = 0;

      const jevEngine: DecisionEngine = {
        id: "mock-jev-engine",
        name: "Mock JEV [DRY-RUN MOCK]",
        provider: "JEV",
        evaluate: async (intent: string) => {
          jevCalls++;
          return {
            engineId: "mock-jev-engine",
            source: "JEV",
            intent,
            actions: [],
            decisionTimeMs: 25,
            timestamp: new Date().toISOString(),
          };
        },
      };

      const layaEngine: DecisionEngine = {
        id: "mock-laya-engine",
        name: "Mock LAYA [DRY-RUN MOCK]",
        provider: "LAYA",
        evaluate: async (intent: string) => {
          layaCalls++;
          return {
            engineId: "mock-laya-engine",
            source: "LAYA",
            intent,
            actions: [],
            decisionTimeMs: 35,
            timestamp: new Date().toISOString(),
          };
        },
      };

      const providers: ComparativeProviderEntry[] = [
        { providerId: "JEV", engine: jevEngine, isScenarioSupported: () => true },
        { providerId: "LAYA", engine: layaEngine, isScenarioSupported: () => true },
      ];

      // Phase 1: 1 scenario * 2 repetitions * 2 providers = 4 executions planned.
      // Repetition 1: JEV (succeeds, #1), LAYA (succeeds, #1) -> 2 written
      // Repetition 2: JEV (succeeds, #2), LAYA -> fails after 3rd record is written to disk
      let persistedRecordsCount = 0;
      await expect(
        runControlledExperiment([mockScenario1], providers, {
          mode: "FULL_COMPARISON",
          repetitions: 2,
          persistenceDir: expDir,
          onRecordPersisted: () => {
            persistedRecordsCount++;
            if (persistedRecordsCount === 3) {
              throw new Error("LAYA_TRANSIENT_INTERRUPT");
            }
          },
        })
      ).rejects.toThrow("LAYA_TRANSIENT_INTERRUPT");

      // Verify exactly 3 records are saved
      const partialRecords = loadExecutionRecordsSync(path.join(expDir, "runs.jsonl"));
      expect(partialRecords).toHaveLength(3);
      expect(partialRecords.map((r) => `${r.repetition}:${r.providerId}`)).toEqual([
        "1:JEV",
        "1:LAYA",
        "2:JEV",
      ]);

      // Phase 2: Resume. JEV calls must not increase; only the remaining execution runs.
      const prevJevCalls = jevCalls;
      const prevLayaCalls = layaCalls;

      const report = await runControlledExperiment([mockScenario1], providers, {
        mode: "FULL_COMPARISON",
        repetitions: 2,
        persistenceDir: expDir,
        resume: true,
      });

      // JEV was already finished for both reps (2 calls total) so no new calls
      expect(jevCalls).toBe(prevJevCalls);
      // LAYA had completed rep 1 (1 call), so rep 2 should be executed now (1 new call)
      expect(layaCalls).toBe(prevLayaCalls + 1);

      // Now all 4 records must exist
      const allRecords = loadExecutionRecordsSync(path.join(expDir, "runs.jsonl"));
      expect(allRecords).toHaveLength(4);

      // Report aggregates should cover both providers
      expect(report.aggregates).toHaveLength(2);
      const provIds = report.aggregates.map((a) => a.providerId).sort();
      expect(provIds).toEqual(["JEV", "LAYA"]);

      // Verify findLatestIncompleteExperiment utility returns undefined once completed
      const latest = findLatestIncompleteExperiment(testBaseDir, "FULL_COMPARISON");
      expect(latest).toBeUndefined();
    });
  });
});
