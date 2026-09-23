import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/jev/evaluate/route";
import { NextRequest } from "next/server";
import { JevDecisionEngine } from "@/lib/jev/JevDecisionEngine";

describe("API Route: /api/jev/evaluate (Milestone 2.3)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 400 if intent is missing or not a string", async () => {
    const req = new NextRequest("http://localhost:3000/api/jev/evaluate", {
      method: "POST",
      body: JSON.stringify({ homeState: { devices: {} } }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.error).toContain("Missing or invalid 'intent'");
  });

  it("should return 400 if homeState or homeState.devices is missing", async () => {
    const req = new NextRequest("http://localhost:3000/api/jev/evaluate", {
      method: "POST",
      body: JSON.stringify({ intent: "I'm going to sleep." }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.error).toContain("Missing or invalid 'homeState'");
  });

  it("should return 200 with decisionResult when evaluation succeeds", async () => {
    const mockDecisionResult = {
      decisionId: "dec_123",
      source: "JEV",
      actions: [
        {
          id: "act_1",
          deviceId: "lock_main_door",
          actionType: "LOCK",
          source: "JEV",
          timestamp: "2026-09-23T23:00:00.000Z",
        },
      ],
      reasoning: "Bedtime protocol active",
      metadata: {
        decisionTrace: {
          scenarioId: "GOING_TO_SLEEP",
          overallConfidence: 0.96,
        },
      },
    };

    vi.spyOn(JevDecisionEngine.prototype, "evaluate").mockResolvedValue(mockDecisionResult as any);

    const req = new NextRequest("http://localhost:3000/api/jev/evaluate", {
      method: "POST",
      body: JSON.stringify({
        intent: "I'm going to sleep.",
        homeState: { devices: { lock_main_door: {} } },
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.decisionResult.source).toBe("JEV");
    expect(data.decisionResult.actions).toHaveLength(1);
  });

  it("should return 500 when Jev evaluation throws without leaking internal credentials", async () => {
    vi.spyOn(JevDecisionEngine.prototype, "evaluate").mockRejectedValue(
      new Error("TypeSafe API Service Unavailable")
    );

    const req = new NextRequest("http://localhost:3000/api/jev/evaluate", {
      method: "POST",
      body: JSON.stringify({
        intent: "I'm going to sleep.",
        homeState: { devices: { lock_main_door: {} } },
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(500);

    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.error).toBe("TypeSafe API Service Unavailable");
    // Ensure no secret or key in error payload
    expect(JSON.stringify(data)).not.toContain("TYPESAFE_API_KEY");
  });
});
