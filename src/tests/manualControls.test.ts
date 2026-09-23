import { describe, it, expect } from "vitest";
import { simulationEngine } from "@/lib/simulationEngine";
import { INITIAL_DEVICES } from "@/lib/devices.config";
import { INITIAL_ROOMS } from "@/lib/rooms.config";
import { HomeState } from "@/types/home";
import { Action } from "@/types/action";

describe("Central State Manual Control Dispatching", () => {
  it("should sequentially apply multiple manual actions and maintain history", () => {
    let state: HomeState = {
      simulationTime: "2026-09-23T12:00:00.000Z",
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

    // 1. Turn on living room light
    const act1: Action = {
      id: "a1",
      deviceId: "light_living_room",
      actionType: "TURN_ON",
      source: "MANUAL",
      timestamp: state.simulationTime,
    };
    state = simulationEngine.applyAction(act1, state).newState;

    // 2. Unlock main door
    const act2: Action = {
      id: "a2",
      deviceId: "lock_main_door",
      actionType: "UNLOCK",
      source: "MANUAL",
      timestamp: state.simulationTime,
    };
    state = simulationEngine.applyAction(act2, state).newState;

    // 3. Set AC temp to 22
    const act3: Action = {
      id: "a3",
      deviceId: "ac_living_room",
      actionType: "SET_TEMPERATURE",
      value: 22,
      source: "MANUAL",
      timestamp: state.simulationTime,
    };
    state = simulationEngine.applyAction(act3, state).newState;

    expect(state.actionHistory).toHaveLength(3);
    expect(state.actionHistory[0].actionType).toBe("SET_TEMPERATURE");
    expect(state.actionHistory[1].actionType).toBe("UNLOCK");
    expect(state.actionHistory[2].actionType).toBe("TURN_ON");

    // All should be marked as MANUAL
    state.actionHistory.forEach((log) => {
      expect(log.source).toBe("MANUAL");
    });
  });
});
