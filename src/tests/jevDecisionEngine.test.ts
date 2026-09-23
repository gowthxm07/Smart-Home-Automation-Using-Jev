import { describe, it, expect, vi } from "vitest";
import { JevDecisionEngine } from "@/lib/jev/JevDecisionEngine";
import { TypeSafeClient } from "@/lib/typesafe/client";
import { TypeSafeConfigurationError } from "@/lib/typesafe/errors";
import { INITIAL_DEVICES } from "@/lib/devices.config";
import { INITIAL_ROOMS } from "@/lib/rooms.config";
import { HomeState } from "@/types/home";

describe("JevDecisionEngine (Milestone 2.1)", () => {
  const mockHomeState: HomeState = {
    simulationTime: "2026-09-23T22:30:00.000Z",
    isSimulatedClock: true,
    simulationSpeed: 1,
    automationMode: "MANUAL_SIMULATION",
    rooms: INITIAL_ROOMS,
    devices: INITIAL_DEVICES,
    currentScenario: null,
    currentIntentText: "",
    lastAction: null,
    actionHistory: [],
  };

  it("Test G: should conform to the existing DecisionEngine contract", () => {
    const engine = new JevDecisionEngine({
      client: new TypeSafeClient({ apiKey: "test_key" }),
    });

    expect(engine.id).toBe("jev-system-one");
    expect(engine.name).toContain("TypeSafe Jev");
    expect(engine.provider).toBe("JEV");
    expect(typeof engine.evaluate).toBe("function");
  });

  it("should fail clearly when TYPESAFE_API_KEY is not configured", async () => {
    const unconfiguredEngine = new JevDecisionEngine({
      client: new TypeSafeClient({ apiKey: "" }),
    });

    await expect(
      unconfiguredEngine.evaluate("I am going to sleep", mockHomeState)
    ).rejects.toThrow(TypeSafeConfigurationError);
  });

  it("should evaluate intent through TypeSafe System One and retain structured metadata", async () => {
    const mockClient = new TypeSafeClient({ apiKey: "test_key" });
    vi.spyOn(mockClient, "evaluateSystemOne").mockResolvedValue({
      model: "jev-latest",
      answers: {
        is_automation_relevant: {
          type: "noul",
          noul: 0.94,
        },
      },
      usage: {
        input_tokens: 30,
        output_tokens: 4,
      },
    });

    const engine = new JevDecisionEngine({ client: mockClient });
    const result = await engine.evaluate("I am going to sleep", mockHomeState);

    expect(result.engineId).toBe("jev-system-one");
    expect(result.source).toBe("JEV");
    expect(result.intent).toBe("I am going to sleep");
    expect(result.confidence).toBe(0.94);
    expect(result.reasoning).toContain("TypeSafe Jev System One");
    expect(result.metadata?.modelUsed).toBe("jev-latest");
    expect((result.metadata?.rawAnswers as any)?.is_automation_relevant?.noul).toBe(0.94);

    // In Milestone 2.1: Actions must NOT be hardcoded for scenarios
    expect(result.actions).toHaveLength(0);
  });

  it("should perform health check using listModels", async () => {
    const mockClient = new TypeSafeClient({ apiKey: "test_key" });
    vi.spyOn(mockClient, "listModels").mockResolvedValue({
      models: [
        {
          name: "jev-latest",
          description: "General purpose",
          release_date: "2026-09-15",
        },
      ],
    });

    const engine = new JevDecisionEngine({ client: mockClient });
    const health = await engine.checkHealth();
    expect(health.healthy).toBe(true);
    expect(health.modelCount).toBe(1);
  });
});
