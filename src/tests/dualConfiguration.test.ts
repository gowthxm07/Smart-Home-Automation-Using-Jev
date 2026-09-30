import { describe, it, expect } from "vitest";
import { runDualConfiguration, DualConfigurationResult } from "@/lib/evaluation/comparison/dualConfigRunner";
import { HomeState } from "@/types/home";
import { DecisionEngine } from "@/types/engine";
import { INITIAL_DEVICES } from "@/lib/devices.config";
import { INITIAL_ROOMS } from "@/lib/rooms.config";
import { getEvaluationScenario } from "@/lib/evaluation/dataset";

function createInitialHomeState(): HomeState {
  return {
    simulationTime: "2026-09-30T22:00:00.000Z",
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

describe("Milestone 3.14 — Dual-Configuration Comparative Architecture", () => {
  const mockLayaEngine = (overrides?: Partial<DecisionEngine>): DecisionEngine => ({
    id: "mock-laya",
    name: "Mock Laya (System-1)",
    provider: "LAYA",
    evaluate: async (intent) => ({
      engineId: "mock-laya",
      source: "LAYA",
      intent,
      actions: [
        {
          id: "act_laya_1",
          deviceId: "light_living_room",
          actionType: "TURN_OFF",
          source: "LAYA",
          timestamp: new Date().toISOString(),
        },
        {
          id: "act_laya_2",
          deviceId: "lock_main_door",
          actionType: "LOCK",
          source: "LAYA",
          timestamp: new Date().toISOString(),
        },
      ],
      confidence: 0.98,
      timestamp: new Date().toISOString(),
    }),
    ...overrides,
  });

  const mockLLMEngine = (overrides?: Partial<DecisionEngine>): DecisionEngine => ({
    id: "mock-llm",
    name: "Mock LLM (Ollama)",
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
    ...overrides,
  });

  // 1. Three independent state clones are created.
  it("Requirement 1: Three independent state clones are created for every run", async () => {
    const initialState = createInitialHomeState();
    let cloneA: HomeState | undefined;
    let cloneB: HomeState | undefined;
    let cloneC: HomeState | undefined;

    let llmCalls = 0;
    const laya = mockLayaEngine({
      evaluate: async (_, state) => {
        cloneA = state;
        return { engineId: "mock-laya", source: "LAYA", intent: "", actions: [], timestamp: "" };
      },
    });

    const llm = mockLLMEngine({
      evaluate: async (_, state) => {
        llmCalls++;
        if (llmCalls === 1) cloneB = state;
        else cloneC = state;
        return { engineId: "mock-llm", source: "LLM", intent: "", actions: [], timestamp: "" };
      },
    });

    await runDualConfiguration("Test Prompt", initialState, { layaEngine: laya, llmEngine: llm });

    expect(cloneA).toBeDefined();
    expect(cloneB).toBeDefined();
    expect(cloneC).toBeDefined();
    expect(cloneA).not.toBe(cloneB);
    expect(cloneA).not.toBe(cloneC);
    expect(cloneB).not.toBe(cloneC);
  });

  // 2. Clone A mutation cannot affect Clone B.
  it("Requirement 2: Clone A mutation cannot affect Clone B", async () => {
    const initialState = createInitialHomeState();
    let stateBSeen: HomeState | undefined;

    const mutatingLaya = mockLayaEngine({
      evaluate: async (_, state) => {
        (state.devices["light_living_room"].state as any).power = "MUTATED_A";
        return { engineId: "mock-laya", source: "LAYA", intent: "", actions: [], timestamp: "" };
      },
    });

    let llmCalls = 0;
    const llm = mockLLMEngine({
      evaluate: async (_, state) => {
        llmCalls++;
        if (llmCalls === 1) stateBSeen = state;
        return { engineId: "mock-llm", source: "LLM", intent: "", actions: [], timestamp: "" };
      },
    });

    await runDualConfiguration("Test", initialState, { layaEngine: mutatingLaya, llmEngine: llm });
    expect((stateBSeen!.devices["light_living_room"].state as any).power).toBe("OFF");
  });

  // 3. Clone A mutation cannot affect Clone C.
  it("Requirement 3: Clone A mutation cannot affect Clone C", async () => {
    const initialState = createInitialHomeState();
    let stateCSeen: HomeState | undefined;

    const mutatingLaya = mockLayaEngine({
      evaluate: async (_, state) => {
        (state.devices["light_living_room"].state as any).power = "MUTATED_A";
        return { engineId: "mock-laya", source: "LAYA", intent: "", actions: [], timestamp: "" };
      },
    });

    let llmCalls = 0;
    const llm = mockLLMEngine({
      evaluate: async (_, state) => {
        llmCalls++;
        if (llmCalls === 2) stateCSeen = state;
        return { engineId: "mock-llm", source: "LLM", intent: "", actions: [], timestamp: "" };
      },
    });

    await runDualConfiguration("Test", initialState, { layaEngine: mutatingLaya, llmEngine: llm });
    expect((stateCSeen!.devices["light_living_room"].state as any).power).toBe("OFF");
  });

  // 4. Clone B mutation cannot affect Clone C.
  it("Requirement 4: Clone B mutation cannot affect Clone C", async () => {
    const initialState = createInitialHomeState();
    let stateCSeen: HomeState | undefined;

    let llmCalls = 0;
    const mutatingLLM = mockLLMEngine({
      evaluate: async (_, state) => {
        llmCalls++;
        if (llmCalls === 1) {
          (state.devices["light_living_room"].state as any).power = "MUTATED_B";
        } else {
          stateCSeen = state;
        }
        return { engineId: "mock-llm", source: "LLM", intent: "", actions: [], timestamp: "" };
      },
    });

    await runDualConfiguration("Test", initialState, { layaEngine: mockLayaEngine(), llmEngine: mutatingLLM });
    expect((stateCSeen!.devices["light_living_room"].state as any).power).toBe("OFF");
  });

  // 5. Same prompt reaches all three executions.
  it("Requirement 5: Same prompt reaches all three executions", async () => {
    const initialState = createInitialHomeState();
    const prompt = "Going to sleep now";
    const prompts: string[] = [];

    const laya = mockLayaEngine({
      evaluate: async (intent) => {
        prompts.push(intent);
        return { engineId: "mock-laya", source: "LAYA", intent, actions: [], timestamp: "" };
      },
    });

    const llm = mockLLMEngine({
      evaluate: async (intent) => {
        prompts.push(intent);
        return { engineId: "mock-llm", source: "LLM", intent, actions: [], timestamp: "" };
      },
    });

    const result = await runDualConfiguration(prompt, initialState, { layaEngine: laya, llmEngine: llm });
    expect(prompts).toEqual([prompt, prompt, prompt]);
    expect(result.prompt).toBe(prompt);
  });

  // 6. Same initial state is used for all three executions.
  it("Requirement 6: Same initial state is used for all three executions", async () => {
    const initialState = createInitialHomeState();
    const result = await runDualConfiguration("Test", initialState, {
      layaEngine: mockLayaEngine(),
      llmEngine: mockLLMEngine(),
    });

    expect(result.configurationA.layaRun.initialState.simulationTime).toBe(initialState.simulationTime);
    expect(result.configurationA.llmRun.initialState.simulationTime).toBe(initialState.simulationTime);
    expect(result.configurationB.llmRun.initialState.simulationTime).toBe(initialState.simulationTime);
  });

  // 7. Laya and LLM produce independent EngineRun records.
  it("Requirement 7: Laya and LLM produce independent EngineRun records", async () => {
    const scenario = getEvaluationScenario("normal-sleep-01")!;
    const result = await runDualConfiguration(scenario.intent, scenario.initialState, {
      controlledScenario: scenario,
      layaEngine: mockLayaEngine(),
      llmEngine: mockLLMEngine(),
    });

    const runLaya = result.configurationA.layaRun;
    const runLLM = result.configurationA.llmRun;

    expect(runLaya.providerId).toBe("LAYA");
    expect(runLLM.providerId).toBe("LLM");
    expect(runLaya.evaluationResult?.engineId).toBe("mock-laya");
    expect(runLLM.evaluationResult?.engineId).toBe("mock-llm");
    expect(runLaya.executedActions).not.toEqual(runLLM.executedActions);
  });

  // 8. LLM Multi-Engine and LLM-Only produce independent EngineRun records.
  it("Requirement 8: LLM Multi-Engine and LLM-Only produce independent EngineRun records", async () => {
    let call = 0;
    const llm = mockLLMEngine({
      evaluate: async (intent) => {
        call++;
        return {
          engineId: `llm-instance-${call}`,
          source: "LLM",
          intent,
          actions: [
            {
              id: `act_${call}`,
              deviceId: "light_living_room",
              actionType: "TURN_OFF",
              source: "LLM",
              timestamp: new Date().toISOString(),
            },
          ],
          timestamp: new Date().toISOString(),
        };
      },
    });

    const result = await runDualConfiguration("Test", createInitialHomeState(), {
      layaEngine: mockLayaEngine(),
      llmEngine: llm,
    });

    expect(result.configurationA.llmRun.configurationId).toBe("MULTI_ENGINE");
    expect(result.configurationB.llmRun.configurationId).toBe("LLM_ONLY");
    expect(result.configurationA.llmRun).not.toBe(result.configurationB.llmRun);
  });

  // 9. StandardEvaluationEngine is reused consistently.
  it("Requirement 9: StandardEvaluationEngine is reused consistently across both configurations", async () => {
    const scenario = getEvaluationScenario("normal-sleep-01")!;
    const result = await runDualConfiguration(scenario.intent, scenario.initialState, {
      controlledScenario: scenario,
      layaEngine: mockLayaEngine(),
      llmEngine: mockLLMEngine(),
    });

    for (const run of [
      result.configurationA.layaRun,
      result.configurationA.llmRun,
      result.configurationB.llmRun,
    ]) {
      expect(run.evaluationResult).toBeDefined();
      expect(run.evaluationResult?.metrics.length).toBeGreaterThan(0);
      expect(run.evaluationResult?.scenarioId).toBe(scenario.id);
    }
  });

  // 10. Controlled scenarios produce actual evaluation metrics.
  it("Requirement 10: Controlled scenarios produce actual ground-truth evaluation metrics", async () => {
    const scenario = getEvaluationScenario("normal-sleep-01")!;
    const result = await runDualConfiguration(scenario.intent, scenario.initialState, {
      controlledScenario: scenario,
      layaEngine: mockLayaEngine(),
      llmEngine: mockLLMEngine(),
    });

    expect(result.isControlled).toBe(true);
    const evalA = result.configurationA.layaRun.evaluationResult!;
    expect(evalA.metrics.some((m) => m.name === "state_accuracy_ratio")).toBe(true);
    expect(evalA.metrics.some((m) => m.name === "matched_required_actions_count")).toBe(true);
    expect(evalA.metrics.some((m) => m.name === "missed_required_actions_count")).toBe(true);
    expect(evalA.metrics.some((m) => m.name === "forbidden_actions_count")).toBe(true);
  });

  // 11. Free-form prompts produce N/A for ground-truth metrics.
  it("Requirement 11: Free-form prompts produce undefined evaluationResult (N/A for ground-truth metrics)", async () => {
    const result = await runDualConfiguration("Free form prompt without preset", createInitialHomeState(), {
      layaEngine: mockLayaEngine(),
      llmEngine: mockLLMEngine(),
    });

    expect(result.isControlled).toBe(false);
    expect(result.scenarioId).toBeUndefined();
    expect(result.configurationA.layaRun.evaluationResult).toBeUndefined();
    expect(result.configurationA.llmRun.evaluationResult).toBeUndefined();
    expect(result.configurationB.llmRun.evaluationResult).toBeUndefined();
  });

  // 12. Valid operational metrics remain available for free-form prompts.
  it("Requirement 12: Valid operational metrics remain available for free-form prompts", async () => {
    const result = await runDualConfiguration("Custom free-form command", createInitialHomeState(), {
      layaEngine: mockLayaEngine(),
      llmEngine: mockLLMEngine(),
    });

    for (const run of [
      result.configurationA.layaRun,
      result.configurationA.llmRun,
      result.configurationB.llmRun,
    ]) {
      expect(run.status).toBe("SUCCESS");
      expect(run.latencyMs.decision).toBeGreaterThanOrEqual(0);
      expect(run.latencyMs.simulation).toBeGreaterThanOrEqual(0);
      expect(run.latencyMs.total).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(run.executedActions)).toBe(true);
      expect(Array.isArray(run.skippedRedundantActions)).toBe(true);
    }
  });

  // 13. Laya failure does not prevent LLM-only execution.
  it("Requirement 13: Laya failure does not prevent LLM-only execution", async () => {
    const failingLaya: DecisionEngine = {
      id: "failing-laya",
      name: "Failing Laya",
      provider: "LAYA",
      evaluate: async () => {
        throw new Error("Laya service offline");
      },
    };

    const result = await runDualConfiguration("Test", createInitialHomeState(), {
      layaEngine: failingLaya,
      llmEngine: mockLLMEngine(),
    });

    expect(result.configurationA.layaRun.status).toBe("ERROR");
    expect(result.configurationA.layaRun.error).toContain("Laya service offline");
    expect(result.configurationB.llmRun.status).toBe("SUCCESS");
  });

  // 14. Multi-Engine LLM failure does not prevent LLM-only execution.
  it("Requirement 14: Multi-Engine LLM failure does not prevent LLM-only execution", async () => {
    let call = 0;
    const partiallyFailingLLM: DecisionEngine = {
      id: "partially-failing-llm",
      name: "Partially Failing LLM",
      provider: "LLM",
      evaluate: async (intent) => {
        call++;
        if (call === 1) throw new Error("Multi-Engine LLM socket closed");
        return { engineId: "llm", source: "LLM", intent, actions: [], timestamp: "" };
      },
    };

    const result = await runDualConfiguration("Test", createInitialHomeState(), {
      layaEngine: mockLayaEngine(),
      llmEngine: partiallyFailingLLM,
    });

    expect(result.configurationA.llmRun.status).toBe("ERROR");
    expect(result.configurationA.llmRun.error).toContain("socket closed");
    expect(result.configurationB.llmRun.status).toBe("SUCCESS");
  });

  // 15. Configuration provenance is preserved.
  it("Requirement 15: Configuration provenance is preserved on actions and records", async () => {
    const result = await runDualConfiguration("Test", createInitialHomeState(), {
      layaEngine: mockLayaEngine(),
      llmEngine: mockLLMEngine(),
    });

    result.configurationA.layaRun.executedActions.forEach((a) => {
      expect(a.configurationId).toBe("MULTI_ENGINE");
    });
    result.configurationA.llmRun.executedActions.forEach((a) => {
      expect(a.configurationId).toBe("MULTI_ENGINE");
    });
    result.configurationB.llmRun.executedActions.forEach((a) => {
      expect(a.configurationId).toBe("LLM_ONLY");
    });
  });

  // 16. Provider provenance is preserved.
  it("Requirement 16: Provider provenance is preserved on actions and records", async () => {
    const result = await runDualConfiguration("Test", createInitialHomeState(), {
      layaEngine: mockLayaEngine(),
      llmEngine: mockLLMEngine(),
    });

    result.configurationA.layaRun.executedActions.forEach((a) => {
      expect(a.source).toBe("LAYA");
    });
    result.configurationB.llmRun.executedActions.forEach((a) => {
      expect(a.source).toBe("LLM");
    });
  });

  // 17. Visualization driver only changes displayed state.
  it("Requirement 17: Visualization driver only changes displayed state metadata without modifying runs", async () => {
    const initialState = createInitialHomeState();

    const resLaya = await runDualConfiguration("Test", initialState, {
      selectedMultiEngineDriver: "LAYA",
      layaEngine: mockLayaEngine(),
      llmEngine: mockLLMEngine(),
    });
    expect(resLaya.selectedMultiEngineDriver).toBe("LAYA");
    expect(resLaya.configurationA.primaryFloorPlanDriver).toBe("LAYA");

    const resLLM = await runDualConfiguration("Test", initialState, {
      selectedMultiEngineDriver: "LLM",
      layaEngine: mockLayaEngine(),
      llmEngine: mockLLMEngine(),
    });
    expect(resLLM.selectedMultiEngineDriver).toBe("LLM");
    expect(resLLM.configurationA.primaryFloorPlanDriver).toBe("LLM");
  });

  // 18. No ranking/winner/composite score exists in serialized results.
  it("Requirement 18: No ranking, winner, or composite score exists in serialized results", async () => {
    const scenario = getEvaluationScenario("normal-sleep-01")!;
    const result = await runDualConfiguration(scenario.intent, scenario.initialState, {
      controlledScenario: scenario,
      layaEngine: mockLayaEngine(),
      llmEngine: mockLLMEngine(),
    });

    const serialized = JSON.stringify(result).toLowerCase();
    expect(serialized).not.toContain("winner");
    expect(serialized).not.toContain("ranking");
    expect(serialized).not.toContain("compositescore");
    expect(serialized).not.toContain("bestengine");
    expect(serialized).not.toContain("bestprovider");
    expect(serialized).not.toContain("homemindscore");
  });
});
