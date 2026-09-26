/**
 * Server-Side In-Memory Runtime Credential Store for TypeSafe Jev.
 *
 * SECURITY & ARCHITECTURAL GUARDRAILS:
 * - Credentials are stored strictly in server process memory (RAM).
 * - Never persisted to local disk, browser localStorage, SQLite, or databases.
 * - Server restart immediately clears any runtime credential.
 * - Getter returns key only to authenticated internal server callers.
 * - API responses MUST NEVER serialize, reflect, or expose the key string.
 */

let runtimeTypeSafeApiKey: string | null = null;

export class InvalidCredentialError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidCredentialError";
  }
}

/**
 * Validates and sets the server-side runtime API key for TypeSafe Jev.
 */
export function setRuntimeTypeSafeApiKey(key: string): void {
  if (!key || typeof key !== "string") {
    throw new InvalidCredentialError("TypeSafe API key must be a non-empty string.");
  }

  const trimmed = key.trim();
  if (trimmed.length < 8) {
    throw new InvalidCredentialError("TypeSafe API key must be at least 8 characters long.");
  }

  if (/[\r\n\t\0]/.test(trimmed)) {
    throw new InvalidCredentialError("TypeSafe API key contains invalid whitespace or control characters.");
  }

  runtimeTypeSafeApiKey = trimmed;
}

/**
 * Returns the currently set runtime API key from memory, or null if none is set.
 */
export function getRuntimeTypeSafeApiKey(): string | null {
  return runtimeTypeSafeApiKey;
}

/**
 * Clears the runtime API key from memory.
 */
export function clearRuntimeTypeSafeApiKey(): void {
  runtimeTypeSafeApiKey = null;
}

/**
 * Returns true if a valid runtime API key is currently in server memory.
 */
export function hasRuntimeTypeSafeApiKey(): boolean {
  return Boolean(runtimeTypeSafeApiKey && runtimeTypeSafeApiKey.length > 0);
}

/**
 * Resolves the active TypeSafe API key in order of precedence:
 * 1. Server memory runtime credential
 * 2. Server environment variable (TYPESAFE_API_KEY)
 */
export function getEffectiveTypeSafeApiKey(): string | null {
  if (runtimeTypeSafeApiKey && runtimeTypeSafeApiKey.length > 0) {
    return runtimeTypeSafeApiKey;
  }
  if (typeof process !== "undefined" && process.env.TYPESAFE_API_KEY) {
    const envKey = process.env.TYPESAFE_API_KEY.trim();
    if (envKey.length > 0) {
      return envKey;
    }
  }
  return null;
}

/**
 * Returns the source of the active credential without exposing the credential itself.
 */
export function getTypeSafeApiKeySource(): "RUNTIME" | "ENV" | "NONE" {
  if (runtimeTypeSafeApiKey && runtimeTypeSafeApiKey.length > 0) {
    return "RUNTIME";
  }
  if (typeof process !== "undefined" && process.env.TYPESAFE_API_KEY?.trim()) {
    return "ENV";
  }
  return "NONE";
}
