import { ValidationError } from "./types";

/**
 * Strips any potential API key from error strings to prevent credential leakage in logs.
 */
export function sanitizeSecret(message: string, apiKey?: string): string {
  if (!apiKey || apiKey.length < 4) return message;
  const escaped = apiKey.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return message.replace(new RegExp(escaped, "g"), "[REDACTED_API_KEY]");
}

/**
 * Base error class for all TypeSafe Jev operations.
 */
export class TypeSafeError extends Error {
  constructor(message: string, apiKey?: string) {
    super(sanitizeSecret(message, apiKey));
    this.name = "TypeSafeError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when client configuration is missing or invalid (e.g. no API key provided).
 */
export class TypeSafeConfigurationError extends TypeSafeError {
  constructor(message: string) {
    super(message);
    this.name = "TypeSafeConfigurationError";
  }
}

/**
 * Thrown when authentication fails (HTTP 401 or 403).
 */
export class TypeSafeAuthError extends TypeSafeError {
  readonly statusCode: number;

  constructor(message: string, statusCode = 401, apiKey?: string) {
    super(message, apiKey);
    this.name = "TypeSafeAuthError";
    this.statusCode = statusCode;
  }
}

/**
 * Thrown when request payload fails schema validation (HTTP 422).
 */
export class TypeSafeValidationError extends TypeSafeError {
  readonly errors: ValidationError[];

  constructor(message: string, errors: ValidationError[] = [], apiKey?: string) {
    super(message, apiKey);
    this.name = "TypeSafeValidationError";
    this.errors = errors;
  }
}

/**
 * Thrown when the API returns an unexpected non-2xx status code.
 */
export class TypeSafeApiError extends TypeSafeError {
  readonly statusCode: number;
  readonly responseBody?: unknown;

  constructor(message: string, statusCode: number, responseBody?: unknown, apiKey?: string) {
    super(message, apiKey);
    this.name = "TypeSafeApiError";
    this.statusCode = statusCode;
    this.responseBody = responseBody;
  }
}

/**
 * Thrown when network connectivity fails, connection drops, or request times out.
 */
export class TypeSafeNetworkError extends TypeSafeError {
  readonly cause?: unknown;

  constructor(message: string, cause?: unknown, apiKey?: string) {
    super(message, apiKey);
    this.name = "TypeSafeNetworkError";
    this.cause = cause;
  }
}
