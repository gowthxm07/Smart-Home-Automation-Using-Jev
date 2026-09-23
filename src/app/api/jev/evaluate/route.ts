import { NextRequest, NextResponse } from "next/server";
import { JevDecisionEngine } from "@/lib/jev/JevDecisionEngine";
import { HomeState } from "@/types/home";

// Re-use an engine instance on the server
const engine = new JevDecisionEngine();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { intent, homeState } = body as { intent: string; homeState: HomeState };

    if (!intent || typeof intent !== "string") {
      return NextResponse.json(
        { success: false, error: "Missing or invalid 'intent' in request body." },
        { status: 400 }
      );
    }

    if (!homeState || !homeState.devices) {
      return NextResponse.json(
        { success: false, error: "Missing or invalid 'homeState' in request body." },
        { status: 400 }
      );
    }

    const decisionResult = await engine.evaluate(intent, homeState);

    return NextResponse.json({
      success: true,
      decisionResult,
    });
  } catch (err: unknown) {
    const message = (err as Error)?.message || "Unknown error occurred during Jev evaluation.";
    console.error("[API /api/jev/evaluate Error]:", message);

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
}
