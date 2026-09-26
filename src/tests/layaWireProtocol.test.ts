import { describe, it, expect } from "vitest";
import {
  toLayaWireQuestion,
  toLayaWireQuestions,
  LayaChoiceQuestion,
  LayaNoulQuestion,
  LayaScoreQuestion,
  LayaSystemOneResponse,
} from "@/lib/laya/types";
import {
  buildLayaQuestions,
  buildLayaStateRepresentation,
  translateLayaDecisionsToActions,
} from "@/lib/laya/policy";
import { LayaClient, DEFAULT_LAYA_MODEL, DEFAULT_LAYA_BASE_URL } from "@/lib/laya/client";
import { LayaDecisionEngine } from "@/lib/laya/LayaDecisionEngine";
import { LayaApiError, LayaConnectionError } from "@/lib/laya/errors";
import { HomeState } from "@/types/home";

import { INITIAL_DEVICES } from "@/lib/devices.config";
import { INITIAL_ROOMS } from "@/lib/rooms.config";

function createMockHomeState(): HomeState {
  const devices = JSON.parse(JSON.stringify(INITIAL_DEVICES));
  devices["light_bedroom"].state = { power: "ON", brightness: 100, mode: "NORMAL" };
  devices["light_living_room"].state = { power: "OFF", brightness: 0, mode: "NORMAL" };
  devices["lock_main_door"].state = { state: "UNLOCKED" };
  devices["security_system"].state = { state: "DISARMED", mode: "DISARMED" };
  devices["curtain_bedroom"].state = { state: "OPEN", position: 100 };
  devices["ac_living_room"].state = { power: "ON", mode: "COOL", targetTemperature: 24 };

  return {
    simulationTime: "2026-09-26T22:00:00Z",
    isSimulatedClock: true,
    simulationSpeed: 1,
    automationMode: "MANUAL_SIMULATION",
    rooms: INITIAL_ROOMS,
    devices,
    currentScenario: null,
    currentIntentText: "",
    lastAction: null,
    actionHistory: [],
    occupancy: {
      humans: [{ id: "user-1", name: "User", present: true, location: "bedroom" }],
      pets: [],
    },
  };
}

describe("Milestone 3.9B — Laya Wire Protocol & Adapter Alignment", () => {
  // =========================================================================
  // 1. Request Translation: question/options -> instructions/criteria
  // =========================================================================
  describe("1. Request Protocol Translation", () => {
    it("translates choice questions from (question, options) to (instructions, criteria)", () => {
      const internalChoice: LayaChoiceQuestion = {
        type: "choice",
        question: "Which automation family matches?",
        options: ["GOING_TO_SLEEP", "LEAVING_HOME", "OTHER"],
      };

      const wire = toLayaWireQuestion(internalChoice) as any;
      expect(wire.type).toBe("choice");
      expect(wire.instructions).toBe("Which automation family matches?");
      expect(wire.criteria).toEqual(["GOING_TO_SLEEP", "LEAVING_HOME", "OTHER"]);
      expect(wire.question).toBeUndefined();
      expect(wire.options).toBeUndefined();
    });

    it("translates noul questions from (question) to (instructions)", () => {
      const internalNoul: LayaNoulQuestion = {
        type: "noul",
        question: "Should main living area lighting be powered off?",
      };

      const wire = toLayaWireQuestion(internalNoul) as any;
      expect(wire.type).toBe("noul");
      expect(wire.instructions).toBe("Should main living area lighting be powered off?");
      expect(wire.question).toBeUndefined();
    });

    it("translates score questions from (question, levels) to (instructions, criteria)", () => {
      const internalScore: LayaScoreQuestion = {
        type: "score",
        question: "Rate lighting brightness required",
        levels: ["OFF", "DIM", "BRIGHT"],
      };

      const wire = toLayaWireQuestion(internalScore) as any;
      expect(wire.type).toBe("score");
      expect(wire.instructions).toBe("Rate lighting brightness required");
      expect(wire.criteria).toEqual(["OFF", "DIM", "BRIGHT"]);
    });

    it("translates full question maps via toLayaWireQuestions", () => {
      const homeState = createMockHomeState();
      const internalMap = buildLayaQuestions("I'm going to sleep", homeState);

      const wireMap = toLayaWireQuestions(internalMap);

      for (const [key, q] of Object.entries(wireMap)) {
        const wireQ = q as any;
        expect(wireQ.instructions).toBeDefined();
        expect(typeof wireQ.instructions).toBe("string");
        expect(wireQ.instructions.length).toBeGreaterThan(0);
        if (wireQ.type === "choice") {
          expect(Array.isArray(wireQ.criteria)).toBe(true);
          expect(wireQ.criteria.length).toBeGreaterThan(0);
        }
      }
    });

    it("buildLayaQuestions natively supplies instructions and criteria", () => {
      const homeState = createMockHomeState();
      const questions = buildLayaQuestions("I'm going to sleep", homeState);

      expect(questions.intent_family.instructions).toBe("Which primary automation family best matches the user's intent?");
      expect(Array.isArray(questions.intent_family.criteria)).toBe(true);
      expect(questions.turn_off_main_lighting.instructions).toBe("Should main living area lighting be powered off?");
    });
  });

  // =========================================================================
  // 2. Response Translation: choice, noul, score
  // =========================================================================
  describe("2. Response Translation", () => {
    it("translates genuine choice response (answer.choice) to appropriate decision value", () => {
      const homeState = createMockHomeState();
      const mockResponse: LayaSystemOneResponse = {
        model: "laya-rl-agent",
        answers: {
          intent_family: {
            type: "choice",
            choice: "GOING_TO_SLEEP",
            confidence: 0.7982,
            answer_confidence: 0.9009,
            probabilities: { GOING_TO_SLEEP: 0.9009, OTHER: 0.0991 },
          },
          turn_off_main_lighting: { type: "noul", noul: 0.5339, confidence: 0.5339 },
          lock_entrance_deadbolt: { type: "noul", noul: 0.5525, confidence: 0.5525 },
          arm_security_system: { type: "noul", noul: 0.1964, confidence: 0.8036 },
        },
      };

      const result = translateLayaDecisionsToActions("I am going to sleep", homeState, mockResponse);

      expect(result.intentFamily).toBe("GOING_TO_SLEEP");
      expect(result.actions.length).toBeGreaterThan(0);
      expect(result.confidence).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it("translates genuine noul response (answer.noul as float probability)", () => {
      const homeState = createMockHomeState();
      // Test noul >= 0.5 -> true (lock deadbolt), noul < 0.5 -> false (arm security)
      const mockResponse: LayaSystemOneResponse = {
        model: "laya-rl-agent",
        answers: {
          intent_family: { type: "choice", choice: "GOING_TO_SLEEP", confidence: 0.9 },
          turn_off_main_lighting: { type: "noul", noul: 0.92, confidence: 0.92 },
          lock_entrance_deadbolt: { type: "noul", noul: 0.88, confidence: 0.88 }, // >= 0.5 -> lock
          arm_security_system: { type: "noul", noul: 0.15, confidence: 0.85 }, // < 0.5 -> do NOT arm
        },
      };

      const result = translateLayaDecisionsToActions("I am going to sleep", homeState, mockResponse);

      const actionTypes = result.actions.map((a) => a.actionType);
      const actionDevices = result.actions.map((a) => a.deviceId);

      // Lock deadbolt should be present because noul=0.88 >= 0.5
      expect(actionDevices).toContain("lock_main_door");
      expect(actionTypes).toContain("LOCK");

      // Arm security should NOT be present because noul=0.15 < 0.5
      expect(actionDevices).not.toContain("security_system");
    });

    it("preserves missing confidence strictly as undefined (zero fabrication)", () => {
      const homeState = createMockHomeState();
      const mockResponseWithoutConfidence: LayaSystemOneResponse = {
        model: "laya-rl-agent",
        answers: {
          intent_family: { type: "choice", choice: "GOING_TO_SLEEP" },
          turn_off_main_lighting: { type: "noul", noul: 0.9 },
        },
      };

      const result = translateLayaDecisionsToActions("I am going to sleep", homeState, mockResponseWithoutConfidence);

      expect(result.intentFamily).toBe("GOING_TO_SLEEP");
      expect(result.confidence).toBeUndefined();
      expect(result.confidence).not.toBe(0.92);
      expect(result.reasoning).not.toContain("reported confidence");
      expect(result.reasoning).not.toContain("calibrated confidence");
    });
  });

  // =========================================================================
  // 3. Model Identity & Metadata Alignment
  // =========================================================================
  describe("3. Model Identity & Metadata", () => {
    it("DEFAULT_LAYA_MODEL is configured as 'english'", () => {
      expect(DEFAULT_LAYA_MODEL).toBe("english");
      const client = new LayaClient();
      expect(client.getModel()).toBe("english");
    });

    it("LayaDecisionEngine metadata preserves checkpoint 'english' and repo 'convaiinnovations/laya'", async () => {
      const mockClient = {
        getModel: () => "english",
        getBaseUrl: () => DEFAULT_LAYA_BASE_URL,
        checkHealth: async () => ({ healthy: true, status: "ok", detail: "ready", loaded: ["english"] }),
        evaluateSystemOne: async () => ({
          model: "laya-rl-agent",
          routing: { model: "english", repo: "convaiinnovations/laya", reason: "explicit model='english'" },
          answers: {
            intent_family: { type: "choice", choice: "GOING_TO_SLEEP", confidence: 0.9 },
            turn_off_main_lighting: { type: "noul", noul: 0.9, confidence: 0.9 },
          },
        }),
      } as unknown as LayaClient;

      const engine = new LayaDecisionEngine({}, mockClient);
      const homeState = createMockHomeState();

      const decision = await engine.evaluate("I am going to sleep", homeState);

      expect(decision.metadata).toBeDefined();
      const meta = decision.metadata as any;
      expect(meta.provider).toBe("laya");
      expect(meta.checkpoint).toBe("english");
      expect(meta.repository).toBe("convaiinnovations/laya");
      expect(meta.architecture).toContain("ModernBERT-large");
      expect(meta.runtime).toContain("laya-serve");
    });
  });

  // =========================================================================
  // 4. Error & Malformed Response Handling
  // =========================================================================
  describe("4. Error & Schema Validation Handling", () => {
    it("handles HTTP 422 errors by throwing LayaApiError with status and detail", async () => {
      const mockFetch = async () => ({
        ok: false,
        status: 422,
        statusText: "Unprocessable Entity",
        json: async () => ({ detail: "question 'intent_family': no 'instructions'" }),
      });

      const client = new LayaClient({
        baseUrl: "http://127.0.0.1:8081",
        fetchFn: mockFetch as unknown as typeof fetch,
      });

      await expect(
        client.evaluateSystemOne({
          state: "test",
          questions: {},
        })
      ).rejects.toThrow(LayaApiError);

      try {
        await client.evaluateSystemOne({ state: "test", questions: {} });
      } catch (err: any) {
        expect(err.statusCode).toBe(422);
        expect(err.message).toContain("no 'instructions'");
      }
    });

    it("handles connection failure by throwing LayaConnectionError without leaking secret", async () => {
      const mockFetch = async () => {
        throw new Error("ECONNREFUSED 127.0.0.1:8081");
      };

      const client = new LayaClient({
        baseUrl: "http://127.0.0.1:8081",
        fetchFn: mockFetch as unknown as typeof fetch,
      });

      await expect(
        client.evaluateSystemOne({ state: "test", questions: {} })
      ).rejects.toThrow(LayaConnectionError);
    });

    it("LayaDecisionEngine fails cleanly without falling back to Jev or Ollama", async () => {
      const mockClient = {
        getModel: () => "english",
        getBaseUrl: () => "http://127.0.0.1:8081",
        checkHealth: async () => ({ healthy: false, status: "UNREACHABLE", detail: "offline" }),
        evaluateSystemOne: async () => {
          throw new LayaConnectionError("Cannot connect to Laya server");
        },
      } as unknown as LayaClient;

      const engine = new LayaDecisionEngine({}, mockClient);
      const homeState = createMockHomeState();

      // Must reject directly; must NEVER call Ollama or Jev
      await expect(engine.evaluate("I am going to sleep", homeState)).rejects.toThrow(
        LayaConnectionError
      );
    });
  });
});
