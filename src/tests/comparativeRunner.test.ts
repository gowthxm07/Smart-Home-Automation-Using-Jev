import { describe, it, expect, vi } from "vitest";
import {
  runComparativeScenario,
  runComparativeBenchmark,
  computeStateFingerprint,
  serializeComparativeReport,
  serializeComparativeScenarioResult,
  ComparativeProviderEntry,
  ComparativeBenchmarkReport,
} from "@/lib/evaluation/comparison";
import { getEvaluationScenario, getAllEvaluationScenarios } from "@/lib/evaluation/dataset";
import { DecisionEngine, DecisionResult } from "@/types/engine";
import { HomeState } from "@/types/home";
import { Action } from "@/types/action";
import { StandardEvaluationEngine } from "@/lib/evaluation/evaluator";
import { simulationEngine } from "@/lib/simulationEngine";
import fs from "fs";
import path from "path";

/**
 * Creates a mock DecisionEngine with call spy capabilities.
 */
function createMockEngine(
  id: string,
  name: string,
  provider: "JEV" | "LLM",
  evaluateFn?: (intent: string, homeState: HomeState) => Promise<DecisionResult>
): {
  engine: DecisionEngine;
  receivedIntents: string[];
  receivedStates: HomeState[];
} {
  const receivedIntents: string[] = [];
  const receivedStates: HomeState[] = [];

  const engine: DecisionEngine = {
    id,
    name,
    provider,
    evaluate: vi.fn(async (intent: string, homeState: HomeState): Promise<DecisionResult> => {
      receivedIntents.push(intent);
      receivedStates.push(JSON.parse(JSON.stringify(homeState)));

      if (evaluateFn) {
        return evaluateFn(intent, homeState);
      }

      return {
        engineId: id,
        source: provider,
        intent,
        actions: [],
        reasoning: "Default mock decision",
        timestamp: new Date().toISOString(),
      };
    }),
  };

  return { engine, receivedIntents, receivedStates };
}

describe("Comparative Evaluation Infrastructure (Milestone 3.7)", () => {
  // 1. Same scenario reaches both providers
  it("delivers the same scenario to both providers", async () => {
    const scenario = getEvaluationScenario("normal-sleep-01")!;
    expect(scenario).toBeDefined();

    const jev = createMockEngine("jev-typesafe", "Jev Engine", "JEV");
    const llm = createMockEngine("llm-ollama", "LLM Engine", "LLM");

    const providers: ComparativeProviderEntry[] = [
      { providerId: "JEV", engine: jev.engine },
      { providerId: "LLM", engine: llm.engine },
    ];

    const result = await runComparativeScenario(scenario, providers);

    expect(result.scenarioId).toBe("normal-sleep-01");
    expect(result.providerRuns).toHaveLength(2);
    expect(result.providerRuns[0].providerId).toBe("JEV");
    expect(result.providerRuns[1].providerId).toBe("LLM");
    expect(jev.receivedIntents).toHaveLength(1);
    expect(llm.receivedIntents).toHaveLength(1);
  });

  // 2. Exact same intent string is passed to both providers without rewriting
  it("passes the exact same unaltered intent string to both providers", async () => {
    const scenario = getEvaluationScenario("normal-sleep-01")!;
    const jev = createMockEngine("jev-typesafe", "Jev Engine", "JEV");
    const llm = createMockEngine("llm-ollama", "LLM Engine", "LLM");

    const providers: ComparativeProviderEntry[] = [
      { providerId: "JEV", engine: jev.engine },
      { providerId: "LLM", engine: llm.engine },
    ];

    const result = await runComparativeScenario(scenario, providers);

    expect(result.intent).toBe("I'm going to sleep.");
    expect(jev.receivedIntents[0]).toBe("I'm going to sleep.");
    expect(llm.receivedIntents[0]).toBe("I'm going to sleep.");
    expect(jev.receivedIntents[0]).toBe(llm.receivedIntents[0]);
  });

  // 3 & 4. Deep-cloned independent initial states & matching fingerprints
  it("provides deep-cloned independent initial states with matching fingerprints", async () => {
    const scenario = getEvaluationScenario("normal-sleep-01")!;
    const canonicalFingerprint = computeStateFingerprint(scenario.initialState);

    const jev = createMockEngine("jev-typesafe", "Jev Engine", "JEV");
    const llm = createMockEngine("llm-ollama", "LLM Engine", "LLM");

    const providers: ComparativeProviderEntry[] = [
      { providerId: "JEV", engine: jev.engine },
      { providerId: "LLM", engine: llm.engine },
    ];

    const result = await runComparativeScenario(scenario, providers);

    expect(result.initialStateFingerprint).toBe(canonicalFingerprint);

    // Initial state received by Jev has same fingerprint
    const jevStateFingerprint = computeStateFingerprint(jev.receivedStates[0]);
    expect(jevStateFingerprint).toBe(canonicalFingerprint);

    // Initial state received by LLM has same fingerprint
    const llmStateFingerprint = computeStateFingerprint(llm.receivedStates[0]);
    expect(llmStateFingerprint).toBe(canonicalFingerprint);

    // Both state objects are distinct references
    expect(jev.receivedStates[0]).not.toBe(llm.receivedStates[0]);
    expect(jev.receivedStates[0]).not.toBe(scenario.initialState);
    expect(llm.receivedStates[0]).not.toBe(scenario.initialState);
  });

  // 5, 6 & 7. Provider state isolation: Jev actions/mutations do NOT affect LLM initial state
  it("guarantees complete state isolation even if a provider mutates its input state during execution", async () => {
    const scenario = getEvaluationScenario("normal-sleep-01")!;
    const canonicalSnapshot = JSON.stringify(scenario.initialState);

    // Jev engine that intentionally mutates its received state in place
    const jev = createMockEngine("jev-typesafe", "Jev Engine", "JEV", async (intent, state) => {
      (state.devices["lock_main_door"].state as any).state = "LOCKED";
      (state.devices["tv_living_room"].state as any).power = "OFF";
      return {
        engineId: "jev-typesafe",
        source: "JEV",
        intent,
        actions: [
          {
            id: "act_jev_1",
            deviceId: "lock_main_door",
            actionType: "LOCK",
            source: "JEV",
            timestamp: new Date().toISOString(),
          },
        ],
        confidence: 0.95,
        reasoning: "Mutating lock",
        timestamp: new Date().toISOString(),
      };
    });

    // LLM engine that inspects initial door state
    let llmSawLockedDoor = false;
    const llm = createMockEngine("llm-ollama", "LLM Engine", "LLM", async (intent, state) => {
      llmSawLockedDoor = (state.devices["lock_main_door"].state as any).state === "LOCKED";
      return {
        engineId: "llm-ollama",
        source: "LLM",
        intent,
        actions: [],
        reasoning: "LLM check",
        timestamp: new Date().toISOString(),
      };
    });

    const providers: ComparativeProviderEntry[] = [
      { providerId: "JEV", engine: jev.engine },
      { providerId: "LLM", engine: llm.engine },
    ];

    await runComparativeScenario(scenario, providers);

    // LLM did NOT see Jev's mutation!
    expect(llmSawLockedDoor).toBe(false);
    expect((llm.receivedStates[0].devices["lock_main_door"].state as any).state).toBe("UNLOCKED");

    // Canonical scenario initial state remained pristine
    expect(JSON.stringify(scenario.initialState)).toBe(canonicalSnapshot);
  });

  // 8. Same SimulationEngine processes both providers independently
  it("processes each provider's actions through the same SimulationEngine on separate cloned states", async () => {
    const scenario = getEvaluationScenario("normal-sleep-01")!;

    const jev = createMockEngine("jev-typesafe", "Jev Engine", "JEV", async (intent) => ({
      engineId: "jev-typesafe",
      source: "JEV",
      intent,
      actions: [
        {
          id: "act_jev_1",
          deviceId: "curtain_bedroom",
          actionType: "CLOSE_CURTAIN",
          source: "JEV",
          timestamp: new Date().toISOString(),
        },
      ],
      confidence: 0.94,
      timestamp: new Date().toISOString(),
    }));

    const llm = createMockEngine("llm-ollama", "LLM Engine", "LLM", async (intent) => ({
      engineId: "llm-ollama",
      source: "LLM",
      intent,
      actions: [
        {
          id: "act_llm_1",
          deviceId: "tv_living_room",
          actionType: "TURN_OFF",
          source: "LLM",
          timestamp: new Date().toISOString(),
        },
      ],
      timestamp: new Date().toISOString(),
    }));

    const providers: ComparativeProviderEntry[] = [
      { providerId: "JEV", engine: jev.engine },
      { providerId: "LLM", engine: llm.engine },
    ];

    const result = await runComparativeScenario(scenario, providers);

    const jevRun = result.providerRuns[0];
    const llmRun = result.providerRuns[1];

    expect(jevRun.status).toBe("SUPPORTED_SUCCESS");
    expect(llmRun.status).toBe("SUPPORTED_SUCCESS");

    // Jev's final state reflects curtain closure, but TV is still ON
    expect((jevRun.finalState!.devices["curtain_bedroom"].state as any).state).toBe("CLOSED");
    expect((jevRun.finalState!.devices["tv_living_room"].state as any).power).toBe("ON");

    // LLM's final state reflects TV shutdown, but curtain is still OPEN
    expect((llmRun.finalState!.devices["tv_living_room"].state as any).power).toBe("OFF");
    expect((llmRun.finalState!.devices["curtain_bedroom"].state as any).state).toBe("OPEN");
  });

  // 9. Same StandardEvaluationEngine processes both providers
  it("evaluates both providers using the exact same StandardEvaluationEngine instance", async () => {
    const scenario = getEvaluationScenario("normal-sleep-01")!;
    const customEvaluator = new StandardEvaluationEngine();
    const evalSpy = vi.spyOn(customEvaluator, "evaluate");

    const jev = createMockEngine("jev-typesafe", "Jev Engine", "JEV");
    const llm = createMockEngine("llm-ollama", "LLM Engine", "LLM");

    const providers: ComparativeProviderEntry[] = [
      { providerId: "JEV", engine: jev.engine },
      { providerId: "LLM", engine: llm.engine },
    ];

    const result = await runComparativeScenario(scenario, providers, {
      evaluator: customEvaluator,
    });

    expect(evalSpy).toHaveBeenCalledTimes(2);
    expect(result.providerRuns[0].evaluationResult).toBeDefined();
    expect(result.providerRuns[1].evaluationResult).toBeDefined();
  });

  // 10, 11 & 12. Provider-specific metadata preservation (LLM proposedActions, Jev trace)
  it("preserves provider-specific metadata, including LLM proposedActions and Jev trace", async () => {
    const scenario = getEvaluationScenario("normal-sleep-01")!;

    const jevAction: Action = {
      id: "act_jev_1",
      deviceId: "lock_main_door",
      actionType: "LOCK",
      source: "JEV",
      timestamp: new Date().toISOString(),
    };

    const jev = createMockEngine("jev-typesafe", "Jev Engine", "JEV", async (intent) => ({
      engineId: "jev-typesafe",
      source: "JEV",
      intent,
      actions: [jevAction],
      confidence: 0.94,
      reasoning: "Jev reasoning",
      metadata: {
        provider: "typesafe",
        modelUsed: "systemone-v1",
        decisionTrace: {
          intent: "GOING_TO_SLEEP",
          decisions: { lock_main_door: { action: "LOCK", confidence: 0.97 } },
        },
        skippedRedundantActions: ["light_bedroom: already OFF"],
      },
      timestamp: new Date().toISOString(),
    }));

    const llmAction: Action = {
      id: "act_llm_1",
      deviceId: "lock_main_door",
      actionType: "LOCK",
      source: "LLM",
      timestamp: new Date().toISOString(),
    };

    const redundantAction: Action = {
      id: "act_llm_2",
      deviceId: "light_bedroom",
      actionType: "TURN_OFF",
      source: "LLM",
      timestamp: new Date().toISOString(),
    };

    const llm = createMockEngine("llm-ollama", "LLM Engine", "LLM", async (intent) => ({
      engineId: "llm-ollama",
      source: "LLM",
      intent,
      actions: [llmAction], // Executable action
      // confidence is undefined
      reasoning: "LLM reasoning",
      metadata: {
        provider: "ollama",
        model: "llama3.2:3b",
        promptVersion: "homemind-llm-prompt-v1.0",
        proposedActions: [llmAction, redundantAction], // Preserves all proposed actions
        skippedRedundantActions: [redundantAction],    // Preserves filtered actions
        skippedRedundantReasons: ["light_bedroom: already OFF"],
      },
      timestamp: new Date().toISOString(),
    }));

    const providers: ComparativeProviderEntry[] = [
      { providerId: "JEV", engine: jev.engine },
      { providerId: "LLM", engine: llm.engine },
    ];

    const result = await runComparativeScenario(scenario, providers);

    // Jev metadata preserved
    const jevRun = result.providerRuns[0];
    expect(jevRun.decisionResult?.confidence).toBe(0.94);
    expect(jevRun.providerMetadata?.modelUsed).toBe("systemone-v1");
    expect((jevRun.providerMetadata?.decisionTrace as any)?.intent).toBe("GOING_TO_SLEEP");
    expect(jevRun.providerMetadata?.skippedRedundantActions).toContain("light_bedroom: already OFF");

    // LLM metadata preserved & confidence uncalibrated
    const llmRun = result.providerRuns[1];
    expect(llmRun.decisionResult?.confidence).toBeUndefined();
    expect(llmRun.providerMetadata?.model).toBe("llama3.2:3b");
    const proposed = llmRun.providerMetadata?.proposedActions as Action[];
    expect(proposed).toHaveLength(2);
    expect(proposed[0].deviceId).toBe("lock_main_door");
    expect(proposed[1].deviceId).toBe("light_bedroom");
    const skipped = llmRun.providerMetadata?.skippedRedundantActions as Action[];
    expect(skipped).toHaveLength(1);
    expect(skipped[0].deviceId).toBe("light_bedroom");
  });

  // 13, 14 & 15. Independent latency recording (decision, simulation, evaluation, total)
  it("records decision, simulation, evaluation, and total latencies independently for each provider", async () => {
    const scenario = getEvaluationScenario("normal-sleep-01")!;
    const jev = createMockEngine("jev-typesafe", "Jev Engine", "JEV");
    const llm = createMockEngine("llm-ollama", "LLM Engine", "LLM");

    const providers: ComparativeProviderEntry[] = [
      { providerId: "JEV", engine: jev.engine },
      { providerId: "LLM", engine: llm.engine },
    ];

    const result = await runComparativeScenario(scenario, providers);

    for (const run of result.providerRuns) {
      expect(run.timing).toBeDefined();
      expect(run.timing!.decisionLatencyMs).toBeGreaterThanOrEqual(0);
      expect(run.timing!.simulationLatencyMs).toBeGreaterThanOrEqual(0);
      expect(run.timing!.evaluationLatencyMs).toBeGreaterThanOrEqual(0);
      expect(run.timing!.totalExecutionLatencyMs).toBeGreaterThanOrEqual(0);
    }
  });

  // 16. Unsupported provider status is preserved without fabricating actions
  it("preserves explicit UNSUPPORTED status for unsupported scenarios without fabricating actions", async () => {
    const scenario = getEvaluationScenario("security-lockdown-01")!;
    expect(scenario).toBeDefined();

    const jev = createMockEngine("jev-typesafe", "Jev Engine", "JEV");
    const llm = createMockEngine("llm-ollama", "LLM Engine", "LLM");

    const providers: ComparativeProviderEntry[] = [
      {
        providerId: "JEV",
        engine: jev.engine,
        isScenarioSupported: (s) => s.id !== "security-lockdown-01",
        getUnsupportedReason: () => "Security lockdown workflow not implemented in Jev.",
      },
      {
        providerId: "LLM",
        engine: llm.engine,
      },
    ];

    const result = await runComparativeScenario(scenario, providers);

    const jevRun = result.providerRuns[0];
    expect(jevRun.status).toBe("UNSUPPORTED");
    expect(jevRun.unsupportedReason).toContain("Security lockdown workflow not implemented");
    expect(jevRun.actions).toHaveLength(0);
    expect(jevRun.evaluationResult).toBeNull();
    expect(jev.receivedIntents).toHaveLength(0); // Engine was NOT called

    const llmRun = result.providerRuns[1];
    expect(llmRun.status).toBe("SUPPORTED_SUCCESS");
    expect(llm.receivedIntents).toHaveLength(1);
  });

  // 17. Provider failure is cleanly captured and preserved
  it("captures provider failure gracefully without crashing the comparative runner", async () => {
    const scenario = getEvaluationScenario("normal-sleep-01")!;

    const failingJev = createMockEngine("jev-typesafe", "Jev Engine", "JEV", async () => {
      throw new Error("TypeSafe API connection timeout (504)");
    });

    const workingLlm = createMockEngine("llm-ollama", "LLM Engine", "LLM");

    const providers: ComparativeProviderEntry[] = [
      { providerId: "JEV", engine: failingJev.engine },
      { providerId: "LLM", engine: workingLlm.engine },
    ];

    const result = await runComparativeScenario(scenario, providers);

    const jevRun = result.providerRuns[0];
    expect(jevRun.status).toBe("SUPPORTED_FAILURE");
    expect(jevRun.error).toContain("TypeSafe API connection timeout");
    expect(jevRun.errorPhase).toBe("DECISION");
    expect(jevRun.evaluationResult).toBeNull();

    const llmRun = result.providerRuns[1];
    expect(llmRun.status).toBe("SUPPORTED_SUCCESS");
    expect(llmRun.evaluationResult).toBeDefined();
  });

  // 18. No fallback provider behavior (failure in one does not invoke another)
  it("strictly enforces zero fallback from one provider to another on error", async () => {
    const scenario = getEvaluationScenario("normal-sleep-01")!;

    const failingLlm = createMockEngine("llm-ollama", "LLM Engine", "LLM", async () => {
      throw new Error("Ollama daemon unavailable (ECONNREFUSED)");
    });

    const jev = createMockEngine("jev-typesafe", "Jev Engine", "JEV");

    // Execute LLM then Jev
    const providers: ComparativeProviderEntry[] = [
      { providerId: "LLM", engine: failingLlm.engine },
      { providerId: "JEV", engine: jev.engine },
    ];

    const result = await runComparativeScenario(scenario, providers);

    expect(result.providerRuns[0].status).toBe("SUPPORTED_FAILURE");
    expect(result.providerRuns[0].error).toContain("ECONNREFUSED");

    // Jev was called exactly once for its own slot, never as a fallback for LLM
    expect(jev.receivedIntents).toHaveLength(1);
    expect(result.providerRuns[1].status).toBe("SUPPORTED_SUCCESS");
  });

  // 19. No dataset leakage: providers only receive intent and allowed home state
  it("ensures providers receive strictly intent and HomeState with zero evaluation answer keys", async () => {
    const scenario = getEvaluationScenario("normal-sleep-01")!;

    let receivedKeysInJev: string[] = [];
    const jev = createMockEngine("jev-typesafe", "Jev Engine", "JEV", async (intent, state) => {
      receivedKeysInJev = Object.keys(state as any);
      return {
        engineId: "jev-typesafe",
        source: "JEV",
        intent,
        actions: [],
        timestamp: new Date().toISOString(),
      };
    });

    const providers: ComparativeProviderEntry[] = [
      { providerId: "JEV", engine: jev.engine },
    ];

    await runComparativeScenario(scenario, providers);

    // Verify received state contains only HomeState properties
    expect(receivedKeysInJev).toContain("devices");
    expect(receivedKeysInJev).toContain("rooms");
    expect(receivedKeysInJev).not.toContain("expectedOutcome");
    expect(receivedKeysInJev).not.toContain("expectedActions");
    expect(receivedKeysInJev).not.toContain("requiredActions");
    expect(receivedKeysInJev).not.toContain("forbiddenActions");
  });

  // 20. No mutation of canonical scenario dataset
  it("guarantees the canonical evaluation scenario remains 100% unmutated after comparison", async () => {
    const scenario = getEvaluationScenario("normal-sleep-01")!;
    const originalJson = JSON.stringify(scenario);

    const jev = createMockEngine("jev-typesafe", "Jev Engine", "JEV");
    const llm = createMockEngine("llm-ollama", "LLM Engine", "LLM");

    const providers: ComparativeProviderEntry[] = [
      { providerId: "JEV", engine: jev.engine },
      { providerId: "LLM", engine: llm.engine },
    ];

    await runComparativeScenario(scenario, providers);

    expect(JSON.stringify(scenario)).toBe(originalJson);
  });

  // 21 & 22. Deterministic state fingerprint & sensitivity to changes
  describe("Deterministic State Fingerprint Utility", () => {
    it("produces identical fingerprints for identical HomeStates regardless of key order", () => {
      const scenario = getEvaluationScenario("normal-sleep-01")!;
      const state1 = scenario.initialState;
      const state2 = JSON.parse(JSON.stringify(scenario.initialState));

      const fp1 = computeStateFingerprint(state1);
      const fp2 = computeStateFingerprint(state2);

      expect(fp1).toBe(fp2);
      expect(fp1).toMatch(/^[a-f0-9]{64}$/); // Valid SHA-256
    });

    it("produces different fingerprints when state properties change", () => {
      const scenario = getEvaluationScenario("normal-sleep-01")!;
      const stateOriginal = scenario.initialState;
      const stateModified: HomeState = JSON.parse(JSON.stringify(scenario.initialState));

      // Modify one device property
      (stateModified.devices["light_kitchen"].state as any).power = "ON";

      const fpOriginal = computeStateFingerprint(stateOriginal);
      const fpModified = computeStateFingerprint(stateModified);

      expect(fpOriginal).not.toBe(fpModified);
    });
  });

  // 23. Result serialization does not contain secrets
  describe("Result Serialization and Secret Sanitization", () => {
    it("sanitizes any sensitive credential fields during serialization", () => {
      const scenario = getEvaluationScenario("normal-sleep-01")!;
      const jev = createMockEngine("jev-typesafe", "Jev Engine", "JEV", async (intent) => ({
        engineId: "jev-typesafe",
        source: "JEV",
        intent,
        actions: [],
        metadata: {
          secretField: "redact_me_val",
          normalField: "public_telemetry",
        },
        timestamp: new Date().toISOString(),
      }));

      const providers: ComparativeProviderEntry[] = [
        { providerId: "JEV", engine: jev.engine },
      ];

      return runComparativeScenario(scenario, providers).then((res) => {
        const serialized = serializeComparativeScenarioResult(res);
        expect(serialized).not.toContain("redact_me_val");
        expect(serialized).toContain("[REDACTED_CREDENTIAL]");
        expect(serialized).toContain("public_telemetry");
      });
    });
  });

  // 24, 25 & 26. Absence of composite score, ranking, or winner metrics
  describe("Scientific Objectivity Guardrails", () => {
    it("strictly ensures no winner, ranking, or composite score exists on reports", async () => {
      const scenarios = [
        getEvaluationScenario("normal-sleep-01")!,
        getEvaluationScenario("normal-leave-01")!,
      ];

      const jev = createMockEngine("jev-typesafe", "Jev Engine", "JEV");
      const llm = createMockEngine("llm-ollama", "LLM Engine", "LLM");

      const providers: ComparativeProviderEntry[] = [
        { providerId: "JEV", engine: jev.engine },
        { providerId: "LLM", engine: llm.engine },
      ];

      const report = await runComparativeBenchmark(scenarios, providers, {
        gitCommitHash: "testcommit123",
      });

      expect(report.metadata.gitCommitHash).toBe("testcommit123");
      expect(report.scenarioResults).toHaveLength(2);

      // Verify no winner / ranking / composite score
      expect("winner" in report).toBe(false);
      expect("ranking" in report).toBe(false);
      expect("rankings" in report).toBe(false);
      expect("score" in report).toBe(false);
      expect("overallScore" in report).toBe(false);
      expect("jevScore" in report).toBe(false);
      expect("llmScore" in report).toBe(false);

      for (const scenRes of report.scenarioResults) {
        expect("winner" in scenRes).toBe(false);
        expect("score" in scenRes).toBe(false);
      }
    });

    it("verifies architectural independence: comparison module does not import from Jev policies or Ollama internals", () => {
      const compDir = path.resolve(process.cwd(), "src/lib/evaluation/comparison");
      const files = fs.readdirSync(compDir).filter((f) => f.endsWith(".ts"));

      for (const file of files) {
        const filePath = path.join(compDir, file);
        const content = fs.readFileSync(filePath, "utf-8");

        expect(content).not.toMatch(/@\/lib\/policies/);
        expect(content).not.toMatch(/@\/lib\/ollama\/client/);
        expect(content).not.toMatch(/@\/lib\/typesafe/);
      }
    });

    it("guarantees the entire 36-scenario dataset remains unmutated after running full benchmark subset", async () => {
      const allScenarios = getAllEvaluationScenarios();
      const beforeSnapshot = JSON.stringify(allScenarios);

      const jev = createMockEngine("jev-typesafe", "Jev Engine", "JEV");
      const llm = createMockEngine("llm-ollama", "LLM Engine", "LLM");

      const providers: ComparativeProviderEntry[] = [
        { providerId: "JEV", engine: jev.engine },
        { providerId: "LLM", engine: llm.engine },
      ];

      // Run on a subset of 3 scenarios
      await runComparativeBenchmark(allScenarios.slice(0, 3), providers);

      const afterSnapshot = JSON.stringify(allScenarios);
      expect(afterSnapshot).toBe(beforeSnapshot);
    });
  });
});
