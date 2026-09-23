import { Device } from "@/types/device";

export const INITIAL_DEVICES: Record<string, Device> = {
  // LIGHTS (6 devices)
  "light_living_room": {
    id: "light_living_room",
    name: "Living Room Light",
    category: "LIGHT",
    roomId: "living_room",
    state: {
      power: "OFF",
      brightness: 100,
      mode: "NORMAL",
    },
    capabilities: {
      powerToggle: true,
      dimmable: true,
    },
    metadata: {
      wattageRating: 15,
      model: "Sim-Lutron-Pro",
    },
  },
  "light_bedroom": {
    id: "light_bedroom",
    name: "Bedroom Light",
    category: "LIGHT",
    roomId: "bedroom",
    state: {
      power: "OFF",
      brightness: 80,
      mode: "NORMAL",
    },
    capabilities: {
      powerToggle: true,
      dimmable: true,
    },
    metadata: {
      wattageRating: 12,
      model: "Sim-Philips-Hue",
    },
  },
  "light_kitchen": {
    id: "light_kitchen",
    name: "Kitchen Light",
    category: "LIGHT",
    roomId: "kitchen",
    state: {
      power: "OFF",
      brightness: 100,
      mode: "NORMAL",
    },
    capabilities: {
      powerToggle: true,
      dimmable: true,
    },
    metadata: {
      wattageRating: 18,
      model: "Sim-Ceiling-Panel",
    },
  },
  "light_entrance": {
    id: "light_entrance",
    name: "Entrance Light",
    category: "LIGHT",
    roomId: "entrance",
    state: {
      power: "OFF",
      brightness: 100,
      mode: "NORMAL",
    },
    capabilities: {
      powerToggle: true,
      dimmable: true,
    },
    metadata: {
      wattageRating: 10,
      model: "Sim-Foyer-Spot",
    },
  },
  "light_night_lamp": {
    id: "light_night_lamp",
    name: "Night Lamp",
    category: "LIGHT",
    roomId: "bedroom",
    state: {
      power: "OFF",
      brightness: 20,
      mode: "DIMMED",
    },
    capabilities: {
      powerToggle: true,
      dimmable: true,
    },
    metadata: {
      wattageRating: 5,
      model: "Sim-Bedside-SoftWarm",
    },
  },
  "light_study": {
    id: "light_study",
    name: "Study Light",
    category: "LIGHT",
    roomId: "study",
    state: {
      power: "OFF",
      brightness: 100,
      mode: "NORMAL",
    },
    capabilities: {
      powerToggle: true,
      dimmable: true,
    },
    metadata: {
      wattageRating: 14,
      model: "Sim-Desk-FocusBeam",
    },
  },

  // ENTERTAINMENT (1 device)
  "tv_living_room": {
    id: "tv_living_room",
    name: "Living Room TV",
    category: "ENTERTAINMENT",
    roomId: "living_room",
    state: {
      power: "OFF",
      volume: 18,
      input: "HDMI 1",
    },
    capabilities: {
      powerToggle: true,
    },
    metadata: {
      wattageRating: 120,
      model: "Sim-OLED-65",
    },
  },

  // CLIMATE (3 devices)
  "ac_living_room": {
    id: "ac_living_room",
    name: "Living Room AC",
    category: "CLIMATE",
    roomId: "living_room",
    state: {
      power: "OFF",
      targetTemperature: 24,
      mode: "COOL",
    },
    capabilities: {
      powerToggle: true,
      temperatureAdjustment: {
        min: 16,
        max: 30,
      },
    },
    metadata: {
      wattageRating: 1400,
      model: "Sim-Inverter-DualCool",
    },
  },
  "fan_bedroom": {
    id: "fan_bedroom",
    name: "Bedroom Fan",
    category: "CLIMATE",
    roomId: "bedroom",
    state: {
      power: "OFF",
      speed: 0,
    },
    capabilities: {
      powerToggle: true,
      fanSpeed: true,
    },
    metadata: {
      wattageRating: 60,
      model: "Sim-WhisperQuiet-BLDC",
    },
  },
  "thermostat_living_room": {
    id: "thermostat_living_room",
    name: "Thermostat",
    category: "CLIMATE",
    roomId: "living_room",
    state: {
      ambientTemperature: 25,
      targetTemperature: 23,
      mode: "COOL",
    },
    capabilities: {
      powerToggle: true,
      thermostatControl: true,
      temperatureAdjustment: {
        min: 16,
        max: 30,
      },
    },
    metadata: {
      wattageRating: 3,
      model: "Sim-Nest-SmartSense",
    },
  },

  // SECURITY (2 devices)
  "lock_main_door": {
    id: "lock_main_door",
    name: "Main Door Lock",
    category: "SECURITY",
    roomId: "entrance",
    state: {
      state: "LOCKED",
    },
    capabilities: {
      powerToggle: false,
      lockable: true,
    },
    metadata: {
      model: "Sim-Deadbolt-Motorized",
    },
  },
  "security_system": {
    id: "security_system",
    name: "Security System",
    category: "SECURITY",
    roomId: "entrance",
    state: {
      state: "DISARMED",
      mode: "STAY",
    },
    capabilities: {
      powerToggle: false,
      armable: true,
    },
    metadata: {
      model: "Sim-HomeShield-Gateway",
    },
  },

  // WINDOW / CURTAINS (2 devices)
  "curtain_living_room": {
    id: "curtain_living_room",
    name: "Living Room Curtains",
    category: "CURTAIN",
    roomId: "living_room",
    state: {
      state: "CLOSED",
      position: 0,
    },
    capabilities: {
      powerToggle: false,
      curtainPosition: true,
    },
    metadata: {
      model: "Sim-Somfy-MotorizedTrack",
    },
  },
  "curtain_bedroom": {
    id: "curtain_bedroom",
    name: "Bedroom Curtains",
    category: "CURTAIN",
    roomId: "bedroom",
    state: {
      state: "CLOSED",
      position: 0,
    },
    capabilities: {
      powerToggle: false,
      curtainPosition: true,
    },
    metadata: {
      model: "Sim-Somfy-BlackoutTrack",
    },
  },

  // POWER / SMART PLUGS (4 devices)
  "plug_phone_charger": {
    id: "plug_phone_charger",
    name: "Phone Charger",
    category: "POWER",
    roomId: "bedroom",
    state: {
      power: "OFF",
      currentWatts: 0,
    },
    capabilities: {
      powerToggle: true,
      powerMonitoring: true,
    },
    metadata: {
      wattageRating: 25,
      model: "Sim-FastCharge-TypeC",
    },
  },
  "plug_laptop_charger": {
    id: "plug_laptop_charger",
    name: "Laptop Charger",
    category: "POWER",
    roomId: "study",
    state: {
      power: "OFF",
      currentWatts: 0,
    },
    capabilities: {
      powerToggle: true,
      powerMonitoring: true,
    },
    metadata: {
      wattageRating: 100,
      model: "Sim-GaN-WorkstationPlug",
    },
  },
  "plug_tv_outlet": {
    id: "plug_tv_outlet",
    name: "TV Power Outlet",
    category: "POWER",
    roomId: "living_room",
    state: {
      power: "OFF",
      currentWatts: 0,
    },
    capabilities: {
      powerToggle: true,
      powerMonitoring: true,
    },
    metadata: {
      wattageRating: 250,
      model: "Sim-SurgeGuard-Outlet",
    },
  },
  "plug_kitchen_general": {
    id: "plug_kitchen_general",
    name: "General Smart Plug",
    category: "POWER",
    roomId: "kitchen",
    state: {
      power: "OFF",
      currentWatts: 0,
    },
    capabilities: {
      powerToggle: true,
      powerMonitoring: true,
    },
    metadata: {
      wattageRating: 2000,
      model: "Sim-HighPower-Relay",
    },
  },
};
