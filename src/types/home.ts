import { Device, RoomInfo } from "./device";
import { Action, ActionLogEntry } from "./action";
import { ScenarioPreset } from "./scenario";

export type AutomationMode =
  | "MANUAL_SIMULATION"
  | "ASSISTED_AI"
  | "AUTONOMOUS_AI";

export interface PetClimatePreference {
  preferredTemperature?: number; // Configured comfort setpoint in Celsius (e.g. 23)
  minTemperature?: number;       // Safety lower bound (e.g. 20)
  maxTemperature?: number;       // Safety upper bound (e.g. 26)
}

export interface PetOccupant {
  id: string;
  name?: string;
  species: "DOG" | "CAT" | "BIRD" | "OTHER" | string;
  present: boolean;
  location?: string; // roomId or "WHOLE_HOME"
  climatePreference?: PetClimatePreference;
  notes?: string;
}

export interface HumanOccupant {
  id: string;
  name: string;
  present: boolean;
  location?: string; // roomId or "OUTSIDE"
}

export interface OccupancyContext {
  humans: HumanOccupant[];
  pets: PetOccupant[];
}

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
  occupancy?: OccupancyContext;
}
