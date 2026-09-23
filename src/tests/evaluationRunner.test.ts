import { describe, it, expect, vi } from "vitest";
import {
  evaluateScenario,
  evaluateScenarios,
  EvaluationRunnerError,
} from "@/lib/evaluation/runner";
import {
  EvaluationScenario,
  ExpectedOutcome,
  EngineRun,
} from "@/lib/evaluation/types";
import { getEvaluationScenario } from "@/lib/evaluation/dataset";
import { DecisionEngine, DecisionResult } from "@/types/engine";
import { HomeState } from "@/types/home";
import { Action } from "@/types/action";
import { INITIAL_DEVICES } from "@/lib/devices.config";
import { INITIAL_ROOMS } from "@/lib/rooms.config";
import fs from "fs";
import path from "path";

/**
 * Deterministic Test Decision Engine for runner validation.
 * Purely synthetic — no fake AI or external provider calls.
 */
class DeterministicTestEngine implements DecisionEngine {
  constructor(
    public readonly id: string = "test-deterministic-engine",
    public readonly name: string = "Deterministic Test Engine",
    public readonly provider: "JEV" | "LLM" = "LLM",
    private actionGenerator?: (intent: string, homeState: HomeState) => Action[],
    private metadataGenerator?: () => Record<string, unknown>
  ) {}

  async evaluate(intent: string, homeState: HomeState): Promise<DecisionResult> {
    const actions = this.actionGenerator ? this.actionGenerator(intent, homeState) : [];
    return {
      engineId: this.id,
      source: "SYSTEM",
      intent,
      actions,
      confidence: 0.99,
      reasoning: "Test deterministic execution.",
      decisionTimeMs: 15,
      metadata: this.metadataGenerator ? this.metadataGenerator() : undefined,
      timestamp: new Date().toISOString(),
    };
  }
}

describe("Milestone 3.3 — Generic Evaluation Execution Pipeline", () => {
  const createBaseHomeState = (): HomeState => ({
    simulationTime: "2026-09-23T22:00:00.000Z",
    isSimulatedClock: true,
    simulationSpeed: 1,
    automationMode: "MANUAL_SIMULATION",
    rooms: INITIAL_ROOMS,
    devices: JSON.parse(JSON.stringify(INITIAL_DEVICES)),
    currentScenario: null,
    currentIntentText: "",
    lastAction: null,
    actionHistory: [],
  });

  const createTestScenario = (): EvaluationScenario => {
    const initialState = createBaseHomeState();
    (initialState.devices["lock_main_door"].state as any).state = "UNLOCKED";
    (initialState.devices["tv_living_room"].state as any).power = "ON";

    const expectedOutcome: ExpectedOutcome = {
      description: "Lock door, turn off TV",
      expectedDeviceStates: {
        lock_main_door: { deviceId: "lock_main_door", targetState: { state: "LOCKED" } },
        tv_living_room: { deviceId: "tv_living_room", targetState: { power: "OFF" } },
      },
      expectedActions: [
        { deviceId: "lock_main_door", actionType: "LOCK", requirement: "REQUIRED" },
        { deviceId: "tv_living_room", actionType: "TURN_OFF", requirement: "REQUIRED" },
      ],
    };

    return {
      id: "runner-test-scenario-01",
      name: "Runner Test Scenario",
      description: "Controlled scenario to test runner pipeline execution.",
      intent: "I'm going to sleep.",
      initialState,
      expectedOutcome,
      tags: ["test", "runner"],
    };
  };

  it("Test 1, 8, 9, 10: Successful execution produces EngineRun, EvaluationResult, and Timing", async () => {
    const scenario = createTestScenario();
    const engine = new DeterministicTestEngine("custom-engine-alpha", "Custom Engine Alpha", "LLM", () => [
      {
        id: "act_1",
        deviceId: "lock_main_door",
        actionType: "LOCK",
        source: "SYSTEM",
        timestamp: new Date().toISOString(),
      },
      {
        id: "act_2",
        deviceId: "tv_living_room",
        actionType: "TURN_OFF",
        source: "SYSTEM",
        timestamp: new Date().toISOString(),
      },
    ]);

    const result = await evaluateScenario(scenario, engine);

    // 1. Successful execution
    expect(result).toBeDefined();
    expect(result.run).toBeDefined();
    expect(result.success).toBe(true);
    expect(result.evaluationResult).not.toBeNull();
    expect(result.timing).toBeDefined();
    expect(result.finalState).toBeDefined();

    // 8. Engine ID is propagated correctly
    expect(result.run.engineId).toBe("custom-engine-alpha");
    expect(result.evaluationResult!.engineId).toBe("custom-engine-alpha");

    // 9. EvaluationResult produced through evaluator
    expect(result.evaluationResult!.scenarioId).toBe(scenario.id);
    expect(result.evaluationResult!.metrics.length).toBeGreaterThan(0);
    const matched = result.evaluationResult!.metrics.find((m) => m.name === "matched_required_actions_count");
    expect(matched?.value).toBe(2);

    // 10. Timing fields present and non-negative
    expect(result.timing.decisionLatencyMs).toBeGreaterThanOrEqual(0);
    expect(result.timing.simulationLatencyMs).toBeGreaterThanOrEqual(0);
    expect(result.timing.evaluationLatencyMs).toBeGreaterThanOrEqual(0);
    expect(result.timing.totalExecutionLatencyMs).toBeGreaterThanOrEqual(0);
  });

  it("Test 2 & 3: DecisionEngine receives scenario intent and exact initial HomeState", async () => {
    const scenario = createTestScenario();
    let receivedIntent = "";
    let receivedState: HomeState | null = null;

    const spyEngine: DecisionEngine = {
      id: "spy-engine",
      name: "Spy Engine",
      provider: "LLM",
      evaluate: async (intent, state) => {
        receivedIntent = intent;
        receivedState = state;
        return {
          engineId: "spy-engine",
          source: "SYSTEM",
          intent,
          actions: [],
          timestamp: new Date().toISOString(),
        };
      },
    };

    await evaluateScenario(scenario, spyEngine);

    expect(receivedIntent).toBe(scenario.intent);
    expect(receivedState).toBeDefined();
    expect((receivedState!.devices["lock_main_door"].state as any).state).toBe("UNLOCKED");
    expect((receivedState!.devices["tv_living_room"].state as any).power).toBe("ON");
  });

  it("Test 4 & 5: Generated actions are applied through SimulationEngine and mutate final state", async () => {
    const scenario = createTestScenario();
    const engine = new DeterministicTestEngine("sim-test-engine", "Sim Engine", "LLM", () => [
      {
        id: "act_lock",
        deviceId: "lock_main_door",
        actionType: "LOCK",
        source: "SYSTEM",
        timestamp: new Date().toISOString(),
      },
    ]);

    const result = await evaluateScenario(scenario, engine);

    // Initial state was UNLOCKED
    expect((scenario.initialState.devices["lock_main_door"].state as any).state).toBe("UNLOCKED");

    // Final state reflects valid action executed by SimulationEngine
    expect((result.finalState.devices["lock_main_door"].state as any).state).toBe("LOCKED");

    // Action history preserved in finalState
    expect(result.finalState.actionHistory.length).toBeGreaterThan(0);
    expect(result.finalState.actionHistory[0].actionType).toBe("LOCK");
  });

  it("Test 6 & 7: Scenario initial state is NEVER mutated, repeated execution starts from clean state", async () => {
    const scenario = createTestScenario();
    const initialCopy = JSON.stringify(scenario.initialState);

    const engine = new DeterministicTestEngine("mut-test-engine", "Mut Engine", "LLM", () => [
      {
        id: "act_lock",
        deviceId: "lock_main_door",
        actionType: "LOCK",
        source: "SYSTEM",
        timestamp: new Date().toISOString(),
      },
    ]);

    // Run 1
    const res1 = await evaluateScenario(scenario, engine);
    expect(JSON.stringify(scenario.initialState)).toBe(initialCopy);
    expect((res1.finalState.devices["lock_main_door"].state as any).state).toBe("LOCKED");

    // Run 2: starts from clean unmutated initial state
    const res2 = await evaluateScenario(scenario, engine);
    expect(JSON.stringify(scenario.initialState)).toBe(initialCopy);
    expect((res2.finalState.devices["lock_main_door"].state as any).state).toBe("LOCKED");
  });

  it("Test 11: Simulation errors throw EvaluationRunnerError by default and never produce a normal EvaluationResult", async () => {
    const scenario = createTestScenario();

    // Engine returns action targeting a nonexistent device
    const engine = new DeterministicTestEngine("err-engine", "Err Engine", "LLM", () => [
      {
        id: "act_invalid",
        deviceId: "non_existent_device_xyz",
        actionType: "LOCK",
        source: "SYSTEM",
        timestamp: new Date().toISOString(),
      },
    ]);

    // 1. Default mode (throwOnSimulationError: true): throws typed EvaluationRunnerError
    await expect(evaluateScenario(scenario, engine)).rejects.toThrow(EvaluationRunnerError);

    try {
      await evaluateScenario(scenario, engine);
    } catch (err) {
      const runnerErr = err as EvaluationRunnerError;
      expect(runnerErr.phase).toBe("SIMULATION");
      expect(runnerErr.message).toContain("Unknown device");
      expect(runnerErr.details).toBeDefined();
    }

    // 2. Explicit throwOnSimulationError: true also throws
    await expect(
      evaluateScenario(scenario, engine, { throwOnSimulationError: true })
    ).rejects.toThrow(EvaluationRunnerError);
  });

  it("Test 11b: When throwOnSimulationError is false, failed execution returns success: false and evaluationResult: null (never a normal benchmark result)", async () => {
    const scenario = createTestScenario();

    // Engine returns invalid action targeting a nonexistent device
    const engine = new DeterministicTestEngine("err-engine-nonthrow", "Err Engine Non-Throw", "LLM", () => [
      {
        id: "act_invalid",
        deviceId: "non_existent_device_xyz",
        actionType: "LOCK",
        source: "SYSTEM",
        timestamp: new Date().toISOString(),
      },
    ]);

    const result = await evaluateScenario(scenario, engine, { throwOnSimulationError: false });

    // Explicit failure representation: no normal benchmark EvaluationResult produced
    expect(result.success).toBe(false);
    expect(result.evaluationResult).toBeNull();
    expect(result.simulationErrors).toBeDefined();
    expect(result.simulationErrors!.length).toBeGreaterThan(0);
    expect(result.simulationErrors![0]).toContain("Unknown device");
    expect(result.run.error).toContain("Unknown device");
    expect(result.timing.evaluationLatencyMs).toBe(0); // Evaluation phase skipped
  });

  it("Test 12: DecisionEngine errors are not silently swallowed", async () => {
    const scenario = createTestScenario();
    const failingEngine: DecisionEngine = {
      id: "failing-engine",
      name: "Failing Engine",
      provider: "LLM",
      evaluate: async () => {
        throw new Error("Internal provider service crash (HTTP 500)");
      },
    };

    await expect(evaluateScenario(scenario, failingEngine)).rejects.toThrow(
      EvaluationRunnerError
    );

    try {
      await evaluateScenario(scenario, failingEngine);
    } catch (err) {
      const runnerErr = err as EvaluationRunnerError;
      expect(runnerErr.phase).toBe("DECISION");
      expect(runnerErr.message).toContain("Internal provider service crash");
    }
  });

  it("Test 13: Invalid DecisionResult (missing actions) throws validation error; runner does not invent fallback actions", async () => {
    const scenario = createTestScenario();
    const invalidEngine: DecisionEngine = {
      id: "invalid-engine",
      name: "Invalid Result Engine",
      provider: "LLM",
      evaluate: async () => {
        return {
          engineId: "invalid",
          source: "SYSTEM",
          intent: "test",
          // actions property missing or invalid
        } as any;
      },
    };

    await expect(evaluateScenario(scenario, invalidEngine)).rejects.toThrow(
      EvaluationRunnerError
    );

    try {
      await evaluateScenario(scenario, invalidEngine);
    } catch (err) {
      const runnerErr = err as EvaluationRunnerError;
      expect(runnerErr.phase).toBe("VALIDATION");
      expect(runnerErr.message).toContain("missing actions array");
    }
  });

  it("Test 14 & 15: Arbitrary engine IDs work without provider-specific branches, metadata passes through cleanly", async () => {
    const scenario = createTestScenario();
    const customEngine = new DeterministicTestEngine(
      "custom-synthetic-llm-model-v99",
      "Synthetic Experimental Model",
      "LLM",
      () => [],
      () => ({
        customPromptTokens: 412,
        customCompletionTokens: 55,
        temperatureSetting: 0.15,
        modelArchitecture: "transformer-base",
      })
    );

    const result = await evaluateScenario(scenario, customEngine);

    expect(result.run.engineId).toBe("custom-synthetic-llm-model-v99");
    expect(result.run.providerMetadata).toBeDefined();
    expect(result.run.providerMetadata?.customPromptTokens).toBe(412);
    expect(result.run.providerMetadata?.modelArchitecture).toBe("transformer-base");
  });

  it("Test 16: No-op DecisionEngine executes successfully when scenario permits zero actions", async () => {
    const noopScenario = getEvaluationScenario("noop-sleep-01")!;
    expect(noopScenario).toBeDefined();

    const noopEngine = new DeterministicTestEngine("noop-engine", "No-Op Engine", "LLM", () => []);
    const result = await evaluateScenario(noopScenario, noopEngine);

    expect(result.run.actions).toHaveLength(0);
    expect(result.success).toBe(true);
    expect(result.evaluationResult).not.toBeNull();
    expect(result.evaluationResult!.actionComparison.unnecessaryActions).toHaveLength(0);
    expect(result.evaluationResult!.actionComparison.executedForbiddenActions).toHaveLength(0);

    const accuracyMetric = result.evaluationResult!.metrics.find((m) => m.name === "state_accuracy_ratio");
    expect(accuracyMetric?.value).toBe(1.0);
  });

  it("Test 17: Cross-scenario isolation guarantees zero state leakage between scenarios", async () => {
    const scenarioA = getEvaluationScenario("normal-sleep-01")!;
    const scenarioB = getEvaluationScenario("noop-sleep-01")!;

    expect(scenarioA).toBeDefined();
    expect(scenarioB).toBeDefined();

    const initialScenarioBCopy = JSON.stringify(scenarioB.initialState);

    // Engine that locks door and turns off TV
    const activeEngine = new DeterministicTestEngine("active-engine", "Active Engine", "LLM", () => [
      {
        id: "act_1",
        deviceId: "lock_main_door",
        actionType: "LOCK",
        source: "SYSTEM",
        timestamp: new Date().toISOString(),
      },
      {
        id: "act_2",
        deviceId: "tv_living_room",
        actionType: "TURN_OFF",
        source: "SYSTEM",
        timestamp: new Date().toISOString(),
      },
    ]);

    // Execute Scenario A
    const resA = await evaluateScenario(scenarioA, activeEngine);
    expect(resA.run.actions.length).toBe(2);

    // Verify Scenario B has not leaked any state from Scenario A execution
    expect(JSON.stringify(scenarioB.initialState)).toBe(initialScenarioBCopy);

    // Execute Scenario B
    const resB = await evaluateScenario(scenarioB, activeEngine);
    expect(resB.finalState).not.toBe(resA.finalState);
  });

  it("Test 18: Runner implementation source code contains zero provider-specific imports or branches", () => {
    const runnerPath = path.resolve(__dirname, "../lib/evaluation/runner.ts");
    const sourceCode = fs.readFileSync(runnerPath, "utf-8").toLowerCase();

    const forbiddenVendorImports = [
      "typesafe",
      "jevdecisionengine",
      "openai",
      "anthropic",
      "gemini",
      "ollama",
    ];

    for (const vendor of forbiddenVendorImports) {
      expect(sourceCode).not.toContain(`from "${vendor}`);
      expect(sourceCode).not.toContain(`from '@${vendor}`);
      expect(sourceCode).not.toContain(`from "./${vendor}`);
    }

    // Assert no provider-specific branching
    expect(sourceCode).not.toContain('engine === "jev"');
    expect(sourceCode).not.toContain('engine === "llm"');
    expect(sourceCode).not.toContain('engineid === "jev"');
    expect(sourceCode).not.toContain('provider === "jev"');
  });

  it("Test 15: Runner executes successfully across multiple categories from the real 36-scenario dataset", async () => {
    const normalScenario = getEvaluationScenario("normal-sleep-01")!;
    const partialScenario = getEvaluationScenario("partial-sleep-01")!;
    const noopScenario = getEvaluationScenario("noop-sleep-01")!;
    const multiScenario = getEvaluationScenario("multi-sleep-01")!;

    expect(normalScenario).toBeDefined();
    expect(partialScenario).toBeDefined();
    expect(noopScenario).toBeDefined();
    expect(multiScenario).toBeDefined();

    const testBedtimeEngine = new DeterministicTestEngine("bedtime-engine", "Bedtime Engine", "LLM", (intent, state) => {
      const actions: Action[] = [];
      const lock = state.devices["lock_main_door"];
      if (lock && (lock.state as any).state !== "LOCKED") {
        actions.push({
          id: `act_${Date.now()}_1`,
          deviceId: "lock_main_door",
          actionType: "LOCK",
          source: "SYSTEM",
          timestamp: new Date().toISOString(),
        });
      }
      const tv = state.devices["tv_living_room"];
      if (tv && (tv.state as any).power === "ON") {
        actions.push({
          id: `act_${Date.now()}_2`,
          deviceId: "tv_living_room",
          actionType: "TURN_OFF",
          source: "SYSTEM",
          timestamp: new Date().toISOString(),
        });
      }
      return actions;
    });

    const datasetSubset = [normalScenario, partialScenario, noopScenario, multiScenario];
    const results = await evaluateScenarios(datasetSubset, testBedtimeEngine);

    expect(results).toHaveLength(4);
    for (const r of results) {
      expect(r.run).toBeDefined();
      expect(r.success).toBe(true);
      expect(r.evaluationResult).not.toBeNull();
      expect(r.timing.totalExecutionLatencyMs).toBeGreaterThanOrEqual(0);
      expect((r.run as any).overallScore).toBeUndefined();
      expect((r.run as any).winner).toBeUndefined();
      expect((r.evaluationResult as any).overallScore).toBeUndefined();
      expect((r.evaluationResult as any).winner).toBeUndefined();
    }
  });
});
