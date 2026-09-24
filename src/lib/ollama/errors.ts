/**
 * Typed error hierarchy for Ollama operations.
 * Cleanly separates client configuration, connection, timeout, and API failures.
 */

export class OllamaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OllamaError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class OllamaConfigurationError extends OllamaError {
  constructor(message: string) {
    super(message);
    this.name = "OllamaConfigurationError";
  }
}

export class OllamaConnectionError extends OllamaError {
  readonly cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = "OllamaConnectionError";
    this.cause = cause;
  }
}

export class OllamaTimeoutError extends OllamaError {
  readonly timeoutMs: number;

  constructor(message: string, timeoutMs: number) {
    super(message);
    this.name = "OllamaTimeoutError";
    this.timeoutMs = timeoutMs;
  }
}

export class OllamaApiError extends OllamaError {
  readonly statusCode: number;
  readonly responseBody?: unknown;

  constructor(message: string, statusCode: number, responseBody?: unknown) {
    super(message);
    this.name = "OllamaApiError";
    this.statusCode = statusCode;
    this.responseBody = responseBody;
  }
}
