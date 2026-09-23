import { ScenarioPreset } from "@/types/scenario";

/**
 * Predefined Scenarios for user intent selection.
 * Note: Purely declarative intent templates.
 * NO device actions are hardcoded here.
 */
export const PREDEFINED_SCENARIOS: ScenarioPreset[] = [
  {
    id: "GOING_TO_SLEEP",
    name: "Going to Sleep",
    intent: "I'm going to sleep.",
    description:
      "Nighttime resting context. Prepares bedroom lighting, climate, locks doors, and powers down unnecessary loads.",
    suggestedIcon: "Moon",
  },
  {
    id: "LEAVING_HOME",
    name: "Leaving Home",
    intent: "I'm leaving home.",
    description:
      "Vacating home context. Arms security, locks access points, shuts off non-essential lighting and power plugs.",
    suggestedIcon: "LogOut",
  },
  {
    id: "MOVIE_NIGHT",
    name: "Movie Night",
    intent: "Movie night.",
    description:
      "Entertainment context. Sets ambient mood lighting in living room, closes curtains, and powers on TV system.",
    suggestedIcon: "Film",
  },
  {
    id: "WORKING",
    name: "Working",
    intent: "I'm going to work.",
    description:
      "Productivity context. Focuses study illumination, turns on laptop charging station, adjusts temperature.",
    suggestedIcon: "Briefcase",
  },
  {
    id: "COMING_HOME",
    name: "Coming Home",
    intent: "I'm coming home.",
    description:
      "Arrival context. Disarms security, unlocks main entry, illuminates foyer, and sets pleasant climate.",
    suggestedIcon: "Home",
  },
  {
    id: "RELAXING",
    name: "Relaxing",
    intent: "I want to relax.",
    description:
      "Comfort lounge context. Dims living spaces, activates gentle fan ventilation, soft music or display backdrop.",
    suggestedIcon: "Coffee",
  },
  {
    id: "WAKING_UP",
    name: "Waking Up",
    intent: "I'm waking up.",
    description:
      "Morning wake-up context. Opens bedroom curtains to daylight, deactivates night lamp, activates kitchen power.",
    suggestedIcon: "Sun",
  },
];
