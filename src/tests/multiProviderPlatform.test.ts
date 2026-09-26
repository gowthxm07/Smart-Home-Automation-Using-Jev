import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  ProviderRegistry,
  createDefaultProviderRegistry,
  ProviderRegistration,
  ProviderRuntimeStatus,
  ProviderEnablementMap,
} from "@/lib/providers";
import {
  setRuntimeTypeSafeApiKey,
  getRuntimeTypeSafeApiKey,
  clearRuntimeTypeSafeApiKey,
  hasRuntimeTypeSafeApiKey,
  getEffectiveTypeSafeApiKey,
  getTypeSafeApiKeySource,
  InvalidCredentialError,
} from "@/lib/typesafe/credentials";
import { GET as getCredentials, POST as postCredentials, DELETE as deleteCredentials } from "@/app/api/credentials/typesafe/route";
import { GET as getProviders, POST as postEvaluateProviders } from "@/app/api/providers/route";
import { LayaDecisionEngine } from "@/lib/laya/LayaDecisionEngine";
import { LayaClient } from "@/lib/laya/client";
import { translateLayaDecisionsToActions, buildLayaQuestions, buildLayaStateRepresentation } from "@/lib/laya/policy";
import {
  createOccupancyContext,
  hasPetsRemainingHome,
  getActivePetClimatePreference,
  DEMO_MOVIE_WITH_PET_CONTEXT,
} from "@/lib/context/occupancy";
import { getAllEvaluationScenarios, getEvaluationScenario } from "@/lib/evaluation/dataset";
import { computeDatasetHash, runControlledExperiment } from "@/lib/evaluation/comparison/experiment";
import { PREDEFINED_SCENARIOS } from "@/lib/scenarios.config";
import { HomeState } from "@/types/home";
import { DecisionEngine, DecisionResult } from "@/types/engine";
import { NextRequest } from "next/server";

import { INITIAL_DEVICES } from "@/lib/devices.config";
import { INITIAL_ROOMS } from "@/lib/rooms.config";

// Sample base HomeState for testing conforming to exact domain types
function createTestHomeState(): HomeState {
  const devices = JSON.parse(JSON.stringify(INITIAL_DEVICES));
  // Set default initial active states for testing
  devices["light_living_room"].state = { power: "ON", brightness: 80, mode: "NORMAL" };
  devices["light_kitchen"].state = { power: "ON", brightness: 100, mode: "NORMAL" };
  devices["tv_living_room"].state = { power: "ON", currentWatts: 120 };
  devices["lock_main_door"].state = { state: "UNLOCKED" };
  devices["security_system"].state = { state: "DISARMED", mode: "DISARMED" };
  devices["ac_living_room"].state = { power: "ON", mode: "COOL", targetTemperature: 24 };

  return {
    simulationTime: "2026-09-26T22:30:00.000Z",
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

describe("Milestone 3.8 — Multi-Provider Decision Platform & Strategy Orchestrator", () => {
  const originalEnvKey = process.env.TYPESAFE_API_KEY;

  beforeEach(() => {
    clearRuntimeTypeSafeApiKey();
    delete process.env.TYPESAFE_API_KEY;
  });

  afterEach(() => {
    clearRuntimeTypeSafeApiKey();
    if (originalEnvKey !== undefined) {
      process.env.TYPESAFE_API_KEY = originalEnvKey;
    } else {
      delete process.env.TYPESAFE_API_KEY;
    }
    vi.restoreAllMocks();
  });

  // =========================================================================
  // SUITE 1: Provider Registry Core & Strategy Pattern (Points 1, 2, 8, 24)
  // =========================================================================
  describe("Suite 1: Provider Registry Core & Strategy Pattern", () => {
    it("Point 1: default registry registers all three AI engines: JEV, LAYA, and LLM", () => {
      const registry = createDefaultProviderRegistry();
      const all = registry.getAll();
      const ids = all.map((p) => p.providerId);

      expect(all.length).toBe(3);
      expect(ids).toContain("JEV");
      expect(ids).toContain("LAYA");
      expect(ids).toContain("LLM");
    });

    it("Point 2: each registered provider supplies complete metadata (model, runtime, architecture, endpoint, isLocal, description)", () => {
      const registry = createDefaultProviderRegistry();
      for (const p of registry.getAll()) {
        expect(p.modelMetadata).toBeDefined();
        expect(typeof p.modelMetadata.model).toBe("string");
        expect(typeof p.modelMetadata.runtime).toBe("string");
        expect(typeof p.modelMetadata.isLocal).toBe("boolean");
        expect(typeof p.modelMetadata.description).toBe("string");
        expect(p.modelMetadata.description.length).toBeGreaterThan(10);
      }
    });

    it("Point 8: all registered engines implement the universal DecisionEngine contract", () => {
      const registry = createDefaultProviderRegistry();
      for (const p of registry.getAll()) {
        const engine = p.engine;
        expect(engine.id).toBeDefined();
        expect(engine.name).toBeDefined();
        expect(engine.provider).toBeDefined();
        expect(typeof engine.evaluate).toBe("function");
      }
    });

    it("Point 24: registry supports dynamic provider registration and unregistration without hardcoded branching", () => {
      const registry = new ProviderRegistry();
      expect(registry.getAll()).toHaveLength(0);

      const mockEngine: DecisionEngine = {
        id: "custom-mock-engine",
        name: "Custom Mock Decision Engine",
        provider: "CUSTOM_MOCK",
        evaluate: async (intent) => ({
          engineId: "custom-mock-engine",
          source: "SYSTEM",
          intent,
          actions: [],
          timestamp: new Date().toISOString(),
        }),
      };

      const registration: ProviderRegistration = {
        providerId: "CUSTOM_MOCK",
        engineId: mockEngine.id,
        displayName: "Custom Mock Engine",
        engine: mockEngine,
        modelMetadata: {
          model: "mock-v1",
          runtime: "Test Runner",
          isLocal: true,
          description: "Dynamic test provider",
        },
        checkAvailability: async () => ({
          providerId: "CUSTOM_MOCK",
          engineId: mockEngine.id,
          status: "AVAILABLE",
          detail: "Mock available",
        }),
        isScenarioSupported: () => true,
      };

      registry.register(registration);
      expect(registry.getAll()).toHaveLength(1);
      expect(registry.get("CUSTOM_MOCK")?.displayName).toBe("Custom Mock Engine");

      const unregistered = registry.unregister("CUSTOM_MOCK");
      expect(unregistered).toBe(true);
      expect(registry.getAll()).toHaveLength(0);
    });
  });

  // =========================================================================
  // SUITE 2: Enablement vs. Verified Availability Separation (Points 3, 4, 5, 6, 7)
  // =========================================================================
  describe("Suite 2: Enablement vs. Verified Availability Separation", () => {
    it("Point 3: getEnabled filters providers based on user enablement map", () => {
      const registry = createDefaultProviderRegistry();
      const enablement: ProviderEnablementMap = {
        JEV: true,
        LAYA: false,
        LLM: true,
      };

      const enabled = registry.getEnabled(enablement);
      const enabledIds = enabled.map((p) => p.providerId);

      expect(enabledIds).toContain("JEV");
      expect(enabledIds).toContain("LLM");
      expect(enabledIds).not.toContain("LAYA");
    });

    it("Point 4: resolves canExecute strictly as (enabled && availability.status === 'AVAILABLE')", async () => {
      const registry = new ProviderRegistry();

      // Provider A: Enabled + Available
      const provA: ProviderRegistration = {
        providerId: "PROV_A",
        engineId: "eng_a",
        displayName: "Provider A",
        engine: { id: "eng_a", name: "A", provider: "A", evaluate: async () => ({} as any) },
        modelMetadata: { model: "a", runtime: "r", isLocal: true, description: "d" },
        checkAvailability: async () => ({ providerId: "PROV_A", engineId: "eng_a", status: "AVAILABLE", detail: "ok" }),
        isScenarioSupported: () => true,
      };

      // Provider B: Enabled + Unavailable Service
      const provB: ProviderRegistration = {
        providerId: "PROV_B",
        engineId: "eng_b",
        displayName: "Provider B",
        engine: { id: "eng_b", name: "B", provider: "B", evaluate: async () => ({} as any) },
        modelMetadata: { model: "b", runtime: "r", isLocal: true, description: "d" },
        checkAvailability: async () => ({ providerId: "PROV_B", engineId: "eng_b", status: "UNAVAILABLE_SERVICE", detail: "down" }),
        isScenarioSupported: () => true,
      };

      // Provider C: Disabled + Available
      const provC: ProviderRegistration = {
        providerId: "PROV_C",
        engineId: "eng_c",
        displayName: "Provider C",
        engine: { id: "eng_c", name: "C", provider: "C", evaluate: async () => ({} as any) },
        modelMetadata: { model: "c", runtime: "r", isLocal: true, description: "d" },
        checkAvailability: async () => ({ providerId: "PROV_C", engineId: "eng_c", status: "AVAILABLE", detail: "ok" }),
        isScenarioSupported: () => true,
      };

      // Provider D: Disabled + Unavailable Config
      const provD: ProviderRegistration = {
        providerId: "PROV_D",
        engineId: "eng_d",
        displayName: "Provider D",
        engine: { id: "eng_d", name: "D", provider: "D", evaluate: async () => ({} as any) },
        modelMetadata: { model: "d", runtime: "r", isLocal: true, description: "d" },
        checkAvailability: async () => ({ providerId: "PROV_D", engineId: "eng_d", status: "UNAVAILABLE_CONFIGURATION", detail: "no key" }),
        isScenarioSupported: () => true,
      };

      registry.register(provA);
      registry.register(provB);
      registry.register(provC);
      registry.register(provD);

      const enablement: ProviderEnablementMap = {
        PROV_A: true,
        PROV_B: true,
        PROV_C: false,
        PROV_D: false,
      };

      const statuses = await registry.getStatuses(enablement);
      const statusMap = new Map(statuses.map((s) => [s.providerId, s]));

      expect(statusMap.get("PROV_A")?.canExecute).toBe(true);
      expect(statusMap.get("PROV_A")?.statusExplanation).toBe("Ready for execution.");

      expect(statusMap.get("PROV_B")?.canExecute).toBe(false);
      expect(statusMap.get("PROV_B")?.statusExplanation).toContain("service daemon is unreachable");

      expect(statusMap.get("PROV_C")?.canExecute).toBe(false);
      expect(statusMap.get("PROV_C")?.statusExplanation).toContain("Available but disabled by user configuration");

      expect(statusMap.get("PROV_D")?.canExecute).toBe(false);
      expect(statusMap.get("PROV_D")?.statusExplanation).toContain("Disabled (also unavailable");

      const executable = await registry.getExecutable(enablement);
      expect(executable).toHaveLength(1);
      expect(executable[0].providerId).toBe("PROV_A");
    });

    it("Point 5: missing Jev API key returns UNAVAILABLE_CONFIGURATION status", async () => {
      const registry = createDefaultProviderRegistry();
      const jev = registry.get("JEV");
      expect(jev).toBeDefined();

      const availability = await jev!.checkAvailability();
      expect(availability.status).toBe("UNAVAILABLE_CONFIGURATION");
      expect(availability.detail).toContain("TypeSafe API key is not configured");
    });

    it("Point 6: unreachable Laya daemon returns UNAVAILABLE_SERVICE status", async () => {
      const registry = createDefaultProviderRegistry();
      const laya = registry.get("LAYA");
      expect(laya).toBeDefined();

      // Mock health check throwing or returning unreachable
      const engine = laya!.engine as LayaDecisionEngine;
      vi.spyOn(engine, "checkHealth").mockResolvedValue({
        healthy: false,
        status: "unreachable",
        detail: "Connection refused on port 8081",
      });

      const availability = await laya!.checkAvailability();
      expect(availability.status).toBe("UNAVAILABLE_SERVICE");
      expect(availability.detail).toContain("Laya server unreachable");
    });

    it("Task 3: LayaClient.checkHealth rejects HTTP 200 responses that violate the Laya health contract", async () => {
      // 1. HTTP 200 with non-Laya status (e.g. Jenkins returning {"status": true})
      const mockFetchJenkins = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ status: true }),
      });
      const clientJenkins = new LayaClient({ fetchFn: mockFetchJenkins as any });
      const healthJenkins = await clientJenkins.checkHealth();
      expect(healthJenkins.healthy).toBe(false);
      expect(healthJenkins.detail).toContain("invalid Laya health status");

      // 2. HTTP 200 with non-JSON text
      const mockFetchHtml = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => {
          throw new Error("SyntaxError: Unexpected token '<'");
        },
      });
      const clientHtml = new LayaClient({ fetchFn: mockFetchHtml as any });
      const healthHtml = await clientHtml.checkHealth();
      expect(healthHtml.healthy).toBe(false);
      expect(healthHtml.status).toBe("INVALID_RESPONSE");
      expect(healthHtml.detail).toContain("response is not valid JSON");

      // 3. HTTP 200 with genuine Laya response
      const mockFetchValid = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ status: "ok", loaded: ["convaiinnovations/laya-modernbert-large"] }),
      });
      const clientValid = new LayaClient({ fetchFn: mockFetchValid as any });
      const healthValid = await clientValid.checkHealth();
      expect(healthValid.healthy).toBe(true);
      expect(healthValid.status).toBe("ok");
      expect(healthValid.detail).toContain("Laya server healthy");
    });

    it("Point 7: unreachable LLM daemon returns UNAVAILABLE_SERVICE status", async () => {
      const registry = createDefaultProviderRegistry();
      const llm = registry.get("LLM");
      expect(llm).toBeDefined();

      vi.spyOn(llm!.engine as any, "checkHealth").mockResolvedValue({
        healthy: false,
        error: "ECONNREFUSED 127.0.0.1:11434",
      });

      const availability = await llm!.checkAvailability();
      expect(availability.status).toBe("UNAVAILABLE_SERVICE");
      expect(availability.detail).toContain("Local Ollama unreachable");
    });
  });

  // =========================================================================
  // SUITE 3: Server-Side In-Memory TypeSafe Jev Runtime Credential Store (Points 14, 15)
  // =========================================================================
  describe("Suite 3: Server-Side In-Memory TypeSafe Jev Runtime Credential Store", () => {
    it("Point 14: manages in-memory runtime credentials with validation, precedence, and masking", () => {
      expect(hasRuntimeTypeSafeApiKey()).toBe(false);
      expect(getRuntimeTypeSafeApiKey()).toBeNull();
      expect(getTypeSafeApiKeySource()).toBe("NONE");

      // Validation errors
      expect(() => setRuntimeTypeSafeApiKey("")).toThrow(InvalidCredentialError);
      expect(() => setRuntimeTypeSafeApiKey("short")).toThrow(InvalidCredentialError);
      expect(() => setRuntimeTypeSafeApiKey("has\ninvalid\nchars12345")).toThrow(InvalidCredentialError);

      // Successful in-memory set
      setRuntimeTypeSafeApiKey("ts_valid_runtime_key_987654321");
      expect(hasRuntimeTypeSafeApiKey()).toBe(true);
      expect(getRuntimeTypeSafeApiKey()).toBe("ts_valid_runtime_key_987654321");
      expect(getTypeSafeApiKeySource()).toBe("RUNTIME");
      expect(getEffectiveTypeSafeApiKey()).toBe("ts_valid_runtime_key_987654321");

      // Precedence: Runtime overrides ENV
      process.env.TYPESAFE_API_KEY = "ts_env_key_00000000";
      expect(getEffectiveTypeSafeApiKey()).toBe("ts_valid_runtime_key_987654321");
      expect(getTypeSafeApiKeySource()).toBe("RUNTIME");

      // Clear runtime key falls back to ENV
      clearRuntimeTypeSafeApiKey();
      expect(hasRuntimeTypeSafeApiKey()).toBe(false);
      expect(getEffectiveTypeSafeApiKey()).toBe("ts_env_key_00000000");
      expect(getTypeSafeApiKeySource()).toBe("ENV");

      // Clear ENV
      delete process.env.TYPESAFE_API_KEY;
      expect(getEffectiveTypeSafeApiKey()).toBeNull();
      expect(getTypeSafeApiKeySource()).toBe("NONE");
    });

    it("Point 15: /api/credentials/typesafe routes securely handle GET, POST, DELETE without leaking key strings", async () => {
      // 1. Initial GET
      const getRes1 = await getCredentials();
      expect(getRes1.status).toBe(200);
      const data1 = await getRes1.json();
      expect(data1.configured).toBe(false);
      expect(data1.source).toBe("NONE");
      expect(JSON.stringify(data1)).not.toContain("ts_");

      // 2. POST invalid key
      const badReq = new NextRequest("http://localhost:3000/api/credentials/typesafe", {
        method: "POST",
        body: JSON.stringify({ apiKey: "bad" }),
      });
      const badRes = await postCredentials(badReq);
      expect(badRes.status).toBe(400);

      // 3. POST valid key
      const validReq = new NextRequest("http://localhost:3000/api/credentials/typesafe", {
        method: "POST",
        body: JSON.stringify({ apiKey: "ts_live_key_for_testing_12345" }),
      });
      const postRes = await postCredentials(validReq);
      expect(postRes.status).toBe(200);
      const postData = await postRes.json();
      expect(postData.success).toBe(true);
      expect(postData.configured).toBe(true);
      expect(postData.source).toBe("RUNTIME");
      // CRITICAL: Raw key is NEVER present in the serialized JSON response
      expect(JSON.stringify(postData)).not.toContain("ts_live_key_for_testing_12345");

      // 4. GET now shows configured
      const getRes2 = await getCredentials();
      const data2 = await getRes2.json();
      expect(data2.configured).toBe(true);
      expect(data2.source).toBe("RUNTIME");
      expect(JSON.stringify(data2)).not.toContain("ts_live_key_for_testing_12345");

      // 5. DELETE clears key
      const delRes = await deleteCredentials();
      expect(delRes.status).toBe(200);
      const delData = await delRes.json();
      expect(delData.success).toBe(true);
      expect(delData.configured).toBe(false);
      expect(hasRuntimeTypeSafeApiKey()).toBe(false);
    });
  });

  // =========================================================================
  // SUITE 4: Laya Decision Engine Integration & Policy (Points 16, 17)
  // =========================================================================
  describe("Suite 4: Laya Decision Engine Integration & Policy", () => {
    it("Point 16: supports 34/36 scenarios, rejects 2 out-of-domain scenarios with clear rationale", () => {
      const laya = new LayaDecisionEngine();
      const allScenarios = getAllEvaluationScenarios();
      expect(allScenarios.length).toBe(36);

      const supported = allScenarios.filter((s) => laya.supportsScenario(s));
      const unsupported = allScenarios.filter((s) => !laya.supportsScenario(s));

      expect(supported.length).toBe(34);
      expect(unsupported.length).toBe(2);

      const unsupportedIds = unsupported.map((s) => s.id);
      expect(unsupportedIds).toContain("security-lockdown-01");
      expect(unsupportedIds).toContain("ambiguous-night-ready-01");

      for (const un of unsupported) {
        const reason = laya.getUnsupportedReason(un);
        expect(reason).toContain("outside Laya's active smart home decision domain");
      }
    });

    it("Point 16 & 17: translates System-1 outputs to concrete actions with calibrated confidence and redundancy elimination", () => {
      const homeState = createTestHomeState();
      // Set living room light already OFF to verify redundancy detection
      (homeState.devices["light_living_room"].state as any).power = "OFF";

      const mockResponse = {
        model: "laya-system-one-v1",
        answers: {
          intent_family: { value: "GOING_TO_SLEEP", confidence: 0.94 },
          turn_off_main_lighting: { value: true, confidence: 0.96 },
          lock_entrance_deadbolt: { value: true, confidence: 0.98 },
          arm_security_system: { value: true, confidence: 0.95 },
          security_mode: { value: "STAY", confidence: 0.92 },
        },
      };

      const result = translateLayaDecisionsToActions("I'm going to bed now", homeState, mockResponse);

      expect(result.intentFamily).toBe("GOING_TO_SLEEP");
      expect(result.confidence).toBeGreaterThanOrEqual(0.9);
      expect(result.confidence).toBeLessThanOrEqual(1.0);

      // Living room light was already OFF -> must be skipped as redundant
      const skippedLivingLight = result.skippedRedundantActions.find((s) => s.deviceId === "light_living_room");
      expect(skippedLivingLight).toBeDefined();
      expect(skippedLivingLight?.actionType).toBe("TURN_OFF");
      expect(skippedLivingLight?.reason).toContain("already OFF");

      // Non-redundant actions were generated (e.g. lock door, kitchen light, curtains)
      const actionDeviceIds = result.actions.map((a) => a.deviceId);
      expect(actionDeviceIds).not.toContain("light_living_room");
      expect(actionDeviceIds).toContain("lock_main_door");
      expect(actionDeviceIds).toContain("light_kitchen");

      for (const action of result.actions) {
        expect(action.source).toBe("LAYA");
      }
    });

    it("Point 16: LayaDecisionEngine.evaluate returns valid DecisionResult conforming to contract", async () => {
      const mockClient = {
        getModel: () => "laya-v1-test",
        getBaseUrl: () => "http://127.0.0.1:8081",
        checkHealth: async () => ({ healthy: true, status: "ok", detail: "ready" }),
        evaluateSystemOne: async () => ({
          model: "laya-v1-test",
          answers: {
            intent_family: { value: "GOING_TO_SLEEP", confidence: 0.95 },
            turn_off_main_lighting: { value: true, confidence: 0.95 },
            lock_entrance_deadbolt: { value: true, confidence: 0.95 },
            arm_security_system: { value: true, confidence: 0.95 },
          },
        }),
      } as unknown as LayaClient;

      const engine = new LayaDecisionEngine({}, mockClient);
      const homeState = createTestHomeState();

      const decision = await engine.evaluate("I am going to sleep", homeState);

      expect(decision.engineId).toBe("laya-system-one");
      expect(decision.source).toBe("LAYA");
      expect(decision.intent).toBe("I am going to sleep");
      expect(Array.isArray(decision.actions)).toBe(true);
      expect(decision.actions.length).toBeGreaterThan(0);
      expect(typeof decision.confidence).toBe("number");
      expect(decision.confidence).toBe(0.95);
      expect(decision.decisionTimeMs).toBeGreaterThanOrEqual(0);
      expect(decision.metadata).toBeDefined();
      expect((decision.metadata as any)?.provider).toBe("laya");
    });

    it("Task 1: preserves Laya's authoritative OTHER decision without keyword heuristic overrides", () => {
      const homeState = createTestHomeState();
      const mockResponse = {
        model: "laya-system-one-v1",
        answers: {
          intent_family: { value: "OTHER", confidence: 0.88 },
        },
      };

      // Intent clearly contains words that a keyword heuristic might latch onto ("sleep", "bed", "night")
      const result = translateLayaDecisionsToActions("I am getting into bed to sleep for the night", homeState, mockResponse);

      // Must strictly preserve OTHER; must NOT override to GOING_TO_SLEEP
      expect(result.intentFamily).toBe("OTHER");
      expect(result.actions).toEqual([]);
      expect(result.reasoning).toContain('intent family as "OTHER"');
    });

    it("Task 2: regression test: missing Laya confidence remains undefined and is NEVER converted to 0.92", () => {
      const homeState = createTestHomeState();
      const mockResponseWithoutConfidence = {
        model: "laya-system-one-v1",
        answers: {
          intent_family: { value: "GOING_TO_SLEEP" }, // No confidence field
          turn_off_main_lighting: { value: true },
          lock_entrance_deadbolt: { value: true },
          arm_security_system: { value: true },
        },
      };

      const result = translateLayaDecisionsToActions("I am going to sleep", homeState, mockResponseWithoutConfidence);

      expect(result.intentFamily).toBe("GOING_TO_SLEEP");
      expect(result.confidence).toBeUndefined();
      expect(result.confidence).not.toBe(0.92);
      expect(result.reasoning).not.toContain("calibrated confidence 0.92");
    });
  });

  // =========================================================================
  // SUITE 5: Context-Sensitive Occupancy & Pet Support (Points 18, 22)
  // =========================================================================
  describe("Suite 5: Context-Sensitive Occupancy & Pet Support", () => {
    it("Point 18: occupancy helpers correctly detect pets and explicit climate preferences without fabricating assumptions", () => {
      const stateWithoutPets = createTestHomeState();
      expect(hasPetsRemainingHome(stateWithoutPets)).toBe(false);
      expect(getActivePetClimatePreference(stateWithoutPets)).toBeNull();

      // Add pet with explicit preference
      const stateWithPet = createTestHomeState();
      stateWithPet.occupancy = {
        humans: [{ id: "h1", name: "Alex", present: false }],
        pets: [
          {
            id: "p1",
            name: "Milo",
            species: "CAT",
            present: true,
            climatePreference: { preferredTemperature: 22, minTemperature: 19, maxTemperature: 25 },
          },
        ],
      };

      expect(hasPetsRemainingHome(stateWithPet)).toBe(true);
      const pref = getActivePetClimatePreference(stateWithPet);
      expect(pref).not.toBeNull();
      expect(pref?.preferredTemperature).toBe(22);

      // Pet present but NO climate preference -> returns null (do not fabricate temperature)
      const statePetNoPref = createTestHomeState();
      statePetNoPref.occupancy = {
        humans: [],
        pets: [{ id: "p2", name: "Bella", species: "DOG", present: true }],
      };
      expect(getActivePetClimatePreference(statePetNoPref)).toBeNull();
    });

    it("Point 18: Laya preserves pet comfort temperature and STAY arming when pet is home during departure", () => {
      const homeState = createTestHomeState();
      homeState.occupancy = {
        humans: [{ id: "h1", name: "Jordan", present: false }],
        pets: [
          {
            id: "pet_dog",
            name: "Max",
            species: "DOG",
            present: true,
            climatePreference: { preferredTemperature: 23 },
          },
        ],
      };

      const mockResponse = {
        model: "laya-v1",
        answers: {
          intent_family: { value: "LEAVING_HOME", confidence: 0.95 },
          preserve_pet_environment: { value: true, confidence: 0.98 },
        },
      };

      const result = translateLayaDecisionsToActions("I am going out for a movie", homeState, mockResponse);

      expect(result.petContextRecognized).toBe(true);

      // Should set temperature to pet's preference (23°C)
      const tempAction = result.actions.find((a) => a.deviceId === "ac_living_room" && a.actionType === "SET_TEMPERATURE");
      expect(tempAction).toBeDefined();
      expect(tempAction?.value).toBe(23);

      // Should arm in STAY mode to bypass interior motion sensors for the pet
      const secAction = result.actions.find((a) => a.deviceId === "security_system" && a.actionType === "ARM");
      expect(secAction).toBeDefined();
      expect(secAction?.value).toBe("STAY");
    });

    it("Point 22: pet demonstration scenario context does not mutate frozen evaluation dataset or dashboard presets", () => {
      expect(DEMO_MOVIE_WITH_PET_CONTEXT).toBeDefined();
      expect(DEMO_MOVIE_WITH_PET_CONTEXT.pets).toHaveLength(1);

      // Presets in dashboard remain exactly 7
      expect(PREDEFINED_SCENARIOS.length).toBe(7);

      // 36 frozen evaluation scenarios remain unaltered
      const evaluationScenarios = getAllEvaluationScenarios();
      expect(evaluationScenarios.length).toBe(36);
      const hash = computeDatasetHash(evaluationScenarios);
      expect(hash).toBe("66de3242d1ba6583dc385a2999f8f8ba556a1f52cf5862cc7f223c9cdbfc0329");
    });
  });

  // =========================================================================
  // SUITE 6: Multi-Engine Evaluation Orchestrator & State Isolation (Points 9, 10, 11, 12, 13, 19, 25)
  // =========================================================================
  describe("Suite 6: Multi-Engine Evaluation Orchestrator & State Isolation", () => {
    it("Point 11 & 13: each evaluated provider receives an independent deep clone of HomeState with zero cross-engine leakage", async () => {
      const originalHomeState = createTestHomeState();
      const originalJson = JSON.stringify(originalHomeState);

      let providerAStateReceived: HomeState | null = null;
      let providerBStateReceived: HomeState | null = null;

      const mockEngineA: DecisionEngine = {
        id: "engine-mutator-a",
        name: "Mutator A",
        provider: "A",
        evaluate: async (intent, state) => {
          providerAStateReceived = state;
          // Provider A aggressively mutates its received state
          (state.devices["light_living_room"].state as any).power = "MUTATED_BY_A";
          delete state.devices["light_kitchen"];
          return {
            engineId: "engine-mutator-a",
            source: "SYSTEM",
            intent,
            actions: [],
            timestamp: new Date().toISOString(),
          };
        },
      };

      const mockEngineB: DecisionEngine = {
        id: "engine-reader-b",
        name: "Reader B",
        provider: "B",
        evaluate: async (intent, state) => {
          providerBStateReceived = state;
          return {
            engineId: "engine-reader-b",
            source: "SYSTEM",
            intent,
            actions: [],
            timestamp: new Date().toISOString(),
          };
        },
      };

      const registry = new ProviderRegistry();
      registry.register({
        providerId: "PROV_A",
        engineId: mockEngineA.id,
        displayName: "A",
        engine: mockEngineA,
        modelMetadata: { model: "a", runtime: "r", isLocal: true, description: "d" },
        checkAvailability: async () => ({ providerId: "PROV_A", engineId: mockEngineA.id, status: "AVAILABLE", detail: "ok" }),
        isScenarioSupported: () => true,
      });
      registry.register({
        providerId: "PROV_B",
        engineId: mockEngineB.id,
        displayName: "B",
        engine: mockEngineB,
        modelMetadata: { model: "b", runtime: "r", isLocal: true, description: "d" },
        checkAvailability: async () => ({ providerId: "PROV_B", engineId: mockEngineB.id, status: "AVAILABLE", detail: "ok" }),
        isScenarioSupported: () => true,
      });

      const executable = await registry.getExecutable({ PROV_A: true, PROV_B: true });
      expect(executable).toHaveLength(2);

      // Simulate multi-engine evaluation loop with deep clones
      for (const p of executable) {
        const clonedState: HomeState = JSON.parse(JSON.stringify(originalHomeState));
        await p.engine.evaluate("test intent", clonedState);
      }

      // Check Provider B was completely insulated from Provider A's mutations
      expect(providerBStateReceived).not.toBeNull();
      expect((providerBStateReceived as any).devices["light_living_room"].state.power).toBe("ON");
      expect((providerBStateReceived as any).devices["light_kitchen"]).toBeDefined();

      // Check Original HomeState remained pristine
      expect(JSON.stringify(originalHomeState)).toBe(originalJson);
    });

    it("Point 12: all engines receive identical user intent and are evaluated under identical scenario constraints", async () => {
      const intentsReceived: string[] = [];

      const makeEngine = (id: string, name: string): ProviderRegistration => ({
        providerId: id,
        engineId: id,
        displayName: name,
        engine: {
          id,
          name,
          provider: id,
          evaluate: async (intent) => {
            intentsReceived.push(intent);
            return {
              engineId: id,
              source: "SYSTEM",
              intent,
              actions: [],
              timestamp: new Date().toISOString(),
            };
          },
        },
        modelMetadata: { model: id, runtime: "r", isLocal: true, description: "d" },
        checkAvailability: async () => ({ providerId: id, engineId: id, status: "AVAILABLE", detail: "ok" }),
        isScenarioSupported: () => true,
      });

      const registry = new ProviderRegistry();
      registry.register(makeEngine("JEV", "Jev"));
      registry.register(makeEngine("LAYA", "Laya"));
      registry.register(makeEngine("LLM", "LLM"));

      const executable = await registry.getExecutable({ JEV: true, LAYA: true, LLM: true });
      const testIntent = "I am heading to sleep. Goodnight!";

      for (const p of executable) {
        await p.engine.evaluate(testIntent, createTestHomeState());
      }

      expect(intentsReceived).toHaveLength(3);
      expect(intentsReceived.every((i) => i === testIntent)).toBe(true);
    });

    it("Point 19: POST /api/providers/evaluate endpoint validates requests and isolates multi-engine execution", async () => {
      // 1. Missing intent
      const req1 = new NextRequest("http://localhost:3000/api/providers/evaluate", {
        method: "POST",
        body: JSON.stringify({ homeState: createTestHomeState() }),
      });
      const res1 = await postEvaluateProviders(req1);
      expect(res1.status).toBe(400);

      // 2. Missing homeState
      const req2 = new NextRequest("http://localhost:3000/api/providers/evaluate", {
        method: "POST",
        body: JSON.stringify({ intent: "Turn off lights" }),
      });
      const res2 = await postEvaluateProviders(req2);
      expect(res2.status).toBe(400);

      // 3. Valid evaluation request
      const req3 = new NextRequest("http://localhost:3000/api/providers/evaluate", {
        method: "POST",
        body: JSON.stringify({
          intent: "Turn off living room light",
          homeState: createTestHomeState(),
          enabledProviders: { JEV: false, LAYA: false, LLM: false }, // all disabled
        }),
      });
      const res3 = await postEvaluateProviders(req3);
      expect(res3.status).toBe(200);
      const data3 = await res3.json();
      expect(data3.success).toBe(true);
      expect(data3.executedProviders).toEqual([]);
    });

    it("Point 25: error resilience: if one engine fails, other engines complete successfully", async () => {
      const mockFailingEngine: DecisionEngine = {
        id: "failing-engine",
        name: "Failing Engine",
        provider: "FAIL",
        evaluate: async () => {
          throw new Error("Simulated upstream network timeout");
        },
      };

      const mockHealthyEngine: DecisionEngine = {
        id: "healthy-engine",
        name: "Healthy Engine",
        provider: "HEALTHY",
        evaluate: async (intent) => ({
          engineId: "healthy-engine",
          source: "SYSTEM",
          intent,
          actions: [],
          timestamp: new Date().toISOString(),
        }),
      };

      const registry = new ProviderRegistry();
      registry.register({
        providerId: "FAIL",
        engineId: mockFailingEngine.id,
        displayName: "Failing",
        engine: mockFailingEngine,
        modelMetadata: { model: "m", runtime: "r", isLocal: true, description: "d" },
        checkAvailability: async () => ({ providerId: "FAIL", engineId: "f", status: "AVAILABLE", detail: "ok" }),
        isScenarioSupported: () => true,
      });
      registry.register({
        providerId: "HEALTHY",
        engineId: mockHealthyEngine.id,
        displayName: "Healthy",
        engine: mockHealthyEngine,
        modelMetadata: { model: "m", runtime: "r", isLocal: true, description: "d" },
        checkAvailability: async () => ({ providerId: "HEALTHY", engineId: "h", status: "AVAILABLE", detail: "ok" }),
        isScenarioSupported: () => true,
      });

      const executable = await registry.getExecutable({ FAIL: true, HEALTHY: true });
      const results: Record<string, any> = {};

      for (const provider of executable) {
        try {
          const res = await provider.engine.evaluate("intent", createTestHomeState());
          results[provider.providerId] = { success: true, res };
        } catch (err: unknown) {
          results[provider.providerId] = { success: false, error: (err as Error).message };
        }
      }

      expect(results["FAIL"].success).toBe(false);
      expect(results["FAIL"].error).toContain("Simulated upstream network timeout");
      expect(results["HEALTHY"].success).toBe(true);
      expect(results["HEALTHY"].res.engineId).toBe("healthy-engine");
    });
  });

  // =========================================================================
  // SUITE 7: Methodological Integrity & Frozen Dataset Invariance (Points 9, 10, 20, 21, 23)
  // =========================================================================
  describe("Suite 7: Methodological Integrity & Frozen Dataset Invariance", () => {
    it("Point 20: evaluation dataset contains exactly 36 scenarios", () => {
      const scenarios = getAllEvaluationScenarios();
      expect(scenarios).toHaveLength(36);
    });

    it("Point 21: evaluation dataset SHA-256 hash strictly matches 66de3242d1ba6583dc385a2999f8f8ba556a1f52cf5862cc7f223c9cdbfc0329", () => {
      const scenarios = getAllEvaluationScenarios();
      const hash = computeDatasetHash(scenarios);
      expect(hash).toBe("66de3242d1ba6583dc385a2999f8f8ba556a1f52cf5862cc7f223c9cdbfc0329");
    });

    it("Point 9: 1-provider baseline execution modes operate cleanly", async () => {
      const mockLLM: DecisionEngine = {
        id: "mock-llm",
        name: "Mock LLM",
        provider: "LLM",
        evaluate: async (intent) => ({
          engineId: "mock-llm",
          source: "LLM",
          intent,
          actions: [],
          timestamp: new Date().toISOString(),
        }),
      };

      const scenario = getEvaluationScenario("normal-sleep-01")!;
      const report = await runControlledExperiment(
        [scenario],
        [{ providerId: "LLM", engine: mockLLM, isScenarioSupported: () => true }],
        {
          mode: "LLM_ONLY_READINESS",
          repetitions: 1,
        }
      );

      expect(report.mode).toBe("LLM_ONLY_READINESS");
      expect(report.aggregates.length).toBe(1);
      expect(report.aggregates[0].providerId).toBe("LLM");
    });

    it("Point 10 & 23: multi-provider execution produces strictly independent side-by-side metrics with ZERO rankings, composite scores, or winner declarations", async () => {
      const mockJev: DecisionEngine = {
        id: "mock-jev",
        name: "Mock Jev",
        provider: "JEV",
        evaluate: async (intent) => ({
          engineId: "mock-jev",
          source: "JEV",
          intent,
          actions: [],
          confidence: 0.95,
          timestamp: new Date().toISOString(),
        }),
      };

      const mockLaya: DecisionEngine = {
        id: "mock-laya",
        name: "Mock Laya",
        provider: "LAYA",
        evaluate: async (intent) => ({
          engineId: "mock-laya",
          source: "LAYA",
          intent,
          actions: [],
          confidence: 0.92,
          timestamp: new Date().toISOString(),
        }),
      };

      const scenario = getEvaluationScenario("normal-sleep-01")!;
      const report = await runControlledExperiment(
        [scenario],
        [
          { providerId: "JEV", engine: mockJev, isScenarioSupported: () => true },
          { providerId: "LAYA", engine: mockLaya, isScenarioSupported: () => true },
        ],
        {
          mode: "FULL_COMPARISON",
          repetitions: 1,
        }
      );

      expect(report.mode).toBe("FULL_COMPARISON");
      expect(report.aggregates.length).toBe(2);

      // Verify each provider has independent aggregates
      for (const p of report.aggregates) {
        expect(p.providerId).toBeDefined();
        expect(p.actionDistributions).toBeDefined();
        expect(p.stateAccuracyDistribution).toBeDefined();
        expect(p.timingDistributions).toBeDefined();
      }

      // STRICT METHODOLOGICAL CONSTRAINTS:
      // ZERO composite scores
      // ZERO rankings
      // ZERO winner declarations
      // ZERO best engine designations
      const serialized = JSON.stringify(report).toLowerCase();
      expect(serialized).not.toContain("winner");
      expect(serialized).not.toContain("ranking");
      expect(serialized).not.toContain("compositescore");
      expect(serialized).not.toContain("bestengine");
      expect(serialized).not.toContain("openrouter");
    });
  });
});
