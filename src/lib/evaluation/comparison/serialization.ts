import { ComparativeBenchmarkReport, ComparativeScenarioResult } from "./types";

/**
 * Sensitive key patterns that must be stripped/redacted from serialized benchmark artifacts.
 */
const SENSITIVE_KEY_PATTERNS = [
  /api[_-]?key/i,
  /secret/i,
  /authorization/i,
  /token/i,
  /bearer/i,
  /password/i,
];

/**
 * Recursively redacts sensitive keys and values from an arbitrary object before serialization.
 */
export function sanitizeForSerialization(data: unknown): unknown {
  if (data === null || typeof data !== "object") {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(sanitizeForSerialization);
  }

  const obj = data as Record<string, unknown>;
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    const isSensitive = SENSITIVE_KEY_PATTERNS.some((pattern) => pattern.test(key));
    if (isSensitive) {
      sanitized[key] = "[REDACTED_CREDENTIAL]";
    } else {
      sanitized[key] = sanitizeForSerialization(value);
    }
  }

  return sanitized;
}

/**
 * Serializes a ComparativeBenchmarkReport into a sanitized, reproducible JSON string.
 *
 * Guarantees zero credential persistence and deterministic formatting.
 */
export function serializeComparativeReport(
  report: ComparativeBenchmarkReport,
  pretty = true
): string {
  const sanitized = sanitizeForSerialization(report);
  return pretty ? JSON.stringify(sanitized, null, 2) : JSON.stringify(sanitized);
}

/**
 * Serializes a ComparativeScenarioResult into a sanitized, reproducible JSON string.
 */
export function serializeComparativeScenarioResult(
  result: ComparativeScenarioResult,
  pretty = true
): string {
  const sanitized = sanitizeForSerialization(result);
  return pretty ? JSON.stringify(sanitized, null, 2) : JSON.stringify(sanitized);
}
