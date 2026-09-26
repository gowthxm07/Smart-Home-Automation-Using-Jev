import { HomeState, OccupancyContext, PetOccupant, HumanOccupant, PetClimatePreference } from "@/types/home";

/**
 * Universal Occupancy and Pet Context Helpers.
 *
 * Provider-neutral utilities for managing human and pet occupancy contexts
 * without hardcoding veterinary or domain assumptions into individual decision engines.
 */

/**
 * Creates a validated OccupancyContext object.
 */
export function createOccupancyContext(params: {
  humans?: HumanOccupant[];
  pets?: PetOccupant[];
}): OccupancyContext {
  return {
    humans: params.humans || [],
    pets: params.pets || [],
  };
}

/**
 * Returns true if any pet is marked present in the home.
 */
export function hasPetsRemainingHome(homeState: HomeState): boolean {
  if (!homeState.occupancy?.pets) return false;
  return homeState.occupancy.pets.some((p) => p.present);
}

/**
 * Returns the highest-priority explicit climate preference configured for any pet present at home.
 * If no pet specifies a climate preference, returns null (decision engines must NOT guess arbitrary temperatures).
 */
export function getActivePetClimatePreference(homeState: HomeState): PetClimatePreference | null {
  if (!homeState.occupancy?.pets) return null;
  const activePets = homeState.occupancy.pets.filter((p) => p.present);
  for (const pet of activePets) {
    if (pet.climatePreference?.preferredTemperature !== undefined) {
      return pet.climatePreference;
    }
  }
  return null;
}

/**
 * Application Demonstration Scenario Context:
 * "I am going out for a movie but my pet is inside the house."
 *
 * This scenario context is strictly separate from the frozen 36 evaluation dataset.
 */
export const DEMO_MOVIE_WITH_PET_CONTEXT: OccupancyContext = {
  humans: [
    {
      id: "occupant_primary",
      name: "Alex",
      present: false,
      location: "OUTSIDE",
    },
  ],
  pets: [
    {
      id: "pet_dog_charlie",
      name: "Charlie",
      species: "DOG",
      present: true,
      location: "living_room",
      climatePreference: {
        preferredTemperature: 23,
        minTemperature: 20,
        maxTemperature: 26,
      },
      notes: "Golden Retriever requires 23°C ambient comfort and interior motion bypass.",
    },
  ],
};
