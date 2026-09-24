import { describe, it, expect, vi } from "vitest";
import {
  LLMDecisionEngine,
  LLMResponseParseError,
  LLMSchemaValidationError,
  LLMInvalidDeviceError,
  LLMActionValidationError,
  HOMEMIND_LLM_PROMPT_VERSION,
} from "@/lib/llm";
import {
  OllamaClient,
  OllamaApiError,
  OllamaConnectionError,
  OllamaTimeoutError,
} from "@/lib/ollama";
import { INITIAL_DEVICES } from "@/lib/devices.config";
import { INITIAL_ROOMS } from "@/lib/rooms.config";
import { HomeState } from "@/types/home";
import { Action } from "@/types/action";
import { evaluateScenario } from "@/lib/evaluation/runner";
import { getEvaluationScenario } from "@/lib/evaluation/dataset";
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

function createMockOllamaClient(content: string, overrides?: Record<string, any>): OllamaClient {
  const mockChat = vi.fn().mockResolvedValue({
    model: overrides?.model || "llama3.2:3b",
    created_at: new Date().toISOString(),
    message: {
      role: "assistant",
      content,
    },
    done: true,
    total_duration: 350000000,
    prompt_eval_count: 150,
    eval_count: 30,
    ...overrides,
  });

  return {
    chat: mockChat,
    listModels: vi.fn().mockResolvedValue({
      models: [{ name: "llama3.2:3b" }],
    }),
    checkHealth: vi.fn().mockResolvedValue({
      healthy: true,
      modelCount: 1,
    }),
  } as unknown as OllamaClient;
}

describe("LLMDecisionEngine (Milestone 3.6)", () => {
  // 1. Interface conformance
  it("conforms to DecisionEngine interface with provider 'LLM'", () => {
    const engine = new LLMDecisionEngine({ model: "llama3.2:3b" });
    expect(engine.id).toBe("llm-ollama");
    expect(engine.name).toContain("Conventional LLM");
    expect(engine.provider).toBe("LLM");
    expect(typeof engine.evaluate).toBe("function");
  });

  // 2. Successful structured response and valid action generation
  it("generates valid actions from a structured LLM response", async () => {
    const homeState = createFreshHomeState((d) => {
      d["lock_main_door"].state.state = "UNLOCKED";
    });

    const llmOutput = JSON.stringify({
      reasoning: "Securing front door lock for bedtime.",
      decisions: [
        {
          deviceId: "lock_main_door",
          actionType: "LOCK",
          value: null,
        },
      ],
    });

    const mockClient = createMockOllamaClient(llmOutput);
    const engine = new LLMDecisionEngine({ client: mockClient });

    const result = await engine.evaluate("I'm going to sleep.", homeState);

    expect(result.source).toBe("LLM");
    expect(result.engineId).toBe("llm-ollama");
    expect(result.confidence).toBeUndefined();
    expect(result.actions).toHaveLength(1);
    expect(result.actions[0].deviceId).toBe("lock_main_door");
    expect(result.actions[0].actionType).toBe("LOCK");
    expect(result.actions[0].source).toBe("LLM");
    expect(result.reasoning).toBe("Securing front door lock for bedtime.");
    expect((result.metadata?.proposedActions as Action[])).toHaveLength(1);
  });

  // 3. Multiple actions across distinct categories
  it("handles multiple actions across lighting, security, and climate", async () => {
    const homeState = createFreshHomeState((d) => {
      d["lock_main_door"].state.state = "UNLOCKED";
      d["light_living_room"].state.power = "ON";
      d["fan_bedroom"].state.power = "OFF";
      d["curtain_bedroom"].state.state = "OPEN";
    });

    const llmOutput = JSON.stringify({
      reasoning: "Executing bedtime routine across multiple zones.",
      decisions: [
        { deviceId: "lock_main_door", actionType: "LOCK" },
        { deviceId: "light_living_room", actionType: "TURN_OFF" },
        { deviceId: "fan_bedroom", actionType: "SET_FAN_SPEED", value: 1 },
        { deviceId: "curtain_bedroom", actionType: "CLOSE_CURTAIN" },
      ],
    });

    const mockClient = createMockOllamaClient(llmOutput);
    const engine = new LLMDecisionEngine({ client: mockClient });

    const result = await engine.evaluate("I'm going to sleep.", homeState);

    expect(result.actions).toHaveLength(4);
    expect(result.actions.find((a) => a.deviceId === "lock_main_door")?.actionType).toBe("LOCK");
    expect(result.actions.find((a) => a.deviceId === "light_living_room")?.actionType).toBe("TURN_OFF");
    expect(result.actions.find((a) => a.deviceId === "fan_bedroom")?.actionType).toBe("SET_FAN_SPEED");
    expect(result.actions.find((a) => a.deviceId === "fan_bedroom")?.value).toBe(1);
    expect(result.actions.find((a) => a.deviceId === "curtain_bedroom")?.actionType).toBe("CLOSE_CURTAIN");
  });

  // 4. No-op response (empty decisions or all redundant)
  it("handles empty decisions array and eliminates redundant actions (no-op)", async () => {
    const homeState = createFreshHomeState((d) => {
      d["lock_main_door"].state.state = "LOCKED";
      d["light_living_room"].state.power = "OFF";
    });

    // LLM outputs actions that match already-active state
    const llmOutput = JSON.stringify({
      reasoning: "House is already locked and dark. No changes needed.",
      decisions: [
        { deviceId: "lock_main_door", actionType: "LOCK" },
        { deviceId: "light_living_room", actionType: "TURN_OFF" },
      ],
    });

    const mockClient = createMockOllamaClient(llmOutput);
    const engine = new LLMDecisionEngine({ client: mockClient });

    const result = await engine.evaluate("I'm going to sleep.", homeState);

    expect(result.actions).toHaveLength(0);
    expect(result.confidence).toBeUndefined();

    // Raw validated proposed actions remain auditable
    const proposed = result.metadata?.proposedActions as Action[];
    expect(proposed).toHaveLength(2);
    expect(proposed.map((a) => a.deviceId)).toContain("lock_main_door");
    expect(proposed.map((a) => a.deviceId)).toContain("light_living_room");

    // Redundant actions represented in skippedRedundantActions as Action[]
    const skipped = result.metadata?.skippedRedundantActions as Action[];
    expect(skipped).toHaveLength(2);
    expect(skipped.map((a) => a.deviceId)).toContain("lock_main_door");
    expect(skipped.map((a) => a.deviceId)).toContain("light_living_room");

    const reasons = result.metadata?.skippedRedundantReasons as string[];
    expect(reasons).toContain("lock_main_door: already LOCKED");
    expect(reasons).toContain("light_living_room: already OFF");
  });

  // 4b. LLM results do not fabricate confidence (Correction 1)
  it("never fabricates confidence (confidence is undefined / omitted for LLM)", async () => {
    const homeState = createFreshHomeState();
    const llmOutput = JSON.stringify({
      reasoning: "Locking door.",
      decisions: [{ deviceId: "lock_main_door", actionType: "LOCK" }],
    });

    const mockClient = createMockOllamaClient(llmOutput);
    const engine = new LLMDecisionEngine({ client: mockClient });

    const result = await engine.evaluate("Lock the door.", homeState);

    expect(result.confidence).toBeUndefined();
    expect(result.confidence).not.toBe(1.0);
    expect(result.confidence).not.toBe(0);
    expect("confidence" in result && result.confidence !== undefined).toBe(false);
  });

  // 4c. Preserves raw proposedActions and separates executable actions (Correction 2)
  it("preserves raw validated proposedActions before redundancy normalization alongside skippedRedundantActions", async () => {
    // Initial state: door is already LOCKED, but TV is ON
    const homeState = createFreshHomeState((d) => {
      d["lock_main_door"].state.state = "LOCKED";
      d["tv_living_room"].state.power = "ON";
    });

    // LLM proposes locking the door (redundant) AND turning off TV (executable)
    const llmOutput = JSON.stringify({
      reasoning: "Securing door and shutting off TV.",
      decisions: [
        { deviceId: "lock_main_door", actionType: "LOCK" },
        { deviceId: "tv_living_room", actionType: "TURN_OFF" },
      ],
    });

    const mockClient = createMockOllamaClient(llmOutput);
    const engine = new LLMDecisionEngine({ client: mockClient });

    const result = await engine.evaluate("Going to sleep.", homeState);

    // 1. Confidence must be absent / undefined
    expect(result.confidence).toBeUndefined();

    // 2. proposedActions preserves ALL validated actions returned by LLM
    const proposed = result.metadata?.proposedActions as Action[];
    expect(proposed).toHaveLength(2);
    expect(proposed.find((a) => a.deviceId === "lock_main_door")?.actionType).toBe("LOCK");
    expect(proposed.find((a) => a.deviceId === "tv_living_room")?.actionType).toBe("TURN_OFF");

    // 3. Redundant action is in proposedActions AND in skippedRedundantActions
    const skipped = result.metadata?.skippedRedundantActions as Action[];
    expect(skipped).toHaveLength(1);
    expect(skipped[0].deviceId).toBe("lock_main_door");
    expect(skipped[0].actionType).toBe("LOCK");

    // 4. Normalized executable actions only contains non-redundant action
    expect(result.actions).toHaveLength(1);
    expect(result.actions[0].deviceId).toBe("tv_living_room");
    expect(result.actions[0].actionType).toBe("TURN_OFF");
  });

  // 5. Handles markdown-wrapped JSON output gracefully
  it("extracts and parses JSON wrapped in markdown code blocks", async () => {
    const homeState = createFreshHomeState((d) => {
      d["light_study"].state.power = "OFF";
    });

    const markdownOutput = `Here are the actions:
\`\`\`json
{
  "reasoning": "Turning on study light for work.",
  "decisions": [
    { "deviceId": "light_study", "actionType": "TURN_ON" }
  ]
}
\`\`\``;

    const mockClient = createMockOllamaClient(markdownOutput);
    const engine = new LLMDecisionEngine({ client: mockClient });

    const result = await engine.evaluate("I'm going to work.", homeState);
    expect(result.actions).toHaveLength(1);
    expect(result.actions[0].deviceId).toBe("light_study");
    expect(result.actions[0].actionType).toBe("TURN_ON");
  });

  // 6. Malformed JSON rejection
  it("throws LLMResponseParseError when response is not valid JSON", async () => {
    const homeState = createFreshHomeState();
    const mockClient = createMockOllamaClient("I cannot process this request because...");
    const engine = new LLMDecisionEngine({ client: mockClient });

    await expect(engine.evaluate("I'm leaving home.", homeState)).rejects.toThrow(
      LLMResponseParseError
    );
  });

  // 7. Schema validation failure (missing decisions array)
  it("throws LLMSchemaValidationError when schema lacks decisions array", async () => {
    const homeState = createFreshHomeState();
    const badSchema = JSON.stringify({
      reasoning: "Missing the decisions field completely",
    });

    const mockClient = createMockOllamaClient(badSchema);
    const engine = new LLMDecisionEngine({ client: mockClient });

    await expect(engine.evaluate("I'm leaving home.", homeState)).rejects.toThrow(
      LLMSchemaValidationError
    );
  });

  // 8. Unknown device ID rejection
  it("throws LLMInvalidDeviceError when model outputs non-existent device ID", async () => {
    const homeState = createFreshHomeState();
    const inventedDevice = JSON.stringify({
      reasoning: "Turning off toaster in kitchen",
      decisions: [
        { deviceId: "toaster_kitchen_01", actionType: "TURN_OFF" },
      ],
    });

    const mockClient = createMockOllamaClient(inventedDevice);
    const engine = new LLMDecisionEngine({ client: mockClient });

    await expect(engine.evaluate("I'm leaving home.", homeState)).rejects.toThrow(
      LLMInvalidDeviceError
    );
  });

  // 9. Invalid action type rejection
  it("throws LLMActionValidationError when actionType is unrecognized", async () => {
    const homeState = createFreshHomeState();
    const invalidAction = JSON.stringify({
      reasoning: "Invalid action",
      decisions: [
        { deviceId: "light_living_room", actionType: "EXPLODE" },
      ],
    });

    const mockClient = createMockOllamaClient(invalidAction);
    const engine = new LLMDecisionEngine({ client: mockClient });

    await expect(engine.evaluate("Movie night.", homeState)).rejects.toThrow(
      LLMActionValidationError
    );
  });

  // 10. Incompatible action capability rejection
  it("throws LLMActionValidationError when action is incompatible with device capabilities", async () => {
    const homeState = createFreshHomeState();
    // lock_main_door has powerToggle: false
    const incompatibleAction = JSON.stringify({
      reasoning: "Trying to turn on a motorized deadbolt",
      decisions: [
        { deviceId: "lock_main_door", actionType: "TURN_ON" },
      ],
    });

    const mockClient = createMockOllamaClient(incompatibleAction);
    const engine = new LLMDecisionEngine({ client: mockClient });

    await expect(engine.evaluate("I'm coming home.", homeState)).rejects.toThrow(
      LLMActionValidationError
    );
  });

  // 11. Out-of-bounds action value rejection
  it("throws LLMActionValidationError when value is out of bounds", async () => {
    const homeState = createFreshHomeState();
    // fan_bedroom only supports speed 0, 1, 2, 3
    const badSpeed = JSON.stringify({
      reasoning: "Invalid fan speed",
      decisions: [
        { deviceId: "fan_bedroom", actionType: "SET_FAN_SPEED", value: 99 },
      ],
    });

    const mockClient = createMockOllamaClient(badSpeed);
    const engine = new LLMDecisionEngine({ client: mockClient });

    await expect(engine.evaluate("I'm going to sleep.", homeState)).rejects.toThrow(
      LLMActionValidationError
    );
  });

  // 12. Ollama HTTP / connection / timeout failure propagation (no fallback)
  it("propagates OllamaApiError cleanly without fallback to Jev or hardcoded actions", async () => {
    const homeState = createFreshHomeState();
    const mockClient = {
      chat: vi.fn().mockRejectedValue(new OllamaApiError("Model not found", 404)),
    } as unknown as OllamaClient;

    const engine = new LLMDecisionEngine({ client: mockClient });

    await expect(engine.evaluate("I'm going to sleep.", homeState)).rejects.toThrow(
      OllamaApiError
    );
  });

  it("propagates OllamaConnectionError cleanly without fallback", async () => {
    const homeState = createFreshHomeState();
    const mockClient = {
      chat: vi.fn().mockRejectedValue(new OllamaConnectionError("ECONNREFUSED")),
    } as unknown as OllamaClient;

    const engine = new LLMDecisionEngine({ client: mockClient });

    await expect(engine.evaluate("I'm going to sleep.", homeState)).rejects.toThrow(
      OllamaConnectionError
    );
  });

  it("propagates OllamaTimeoutError cleanly without fallback", async () => {
    const homeState = createFreshHomeState();
    const mockClient = {
      chat: vi.fn().mockRejectedValue(new OllamaTimeoutError("Timed out", 30000)),
    } as unknown as OllamaClient;

    const engine = new LLMDecisionEngine({ client: mockClient });

    await expect(engine.evaluate("I'm going to sleep.", homeState)).rejects.toThrow(
      OllamaTimeoutError
    );
  });

  // 13. Provider metadata capture
  it("captures provider, model, prompt version, and Ollama metrics in DecisionResult metadata", async () => {
    const homeState = createFreshHomeState((d) => {
      d["lock_main_door"].state.state = "UNLOCKED";
    });

    const llmOutput = JSON.stringify({
      reasoning: "Securing lock",
      decisions: [{ deviceId: "lock_main_door", actionType: "LOCK" }],
    });

    const mockClient = createMockOllamaClient(llmOutput, {
      model: "mistral:7b",
      total_duration: 800000000,
      prompt_eval_count: 210,
      eval_count: 45,
    });

    const engine = new LLMDecisionEngine({ client: mockClient, model: "mistral:7b" });
    const result = await engine.evaluate("I'm leaving home.", homeState);

    expect(result.metadata?.provider).toBe("ollama");
    expect(result.metadata?.model).toBe("mistral:7b");
    expect(result.metadata?.promptVersion).toBe(HOMEMIND_LLM_PROMPT_VERSION);
    expect((result.metadata?.ollamaMetrics as any)?.totalDurationNs).toBe(800000000);
    expect((result.metadata?.ollamaMetrics as any)?.evalCount).toBe(45);
    expect(result.decisionTimeMs).toBeGreaterThanOrEqual(0);
  });

  // 14. Initial HomeState immutability
  it("preserves initial HomeState immutability during evaluation", async () => {
    const homeState = createFreshHomeState((d) => {
      d["lock_main_door"].state.state = "UNLOCKED";
    });
    const snapshot = JSON.stringify(homeState);

    const llmOutput = JSON.stringify({
      reasoning: "Securing lock",
      decisions: [{ deviceId: "lock_main_door", actionType: "LOCK" }],
    });

    const mockClient = createMockOllamaClient(llmOutput);
    const engine = new LLMDecisionEngine({ client: mockClient });

    await engine.evaluate("I'm leaving home.", homeState);

    // Initial state snapshot must remain identical
    expect(JSON.stringify(homeState)).toBe(snapshot);
  });

  // 15. Empty intent returns empty DecisionResult
  it("returns zero actions and undefined confidence for empty intent", async () => {
    const homeState = createFreshHomeState();
    const mockClient = createMockOllamaClient("{}");
    const engine = new LLMDecisionEngine({ client: mockClient });

    const result = await engine.evaluate("   ", homeState);

    expect(result.actions).toHaveLength(0);
    expect(result.confidence).toBeUndefined();
    expect(result.metadata?.proposedActions).toEqual([]);
    expect(result.metadata?.skippedRedundantActions).toEqual([]);
    expect(result.reasoning).toContain("Empty intent");
  });

  // 16. Integration with generic EvaluationRunner
  it("integrates seamlessly into generic evaluateScenario runner", async () => {
    const sleepScenario = getEvaluationScenario("normal-sleep-01")!;
    expect(sleepScenario).toBeDefined();

    const llmBedtimeOutput = JSON.stringify({
      reasoning: "Bedtime shutdown: lock door, arm security, shut off TV & light, close curtains, set gentle fan.",
      decisions: [
        { deviceId: "lock_main_door", actionType: "LOCK" },
        { deviceId: "security_system", actionType: "ARM", value: "STAY" },
        { deviceId: "light_living_room", actionType: "TURN_OFF" },
        { deviceId: "tv_living_room", actionType: "TURN_OFF" },
        { deviceId: "curtain_bedroom", actionType: "CLOSE_CURTAIN" },
        { deviceId: "fan_bedroom", actionType: "SET_FAN_SPEED", value: 1 },
      ],
    });

    const mockClient = createMockOllamaClient(llmBedtimeOutput);
    const engine = new LLMDecisionEngine({ client: mockClient });

    const runResult = await evaluateScenario(sleepScenario, engine);

    expect(runResult.success).toBe(true);
    expect(engine.provider).toBe("LLM");
    expect(runResult.run.decisionResult.source).toBe("LLM");
    expect(runResult.run.decisionResult.confidence).toBeUndefined();
    expect((runResult.run.decisionResult.metadata?.proposedActions as Action[])).toHaveLength(6);
    expect(runResult.run.engineId).toBe("llm-ollama");
    expect(runResult.run.actions).toHaveLength(6);
    expect(runResult.evaluationResult).toBeDefined();
    expect(runResult.evaluationResult?.scenarioId).toBe("normal-sleep-01");
    expect(runResult.timing.decisionLatencyMs).toBeGreaterThanOrEqual(0);
    expect(runResult.timing.simulationLatencyMs).toBeGreaterThanOrEqual(0);
    expect(runResult.timing.evaluationLatencyMs).toBeGreaterThanOrEqual(0);

    // Final simulated state updated deterministically
    expect((runResult.finalState.devices["lock_main_door"].state as any).state).toBe("LOCKED");
    expect((runResult.finalState.devices["security_system"].state as any).state).toBe("ARMED");
    expect((runResult.finalState.devices["tv_living_room"].state as any).power).toBe("OFF");
  });

  // 17. Architectural Independence Guardrail
  describe("Architectural Independence Guardrail", () => {
    it("guarantees src/lib/llm/ and src/lib/ollama/ do not import from evaluation, policies, jev, or typesafe", () => {
      const dirsToCheck = [
        path.resolve(process.cwd(), "src/lib/llm"),
        path.resolve(process.cwd(), "src/lib/ollama"),
      ];

      for (const dir of dirsToCheck) {
        const files = fs.readdirSync(dir).filter((f) => f.endsWith(".ts"));
        expect(files.length).toBeGreaterThan(0);

        for (const file of files) {
          const filePath = path.join(dir, file);
          const content = fs.readFileSync(filePath, "utf-8");

          // Assert zero forbidden imports
          expect(content).not.toMatch(/from\s+["'].*evaluation.*["']/i);
          expect(content).not.toMatch(/from\s+["'].*policies.*["']/i);
          expect(content).not.toMatch(/from\s+["'].*jev.*["']/i);
          expect(content).not.toMatch(/from\s+["'].*typesafe.*["']/i);

          // Assert no dataset or answer key leaks
          expect(content).not.toMatch(/EvaluationScenario/i);
          expect(content).not.toMatch(/expectedOutcome/i);
          expect(content).not.toMatch(/expectedActions/i);
          expect(content).not.toMatch(/expectedDeviceStates/i);
        }
      }
    });
  });
});
