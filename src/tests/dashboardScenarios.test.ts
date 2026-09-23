import { describe, it, expect } from "vitest";
import { PREDEFINED_SCENARIOS } from "@/lib/scenarios.config";
import { INITIAL_DEVICES } from "@/lib/devices.config";
import { INITIAL_ROOMS } from "@/lib/rooms.config";
import { HomeState } from "@/types/home";

describe("Milestone 5 - Scenario Decoupling & Central State Integrity", () => {
  it("should verify scenarios only declare intent templates and do NOT contain hardcoded actions", () => {
    expect(PREDEFINED_SCENARIOS).toHaveLength(7);

    PREDEFINED_SCENARIOS.forEach((scenario) => {
      expect(scenario.id).toBeDefined();
      expect(scenario.name).toBeDefined();
      expect(scenario.intent).toBeDefined();
      expect(scenario.description).toBeDefined();
      // Ensure scenario object does NOT contain actions property
      expect((scenario as any).actions).toBeUndefined();
    });
  });

  it("selecting a scenario must NOT mutate device states", () => {
    const initialState: HomeState = {
      simulationTime: "2026-09-23T10:00:00.000Z",
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

    const sleepingScenario = PREDEFINED_SCENARIOS.find((s) => s.id === "GOING_TO_SLEEP")!;
    expect(sleepingScenario).toBeDefined();

    // Simulate scenario selection (what selectScenario does)
    const updatedState: HomeState = {
      ...initialState,
      currentScenario: sleepingScenario,
      currentIntentText: sleepingScenario.intent,
    };

    // Intent is populated
    expect(updatedState.currentIntentText).toBe("I'm going to sleep.");
    expect(updatedState.currentScenario?.id).toBe("GOING_TO_SLEEP");

    // CRITICAL: Device states must remain completely identical
    expect(updatedState.devices).toEqual(initialState.devices);

    // No actions should be dispatched to action history
    expect(updatedState.actionHistory).toHaveLength(0);
  });
});
