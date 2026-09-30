import { describe, it, expect } from "vitest";
import {
  PRESET_TO_BENCHMARK_SCENARIO_MAP,
  mapPresetToBenchmarkScenarioId,
  getBenchmarkScenarioForPreset,
} from "@/lib/evaluation/comparison/scenarioMapping";
import { PREDEFINED_SCENARIOS } from "@/lib/scenarios.config";
import { getEvaluationScenario, evaluationScenarios } from "@/lib/evaluation/dataset";
import { runDualConfiguration } from "@/lib/evaluation/comparison/dualConfigRunner";
import { DecisionEngine } from "@/types/engine";
import { HomeState } from "@/types/home";
import { INITIAL_DEVICES } from "@/lib/devices.config";
import { INITIAL_ROOMS } from "@/lib/rooms.config";

function createDefaultHomeState(): HomeState {
  return {
    simulationTime: "2026-09-30T10:00:00.000Z",
    isSimulatedClock: true,
    simulationSpeed: 1,
    automationMode: "MANUAL_SIMULATION",
    rooms: INITIAL_ROOMS,
    devices: JSON.parse(JSON.stringify(INITIAL_DEVICES)),
    currentScenario: null,
    currentIntentText: "",
    lastAction: null,
    actionHistory: [],
  };
}

describe("Milestone 3.16 — Controlled Scenario Demo Integration", () => {
  const mockLayaEngine: DecisionEngine = {
    id: "mock-laya",
    name: "Mock Laya",
    provider: "LAYA",
    evaluate: async (intent) => ({
      engineId: "mock-laya",
      source: "LAYA",
      intent,
      actions: [
        {
          id: "act_laya_1",
          deviceId: "lock_main_door",
          actionType: "LOCK",
          source: "LAYA",
          timestamp: new Date().toISOString(),
        },
        {
          id: "act_laya_2",
          deviceId: "light_living_room",
          actionType: "TURN_OFF",
          source: "LAYA",
          timestamp: new Date().toISOString(),
        },
      ],
      timestamp: new Date().toISOString(),
    }),
  };

  const mockLLMEngine: DecisionEngine = {
    id: "mock-llm",
    name: "Mock LLM",
    provider: "LLM",
    evaluate: async (intent) => ({
      engineId: "mock-llm",
      source: "LLM",
      intent,
      actions: [
        {
          id: "act_llm_1",
          deviceId: "light_living_room",
          actionType: "TURN_OFF",
          source: "LLM",
          timestamp: new Date().toISOString(),
        },
      ],
      timestamp: new Date().toISOString(),
    }),
  };

  // 1. A mapped UI preset resolves to the correct frozen scenario ID.
  it("Requirement 1: A mapped UI preset resolves to the correct frozen scenario ID", () => {
    expect(mapPresetToBenchmarkScenarioId("GOING_TO_SLEEP")).toBe("normal-sleep-01");
    expect(mapPresetToBenchmarkScenarioId("LEAVING_HOME")).toBe("normal-leave-01");
    expect(mapPresetToBenchmarkScenarioId("MOVIE_NIGHT")).toBe("normal-movie-01");
    expect(mapPresetToBenchmarkScenarioId("WORKING")).toBe("normal-work-01");
    expect(mapPresetToBenchmarkScenarioId("COMING_HOME")).toBe("normal-arrive-01");
    expect(mapPresetToBenchmarkScenarioId("RELAXING")).toBe("multi-relax-01");
    expect(mapPresetToBenchmarkScenarioId("WAKING_UP")).toBe("normal-wake-01");

    // Verify all PREDEFINED_SCENARIOS have a valid benchmarkScenarioId
    PREDEFINED_SCENARIOS.forEach((preset) => {
      expect(preset.benchmarkScenarioId).toBeDefined();
      const scenario = getEvaluationScenario(preset.benchmarkScenarioId!);
      expect(scenario).toBeDefined();
      expect(scenario?.intent).toBe(preset.intent);
    });
  });

  // 2. The resolved scenario is treated as controlled.
  it("Requirement 2: The resolved scenario is treated as controlled in runDualConfiguration", async () => {
    const scenarioId = mapPresetToBenchmarkScenarioId("GOING_TO_SLEEP")!;
    const scenario = getEvaluationScenario(scenarioId)!;

    const result = await runDualConfiguration(scenario.intent, createDefaultHomeState(), {
      scenarioId,
      layaEngine: mockLayaEngine,
      llmEngine: mockLLMEngine,
    });

    expect(result.isControlled).toBe(true);
    expect(result.scenarioId).toBe("normal-sleep-01");
    expect(result.configurationA.layaRun.evaluationResult).toBeDefined();
    expect(result.configurationA.llmRun.evaluationResult).toBeDefined();
    expect(result.configurationB.llmRun.evaluationResult).toBeDefined();
  });

  // 3. An unmapped preset remains free-form.
  it("Requirement 3: An unmapped preset remains free-form with undefined scenarioId", async () => {
    expect(mapPresetToBenchmarkScenarioId("NON_EXISTENT_PRESET")).toBeUndefined();
    expect(getBenchmarkScenarioForPreset("NON_EXISTENT_PRESET")).toBeUndefined();

    const result = await runDualConfiguration("Non-existent preset intent", createDefaultHomeState(), {
      scenarioId: mapPresetToBenchmarkScenarioId("NON_EXISTENT_PRESET"),
      layaEngine: mockLayaEngine,
      llmEngine: mockLLMEngine,
    });

    expect(result.isControlled).toBe(false);
    expect(result.scenarioId).toBeUndefined();
    expect(result.configurationA.layaRun.evaluationResult).toBeUndefined();
    expect(result.configurationA.llmRun.evaluationResult).toBeUndefined();
    expect(result.configurationB.llmRun.evaluationResult).toBeUndefined();
  });

  // 4. Arbitrary free-form input remains free-form.
  it("Requirement 4: Arbitrary free-form input remains free-form with N/A evaluation metrics", async () => {
    const prompt = "Turn on the living room light";
    const result = await runDualConfiguration(prompt, createDefaultHomeState(), {
      layaEngine: mockLayaEngine,
      llmEngine: mockLLMEngine,
    });

    expect(result.isControlled).toBe(false);
    expect(result.scenarioId).toBeUndefined();
    expect(result.configurationA.layaRun.evaluationResult).toBeUndefined();
    expect(result.configurationA.llmRun.evaluationResult).toBeUndefined();
    expect(result.configurationB.llmRun.evaluationResult).toBeUndefined();
    expect(result.configurationA.layaRun.status).toBe("SUCCESS");
    expect(result.configurationB.llmRun.status).toBe("SUCCESS");
  });

  // 5. The scenario's existing initial state is used.
  it("Requirement 5: The scenario's existing initial state is strictly used for all three runs", async () => {
    const scenario = getEvaluationScenario("normal-sleep-01")!;
    // Default home state has lock_main_door: LOCKED
    // normal-sleep-01 scenario has lock_main_door: UNLOCKED
    const defaultState = createDefaultHomeState();
    expect((defaultState.devices["lock_main_door"].state as any).state).toBe("LOCKED");
    expect((scenario.initialState.devices["lock_main_door"].state as any).state).toBe("UNLOCKED");

    const result = await runDualConfiguration(scenario.intent, defaultState, {
      scenarioId: scenario.id,
      layaEngine: mockLayaEngine,
      llmEngine: mockLLMEngine,
    });

    expect(
      (result.configurationA.layaRun.initialState.devices["lock_main_door"].state as any).state
    ).toBe("UNLOCKED");
    expect(
      (result.configurationA.llmRun.initialState.devices["lock_main_door"].state as any).state
    ).toBe("UNLOCKED");
    expect(
      (result.configurationB.llmRun.initialState.devices["lock_main_door"].state as any).state
    ).toBe("UNLOCKED");
  });

  // 6. The expected evaluation still comes from the existing evaluator.
  it("Requirement 6: Evaluation metrics are computed strictly by StandardEvaluationEngine", async () => {
    const scenario = getEvaluationScenario("normal-sleep-01")!;
    const result = await runDualConfiguration(scenario.intent, createDefaultHomeState(), {
      scenarioId: scenario.id,
      layaEngine: mockLayaEngine,
      llmEngine: mockLLMEngine,
    });

    const layaEval = result.configurationA.layaRun.evaluationResult!;
    expect(layaEval.scenarioId).toBe("normal-sleep-01");
    expect(layaEval.stateComparison).toBeDefined();
    expect(layaEval.actionComparison).toBeDefined();
    expect(layaEval.metrics.some((m) => m.name === "state_accuracy_ratio")).toBe(true);
    expect(layaEval.metrics.some((m) => m.name === "matched_required_actions_count")).toBe(true);
    expect(layaEval.metrics.some((m) => m.name === "forbidden_actions_count")).toBe(true);
  });

  // 7. The three-run architecture remains intact.
  it("Requirement 7: The three-run architecture remains intact with independent clones", async () => {
    const scenario = getEvaluationScenario("normal-sleep-01")!;
    const result = await runDualConfiguration(scenario.intent, createDefaultHomeState(), {
      scenarioId: scenario.id,
      layaEngine: mockLayaEngine,
      llmEngine: mockLLMEngine,
    });

    expect(result.configurationA.layaRun.configurationId).toBe("MULTI_ENGINE");
    expect(result.configurationA.layaRun.providerId).toBe("LAYA");

    expect(result.configurationA.llmRun.configurationId).toBe("MULTI_ENGINE");
    expect(result.configurationA.llmRun.providerId).toBe("LLM");

    expect(result.configurationB.llmRun.configurationId).toBe("LLM_ONLY");
    expect(result.configurationB.llmRun.providerId).toBe("LLM");

    // Clones are independent objects
    expect(result.configurationA.layaRun.finalState).not.toBe(
      result.configurationA.llmRun.finalState
    );
    expect(result.configurationA.layaRun.finalState).not.toBe(
      result.configurationB.llmRun.finalState
    );
    expect(result.configurationA.llmRun.finalState).not.toBe(
      result.configurationB.llmRun.finalState
    );
  });

  // 8. No provider-specific evaluation logic was introduced.
  it("Requirement 8: Evaluator treats all runs identically without provider-specific rules or rankings", async () => {
    const scenario = getEvaluationScenario("normal-sleep-01")!;
    const result = await runDualConfiguration(scenario.intent, createDefaultHomeState(), {
      scenarioId: scenario.id,
      layaEngine: mockLayaEngine,
      llmEngine: mockLLMEngine,
    });

    const serialized = JSON.stringify(result).toLowerCase();
    expect(serialized).not.toContain("winner");
    expect(serialized).not.toContain("ranking");
    expect(serialized).not.toContain("bestprovider");
    expect(serialized).not.toContain("compositescore");
  });
});
