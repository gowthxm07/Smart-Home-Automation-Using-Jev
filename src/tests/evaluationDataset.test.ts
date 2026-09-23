import { describe, it, expect } from "vitest";
import {
  evaluationScenarios,
  getEvaluationScenario,
  getEvaluationScenariosByCategory,
  getAllEvaluationScenarios,
  ScenarioCategory,
} from "@/lib/evaluation/dataset";
import { INITIAL_DEVICES } from "@/lib/devices.config";
import { ActionType } from "@/types/action";

describe("Milestone 3.2 — Controlled Evaluation Scenario Dataset Validation", () => {
  const validDeviceIds = new Set(Object.keys(INITIAL_DEVICES));
  const validActionTypes: Set<ActionType> = new Set([
    "TURN_ON",
    "TURN_OFF",
    "SET_BRIGHTNESS",
    "SET_DIMMED",
    "SET_FAN_SPEED",
    "SET_TEMPERATURE",
    "SET_AC_MODE",
    "LOCK",
    "UNLOCK",
    "ARM",
    "DISARM",
    "OPEN_CURTAIN",
    "CLOSE_CURTAIN",
    "SET_CURTAIN_POSITION",
  ]);

  it("Requirement 1 & 2: Dataset contains exactly 36 complete scenarios", () => {
    expect(evaluationScenarios).toHaveLength(36);
    expect(getAllEvaluationScenarios()).toHaveLength(36);

    for (const scenario of evaluationScenarios) {
      expect(scenario.id).toBeDefined();
      expect(typeof scenario.id).toBe("string");
      expect(scenario.id.trim().length).toBeGreaterThan(0);

      expect(scenario.name).toBeDefined();
      expect(typeof scenario.name).toBe("string");

      expect(scenario.description).toBeDefined();
      expect(typeof scenario.description).toBe("string");

      expect(scenario.intent).toBeDefined();
      expect(typeof scenario.intent).toBe("string");

      expect(scenario.initialState).toBeDefined();
      expect(scenario.initialState.devices).toBeDefined();

      expect(scenario.expectedOutcome).toBeDefined();
      expect(scenario.expectedOutcome.expectedDeviceStates).toBeDefined();
      expect(scenario.expectedOutcome.expectedActions).toBeDefined();

      expect(scenario.tags).toBeDefined();
      expect(Array.isArray(scenario.tags)).toBe(true);

      expect(scenario.metadata?.category).toBeDefined();
    }
  });

  it("Requirement 3: All 36 scenario IDs are unique and descriptive", () => {
    const ids = evaluationScenarios.map((s) => s.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(36);

    for (const id of ids) {
      expect(id).toMatch(/^[a-z]+-[a-z0-9-]+$/);
    }
  });

  it("Requirement 4, 5 & 6: Every referenced device exists in the HomeMind virtual devices configuration", () => {
    expect(validDeviceIds.size).toBe(18);

    for (const scenario of evaluationScenarios) {
      // 5. Initial state device IDs
      for (const deviceId of Object.keys(scenario.initialState.devices)) {
        expect(validDeviceIds.has(deviceId)).toBe(true);
      }

      // 6. Expected device states device IDs
      for (const deviceId of Object.keys(scenario.expectedOutcome.expectedDeviceStates)) {
        expect(validDeviceIds.has(deviceId)).toBe(true);
      }

      // 4. Expected actions device IDs
      for (const action of scenario.expectedOutcome.expectedActions) {
        expect(validDeviceIds.has(action.deviceId)).toBe(true);
      }
    }
  });

  it("Requirement 7: Expected action requirements use valid action/device combinations", () => {
    const validRequirements = new Set(["REQUIRED", "FORBIDDEN", "OPTIONAL"]);

    for (const scenario of evaluationScenarios) {
      for (const action of scenario.expectedOutcome.expectedActions) {
        expect(validActionTypes.has(action.actionType)).toBe(true);
        expect(validRequirements.has(action.requirement)).toBe(true);

        const device = INITIAL_DEVICES[action.deviceId];
        expect(device).toBeDefined();

        // Validate action type suitability against device capabilities
        if (action.actionType === "LOCK" || action.actionType === "UNLOCK") {
          expect(device.capabilities.lockable).toBe(true);
        } else if (action.actionType === "ARM" || action.actionType === "DISARM") {
          expect(device.capabilities.armable).toBe(true);
        } else if (action.actionType === "OPEN_CURTAIN" || action.actionType === "CLOSE_CURTAIN") {
          expect(device.capabilities.curtainPosition).toBe(true);
        } else if (action.actionType === "SET_FAN_SPEED") {
          expect(device.capabilities.fanSpeed).toBe(true);
        }
      }
    }
  });

  it("Requirement 8: Scenarios are provider-neutral without references to Jev, LLMs, or specific vendors", () => {
    const forbiddenVendorTerms = ["jev", "llm", "openai", "anthropic", "gemini", "ollama", "gpt"];

    for (const scenario of evaluationScenarios) {
      const serialized = JSON.stringify({
        id: scenario.id,
        name: scenario.name,
        description: scenario.description,
        intent: scenario.intent,
        tags: scenario.tags,
        metadata: scenario.metadata,
      }).toLowerCase();

      for (const term of forbiddenVendorTerms) {
        expect(serialized).not.toContain(term);
      }
    }
  });

  it("Requirement 9: No scenario contains overallScore, winner, ranking, or comparison judgment fields", () => {
    for (const scenario of evaluationScenarios) {
      const s = scenario as any;
      expect(s.overallScore).toBeUndefined();
      expect(s.score).toBeUndefined();
      expect(s.winner).toBeUndefined();
      expect(s.ranking).toBeUndefined();
      expect(s.betterEngine).toBeUndefined();
      expect(s.JevScore).toBeUndefined();
      expect(s.LLMScore).toBeUndefined();
      expect(s.jevScore).toBeUndefined();
      expect(s.llmScore).toBeUndefined();
    }
  });

  it("Requirement 10: Scenario objects and initial states are independent and not mutated", () => {
    const s1 = getEvaluationScenario("normal-sleep-01")!;
    const s2 = getEvaluationScenario("noop-sleep-01")!;

    expect(s1).toBeDefined();
    expect(s2).toBeDefined();

    // Verify s1 and s2 do not share state references
    expect(s1.initialState).not.toBe(s2.initialState);
    expect(s1.initialState.devices).not.toBe(s2.initialState.devices);
    expect(s1.expectedOutcome).not.toBe(s2.expectedOutcome);

    // Initial state values differ appropriately
    expect((s1.initialState.devices["lock_main_door"].state as any).state).toBe("UNLOCKED");
    expect((s2.initialState.devices["lock_main_door"].state as any).state).toBe("LOCKED");
  });

  it("Requirement 11: Every scenario can be serialized and deserialized deterministically", () => {
    for (const scenario of evaluationScenarios) {
      const jsonStr = JSON.stringify(scenario);
      expect(jsonStr).toBeDefined();
      const parsed = JSON.parse(jsonStr);
      expect(parsed.id).toBe(scenario.id);
      expect(parsed.intent).toBe(scenario.intent);
      expect(Object.keys(parsed.initialState.devices)).toHaveLength(18);
    }
  });

  it("Requirement 12: Category distribution matches the controlled 36-scenario design", () => {
    const categories: ScenarioCategory[] = [
      "NORMAL",
      "PARTIAL_STATE",
      "NO_OP",
      "MULTI_DEVICE",
      "CONTEXT_SENSITIVE",
      "SECURITY",
      "AMBIGUOUS",
    ];

    const distribution: Record<ScenarioCategory, number> = {
      NORMAL: 0,
      PARTIAL_STATE: 0,
      NO_OP: 0,
      MULTI_DEVICE: 0,
      CONTEXT_SENSITIVE: 0,
      SECURITY: 0,
      AMBIGUOUS: 0,
    };

    for (const scenario of evaluationScenarios) {
      const cat = scenario.metadata?.category as ScenarioCategory;
      expect(categories).toContain(cat);
      distribution[cat]++;
    }

    expect(distribution.NORMAL).toBe(6);
    expect(distribution.PARTIAL_STATE).toBe(6);
    expect(distribution.NO_OP).toBe(5);
    expect(distribution.MULTI_DEVICE).toBe(6);
    expect(distribution.CONTEXT_SENSITIVE).toBe(5);
    expect(distribution.SECURITY).toBe(4);
    expect(distribution.AMBIGUOUS).toBe(4);

    const total = Object.values(distribution).reduce((sum, n) => sum + n, 0);
    expect(total).toBe(36);
  });

  it("Helper methods: getEvaluationScenario and getEvaluationScenariosByCategory operate accurately", () => {
    const sleepNormal = getEvaluationScenario("normal-sleep-01");
    expect(sleepNormal).toBeDefined();
    expect(sleepNormal?.name).toBe("Normal Bedtime Routine");

    const nonExistent = getEvaluationScenario("non-existent-id");
    expect(nonExistent).toBeUndefined();

    const noopScenarios = getEvaluationScenariosByCategory("NO_OP");
    expect(noopScenarios).toHaveLength(5);
    noopScenarios.forEach((s) => expect(s.metadata?.category).toBe("NO_OP"));

    const securityScenarios = getEvaluationScenariosByCategory("SECURITY");
    expect(securityScenarios).toHaveLength(4);
  });
});
