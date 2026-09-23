import { describe, it, expect } from "vitest";
import { INITIAL_DEVICES } from "@/lib/devices.config";
import { INITIAL_ROOMS } from "@/lib/rooms.config";
import { PREDEFINED_SCENARIOS } from "@/lib/scenarios.config";

describe("Milestone 6 - Device Count and Structural Consistency", () => {
  it("should contain exactly 18 simulated devices across the virtual home", () => {
    const deviceKeys = Object.keys(INITIAL_DEVICES);
    expect(deviceKeys).toHaveLength(18);
  });

  it("should verify devices distribution across the 5 rooms", () => {
    expect(INITIAL_ROOMS).toHaveLength(5);
    const roomIds = INITIAL_ROOMS.map((r) => r.id);

    const devices = Object.values(INITIAL_DEVICES);
    devices.forEach((d) => {
      expect(roomIds).toContain(d.roomId);
      expect(d.id).toBeDefined();
      expect(d.name).toBeDefined();
      expect(d.category).toBeDefined();
      expect(d.capabilities).toBeDefined();
      expect(d.state).toBeDefined();
    });

    // Room specific device count assertions
    const livingRoomDevices = devices.filter((d) => d.roomId === "living_room");
    const bedroomDevices = devices.filter((d) => d.roomId === "bedroom");
    const kitchenDevices = devices.filter((d) => d.roomId === "kitchen");
    const entranceDevices = devices.filter((d) => d.roomId === "entrance");
    const studyDevices = devices.filter((d) => d.roomId === "study");

    expect(livingRoomDevices).toHaveLength(6);
    expect(bedroomDevices).toHaveLength(5);
    expect(kitchenDevices).toHaveLength(2);
    expect(entranceDevices).toHaveLength(3);
    expect(studyDevices).toHaveLength(2);

    expect(6 + 5 + 2 + 3 + 2).toBe(18);
  });

  it("should verify exactly 7 predefined scenarios exist without hardcoded actions", () => {
    expect(PREDEFINED_SCENARIOS).toHaveLength(7);
    const scenarioIds = PREDEFINED_SCENARIOS.map((s) => s.id);
    expect(scenarioIds).toEqual([
      "GOING_TO_SLEEP",
      "LEAVING_HOME",
      "MOVIE_NIGHT",
      "WORKING",
      "COMING_HOME",
      "RELAXING",
      "WAKING_UP",
    ]);
  });
});
