import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  OllamaClient,
  DEFAULT_OLLAMA_TIMEOUT_MS,
  OllamaTimeoutError,
} from "@/lib/ollama";
import { LLMDecisionEngine } from "@/lib/llm/LLMDecisionEngine";
import { runControlledExperiment } from "@/lib/evaluation/comparison/experiment";
import { StandardEvaluationEngine } from "@/lib/evaluation/evaluator";
import { getEvaluationScenario } from "@/lib/evaluation/dataset";
import { HomeState } from "@/types/home";
import { INITIAL_DEVICES } from "@/lib/devices.config";
import { INITIAL_ROOMS } from "@/lib/rooms.config";

describe("Milestone 3.11B — Ollama Timeout & Execution Hardening", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    delete process.env.OLLAMA_TIMEOUT_MS;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  // TEST 1: Ordinary default timeout remains 30,000 ms.
  it("TEST 1: Ordinary default timeout remains 30,000 ms", () => {
    const client = new OllamaClient();
    expect(client.getTimeoutMs()).toBe(30000);
    expect(DEFAULT_OLLAMA_TIMEOUT_MS).toBe(30000);

    const engine = new LLMDecisionEngine();
    expect(engine.getTimeoutMs()).toBe(30000);
    expect(engine.getClient().getTimeoutMs()).toBe(30000);
  });

  // TEST 2: Explicit timeout remains highest precedence.
  it("TEST 2: Explicit timeout remains highest precedence over environment variable", () => {
    process.env.OLLAMA_TIMEOUT_MS = "60000";
    const clientExplicit = new OllamaClient({ timeoutMs: 180000 });
    expect(clientExplicit.getTimeoutMs()).toBe(180000);

    const engineExplicit = new LLMDecisionEngine({ timeoutMs: 180000 });
    expect(engineExplicit.getTimeoutMs()).toBe(180000);
    expect(engineExplicit.getClient().getTimeoutMs()).toBe(180000);
  });

  // TEST 3: Environment override works.
  it("TEST 3: Environment override works when explicit timeout is not passed", () => {
    delete process.env.OLLAMA_TIMEOUT_MS;
    const clientDefault = new OllamaClient();
    expect(clientDefault.getTimeoutMs()).toBe(30000);

    process.env.OLLAMA_TIMEOUT_MS = "180000";
    const clientFromEnv = new OllamaClient();
    expect(clientFromEnv.getTimeoutMs()).toBe(180000);

    const engineFromEnv = new LLMDecisionEngine();
    expect(engineFromEnv.getTimeoutMs()).toBe(180000);
  });

  // TEST 4: LLM readiness provider timeout = 180,000 ms.
  it("TEST 4: LLM readiness provider timeout = 180,000 ms", async () => {
    const mockScenario = getEvaluationScenario("normal-sleep-01")!;
    const mockEngine = {
      id: "llm-ollama",
      name: "Conventional LLM (Local Ollama) [MOCK]",
      provider: "LLM" as const,
      getTimeoutMs: () => 180000,
      evaluate: vi.fn().mockResolvedValue({
        engineId: "llm-ollama",
        source: "LLM",
        intent: "I'm going to sleep.",
        actions: [],
        decisionTimeMs: 115000,
        timestamp: new Date().toISOString(),
      }),
    };

    const report = await runControlledExperiment(
      [mockScenario],
      [{ providerId: "LLM", engine: mockEngine as any, isScenarioSupported: () => true }],
      {
        mode: "LLM_ONLY_READINESS",
        repetitions: 1,
        experimentId: `test_exp_timeout_180k_${Date.now()}`,
      }
    );

    expect(report.protocol.timeoutConfiguration.llmTimeoutMs).toBe(180000);
    expect(report.protocol.llmConfiguration?.timeoutMs).toBe(180000);
  });

  // TEST 5: LLM readiness outer timeout = 210,000 ms.
  it("TEST 5: LLM readiness outer timeout = 210,000 ms", async () => {
    const mockScenario = getEvaluationScenario("normal-sleep-01")!;
    const mockEngine = {
      id: "llm-ollama",
      name: "Conventional LLM [MOCK]",
      provider: "LLM" as const,
      getTimeoutMs: () => 180000,
      evaluate: vi.fn().mockResolvedValue({
        engineId: "llm-ollama",
        source: "LLM",
        intent: "I'm going to sleep.",
        actions: [],
        decisionTimeMs: 115000,
        timestamp: new Date().toISOString(),
      }),
    };

    const report = await runControlledExperiment(
      [mockScenario],
      [{ providerId: "LLM", engine: mockEngine as any, isScenarioSupported: () => true }],
      {
        mode: "LLM_ONLY_READINESS",
        repetitions: 1,
        experimentId: `test_exp_outer_210k_${Date.now()}`,
      }
    );

    expect(report.protocol.timeoutConfiguration.perScenarioTimeoutMs).toBe(210000);
  });

  // TEST 6: No hidden 30,000 ms timeout remains.
  it("TEST 6: No hidden 30,000 ms timeout remains in LLM readiness path", () => {
    const engine = new LLMDecisionEngine({ timeoutMs: 180000 });
    expect(engine.getTimeoutMs()).not.toBe(30000);
    expect(engine.getClient().getTimeoutMs()).not.toBe(30000);
    expect(engine.getTimeoutMs()).toBe(180000);
    expect(engine.getClient().getTimeoutMs()).toBe(180000);
  });

  // TEST 7: Genuine timeout still becomes SUPPORTED_FAILURE.
  it("TEST 7: Genuine timeout still becomes SUPPORTED_FAILURE", async () => {
    const mockScenario = getEvaluationScenario("normal-sleep-01")!;
    const timeoutError = new OllamaTimeoutError("Ollama request timed out after 180000ms.", 180000);

    const timingOutEngine = {
      id: "llm-ollama",
      name: "Conventional LLM [TIMEOUT MOCK]",
      provider: "LLM" as const,
      getTimeoutMs: () => 180000,
      evaluate: vi.fn().mockRejectedValue(timeoutError),
    };

    const report = await runControlledExperiment(
      [mockScenario],
      [{ providerId: "LLM", engine: timingOutEngine as any, isScenarioSupported: () => true }],
      {
        mode: "LLM_ONLY_READINESS",
        repetitions: 1,
        experimentId: `test_exp_failure_capture_${Date.now()}`,
      }
    );

    const repObservation = report.scenarioResults[0].repetitions[0].providers[0];
    expect(repObservation.status).toBe("SUPPORTED_FAILURE");
    expect(repObservation.error).toContain("timed out after 180000ms");
    expect(report.aggregates[0].coverage.failedRuns).toBe(1);
    expect(report.aggregates[0].coverage.successfulRuns).toBe(0);
  });

  // TEST 8: No fallback occurs.
  it("TEST 8: No fallback occurs on timeout or error", async () => {
    const mockScenario = getEvaluationScenario("normal-sleep-01")!;
    const timeoutError = new OllamaTimeoutError("Ollama request timed out after 180000ms.", 180000);

    const timingOutEngine = {
      id: "llm-ollama",
      name: "Conventional LLM [TIMEOUT MOCK]",
      provider: "LLM" as const,
      getTimeoutMs: () => 180000,
      evaluate: vi.fn().mockRejectedValue(timeoutError),
    };

    const report = await runControlledExperiment(
      [mockScenario],
      [{ providerId: "LLM", engine: timingOutEngine as any, isScenarioSupported: () => true }],
      {
        mode: "LLM_ONLY_READINESS",
        repetitions: 1,
        experimentId: `test_exp_no_fallback_${Date.now()}`,
      }
    );

    expect(report.aggregates.length).toBe(1);
    expect(report.aggregates[0].providerId).toBe("LLM");
    expect(report.protocol.providerIds).toEqual(["LLM"]);
    expect(report.aggregates.some((a) => a.providerId === "JEV")).toBe(false);
    expect(report.aggregates.some((a) => a.providerId === "LAYA")).toBe(false);
  });

  // TEST 9: Laya timeout remains unchanged.
  it("TEST 9: Laya timeout remains unchanged at 15,000 ms provider and 45,000 ms scenario", async () => {
    const mockScenario = getEvaluationScenario("normal-sleep-01")!;
    const mockLayaEngine = {
      id: "laya-system-one",
      name: "Laya (System-1 Decision Model)",
      provider: "LAYA" as const,
      supportsScenario: () => true,
      getUnsupportedReason: () => undefined,
      getClient: () => ({
        getModel: () => "english",
        getBaseUrl: () => "http://127.0.0.1:8081",
        getTimeoutMs: () => 15000,
      }),
      evaluate: vi.fn().mockResolvedValue({
        engineId: "laya-system-one",
        source: "LAYA",
        intent: "I'm going to sleep.",
        actions: [],
        decisionTimeMs: 25000,
        timestamp: new Date().toISOString(),
      }),
    };

    const report = await runControlledExperiment(
      [mockScenario],
      [{ providerId: "LAYA", engine: mockLayaEngine as any, isScenarioSupported: () => true }],
      {
        mode: "LAYA_ONLY_READINESS",
        repetitions: 1,
        experimentId: `test_exp_laya_unchanged_${Date.now()}`,
      }
    );

    expect(report.protocol.timeoutConfiguration.layaTimeoutMs).toBe(15000);
    expect(report.protocol.layaConfiguration?.timeoutMs).toBe(15000);
    expect(report.protocol.timeoutConfiguration.perScenarioTimeoutMs).toBe(45000);
  });

  // TEST 10: Jev timeout remains unchanged.
  it("TEST 10: Jev timeout remains unchanged at 15,000 ms provider and 45,000 ms scenario", async () => {
    const mockScenario = getEvaluationScenario("normal-sleep-01")!;
    const mockJevEngine = {
      id: "jev-system-one",
      name: "TypeSafe Jev",
      provider: "JEV" as const,
      supportsScenario: () => true,
      getUnsupportedReason: () => undefined,
      evaluate: vi.fn().mockResolvedValue({
        engineId: "jev-system-one",
        source: "JEV",
        intent: "I'm going to sleep.",
        actions: [],
        decisionTimeMs: 1500,
        timestamp: new Date().toISOString(),
      }),
    };
    const mockLayaEngine = {
      id: "laya-system-one",
      name: "Laya (System-1 Decision Model)",
      provider: "LAYA" as const,
      supportsScenario: () => true,
      getUnsupportedReason: () => undefined,
      getClient: () => ({
        getModel: () => "english",
        getBaseUrl: () => "http://127.0.0.1:8081",
        getTimeoutMs: () => 15000,
      }),
      evaluate: vi.fn().mockResolvedValue({
        engineId: "laya-system-one",
        source: "LAYA",
        intent: "I'm going to sleep.",
        actions: [],
        decisionTimeMs: 25000,
        timestamp: new Date().toISOString(),
      }),
    };

    const report = await runControlledExperiment(
      [mockScenario],
      [
        { providerId: "JEV", engine: mockJevEngine as any, isScenarioSupported: () => true },
        { providerId: "LAYA", engine: mockLayaEngine as any, isScenarioSupported: () => true },
      ],
      {
        mode: "FULL_COMPARISON",
        repetitions: 1,
        experimentId: `test_exp_jev_unchanged_${Date.now()}`,
      }
    );

    expect(report.protocol.timeoutConfiguration.jevTimeoutMs).toBe(15000);
    expect(report.protocol.jevConfiguration?.timeoutMs).toBe(15000);
    expect(report.protocol.timeoutConfiguration.perScenarioTimeoutMs).toBe(45000);
  });

  // TEST 11: Structured actions remain authoritative for evaluation.
  it("TEST 11: Structured actions remain authoritative for evaluation, ignoring conflicting reasoning text", () => {
    const scenario = getEvaluationScenario("normal-sleep-01")!;
    const evaluator = new StandardEvaluationEngine();

    const devices = JSON.parse(JSON.stringify(INITIAL_DEVICES));
    devices["lock_main_door"].state.state = "UNLOCKED";
    devices["light_bedroom"].state.power = "ON";

    const baseState: HomeState = {
      simulationTime: "2026-09-24T22:00:00.000Z",
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

    const finalDevices = JSON.parse(JSON.stringify(devices));
    finalDevices["lock_main_door"].state.state = "LOCKED";
    finalDevices["light_bedroom"].state.power = "OFF";
    finalDevices["security_system"].state.state = "ARMED";
    finalDevices["security_system"].state.mode = "STAY";

    const finalState: HomeState = {
      ...baseState,
      devices: finalDevices,
    };

    const mockRun = {
      scenarioId: scenario.id,
      engineId: "llm-ollama",
      runId: "run_test_conflict_reasoning",
      timestamp: new Date().toISOString(),
      initialState: baseState,
      finalState,
      actions: [
        {
          id: "act-1",
          deviceId: "lock_main_door",
          actionType: "LOCK" as const,
          value: null,
          source: "LLM" as const,
          timestamp: new Date().toISOString(),
        },
        {
          id: "act-2",
          deviceId: "security_system",
          actionType: "ARM" as const,
          value: "STAY",
          source: "LLM" as const,
          timestamp: new Date().toISOString(),
        },
      ],
      decisionResult: {
        engineId: "llm-ollama",
        source: "LLM" as const,
        intent: scenario.intent,
        actions: [],
        reasoning: "The security system should be disarmed because the user is asleep.", // CONFLICTING REASONING TEXT
        decisionTimeMs: 115000,
        metadata: {
          proposedActions: [],
          skippedRedundantActions: [],
        },
      },
    };

    const evalResult = evaluator.evaluate(scenario, mockRun as any);

    const matchedActions = evalResult.actionComparison.matchedRequiredActions;
    const hasSecurityArm = matchedActions.some(
      (a) => a.deviceId === "security_system" && a.actionType === "ARM"
    );
    expect(hasSecurityArm).toBe(true);

    expect(
      evalResult.metrics.find((m) => m.name === "matched_required_actions_count")?.value
    ).toBeGreaterThanOrEqual(1);
  });
});
