import crypto from "crypto";
import { HomeState } from "@/types/home";

/**
 * Recursively canonicalizes an object or array by sorting all object keys alphabetically.
 * Ensures bit-for-bit identical serialization regardless of property insertion order.
 */
export function canonicalize(value: unknown): unknown {
  if (value === null || typeof value !== "object") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }

  const obj = value as Record<string, unknown>;
  const sortedKeys = Object.keys(obj).sort();
  const result: Record<string, unknown> = {};

  for (const key of sortedKeys) {
    result[key] = canonicalize(obj[key]);
  }

  return result;
}

/**
 * Deterministically serializes any JavaScript value to a canonical JSON string.
 */
export function canonicalStringify(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

/**
 * Computes a deterministic SHA-256 cryptographic fingerprint of a HomeState snapshot.
 *
 * Requirements satisfied:
 * - Same initial HomeState -> same fingerprint
 * - Changed state -> different fingerprint
 * - Stable key ordering (canonical sorting)
 * - Independent of transient timestamps, random values, or environment variables
 * - Never used as a secret/credential; strictly for experimental reproducibility
 */
export function computeStateFingerprint(state: HomeState): string {
  if (!state || typeof state !== "object") {
    throw new Error("Cannot compute fingerprint of invalid HomeState.");
  }

  // Extract core physical state defining the smart-home condition
  const canonicalState = {
    simulationTime: state.simulationTime,
    automationMode: state.automationMode,
    rooms: state.rooms,
    devices: state.devices,
  };

  const serialized = canonicalStringify(canonicalState);
  return crypto.createHash("sha256").update(serialized).digest("hex");
}
