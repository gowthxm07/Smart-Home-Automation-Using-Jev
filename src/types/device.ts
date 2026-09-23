/**
 * Domain types for Simulated Smart Home Devices.
 * Strictly software-simulated — no physical IoT hardware used.
 */

export type RoomId =
  | "living_room"
  | "bedroom"
  | "kitchen"
  | "entrance"
  | "study";

export interface RoomInfo {
  id: RoomId;
  name: string;
  description: string;
  floor: number;
}

export type DeviceCategory =
  | "LIGHT"
  | "CLIMATE"
  | "SECURITY"
  | "CURTAIN"
  | "ENTERTAINMENT"
  | "POWER";

// Light States
export interface LightState {
  power: "ON" | "OFF";
  brightness: number; // 0 to 100
  mode: "NORMAL" | "DIMMED";
}

// Fan States
export interface FanState {
  power: "ON" | "OFF";
  speed: 0 | 1 | 2 | 3; // 0 = OFF, 1 = Low, 2 = Medium, 3 = High
}

// AC States
export interface ACState {
  power: "ON" | "OFF";
  targetTemperature: number; // 16 to 30 Celsius
  mode: "COOL" | "HEAT" | "ECO" | "FAN";
}

// Thermostat States
export interface ThermostatState {
  ambientTemperature: number; // Simulated room temp (e.g. 24)
  targetTemperature: number;
  mode: "COOL" | "HEAT" | "OFF" | "AUTO";
}

// Entertainment (TV) States
export interface TVState {
  power: "ON" | "OFF";
  volume: number; // 0 to 100
  input: "HDMI 1" | "STREAMING" | "TV";
}

// Security Door Lock
export interface LockState {
  state: "LOCKED" | "UNLOCKED";
}

// Security Alarm System
export interface SecurityState {
  state: "ARMED" | "DISARMED";
  mode: "STAY" | "AWAY";
}

// Window Curtains
export interface CurtainState {
  state: "OPEN" | "CLOSED";
  position: number; // 0 = fully closed, 100 = fully open
}

// Smart Power Plugs / Outlets
export interface SmartPlugState {
  power: "ON" | "OFF";
  currentWatts: number;
}

// Discriminated or unified device state
export type DeviceState =
  | LightState
  | FanState
  | ACState
  | ThermostatState
  | TVState
  | LockState
  | SecurityState
  | CurtainState
  | SmartPlugState;

// Supported capabilities to dynamically validate actions
export interface DeviceCapabilities {
  powerToggle: boolean;
  dimmable?: boolean;
  fanSpeed?: boolean;
  temperatureAdjustment?: {
    min: number;
    max: number;
  };
  thermostatControl?: boolean;
  lockable?: boolean;
  armable?: boolean;
  curtainPosition?: boolean;
  powerMonitoring?: boolean;
}

export interface DeviceMetadata {
  icon?: string;
  manufacturer?: string;
  model?: string;
  wattageRating?: number;
}

export interface Device<TState extends DeviceState = DeviceState> {
  id: string;
  name: string;
  category: DeviceCategory;
  roomId: RoomId;
  state: TState;
  capabilities: DeviceCapabilities;
  metadata?: DeviceMetadata;
}
