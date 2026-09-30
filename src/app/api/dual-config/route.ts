import { NextRequest, NextResponse } from "next/server";
import { runDualConfiguration } from "@/lib/evaluation/comparison/dualConfigRunner";
import { HomeState } from "@/types/home";

/**
 * POST /api/dual-config
 * Evaluates an intent or scenario across both configurations (Multi-Engine & LLM-Only)
 * with three independent state clones (Clone A, Clone B, Clone C).
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prompt, homeState, scenarioId, selectedMultiEngineDriver } = body as {
      prompt: string;
      homeState: HomeState;
      scenarioId?: string;
      selectedMultiEngineDriver?: "LAYA" | "LLM";
    };

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json(
        { success: false, error: "Missing or invalid 'prompt' string." },
        { status: 400 }
      );
    }

    if (!homeState || !homeState.devices) {
      return NextResponse.json(
        { success: false, error: "Missing or invalid 'homeState' object." },
        { status: 400 }
      );
    }

    const result = await runDualConfiguration(prompt, homeState, {
      scenarioId,
      selectedMultiEngineDriver: selectedMultiEngineDriver || "LAYA",
    });

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: (err as Error)?.message || "Dual-configuration evaluation error",
      },
      { status: 500 }
    );
  }
}
