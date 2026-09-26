/**
 * Custom error hierarchy for Laya client and decision engine.
 */

export class LayaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LayaError";
  }
}

export class LayaConfigurationError extends LayaError {
  constructor(message: string) {
    super(message);
    this.name = "LayaConfigurationError";
  }
}

export class LayaConnectionError extends LayaError {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "LayaConnectionError";
  }
}

export class LayaTimeoutError extends LayaError {
  constructor(message: string) {
    super(message);
    this.name = "LayaTimeoutError";
  }
}

export class LayaApiError extends LayaError {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly responseBody?: unknown
  ) {
    super(`Laya API Error (HTTP ${statusCode}): ${message}`);
    this.name = "LayaApiError";
  }
}

/**
 * Redacts potential credentials from error messages.
 */
export function sanitizeLayaSecret(text: string): string {
  return text
    .replace(/(bearer\s+)[a-zA-Z0-9_\-\.]+/gi, "$1[REDACTED]")
    .replace(/(api[_-]?key["']?\s*[:=]\s*["']?)[^"'\s]+/gi, "$1[REDACTED]");
}
