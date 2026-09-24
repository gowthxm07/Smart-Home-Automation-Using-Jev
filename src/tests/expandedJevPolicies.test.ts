import { describe, it, expect, vi } from "vitest";
import {
  LeavingHomePolicy,
  MovieNightPolicy,
  WorkingPolicy,
  ComingHomePolicy,
  RelaxingPolicy,
  WakingUpPolicy,
  GoingToSleepPolicy,
} from "@/lib/policies";
import {
  JevDecisionEngine,
  detectIntentFamily,
  JevIntentFamily,
} from "@/lib/jev/JevDecisionEngine";
import { JevDecisionTrace } from "@/lib/jev/trace";
import { INITIAL_DEVICES } from "@/lib/devices.config";
import { INITIAL_ROOMS } from "@/lib/rooms.config";
import { HomeState } from "@/types/home";
import { getAllEvaluationScenarios } from "@/lib/evaluation/dataset";
import { TypeSafeClient } from "@/lib/typesafe/client";
import { SystemOneRequest, SystemOneResponse } from "@/lib/typesafe/types";
import fs from "fs";
import path from "path";

function createFreshHomeState(customizer?: (devices: Record<string, any>) => void): HomeState {
  const devices = JSON.parse(JSON.stringify(INITIAL_DEVICES));
  if (customizer) {
    customizer(devices);
  }
  return {
    simulationTime: "2026-09-24T10:00:00.000Z",
    isSimulatedClock: true,
    simulationSpeed: 1,
    automationMode: "MANUAL_SIMULATION",
    rooms: INITIAL_ROOMS,
    devices,
    currentScenario: null,
    currentIntentText: "",
    lastAction: null,
    actionHistory: [],
  };
}

function makeNoulDecision(questionId: string, affirmative: boolean, probability = 0.95) {
  return {
    questionId,
    questionType: "noul" as const,
    instructions: `Instruction for ${questionId}`,
    rawAnswer: { type: "noul" as const, noul: probability },
    affirmative,
    confidence: probability,
    probability,
  };
}

function makeChoiceDecision(questionId: string, selectedChoice: string, confidence = 0.92) {
  const probabilities = { [selectedChoice]: confidence };
  return {
    questionId,
    questionType: "choice" as const,
    instructions: `Instruction for ${questionId}`,
    rawAnswer: { type: "choice" as const, choice: selectedChoice, confidence, probabilities },
    selectedChoice,
    confidence,
    probability: confidence,
    probabilities,
  };
}

describe("Milestone 3.5 — Expanded Jev Decision Coverage", () => {
  // =========================================================================
  // 1. LEAVING_HOME POLICY
  // =========================================================================
  describe("LeavingHomePolicy", () => {
    it("generates complete departure actions when all devices require shutdown and securing", () => {
      const homeState = createFreshHomeState((d) => {
        d["lock_main_door"].state.state = "UNLOCKED";
        d["security_system"].state.state = "DISARMED";
        d["light_entrance"].state.power = "ON";
        d["light_living_room"].state.power = "ON";
        d["light_kitchen"].state.power = "ON";
        d["light_study"].state.power = "ON";
        d["light_bedroom"].state.power = "ON";
        d["tv_living_room"].state.power = "ON";
        d["ac_living_room"].state.power = "ON";
        d["plug_kitchen_general"].state.power = "ON";
        d["plug_laptop_charger"].state.power = "ON";
      });

      const trace: JevDecisionTrace = {
        scenarioId: "LEAVING_HOME",
        intent: "I'm leaving home.",
        modelUsed: "jev-latest",
        tokenUsage: { input_tokens: 200, output_tokens: 30 },
        overallConfidence: 0.96,
        timestamp: new Date().toISOString(),
        decisions: {
          lock_main_door: makeNoulDecision("lock_main_door", true),
          security_system: makeNoulDecision("security_system", true),
          light_entrance: makeNoulDecision("light_entrance", true),
          light_living_room: makeNoulDecision("light_living_room", true),
          light_kitchen: makeNoulDecision("light_kitchen", true),
          light_study: makeNoulDecision("light_study", true),
          light_bedroom: makeNoulDecision("light_bedroom", true),
          tv_living_room: makeNoulDecision("tv_living_room", true),
          ac_living_room: makeNoulDecision("ac_living_room", true),
          plug_kitchen_general: makeNoulDecision("plug_kitchen_general", true),
          plug_laptop_charger: makeNoulDecision("plug_laptop_charger", true),
        },
      };

      const result = LeavingHomePolicy.evaluate(trace, homeState);

      expect(result.actions).toHaveLength(11);
      expect(result.skippedRedundantActions).toHaveLength(0);

      const lockAction = result.actions.find((a) => a.deviceId === "lock_main_door");
      expect(lockAction?.actionType).toBe("LOCK");
      expect(lockAction?.source).toBe("JEV");

      const secAction = result.actions.find((a) => a.deviceId === "security_system");
      expect(secAction?.actionType).toBe("ARM");
      expect(secAction?.value).toBe("AWAY");

      const tvAction = result.actions.find((a) => a.deviceId === "tv_living_room");
      expect(tvAction?.actionType).toBe("TURN_OFF");
    });

    it("eliminates redundant departure actions when devices are already locked or off", () => {
      const homeState = createFreshHomeState((d) => {
        d["lock_main_door"].state.state = "LOCKED";
        d["security_system"].state.state = "ARMED";
        d["light_entrance"].state.power = "OFF";
        d["light_living_room"].state.power = "OFF";
        d["light_kitchen"].state.power = "ON";
      });

      const trace: JevDecisionTrace = {
        scenarioId: "LEAVING_HOME",
        intent: "I'm leaving home.",
        modelUsed: "jev-latest",
        tokenUsage: { input_tokens: 100, output_tokens: 20 },
        overallConfidence: 0.95,
        timestamp: new Date().toISOString(),
        decisions: {
          lock_main_door: makeNoulDecision("lock_main_door", true),
          security_system: makeNoulDecision("security_system", true),
          light_entrance: makeNoulDecision("light_entrance", true),
          light_living_room: makeNoulDecision("light_living_room", true),
          light_kitchen: makeNoulDecision("light_kitchen", true),
        },
      };

      const result = LeavingHomePolicy.evaluate(trace, homeState);

      expect(result.actions).toHaveLength(1);
      expect(result.actions[0].deviceId).toBe("light_kitchen");
      expect(result.actions[0].actionType).toBe("TURN_OFF");

      expect(result.skippedRedundantActions).toContain("lock_main_door: already LOCKED");
      expect(result.skippedRedundantActions).toContain("security_system: already ARMED");
      expect(result.skippedRedundantActions).toContain("light_entrance: already OFF");
    });

    it("produces zero actions when entire home is already in departure state", () => {
      const homeState = createFreshHomeState((d) => {
        d["lock_main_door"].state.state = "LOCKED";
        d["security_system"].state.state = "ARMED";
        d["light_entrance"].state.power = "OFF";
        d["light_living_room"].state.power = "OFF";
        d["light_study"].state.power = "OFF";
        d["tv_living_room"].state.power = "OFF";
      });

      const trace: JevDecisionTrace = {
        scenarioId: "LEAVING_HOME",
        intent: "I'm leaving home.",
        modelUsed: "jev-latest",
        tokenUsage: { input_tokens: 100, output_tokens: 20 },
        overallConfidence: 0.95,
        timestamp: new Date().toISOString(),
        decisions: {
          lock_main_door: makeNoulDecision("lock_main_door", true),
          security_system: makeNoulDecision("security_system", true),
          light_entrance: makeNoulDecision("light_entrance", true),
          light_living_room: makeNoulDecision("light_living_room", true),
          light_study: makeNoulDecision("light_study", true),
          tv_living_room: makeNoulDecision("tv_living_room", true),
        },
      };

      const result = LeavingHomePolicy.evaluate(trace, homeState);
      expect(result.actions).toHaveLength(0);
      expect(result.skippedRedundantActions).toHaveLength(6);
    });
  });

  // =========================================================================
  // 2. MOVIE_NIGHT POLICY
  // =========================================================================
  describe("MovieNightPolicy", () => {
    it("generates cinema activation actions when TV is off, lights full, and curtains open", () => {
      const homeState = createFreshHomeState((d) => {
        d["tv_living_room"].state.power = "OFF";
        d["plug_tv_outlet"].state.power = "OFF";
        d["light_living_room"].state.power = "ON";
        d["light_living_room"].state.mode = "NORMAL";
        d["light_living_room"].state.brightness = 100;
        d["curtain_living_room"].state.state = "OPEN";
        d["light_kitchen"].state.power = "ON";
      });

      const trace: JevDecisionTrace = {
        scenarioId: "MOVIE_NIGHT",
        intent: "Movie night.",
        modelUsed: "jev-latest",
        tokenUsage: { input_tokens: 150, output_tokens: 25 },
        overallConfidence: 0.94,
        timestamp: new Date().toISOString(),
        decisions: {
          tv_living_room: makeNoulDecision("tv_living_room", true),
          plug_tv_outlet: makeNoulDecision("plug_tv_outlet", true),
          light_living_room: makeNoulDecision("light_living_room", true),
          curtain_living_room: makeNoulDecision("curtain_living_room", true),
          light_kitchen: makeNoulDecision("light_kitchen", true),
        },
      };

      const result = MovieNightPolicy.evaluate(trace, homeState);

      expect(result.actions).toHaveLength(5);
      expect(result.actions.find((a) => a.deviceId === "tv_living_room")?.actionType).toBe("TURN_ON");
      expect(result.actions.find((a) => a.deviceId === "plug_tv_outlet")?.actionType).toBe("TURN_ON");
      expect(result.actions.find((a) => a.deviceId === "light_living_room")?.actionType).toBe("SET_DIMMED");
      expect(result.actions.find((a) => a.deviceId === "curtain_living_room")?.actionType).toBe("CLOSE_CURTAIN");
      expect(result.actions.find((a) => a.deviceId === "light_kitchen")?.actionType).toBe("TURN_OFF");
    });

    it("eliminates redundant actions when TV is already playing and curtains are closed", () => {
      const homeState = createFreshHomeState((d) => {
        d["tv_living_room"].state.power = "ON";
        d["plug_tv_outlet"].state.power = "ON";
        d["curtain_living_room"].state.state = "CLOSED";
        d["light_living_room"].state.power = "ON";
        d["light_living_room"].state.mode = "NORMAL";
      });

      const trace: JevDecisionTrace = {
        scenarioId: "MOVIE_NIGHT",
        intent: "Movie night.",
        modelUsed: "jev-latest",
        tokenUsage: { input_tokens: 120, output_tokens: 20 },
        overallConfidence: 0.94,
        timestamp: new Date().toISOString(),
        decisions: {
          tv_living_room: makeNoulDecision("tv_living_room", true),
          plug_tv_outlet: makeNoulDecision("plug_tv_outlet", true),
          light_living_room: makeNoulDecision("light_living_room", true),
          curtain_living_room: makeNoulDecision("curtain_living_room", true),
        },
      };

      const result = MovieNightPolicy.evaluate(trace, homeState);

      expect(result.actions).toHaveLength(1);
      expect(result.actions[0].deviceId).toBe("light_living_room");
      expect(result.actions[0].actionType).toBe("SET_DIMMED");
      expect(result.skippedRedundantActions).toContain("tv_living_room: already ON");
      expect(result.skippedRedundantActions).toContain("curtain_living_room: already CLOSED");
    });
  });

  // =========================================================================
  // 3. WORKING POLICY
  // =========================================================================
  describe("WorkingPolicy", () => {
    it("generates productivity actions: turns on study light and charger, turns off TV", () => {
      const homeState = createFreshHomeState((d) => {
        d["light_study"].state.power = "OFF";
        d["plug_laptop_charger"].state.power = "OFF";
        d["tv_living_room"].state.power = "ON";
      });

      const trace: JevDecisionTrace = {
        scenarioId: "WORKING",
        intent: "I'm going to work.",
        modelUsed: "jev-latest",
        tokenUsage: { input_tokens: 80, output_tokens: 15 },
        overallConfidence: 0.96,
        timestamp: new Date().toISOString(),
        decisions: {
          light_study: makeNoulDecision("light_study", true),
          plug_laptop_charger: makeNoulDecision("plug_laptop_charger", true),
          tv_living_room: makeNoulDecision("tv_living_room", true),
        },
      };

      const result = WorkingPolicy.evaluate(trace, homeState);

      expect(result.actions).toHaveLength(3);
      expect(result.actions.find((a) => a.deviceId === "light_study")?.actionType).toBe("TURN_ON");
      expect(result.actions.find((a) => a.deviceId === "plug_laptop_charger")?.actionType).toBe("TURN_ON");
      expect(result.actions.find((a) => a.deviceId === "tv_living_room")?.actionType).toBe("TURN_OFF");
    });

    it("skips actions when study is already configured and TV is off", () => {
      const homeState = createFreshHomeState((d) => {
        d["light_study"].state.power = "ON";
        d["plug_laptop_charger"].state.power = "ON";
        d["tv_living_room"].state.power = "OFF";
      });

      const trace: JevDecisionTrace = {
        scenarioId: "WORKING",
        intent: "I'm going to work.",
        modelUsed: "jev-latest",
        tokenUsage: { input_tokens: 80, output_tokens: 15 },
        overallConfidence: 0.96,
        timestamp: new Date().toISOString(),
        decisions: {
          light_study: makeNoulDecision("light_study", true),
          plug_laptop_charger: makeNoulDecision("plug_laptop_charger", true),
          tv_living_room: makeNoulDecision("tv_living_room", true),
        },
      };

      const result = WorkingPolicy.evaluate(trace, homeState);
      expect(result.actions).toHaveLength(0);
      expect(result.skippedRedundantActions).toContain("light_study: already ON");
      expect(result.skippedRedundantActions).toContain("plug_laptop_charger: already ON");
      expect(result.skippedRedundantActions).toContain("tv_living_room: already OFF");
    });
  });

  // =========================================================================
  // 4. COMING_HOME POLICY
  // =========================================================================
  describe("ComingHomePolicy", () => {
    it("generates arrival actions: unlocks door, disarms alarm, and illuminates entrance and living room", () => {
      const homeState = createFreshHomeState((d) => {
        d["lock_main_door"].state.state = "LOCKED";
        d["security_system"].state.state = "ARMED";
        d["light_entrance"].state.power = "OFF";
        d["light_living_room"].state.power = "OFF";
        d["ac_living_room"].state.power = "OFF";
      });

      const trace: JevDecisionTrace = {
        scenarioId: "COMING_HOME",
        intent: "I'm coming home.",
        modelUsed: "jev-latest",
        tokenUsage: { input_tokens: 120, output_tokens: 20 },
        overallConfidence: 0.95,
        timestamp: new Date().toISOString(),
        decisions: {
          lock_main_door: makeNoulDecision("lock_main_door", true),
          security_system: makeNoulDecision("security_system", true),
          light_entrance: makeNoulDecision("light_entrance", true),
          light_living_room: makeNoulDecision("light_living_room", true),
          ac_living_room: makeNoulDecision("ac_living_room", true),
        },
      };

      const result = ComingHomePolicy.evaluate(trace, homeState);

      expect(result.actions).toHaveLength(5);
      expect(result.actions.find((a) => a.deviceId === "lock_main_door")?.actionType).toBe("UNLOCK");
      expect(result.actions.find((a) => a.deviceId === "security_system")?.actionType).toBe("DISARM");
      expect(result.actions.find((a) => a.deviceId === "light_entrance")?.actionType).toBe("TURN_ON");
      expect(result.actions.find((a) => a.deviceId === "light_living_room")?.actionType).toBe("TURN_ON");
      expect(result.actions.find((a) => a.deviceId === "ac_living_room")?.actionType).toBe("TURN_ON");
    });

    it("eliminates redundant actions when entrance light was pre-scheduled on", () => {
      const homeState = createFreshHomeState((d) => {
        d["lock_main_door"].state.state = "LOCKED";
        d["security_system"].state.state = "ARMED";
        d["light_entrance"].state.power = "ON";
      });

      const trace: JevDecisionTrace = {
        scenarioId: "COMING_HOME",
        intent: "I'm coming home.",
        modelUsed: "jev-latest",
        tokenUsage: { input_tokens: 100, output_tokens: 15 },
        overallConfidence: 0.95,
        timestamp: new Date().toISOString(),
        decisions: {
          lock_main_door: makeNoulDecision("lock_main_door", true),
          security_system: makeNoulDecision("security_system", true),
          light_entrance: makeNoulDecision("light_entrance", true),
        },
      };

      const result = ComingHomePolicy.evaluate(trace, homeState);

      expect(result.actions).toHaveLength(2);
      expect(result.actions.find((a) => a.deviceId === "light_entrance")).toBeUndefined();
      expect(result.skippedRedundantActions).toContain("light_entrance: already ON");
    });
  });

  // =========================================================================
  // 5. RELAXING POLICY
  // =========================================================================
  describe("RelaxingPolicy", () => {
    it("generates relaxation actions: dims living light, closes curtains, turns off study light, engages fan", () => {
      const homeState = createFreshHomeState((d) => {
        d["light_living_room"].state.power = "ON";
        d["light_living_room"].state.mode = "NORMAL";
        d["curtain_living_room"].state.state = "OPEN";
        d["light_study"].state.power = "ON";
        d["fan_bedroom"].state.power = "OFF";
      });

      const trace: JevDecisionTrace = {
        scenarioId: "RELAXING",
        intent: "I want to relax.",
        modelUsed: "jev-latest",
        tokenUsage: { input_tokens: 110, output_tokens: 20 },
        overallConfidence: 0.93,
        timestamp: new Date().toISOString(),
        decisions: {
          light_living_room: makeNoulDecision("light_living_room", true),
          curtain_living_room: makeNoulDecision("curtain_living_room", true),
          light_study: makeNoulDecision("light_study", true),
          fan_bedroom: makeChoiceDecision("fan_bedroom", "low"),
        },
      };

      const result = RelaxingPolicy.evaluate(trace, homeState);

      expect(result.actions).toHaveLength(4);
      expect(result.actions.find((a) => a.deviceId === "light_living_room")?.actionType).toBe("SET_DIMMED");
      expect(result.actions.find((a) => a.deviceId === "curtain_living_room")?.actionType).toBe("CLOSE_CURTAIN");
      expect(result.actions.find((a) => a.deviceId === "light_study")?.actionType).toBe("TURN_OFF");
      const fanAction = result.actions.find((a) => a.deviceId === "fan_bedroom");
      expect(fanAction?.actionType).toBe("SET_FAN_SPEED");
      expect(fanAction?.value).toBe(1);
    });

    it("skips actions when relaxation state is already set", () => {
      const homeState = createFreshHomeState((d) => {
        d["light_living_room"].state.power = "ON";
        d["light_living_room"].state.mode = "DIMMED";
        d["curtain_living_room"].state.state = "CLOSED";
        d["light_study"].state.power = "OFF";
        d["fan_bedroom"].state.power = "ON";
        d["fan_bedroom"].state.speed = 1;
      });

      const trace: JevDecisionTrace = {
        scenarioId: "RELAXING",
        intent: "I want to relax.",
        modelUsed: "jev-latest",
        tokenUsage: { input_tokens: 110, output_tokens: 20 },
        overallConfidence: 0.93,
        timestamp: new Date().toISOString(),
        decisions: {
          light_living_room: makeNoulDecision("light_living_room", true),
          curtain_living_room: makeNoulDecision("curtain_living_room", true),
          light_study: makeNoulDecision("light_study", true),
          fan_bedroom: makeChoiceDecision("fan_bedroom", "low"),
        },
      };

      const result = RelaxingPolicy.evaluate(trace, homeState);
      expect(result.actions).toHaveLength(0);
      expect(result.skippedRedundantActions).toContain("light_living_room: already DIMMED");
      expect(result.skippedRedundantActions).toContain("curtain_living_room: already CLOSED");
      expect(result.skippedRedundantActions).toContain("fan_bedroom: already at speed 1");
    });
  });

  // =========================================================================
  // 6. WAKING_UP POLICY
  // =========================================================================
  describe("WakingUpPolicy", () => {
    it("generates morning actions: opens curtains, extinguishes night lamp, starts kitchen plug, stops fan", () => {
      const homeState = createFreshHomeState((d) => {
        d["curtain_bedroom"].state.state = "CLOSED";
        d["light_night_lamp"].state.power = "ON";
        d["plug_kitchen_general"].state.power = "OFF";
        d["fan_bedroom"].state.power = "ON";
        d["fan_bedroom"].state.speed = 2;
        d["light_kitchen"].state.power = "OFF";
      });

      const trace: JevDecisionTrace = {
        scenarioId: "WAKING_UP",
        intent: "I'm waking up.",
        modelUsed: "jev-latest",
        tokenUsage: { input_tokens: 130, output_tokens: 22 },
        overallConfidence: 0.95,
        timestamp: new Date().toISOString(),
        decisions: {
          curtain_bedroom: makeNoulDecision("curtain_bedroom", true),
          light_night_lamp: makeNoulDecision("light_night_lamp", true),
          plug_kitchen_general: makeNoulDecision("plug_kitchen_general", true),
          fan_bedroom: makeChoiceDecision("fan_bedroom", "off"),
          light_kitchen: makeNoulDecision("light_kitchen", true),
        },
      };

      const result = WakingUpPolicy.evaluate(trace, homeState);

      expect(result.actions).toHaveLength(5);
      expect(result.actions.find((a) => a.deviceId === "curtain_bedroom")?.actionType).toBe("OPEN_CURTAIN");
      expect(result.actions.find((a) => a.deviceId === "light_night_lamp")?.actionType).toBe("TURN_OFF");
      expect(result.actions.find((a) => a.deviceId === "plug_kitchen_general")?.actionType).toBe("TURN_ON");
      expect(result.actions.find((a) => a.deviceId === "fan_bedroom")?.actionType).toBe("SET_FAN_SPEED");
      expect(result.actions.find((a) => a.deviceId === "fan_bedroom")?.value).toBe(0);
      expect(result.actions.find((a) => a.deviceId === "light_kitchen")?.actionType).toBe("TURN_ON");
    });

    it("eliminates redundant actions when curtains are already open and lamp is off", () => {
      const homeState = createFreshHomeState((d) => {
        d["curtain_bedroom"].state.state = "OPEN";
        d["light_night_lamp"].state.power = "OFF";
        d["plug_kitchen_general"].state.power = "OFF";
      });

      const trace: JevDecisionTrace = {
        scenarioId: "WAKING_UP",
        intent: "I'm waking up.",
        modelUsed: "jev-latest",
        tokenUsage: { input_tokens: 90, output_tokens: 15 },
        overallConfidence: 0.95,
        timestamp: new Date().toISOString(),
        decisions: {
          curtain_bedroom: makeNoulDecision("curtain_bedroom", true),
          light_night_lamp: makeNoulDecision("light_night_lamp", true),
          plug_kitchen_general: makeNoulDecision("plug_kitchen_general", true),
        },
      };

      const result = WakingUpPolicy.evaluate(trace, homeState);

      expect(result.actions).toHaveLength(1);
      expect(result.actions[0].deviceId).toBe("plug_kitchen_general");
      expect(result.skippedRedundantActions).toContain("curtain_bedroom: already OPEN");
      expect(result.skippedRedundantActions).toContain("light_night_lamp: already OFF");
    });
  });

  // =========================================================================
  // 7. JEV DECISION ENGINE ROUTING & COVERAGE
  // =========================================================================
  describe("JevDecisionEngine Multi-Family Routing", () => {
    it("detects all 7 intent families correctly and returns null for unsupported intents", () => {
      expect(detectIntentFamily("I'm going to sleep.")).toBe("GOING_TO_SLEEP");
      expect(detectIntentFamily("I'm heading to bed.")).toBe("GOING_TO_SLEEP");
      expect(detectIntentFamily("I'm leaving home.")).toBe("LEAVING_HOME");
      expect(detectIntentFamily("I'm heading out for a while.")).toBe("LEAVING_HOME");
      expect(detectIntentFamily("Movie night.")).toBe("MOVIE_NIGHT");
      expect(detectIntentFamily("It's movie time.")).toBe("MOVIE_NIGHT");
      expect(detectIntentFamily("I'm going to work.")).toBe("WORKING");
      expect(detectIntentFamily("I'm coming home.")).toBe("COMING_HOME");
      expect(detectIntentFamily("I want to relax.")).toBe("RELAXING");
      expect(detectIntentFamily("I'm waking up.")).toBe("WAKING_UP");

      // Unsupported intents
      expect(detectIntentFamily("Lock down the house.")).toBeNull();
      expect(detectIntentFamily("I want the house ready for the night.")).toBeNull();
      expect(detectIntentFamily("Water the garden plants.")).toBeNull();
      expect(detectIntentFamily("")).toBeNull();
    });

    it("verifies supportsScenario across the 36-scenario dataset: 34 supported, 2 unsupported", () => {
      const engine = new JevDecisionEngine({ client: new TypeSafeClient({ apiKey: "test_key" }) });
      const scenarios = getAllEvaluationScenarios();
      expect(scenarios).toHaveLength(36);

      const supported = scenarios.filter((s) => engine.supportsScenario(s));
      const unsupported = scenarios.filter((s) => !engine.supportsScenario(s));

      expect(supported).toHaveLength(34);
      expect(unsupported).toHaveLength(2);

      const unsupportedIds = unsupported.map((s) => s.id);
      expect(unsupportedIds).toContain("security-lockdown-01");
      expect(unsupportedIds).toContain("ambiguous-night-ready-01");
    });

    it("executes an end-to-end evaluation for LEAVING_HOME with mocked TypeSafeClient", async () => {
      const homeState = createFreshHomeState((d) => {
        d["lock_main_door"].state.state = "UNLOCKED";
        d["security_system"].state.state = "DISARMED";
        d["light_living_room"].state.power = "ON";
      });

      const mockClient = new TypeSafeClient({ apiKey: "test_key" });
      vi.spyOn(mockClient, "evaluateSystemOne").mockImplementation(async (req: SystemOneRequest): Promise<SystemOneResponse> => {
        const answers: Record<string, any> = {};
        for (const qId of Object.keys(req.questions)) {
          answers[qId] = { type: "noul", noul: 0.95 };
        }
        return {
          model: "jev-latest",
          answers,
          usage: { input_tokens: 150, output_tokens: 20 },
        };
      });

      const engine = new JevDecisionEngine({ client: mockClient });
      const result = await engine.evaluate("I'm leaving home.", homeState);

      expect(result.source).toBe("JEV");
      expect(result.actions.length).toBeGreaterThan(0);
      expect(result.metadata?.decisionTrace).toBeDefined();
      expect((result.metadata?.decisionTrace as any)?.scenarioId).toBe("LEAVING_HOME");
    });
  });

  // =========================================================================
  // 8. ARCHITECTURAL GUARDRAIL: ZERO EVALUATION DATASET CONTAMINATION
  // =========================================================================
  describe("Architectural Guardrail: Zero Evaluation Dataset Contamination", () => {
    it("guarantees no policy in src/lib/policies/ imports from src/lib/evaluation/", () => {
      const policiesDir = path.resolve(process.cwd(), "src/lib/policies");
      const files = fs.readdirSync(policiesDir).filter((f) => f.endsWith(".ts"));

      expect(files.length).toBeGreaterThanOrEqual(7);

      for (const file of files) {
        const filePath = path.join(policiesDir, file);
        const content = fs.readFileSync(filePath, "utf-8");

        // Assert no import references evaluation
        expect(content).not.toMatch(/from\s+["'].*evaluation.*["']/i);
        expect(content).not.toMatch(/from\s+["']@\/lib\/evaluation.*["']/i);
        expect(content).not.toMatch(/EvaluationScenario/i);
        expect(content).not.toMatch(/expectedOutcome/i);
        expect(content).not.toMatch(/expectedDeviceStates/i);
      }
    });
  });
});
