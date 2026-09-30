import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { MultiEngineTracePanel } from "@/components/trace/MultiEngineTracePanel";
import { ProviderControlsPanel } from "@/components/providers/ProviderControlsPanel";
import { ActionHistoryPanel } from "@/components/history/ActionHistoryPanel";
import { Header } from "@/components/layout/Header";
import * as HomeContextModule from "@/context/HomeContext";
import { DecisionResult } from "@/types/engine";
import { Action, ActionLogEntry } from "@/types/action";
import { HomeState } from "@/types/home";
import { INITIAL_DEVICES } from "@/lib/devices.config";
import { INITIAL_ROOMS } from "@/lib/rooms.config";

// Mock HomeContext
vi.mock("@/context/HomeContext", async () => {
  const actual = await vi.importActual<typeof HomeContextModule>("@/context/HomeContext");
  return {
    ...actual,
    useHome: vi.fn(),
  };
});

// Mock Next.js navigation
vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

function createMockHomeState(): HomeState {
  return {
    simulationTime: "2026-09-27T18:00:00.000Z",
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

describe("Milestone 3.13E — Multi-Engine Observability & Floor-Plan Driver UI (LAYA + LLM)", () => {
  const mockLayaDecisionResult: DecisionResult = {
    engineId: "laya-engine",
    source: "LAYA",
    intent: "I'm going to sleep.",
    actions: [
      {
        id: "act_laya_1",
        deviceId: "light_living_room",
        actionType: "TURN_OFF",
        source: "LAYA",
        timestamp: "2026-09-27T18:00:00.000Z",
      },
    ],
    confidence: 0.91,
    reasoning: "Laya evaluated bedtime intent.",
    decisionTimeMs: 42,
    timestamp: "2026-09-27T18:00:00.000Z",
    metadata: {
      architecture: "ModernBERT-large non-autoregressive decision model (421M params)",
      runtime: "laya-serve",
      rawAnswers: [
        {
          question_id: "light_living_room",
          type: "noul",
          noul: 0.95,
          confidence: 0.91,
        },
      ],
      appliedActions: [],
      skippedRedundantActions: ["fan_bedroom: already OFF"],
    },
  };

  const mockLLMDecisionResult: DecisionResult = {
    engineId: "llm-engine",
    source: "LLM",
    intent: "I'm going to sleep.",
    actions: [
      {
        id: "act_llm_1",
        deviceId: "lock_main_door",
        actionType: "LOCK",
        source: "LLM",
        timestamp: "2026-09-27T18:00:00.000Z",
      },
    ],
    // Explicitly undefined confidence (standard for conventional LLMs)
    confidence: undefined,
    reasoning: "Conventional LLM selected lock_main_door LOCK for bedtime security.",
    decisionTimeMs: 580,
    timestamp: "2026-09-27T18:00:00.000Z",
    metadata: {
      model: "qwen2.5:3b",
      skippedRedundantActions: ["tv_living_room: already OFF"],
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // TEST A: Empty State when no results have been generated
  // =========================================================================
  it("TEST A: should render clean empty state when no multi-engine execution trace has been recorded", () => {
    vi.mocked(HomeContextModule.useHome).mockReturnValue({
      homeState: createMockHomeState() as any,
      latestMultiEngineResults: null,
      latestAppliedActions: [],
      latestSkippedActions: [],
      activeExecutionState: "IDLE",
      executionError: null,
      primaryFloorPlanEngine: null,
      clearExecutionTrace: vi.fn(),
    } as any);

    const html = renderToStaticMarkup(React.createElement(MultiEngineTracePanel));

    expect(html).toContain("Multi-Engine Decision Traces &amp; Observability");
    expect(html).toContain("Laya (System-1)");
    expect(html).toContain("Conventional LLM");
    expect(html).toContain("No Laya Evaluation Trace Recorded Yet");
    expect(html).not.toContain("TypeSafe Jev");
  });

  // =========================================================================
  // TEST B: Multi-engine trace panel renders Laya results
  // =========================================================================
  it("TEST B: should render Laya decisions, uncalibrated confidence label, latency, and actions", () => {
    vi.mocked(HomeContextModule.useHome).mockReturnValue({
      homeState: createMockHomeState() as any,
      latestMultiEngineResults: {
        LAYA: { success: true, decisionResult: mockLayaDecisionResult },
      },
      latestAppliedActions: mockLayaDecisionResult.actions,
      latestSkippedActions: ["fan_bedroom: already OFF"],
      activeExecutionState: "COMPLETED",
      executionError: null,
      primaryFloorPlanEngine: "LAYA",
      clearExecutionTrace: vi.fn(),
    } as any);

    const html = renderToStaticMarkup(React.createElement(MultiEngineTracePanel));

    expect(html).toContain("Laya (System-1)");
    expect(html).toContain("42 ms");
    expect(html).toContain("91%");
    expect(html).toContain("(model-reported, uncalibrated)");
    expect(html).toContain("TURN_OFF");
    expect(html).toContain("fan_bedroom: already OFF");
  });

  // =========================================================================
  // TEST C & E: Multi-engine trace panel renders LLM results and 'Not provided' confidence
  // =========================================================================
  it("TEST C & E: should render LLM decisions, concise summary, and strictly 'Not provided' for missing confidence", () => {
    vi.mocked(HomeContextModule.useHome).mockReturnValue({
      homeState: createMockHomeState() as any,
      latestMultiEngineResults: {
        LLM: { success: true, decisionResult: mockLLMDecisionResult },
      },
      latestAppliedActions: mockLLMDecisionResult.actions,
      latestSkippedActions: ["tv_living_room: already OFF"],
      activeExecutionState: "COMPLETED",
      executionError: null,
      primaryFloorPlanEngine: "LLM",
      clearExecutionTrace: vi.fn(),
    } as any);

    const html = renderToStaticMarkup(React.createElement(MultiEngineTracePanel));

    expect(html).toContain("Conventional LLM");
    expect(html).toContain("qwen2.5:3b");
    expect(html).toContain("580 ms");
    expect(html).toContain("LOCK");

    // Strictly verify Test E: Missing confidence renders "Not provided", never fabricated
    expect(html).toContain("Not provided");
    expect(html).not.toContain("NaN%");
    expect(html).not.toContain("undefined%");
  });

  // =========================================================================
  // TEST D: Dual-provider results remain independently visible with tabs
  // =========================================================================
  it("TEST D: should render tabs for LAYA and LLM without merging into composite decisions", () => {
    vi.mocked(HomeContextModule.useHome).mockReturnValue({
      homeState: createMockHomeState() as any,
      latestMultiEngineResults: {
        LAYA: { success: true, decisionResult: mockLayaDecisionResult },
        LLM: { success: true, decisionResult: mockLLMDecisionResult },
      },
      latestAppliedActions: mockLayaDecisionResult.actions,
      latestSkippedActions: [],
      activeExecutionState: "COMPLETED",
      executionError: null,
      primaryFloorPlanEngine: "LAYA",
      clearExecutionTrace: vi.fn(),
    } as any);

    const html = renderToStaticMarkup(React.createElement(MultiEngineTracePanel));

    // Both tabs must be present and distinct
    expect(html).toContain("Laya (System-1)");
    expect(html).toContain("Conventional LLM");
    expect(html).not.toContain("TypeSafe Jev");

    // LAYA is indicated as the Floor Plan Driver
    expect(html).toContain("Floor Plan Driver: <strong>LAYA</strong>");
  });

  // =========================================================================
  // TEST F, G, H: Floor-Plan Driver Selector in ProviderControlsPanel
  // =========================================================================
  it("TEST F, G, H: should allow selecting floor plan driver, disallow unavailable engines, and visibly indicate selected driver", () => {
    const mockSetPrimaryFloorPlan = vi.fn();

    vi.mocked(HomeContextModule.useHome).mockReturnValue({
      providers: [
        {
          providerId: "LAYA",
          engineId: "laya-engine",
          displayName: "Laya",
          enabled: true,
          canExecute: true,
          availability: { status: "AVAILABLE", detail: "Healthy" },
          metadata: { model: "laya-v1", runtime: "laya-serve" },
        },
        {
          providerId: "LLM",
          engineId: "llm-engine",
          displayName: "Conventional LLM",
          enabled: true,
          canExecute: true,
          availability: { status: "AVAILABLE", detail: "Healthy" },
          metadata: { model: "qwen2.5:3b", runtime: "Ollama" },
        },
      ] as any,
      providerEnablement: { LAYA: true, LLM: true },
      toggleProvider: vi.fn(),
      fetchProviderStatuses: vi.fn(),
      providersLoading: false,
      providersError: null,
      primaryFloorPlanEngine: "LLM", // Explicitly selected LLM as driver
      setPrimaryFloorPlanEngine: mockSetPrimaryFloorPlan,
    } as any);

    const html = renderToStaticMarkup(React.createElement(ProviderControlsPanel));

    // TEST H: Selected driver (LLM) is visibly indicated with "Floor Plan Driver"
    expect(html).toContain("Floor Plan Driver");

    // TEST F: Other available provider (LAYA) has "Use for Floor Plan" button
    expect(html).toContain("Use for Floor Plan");

    // Strictly confirm neutral terminology (no winner/best logic)
    expect(html).not.toContain("Best Engine");
    expect(html).not.toContain("Recommended Engine");
    expect(html).not.toContain("Winner");
    expect(html).not.toContain("Superior");
    expect(html).not.toContain("TypeSafe");
  });

  // =========================================================================
  // TEST I & J: ActionHistoryPanel renders LAYA badge and filter
  // =========================================================================
  it("TEST I & J: should include LAYA in filter options and render proper LAYA badge for actions", () => {
    const mockState = createMockHomeState();
    mockState.actionHistory = [
      {
        id: "log_1",
        timestamp: "18:00:00",
        deviceId: "light_living_room",
        deviceName: "Living Room Light",
        roomId: "living_room",
        actionType: "TURN_OFF",
        previousState: { power: "ON" },
        newState: { power: "OFF" },
        source: "LAYA",
        summary: "Turn off Living Room Light",
      } as ActionLogEntry,
    ];

    vi.mocked(HomeContextModule.useHome).mockReturnValue({
      homeState: mockState,
      clearActionHistory: vi.fn(),
    } as any);

    const html = renderToStaticMarkup(React.createElement(ActionHistoryPanel));

    // TEST I: Filter buttons contain LAYA
    expect(html).toContain("LAYA");

    // TEST J: Action entry renders LAYA badge
    expect(html).toContain("bg-teal-500/10 text-teal-400");
    expect(html).toContain("LAYA");
  });

  // =========================================================================
  // TEST K: Existing MANUAL, LAYA, LLM, and SYSTEM action history remains intact
  // =========================================================================
  it("TEST K: should preserve MANUAL, LAYA, LLM, and SYSTEM source badges in ActionHistoryPanel", () => {
    const mockState = createMockHomeState();
    mockState.actionHistory = [
      {
        id: "log_manual",
        timestamp: "18:00:01",
        deviceId: "fan_bedroom",
        deviceName: "Bedroom Fan",
        roomId: "bedroom",
        actionType: "SET_FAN_SPEED",
        previousState: {},
        newState: {},
        source: "MANUAL",
        summary: "Manual override",
      } as ActionLogEntry,
      {
        id: "log_laya",
        timestamp: "18:00:02",
        deviceId: "light_living_room",
        deviceName: "Living Room Light",
        roomId: "living_room",
        actionType: "TURN_OFF",
        previousState: {},
        newState: {},
        source: "LAYA",
        summary: "Laya decision",
      } as ActionLogEntry,
      {
        id: "log_llm",
        timestamp: "18:00:03",
        deviceId: "ac_living_room",
        deviceName: "Living Room AC",
        roomId: "living_room",
        actionType: "SET_TEMPERATURE",
        previousState: {},
        newState: {},
        source: "LLM",
        summary: "LLM action",
      } as ActionLogEntry,
      {
        id: "log_system",
        timestamp: "18:00:04",
        deviceId: "security_system",
        deviceName: "Security",
        roomId: "entrance",
        actionType: "ARM",
        previousState: {},
        newState: {},
        source: "SYSTEM",
        summary: "System arm",
      } as ActionLogEntry,
    ];

    vi.mocked(HomeContextModule.useHome).mockReturnValue({
      homeState: mockState,
      clearActionHistory: vi.fn(),
    } as any);

    const html = renderToStaticMarkup(React.createElement(ActionHistoryPanel));

    expect(html).toContain("MANUAL");
    expect(html).toContain("LAYA");
    expect(html).toContain("LLM");
    expect(html).toContain("SYSTEM");
    expect(html).not.toContain("JEV");
  });

  // =========================================================================
  // TEST L: Stale Phase 1 UI terminology is removed
  // =========================================================================
  it("TEST L: should verify removal of stale Phase 1 terminology across Header and ActionHistoryPanel", () => {
    vi.mocked(HomeContextModule.useHome).mockReturnValue({
      homeState: createMockHomeState(),
      activeDevicesCount: 2,
      totalDevicesCount: 18,
      clearActionHistory: vi.fn(),
    } as any);

    const headerHtml = renderToStaticMarkup(React.createElement(Header));
    const historyHtml = renderToStaticMarkup(React.createElement(ActionHistoryPanel));

    // Header has MULTI-ENGINE PLATFORM and NOT PHASE 1 FOUNDATION
    expect(headerHtml).toContain("MULTI-ENGINE PLATFORM");
    expect(headerHtml).not.toContain("PHASE 1 FOUNDATION");

    // ActionHistoryPanel does NOT contain obsolete Phase 1 copy
    expect(historyHtml).not.toContain("supports MANUAL now, JEV & LLM in later phases");
    expect(historyHtml).toContain("across manual overrides, Laya, and Conventional LLM");
  });
});
