import { Device, RoomInfo } from "./device";
import { Action, ActionLogEntry } from "./action";
import { ScenarioPreset } from "./scenario";

export type AutomationMode =
  | "MANUAL_SIMULATION"
  | "ASSISTED_AI"
  | "AUTONOMOUS_AI";

export interface HomeState {
  simulationTime: string; // ISO 8601 string
  isSimulatedClock: boolean; // true = simulated clock, false = system time
  simulationSpeed: number; // 1x, 5x, 60x multiplier
  automationMode: AutomationMode;
  rooms: RoomInfo[];
  devices: Record<string, Device>;
  currentScenario: ScenarioPreset | null;
  currentIntentText: string;
  lastAction: Action | null;
  actionHistory: ActionLogEntry[];
}
