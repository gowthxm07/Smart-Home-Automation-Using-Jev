"use client";

import React from "react";
import { Device, LightState, FanState, ACState, ThermostatState, LockState, SecurityState, CurtainState, SmartPlugState } from "@/types/device";
import { DeviceIcon } from "./DeviceIcon";
import { useHome } from "@/context/HomeContext";
import { Power, Minus, Plus, Lock, Unlock, Shield } from "lucide-react";

interface DeviceCardProps {
  device: Device;
}

export const DeviceCard: React.FC<DeviceCardProps> = ({ device }) => {
  const {
    toggleDevicePower,
    setLightBrightness,
    setFanSpeed,
    setTemperature,
    toggleDoorLock,
    toggleSecurity,
    toggleCurtains,
    setCurtainPosition,
    dispatchAction,
  } = useHome();

  const isPowerOn = "power" in device.state ? device.state.power === "ON" : false;

  const renderControls = () => {
    switch (device.category) {
      case "LIGHT": {
        const state = device.state as LightState;
        return (
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] text-slate-400">Brightness</span>
              <span className="text-xs font-mono font-medium text-slate-200">
                {state.power === "ON" ? `${state.brightness}%` : "0%"}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={state.power === "ON" ? state.brightness : 0}
              onChange={(e) => setLightBrightness(device.id, Number(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
            />
            <div className="flex items-center gap-1.5 pt-1">
              <button
                onClick={() => setLightBrightness(device.id, 25)}
                className="flex-1 py-1 rounded text-[11px] font-mono bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition"
              >
                Dim (25%)
              </button>
              <button
                onClick={() => setLightBrightness(device.id, 100)}
                className="flex-1 py-1 rounded text-[11px] font-mono bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition"
              >
                Max (100%)
              </button>
            </div>
          </div>
        );
      }

      case "CLIMATE": {
        if ("speed" in device.state) {
          const state = device.state as FanState;
          return (
            <div className="pt-2 space-y-2">
              <span className="text-[11px] text-slate-400">Speed Level</span>
              <div className="grid grid-cols-4 gap-1">
                {[0, 1, 2, 3].map((sp) => (
                  <button
                    key={sp}
                    onClick={() => setFanSpeed(device.id, sp as 0 | 1 | 2 | 3)}
                    className={`py-1 rounded text-xs font-mono font-semibold transition ${
                      state.speed === sp
                        ? "bg-cyan-600 text-white shadow-md shadow-cyan-600/30"
                        : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200"
                    }`}
                  >
                    {sp === 0 ? "OFF" : sp}
                  </button>
                ))}
              </div>
            </div>
          );
        }

        if ("ambientTemperature" in device.state) {
          const state = device.state as ThermostatState;
          return (
            <div className="pt-2 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Ambient Temp:</span>
                <span className="font-mono text-cyan-400 font-bold">{state.ambientTemperature}°C</span>
              </div>
              <div className="flex items-center justify-between bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                <button
                  onClick={() => setTemperature(device.id, Math.max(16, state.targetTemperature - 1))}
                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <div className="text-center">
                  <span className="text-[10px] text-slate-500 uppercase block">Target</span>
                  <span className="font-mono font-bold text-sm text-slate-100">{state.targetTemperature}°C</span>
                </div>
                <button
                  onClick={() => setTemperature(device.id, Math.min(30, state.targetTemperature + 1))}
                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        }

        const state = device.state as ACState;
        return (
          <div className="pt-2 space-y-2.5">
            <div className="flex items-center justify-between bg-slate-900/80 p-2 rounded-lg border border-slate-800">
              <button
                onClick={() => setTemperature(device.id, Math.max(16, state.targetTemperature - 1))}
                className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <div className="text-center">
                <span className="text-[10px] text-slate-500 uppercase block">Setpoint</span>
                <span className="font-mono font-bold text-sm text-cyan-300">{state.targetTemperature}°C</span>
              </div>
              <button
                onClick={() => setTemperature(device.id, Math.min(30, state.targetTemperature + 1))}
                className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-1">
              {["COOL", "ECO", "HEAT"].map((m) => (
                <button
                  key={m}
                  onClick={() => dispatchAction({ deviceId: device.id, actionType: "SET_AC_MODE", value: m })}
                  className={`py-1 rounded text-[10px] font-mono font-medium ${
                    state.mode === m
                      ? "bg-cyan-500/20 text-cyan-300 border border-cyan-400/30"
                      : "bg-slate-800/80 text-slate-400 hover:bg-slate-700"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
        );
      }

      case "SECURITY": {
        if (device.id.includes("lock")) {
          const state = device.state as LockState;
          return (
            <div className="pt-3">
              <button
                onClick={() => toggleDoorLock(device.id)}
                className={`w-full py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition ${
                  state.state === "LOCKED"
                    ? "bg-emerald-600/90 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-600/20"
                    : "bg-rose-600/90 hover:bg-rose-600 text-white shadow-lg shadow-rose-600/20"
                }`}
              >
                {state.state === "LOCKED" ? (
                  <>
                    <Lock className="w-3.5 h-3.5" />
                    LOCKED — CLICK TO UNLOCK
                  </>
                ) : (
                  <>
                    <Unlock className="w-3.5 h-3.5" />
                    UNLOCKED — CLICK TO LOCK
                  </>
                )}
              </button>
            </div>
          );
        }

        const state = device.state as SecurityState;
        return (
          <div className="pt-3 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => toggleSecurity(device.id, "STAY")}
                className={`py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                  state.state === "ARMED"
                    ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/25"
                    : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                ARM
              </button>
              <button
                onClick={() => dispatchAction({ deviceId: device.id, actionType: "DISARM" })}
                className={`py-1.5 rounded-lg text-xs font-semibold transition ${
                  state.state === "DISARMED"
                    ? "bg-slate-700 text-slate-100 font-bold"
                    : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                }`}
              >
                DISARM
              </button>
            </div>
          </div>
        );
      }

      case "CURTAIN": {
        const state = device.state as CurtainState;
        return (
          <div className="pt-2 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Opening Position</span>
              <span className="font-mono text-slate-200">{state.position}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={state.position}
              onChange={(e) => setCurtainPosition(device.id, Number(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-400"
            />
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={() => toggleCurtains(device.id)}
                className={`py-1 rounded text-xs font-semibold ${
                  state.state === "OPEN" ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                }`}
              >
                {state.state === "OPEN" ? "CLOSE" : "OPEN"}
              </button>
              <button
                onClick={() => setCurtainPosition(device.id, 50)}
                className="py-1 rounded text-xs font-mono bg-slate-800 text-slate-400 hover:bg-slate-700"
              >
                Half (50%)
              </button>
            </div>
          </div>
        );
      }

      case "POWER": {
        const state = device.state as SmartPlugState;
        return (
          <div className="pt-2 space-y-2.5">
            <div className="flex items-center justify-between bg-slate-900/60 p-2 rounded-lg border border-slate-800">
              <span className="text-[11px] text-slate-400">Power Draw</span>
              <span className="font-mono text-xs font-semibold text-emerald-400">
                {state.power === "ON" ? `${state.currentWatts} W` : "0 W (Idle)"}
              </span>
            </div>
            <button
              onClick={() => toggleDevicePower(device.id)}
              className={`w-full py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                state.power === "ON"
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              <Power className="w-3.5 h-3.5" />
              {state.power === "ON" ? "POWER CUT" : "POWER ON"}
            </button>
          </div>
        );
      }

      case "ENTERTAINMENT": {
        return (
          <div className="pt-3 space-y-2">
            <button
              onClick={() => toggleDevicePower(device.id)}
              className={`w-full py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition ${
                isPowerOn
                  ? "bg-purple-600 text-white shadow-lg shadow-purple-600/20"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              <Power className="w-3.5 h-3.5" />
              {isPowerOn ? "TV POWER ON (ACTIVE)" : "TV STANDBY (OFF)"}
            </button>
          </div>
        );
      }

      default:
        return null;
    }
  };

  return (
    <div
      className={`glass-card rounded-xl p-4 border transition-all duration-200 ${
        isPowerOn || (device.state && "state" in device.state && device.state.state !== "CLOSED" && device.state.state !== "DISARMED")
          ? "border-blue-500/30 bg-slate-900/80 shadow-md shadow-blue-500/5"
          : "border-slate-800/80 bg-slate-900/40"
      }`}
    >
      {/* Top row: Icon, Name, Power switch if applicable */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-slate-800/70 border border-slate-700/60">
            <DeviceIcon device={device} />
          </div>
          <div>
            <h3 className="text-xs font-semibold text-slate-200 line-clamp-1">{device.name}</h3>
            <span className="text-[10px] text-slate-500 uppercase font-mono tracking-wider">
              {device.category}
            </span>
          </div>
        </div>

        {device.capabilities.powerToggle && (
          <button
            onClick={() => toggleDevicePower(device.id)}
            title={`Toggle ${device.name}`}
            className={`p-1.5 rounded-lg border transition ${
              isPowerOn
                ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
                : "bg-slate-800/80 border-slate-700 text-slate-500 hover:text-slate-300"
            }`}
          >
            <Power className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Dynamic controls */}
      {renderControls()}
    </div>
  );
};
