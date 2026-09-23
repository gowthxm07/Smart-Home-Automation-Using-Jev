import { describe, it, expect, beforeEach } from "vitest";
import { SimulationEngine } from "@/lib/simulationEngine";
import { INITIAL_DEVICES } from "@/lib/devices.config";
import { INITIAL_ROOMS } from "@/lib/rooms.config";
import { HomeState } from "@/types/home";
import { Action } from "@/types/action";
import { LightState, FanState, ACState, LockState, SecurityState, CurtainState, SmartPlugState } from "@/types/device";

describe("SimulationEngine", () => {
  let engine: SimulationEngine;
  let baseState: HomeState;

  beforeEach(() => {
    engine = new SimulationEngine();
    baseState = {
      simulationTime: new Date("2026-09-23T10:00:00Z").toISOString(),
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
  });

  it("should turn a light ON and update brightness if initially 0", () => {
    const action: Action = {
      id: "act-1",
      deviceId: "light_living_room",
      actionType: "TURN_ON",
      source: "MANUAL",
      timestamp: baseState.simulationTime,
    };

    const result = engine.applyAction(action, baseState);
    expect(result.success).toBe(true);
    const updated = result.newState.devices["light_living_room"].state as LightState;
    expect(updated.power).toBe("ON");
    expect(updated.brightness).toBe(100);
    expect(result.newState.actionHistory).toHaveLength(1);
    expect(result.newState.actionHistory[0].source).toBe("MANUAL");
    expect(result.newState.actionHistory[0].deviceId).toBe("light_living_room");
  });

  it("should turn a light OFF", () => {
    // First turn ON
    const onAction: Action = {
      id: "act-1",
      deviceId: "light_bedroom",
      actionType: "TURN_ON",
      source: "MANUAL",
      timestamp: baseState.simulationTime,
    };
    const intermediate = engine.applyAction(onAction, baseState).newState;

    // Then turn OFF
    const offAction: Action = {
      id: "act-2",
      deviceId: "light_bedroom",
      actionType: "TURN_OFF",
      source: "MANUAL",
      timestamp: baseState.simulationTime,
    };
    const result = engine.applyAction(offAction, intermediate);
    expect(result.success).toBe(true);
    const updated = result.newState.devices["light_bedroom"].state as LightState;
    expect(updated.power).toBe("OFF");
    expect(result.newState.actionHistory).toHaveLength(2);
  });

  it("should set brightness on dimmable lights and adjust mode", () => {
    const dimAction: Action = {
      id: "act-dim",
      deviceId: "light_living_room",
      actionType: "SET_BRIGHTNESS",
      value: 20,
      source: "MANUAL",
      timestamp: baseState.simulationTime,
    };
    const result = engine.applyAction(dimAction, baseState);
    expect(result.success).toBe(true);
    const updated = result.newState.devices["light_living_room"].state as LightState;
    expect(updated.brightness).toBe(20);
    expect(updated.mode).toBe("DIMMED");
    expect(updated.power).toBe("ON");
  });

  it("should reject invalid brightness values", () => {
    const invalidAction: Action = {
      id: "act-inv",
      deviceId: "light_living_room",
      actionType: "SET_BRIGHTNESS",
      value: 150,
      source: "MANUAL",
      timestamp: baseState.simulationTime,
    };
    const result = engine.applyAction(invalidAction, baseState);
    expect(result.success).toBe(false);
    expect(result.error).toContain("between 0 and 100");
  });

  it("should lock and unlock the main door", () => {
    // Door starts LOCKED
    const unlockAction: Action = {
      id: "act-unlock",
      deviceId: "lock_main_door",
      actionType: "UNLOCK",
      source: "MANUAL",
      timestamp: baseState.simulationTime,
    };
    const unlockRes = engine.applyAction(unlockAction, baseState);
    expect(unlockRes.success).toBe(true);
    expect((unlockRes.newState.devices["lock_main_door"].state as LockState).state).toBe("UNLOCKED");

    const lockAction: Action = {
      id: "act-lock",
      deviceId: "lock_main_door",
      actionType: "LOCK",
      source: "MANUAL",
      timestamp: baseState.simulationTime,
    };
    const lockRes = engine.applyAction(lockAction, unlockRes.newState);
    expect(lockRes.success).toBe(true);
    expect((lockRes.newState.devices["lock_main_door"].state as LockState).state).toBe("LOCKED");
  });

  it("should change AC temperature and enforce valid boundaries", () => {
    const validAction: Action = {
      id: "act-ac",
      deviceId: "ac_living_room",
      actionType: "SET_TEMPERATURE",
      value: 21,
      source: "MANUAL",
      timestamp: baseState.simulationTime,
    };
    const res = engine.applyAction(validAction, baseState);
    expect(res.success).toBe(true);
    expect((res.newState.devices["ac_living_room"].state as ACState).targetTemperature).toBe(21);

    // Below 16 should be rejected
    const tooLowAction: Action = {
      id: "act-low",
      deviceId: "ac_living_room",
      actionType: "SET_TEMPERATURE",
      value: 14,
      source: "MANUAL",
      timestamp: baseState.simulationTime,
    };
    const lowRes = engine.applyAction(tooLowAction, baseState);
    expect(lowRes.success).toBe(false);
    expect(lowRes.error).toContain("between 16°C and 30°C");

    // Above 30 should be rejected
    const tooHighAction: Action = {
      id: "act-high",
      deviceId: "ac_living_room",
      actionType: "SET_TEMPERATURE",
      value: 35,
      source: "MANUAL",
      timestamp: baseState.simulationTime,
    };
    const highRes = engine.applyAction(tooHighAction, baseState);
    expect(highRes.success).toBe(false);
  });

  it("should turn fan ON and set fan speed accurately", () => {
    const fanSpeedAction: Action = {
      id: "act-fan",
      deviceId: "fan_bedroom",
      actionType: "SET_FAN_SPEED",
      value: 2,
      source: "MANUAL",
      timestamp: baseState.simulationTime,
    };
    const res = engine.applyAction(fanSpeedAction, baseState);
    expect(res.success).toBe(true);
    const updated = res.newState.devices["fan_bedroom"].state as FanState;
    expect(updated.speed).toBe(2);
    expect(updated.power).toBe("ON");

    // Invalid speed (e.g. 5) should fail
    const invalidFanAction: Action = {
      id: "act-fan-inv",
      deviceId: "fan_bedroom",
      actionType: "SET_FAN_SPEED",
      value: 5,
      source: "MANUAL",
      timestamp: baseState.simulationTime,
    };
    const invRes = engine.applyAction(invalidFanAction, baseState);
    expect(invRes.success).toBe(false);
    expect(invRes.error).toContain("Fan speed must be 0 (OFF), 1, 2, or 3");
  });

  it("should open and close motorized curtains", () => {
    const openAction: Action = {
      id: "act-curt-open",
      deviceId: "curtain_living_room",
      actionType: "OPEN_CURTAIN",
      source: "MANUAL",
      timestamp: baseState.simulationTime,
    };
    const openRes = engine.applyAction(openAction, baseState);
    expect(openRes.success).toBe(true);
    const openCurtain = openRes.newState.devices["curtain_living_room"].state as CurtainState;
    expect(openCurtain.state).toBe("OPEN");
    expect(openCurtain.position).toBe(100);

    const closeAction: Action = {
      id: "act-curt-close",
      deviceId: "curtain_living_room",
      actionType: "CLOSE_CURTAIN",
      source: "MANUAL",
      timestamp: baseState.simulationTime,
    };
    const closeRes = engine.applyAction(closeAction, openRes.newState);
    expect(closeRes.success).toBe(true);
    const closedCurtain = closeRes.newState.devices["curtain_living_room"].state as CurtainState;
    expect(closedCurtain.state).toBe("CLOSED");
    expect(closedCurtain.position).toBe(0);
  });

  it("should arm and disarm security system", () => {
    const armAction: Action = {
      id: "act-arm",
      deviceId: "security_system",
      actionType: "ARM",
      value: "AWAY",
      source: "MANUAL",
      timestamp: baseState.simulationTime,
    };
    const armRes = engine.applyAction(armAction, baseState);
    expect(armRes.success).toBe(true);
    const armedState = armRes.newState.devices["security_system"].state as SecurityState;
    expect(armedState.state).toBe("ARMED");
    expect(armedState.mode).toBe("AWAY");

    const disarmAction: Action = {
      id: "act-disarm",
      deviceId: "security_system",
      actionType: "DISARM",
      source: "MANUAL",
      timestamp: baseState.simulationTime,
    };
    const disarmRes = engine.applyAction(disarmAction, armRes.newState);
    expect(disarmRes.success).toBe(true);
    const disarmedState = disarmRes.newState.devices["security_system"].state as SecurityState;
    expect(disarmedState.state).toBe("DISARMED");
  });

  it("should toggle smart power plug with wattage simulation", () => {
    const plugAction: Action = {
      id: "act-plug-on",
      deviceId: "plug_phone_charger",
      actionType: "TURN_ON",
      source: "MANUAL",
      timestamp: baseState.simulationTime,
    };
    const res = engine.applyAction(plugAction, baseState);
    expect(res.success).toBe(true);
    const updated = res.newState.devices["plug_phone_charger"].state as SmartPlugState;
    expect(updated.power).toBe("ON");
    expect(updated.currentWatts).toBeGreaterThan(0);
  });

  it("should reject actions on unknown devices", () => {
    const unknownAction: Action = {
      id: "act-unknown",
      deviceId: "non_existent_device_xyz",
      actionType: "TURN_ON",
      source: "MANUAL",
      timestamp: baseState.simulationTime,
    };
    const res = engine.applyAction(unknownAction, baseState);
    expect(res.success).toBe(false);
    expect(res.error).toContain('Unknown device: "non_existent_device_xyz"');
    expect(res.newState).toBe(baseState); // Immutable state preservation
  });

  it("should reject unsupported actions on a device (e.g. setting fan speed on a door lock)", () => {
    const unsupportedAction: Action = {
      id: "act-unsupported",
      deviceId: "lock_main_door",
      actionType: "SET_FAN_SPEED",
      value: 2,
      source: "MANUAL",
      timestamp: baseState.simulationTime,
    };
    const res = engine.applyAction(unsupportedAction, baseState);
    expect(res.success).toBe(false);
    expect(res.error).toContain("does not support fan speed");
  });

  it("should record full action audit history with previous and new states", () => {
    const action: Action = {
      id: "act-audit",
      deviceId: "light_kitchen",
      actionType: "TURN_ON",
      source: "MANUAL",
      timestamp: baseState.simulationTime,
    };
    const res = engine.applyAction(action, baseState);
    expect(res.success).toBe(true);
    expect(res.logEntry).toBeDefined();
    expect(res.logEntry?.deviceId).toBe("light_kitchen");
    expect(res.logEntry?.deviceName).toBe("Kitchen Light");
    expect(res.logEntry?.roomId).toBe("kitchen");
    expect(res.logEntry?.source).toBe("MANUAL");
    expect(res.logEntry?.summary).toBe("OFF → ON (100%)");
  });
});
