import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { JevDecisionTracePanel } from "@/components/jev/JevDecisionTracePanel";
import * as HomeContextModule from "@/context/HomeContext";
import { JevDecisionTrace } from "@/lib/jev/trace";
import { Action } from "@/types/action";

vi.mock("@/context/HomeContext", async () => {
  const actual = await vi.importActual<any>("@/context/HomeContext");
  return {
    ...actual,
    useHome: vi.fn(),
  };
});

describe("JevDecisionTracePanel Component (Milestone 2.3)", () => {
  const mockBaseTrace: JevDecisionTrace = {
    scenarioId: "GOING_TO_SLEEP",
    intent: "I'm going to sleep.",
    modelUsed: "jev-latest",
    tokenUsage: {
      input_tokens: 180,
      output_tokens: 28,
    },
    overallConfidence: 0.95,
    timestamp: "2026-09-23T23:00:00.000Z",
    decisions: {
      lock_main_door: {
        questionId: "lock_main_door",
        questionType: "noul",
        instructions: "Should the front door deadbolt be locked?",
        rawAnswer: { type: "noul", noul: 0.97 },
        affirmative: true,
        confidence: 0.97,
        probability: 0.97,
      },
      fan_bedroom: {
        questionId: "fan_bedroom",
        questionType: "choice",
        instructions: "What bedroom ceiling fan speed is appropriate for sleeping?",
        rawAnswer: {
          type: "choice",
          choice: "low",
          confidence: 0.9,
          probabilities: { off: 0.05, low: 0.9, medium: 0.04, high: 0.01 },
        },
        selectedChoice: "low",
        confidence: 0.9,
        probability: 0.9,
        probabilities: { off: 0.05, low: 0.9, medium: 0.04, high: 0.01 },
      },
    },
  };

  const mockAppliedActions: Action[] = [
    {
      id: "act_1",
      deviceId: "lock_main_door",
      actionType: "LOCK",
      source: "JEV",
      timestamp: "2026-09-23T23:00:00.000Z",
    },
  ];

  const mockSkippedActions: string[] = [
    "tv_living_room: already OFF (no action needed)",
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("Test A & G: should render IDLE state when no evaluation has occurred", () => {
    vi.mocked(HomeContextModule.useHome).mockReturnValue({
      homeState: { currentScenario: null, currentIntentText: "" } as any,
      jevExecutionState: "IDLE",
      jevError: null,
      latestDecisionResult: null,
      latestDecisionTrace: null,
      latestAppliedActions: [],
      latestSkippedActions: [],
      runJevAutomation: vi.fn(),
      clearJevTrace: vi.fn(),
    } as any);

    const html = renderToStaticMarkup(React.createElement(JevDecisionTracePanel));

    expect(html).toContain("IDLE");
    expect(html).toContain("No Jev Evaluation Trace Recorded Yet");
    expect(html).toContain("Run Jev Automation (GOING_TO_SLEEP)");
  });

  it("Test G: should render loading/evaluating state with 8 questions indicator", () => {
    vi.mocked(HomeContextModule.useHome).mockReturnValue({
      homeState: { currentScenario: null, currentIntentText: "" } as any,
      jevExecutionState: "EVALUATING",
      jevError: null,
      latestDecisionResult: null,
      latestDecisionTrace: null,
      latestAppliedActions: [],
      latestSkippedActions: [],
      runJevAutomation: vi.fn(),
      clearJevTrace: vi.fn(),
    } as any);

    const html = renderToStaticMarkup(React.createElement(JevDecisionTracePanel));

    expect(html).toContain("EVALUATING JEV (8 QUESTIONS)...");
    expect(html).toContain("Querying TypeSafe Jev System One Engine...");
    expect(html).toContain("Submitting 8 structured decision questions conditioned on current HomeState");
    expect(html).toContain("disabled=\"\"");
  });

  it("Test H: should render error state cleanly when Jev evaluation fails", () => {
    vi.mocked(HomeContextModule.useHome).mockReturnValue({
      homeState: { currentScenario: null, currentIntentText: "" } as any,
      jevExecutionState: "ERROR",
      jevError: "HTTP 401 Unauthorized: Invalid TypeSafe API Key",
      latestDecisionResult: null,
      latestDecisionTrace: null,
      latestAppliedActions: [],
      latestSkippedActions: [],
      runJevAutomation: vi.fn(),
      clearJevTrace: vi.fn(),
    } as any);

    const html = renderToStaticMarkup(React.createElement(JevDecisionTracePanel));

    expect(html).toContain("ERROR");
    expect(html).toContain("Jev Decision Evaluation Failed");
    expect(html).toContain("HTTP 401 Unauthorized: Invalid TypeSafe API Key");
    expect(html).toContain("HomeState was preserved without changes. No fallback fake decisions were applied.");
  });

  it("Test B, C, D, E, F: should render full trace with Noul, Choice distribution, confidence, and actions", () => {
    vi.mocked(HomeContextModule.useHome).mockReturnValue({
      homeState: { currentScenario: null, currentIntentText: "" } as any,
      jevExecutionState: "COMPLETED",
      jevError: null,
      latestDecisionResult: { decisionTimeMs: 342 },
      latestDecisionTrace: mockBaseTrace,
      latestAppliedActions: mockAppliedActions,
      latestSkippedActions: mockSkippedActions,
      runJevAutomation: vi.fn(),
      clearJevTrace: vi.fn(),
    } as any);

    const html = renderToStaticMarkup(React.createElement(JevDecisionTracePanel));

    // Status & Model metadata
    expect(html).toContain("COMPLETED");
    expect(html).toContain("jev-latest");
    expect(html).toContain("In: 180");
    expect(html).toContain("Out: 28");
    expect(html).toContain("95%"); // Avg confidence
    expect(html).toContain("342 ms");

    // Test B: Noul decision rendering with percentage
    expect(html).toContain("lock_main_door");
    expect(html).toContain("YES (97%)");
    expect(html).toContain("YES: 97%");
    expect(html).toContain("NO: 3%");

    // Test C: Choice distribution rendering
    expect(html).toContain("fan_bedroom");
    expect(html).toContain("low (90%)");
    expect(html).toContain("low:");
    expect(html).toContain("90%");
    expect(html).toContain("off:");
    expect(html).toContain("5%");

    // Test D: Individual confidence display
    expect(html).toContain("97%");
    expect(html).toContain("90%");

    // Test E: Generated actions rendered
    expect(html).toContain("Generated Actions Applied (1)");
    expect(html).toContain("LOCK");

    // Test F: Skipped redundant actions rendered
    expect(html).toContain("Skipped Redundant Actions (1)");
    expect(html).toContain("tv_living_room: already OFF (no action needed)");
  });

  it("Test I: should verify no fake probabilities or mock answers are displayed when trace is empty", () => {
    vi.mocked(HomeContextModule.useHome).mockReturnValue({
      homeState: { currentScenario: null, currentIntentText: "" } as any,
      jevExecutionState: "IDLE",
      jevError: null,
      latestDecisionResult: null,
      latestDecisionTrace: null,
      latestAppliedActions: [],
      latestSkippedActions: [],
      runJevAutomation: vi.fn(),
      clearJevTrace: vi.fn(),
    } as any);

    const html = renderToStaticMarkup(React.createElement(JevDecisionTracePanel));

    // Confirm no fake values
    expect(html).not.toContain("0.9");
    expect(html).not.toContain("97%");
    expect(html).not.toContain("lock_main_door");
    expect(html).not.toContain("fan_bedroom");
    expect(html).not.toContain("Action Generated");
  });
});
