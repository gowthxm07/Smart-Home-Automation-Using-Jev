import { describe, it, expect } from "vitest";
import {
  EvaluationScenario,
  ExpectedOutcome,
  ExpectedAction,
  AcceptableAlternative,
  EngineRun,
  EvaluationResult,
  EvaluationEngine,
} from "@/lib/evaluation/types";
import { StandardEvaluationEngine } from "@/lib/evaluation/evaluator";
import { HomeState } from "@/types/home";
import { INITIAL_DEVICES } from "@/lib/devices.config";
import { INITIAL_ROOMS } from "@/lib/rooms.config";
import { Action } from "@/types/action";
import { DecisionResult } from "@/types/engine";

describe("Milestone 3.1 — Evaluation Data Model & Experiment Contract", () => {
  const createBaseHomeState = (): HomeState => ({
    simulationTime: "2026-09-23T23:00:00.000Z",
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

  // Minimal test fixture clearly marked as a test fixture (not research data)
  const createMinimalTestScenario = (): EvaluationScenario => {
    const initialState = createBaseHomeState();
    // TV starts ON, front door starts UNLOCKED
    (initialState.devices["tv_living_room"].state as any).power = "ON";
    (initialState.devices["lock_main_door"].state as any).state = "UNLOCKED";
    // Bedroom light is already OFF
    (initialState.devices["light_bedroom"].state as any).power = "OFF";

    const expectedOutcome: ExpectedOutcome = {
      description: "Bedtime target state: door locked, TV off, bedroom light off",
      expectedDeviceStates: {
        lock_main_door: {
          deviceId: "lock_main_door",
          targetState: { state: "LOCKED" },
          description: "Front door deadbolt must be locked",
        },
        tv_living_room: {
          deviceId: "tv_living_room",
          targetState: { power: "OFF" },
          description: "Living room TV must be off",
        },
        light_bedroom: {
          deviceId: "light_bedroom",
          targetState: { power: "OFF" },
          description: "Bedroom light must remain off",
        },
      },
      expectedActions: [
        {
          deviceId: "lock_main_door",
          actionType: "LOCK",
          requirement: "REQUIRED",
          description: "Lock action is required because door starts UNLOCKED",
        },
        {
          deviceId: "tv_living_room",
          actionType: "TURN_OFF",
          requirement: "REQUIRED",
          description: "Turn off action is required because TV starts ON",
        },
        {
          deviceId: "lock_main_door",
          actionType: "UNLOCK",
          requirement: "FORBIDDEN",
          description: "Unlocking during bedtime is hazardous and strictly forbidden",
        },
        {
          deviceId: "fan_bedroom",
          actionType: "SET_FAN_SPEED",
          expectedValue: 1,
          requirement: "OPTIONAL",
          description: "Low fan speed is discretionary for occupant comfort",
        },
      ],
      acceptableAlternatives: [
        {
          id: "alt-fan-medium",
          description: "Medium fan speed is an acceptable comfort alternative",
          alternativeActions: [
            {
              deviceId: "fan_bedroom",
              actionType: "SET_FAN_SPEED",
              expectedValue: 2,
              requirement: "OPTIONAL",
            },
          ],
        },
      ],
    };

    return {
      id: "test-fixture-sleep-001",
      name: "Test Fixture: Going to Sleep — Normal Initial State",
      description: "Unit test fixture evaluating bedtime device state and non-redundant actions.",
      intent: "I'm going to sleep.",
      initialState,
      expectedOutcome,
      tags: ["test", "fixture", "sleep"],
      metadata: { fixtureVersion: "1.0.0" },
    };
  };

  it("Test A: EvaluationScenario can represent a controlled scenario", () => {
    const scenario = createMinimalTestScenario();

    expect(scenario.id).toBe("test-fixture-sleep-001");
    expect(scenario.name).toContain("Test Fixture");
    expect(scenario.intent).toBe("I'm going to sleep.");
    expect(scenario.tags).toEqual(["test", "fixture", "sleep"]);
    expect(scenario.initialState.devices).toBeDefined();
    expect(scenario.expectedOutcome).toBeDefined();
    expect(Object.keys(scenario.expectedOutcome.expectedDeviceStates)).toHaveLength(3);
  });

  it("Test B: Expected outcome can distinguish target state from expected action", () => {
    const scenario = createMinimalTestScenario();
    const { expectedDeviceStates, expectedActions } = scenario.expectedOutcome;

    // Both TV and bedroom light must end in targetState: power = OFF
    expect(expectedDeviceStates["tv_living_room"].targetState).toEqual({ power: "OFF" });
    expect(expectedDeviceStates["light_bedroom"].targetState).toEqual({ power: "OFF" });

    // BUT: TV requires an action (starts ON)
    const tvAction = expectedActions.find((a) => a.deviceId === "tv_living_room");
    expect(tvAction).toBeDefined();
    expect(tvAction?.requirement).toBe("REQUIRED");

    // Whereas bedroom light is ALREADY OFF in initialState; NO action is required for it
    const bedroomLightAction = expectedActions.find((a) => a.deviceId === "light_bedroom");
    expect(bedroomLightAction).toBeUndefined(); // No action expected because device is already in target state
  });

  it("Test C: Expected actions support required/forbidden/optional semantics", () => {
    const scenario = createMinimalTestScenario();
    const { expectedActions } = scenario.expectedOutcome;

    const requiredActions = expectedActions.filter((a) => a.requirement === "REQUIRED");
    const forbiddenActions = expectedActions.filter((a) => a.requirement === "FORBIDDEN");
    const optionalActions = expectedActions.filter((a) => a.requirement === "OPTIONAL");

    expect(requiredActions.length).toBeGreaterThan(0);
    expect(forbiddenActions.length).toBeGreaterThan(0);
    expect(optionalActions.length).toBeGreaterThan(0);

    // Verify forbidden action definition
    expect(forbiddenActions[0].actionType).toBe("UNLOCK");
    expect(forbiddenActions[0].requirement).toBe("FORBIDDEN");
  });

  it("Test D: Acceptable alternatives can be represented", () => {
    const scenario = createMinimalTestScenario();
    const alternatives = scenario.expectedOutcome.acceptableAlternatives;

    expect(alternatives).toBeDefined();
    expect(alternatives).toHaveLength(1);
    expect(alternatives![0].id).toBe("alt-fan-medium");
    expect(alternatives![0].alternativeActions?.[0].expectedValue).toBe(2);
  });

  it("Test E: EngineRun can represent JEV", () => {
    const scenario = createMinimalTestScenario();
    const finalState = JSON.parse(JSON.stringify(scenario.initialState)) as HomeState;
    (finalState.devices["lock_main_door"].state as any).state = "LOCKED";
    (finalState.devices["tv_living_room"].state as any).power = "OFF";

    const jevActions: Action[] = [
      {
        id: "act_jev_1",
        deviceId: "lock_main_door",
        actionType: "LOCK",
        source: "JEV",
        timestamp: "2026-09-23T23:00:01.000Z",
      },
      {
        id: "act_jev_2",
        deviceId: "tv_living_room",
        actionType: "TURN_OFF",
        source: "JEV",
        timestamp: "2026-09-23T23:00:01.000Z",
      },
    ];

    const jevDecisionResult: DecisionResult = {
      engineId: "jev-system-one",
      source: "JEV",
      intent: scenario.intent,
      actions: jevActions,
      confidence: 0.96,
      reasoning: "Bedtime safety routines executed.",
      decisionTimeMs: 280,
      timestamp: "2026-09-23T23:00:01.000Z",
      metadata: {
        decisionTrace: {
          modelUsed: "jev-latest",
          tokenUsage: { input_tokens: 180, output_tokens: 28 },
        },
      },
    };

    const jevRun: EngineRun = {
      runId: "run_jev_001",
      engineId: "JEV",
      scenarioId: scenario.id,
      startedAt: "2026-09-23T23:00:00.000Z",
      completedAt: "2026-09-23T23:00:01.000Z",
      latencyMs: 280,
      decisionResult: jevDecisionResult,
      actions: jevActions,
      finalState,
      providerMetadata: {
        rawTrace: jevDecisionResult.metadata?.decisionTrace,
      },
    };

    expect(jevRun.engineId).toBe("JEV");
    expect(jevRun.actions).toHaveLength(2);
    expect(jevRun.providerMetadata?.rawTrace).toBeDefined();
  });

  it("Test F & G: EngineRun can represent LLM without provider-specific assumptions and preserve metadata", () => {
    const scenario = createMinimalTestScenario();
    const finalState = JSON.parse(JSON.stringify(scenario.initialState)) as HomeState;
    (finalState.devices["lock_main_door"].state as any).state = "LOCKED";
    (finalState.devices["tv_living_room"].state as any).power = "OFF";

    const llmActions: Action[] = [
      {
        id: "act_llm_1",
        deviceId: "lock_main_door",
        actionType: "LOCK",
        source: "LLM",
        timestamp: "2026-09-23T23:00:01.500Z",
      },
      {
        id: "act_llm_2",
        deviceId: "tv_living_room",
        actionType: "TURN_OFF",
        source: "LLM",
        timestamp: "2026-09-23T23:00:01.500Z",
      },
    ];

    const llmDecisionResult: DecisionResult = {
      engineId: "gpt-4o-baseline",
      source: "LLM",
      intent: scenario.intent,
      actions: llmActions,
      confidence: 0.88,
      reasoning: "User is going to sleep, locked the door and turned off the TV.",
      decisionTimeMs: 850,
      timestamp: "2026-09-23T23:00:01.500Z",
    };

    const llmRun: EngineRun = {
      runId: "run_llm_001",
      engineId: "LLM",
      scenarioId: scenario.id,
      startedAt: "2026-09-23T23:00:00.000Z",
      completedAt: "2026-09-23T23:00:01.500Z",
      latencyMs: 850,
      decisionResult: llmDecisionResult,
      actions: llmActions,
      finalState,
      providerMetadata: {
        model: "gpt-4o",
        temperature: 0.2,
        promptTokens: 320,
        completionTokens: 45,
      },
    };

    expect(llmRun.engineId).toBe("LLM");
    expect(llmRun.providerMetadata?.temperature).toBe(0.2);
    expect(llmRun.providerMetadata?.promptTokens).toBe(320);
  });

  it("Test H: EvaluationResult can store independent metrics without aggregation", () => {
    const scenario = createMinimalTestScenario();
    const finalState = JSON.parse(JSON.stringify(scenario.initialState)) as HomeState;
    (finalState.devices["lock_main_door"].state as any).state = "LOCKED";
    (finalState.devices["tv_living_room"].state as any).power = "OFF";

    const run: EngineRun = {
      runId: "run_test_001",
      engineId: "GENERIC_TEST_ENGINE",
      scenarioId: scenario.id,
      startedAt: "2026-09-23T23:00:00.000Z",
      completedAt: "2026-09-23T23:00:01.000Z",
      latencyMs: 150,
      decisionResult: {
        engineId: "test",
        source: "SYSTEM",
        intent: scenario.intent,
        actions: [
          {
            id: "act_1",
            deviceId: "lock_main_door",
            actionType: "LOCK",
            source: "SYSTEM",
            timestamp: "2026-09-23T23:00:01.000Z",
          },
          {
            id: "act_2",
            deviceId: "tv_living_room",
            actionType: "TURN_OFF",
            source: "SYSTEM",
            timestamp: "2026-09-23T23:00:01.000Z",
          },
        ],
        timestamp: "2026-09-23T23:00:01.000Z",
      },
      actions: [
        {
          id: "act_1",
          deviceId: "lock_main_door",
          actionType: "LOCK",
          source: "SYSTEM",
          timestamp: "2026-09-23T23:00:01.000Z",
        },
        {
          id: "act_2",
          deviceId: "tv_living_room",
          actionType: "TURN_OFF",
          source: "SYSTEM",
          timestamp: "2026-09-23T23:00:01.000Z",
        },
      ],
      finalState,
    };

    const evaluator = new StandardEvaluationEngine();
    const result: EvaluationResult = evaluator.evaluate(scenario, run);

    expect(result.scenarioId).toBe(scenario.id);
    expect(result.engineId).toBe("GENERIC_TEST_ENGINE");
    expect(result.metrics.length).toBeGreaterThanOrEqual(7);

    const matchedMetric = result.metrics.find((m) => m.name === "matched_required_actions_count");
    const missedMetric = result.metrics.find((m) => m.name === "missed_required_actions_count");
    const forbiddenMetric = result.metrics.find((m) => m.name === "forbidden_actions_count");
    const accuracyMetric = result.metrics.find((m) => m.name === "state_accuracy_ratio");

    expect(matchedMetric?.value).toBe(2);
    expect(missedMetric?.value).toBe(0);
    expect(forbiddenMetric?.value).toBe(0);
    expect(accuracyMetric?.value).toBe(1.0);
  });

  it("Test I: No overall score, winner, ranking, or comparison judgment fields exist", () => {
    const scenario = createMinimalTestScenario();
    const run: EngineRun = {
      runId: "run_test_002",
      engineId: "TEST_ENGINE",
      scenarioId: scenario.id,
      startedAt: "2026-09-23T23:00:00.000Z",
      completedAt: "2026-09-23T23:00:00.200Z",
      latencyMs: 200,
      decisionResult: {
        engineId: "test",
        source: "SYSTEM",
        intent: scenario.intent,
        actions: [],
        timestamp: "2026-09-23T23:00:00.200Z",
      },
      actions: [],
      finalState: scenario.initialState,
    };

    const evaluator = new StandardEvaluationEngine();
    const result: EvaluationResult = evaluator.evaluate(scenario, run);

    // CRITICAL SCIENTIFIC INTEGRITY ASSERTIONS
    expect((result as any).overallScore).toBeUndefined();
    expect((result as any).score).toBeUndefined();
    expect((result as any).winner).toBeUndefined();
    expect((result as any).ranking).toBeUndefined();
    expect((result as any).betterEngine).toBeUndefined();
    expect((result as any).jevScore).toBeUndefined();
    expect((result as any).llmScore).toBeUndefined();

    // Verify all metrics in result are strictly numeric and individual
    result.metrics.forEach((m) => {
      expect(typeof m.name).toBe("string");
      expect(typeof m.value).toBe("number");
      expect(m.name).not.toContain("overall");
      expect(m.name).not.toContain("winner");
    });
  });

  it("Test J: Evaluation interfaces do not depend on Jev or a specific LLM", () => {
    // Implement an arbitrary synthetic evaluation engine to verify independence
    class CustomRuleEvaluator implements EvaluationEngine {
      readonly id = "custom-rule-evaluator";
      readonly name = "Custom Evaluator";
      evaluate(s: EvaluationScenario, r: EngineRun): EvaluationResult {
        return {
          scenarioId: s.id,
          engineId: r.engineId,
          runId: r.runId,
          timestamp: new Date().toISOString(),
          metrics: [{ name: "custom_metric", value: 42, unit: "units" }],
          stateComparison: {
            totalEvaluatedDevices: 0,
            matchedDevices: [],
            mismatchedDevices: [],
            stateAccuracyRatio: 1.0,
          },
          actionComparison: {
            matchedRequiredActions: [],
            missedRequiredActions: [],
            executedForbiddenActions: [],
            executedOptionalActions: [],
            unnecessaryActions: [],
            redundantActions: [],
          },
        };
      }
    }

    const customEvaluator: EvaluationEngine = new CustomRuleEvaluator();
    const scenario = createMinimalTestScenario();
    const run: EngineRun = {
      runId: "run_synthetic",
      engineId: "SYNTHETIC_RULE_BASED",
      scenarioId: scenario.id,
      startedAt: "2026-09-23T23:00:00.000Z",
      completedAt: "2026-09-23T23:00:00.010Z",
      latencyMs: 10,
      decisionResult: {
        engineId: "synthetic",
        source: "SYSTEM",
        intent: scenario.intent,
        actions: [],
        timestamp: "2026-09-23T23:00:00.010Z",
      },
      actions: [],
      finalState: scenario.initialState,
    };

    const result = customEvaluator.evaluate(scenario, run);
    expect(result.metrics[0].name).toBe("custom_metric");
    expect(result.metrics[0].value).toBe(42);
  });

  it("Test K: Evaluation structures do not mutate supplied state/action objects", () => {
    const scenario = createMinimalTestScenario();
    const initialDevicesCopy = JSON.stringify(scenario.initialState.devices);
    const expectedOutcomeCopy = JSON.stringify(scenario.expectedOutcome);

    const run: EngineRun = {
      runId: "run_immutability_test",
      engineId: "JEV",
      scenarioId: scenario.id,
      startedAt: "2026-09-23T23:00:00.000Z",
      completedAt: "2026-09-23T23:00:00.200Z",
      latencyMs: 200,
      decisionResult: {
        engineId: "jev",
        source: "JEV",
        intent: scenario.intent,
        actions: [],
        timestamp: "2026-09-23T23:00:00.200Z",
      },
      actions: [
        {
          id: "act_immutability",
          deviceId: "lock_main_door",
          actionType: "LOCK",
          source: "JEV",
          timestamp: "2026-09-23T23:00:00.200Z",
        },
      ],
      finalState: scenario.initialState,
    };

    const runActionsCopy = JSON.stringify(run.actions);
    const finalStateCopy = JSON.stringify(run.finalState);

    const evaluator = new StandardEvaluationEngine();
    evaluator.evaluate(scenario, run);

    // Verify complete immutability of inputs
    expect(JSON.stringify(scenario.initialState.devices)).toBe(initialDevicesCopy);
    expect(JSON.stringify(scenario.expectedOutcome)).toBe(expectedOutcomeCopy);
    expect(JSON.stringify(run.actions)).toBe(runActionsCopy);
    expect(JSON.stringify(run.finalState)).toBe(finalStateCopy);
  });
});
