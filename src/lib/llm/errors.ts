/**
 * Typed error hierarchy for LLM Decision Engine operations.
 * Differentiates JSON parsing, schema validation, device validation, and action errors.
 */

export class LLMError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LLMError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class LLMConfigurationError extends LLMError {
  constructor(message: string) {
    super(message);
    this.name = "LLMConfigurationError";
  }
}

export class LLMResponseParseError extends LLMError {
  readonly rawText: string;

  constructor(message: string, rawText: string) {
    super(message);
    this.name = "LLMResponseParseError";
    this.rawText = rawText;
  }
}

export class LLMSchemaValidationError extends LLMError {
  readonly parsedResponse: unknown;

  constructor(message: string, parsedResponse: unknown) {
    super(message);
    this.name = "LLMSchemaValidationError";
    this.parsedResponse = parsedResponse;
  }
}

export class LLMInvalidDeviceError extends LLMError {
  readonly deviceId: string;

  constructor(deviceId: string) {
    super(`LLM returned action for unknown virtual device: "${deviceId}". Device does not exist in HomeState.`);
    this.name = "LLMInvalidDeviceError";
    this.deviceId = deviceId;
  }
}

export class LLMActionValidationError extends LLMError {
  readonly deviceId: string;
  readonly actionType: string;
  readonly value?: unknown;

  constructor(deviceId: string, actionType: string, reason: string, value?: unknown) {
    super(`Invalid action for device "${deviceId}" (${actionType}): ${reason}`);
    this.name = "LLMActionValidationError";
    this.deviceId = deviceId;
    this.actionType = actionType;
    this.value = value;
  }
}
