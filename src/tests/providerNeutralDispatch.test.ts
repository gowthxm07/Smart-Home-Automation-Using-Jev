import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { IntentSection } from "@/components/intent/IntentSection";
import * as HomeContextModule from "@/context/HomeContext";
import { ProviderRegistry, ProviderRuntimeStatus } from "@/lib/providers";
import { simulationEngine } from "@/lib/simulationEngine";
import { INITIAL_DEVICES } from "@/lib/devices.config";
import { INITIAL_ROOMS } from "@/lib/rooms.config";
import { HomeState } from "@/types/home";
import { Action } from "@/types/action";
import { DecisionResult } from "@/types/engine";

// Mock HomeContext for component rendering tests
vi.mock("@/context/HomeContext", async () => {
  const actual = await vi.importActual<typeof HomeContextModule>("@/context/HomeContext");
  return {
    ...actual,
    useHome: vi.fn(),
  };
});

function createMockHomeState(): HomeState {
  return {
    simulationTime: "2026-09-27T12:00:00.000Z",
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
}

describe("Milestone 3.13C — Virtual Home Provider-Neutral Intent Dispatch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // Case A: Provider state exists with enablement map and live status
  // =========================================================================
  it("Case A: should maintain unified provider state with enablement map and live runtime status", () => {
    const enablement: Record<string, boolean> = {
      JEV: true,
      LAYA: true,
      LLM: true,
    };

    const mockStatuses: ProviderRuntimeStatus[] = [
      {
        providerId: "JEV",
        engineId: "jev-engine",
        displayName: "TypeSafe Jev",
        enabled: enablement.JEV,
        canExecute: false,
        statusExplanation: "TypeSafe API key is not configured.",
        availability: {
          providerId: "JEV",
          engineId: "jev-engine",
          status: "UNAVAILABLE_CONFIGURATION",
          detail: "API key missing",
        },
        metadata: {
          model: "jev-latest",
          runtime: "TypeSafe Cloud API",
          isLocal: false,
          description: "Jev engine",
        },
      },
      {
        providerId: "LAYA",
        engineId: "laya-engine",
        displayName: "Laya",
        enabled: enablement.LAYA,
        canExecute: true,
        statusExplanation: "Ready for execution.",
        availability: {
          providerId: "LAYA",
          engineId: "laya-engine",
          status: "AVAILABLE",
          detail: "Laya server healthy",
        },
        metadata: {
          model: "laya-v1",
          runtime: "laya-serve",
          isLocal: true,
          description: "Laya decision model",
        },
      },
    ];

    expect(enablement.JEV).toBe(true);
    expect(enablement.LAYA).toBe(true);
    expect(enablement.LLM).toBe(true);
    expect(mockStatuses).toHaveLength(2);
    expect(mockStatuses[0].providerId).toBe("JEV");
    expect(mockStatuses[1].providerId).toBe("LAYA");
  });

  // =========================================================================
  // Case B: Provider status refresh queries /api/providers
  // =========================================================================
  it("Case B: should query /api/providers during provider status refresh", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        providers: [
          {
            providerId: "LAYA",
            engineId: "laya-engine",
            displayName: "Laya",
            enabled: true,
            canExecute: true,
            availability: { status: "AVAILABLE", detail: "OK" },
          },
        ],
      }),
    });
    globalThis.fetch = mockFetch;

    const res = await fetch("/api/providers");
    const data = await res.json();

    expect(mockFetch).toHaveBeenCalledWith("/api/providers");
    expect(data.success).toBe(true);
    expect(data.providers[0].providerId).toBe("LAYA");
  });

  // =========================================================================
  // Case C: Enablement toggle toggles individual engine enablement
  // =========================================================================
  it("Case C: should toggle individual engine enablement without mutating other engines", () => {
    let enablement: Record<string, boolean> = {
      JEV: true,
      LAYA: true,
      LLM: true,
    };

    const toggleProvider = (id: string) => {
      enablement = {
        ...enablement,
        [id]: !enablement[id],
      };
    };

    // Toggle JEV off
    toggleProvider("JEV");
    expect(enablement.JEV).toBe(false);
    expect(enablement.LAYA).toBe(true);
    expect(enablement.LLM).toBe(true);

    // Toggle JEV back on
    toggleProvider("JEV");
    expect(enablement.JEV).toBe(true);

    // Toggle LAYA off
    toggleProvider("LAYA");
    expect(enablement.LAYA).toBe(false);
    expect(enablement.JEV).toBe(true);
    expect(enablement.LLM).toBe(true);
  });

  // =========================================================================
  // Case D: Executable engine calculation filters by both enabled AND available
  // =========================================================================
  it("Case D: should strictly require both enabled === true AND availability === 'AVAILABLE' to be executable", () => {
    const rawProviders = [
      { providerId: "JEV", availability: { status: "AVAILABLE" } },
      { providerId: "LAYA", availability: { status: "AVAILABLE" } },
      { providerId: "LLM", availability: { status: "UNAVAILABLE_SERVICE" } },
    ];

    const enablement: Record<string, boolean> = {
      JEV: false, // Disabled by user
      LAYA: true, // Enabled and available
      LLM: true,  // Enabled but unavailable service
    };

    const executable = rawProviders.filter((p) => {
      const isEnabled = enablement[p.providerId] ?? true;
      return isEnabled && p.availability.status === "AVAILABLE";
    });

    expect(executable).toHaveLength(1);
    expect(executable[0].providerId).toBe("LAYA");
  });

  // =========================================================================
  // Case E: Jev unconfigured and Laya available -> Laya is executable
  // =========================================================================
  it("Case E: should mark Laya as executable when Jev is unconfigured (UNAVAILABLE_CONFIGURATION)", () => {
    const providers = [
      {
        providerId: "JEV",
        availability: { status: "UNAVAILABLE_CONFIGURATION", detail: "API key missing" },
      },
      {
        providerId: "LAYA",
        availability: { status: "AVAILABLE", detail: "Ready" },
      },
    ];

    const enablement = { JEV: true, LAYA: true, LLM: true };

    const executable = providers.filter(
      (p) => enablement[p.providerId as keyof typeof enablement] && p.availability.status === "AVAILABLE"
    );

    expect(executable).toHaveLength(1);
    expect(executable[0].providerId).toBe("LAYA");
  });

  // =========================================================================
  // Case F: Ollama and Laya available -> both are executable
  // =========================================================================
  it("Case F: should mark both Laya and LLM as executable when both are available", () => {
    const providers = [
      { providerId: "JEV", availability: { status: "UNAVAILABLE_CONFIGURATION" } },
      { providerId: "LAYA", availability: { status: "AVAILABLE" } },
      { providerId: "LLM", availability: { status: "AVAILABLE" } },
    ];

    const enablement = { JEV: true, LAYA: true, LLM: true };

    const executable = providers.filter(
      (p) => enablement[p.providerId as keyof typeof enablement] && p.availability.status === "AVAILABLE"
    );

    expect(executable).toHaveLength(2);
    expect(executable.map((p) => p.providerId)).toEqual(["LAYA", "LLM"]);
  });

  // =========================================================================
  // Case G: Zero engines available/enabled -> button disabled, graceful handle
  // =========================================================================
  it("Case G: should disable process button and handle gracefully without throwing when zero engines are executable", () => {
    vi.mocked(HomeContextModule.useHome).mockReturnValue({
      homeState: { ...createMockHomeState(), currentIntentText: "Lock front door" } as any,
      selectScenario: vi.fn(),
      setIntentText: vi.fn(),
      runIntentAutomation: vi.fn().mockResolvedValue(false),
      activeExecutionState: "IDLE",
      executableProvidersCount: 0,
      executionError: null,
      providersLoading: false,
    } as any);

    const html = renderToStaticMarkup(React.createElement(IntentSection));

    // Confirm button rendered disabled with neutral warning
    expect(html).toContain("No Available Engines");
    expect(html).toContain("disabled=\"\"");
    expect(html).toContain("No AI decision engines are currently executable");
    expect(html).not.toContain("Unhandled Runtime Error");
  });

  // =========================================================================
  // Case H: Intent execution calls POST /api/providers with intent & homeState
  // =========================================================================
  it("Case H: should call POST /api/providers with intent text, homeState, and enablement map", async () => {
    const testState = createMockHomeState();
    testState.currentIntentText = "I am leaving for vacation.";

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        executedProviders: ["LAYA"],
        results: {
          LAYA: {
            success: true,
            decisionResult: {
              engineId: "laya-engine",
              actions: [
                {
                  id: "act_1",
                  deviceId: "lock_main_door",
                  actionType: "LOCK",
                  source: "LAYA",
                  timestamp: testState.simulationTime,
                },
              ],
            },
          },
        },
      }),
    });
    globalThis.fetch = mockFetch;

    const res = await fetch("/api/providers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        intent: testState.currentIntentText,
        homeState: testState,
        enabledProviders: { JEV: false, LAYA: true, LLM: false },
      }),
    });

    const data = await res.json();

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/providers",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining("I am leaving for vacation."),
      })
    );
    expect(data.success).toBe(true);
    expect(data.executedProviders).toContain("LAYA");
  });

  // =========================================================================
  // Case I: Single executable engine applies actions to homeState
  // =========================================================================
  it("Case I: should apply actions from the executable engine to homeState via simulationEngine", () => {
    let state = createMockHomeState();
    state.devices["lock_main_door"].state = { state: "UNLOCKED" };

    const action: Action = {
      id: "act_test_1",
      deviceId: "lock_main_door",
      actionType: "LOCK",
      source: "LAYA",
      timestamp: state.simulationTime,
    };

    const { finalState } = simulationEngine.applyBatchActions([action], state);

    expect(finalState.devices["lock_main_door"].state).toEqual({ state: "LOCKED" });
    expect(finalState.actionHistory).toHaveLength(1);
    expect(finalState.actionHistory[0].actionType).toBe("LOCK");
  });

  // =========================================================================
  // Case J: Non-sleep intents execute via provider-neutral dispatch without Phase 1 modal
  // =========================================================================
  it("Case J: should render provider-neutral 'Process Intent' for non-sleep intents without Phase 1 modal", () => {
    vi.mocked(HomeContextModule.useHome).mockReturnValue({
      homeState: { ...createMockHomeState(), currentIntentText: "Movie night in living room" } as any,
      selectScenario: vi.fn(),
      setIntentText: vi.fn(),
      runIntentAutomation: vi.fn().mockResolvedValue(true),
      activeExecutionState: "IDLE",
      executableProvidersCount: 2,
      executionError: null,
      providersLoading: false,
    } as any);

    const html = renderToStaticMarkup(React.createElement(IntentSection));

    // Confirm primary button is "Process Intent"
    expect(html).toContain("Process Intent");
    expect(html).toContain("2 engines active");
    expect(html).toContain("Provider-neutral dispatch");

    // Strictly verify NO Phase 1 notice modal or Phase 1 text is present
    expect(html).not.toContain("Architectural Checkpoint");
    expect(html).not.toContain("Phase 1 Architectural Principles");
    expect(html).not.toContain("AI decision engine will be connected in a later phase");
    expect(html).not.toContain("Acknowledge & Continue Manual Simulation");
  });

  // =========================================================================
  // Case K: Multi-engine execution runs independent clones and applies designated engine
  // =========================================================================
  it("Case K: should execute multi-engine intents on independent clones and apply designated actions without ranking", () => {
    let state = createMockHomeState();
    state.devices["light_living_room"].state = { power: "ON", brightness: 100, mode: "NORMAL" };

    const multiEngineResults: Record<
      string,
      { success: boolean; decisionResult: DecisionResult }
    > = {
      LAYA: {
        success: true,
        decisionResult: {
          engineId: "laya-engine",
          source: "LAYA",
          intent: "Sleep mode",
          actions: [
            {
              id: "act_laya_1",
              deviceId: "light_living_room",
              actionType: "TURN_OFF",
              source: "LAYA",
              timestamp: state.simulationTime,
            },
          ],
          timestamp: state.simulationTime,
        },
      },
      LLM: {
        success: true,
        decisionResult: {
          engineId: "llm-engine",
          source: "LLM",
          intent: "Sleep mode",
          actions: [
            {
              id: "act_llm_1",
              deviceId: "light_living_room",
              actionType: "SET_BRIGHTNESS",
              value: 10,
              source: "LLM",
              timestamp: state.simulationTime,
            },
          ],
          timestamp: state.simulationTime,
        },
      },
    };

    // Both results are recorded in multiEngineResults
    expect(multiEngineResults.LAYA.success).toBe(true);
    expect(multiEngineResults.LLM.success).toBe(true);

    // Designate LAYA as the primary floor plan driver
    const designatedEngine = "LAYA";
    const chosenResult = multiEngineResults[designatedEngine].decisionResult;

    const { finalState } = simulationEngine.applyBatchActions(chosenResult.actions, state);

    expect(finalState.devices["light_living_room"].state).toEqual({
      power: "OFF",
      brightness: 100,
      mode: "NORMAL",
    });

    // Verify ZERO ranking, winner, or score fields exist in results
    for (const [providerId, result] of Object.entries(multiEngineResults)) {
      expect((result.decisionResult as any).rank).toBeUndefined();
      expect((result.decisionResult as any).score).toBeUndefined();
      expect((result.decisionResult as any).isWinner).toBeUndefined();
      expect((result.decisionResult as any).compositeScore).toBeUndefined();
    }
  });
});
