"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { HomeState, AutomationMode } from "@/types/home";
import { Action, ActionSource, ActionType } from "@/types/action";
import { Device, DeviceState } from "@/types/device";
import { ScenarioPreset } from "@/types/scenario";
import { INITIAL_DEVICES } from "@/lib/devices.config";
import { INITIAL_ROOMS } from "@/lib/rooms.config";
import { simulationEngine } from "@/lib/simulationEngine";
import { DecisionResult } from "@/types/engine";
import { JevDecisionTrace } from "@/lib/jev/trace";

interface HomeContextValue {
  homeState: HomeState;
  // Clock controls
  toggleClockMode: () => void;
  setClockSpeed: (speed: number) => void;
  advanceSimulationTime: (minutes: number) => void;
  formattedSimulationTime: string;
  formattedSimulationDate: string;

  // Scenario / Intent controls
  selectScenario: (scenario: ScenarioPreset) => void;
  setIntentText: (text: string) => void;
  setAutomationMode: (mode: AutomationMode) => void;

  // Core Action Dispatcher
  dispatchAction: (
    actionInput: { deviceId: string; actionType: ActionType; value?: unknown },
    source?: ActionSource
  ) => { success: boolean; error?: string };

  // Manual Override Helpers
  toggleDevicePower: (deviceId: string) => void;
  setLightBrightness: (deviceId: string, brightness: number) => void;
  setLightDimmed: (deviceId: string) => void;
  setFanSpeed: (deviceId: string, speed: 0 | 1 | 2 | 3) => void;
  setTemperature: (deviceId: string, temperature: number) => void;
  setACMode: (deviceId: string, mode: "COOL" | "HEAT" | "ECO" | "FAN") => void;
  toggleDoorLock: (deviceId: string) => void;
  toggleSecurity: (deviceId: string, mode?: "STAY" | "AWAY") => void;
  toggleCurtains: (deviceId: string) => void;
  setCurtainPosition: (deviceId: string, position: number) => void;
  clearActionHistory: () => void;
  resetSimulationState: () => void;

  // Computed metrics
  activeDevicesCount: number;
  totalDevicesCount: number;

  // Milestone 2.3: Jev Observability & Automation
  jevExecutionState: "IDLE" | "EVALUATING" | "COMPLETED" | "ERROR";
  jevError: string | null;
  latestDecisionResult: DecisionResult | null;
  latestDecisionTrace: JevDecisionTrace | null;
  latestAppliedActions: Action[];
  latestSkippedActions: string[];
  runJevAutomation: (intentText?: string) => Promise<boolean>;
  clearJevTrace: () => void;
}

const HomeContext = createContext<HomeContextValue | undefined>(undefined);

export function HomeProvider({ children }: { children: React.ReactNode }) {
  // Initialize base home state
  const [homeState, setHomeState] = useState<HomeState>(() => ({
    simulationTime: new Date().toISOString(),
    isSimulatedClock: true,
    simulationSpeed: 1,
    automationMode: "MANUAL_SIMULATION",
    rooms: INITIAL_ROOMS,
    devices: JSON.parse(JSON.stringify(INITIAL_DEVICES)),
    currentScenario: null,
    currentIntentText: "",
    lastAction: null,
    actionHistory: [],
  }));

  // Jev Execution & Observability state (Milestone 2.3)
  const [jevExecutionState, setJevExecutionState] = useState<"IDLE" | "EVALUATING" | "COMPLETED" | "ERROR">("IDLE");
  const [jevError, setJevError] = useState<string | null>(null);
  const [latestDecisionResult, setLatestDecisionResult] = useState<DecisionResult | null>(null);
  const [latestDecisionTrace, setLatestDecisionTrace] = useState<JevDecisionTrace | null>(null);
  const [latestAppliedActions, setLatestAppliedActions] = useState<Action[]>([]);
  const [latestSkippedActions, setLatestSkippedActions] = useState<string[]>([]);

  const clearJevTrace = useCallback(() => {
    setLatestDecisionResult(null);
    setLatestDecisionTrace(null);
    setLatestAppliedActions([]);
    setLatestSkippedActions([]);
    setJevExecutionState("IDLE");
    setJevError(null);
  }, []);

  const runJevAutomation = useCallback(async (intentText?: string): Promise<boolean> => {
    const targetIntent = (intentText || homeState.currentIntentText || "I'm going to sleep.").trim();
    setJevExecutionState("EVALUATING");
    setJevError(null);

    try {
      const res = await fetch("/api/jev/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          intent: targetIntent,
          homeState,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || `HTTP ${res.status}: Failed to evaluate with Jev.`);
      }

      const decResult = data.decisionResult;
      setLatestDecisionResult(decResult);
      const trace = decResult.metadata?.decisionTrace || null;
      setLatestDecisionTrace(trace);
      setLatestAppliedActions(decResult.actions || []);
      setLatestSkippedActions(decResult.metadata?.skippedRedundantActions || []);

      if (decResult.actions && decResult.actions.length > 0) {
        setHomeState((prev) => {
          const { finalState } = simulationEngine.applyBatchActions(decResult.actions, prev);
          return finalState;
        });
      }

      setJevExecutionState("COMPLETED");
      return true;
    } catch (err: unknown) {
      const msg = (err as Error)?.message || "Jev evaluation failed.";
      setJevError(msg);
      setJevExecutionState("ERROR");
      return false;
    }
  }, [homeState]);

  // Simulation clock ticker
  useEffect(() => {
    const interval = setInterval(() => {
      setHomeState((prev) => {
        if (!prev.isSimulatedClock) {
          // Sync with real system time
          return {
            ...prev,
            simulationTime: new Date().toISOString(),
          };
        }

        // Advance simulated time by 1 sec * speed
        const currentMs = new Date(prev.simulationTime).getTime();
        const nextMs = currentMs + 1000 * prev.simulationSpeed;
        return {
          ...prev,
          simulationTime: new Date(nextMs).toISOString(),
        };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Clock methods
  const toggleClockMode = useCallback(() => {
    setHomeState((prev) => ({
      ...prev,
      isSimulatedClock: !prev.isSimulatedClock,
      simulationTime: new Date().toISOString(),
    }));
  }, []);

  const setClockSpeed = useCallback((speed: number) => {
    setHomeState((prev) => ({
      ...prev,
      simulationSpeed: speed,
    }));
  }, []);

  const advanceSimulationTime = useCallback((minutes: number) => {
    setHomeState((prev) => {
      const currentMs = new Date(prev.simulationTime).getTime();
      const nextMs = currentMs + minutes * 60 * 1000;
      return {
        ...prev,
        simulationTime: new Date(nextMs).toISOString(),
      };
    });
  }, []);

  // Intent & Scenario methods
  const selectScenario = useCallback((scenario: ScenarioPreset) => {
    setHomeState((prev) => ({
      ...prev,
      currentScenario: scenario,
      currentIntentText: scenario.intent,
    }));
  }, []);

  const setIntentText = useCallback((text: string) => {
    setHomeState((prev) => ({
      ...prev,
      currentIntentText: text,
    }));
  }, []);

  const setAutomationMode = useCallback((mode: AutomationMode) => {
    setHomeState((prev) => ({
      ...prev,
      automationMode: mode,
    }));
  }, []);

  // Central Action Dispatcher
  const dispatchAction = useCallback(
    (
      actionInput: { deviceId: string; actionType: ActionType; value?: unknown },
      source: ActionSource = "MANUAL"
    ) => {
      let resultSuccess = false;
      let resultError: string | undefined;

      setHomeState((prev) => {
        const action: Action = {
          id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          deviceId: actionInput.deviceId,
          actionType: actionInput.actionType,
          value: actionInput.value,
          source,
          timestamp: prev.simulationTime,
        };

        const simResult = simulationEngine.applyAction(action, prev);
        resultSuccess = simResult.success;
        resultError = simResult.error;

        if (simResult.success) {
          return simResult.newState;
        } else {
          console.warn("[SimulationEngine Rejected Action]:", simResult.error);
          return prev;
        }
      });

      return { success: resultSuccess, error: resultError };
    },
    []
  );

  // Manual Override Helpers
  const toggleDevicePower = useCallback(
    (deviceId: string) => {
      const device = homeState.devices[deviceId];
      if (!device) return;

      const isCurrentlyOn =
        "power" in device.state ? device.state.power === "ON" : false;

      dispatchAction(
        {
          deviceId,
          actionType: isCurrentlyOn ? "TURN_OFF" : "TURN_ON",
        },
        "MANUAL"
      );
    },
    [homeState.devices, dispatchAction]
  );

  const setLightBrightness = useCallback(
    (deviceId: string, brightness: number) => {
      dispatchAction(
        {
          deviceId,
          actionType: "SET_BRIGHTNESS",
          value: brightness,
        },
        "MANUAL"
      );
    },
    [dispatchAction]
  );

  const setLightDimmed = useCallback(
    (deviceId: string) => {
      dispatchAction(
        {
          deviceId,
          actionType: "SET_DIMMED",
        },
        "MANUAL"
      );
    },
    [dispatchAction]
  );

  const setFanSpeed = useCallback(
    (deviceId: string, speed: 0 | 1 | 2 | 3) => {
      dispatchAction(
        {
          deviceId,
          actionType: "SET_FAN_SPEED",
          value: speed,
        },
        "MANUAL"
      );
    },
    [dispatchAction]
  );

  const setTemperature = useCallback(
    (deviceId: string, temperature: number) => {
      dispatchAction(
        {
          deviceId,
          actionType: "SET_TEMPERATURE",
          value: temperature,
        },
        "MANUAL"
      );
    },
    [dispatchAction]
  );

  const setACMode = useCallback(
    (deviceId: string, mode: "COOL" | "HEAT" | "ECO" | "FAN") => {
      dispatchAction(
        {
          deviceId,
          actionType: "SET_AC_MODE",
          value: mode,
        },
        "MANUAL"
      );
    },
    [dispatchAction]
  );

  const toggleDoorLock = useCallback(
    (deviceId: string) => {
      const device = homeState.devices[deviceId];
      if (!device || !("state" in device.state)) return;

      const isLocked = device.state.state === "LOCKED";
      dispatchAction(
        {
          deviceId,
          actionType: isLocked ? "UNLOCK" : "LOCK",
        },
        "MANUAL"
      );
    },
    [homeState.devices, dispatchAction]
  );

  const toggleSecurity = useCallback(
    (deviceId: string, mode: "STAY" | "AWAY" = "STAY") => {
      const device = homeState.devices[deviceId];
      if (!device || !("state" in device.state)) return;

      const isArmed = device.state.state === "ARMED";
      dispatchAction(
        {
          deviceId,
          actionType: isArmed ? "DISARM" : "ARM",
          value: mode,
        },
        "MANUAL"
      );
    },
    [homeState.devices, dispatchAction]
  );

  const toggleCurtains = useCallback(
    (deviceId: string) => {
      const device = homeState.devices[deviceId];
      if (!device || !("state" in device.state)) return;

      const isOpen = device.state.state === "OPEN";
      dispatchAction(
        {
          deviceId,
          actionType: isOpen ? "CLOSE_CURTAIN" : "OPEN_CURTAIN",
        },
        "MANUAL"
      );
    },
    [homeState.devices, dispatchAction]
  );

  const setCurtainPosition = useCallback(
    (deviceId: string, position: number) => {
      dispatchAction(
        {
          deviceId,
          actionType: "SET_CURTAIN_POSITION",
          value: position,
        },
        "MANUAL"
      );
    },
    [dispatchAction]
  );

  const clearActionHistory = useCallback(() => {
    setHomeState((prev) => ({
      ...prev,
      actionHistory: [],
    }));
  }, []);

  const resetSimulationState = useCallback(() => {
    setHomeState({
      simulationTime: new Date().toISOString(),
      isSimulatedClock: true,
      simulationSpeed: 1,
      automationMode: "MANUAL_SIMULATION",
      rooms: INITIAL_ROOMS,
      devices: JSON.parse(JSON.stringify(INITIAL_DEVICES)),
      currentScenario: null,
      currentIntentText: "",
      lastAction: null,
      actionHistory: [],
    });
  }, []);

  // Time formatters
  const formattedSimulationTime = useMemo(() => {
    try {
      const d = new Date(homeState.simulationTime);
      return d.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      });
    } catch {
      return "--:--:--";
    }
  }, [homeState.simulationTime]);

  const formattedSimulationDate = useMemo(() => {
    try {
      const d = new Date(homeState.simulationTime);
      return d.toLocaleDateString([], {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return "---";
    }
  }, [homeState.simulationTime]);

  // Metric: active devices
  const activeDevicesCount = useMemo(() => {
    return Object.values(homeState.devices).filter((d) => {
      if ("power" in d.state) {
        return d.state.power === "ON";
      }
      if ("state" in d.state) {
        return d.state.state === "OPEN" || d.state.state === "ARMED" || d.state.state === "UNLOCKED";
      }
      return false;
    }).length;
  }, [homeState.devices]);

  const totalDevicesCount = useMemo(() => {
    return Object.keys(homeState.devices).length;
  }, [homeState.devices]);

  const value: HomeContextValue = {
    homeState,
    toggleClockMode,
    setClockSpeed,
    advanceSimulationTime,
    formattedSimulationTime,
    formattedSimulationDate,
    selectScenario,
    setIntentText,
    setAutomationMode,
    dispatchAction,
    toggleDevicePower,
    setLightBrightness,
    setLightDimmed,
    setFanSpeed,
    setTemperature,
    setACMode,
    toggleDoorLock,
    toggleSecurity,
    toggleCurtains,
    setCurtainPosition,
    clearActionHistory,
    resetSimulationState,
    activeDevicesCount,
    totalDevicesCount,
    // Milestone 2.3: Jev Observability
    jevExecutionState,
    jevError,
    latestDecisionResult,
    latestDecisionTrace,
    latestAppliedActions,
    latestSkippedActions,
    runJevAutomation,
    clearJevTrace,
  };

  return <HomeContext.Provider value={value}>{children}</HomeContext.Provider>;
}

export function useHome() {
  const context = useContext(HomeContext);
  if (!context) {
    throw new Error("useHome must be used within a HomeProvider");
  }
  return context;
}
