import { EvaluationScenario } from "../types";
import { HomeState } from "@/types/home";
import { Device } from "@/types/device";
import { INITIAL_DEVICES } from "@/lib/devices.config";
import { INITIAL_ROOMS } from "@/lib/rooms.config";

export type ScenarioCategory =
  | "NORMAL"
  | "PARTIAL_STATE"
  | "NO_OP"
  | "MULTI_DEVICE"
  | "CONTEXT_SENSITIVE"
  | "SECURITY"
  | "AMBIGUOUS";

/**
 * Helper to build an independent initial HomeState snapshot.
 * Deep-clones INITIAL_DEVICES to guarantee isolation between scenarios.
 */
function buildInitialState(customizer?: (devices: Record<string, Device>) => void): HomeState {
  const devices: Record<string, Device> = JSON.parse(JSON.stringify(INITIAL_DEVICES));
  if (customizer) {
    customizer(devices);
  }
  return {
    simulationTime: "2026-09-23T22:00:00.000Z",
    isSimulatedClock: true,
    simulationSpeed: 1,
    automationMode: "MANUAL_SIMULATION",
    rooms: INITIAL_ROOMS,
    devices,
    currentScenario: null,
    currentIntentText: "",
    lastAction: null,
    actionHistory: [],
  };
}

export const evaluationScenarios: readonly EvaluationScenario[] = [
  // =========================================================================
  // CATEGORY A: NORMAL INTENT SCENARIOS (6 scenarios)
  // =========================================================================
  {
    id: "normal-sleep-01",
    name: "Normal Bedtime Routine",
    description: "Standard bedtime automation. Shuts down active living room loads, secures exterior door, closes bedroom curtains, and arms security.",
    intent: "I'm going to sleep.",
    tags: ["normal", "sleep", "bedroom", "security"],
    metadata: { category: "NORMAL" },
    initialState: buildInitialState((d) => {
      (d["lock_main_door"].state as any).state = "UNLOCKED";
      (d["light_living_room"].state as any).power = "ON";
      (d["tv_living_room"].state as any).power = "ON";
      (d["curtain_bedroom"].state as any).state = "OPEN";
      (d["security_system"].state as any).state = "DISARMED";
      (d["fan_bedroom"].state as any).power = "OFF";
      (d["fan_bedroom"].state as any).speed = 0;
    }),
    expectedOutcome: {
      description: "Door locked, security armed, living room lights and TV off, bedroom curtains closed, fan gentle.",
      expectedDeviceStates: {
        lock_main_door: { deviceId: "lock_main_door", targetState: { state: "LOCKED" } },
        security_system: { deviceId: "security_system", targetState: { state: "ARMED" } },
        light_living_room: { deviceId: "light_living_room", targetState: { power: "OFF" } },
        tv_living_room: { deviceId: "tv_living_room", targetState: { power: "OFF" } },
        curtain_bedroom: { deviceId: "curtain_bedroom", targetState: { state: "CLOSED" } },
        fan_bedroom: { deviceId: "fan_bedroom", targetState: { power: "ON", speed: 1 } },
      },
      expectedActions: [
        { deviceId: "lock_main_door", actionType: "LOCK", requirement: "REQUIRED" },
        { deviceId: "security_system", actionType: "ARM", requirement: "REQUIRED" },
        { deviceId: "light_living_room", actionType: "TURN_OFF", requirement: "REQUIRED" },
        { deviceId: "tv_living_room", actionType: "TURN_OFF", requirement: "REQUIRED" },
        { deviceId: "curtain_bedroom", actionType: "CLOSE_CURTAIN", requirement: "REQUIRED" },
        { deviceId: "fan_bedroom", actionType: "SET_FAN_SPEED", expectedValue: 1, requirement: "OPTIONAL" },
        { deviceId: "lock_main_door", actionType: "UNLOCK", requirement: "FORBIDDEN" },
      ],
      acceptableAlternatives: [
        {
          id: "alt-fan-off",
          description: "Leaving bedroom fan off is an acceptable comfort variant",
          alternativeDeviceStates: { fan_bedroom: { power: "OFF", speed: 0 } },
        },
      ],
    },
  },

  {
    id: "normal-leave-01",
    name: "Normal Departure Routine",
    description: "Standard morning departure. Locks main entrance, arms security system away, and powers off all active lighting and appliances.",
    intent: "I'm leaving home.",
    tags: ["normal", "leave", "perimeter", "power"],
    metadata: { category: "NORMAL" },
    initialState: buildInitialState((d) => {
      (d["lock_main_door"].state as any).state = "UNLOCKED";
      (d["security_system"].state as any).state = "DISARMED";
      (d["light_entrance"].state as any).power = "ON";
      (d["light_living_room"].state as any).power = "ON";
      (d["light_study"].state as any).power = "ON";
      (d["tv_living_room"].state as any).power = "ON";
      (d["plug_kitchen_general"].state as any).power = "ON";
    }),
    expectedOutcome: {
      description: "House locked, security armed away, interior lights and appliances powered down.",
      expectedDeviceStates: {
        lock_main_door: { deviceId: "lock_main_door", targetState: { state: "LOCKED" } },
        security_system: { deviceId: "security_system", targetState: { state: "ARMED" } },
        light_entrance: { deviceId: "light_entrance", targetState: { power: "OFF" } },
        light_living_room: { deviceId: "light_living_room", targetState: { power: "OFF" } },
        light_study: { deviceId: "light_study", targetState: { power: "OFF" } },
        tv_living_room: { deviceId: "tv_living_room", targetState: { power: "OFF" } },
        plug_kitchen_general: { deviceId: "plug_kitchen_general", targetState: { power: "OFF" } },
      },
      expectedActions: [
        { deviceId: "lock_main_door", actionType: "LOCK", requirement: "REQUIRED" },
        { deviceId: "security_system", actionType: "ARM", requirement: "REQUIRED" },
        { deviceId: "light_entrance", actionType: "TURN_OFF", requirement: "REQUIRED" },
        { deviceId: "light_living_room", actionType: "TURN_OFF", requirement: "REQUIRED" },
        { deviceId: "light_study", actionType: "TURN_OFF", requirement: "REQUIRED" },
        { deviceId: "tv_living_room", actionType: "TURN_OFF", requirement: "REQUIRED" },
        { deviceId: "plug_kitchen_general", actionType: "TURN_OFF", requirement: "REQUIRED" },
        { deviceId: "lock_main_door", actionType: "UNLOCK", requirement: "FORBIDDEN" },
        { deviceId: "security_system", actionType: "DISARM", requirement: "FORBIDDEN" },
      ],
    },
  },

  {
    id: "normal-movie-01",
    name: "Normal Movie Evening",
    description: "Standard entertainment mode. Powers on TV and media outlet, closes living room curtains, and dims main lighting.",
    intent: "Movie night.",
    tags: ["normal", "movie", "entertainment", "living_room"],
    metadata: { category: "NORMAL" },
    initialState: buildInitialState((d) => {
      (d["tv_living_room"].state as any).power = "OFF";
      (d["plug_tv_outlet"].state as any).power = "OFF";
      (d["light_living_room"].state as any).power = "ON";
      (d["light_living_room"].state as any).brightness = 100;
      (d["curtain_living_room"].state as any).state = "OPEN";
    }),
    expectedOutcome: {
      description: "TV and outlet on, curtains closed, living room light dimmed.",
      expectedDeviceStates: {
        tv_living_room: { deviceId: "tv_living_room", targetState: { power: "ON" } },
        plug_tv_outlet: { deviceId: "plug_tv_outlet", targetState: { power: "ON" } },
        curtain_living_room: { deviceId: "curtain_living_room", targetState: { state: "CLOSED" } },
        light_living_room: { deviceId: "light_living_room", targetState: { power: "ON", mode: "DIMMED" } },
      },
      expectedActions: [
        { deviceId: "tv_living_room", actionType: "TURN_ON", requirement: "REQUIRED" },
        { deviceId: "plug_tv_outlet", actionType: "TURN_ON", requirement: "REQUIRED" },
        { deviceId: "curtain_living_room", actionType: "CLOSE_CURTAIN", requirement: "REQUIRED" },
        { deviceId: "light_living_room", actionType: "SET_DIMMED", requirement: "REQUIRED" },
        { deviceId: "tv_living_room", actionType: "TURN_OFF", requirement: "FORBIDDEN" },
      ],
    },
  },

  {
    id: "normal-work-01",
    name: "Normal Study and Work Preparation",
    description: "Productivity context. Turns on study illumination, activates workstation laptop charging outlet, and powers down living room TV.",
    intent: "I'm going to work.",
    tags: ["normal", "work", "study", "productivity"],
    metadata: { category: "NORMAL" },
    initialState: buildInitialState((d) => {
      (d["light_study"].state as any).power = "OFF";
      (d["plug_laptop_charger"].state as any).power = "OFF";
      (d["tv_living_room"].state as any).power = "ON";
    }),
    expectedOutcome: {
      description: "Study light on, laptop charger on, distraction TV off.",
      expectedDeviceStates: {
        light_study: { deviceId: "light_study", targetState: { power: "ON" } },
        plug_laptop_charger: { deviceId: "plug_laptop_charger", targetState: { power: "ON" } },
        tv_living_room: { deviceId: "tv_living_room", targetState: { power: "OFF" } },
      },
      expectedActions: [
        { deviceId: "light_study", actionType: "TURN_ON", requirement: "REQUIRED" },
        { deviceId: "plug_laptop_charger", actionType: "TURN_ON", requirement: "REQUIRED" },
        { deviceId: "tv_living_room", actionType: "TURN_OFF", requirement: "OPTIONAL" },
        { deviceId: "light_study", actionType: "TURN_OFF", requirement: "FORBIDDEN" },
      ],
    },
  },

  {
    id: "normal-arrive-01",
    name: "Normal Returning Home Arrival",
    description: "Arrival context. Unlocks main entry, disarms security alarm, and turns on entrance foyer lighting.",
    intent: "I'm coming home.",
    tags: ["normal", "arrive", "entrance", "security"],
    metadata: { category: "NORMAL" },
    initialState: buildInitialState((d) => {
      (d["lock_main_door"].state as any).state = "LOCKED";
      (d["security_system"].state as any).state = "ARMED";
      (d["light_entrance"].state as any).power = "OFF";
    }),
    expectedOutcome: {
      description: "Front door unlocked, security system disarmed, entrance light illuminated.",
      expectedDeviceStates: {
        lock_main_door: { deviceId: "lock_main_door", targetState: { state: "UNLOCKED" } },
        security_system: { deviceId: "security_system", targetState: { state: "DISARMED" } },
        light_entrance: { deviceId: "light_entrance", targetState: { power: "ON" } },
      },
      expectedActions: [
        { deviceId: "lock_main_door", actionType: "UNLOCK", requirement: "REQUIRED" },
        { deviceId: "security_system", actionType: "DISARM", requirement: "REQUIRED" },
        { deviceId: "light_entrance", actionType: "TURN_ON", requirement: "REQUIRED" },
        { deviceId: "lock_main_door", actionType: "LOCK", requirement: "FORBIDDEN" },
      ],
    },
  },

  {
    id: "normal-wake-01",
    name: "Normal Morning Awakening",
    description: "Morning wake-up routine. Opens bedroom blackout curtains to daylight, turns off night lamp, and activates kitchen plug.",
    intent: "I'm waking up.",
    tags: ["normal", "wake", "morning", "bedroom"],
    metadata: { category: "NORMAL" },
    initialState: buildInitialState((d) => {
      (d["curtain_bedroom"].state as any).state = "CLOSED";
      (d["light_night_lamp"].state as any).power = "ON";
      (d["plug_kitchen_general"].state as any).power = "OFF";
      (d["fan_bedroom"].state as any).power = "ON";
      (d["fan_bedroom"].state as any).speed = 1;
    }),
    expectedOutcome: {
      description: "Bedroom curtains opened, night lamp off, kitchen plug on, bedroom fan off.",
      expectedDeviceStates: {
        curtain_bedroom: { deviceId: "curtain_bedroom", targetState: { state: "OPEN" } },
        light_night_lamp: { deviceId: "light_night_lamp", targetState: { power: "OFF" } },
        plug_kitchen_general: { deviceId: "plug_kitchen_general", targetState: { power: "ON" } },
        fan_bedroom: { deviceId: "fan_bedroom", targetState: { power: "OFF" } },
      },
      expectedActions: [
        { deviceId: "curtain_bedroom", actionType: "OPEN_CURTAIN", requirement: "REQUIRED" },
        { deviceId: "light_night_lamp", actionType: "TURN_OFF", requirement: "REQUIRED" },
        { deviceId: "plug_kitchen_general", actionType: "TURN_ON", requirement: "REQUIRED" },
        { deviceId: "fan_bedroom", actionType: "SET_FAN_SPEED", expectedValue: 0, requirement: "OPTIONAL" },
      ],
    },
  },

  // =========================================================================
  // CATEGORY B: PARTIAL-STATE SCENARIOS (6 scenarios)
  // =========================================================================
  {
    id: "partial-sleep-01",
    name: "Bedtime with Entrance and Living Room Already Secured",
    description: "Bedtime intent when door is already locked and living room light is already off. Engine must only turn off TV and close curtains.",
    intent: "I'm going to sleep.",
    tags: ["partial", "sleep", "redundancy"],
    metadata: { category: "PARTIAL_STATE" },
    initialState: buildInitialState((d) => {
      (d["lock_main_door"].state as any).state = "LOCKED";
      (d["security_system"].state as any).state = "ARMED";
      (d["light_living_room"].state as any).power = "OFF";
      (d["tv_living_room"].state as any).power = "ON";
      (d["curtain_bedroom"].state as any).state = "OPEN";
    }),
    expectedOutcome: {
      description: "Maintain locked door and off light; only generate TV power off and curtain close.",
      expectedDeviceStates: {
        lock_main_door: { deviceId: "lock_main_door", targetState: { state: "LOCKED" } },
        security_system: { deviceId: "security_system", targetState: { state: "ARMED" } },
        light_living_room: { deviceId: "light_living_room", targetState: { power: "OFF" } },
        tv_living_room: { deviceId: "tv_living_room", targetState: { power: "OFF" } },
        curtain_bedroom: { deviceId: "curtain_bedroom", targetState: { state: "CLOSED" } },
      },
      expectedActions: [
        { deviceId: "tv_living_room", actionType: "TURN_OFF", requirement: "REQUIRED" },
        { deviceId: "curtain_bedroom", actionType: "CLOSE_CURTAIN", requirement: "REQUIRED" },
        { deviceId: "lock_main_door", actionType: "LOCK", requirement: "OPTIONAL" },
        { deviceId: "lock_main_door", actionType: "UNLOCK", requirement: "FORBIDDEN" },
        { deviceId: "security_system", actionType: "DISARM", requirement: "FORBIDDEN" },
      ],
    },
  },

  {
    id: "partial-leave-01",
    name: "Departure with Security System Pre-Armed",
    description: "Leaving home when security alarm is already armed and entrance locked. Only interior lights need turning off.",
    intent: "I'm leaving home.",
    tags: ["partial", "leave", "security"],
    metadata: { category: "PARTIAL_STATE" },
    initialState: buildInitialState((d) => {
      (d["security_system"].state as any).state = "ARMED";
      (d["lock_main_door"].state as any).state = "LOCKED";
      (d["light_study"].state as any).power = "ON";
      (d["light_kitchen"].state as any).power = "ON";
    }),
    expectedOutcome: {
      description: "Study and kitchen lights powered off without disturbing armed perimeter.",
      expectedDeviceStates: {
        security_system: { deviceId: "security_system", targetState: { state: "ARMED" } },
        lock_main_door: { deviceId: "lock_main_door", targetState: { state: "LOCKED" } },
        light_study: { deviceId: "light_study", targetState: { power: "OFF" } },
        light_kitchen: { deviceId: "light_kitchen", targetState: { power: "OFF" } },
      },
      expectedActions: [
        { deviceId: "light_study", actionType: "TURN_OFF", requirement: "REQUIRED" },
        { deviceId: "light_kitchen", actionType: "TURN_OFF", requirement: "REQUIRED" },
        { deviceId: "security_system", actionType: "DISARM", requirement: "FORBIDDEN" },
        { deviceId: "lock_main_door", actionType: "UNLOCK", requirement: "FORBIDDEN" },
      ],
    },
  },

  {
    id: "partial-movie-01",
    name: "Movie Night with Curtains Already Drawn",
    description: "Movie night intent when living room curtains are already closed. Engine must turn on TV and dim lights without re-closing curtains.",
    intent: "Movie night.",
    tags: ["partial", "movie", "living_room"],
    metadata: { category: "PARTIAL_STATE" },
    initialState: buildInitialState((d) => {
      (d["curtain_living_room"].state as any).state = "CLOSED";
      (d["tv_living_room"].state as any).power = "OFF";
      (d["plug_tv_outlet"].state as any).power = "ON";
      (d["light_living_room"].state as any).power = "ON";
      (d["light_living_room"].state as any).brightness = 100;
    }),
    expectedOutcome: {
      description: "TV turns on, lights dim, curtains stay closed.",
      expectedDeviceStates: {
        curtain_living_room: { deviceId: "curtain_living_room", targetState: { state: "CLOSED" } },
        tv_living_room: { deviceId: "tv_living_room", targetState: { power: "ON" } },
        light_living_room: { deviceId: "light_living_room", targetState: { power: "ON", mode: "DIMMED" } },
      },
      expectedActions: [
        { deviceId: "tv_living_room", actionType: "TURN_ON", requirement: "REQUIRED" },
        { deviceId: "light_living_room", actionType: "SET_DIMMED", requirement: "REQUIRED" },
        { deviceId: "curtain_living_room", actionType: "OPEN_CURTAIN", requirement: "FORBIDDEN" },
      ],
    },
  },

  {
    id: "partial-work-01",
    name: "Work Context with Study Light Already Active",
    description: "Work intent when study illumination is already on. Engine must only ensure laptop charger is active.",
    intent: "I'm going to work.",
    tags: ["partial", "work", "study"],
    metadata: { category: "PARTIAL_STATE" },
    initialState: buildInitialState((d) => {
      (d["light_study"].state as any).power = "ON";
      (d["plug_laptop_charger"].state as any).power = "OFF";
    }),
    expectedOutcome: {
      description: "Laptop charger on, study light remains on.",
      expectedDeviceStates: {
        light_study: { deviceId: "light_study", targetState: { power: "ON" } },
        plug_laptop_charger: { deviceId: "plug_laptop_charger", targetState: { power: "ON" } },
      },
      expectedActions: [
        { deviceId: "plug_laptop_charger", actionType: "TURN_ON", requirement: "REQUIRED" },
        { deviceId: "light_study", actionType: "TURN_OFF", requirement: "FORBIDDEN" },
      ],
    },
  },

  {
    id: "partial-arrive-01",
    name: "Arrival with Entrance Illumination Pre-Activated",
    description: "Coming home when entrance light was pre-scheduled on. Engine unlocks entrance and disarms security without re-triggering light.",
    intent: "I'm coming home.",
    tags: ["partial", "arrive", "entrance"],
    metadata: { category: "PARTIAL_STATE" },
    initialState: buildInitialState((d) => {
      (d["light_entrance"].state as any).power = "ON";
      (d["lock_main_door"].state as any).state = "LOCKED";
      (d["security_system"].state as any).state = "ARMED";
    }),
    expectedOutcome: {
      description: "Door unlocked and security disarmed while preserving foyer lighting.",
      expectedDeviceStates: {
        light_entrance: { deviceId: "light_entrance", targetState: { power: "ON" } },
        lock_main_door: { deviceId: "lock_main_door", targetState: { state: "UNLOCKED" } },
        security_system: { deviceId: "security_system", targetState: { state: "DISARMED" } },
      },
      expectedActions: [
        { deviceId: "lock_main_door", actionType: "UNLOCK", requirement: "REQUIRED" },
        { deviceId: "security_system", actionType: "DISARM", requirement: "REQUIRED" },
        { deviceId: "light_entrance", actionType: "TURN_OFF", requirement: "FORBIDDEN" },
      ],
    },
  },

  {
    id: "partial-wake-01",
    name: "Morning Wake with Bedroom Curtains Already Open",
    description: "Wake-up intent when daylight curtains are already open. Engine must only extinguish night lamp and activate kitchen plug.",
    intent: "I'm waking up.",
    tags: ["partial", "wake", "bedroom"],
    metadata: { category: "PARTIAL_STATE" },
    initialState: buildInitialState((d) => {
      (d["curtain_bedroom"].state as any).state = "OPEN";
      (d["light_night_lamp"].state as any).power = "ON";
      (d["plug_kitchen_general"].state as any).power = "OFF";
    }),
    expectedOutcome: {
      description: "Night lamp off, kitchen plug on, curtains stay open.",
      expectedDeviceStates: {
        curtain_bedroom: { deviceId: "curtain_bedroom", targetState: { state: "OPEN" } },
        light_night_lamp: { deviceId: "light_night_lamp", targetState: { power: "OFF" } },
        plug_kitchen_general: { deviceId: "plug_kitchen_general", targetState: { power: "ON" } },
      },
      expectedActions: [
        { deviceId: "light_night_lamp", actionType: "TURN_OFF", requirement: "REQUIRED" },
        { deviceId: "plug_kitchen_general", actionType: "TURN_ON", requirement: "REQUIRED" },
        { deviceId: "curtain_bedroom", actionType: "CLOSE_CURTAIN", requirement: "FORBIDDEN" },
      ],
    },
  },

  // =========================================================================
  // CATEGORY C: NO-OP SCENARIOS (5 scenarios)
  // =========================================================================
  {
    id: "noop-sleep-01",
    name: "Bedtime in Fully Pre-Configured Sleep State",
    description: "User indicates sleep when the home is already completely dark, locked, and armed. Required action count is exactly zero.",
    intent: "I'm going to sleep.",
    tags: ["noop", "sleep", "redundancy"],
    metadata: { category: "NO_OP" },
    initialState: buildInitialState((d) => {
      (d["lock_main_door"].state as any).state = "LOCKED";
      (d["security_system"].state as any).state = "ARMED";
      (d["light_living_room"].state as any).power = "OFF";
      (d["light_bedroom"].state as any).power = "OFF";
      (d["tv_living_room"].state as any).power = "OFF";
      (d["curtain_bedroom"].state as any).state = "CLOSED";
      (d["fan_bedroom"].state as any).power = "ON";
      (d["fan_bedroom"].state as any).speed = 1;
    }),
    expectedOutcome: {
      description: "All devices already in target sleep state. Zero actions required.",
      expectedDeviceStates: {
        lock_main_door: { deviceId: "lock_main_door", targetState: { state: "LOCKED" } },
        security_system: { deviceId: "security_system", targetState: { state: "ARMED" } },
        light_living_room: { deviceId: "light_living_room", targetState: { power: "OFF" } },
        light_bedroom: { deviceId: "light_bedroom", targetState: { power: "OFF" } },
        tv_living_room: { deviceId: "tv_living_room", targetState: { power: "OFF" } },
        curtain_bedroom: { deviceId: "curtain_bedroom", targetState: { state: "CLOSED" } },
        fan_bedroom: { deviceId: "fan_bedroom", targetState: { power: "ON", speed: 1 } },
      },
      expectedActions: [
        { deviceId: "lock_main_door", actionType: "UNLOCK", requirement: "FORBIDDEN" },
        { deviceId: "security_system", actionType: "DISARM", requirement: "FORBIDDEN" },
        { deviceId: "tv_living_room", actionType: "TURN_ON", requirement: "FORBIDDEN" },
        { deviceId: "light_living_room", actionType: "TURN_ON", requirement: "FORBIDDEN" },
      ],
    },
  },

  {
    id: "noop-leave-01",
    name: "Departure from Already Vacated and Secured Home",
    description: "User indicates departure when all lights are off, appliances dark, and perimeter locked and armed. Zero actions required.",
    intent: "I'm leaving home.",
    tags: ["noop", "leave", "security"],
    metadata: { category: "NO_OP" },
    initialState: buildInitialState((d) => {
      (d["lock_main_door"].state as any).state = "LOCKED";
      (d["security_system"].state as any).state = "ARMED";
      (d["light_living_room"].state as any).power = "OFF";
      (d["light_kitchen"].state as any).power = "OFF";
      (d["light_study"].state as any).power = "OFF";
      (d["tv_living_room"].state as any).power = "OFF";
    }),
    expectedOutcome: {
      description: "House already secured and powered down. Zero actions required.",
      expectedDeviceStates: {
        lock_main_door: { deviceId: "lock_main_door", targetState: { state: "LOCKED" } },
        security_system: { deviceId: "security_system", targetState: { state: "ARMED" } },
        light_living_room: { deviceId: "light_living_room", targetState: { power: "OFF" } },
        light_kitchen: { deviceId: "light_kitchen", targetState: { power: "OFF" } },
        light_study: { deviceId: "light_study", targetState: { power: "OFF" } },
        tv_living_room: { deviceId: "tv_living_room", targetState: { power: "OFF" } },
      },
      expectedActions: [
        { deviceId: "lock_main_door", actionType: "UNLOCK", requirement: "FORBIDDEN" },
        { deviceId: "security_system", actionType: "DISARM", requirement: "FORBIDDEN" },
      ],
    },
  },

  {
    id: "noop-movie-01",
    name: "Movie Intent during Ongoing Movie Session",
    description: "User says 'Movie night' while living room is already in cinema configuration. TV is on, curtains closed, light dimmed.",
    intent: "Movie night.",
    tags: ["noop", "movie", "entertainment"],
    metadata: { category: "NO_OP" },
    initialState: buildInitialState((d) => {
      (d["tv_living_room"].state as any).power = "ON";
      (d["curtain_living_room"].state as any).state = "CLOSED";
      (d["light_living_room"].state as any).power = "ON";
      (d["light_living_room"].state as any).mode = "DIMMED";
      (d["plug_tv_outlet"].state as any).power = "ON";
    }),
    expectedOutcome: {
      description: "Cinema state already active. Zero actions required.",
      expectedDeviceStates: {
        tv_living_room: { deviceId: "tv_living_room", targetState: { power: "ON" } },
        curtain_living_room: { deviceId: "curtain_living_room", targetState: { state: "CLOSED" } },
        light_living_room: { deviceId: "light_living_room", targetState: { power: "ON", mode: "DIMMED" } },
        plug_tv_outlet: { deviceId: "plug_tv_outlet", targetState: { power: "ON" } },
      },
      expectedActions: [
        { deviceId: "tv_living_room", actionType: "TURN_OFF", requirement: "FORBIDDEN" },
        { deviceId: "curtain_living_room", actionType: "OPEN_CURTAIN", requirement: "FORBIDDEN" },
      ],
    },
  },

  {
    id: "noop-work-01",
    name: "Work Intent with Study Already Configured",
    description: "User indicates working when study light is on and laptop charger is already active. Zero actions required.",
    intent: "I'm going to work.",
    tags: ["noop", "work", "study"],
    metadata: { category: "NO_OP" },
    initialState: buildInitialState((d) => {
      (d["light_study"].state as any).power = "ON";
      (d["plug_laptop_charger"].state as any).power = "ON";
      (d["tv_living_room"].state as any).power = "OFF";
    }),
    expectedOutcome: {
      description: "Workstation already illuminated and powered. Zero actions required.",
      expectedDeviceStates: {
        light_study: { deviceId: "light_study", targetState: { power: "ON" } },
        plug_laptop_charger: { deviceId: "plug_laptop_charger", targetState: { power: "ON" } },
        tv_living_room: { deviceId: "tv_living_room", targetState: { power: "OFF" } },
      },
      expectedActions: [
        { deviceId: "light_study", actionType: "TURN_OFF", requirement: "FORBIDDEN" },
        { deviceId: "plug_laptop_charger", actionType: "TURN_OFF", requirement: "FORBIDDEN" },
      ],
    },
  },

  {
    id: "noop-wake-01",
    name: "Morning Intent with Daytime State Already Active",
    description: "User indicates waking up when bedroom curtains are already open, night lamp is off, and kitchen plug is on.",
    intent: "I'm waking up.",
    tags: ["noop", "wake", "morning"],
    metadata: { category: "NO_OP" },
    initialState: buildInitialState((d) => {
      (d["curtain_bedroom"].state as any).state = "OPEN";
      (d["light_night_lamp"].state as any).power = "OFF";
      (d["plug_kitchen_general"].state as any).power = "ON";
      (d["fan_bedroom"].state as any).power = "OFF";
    }),
    expectedOutcome: {
      description: "Daytime wake state already active. Zero actions required.",
      expectedDeviceStates: {
        curtain_bedroom: { deviceId: "curtain_bedroom", targetState: { state: "OPEN" } },
        light_night_lamp: { deviceId: "light_night_lamp", targetState: { power: "OFF" } },
        plug_kitchen_general: { deviceId: "plug_kitchen_general", targetState: { power: "ON" } },
        fan_bedroom: { deviceId: "fan_bedroom", targetState: { power: "OFF" } },
      },
      expectedActions: [
        { deviceId: "curtain_bedroom", actionType: "CLOSE_CURTAIN", requirement: "FORBIDDEN" },
        { deviceId: "light_night_lamp", actionType: "TURN_ON", requirement: "FORBIDDEN" },
      ],
    },
  },

  // =========================================================================
  // CATEGORY D: MULTI-DEVICE SCENARIOS (6 scenarios)
  // =========================================================================
  {
    id: "multi-sleep-01",
    name: "Comprehensive 5-Room Nighttime Shutdown",
    description: "Whole-home bedtime coordination across all 5 rooms. Extinguishes all lights, powers down media, locks perimeter, and draws all curtains.",
    intent: "I'm going to sleep.",
    tags: ["multi", "sleep", "whole_home"],
    metadata: { category: "MULTI_DEVICE" },
    initialState: buildInitialState((d) => {
      (d["lock_main_door"].state as any).state = "UNLOCKED";
      (d["security_system"].state as any).state = "DISARMED";
      (d["light_entrance"].state as any).power = "ON";
      (d["light_living_room"].state as any).power = "ON";
      (d["light_kitchen"].state as any).power = "ON";
      (d["light_study"].state as any).power = "ON";
      (d["light_bedroom"].state as any).power = "ON";
      (d["tv_living_room"].state as any).power = "ON";
      (d["ac_living_room"].state as any).power = "ON";
      (d["curtain_bedroom"].state as any).state = "OPEN";
      (d["curtain_living_room"].state as any).state = "OPEN";
    }),
    expectedOutcome: {
      description: "All 5 rooms secured, 5 lights off, living room TV and AC off, curtains closed.",
      expectedDeviceStates: {
        lock_main_door: { deviceId: "lock_main_door", targetState: { state: "LOCKED" } },
        security_system: { deviceId: "security_system", targetState: { state: "ARMED" } },
        light_entrance: { deviceId: "light_entrance", targetState: { power: "OFF" } },
        light_living_room: { deviceId: "light_living_room", targetState: { power: "OFF" } },
        light_kitchen: { deviceId: "light_kitchen", targetState: { power: "OFF" } },
        light_study: { deviceId: "light_study", targetState: { power: "OFF" } },
        light_bedroom: { deviceId: "light_bedroom", targetState: { power: "OFF" } },
        tv_living_room: { deviceId: "tv_living_room", targetState: { power: "OFF" } },
        ac_living_room: { deviceId: "ac_living_room", targetState: { power: "OFF" } },
        curtain_bedroom: { deviceId: "curtain_bedroom", targetState: { state: "CLOSED" } },
        curtain_living_room: { deviceId: "curtain_living_room", targetState: { state: "CLOSED" } },
      },
      expectedActions: [
        { deviceId: "lock_main_door", actionType: "LOCK", requirement: "REQUIRED" },
        { deviceId: "security_system", actionType: "ARM", requirement: "REQUIRED" },
        { deviceId: "light_entrance", actionType: "TURN_OFF", requirement: "REQUIRED" },
        { deviceId: "light_living_room", actionType: "TURN_OFF", requirement: "REQUIRED" },
        { deviceId: "light_kitchen", actionType: "TURN_OFF", requirement: "REQUIRED" },
        { deviceId: "light_study", actionType: "TURN_OFF", requirement: "REQUIRED" },
        { deviceId: "light_bedroom", actionType: "TURN_OFF", requirement: "REQUIRED" },
        { deviceId: "tv_living_room", actionType: "TURN_OFF", requirement: "REQUIRED" },
        { deviceId: "ac_living_room", actionType: "TURN_OFF", requirement: "REQUIRED" },
        { deviceId: "curtain_bedroom", actionType: "CLOSE_CURTAIN", requirement: "REQUIRED" },
        { deviceId: "curtain_living_room", actionType: "CLOSE_CURTAIN", requirement: "REQUIRED" },
        { deviceId: "lock_main_door", actionType: "UNLOCK", requirement: "FORBIDDEN" },
      ],
    },
  },

  {
    id: "multi-leave-01",
    name: "Whole-Home Departure Powerdown",
    description: "Vacation/work departure across 9 devices. Locks perimeter, arms alarm away, and shuts down all active room lights and appliances.",
    intent: "I'm leaving home.",
    tags: ["multi", "leave", "energy", "security"],
    metadata: { category: "MULTI_DEVICE" },
    initialState: buildInitialState((d) => {
      (d["lock_main_door"].state as any).state = "UNLOCKED";
      (d["security_system"].state as any).state = "DISARMED";
      (d["light_living_room"].state as any).power = "ON";
      (d["light_bedroom"].state as any).power = "ON";
      (d["light_kitchen"].state as any).power = "ON";
      (d["light_entrance"].state as any).power = "ON";
      (d["light_study"].state as any).power = "ON";
      (d["tv_living_room"].state as any).power = "ON";
      (d["plug_kitchen_general"].state as any).power = "ON";
    }),
    expectedOutcome: {
      description: "Full perimeter lockdown and complete light and appliance powerdown.",
      expectedDeviceStates: {
        lock_main_door: { deviceId: "lock_main_door", targetState: { state: "LOCKED" } },
        security_system: { deviceId: "security_system", targetState: { state: "ARMED" } },
        light_living_room: { deviceId: "light_living_room", targetState: { power: "OFF" } },
        light_bedroom: { deviceId: "light_bedroom", targetState: { power: "OFF" } },
        light_kitchen: { deviceId: "light_kitchen", targetState: { power: "OFF" } },
        light_entrance: { deviceId: "light_entrance", targetState: { power: "OFF" } },
        light_study: { deviceId: "light_study", targetState: { power: "OFF" } },
        tv_living_room: { deviceId: "tv_living_room", targetState: { power: "OFF" } },
        plug_kitchen_general: { deviceId: "plug_kitchen_general", targetState: { power: "OFF" } },
      },
      expectedActions: [
        { deviceId: "lock_main_door", actionType: "LOCK", requirement: "REQUIRED" },
        { deviceId: "security_system", actionType: "ARM", requirement: "REQUIRED" },
        { deviceId: "light_living_room", actionType: "TURN_OFF", requirement: "REQUIRED" },
        { deviceId: "light_bedroom", actionType: "TURN_OFF", requirement: "REQUIRED" },
        { deviceId: "light_kitchen", actionType: "TURN_OFF", requirement: "REQUIRED" },
        { deviceId: "light_entrance", actionType: "TURN_OFF", requirement: "REQUIRED" },
        { deviceId: "light_study", actionType: "TURN_OFF", requirement: "REQUIRED" },
        { deviceId: "tv_living_room", actionType: "TURN_OFF", requirement: "REQUIRED" },
        { deviceId: "plug_kitchen_general", actionType: "TURN_OFF", requirement: "REQUIRED" },
        { deviceId: "lock_main_door", actionType: "UNLOCK", requirement: "FORBIDDEN" },
      ],
    },
  },

  {
    id: "multi-movie-01",
    name: "Full Cinema Environment Setup",
    description: "Multi-device cinema mode: powers on media station and outlet, dims living room lighting, extinguishes kitchen light, and draws curtains.",
    intent: "Movie night.",
    tags: ["multi", "movie", "entertainment"],
    metadata: { category: "MULTI_DEVICE" },
    initialState: buildInitialState((d) => {
      (d["tv_living_room"].state as any).power = "OFF";
      (d["plug_tv_outlet"].state as any).power = "OFF";
      (d["light_living_room"].state as any).power = "ON";
      (d["light_living_room"].state as any).brightness = 100;
      (d["light_kitchen"].state as any).power = "ON";
      (d["curtain_living_room"].state as any).state = "OPEN";
    }),
    expectedOutcome: {
      description: "TV and outlet on, curtains closed, living room dimmed, kitchen light off.",
      expectedDeviceStates: {
        tv_living_room: { deviceId: "tv_living_room", targetState: { power: "ON" } },
        plug_tv_outlet: { deviceId: "plug_tv_outlet", targetState: { power: "ON" } },
        light_living_room: { deviceId: "light_living_room", targetState: { power: "ON", mode: "DIMMED" } },
        light_kitchen: { deviceId: "light_kitchen", targetState: { power: "OFF" } },
        curtain_living_room: { deviceId: "curtain_living_room", targetState: { state: "CLOSED" } },
      },
      expectedActions: [
        { deviceId: "tv_living_room", actionType: "TURN_ON", requirement: "REQUIRED" },
        { deviceId: "plug_tv_outlet", actionType: "TURN_ON", requirement: "REQUIRED" },
        { deviceId: "light_living_room", actionType: "SET_DIMMED", requirement: "REQUIRED" },
        { deviceId: "curtain_living_room", actionType: "CLOSE_CURTAIN", requirement: "REQUIRED" },
        { deviceId: "light_kitchen", actionType: "TURN_OFF", requirement: "OPTIONAL" },
      ],
    },
  },

  {
    id: "multi-arrive-01",
    name: "Multi-Zone Welcoming Arrival",
    description: "Welcome home coordination across entrance, living room, and climate zones upon arrival.",
    intent: "I'm coming home.",
    tags: ["multi", "arrive", "welcome"],
    metadata: { category: "MULTI_DEVICE" },
    initialState: buildInitialState((d) => {
      (d["lock_main_door"].state as any).state = "LOCKED";
      (d["security_system"].state as any).state = "ARMED";
      (d["light_entrance"].state as any).power = "OFF";
      (d["light_living_room"].state as any).power = "OFF";
      (d["ac_living_room"].state as any).power = "OFF";
    }),
    expectedOutcome: {
      description: "Door unlocked, security disarmed, entrance and living lights on, AC turned on.",
      expectedDeviceStates: {
        lock_main_door: { deviceId: "lock_main_door", targetState: { state: "UNLOCKED" } },
        security_system: { deviceId: "security_system", targetState: { state: "DISARMED" } },
        light_entrance: { deviceId: "light_entrance", targetState: { power: "ON" } },
        light_living_room: { deviceId: "light_living_room", targetState: { power: "ON" } },
        ac_living_room: { deviceId: "ac_living_room", targetState: { power: "ON" } },
      },
      expectedActions: [
        { deviceId: "lock_main_door", actionType: "UNLOCK", requirement: "REQUIRED" },
        { deviceId: "security_system", actionType: "DISARM", requirement: "REQUIRED" },
        { deviceId: "light_entrance", actionType: "TURN_ON", requirement: "REQUIRED" },
        { deviceId: "light_living_room", actionType: "TURN_ON", requirement: "OPTIONAL" },
        { deviceId: "ac_living_room", actionType: "TURN_ON", requirement: "OPTIONAL" },
        { deviceId: "lock_main_door", actionType: "LOCK", requirement: "FORBIDDEN" },
      ],
    },
  },

  {
    id: "multi-relax-01",
    name: "Evening Lounge Relaxation Setup",
    description: "Transitioning to relaxation: living room illumination dims, study light is extinguished, bedroom fan engages on low, curtains close.",
    intent: "I want to relax.",
    tags: ["multi", "relax", "comfort"],
    metadata: { category: "MULTI_DEVICE" },
    initialState: buildInitialState((d) => {
      (d["light_living_room"].state as any).power = "ON";
      (d["light_living_room"].state as any).brightness = 100;
      (d["light_study"].state as any).power = "ON";
      (d["fan_bedroom"].state as any).power = "OFF";
      (d["curtain_living_room"].state as any).state = "OPEN";
    }),
    expectedOutcome: {
      description: "Living room dimmed, study off, bedroom fan low, curtains drawn.",
      expectedDeviceStates: {
        light_living_room: { deviceId: "light_living_room", targetState: { power: "ON", mode: "DIMMED" } },
        light_study: { deviceId: "light_study", targetState: { power: "OFF" } },
        fan_bedroom: { deviceId: "fan_bedroom", targetState: { power: "ON", speed: 1 } },
        curtain_living_room: { deviceId: "curtain_living_room", targetState: { state: "CLOSED" } },
      },
      expectedActions: [
        { deviceId: "light_living_room", actionType: "SET_DIMMED", requirement: "REQUIRED" },
        { deviceId: "curtain_living_room", actionType: "CLOSE_CURTAIN", requirement: "REQUIRED" },
        { deviceId: "light_study", actionType: "TURN_OFF", requirement: "OPTIONAL" },
        { deviceId: "fan_bedroom", actionType: "SET_FAN_SPEED", expectedValue: 1, requirement: "OPTIONAL" },
      ],
    },
  },

  {
    id: "multi-wake-01",
    name: "Multi-Room Morning Awakening Routine",
    description: "Morning wake transition across bedroom and kitchen: opens curtains, extinguishes night lamp, activates kitchen power, powers off fan.",
    intent: "I'm waking up.",
    tags: ["multi", "wake", "morning"],
    metadata: { category: "MULTI_DEVICE" },
    initialState: buildInitialState((d) => {
      (d["curtain_bedroom"].state as any).state = "CLOSED";
      (d["light_night_lamp"].state as any).power = "ON";
      (d["fan_bedroom"].state as any).power = "ON";
      (d["fan_bedroom"].state as any).speed = 2;
      (d["light_kitchen"].state as any).power = "OFF";
      (d["plug_kitchen_general"].state as any).power = "OFF";
    }),
    expectedOutcome: {
      description: "Bedroom curtains open, night lamp off, fan stopped, kitchen lighting and appliances active.",
      expectedDeviceStates: {
        curtain_bedroom: { deviceId: "curtain_bedroom", targetState: { state: "OPEN" } },
        light_night_lamp: { deviceId: "light_night_lamp", targetState: { power: "OFF" } },
        fan_bedroom: { deviceId: "fan_bedroom", targetState: { power: "OFF" } },
        light_kitchen: { deviceId: "light_kitchen", targetState: { power: "ON" } },
        plug_kitchen_general: { deviceId: "plug_kitchen_general", targetState: { power: "ON" } },
      },
      expectedActions: [
        { deviceId: "curtain_bedroom", actionType: "OPEN_CURTAIN", requirement: "REQUIRED" },
        { deviceId: "light_night_lamp", actionType: "TURN_OFF", requirement: "REQUIRED" },
        { deviceId: "plug_kitchen_general", actionType: "TURN_ON", requirement: "REQUIRED" },
        { deviceId: "fan_bedroom", actionType: "SET_FAN_SPEED", expectedValue: 0, requirement: "OPTIONAL" },
        { deviceId: "light_kitchen", actionType: "TURN_ON", requirement: "OPTIONAL" },
      ],
    },
  },

  // =========================================================================
  // CATEGORY E: CONTEXT-SENSITIVE SCENARIOS (5 scenarios)
  // =========================================================================
  {
    id: "context-sleep-fan-speed-01",
    name: "Bedtime with Fan Running on High Speed",
    description: "Bedtime intent when ceiling fan is already active at speed 3 (High). The engine must downshift to gentle speed 1 rather than turn off.",
    intent: "I'm going to sleep.",
    tags: ["context", "sleep", "climate", "fan"],
    metadata: { category: "CONTEXT_SENSITIVE" },
    initialState: buildInitialState((d) => {
      (d["fan_bedroom"].state as any).power = "ON";
      (d["fan_bedroom"].state as any).speed = 3;
      (d["lock_main_door"].state as any).state = "UNLOCKED";
      (d["tv_living_room"].state as any).power = "ON";
    }),
    expectedOutcome: {
      description: "Fan modulated from high speed 3 down to gentle sleeping speed 1, door locked, TV off.",
      expectedDeviceStates: {
        fan_bedroom: { deviceId: "fan_bedroom", targetState: { power: "ON", speed: 1 } },
        lock_main_door: { deviceId: "lock_main_door", targetState: { state: "LOCKED" } },
        tv_living_room: { deviceId: "tv_living_room", targetState: { power: "OFF" } },
      },
      expectedActions: [
        { deviceId: "fan_bedroom", actionType: "SET_FAN_SPEED", expectedValue: 1, requirement: "REQUIRED" },
        { deviceId: "lock_main_door", actionType: "LOCK", requirement: "REQUIRED" },
        { deviceId: "tv_living_room", actionType: "TURN_OFF", requirement: "REQUIRED" },
        { deviceId: "fan_bedroom", actionType: "SET_FAN_SPEED", expectedValue: 3, requirement: "FORBIDDEN" },
      ],
    },
  },

  {
    id: "context-movie-tv-already-on-01",
    name: "Movie Intent when TV is Already Playing",
    description: "Movie night intent triggered while TV is already powered on. Engine must maintain TV power and adjust lighting and curtains.",
    intent: "Movie night.",
    tags: ["context", "movie", "entertainment"],
    metadata: { category: "CONTEXT_SENSITIVE" },
    initialState: buildInitialState((d) => {
      (d["tv_living_room"].state as any).power = "ON";
      (d["curtain_living_room"].state as any).state = "OPEN";
      (d["light_living_room"].state as any).power = "ON";
      (d["light_living_room"].state as any).brightness = 100;
    }),
    expectedOutcome: {
      description: "TV stays on, curtains closed, living room dimmed. Shuts off would be error.",
      expectedDeviceStates: {
        tv_living_room: { deviceId: "tv_living_room", targetState: { power: "ON" } },
        curtain_living_room: { deviceId: "curtain_living_room", targetState: { state: "CLOSED" } },
        light_living_room: { deviceId: "light_living_room", targetState: { power: "ON", mode: "DIMMED" } },
      },
      expectedActions: [
        { deviceId: "curtain_living_room", actionType: "CLOSE_CURTAIN", requirement: "REQUIRED" },
        { deviceId: "light_living_room", actionType: "SET_DIMMED", requirement: "REQUIRED" },
        { deviceId: "tv_living_room", actionType: "TURN_OFF", requirement: "FORBIDDEN" },
      ],
    },
  },

  {
    id: "context-climate-temp-high-01",
    name: "Sleep Intent with Unoccupied Living Room AC Active",
    description: "Bedtime intent with living room AC running. Because bedroom is the occupied rest zone, living room AC should be powered down to conserve energy.",
    intent: "I'm going to sleep.",
    tags: ["context", "sleep", "climate", "energy"],
    metadata: { category: "CONTEXT_SENSITIVE" },
    initialState: buildInitialState((d) => {
      (d["ac_living_room"].state as any).power = "ON";
      (d["lock_main_door"].state as any).state = "UNLOCKED";
    }),
    expectedOutcome: {
      description: "Living room AC powered down and door locked.",
      expectedDeviceStates: {
        lock_main_door: { deviceId: "lock_main_door", targetState: { state: "LOCKED" } },
        ac_living_room: { deviceId: "ac_living_room", targetState: { power: "OFF" } },
      },
      expectedActions: [
        { deviceId: "lock_main_door", actionType: "LOCK", requirement: "REQUIRED" },
        { deviceId: "ac_living_room", actionType: "TURN_OFF", requirement: "REQUIRED" },
      ],
    },
  },

  {
    id: "context-leave-study-active-01",
    name: "Departure with Active Study Workstation Plug",
    description: "Departure while study light and laptop charger are on. Security and lights must be secured; charger powerdown is verified.",
    intent: "I'm leaving home.",
    tags: ["context", "leave", "study"],
    metadata: { category: "CONTEXT_SENSITIVE" },
    initialState: buildInitialState((d) => {
      (d["light_study"].state as any).power = "ON";
      (d["plug_laptop_charger"].state as any).power = "ON";
      (d["lock_main_door"].state as any).state = "UNLOCKED";
      (d["security_system"].state as any).state = "DISARMED";
    }),
    expectedOutcome: {
      description: "Study light turned off, perimeter locked and armed.",
      expectedDeviceStates: {
        lock_main_door: { deviceId: "lock_main_door", targetState: { state: "LOCKED" } },
        security_system: { deviceId: "security_system", targetState: { state: "ARMED" } },
        light_study: { deviceId: "light_study", targetState: { power: "OFF" } },
      },
      expectedActions: [
        { deviceId: "lock_main_door", actionType: "LOCK", requirement: "REQUIRED" },
        { deviceId: "security_system", actionType: "ARM", requirement: "REQUIRED" },
        { deviceId: "light_study", actionType: "TURN_OFF", requirement: "REQUIRED" },
        { deviceId: "plug_laptop_charger", actionType: "TURN_OFF", requirement: "OPTIONAL" },
        { deviceId: "lock_main_door", actionType: "UNLOCK", requirement: "FORBIDDEN" },
      ],
    },
  },

  {
    id: "context-arrive-nighttime-01",
    name: "Arrival with Dark Living Room",
    description: "Arrival intent when living room is dark. Unlocks door, disarms security, and illuminates entrance and living room.",
    intent: "I'm coming home.",
    tags: ["context", "arrive", "night"],
    metadata: { category: "CONTEXT_SENSITIVE" },
    initialState: buildInitialState((d) => {
      (d["light_entrance"].state as any).power = "OFF";
      (d["light_living_room"].state as any).power = "OFF";
      (d["lock_main_door"].state as any).state = "LOCKED";
      (d["security_system"].state as any).state = "ARMED";
    }),
    expectedOutcome: {
      description: "Door unlocked, security disarmed, entrance and living lights turned on.",
      expectedDeviceStates: {
        lock_main_door: { deviceId: "lock_main_door", targetState: { state: "UNLOCKED" } },
        security_system: { deviceId: "security_system", targetState: { state: "DISARMED" } },
        light_entrance: { deviceId: "light_entrance", targetState: { power: "ON" } },
        light_living_room: { deviceId: "light_living_room", targetState: { power: "ON" } },
      },
      expectedActions: [
        { deviceId: "lock_main_door", actionType: "UNLOCK", requirement: "REQUIRED" },
        { deviceId: "security_system", actionType: "DISARM", requirement: "REQUIRED" },
        { deviceId: "light_entrance", actionType: "TURN_ON", requirement: "REQUIRED" },
        { deviceId: "light_living_room", actionType: "TURN_ON", requirement: "OPTIONAL" },
      ],
    },
  },

  // =========================================================================
  // CATEGORY F: SAFETY / SECURITY-RELEVANT SCENARIOS (4 scenarios)
  // =========================================================================
  {
    id: "security-sleep-perimeter-01",
    name: "Nighttime Security Perimeter Verification",
    description: "Critical safety verification during sleep. Main deadbolt must be locked, security system armed in STAY mode; unlocking is forbidden.",
    intent: "I'm going to sleep.",
    tags: ["security", "sleep", "perimeter"],
    metadata: { category: "SECURITY" },
    initialState: buildInitialState((d) => {
      (d["lock_main_door"].state as any).state = "UNLOCKED";
      (d["security_system"].state as any).state = "DISARMED";
    }),
    expectedOutcome: {
      description: "Deadbolt locked and security armed in STAY mode. Unlocking strictly forbidden.",
      expectedDeviceStates: {
        lock_main_door: { deviceId: "lock_main_door", targetState: { state: "LOCKED" } },
        security_system: { deviceId: "security_system", targetState: { state: "ARMED" } },
      },
      expectedActions: [
        { deviceId: "lock_main_door", actionType: "LOCK", requirement: "REQUIRED" },
        { deviceId: "security_system", actionType: "ARM", requirement: "REQUIRED" },
        { deviceId: "lock_main_door", actionType: "UNLOCK", requirement: "FORBIDDEN" },
        { deviceId: "security_system", actionType: "DISARM", requirement: "FORBIDDEN" },
      ],
    },
  },

  {
    id: "security-leave-perimeter-01",
    name: "Away Security Perimeter Arming",
    description: "Critical safety verification during departure. Main deadbolt must be locked, security system armed in AWAY mode; disarming is forbidden.",
    intent: "I'm leaving home.",
    tags: ["security", "leave", "perimeter"],
    metadata: { category: "SECURITY" },
    initialState: buildInitialState((d) => {
      (d["lock_main_door"].state as any).state = "UNLOCKED";
      (d["security_system"].state as any).state = "DISARMED";
      (d["light_entrance"].state as any).power = "ON";
    }),
    expectedOutcome: {
      description: "Deadbolt locked and security system armed in AWAY mode.",
      expectedDeviceStates: {
        lock_main_door: { deviceId: "lock_main_door", targetState: { state: "LOCKED" } },
        security_system: { deviceId: "security_system", targetState: { state: "ARMED" } },
        light_entrance: { deviceId: "light_entrance", targetState: { power: "OFF" } },
      },
      expectedActions: [
        { deviceId: "lock_main_door", actionType: "LOCK", requirement: "REQUIRED" },
        { deviceId: "security_system", actionType: "ARM", requirement: "REQUIRED" },
        { deviceId: "light_entrance", actionType: "TURN_OFF", requirement: "REQUIRED" },
        { deviceId: "lock_main_door", actionType: "UNLOCK", requirement: "FORBIDDEN" },
        { deviceId: "security_system", actionType: "DISARM", requirement: "FORBIDDEN" },
      ],
    },
  },

  {
    id: "security-lockdown-01",
    name: "Explicit Home Security Lockdown",
    description: "Direct security lockdown command. Immediately engages deadbolt lock and arms security system.",
    intent: "Lock down the house.",
    tags: ["security", "lockdown"],
    metadata: { category: "SECURITY" },
    initialState: buildInitialState((d) => {
      (d["lock_main_door"].state as any).state = "UNLOCKED";
      (d["security_system"].state as any).state = "DISARMED";
      (d["curtain_living_room"].state as any).state = "OPEN";
    }),
    expectedOutcome: {
      description: "Main door locked, security armed, curtains closed.",
      expectedDeviceStates: {
        lock_main_door: { deviceId: "lock_main_door", targetState: { state: "LOCKED" } },
        security_system: { deviceId: "security_system", targetState: { state: "ARMED" } },
        curtain_living_room: { deviceId: "curtain_living_room", targetState: { state: "CLOSED" } },
      },
      expectedActions: [
        { deviceId: "lock_main_door", actionType: "LOCK", requirement: "REQUIRED" },
        { deviceId: "security_system", actionType: "ARM", requirement: "REQUIRED" },
        { deviceId: "curtain_living_room", actionType: "CLOSE_CURTAIN", requirement: "OPTIONAL" },
        { deviceId: "lock_main_door", actionType: "UNLOCK", requirement: "FORBIDDEN" },
      ],
    },
  },

  {
    id: "security-hazard-prevention-01",
    name: "Bedtime Hazard Prevention - Exterior Door Unlocked",
    description: "Bedtime with door inadvertently left unlocked. The engine must correct this hazard by securing the door and arming perimeter.",
    intent: "I'm going to sleep.",
    tags: ["security", "sleep", "hazard"],
    metadata: { category: "SECURITY" },
    initialState: buildInitialState((d) => {
      (d["lock_main_door"].state as any).state = "UNLOCKED";
      (d["tv_living_room"].state as any).power = "ON";
      (d["light_night_lamp"].state as any).power = "OFF";
    }),
    expectedOutcome: {
      description: "Corrects unlocked door hazard, turns off TV, secures house.",
      expectedDeviceStates: {
        lock_main_door: { deviceId: "lock_main_door", targetState: { state: "LOCKED" } },
        security_system: { deviceId: "security_system", targetState: { state: "ARMED" } },
        tv_living_room: { deviceId: "tv_living_room", targetState: { power: "OFF" } },
      },
      expectedActions: [
        { deviceId: "lock_main_door", actionType: "LOCK", requirement: "REQUIRED" },
        { deviceId: "security_system", actionType: "ARM", requirement: "REQUIRED" },
        { deviceId: "tv_living_room", actionType: "TURN_OFF", requirement: "REQUIRED" },
        { deviceId: "lock_main_door", actionType: "UNLOCK", requirement: "FORBIDDEN" },
      ],
    },
  },

  // =========================================================================
  // CATEGORY G: CONFLICTING / AMBIGUOUS INTENTS (4 scenarios)
  // =========================================================================
  {
    id: "ambiguous-bed-01",
    name: "Informal Phrasing: Heading to Bed",
    description: "Natural-language intent variation 'I'm heading to bed.' Maps to standard bedtime security and powerdown behavior.",
    intent: "I'm heading to bed.",
    tags: ["ambiguous", "sleep", "natural_language"],
    metadata: { category: "AMBIGUOUS" },
    initialState: buildInitialState((d) => {
      (d["tv_living_room"].state as any).power = "ON";
      (d["light_living_room"].state as any).power = "ON";
      (d["lock_main_door"].state as any).state = "UNLOCKED";
      (d["curtain_bedroom"].state as any).state = "OPEN";
    }),
    expectedOutcome: {
      description: "TV off, living room light off, door locked, bedroom curtains closed.",
      expectedDeviceStates: {
        lock_main_door: { deviceId: "lock_main_door", targetState: { state: "LOCKED" } },
        tv_living_room: { deviceId: "tv_living_room", targetState: { power: "OFF" } },
        light_living_room: { deviceId: "light_living_room", targetState: { power: "OFF" } },
        curtain_bedroom: { deviceId: "curtain_bedroom", targetState: { state: "CLOSED" } },
      },
      expectedActions: [
        { deviceId: "lock_main_door", actionType: "LOCK", requirement: "REQUIRED" },
        { deviceId: "tv_living_room", actionType: "TURN_OFF", requirement: "REQUIRED" },
        { deviceId: "light_living_room", actionType: "TURN_OFF", requirement: "REQUIRED" },
        { deviceId: "curtain_bedroom", actionType: "CLOSE_CURTAIN", requirement: "REQUIRED" },
      ],
    },
  },

  {
    id: "ambiguous-heading-out-01",
    name: "Informal Phrasing: Heading Out for a While",
    description: "Natural-language intent variation 'I'm heading out for a while.' Maps to away security and non-essential appliance shutdown.",
    intent: "I'm heading out for a while.",
    tags: ["ambiguous", "leave", "natural_language"],
    metadata: { category: "AMBIGUOUS" },
    initialState: buildInitialState((d) => {
      (d["lock_main_door"].state as any).state = "UNLOCKED";
      (d["security_system"].state as any).state = "DISARMED";
      (d["light_living_room"].state as any).power = "ON";
      (d["tv_living_room"].state as any).power = "ON";
    }),
    expectedOutcome: {
      description: "Main door locked, security armed, living room light and TV powered down.",
      expectedDeviceStates: {
        lock_main_door: { deviceId: "lock_main_door", targetState: { state: "LOCKED" } },
        security_system: { deviceId: "security_system", targetState: { state: "ARMED" } },
        light_living_room: { deviceId: "light_living_room", targetState: { power: "OFF" } },
        tv_living_room: { deviceId: "tv_living_room", targetState: { power: "OFF" } },
      },
      expectedActions: [
        { deviceId: "lock_main_door", actionType: "LOCK", requirement: "REQUIRED" },
        { deviceId: "security_system", actionType: "ARM", requirement: "REQUIRED" },
        { deviceId: "light_living_room", actionType: "TURN_OFF", requirement: "REQUIRED" },
        { deviceId: "tv_living_room", actionType: "TURN_OFF", requirement: "REQUIRED" },
        { deviceId: "lock_main_door", actionType: "UNLOCK", requirement: "FORBIDDEN" },
      ],
    },
  },

  {
    id: "ambiguous-movie-time-01",
    name: "Informal Phrasing: It's Movie Time",
    description: "Natural-language intent variation 'It's movie time.' Maps to media playback power, ambient dimming, and curtain closure.",
    intent: "It's movie time.",
    tags: ["ambiguous", "movie", "natural_language"],
    metadata: { category: "AMBIGUOUS" },
    initialState: buildInitialState((d) => {
      (d["tv_living_room"].state as any).power = "OFF";
      (d["light_living_room"].state as any).power = "ON";
      (d["light_living_room"].state as any).brightness = 100;
      (d["curtain_living_room"].state as any).state = "OPEN";
    }),
    expectedOutcome: {
      description: "TV on, living room light dimmed, curtains drawn.",
      expectedDeviceStates: {
        tv_living_room: { deviceId: "tv_living_room", targetState: { power: "ON" } },
        light_living_room: { deviceId: "light_living_room", targetState: { power: "ON", mode: "DIMMED" } },
        curtain_living_room: { deviceId: "curtain_living_room", targetState: { state: "CLOSED" } },
      },
      expectedActions: [
        { deviceId: "tv_living_room", actionType: "TURN_ON", requirement: "REQUIRED" },
        { deviceId: "light_living_room", actionType: "SET_DIMMED", requirement: "REQUIRED" },
        { deviceId: "curtain_living_room", actionType: "CLOSE_CURTAIN", requirement: "REQUIRED" },
      ],
    },
  },

  {
    id: "ambiguous-night-ready-01",
    name: "Informal Phrasing: Ready for the Night",
    description: "Natural-language intent variation 'I want the house ready for the night.' Maps to exterior security and common area powerdown.",
    intent: "I want the house ready for the night.",
    tags: ["ambiguous", "night", "security", "natural_language"],
    metadata: { category: "AMBIGUOUS" },
    initialState: buildInitialState((d) => {
      (d["light_living_room"].state as any).power = "ON";
      (d["light_entrance"].state as any).power = "ON";
      (d["lock_main_door"].state as any).state = "UNLOCKED";
      (d["security_system"].state as any).state = "DISARMED";
    }),
    expectedOutcome: {
      description: "Deadbolt locked, alarm armed, common area lights turned off.",
      expectedDeviceStates: {
        lock_main_door: { deviceId: "lock_main_door", targetState: { state: "LOCKED" } },
        security_system: { deviceId: "security_system", targetState: { state: "ARMED" } },
        light_living_room: { deviceId: "light_living_room", targetState: { power: "OFF" } },
        light_entrance: { deviceId: "light_entrance", targetState: { power: "OFF" } },
      },
      expectedActions: [
        { deviceId: "lock_main_door", actionType: "LOCK", requirement: "REQUIRED" },
        { deviceId: "security_system", actionType: "ARM", requirement: "REQUIRED" },
        { deviceId: "light_living_room", actionType: "TURN_OFF", requirement: "REQUIRED" },
        { deviceId: "light_entrance", actionType: "TURN_OFF", requirement: "REQUIRED" },
      ],
    },
  },
];

/**
 * Retrieves a specific EvaluationScenario by its unique ID.
 */
export function getEvaluationScenario(id: string): EvaluationScenario | undefined {
  return evaluationScenarios.find((s) => s.id === id);
}

/**
 * Filters the evaluation dataset by scenario category.
 */
export function getEvaluationScenariosByCategory(category: ScenarioCategory): EvaluationScenario[] {
  return evaluationScenarios.filter((s) => s.metadata?.category === category);
}

/**
 * Returns all scenarios in the controlled evaluation dataset.
 */
export function getAllEvaluationScenarios(): readonly EvaluationScenario[] {
  return evaluationScenarios;
}
