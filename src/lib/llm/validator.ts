import { Action, ActionType } from "@/types/action";
import { HomeState } from "@/types/home";
import {
  LightState,
  FanState,
  ACState,
  LockState,
  SecurityState,
  CurtainState,
  SmartPlugState,
} from "@/types/device";
import { LLMDecisionItem, LLMStructuredResponse } from "./types";
import {
  LLMResponseParseError,
  LLMSchemaValidationError,
  LLMInvalidDeviceError,
  LLMActionValidationError,
} from "./errors";

const VALID_ACTION_TYPES: readonly ActionType[] = [
  "TURN_ON",
  "TURN_OFF",
  "SET_BRIGHTNESS",
  "SET_DIMMED",
  "SET_FAN_SPEED",
  "SET_TEMPERATURE",
  "SET_AC_MODE",
  "LOCK",
  "UNLOCK",
  "ARM",
  "DISARM",
  "OPEN_CURTAIN",
  "CLOSE_CURTAIN",
  "SET_CURTAIN_POSITION",
];

export interface LLMValidationResult {
  actions: Action[];
  proposedActions: Action[];
  appliedActions: string[];
  skippedRedundantActions: Action[];
  skippedRedundantReasons?: string[];
  reasoning: string;
  rawDecisions: LLMDecisionItem[];
}

/**
 * Extracts and cleans JSON string from LLM output (stripping optional markdown wrappers).
 */
export function extractJsonFromResponse(rawText: string): string {
  const trimmed = rawText.trim();
  // Strip ```json ... ``` or ``` ... ``` code blocks if present
  const markdownMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (markdownMatch && markdownMatch[1]) {
    return markdownMatch[1].trim();
  }
  return trimmed;
}

/**
 * Checks whether an action is redundant given the device's current state.
 */
function isActionRedundant(
  deviceState: unknown,
  actionType: ActionType,
  value?: unknown
): { redundant: boolean; reason?: string } {
  if (!deviceState || typeof deviceState !== "object") {
    return { redundant: false };
  }

  const s = deviceState as Record<string, unknown>;

  switch (actionType) {
    case "LOCK": {
      if (s.state === "LOCKED") {
        return { redundant: true, reason: "already LOCKED" };
      }
      return { redundant: false };
    }

    case "UNLOCK": {
      if (s.state === "UNLOCKED") {
        return { redundant: true, reason: "already UNLOCKED" };
      }
      return { redundant: false };
    }

    case "ARM": {
      const mode = value === "AWAY" ? "AWAY" : "STAY";
      if (s.state === "ARMED" && s.mode === mode) {
        return { redundant: true, reason: `already ARMED (${mode})` };
      }
      return { redundant: false };
    }

    case "DISARM": {
      if (s.state === "DISARMED") {
        return { redundant: true, reason: "already DISARMED" };
      }
      return { redundant: false };
    }

    case "TURN_ON": {
      if (s.power === "ON") {
        return { redundant: true, reason: "already ON" };
      }
      return { redundant: false };
    }

    case "TURN_OFF": {
      if (s.power === "OFF") {
        return { redundant: true, reason: "already OFF" };
      }
      return { redundant: false };
    }

    case "SET_DIMMED": {
      if (s.power === "ON" && s.mode === "DIMMED") {
        return { redundant: true, reason: "already DIMMED" };
      }
      return { redundant: false };
    }

    case "SET_BRIGHTNESS": {
      const bVal = Number(value);
      if (s.power === "ON" && s.brightness === bVal) {
        return { redundant: true, reason: `already at brightness ${bVal}%` };
      }
      return { redundant: false };
    }

    case "SET_FAN_SPEED": {
      const sp = Number(value);
      const isPowerOn = s.power === "ON";
      const currentSpeed = isPowerOn ? Number(s.speed) : 0;
      if (currentSpeed === sp) {
        return { redundant: true, reason: `already at speed ${sp}` };
      }
      return { redundant: false };
    }

    case "SET_TEMPERATURE": {
      const temp = Number(value);
      if (s.targetTemperature === temp) {
        return { redundant: true, reason: `already at ${temp}°C` };
      }
      return { redundant: false };
    }

    case "SET_AC_MODE": {
      const mode = String(value).toUpperCase();
      if (s.mode === mode) {
        return { redundant: true, reason: `already in ${mode} mode` };
      }
      return { redundant: false };
    }

    case "CLOSE_CURTAIN": {
      if (s.state === "CLOSED") {
        return { redundant: true, reason: "already CLOSED" };
      }
      return { redundant: false };
    }

    case "OPEN_CURTAIN": {
      if (s.state === "OPEN") {
        return { redundant: true, reason: "already OPEN" };
      }
      return { redundant: false };
    }

    case "SET_CURTAIN_POSITION": {
      const pos = Number(value);
      if (s.position === pos) {
        return { redundant: true, reason: `already at position ${pos}%` };
      }
      return { redundant: false };
    }

    default:
      return { redundant: false };
  }
}

/**
 * Validates raw LLM response text, validates device existence and capability constraints,
 * and performs state-aware redundancy normalization.
 */
export function validateAndNormalizeLLMResponse(
  rawText: string,
  homeState: HomeState
): LLMValidationResult {
  const jsonText = extractJsonFromResponse(rawText);

  // 1. JSON Parsing
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch (err: unknown) {
    throw new LLMResponseParseError(
      `Failed to parse LLM response as JSON: ${(err as Error)?.message || String(err)}. Raw output: ${rawText.slice(0, 200)}`,
      rawText
    );
  }

  // 2. Schema Validation
  if (!parsed || typeof parsed !== "object") {
    throw new LLMSchemaValidationError("LLM response must be a JSON object.", parsed);
  }

  const structured = parsed as Record<string, unknown>;
  if (!Array.isArray(structured.decisions)) {
    throw new LLMSchemaValidationError(
      "LLM response schema invalid: 'decisions' field must be an array.",
      parsed
    );
  }

  const rawDecisions: LLMDecisionItem[] = [];
  const reasoning = typeof structured.reasoning === "string" ? structured.reasoning.trim() : "";

  for (let i = 0; i < structured.decisions.length; i++) {
    const item = structured.decisions[i];
    if (!item || typeof item !== "object") {
      throw new LLMSchemaValidationError(
        `Decision item at index ${i} is not an object.`,
        item
      );
    }

    const { deviceId, actionType, value } = item as Record<string, unknown>;

    if (typeof deviceId !== "string" || !deviceId.trim()) {
      throw new LLMSchemaValidationError(
        `Decision item at index ${i} has invalid or missing 'deviceId'.`,
        item
      );
    }

    if (typeof actionType !== "string" || !actionType.trim()) {
      throw new LLMSchemaValidationError(
        `Decision item at index ${i} has invalid or missing 'actionType'.`,
        item
      );
    }

    rawDecisions.push({
      deviceId: deviceId.trim(),
      actionType: actionType.trim() as ActionType,
      value: value ?? undefined,
    });
  }

  // 3. Device & Action Validation
  const proposedActions: Action[] = [];
  const actions: Action[] = [];
  const appliedActions: string[] = [];
  const skippedRedundantActions: Action[] = [];
  const skippedRedundantReasons: string[] = [];
  const now = homeState.simulationTime || new Date().toISOString();

  for (const decision of rawDecisions) {
    const { deviceId, actionType, value } = decision;

    // A. Validate device existence
    const device = homeState.devices[deviceId];
    if (!device) {
      throw new LLMInvalidDeviceError(deviceId);
    }

    // B. Validate actionType is recognized
    if (!VALID_ACTION_TYPES.includes(actionType)) {
      throw new LLMActionValidationError(
        deviceId,
        actionType,
        `Unrecognized actionType "${actionType}". Must be one of: ${VALID_ACTION_TYPES.join(", ")}`,
        value
      );
    }

    // C. Validate action capability compatibility
    switch (actionType) {
      case "TURN_ON":
      case "TURN_OFF": {
        if (!device.capabilities.powerToggle) {
          throw new LLMActionValidationError(
            deviceId,
            actionType,
            `Device "${device.name}" does not support power toggle.`
          );
        }
        break;
      }

      case "SET_DIMMED": {
        if (!device.capabilities.dimmable) {
          throw new LLMActionValidationError(
            deviceId,
            actionType,
            `Device "${device.name}" does not support dimming.`
          );
        }
        break;
      }

      case "SET_BRIGHTNESS": {
        if (!device.capabilities.dimmable) {
          throw new LLMActionValidationError(
            deviceId,
            actionType,
            `Device "${device.name}" does not support brightness adjustment.`
          );
        }
        const b = Number(value);
        if (isNaN(b) || b < 0 || b > 100) {
          throw new LLMActionValidationError(
            deviceId,
            actionType,
            `Brightness value must be a number between 0 and 100. Received: ${value}`,
            value
          );
        }
        break;
      }

      case "SET_FAN_SPEED": {
        if (!device.capabilities.fanSpeed) {
          throw new LLMActionValidationError(
            deviceId,
            actionType,
            `Device "${device.name}" does not support fan speed control.`
          );
        }
        const sp = Number(value);
        if (![0, 1, 2, 3].includes(sp)) {
          throw new LLMActionValidationError(
            deviceId,
            actionType,
            `Fan speed must be 0 (OFF), 1, 2, or 3. Received: ${value}`,
            value
          );
        }
        break;
      }

      case "SET_TEMPERATURE": {
        const bounds = device.capabilities.temperatureAdjustment;
        if (!bounds) {
          throw new LLMActionValidationError(
            deviceId,
            actionType,
            `Device "${device.name}" does not support temperature adjustment.`
          );
        }
        const temp = Number(value);
        if (isNaN(temp) || temp < bounds.min || temp > bounds.max) {
          throw new LLMActionValidationError(
            deviceId,
            actionType,
            `Temperature must be between ${bounds.min}°C and ${bounds.max}°C. Received: ${value}`,
            value
          );
        }
        break;
      }

      case "SET_AC_MODE": {
        if (device.category !== "CLIMATE" || !("mode" in device.state)) {
          throw new LLMActionValidationError(
            deviceId,
            actionType,
            `Device "${device.name}" does not support AC mode selection.`
          );
        }
        const validModes = ["COOL", "HEAT", "ECO", "FAN"];
        const mode = String(value).toUpperCase();
        if (!validModes.includes(mode)) {
          throw new LLMActionValidationError(
            deviceId,
            actionType,
            `Invalid AC mode: ${value}. Must be one of: ${validModes.join(", ")}`,
            value
          );
        }
        break;
      }

      case "LOCK":
      case "UNLOCK": {
        if (!device.capabilities.lockable) {
          throw new LLMActionValidationError(
            deviceId,
            actionType,
            `Device "${device.name}" does not support lock/unlock.`
          );
        }
        break;
      }

      case "ARM":
      case "DISARM": {
        if (!device.capabilities.armable) {
          throw new LLMActionValidationError(
            deviceId,
            actionType,
            `Device "${device.name}" does not support arm/disarm.`
          );
        }
        break;
      }

      case "OPEN_CURTAIN":
      case "CLOSE_CURTAIN": {
        if (!device.capabilities.curtainPosition) {
          throw new LLMActionValidationError(
            deviceId,
            actionType,
            `Device "${device.name}" is not a motorized curtain.`
          );
        }
        break;
      }

      case "SET_CURTAIN_POSITION": {
        if (!device.capabilities.curtainPosition) {
          throw new LLMActionValidationError(
            deviceId,
            actionType,
            `Device "${device.name}" does not support position adjustment.`
          );
        }
        const pos = Number(value);
        if (isNaN(pos) || pos < 0 || pos > 100) {
          throw new LLMActionValidationError(
            deviceId,
            actionType,
            `Curtain position must be between 0 and 100. Received: ${value}`,
            value
          );
        }
        break;
      }
    }

    // D. Construct validated proposed action (before redundancy normalization)
    const action: Action = {
      id: `act_llm_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      deviceId,
      actionType,
      value,
      source: "LLM",
      timestamp: now,
    };
    proposedActions.push(action);

    // E. State-aware redundancy normalization
    const redundancyCheck = isActionRedundant(device.state, actionType, value);
    if (redundancyCheck.redundant) {
      skippedRedundantActions.push(action);
      skippedRedundantReasons.push(
        `${deviceId}: ${redundancyCheck.reason || "already in target state"}`
      );
    } else {
      actions.push(action);
      appliedActions.push(`${deviceId}: ${actionType}`);
    }
  }

  return {
    actions,
    proposedActions,
    appliedActions,
    skippedRedundantActions,
    skippedRedundantReasons,
    reasoning,
    rawDecisions,
  };
}
