import { Action } from "@/types/action";
import { HomeState, PetOccupant } from "@/types/home";
import { LayaSystemOneRequest, LayaSystemOneResponse } from "./types";

export interface LayaPolicyResult {
  actions: Action[];
  confidence?: number;
  reasoning: string;
  appliedActions: Action[];
  skippedRedundantActions: Array<{ deviceId: string; actionType: string; reason: string }>;
  intentFamily: string;
  petContextRecognized: boolean;
}

/**
 * Serializes HomeState, device states, and occupancy context into a structured representation for Laya.
 */
export function buildLayaStateRepresentation(homeState: HomeState, intent: string): Record<string, unknown> {
  const devicesSummary: Record<string, unknown> = {};
  for (const [id, dev] of Object.entries(homeState.devices)) {
    devicesSummary[id] = {
      name: dev.name,
      category: dev.category,
      room: dev.roomId,
      state: dev.state,
    };
  }

  const occupancy = homeState.occupancy || { humans: [], pets: [] };

  return {
    userIntent: intent,
    simulationTime: homeState.simulationTime,
    devices: devicesSummary,
    occupancy: {
      humans: occupancy.humans,
      pets: occupancy.pets,
      hasPetsAtHome: occupancy.pets.some((p) => p.present),
    },
  };
}

/**
 * Builds the typed System-1 decision questions to send to Laya.
 */
export function buildLayaQuestions(intent: string, homeState: HomeState): Record<string, Record<string, unknown>> {
  const hasPetsAtHome = homeState.occupancy?.pets?.some((p) => p.present) ?? false;

  return {
    intent_family: {
      type: "choice",
      question: "Which primary automation family best matches the user's intent?",
      options: [
        "GOING_TO_SLEEP",
        "LEAVING_HOME",
        "MOVIE_NIGHT",
        "WORKING",
        "COMING_HOME",
        "RELAXING",
        "WAKING_UP",
        "OTHER",
      ],
    },
    turn_off_main_lighting: {
      type: "noul",
      question: "Should main living area lighting be powered off?",
    },
    lock_entrance_deadbolt: {
      type: "noul",
      question: "Should the exterior deadbolt be locked?",
    },
    arm_security_system: {
      type: "noul",
      question: "Should the security system be armed?",
    },
    security_mode: {
      type: "choice",
      question: "If arming security, which mode is appropriate?",
      options: ["STAY", "AWAY"],
    },
    manage_climate: {
      type: "noul",
      question: "Should climate control (AC) be adjusted or maintained?",
    },
    preserve_pet_environment: {
      type: "noul",
      question: `A pet is ${hasPetsAtHome ? "PRESENT" : "ABSENT"} in the home. Should pet comfort conditions be preserved?`,
    },
  };
}

/**
 * Maps Laya's System-1 decision outputs into concrete HomeMind Actions.
 * Enforces redundancy elimination and respects explicit pet climate preferences.
 */
export function translateLayaDecisionsToActions(
  intent: string,
  homeState: HomeState,
  response: LayaSystemOneResponse
): LayaPolicyResult {
  const answers = response.answers || {};

  // Extract intent family
  let intentFamily = "OTHER";
  let confidenceSum = 0;
  let confidenceCount = 0;

  const rawFamily = answers["intent_family"] as any;
  if (rawFamily) {
    if (typeof rawFamily === "string") {
      intentFamily = rawFamily;
    } else if (typeof rawFamily.value === "string") {
      intentFamily = rawFamily.value;
    }
    if (typeof rawFamily.confidence === "number") {
      confidenceSum += rawFamily.confidence;
      confidenceCount++;
    }
  }

  // Extract boolean answer helper
  const getBoolAnswer = (key: string, defaultVal: boolean): boolean => {
    const raw = answers[key] as any;
    if (!raw) return defaultVal;
    if (typeof raw.confidence === "number") {
      confidenceSum += raw.confidence;
      confidenceCount++;
    }
    if (typeof raw === "boolean") return raw;
    if (typeof raw.value === "boolean") return raw.value;
    if (raw.value === "YES" || raw.value === "True" || raw.value === 1) return true;
    if (raw.value === "NO" || raw.value === "False" || raw.value === 0) return false;
    return defaultVal;
  };

  const turnOffLighting = getBoolAnswer("turn_off_main_lighting", true);
  const lockDeadbolt = getBoolAnswer("lock_entrance_deadbolt", true);
  const armSecurity = getBoolAnswer("arm_security_system", true);
  const preservePet = getBoolAnswer("preserve_pet_environment", true);

  // Check occupancy for pets
  const pets = homeState.occupancy?.pets || [];
  const petsAtHome = pets.filter((p) => p.present);
  const hasPetsAtHome = petsAtHome.length > 0;
  const petContextRecognized = hasPetsAtHome && preservePet;

  const now = new Date().toISOString();
  const proposedActions: Action[] = [];
  const skippedRedundantActions: Array<{ deviceId: string; actionType: string; reason: string }> = [];

  const addActionIfNonRedundant = (
    deviceId: string,
    actionType: Action["actionType"],
    value: unknown = null,
    isRedundantCheck: () => boolean,
    redundantReason: string
  ) => {
    const dev = homeState.devices[deviceId];
    if (!dev) return;

    if (isRedundantCheck()) {
      skippedRedundantActions.push({ deviceId, actionType, reason: redundantReason });
    } else {
      proposedActions.push({
        id: `laya-act-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        deviceId,
        actionType,
        value,
        source: "LAYA",
        timestamp: now,
      });
    }
  };

  // Generate actions according to intent family and context
  switch (intentFamily) {
    case "GOING_TO_SLEEP": {
      // Turn off living room ceiling light
      addActionIfNonRedundant(
        "light_living_room",
        "TURN_OFF",
        null,
        () => (homeState.devices["light_living_room"]?.state as any)?.power === "OFF",
        "Living room light is already OFF."
      );

      // Turn off kitchen light
      addActionIfNonRedundant(
        "light_kitchen",
        "TURN_OFF",
        null,
        () => (homeState.devices["light_kitchen"]?.state as any)?.power === "OFF",
        "Kitchen light is already OFF."
      );

      // Turn off TV
      addActionIfNonRedundant(
        "tv_living_room",
        "TURN_OFF",
        null,
        () => (homeState.devices["tv_living_room"]?.state as any)?.power === "OFF",
        "Living room TV is already OFF."
      );

      // Lock entrance deadbolt
      if (lockDeadbolt) {
        addActionIfNonRedundant(
          "lock_main_door",
          "LOCK",
          null,
          () => (homeState.devices["lock_main_door"]?.state as any)?.state === "LOCKED",
          "Main door lock is already LOCKED."
        );
      }

      // Arm security in STAY mode
      if (armSecurity) {
        addActionIfNonRedundant(
          "security_system",
          "ARM",
          "STAY",
          () => (homeState.devices["security_system"]?.state as any)?.state === "ARMED_STAY",
          "Security system is already ARMED_STAY."
        );
      }

      // Close bedroom curtains
      addActionIfNonRedundant(
        "curtain_bedroom",
        "CLOSE_CURTAIN",
        null,
        () => (homeState.devices["curtain_bedroom"]?.state as any)?.state === "CLOSED",
        "Bedroom curtains are already CLOSED."
      );

      // Bedroom AC to 21°C COOL
      addActionIfNonRedundant(
        "ac_living_room",
        "TURN_OFF",
        null,
        () => (homeState.devices["ac_living_room"]?.state as any)?.power === "OFF",
        "Living room AC is already OFF."
      );

      break;
    }

    case "LEAVING_HOME": {
      // Turn off general lights
      addActionIfNonRedundant(
        "light_living_room",
        "TURN_OFF",
        null,
        () => (homeState.devices["light_living_room"]?.state as any)?.power === "OFF",
        "Living room light is already OFF."
      );

      addActionIfNonRedundant(
        "light_kitchen",
        "TURN_OFF",
        null,
        () => (homeState.devices["light_kitchen"]?.state as any)?.power === "OFF",
        "Kitchen light is already OFF."
      );

      addActionIfNonRedundant(
        "tv_living_room",
        "TURN_OFF",
        null,
        () => (homeState.devices["tv_living_room"]?.state as any)?.power === "OFF",
        "TV is already OFF."
      );

      // Lock main door
      addActionIfNonRedundant(
        "lock_main_door",
        "LOCK",
        null,
        () => (homeState.devices["lock_main_door"]?.state as any)?.state === "LOCKED",
        "Main door is already LOCKED."
      );

      // Pet Context Handling:
      // If pet remains inside, maintain climate based on pet's explicit preference if configured,
      // arm security in STAY (interior bypass) mode so pet doesn't trigger motion alarms.
      if (hasPetsAtHome && preservePet) {
        const petWithClimate = petsAtHome.find((p) => p.climatePreference?.preferredTemperature);
        if (petWithClimate && petWithClimate.climatePreference?.preferredTemperature) {
          const targetTemp = petWithClimate.climatePreference.preferredTemperature;
          addActionIfNonRedundant(
            "ac_living_room",
            "SET_TEMPERATURE",
            targetTemp,
            () => {
              const ac = homeState.devices["ac_living_room"]?.state as any;
              return ac?.power === "ON" && ac?.targetTemperature === targetTemp;
            },
            `AC already configured to pet preferred temperature ${targetTemp}°C.`
          );
        }

        // Arm security in STAY mode so interior motion sensors do not trigger on pet
        addActionIfNonRedundant(
          "security_system",
          "ARM",
          "STAY",
          () => (homeState.devices["security_system"]?.state as any)?.state === "ARMED_STAY",
          "Security system is already in STAY mode."
        );
      } else {
        // No pet: turn off AC and arm security AWAY
        addActionIfNonRedundant(
          "ac_living_room",
          "TURN_OFF",
          null,
          () => (homeState.devices["ac_living_room"]?.state as any)?.power === "OFF",
          "AC is already OFF."
        );

        addActionIfNonRedundant(
          "security_system",
          "ARM",
          "AWAY",
          () => (homeState.devices["security_system"]?.state as any)?.state === "ARMED_AWAY",
          "Security system is already ARMED_AWAY."
        );
      }
      break;
    }

    case "MOVIE_NIGHT": {
      // Dim living room lighting to 20%
      addActionIfNonRedundant(
        "light_living_room",
        "SET_BRIGHTNESS",
        20,
        () => {
          const l = homeState.devices["light_living_room"]?.state as any;
          return l?.power === "ON" && l?.brightness === 20;
        },
        "Living room light is already at 20% brightness."
      );

      // Close living room curtains
      addActionIfNonRedundant(
        "curtain_living_room",
        "CLOSE_CURTAIN",
        null,
        () => (homeState.devices["curtain_living_room"]?.state as any)?.state === "CLOSED",
        "Living room curtains already CLOSED."
      );

      // Turn on TV
      addActionIfNonRedundant(
        "tv_living_room",
        "TURN_ON",
        null,
        () => (homeState.devices["tv_living_room"]?.state as any)?.power === "ON",
        "Living room TV already ON."
      );
      break;
    }

    case "WORKING": {
      // Brighten study lighting to 100%
      addActionIfNonRedundant(
        "light_study",
        "SET_BRIGHTNESS",
        100,
        () => {
          const l = homeState.devices["light_study"]?.state as any;
          return l?.power === "ON" && l?.brightness === 100;
        },
        "Study light is already at 100% brightness."
      );

      // Turn on study plug
      addActionIfNonRedundant(
        "plug_study",
        "TURN_ON",
        null,
        () => (homeState.devices["plug_study"]?.state as any)?.power === "ON",
        "Study plug is already ON."
      );
      break;
    }

    case "COMING_HOME": {
      // Unlock door, disarm security, turn on entryway light
      addActionIfNonRedundant(
        "lock_main_door",
        "UNLOCK",
        null,
        () => (homeState.devices["lock_main_door"]?.state as any)?.state === "UNLOCKED",
        "Main door is already UNLOCKED."
      );

      addActionIfNonRedundant(
        "security_system",
        "DISARM",
        null,
        () => (homeState.devices["security_system"]?.state as any)?.state === "DISARMED",
        "Security system is already DISARMED."
      );

      addActionIfNonRedundant(
        "light_foyer",
        "TURN_ON",
        null,
        () => (homeState.devices["light_foyer"]?.state as any)?.power === "ON",
        "Foyer light is already ON."
      );
      break;
    }

    case "RELAXING": {
      // Warm lighting 40%, AC 24°C
      addActionIfNonRedundant(
        "light_living_room",
        "SET_BRIGHTNESS",
        40,
        () => {
          const l = homeState.devices["light_living_room"]?.state as any;
          return l?.power === "ON" && l?.brightness === 40;
        },
        "Living room light is already at 40%."
      );
      break;
    }

    case "WAKING_UP": {
      // Open bedroom curtains, turn off night lamp
      addActionIfNonRedundant(
        "curtain_bedroom",
        "OPEN_CURTAIN",
        null,
        () => (homeState.devices["curtain_bedroom"]?.state as any)?.state === "OPEN",
        "Bedroom curtains already OPEN."
      );

      addActionIfNonRedundant(
        "lamp_bedroom",
        "TURN_OFF",
        null,
        () => (homeState.devices["lamp_bedroom"]?.state as any)?.power === "OFF",
        "Night lamp already OFF."
      );
      break;
    }

    default:
      // Unrecognized intent
      break;
  }

  // Calculate calibrated confidence
  const confidence =
    confidenceCount > 0
      ? Math.round((confidenceSum / confidenceCount) * 100) / 100
      : undefined;

  const reasoning = `Laya System-1 non-autoregressive decision model evaluated intent family as "${intentFamily}"${
    confidence !== undefined ? ` with calibrated confidence ${confidence}` : ""
  }.${
    petContextRecognized ? " Preserved pet comfort and occupancy parameters." : ""
  } Dispatched ${proposedActions.length} actions; skipped ${skippedRedundantActions.length} redundant operations.`;

  return {
    actions: proposedActions,
    confidence,
    reasoning,
    appliedActions: proposedActions,
    skippedRedundantActions,
    intentFamily,
    petContextRecognized,
  };
}
