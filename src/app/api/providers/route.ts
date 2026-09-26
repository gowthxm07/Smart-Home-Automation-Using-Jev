import { NextRequest, NextResponse } from "next/server";
import { createDefaultProviderRegistry } from "@/lib/providers";
import { HomeState } from "@/types/home";

// Reusable server-side registry instance
const registry = createDefaultProviderRegistry();

/**
 * GET /api/providers
 * Returns live verified availability and status for all registered AI decision engines.
 */
export async function GET() {
  try {
    const statuses = await registry.getStatuses({
      JEV: true,
      LAYA: true,
      LLM: true,
    });

    return NextResponse.json({
      success: true,
      providers: statuses,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: (err as Error)?.message || "Failed to inspect provider statuses.",
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/providers/evaluate
 * Evaluates user intent across all enabled and available providers using independent state clones.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { intent, homeState, enabledProviders } = body as {
      intent: string;
      homeState: HomeState;
      enabledProviders?: Record<string, boolean>;
    };

    if (!intent || typeof intent !== "string") {
      return NextResponse.json(
        { success: false, error: "Missing or invalid 'intent' string." },
        { status: 400 }
      );
    }

    if (!homeState || !homeState.devices) {
      return NextResponse.json(
        { success: false, error: "Missing or invalid 'homeState' object." },
        { status: 400 }
      );
    }

    const enablement = enabledProviders || {
      JEV: true,
      LAYA: true,
      LLM: true,
    };

    const executable = await registry.getExecutable(enablement);
    const results: Record<string, unknown> = {};

    for (const provider of executable) {
      // Independent deep clone of HomeState for every provider
      const stateClone: HomeState = JSON.parse(JSON.stringify(homeState));
      try {
        const decisionResult = await provider.engine.evaluate(intent, stateClone);
        results[provider.providerId] = {
          success: true,
          decisionResult,
        };
      } catch (err: unknown) {
        results[provider.providerId] = {
          success: false,
          error: (err as Error)?.message || "Decision evaluation failed",
        };
      }
    }

    return NextResponse.json({
      success: true,
      executedProviders: executable.map((p) => p.providerId),
      results,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: (err as Error)?.message || "Provider evaluation error",
      },
      { status: 500 }
    );
  }
}
