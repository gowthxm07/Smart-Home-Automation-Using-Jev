import { describe, it, expect } from "vitest";
import { GoingToSleepPolicy } from "@/lib/policies/GoingToSleepPolicy";
import { JevDecisionTrace } from "@/lib/jev/trace";
import { INITIAL_DEVICES } from "@/lib/devices.config";
import { INITIAL_ROOMS } from "@/lib/rooms.config";
import { HomeState } from "@/types/home";

describe("GoingToSleepPolicy (Milestone 2.2)", () => {
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

  const createMockTrace = (overrides: Record<string, any> = {}): JevDecisionTrace => ({
    scenarioId: "GOING_TO_SLEEP",
    intent: "I'm going to sleep.",
    modelUsed: "jev-latest",
    tokenUsage: { input_tokens: 100, output_tokens: 20 },
    overallConfidence: 0.95,
    timestamp: "2026-09-23T22:00:00.000Z",
    decisions: {
      lock_main_door: {
        questionId: "lock_main_door",
        questionType: "noul",
        instructions: "Lock door?",
        rawAnswer: { type: "noul", noul: 0.98 },
        affirmative: true,
        confidence: 0.98,
        probability: 0.98,
      },
      light_living_room: {
        questionId: "light_living_room",
        questionType: "noul",
        instructions: "Turn off light?",
        rawAnswer: { type: "noul", noul: 0.95 },
        affirmative: true,
        confidence: 0.95,
        probability: 0.95,
      },
      tv_living_room: {
        questionId: "tv_living_room",
        questionType: "noul",
        instructions: "Turn off TV?",
        rawAnswer: { type: "noul", noul: 0.99 },
        affirmative: true,
        confidence: 0.99,
        probability: 0.99,
      },
      curtain_living_room: {
        questionId: "curtain_living_room",
        questionType: "noul",
        instructions: "Close living room curtains?",
        rawAnswer: { type: "noul", noul: 0.92 },
        affirmative: true,
        confidence: 0.92,
        probability: 0.92,
      },
      curtain_bedroom: {
        questionId: "curtain_bedroom",
        questionType: "noul",
        instructions: "Close bedroom curtains?",
        rawAnswer: { type: "noul", noul: 0.96 },
        affirmative: true,
        confidence: 0.96,
        probability: 0.96,
      },
      security_system: {
        questionId: "security_system",
        questionType: "noul",
        instructions: "Arm security system?",
        rawAnswer: { type: "noul", noul: 0.94 },
        affirmative: true,
        confidence: 0.94,
        probability: 0.94,
      },
      fan_bedroom: {
        questionId: "fan_bedroom",
        questionType: "choice",
        instructions: "Fan speed?",
        rawAnswer: {
          type: "choice",
          choice: "low",
          confidence: 0.89,
          probabilities: { off: 0.05, low: 0.89, medium: 0.05, high: 0.01 },
        },
        selectedChoice: "low",
        confidence: 0.89,
        probabilities: { off: 0.05, low: 0.89, medium: 0.05, high: 0.01 },
      },
      ac_living_room: {
        questionId: "ac_living_room",
        questionType: "noul",
        instructions: "Turn off living room AC?",
        rawAnswer: { type: "noul", noul: 0.91 },
        affirmative: true,
        confidence: 0.91,
        probability: 0.91,
      },
      ...overrides,
    },
  });

  it("Test A & H: should generate actions for all target devices when they require state change with source=JEV", () => {
    const homeState = createBaseHomeState();

    // Prepare state where devices are in opposing states
    (homeState.devices["lock_main_door"].state as any).state = "UNLOCKED";
    (homeState.devices["light_living_room"].state as any).power = "ON";
    (homeState.devices["tv_living_room"].state as any).power = "ON";
    (homeState.devices["curtain_living_room"].state as any).state = "OPEN";
    (homeState.devices["curtain_bedroom"].state as any).state = "OPEN";
    (homeState.devices["security_system"].state as any).state = "DISARMED";
    (homeState.devices["fan_bedroom"].state as any).power = "OFF";
    (homeState.devices["fan_bedroom"].state as any).speed = 0;
    (homeState.devices["ac_living_room"].state as any).power = "ON";

    const trace = createMockTrace();
    const result = GoingToSleepPolicy.evaluate(trace, homeState);

    expect(result.actions).toHaveLength(8);

    // Verify all actions have source: JEV
    result.actions.forEach((act) => {
      expect(act.source).toBe("JEV");
    });

    const actionTypesByDevice = Object.fromEntries(
      result.actions.map((a) => [a.deviceId, a.actionType])
    );

    expect(actionTypesByDevice["lock_main_door"]).toBe("LOCK");
    expect(actionTypesByDevice["light_living_room"]).toBe("TURN_OFF");
    expect(actionTypesByDevice["tv_living_room"]).toBe("TURN_OFF");
    expect(actionTypesByDevice["curtain_living_room"]).toBe("CLOSE_CURTAIN");
    expect(actionTypesByDevice["curtain_bedroom"]).toBe("CLOSE_CURTAIN");
    expect(actionTypesByDevice["security_system"]).toBe("ARM");
    expect(actionTypesByDevice["fan_bedroom"]).toBe("SET_FAN_SPEED");
    expect(actionTypesByDevice["ac_living_room"]).toBe("TURN_OFF");
  });

  it("Test B & I: should avoid redundant actions when devices are already in target state", () => {
    const homeState = createBaseHomeState();

    // Set all devices already to target sleep states
    (homeState.devices["lock_main_door"].state as any).state = "LOCKED";
    (homeState.devices["light_living_room"].state as any).power = "OFF";
    (homeState.devices["tv_living_room"].state as any).power = "OFF";
    (homeState.devices["curtain_living_room"].state as any).state = "CLOSED";
    (homeState.devices["curtain_bedroom"].state as any).state = "CLOSED";
    (homeState.devices["security_system"].state as any).state = "ARMED";
    (homeState.devices["fan_bedroom"].state as any).power = "ON";
    (homeState.devices["fan_bedroom"].state as any).speed = 1; // already "low"
    (homeState.devices["ac_living_room"].state as any).power = "OFF";

    const trace = createMockTrace();
    const result = GoingToSleepPolicy.evaluate(trace, homeState);

    // Zero redundant actions generated
    expect(result.actions).toHaveLength(0);
    expect(result.skippedRedundantActions).toHaveLength(8);
  });

  it("Test C & D: Jev Noul decision = NO (affirmative=false) must not generate action", () => {
    const homeState = createBaseHomeState();
    (homeState.devices["lock_main_door"].state as any).state = "UNLOCKED";

    // Jev decides NOT to lock door (noul probability = 0.1, affirmative = false)
    const trace = createMockTrace({
      lock_main_door: {
        questionId: "lock_main_door",
        questionType: "noul",
        instructions: "Lock door?",
        rawAnswer: { type: "noul", noul: 0.1 },
        affirmative: false,
        confidence: 0.9,
        probability: 0.1,
      },
    });

    const result = GoingToSleepPolicy.evaluate(trace, homeState);
    const lockAction = result.actions.find((a) => a.deviceId === "lock_main_door");
    expect(lockAction).toBeUndefined();
  });

  it("Test E: Choice decision mapping for bedroom fan speeds", () => {
    const homeState = createBaseHomeState();
    (homeState.devices["fan_bedroom"].state as any).power = "OFF";
    (homeState.devices["fan_bedroom"].state as any).speed = 0;

    // Test 'medium' speed choice
    const traceMedium = createMockTrace({
      fan_bedroom: {
        questionId: "fan_bedroom",
        questionType: "choice",
        instructions: "Fan speed?",
        rawAnswer: { type: "choice", choice: "medium", confidence: 0.92, probabilities: {} },
        selectedChoice: "medium",
        confidence: 0.92,
      },
    });

    const resMedium = GoingToSleepPolicy.evaluate(traceMedium, homeState);
    const fanAction = resMedium.actions.find((a) => a.deviceId === "fan_bedroom");
    expect(fanAction).toBeDefined();
    expect(fanAction?.actionType).toBe("SET_FAN_SPEED");
    expect(fanAction?.value).toBe(2);
  });

  it("Test J: Unsupported choice value must be skipped safely without crashing", () => {
    const homeState = createBaseHomeState();

    const traceInvalidChoice = createMockTrace({
      fan_bedroom: {
        questionId: "fan_bedroom",
        questionType: "choice",
        instructions: "Fan speed?",
        rawAnswer: { type: "choice", choice: "turbo_ultra", confidence: 0.9, probabilities: {} },
        selectedChoice: "turbo_ultra",
        confidence: 0.9,
      },
    });

    const result = GoingToSleepPolicy.evaluate(traceInvalidChoice, homeState);
    const fanAction = result.actions.find((a) => a.deviceId === "fan_bedroom");
    expect(fanAction).toBeUndefined();
    expect(result.skippedRedundantActions.some((s) => s.includes("unrecognized choice"))).toBe(true);
  });
});
