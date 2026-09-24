import { describe, it, expect, vi } from "vitest";
import { JevDecisionEngine } from "@/lib/jev/JevDecisionEngine";
import { TypeSafeClient } from "@/lib/typesafe/client";
import { simulationEngine } from "@/lib/simulationEngine";
import { INITIAL_DEVICES } from "@/lib/devices.config";
import { INITIAL_ROOMS } from "@/lib/rooms.config";
import { HomeState } from "@/types/home";
import { SystemOneResponse } from "@/lib/typesafe/types";
import { TypeSafeApiError, TypeSafeAuthError } from "@/lib/typesafe/errors";
import { LockState, LightState, CurtainState, SecurityState, FanState, ACState } from "@/types/device";

describe("Jev Going To Sleep End-to-End Workflow (Milestone 2.2)", () => {
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

  const mockSuccessfulJevResponse: SystemOneResponse = {
    model: "jev-latest",
    answers: {
      lock_main_door: {
        type: "noul",
        noul: 0.97,
      },
      light_living_room: {
        type: "noul",
        noul: 0.95,
      },
      tv_living_room: {
        type: "noul",
        noul: 0.98,
      },
      curtain_living_room: {
        type: "noul",
        noul: 0.91,
      },
      curtain_bedroom: {
        type: "noul",
        noul: 0.94,
      },
      security_system: {
        type: "noul",
        noul: 0.96,
      },
      fan_bedroom: {
        type: "choice",
        choice: "low",
        confidence: 0.9,
        probabilities: {
          off: 0.05,
          low: 0.9,
          medium: 0.04,
          high: 0.01,
        },
      },
      ac_living_room: {
        type: "noul",
        noul: 0.93,
      },
    },
    usage: {
      input_tokens: 180,
      output_tokens: 28,
    },
  };

  it("Test M & N: should execute full pipeline (Jev response → Policy → SimulationEngine → New State) using real SimulationEngine", async () => {
    let homeState = createBaseHomeState();

    // Set initial state where bedtime actions are needed
    (homeState.devices["lock_main_door"].state as any).state = "UNLOCKED";
    (homeState.devices["light_living_room"].state as any).power = "ON";
    (homeState.devices["tv_living_room"].state as any).power = "ON";
    (homeState.devices["curtain_living_room"].state as any).state = "OPEN";
    (homeState.devices["curtain_bedroom"].state as any).state = "OPEN";
    (homeState.devices["security_system"].state as any).state = "DISARMED";
    (homeState.devices["fan_bedroom"].state as any).power = "OFF";
    (homeState.devices["fan_bedroom"].state as any).speed = 0;
    (homeState.devices["ac_living_room"].state as any).power = "ON";

    // Mock TypeSafeClient
    const mockClient = new TypeSafeClient({ apiKey: "test_key" });
    vi.spyOn(mockClient, "evaluateSystemOne").mockResolvedValue(mockSuccessfulJevResponse);

    const engine = new JevDecisionEngine({ client: mockClient });

    // Step 1: DecisionEngine.evaluate
    const decisionResult = await engine.evaluate("I'm going to sleep.", homeState);

    expect(decisionResult.source).toBe("JEV");
    expect(decisionResult.actions).toHaveLength(8);

    // Test F & G: Preserve probability, distribution, and confidence in decision trace
    const trace = decisionResult.metadata?.decisionTrace as any;
    expect(trace).toBeDefined();
    expect(trace.modelUsed).toBe("jev-latest");
    expect(trace.tokenUsage.input_tokens).toBe(180);

    // Verify Noul preservation
    expect(trace.decisions.lock_main_door.probability).toBe(0.97);
    expect(trace.decisions.lock_main_door.confidence).toBe(0.97);

    // Verify Choice preservation with distribution
    const fanTrace = trace.decisions.fan_bedroom;
    expect(fanTrace.selectedChoice).toBe("low");
    expect(fanTrace.confidence).toBe(0.9);
    expect(fanTrace.probabilities.low).toBe(0.9);
    expect(fanTrace.probabilities.high).toBe(0.01);

    // Step 2: Apply actions using REAL SimulationEngine (DO NOT mock SimulationEngine)
    const { finalState, results } = simulationEngine.applyBatchActions(
      decisionResult.actions,
      homeState
    );

    // Verify all 8 actions applied successfully
    expect(results).toHaveLength(8);
    results.forEach((r) => expect(r.success).toBe(true));

    // Verify homeState transitions to target sleep states
    expect((finalState.devices["lock_main_door"].state as LockState).state).toBe("LOCKED");
    expect((finalState.devices["light_living_room"].state as LightState).power).toBe("OFF");
    expect((finalState.devices["tv_living_room"].state as any).power).toBe("OFF");
    expect((finalState.devices["curtain_living_room"].state as CurtainState).state).toBe("CLOSED");
    expect((finalState.devices["curtain_bedroom"].state as CurtainState).state).toBe("CLOSED");
    expect((finalState.devices["security_system"].state as SecurityState).state).toBe("ARMED");
    expect((finalState.devices["fan_bedroom"].state as FanState).speed).toBe(1);
    expect((finalState.devices["fan_bedroom"].state as FanState).power).toBe("ON");
    expect((finalState.devices["ac_living_room"].state as ACState).power).toBe("OFF");

    // Verify Action History records actions with source=JEV
    expect(finalState.actionHistory).toHaveLength(8);
    finalState.actionHistory.forEach((log) => {
      expect(log.source).toBe("JEV");
    });
  });

  it("Test K: Malformed Jev response must fail cleanly without generating fake actions", async () => {
    const homeState = createBaseHomeState();
    const mockClient = new TypeSafeClient({ apiKey: "test_key" });

    // Simulate malformed response missing answers
    vi.spyOn(mockClient, "evaluateSystemOne").mockRejectedValue(
      new TypeSafeApiError("Malformed response: missing answers", 200)
    );

    const engine = new JevDecisionEngine({ client: mockClient });

    await expect(engine.evaluate("I'm going to sleep.", homeState)).rejects.toThrow(
      TypeSafeApiError
    );
  });

  it("Test L: Jev API failure (e.g. HTTP 401, 500) must fail clearly and never generate fake fallback actions", async () => {
    const homeState = createBaseHomeState();
    const mockClient = new TypeSafeClient({ apiKey: "test_key" });

    vi.spyOn(mockClient, "evaluateSystemOne").mockRejectedValue(
      new TypeSafeAuthError("Unauthorized", 401)
    );

    const engine = new JevDecisionEngine({ client: mockClient });

    await expect(engine.evaluate("I'm going to sleep.", homeState)).rejects.toThrow(
      TypeSafeAuthError
    );
  });

  it("Step 13: Intents outside supported workflows must return clean unsupported result without calling Jev API", async () => {
    const homeState = createBaseHomeState();
    const mockClient = new TypeSafeClient({ apiKey: "test_key" });
    const spy = vi.spyOn(mockClient, "evaluateSystemOne");

    const engine = new JevDecisionEngine({ client: mockClient });

    const unsupportedResult = await engine.evaluate("Lock down the house.", homeState);

    // Must return 0 actions and not call Jev API for unsupported intents
    expect(unsupportedResult.actions).toHaveLength(0);
    expect(unsupportedResult.reasoning).toContain("is not supported by JevDecisionEngine");
    expect(spy).not.toHaveBeenCalled();
  });
});
