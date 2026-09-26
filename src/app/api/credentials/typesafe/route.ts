import { NextRequest, NextResponse } from "next/server";
import {
  setRuntimeTypeSafeApiKey,
  clearRuntimeTypeSafeApiKey,
  hasRuntimeTypeSafeApiKey,
  getEffectiveTypeSafeApiKey,
  getTypeSafeApiKeySource,
  InvalidCredentialError,
} from "@/lib/typesafe/credentials";

/**
 * GET /api/credentials/typesafe
 * Returns configuration status without exposing credentials.
 */
export async function GET() {
  const source = getTypeSafeApiKeySource();
  const configured = Boolean(getEffectiveTypeSafeApiKey());

  return NextResponse.json({
    configured,
    source,
    provider: "JEV",
    message: configured
      ? `TypeSafe API credentials active (source: ${source}).`
      : "TypeSafe API key is not configured.",
  });
}

/**
 * POST /api/credentials/typesafe
 * Securely sets the in-memory server runtime TypeSafe API key.
 *
 * CRITICAL SECURITY GUARANTEE:
 * The submitted API key is NEVER reflected in the response or logs.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { apiKey } = body as { apiKey?: string };

    if (!apiKey || typeof apiKey !== "string") {
      return NextResponse.json(
        { success: false, error: "Missing or invalid 'apiKey' in request body." },
        { status: 400 }
      );
    }

    setRuntimeTypeSafeApiKey(apiKey);

    return NextResponse.json({
      success: true,
      configured: true,
      source: "RUNTIME",
      provider: "JEV",
      message: "Runtime TypeSafe API key activated in server memory. Cleared automatically upon server restart.",
    });
  } catch (err: unknown) {
    if (err instanceof InvalidCredentialError) {
      return NextResponse.json(
        { success: false, error: err.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: "Failed to set runtime credential." },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/credentials/typesafe
 * Clears the in-memory server runtime TypeSafe API key.
 */
export async function DELETE() {
  clearRuntimeTypeSafeApiKey();
  const remainingSource = getTypeSafeApiKeySource();

  return NextResponse.json({
    success: true,
    configured: Boolean(getEffectiveTypeSafeApiKey()),
    source: remainingSource,
    message: "Runtime TypeSafe API key cleared from server memory.",
  });
}
