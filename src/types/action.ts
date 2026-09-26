/**
 * Action and Audit Log Models.
 * Provider-independent: Designed to support actions emitted by
 * MANUAL user overrides, JEV (Phase 2), LLM baseline (Phase 3), or SYSTEM events.
 */

export type ActionSource = "MANUAL" | "JEV" | "LLM" | "LAYA" | "SYSTEM";

export type ActionType =
  | "TURN_ON"
  | "TURN_OFF"
  | "SET_BRIGHTNESS"
  | "SET_DIMMED"
  | "SET_FAN_SPEED"
  | "SET_TEMPERATURE"
  | "SET_AC_MODE"
  | "LOCK"
  | "UNLOCK"
  | "ARM"
  | "DISARM"
  | "OPEN_CURTAIN"
  | "CLOSE_CURTAIN"
  | "SET_CURTAIN_POSITION";

export interface Action {
  id: string;
  deviceId: string;
  actionType: ActionType;
  value?: unknown;
  source: ActionSource;
  timestamp: string; // ISO string
}

export interface ActionLogEntry {
  id: string;
  timestamp: string; // Formatted simulated time or ISO
  deviceId: string;
  deviceName: string;
  roomId: string;
  actionType: ActionType;
  previousState: unknown;
  newState: unknown;
  source: ActionSource;
  summary: string;
}
