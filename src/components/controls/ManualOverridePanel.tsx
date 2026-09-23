"use client";

import React from "react";
import { useHome } from "@/context/HomeContext";
import {
  Lightbulb,
  Lock,
  Unlock,
  Wind,
  Fan,
  Tv,
  Shield,
  ShieldAlert,
  Blinds,
  Zap,
  Sliders,
} from "lucide-react";
import { LightState, FanState, ACState, LockState, SecurityState, CurtainState, SmartPlugState } from "@/types/device";

export const ManualOverridePanel: React.FC = () => {
  const {
    homeState,
    toggleDevicePower,
    setTemperature,
    setFanSpeed,
    toggleDoorLock,
    toggleSecurity,
    toggleCurtains,
    dispatchAction,
  } = useHome();

  const lrLight = homeState.devices["light_living_room"];
  const lrLightState = lrLight?.state as LightState;

  const brLight = homeState.devices["light_bedroom"];
  const brLightState = brLight?.state as LightState;

  const mainDoor = homeState.devices["lock_main_door"];
  const mainDoorState = mainDoor?.state as LockState;

  const ac = homeState.devices["ac_living_room"];
  const acState = ac?.state as ACState;

  const fan = homeState.devices["fan_bedroom"];
  const fanState = fan?.state as FanState;

  const tv = homeState.devices["tv_living_room"];
  const tvPower = tv?.state && "power" in tv.state ? tv.state.power === "ON" : false;

  const sec = homeState.devices["security_system"];
  const secState = sec?.state as SecurityState;

  const lrCurtains = homeState.devices["curtain_living_room"];
  const lrCurtainsState = lrCurtains?.state as CurtainState;

  const phonePlug = homeState.devices["plug_phone_charger"];
  const phonePlugPower = phonePlug?.state && "power" in phonePlug.state ? phonePlug.state.power === "ON" : false;

  const laptopPlug = homeState.devices["plug_laptop_charger"];
  const laptopPlugPower = laptopPlug?.state && "power" in laptopPlug.state ? laptopPlug.state.power === "ON" : false;

  return (
    <div className="glass-panel rounded-2xl p-5 border border-slate-800 shadow-xl space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
              Manual Device Override
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/25">
                Direct Control
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Immediate state overrides routed directly through the Simulation Engine
            </p>
          </div>
        </div>
      </div>

      {/* Control Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Main Lights (Living Room) */}
        <div className="bg-slate-900/60 rounded-xl p-3.5 border border-slate-800 hover:border-slate-700 transition">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
              <Lightbulb className={`w-4 h-4 ${lrLightState?.power === "ON" ? "text-amber-400" : "text-slate-500"}`} />
              Living Room Light
            </span>
            <span
              className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                lrLightState?.power === "ON"
                  ? "bg-amber-400/10 text-amber-300 border border-amber-400/20"
                  : "bg-slate-800 text-slate-400"
              }`}
            >
              {lrLightState?.power} {lrLightState?.power === "ON" ? `(${lrLightState.brightness}%)` : ""}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => dispatchAction({ deviceId: "light_living_room", actionType: "TURN_ON" })}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                lrLightState?.power === "ON"
                  ? "bg-amber-500 text-black font-semibold shadow-lg shadow-amber-500/20"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              ON
            </button>
            <button
              onClick={() => dispatchAction({ deviceId: "light_living_room", actionType: "TURN_OFF" })}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                lrLightState?.power === "OFF"
                  ? "bg-slate-700 text-white font-semibold"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              OFF
            </button>
          </div>
        </div>

        {/* Bedroom Light */}
        <div className="bg-slate-900/60 rounded-xl p-3.5 border border-slate-800 hover:border-slate-700 transition">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
              <Lightbulb className={`w-4 h-4 ${brLightState?.power === "ON" ? "text-amber-400" : "text-slate-500"}`} />
              Bedroom Light
            </span>
            <span
              className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                brLightState?.power === "ON"
                  ? "bg-amber-400/10 text-amber-300 border border-amber-400/20"
                  : "bg-slate-800 text-slate-400"
              }`}
            >
              {brLightState?.power}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => dispatchAction({ deviceId: "light_bedroom", actionType: "TURN_ON" })}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                brLightState?.power === "ON"
                  ? "bg-amber-500 text-black font-semibold"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              ON
            </button>
            <button
              onClick={() => dispatchAction({ deviceId: "light_bedroom", actionType: "TURN_OFF" })}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                brLightState?.power === "OFF"
                  ? "bg-slate-700 text-white font-semibold"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              OFF
            </button>
          </div>
        </div>

        {/* Main Door Lock */}
        <div className="bg-slate-900/60 rounded-xl p-3.5 border border-slate-800 hover:border-slate-700 transition">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
              {mainDoorState?.state === "LOCKED" ? (
                <Lock className="w-4 h-4 text-emerald-400" />
              ) : (
                <Unlock className="w-4 h-4 text-rose-400" />
              )}
              Main Door Lock
            </span>
            <span
              className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                mainDoorState?.state === "LOCKED"
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                  : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
              }`}
            >
              {mainDoorState?.state}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => dispatchAction({ deviceId: "lock_main_door", actionType: "LOCK" })}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                mainDoorState?.state === "LOCKED"
                  ? "bg-emerald-600 text-white font-semibold shadow-lg shadow-emerald-600/20"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              LOCK
            </button>
            <button
              onClick={() => dispatchAction({ deviceId: "lock_main_door", actionType: "UNLOCK" })}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                mainDoorState?.state === "UNLOCKED"
                  ? "bg-rose-600 text-white font-semibold shadow-lg shadow-rose-600/20"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              UNLOCK
            </button>
          </div>
        </div>

        {/* AC Climate Control */}
        <div className="bg-slate-900/60 rounded-xl p-3.5 border border-slate-800 hover:border-slate-700 transition md:col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
              <Wind className={`w-4 h-4 ${acState?.power === "ON" ? "text-cyan-400" : "text-slate-500"}`} />
              Living Room AC
            </span>
            <span
              className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                acState?.power === "ON"
                  ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                  : "bg-slate-800 text-slate-400"
              }`}
            >
              {acState?.power} ({acState?.targetTemperature}°C)
            </span>
          </div>
          <div className="flex items-center gap-1.5 mb-2">
            <button
              onClick={() => dispatchAction({ deviceId: "ac_living_room", actionType: "TURN_ON" })}
              className={`flex-1 py-1 rounded text-xs font-medium ${
                acState?.power === "ON" ? "bg-cyan-600 text-white font-semibold" : "bg-slate-800 text-slate-300"
              }`}
            >
              ON
            </button>
            <button
              onClick={() => dispatchAction({ deviceId: "ac_living_room", actionType: "TURN_OFF" })}
              className={`flex-1 py-1 rounded text-xs font-medium ${
                acState?.power === "OFF" ? "bg-slate-700 text-white font-semibold" : "bg-slate-800 text-slate-300"
              }`}
            >
              OFF
            </button>
          </div>
          <div className="flex items-center justify-between gap-1 pt-1 border-t border-slate-800/80">
            <span className="text-[10px] text-slate-400">Temp:</span>
            {[18, 20, 22, 24, 26].map((temp) => (
              <button
                key={temp}
                onClick={() => setTemperature("ac_living_room", temp)}
                className={`px-2 py-0.5 rounded text-[11px] font-mono font-medium transition ${
                  acState?.targetTemperature === temp
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-400/40"
                    : "bg-slate-800/80 text-slate-400 hover:text-slate-200"
                }`}
              >
                {temp}°
              </button>
            ))}
          </div>
        </div>

        {/* Bedroom Fan */}
        <div className="bg-slate-900/60 rounded-xl p-3.5 border border-slate-800 hover:border-slate-700 transition">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
              <Fan
                className={`w-4 h-4 ${
                  fanState?.power === "ON" ? "text-cyan-400 animate-spin" : "text-slate-500"
                }`}
                style={{ animationDuration: fanState?.speed === 3 ? "0.6s" : fanState?.speed === 2 ? "1.2s" : "2s" }}
              />
              Bedroom Fan
            </span>
            <span
              className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                fanState?.power === "ON"
                  ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                  : "bg-slate-800 text-slate-400"
              }`}
            >
              {fanState?.power === "ON" ? `Speed ${fanState.speed}` : "OFF"}
            </span>
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            <button
              onClick={() => setFanSpeed("fan_bedroom", 0)}
              className={`py-1.5 rounded-lg text-xs font-medium transition ${
                fanState?.speed === 0 ? "bg-slate-700 text-white font-semibold" : "bg-slate-800 text-slate-400 hover:bg-slate-700"
              }`}
            >
              OFF
            </button>
            <button
              onClick={() => setFanSpeed("fan_bedroom", 1)}
              className={`py-1.5 rounded-lg text-xs font-medium transition ${
                fanState?.speed === 1
                  ? "bg-cyan-600 text-white font-semibold shadow-lg shadow-cyan-600/20"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              1
            </button>
            <button
              onClick={() => setFanSpeed("fan_bedroom", 2)}
              className={`py-1.5 rounded-lg text-xs font-medium transition ${
                fanState?.speed === 2
                  ? "bg-cyan-600 text-white font-semibold shadow-lg shadow-cyan-600/20"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              2
            </button>
            <button
              onClick={() => setFanSpeed("fan_bedroom", 3)}
              className={`py-1.5 rounded-lg text-xs font-medium transition ${
                fanState?.speed === 3
                  ? "bg-cyan-600 text-white font-semibold shadow-lg shadow-cyan-600/20"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              3
            </button>
          </div>
        </div>

        {/* Living Room TV */}
        <div className="bg-slate-900/60 rounded-xl p-3.5 border border-slate-800 hover:border-slate-700 transition">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
              <Tv className={`w-4 h-4 ${tvPower ? "text-purple-400" : "text-slate-500"}`} />
              Living Room TV
            </span>
            <span
              className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                tvPower ? "bg-purple-500/10 text-purple-400 border border-purple-500/20" : "bg-slate-800 text-slate-400"
              }`}
            >
              {tvPower ? "ON" : "OFF"}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => dispatchAction({ deviceId: "tv_living_room", actionType: "TURN_ON" })}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                tvPower ? "bg-purple-600 text-white font-semibold shadow-lg shadow-purple-600/20" : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              ON
            </button>
            <button
              onClick={() => dispatchAction({ deviceId: "tv_living_room", actionType: "TURN_OFF" })}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                !tvPower ? "bg-slate-700 text-white font-semibold" : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              OFF
            </button>
          </div>
        </div>

        {/* Security System */}
        <div className="bg-slate-900/60 rounded-xl p-3.5 border border-slate-800 hover:border-slate-700 transition">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
              {secState?.state === "ARMED" ? (
                <ShieldAlert className="w-4 h-4 text-emerald-400" />
              ) : (
                <Shield className="w-4 h-4 text-slate-500" />
              )}
              Security System
            </span>
            <span
              className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                secState?.state === "ARMED"
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                  : "bg-slate-800 text-slate-400"
              }`}
            >
              {secState?.state}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => toggleSecurity("security_system", "STAY")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                secState?.state === "ARMED"
                  ? "bg-emerald-600 text-white font-semibold shadow-lg shadow-emerald-600/20"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              ARM
            </button>
            <button
              onClick={() => dispatchAction({ deviceId: "security_system", actionType: "DISARM" })}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                secState?.state === "DISARMED"
                  ? "bg-slate-700 text-white font-semibold"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              DISARM
            </button>
          </div>
        </div>

        {/* Curtains (Living Room) */}
        <div className="bg-slate-900/60 rounded-xl p-3.5 border border-slate-800 hover:border-slate-700 transition">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
              <Blinds className={`w-4 h-4 ${lrCurtainsState?.state === "OPEN" ? "text-blue-400" : "text-slate-500"}`} />
              Living Room Curtains
            </span>
            <span
              className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                lrCurtainsState?.state === "OPEN"
                  ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                  : "bg-slate-800 text-slate-400"
              }`}
            >
              {lrCurtainsState?.state}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => dispatchAction({ deviceId: "curtain_living_room", actionType: "OPEN_CURTAIN" })}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                lrCurtainsState?.state === "OPEN"
                  ? "bg-blue-600 text-white font-semibold shadow-lg shadow-blue-600/20"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              OPEN
            </button>
            <button
              onClick={() => dispatchAction({ deviceId: "curtain_living_room", actionType: "CLOSE_CURTAIN" })}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                lrCurtainsState?.state === "CLOSED"
                  ? "bg-slate-700 text-white font-semibold"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              CLOSE
            </button>
          </div>
        </div>

        {/* Power Outlets Hub */}
        <div className="bg-slate-900/60 rounded-xl p-3.5 border border-slate-800 hover:border-slate-700 transition">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-amber-400" />
              Smart Power Hub
            </span>
            <span className="text-[10px] font-mono text-slate-400">
              Phone & Laptop
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => toggleDevicePower("plug_phone_charger")}
              className={`px-2 py-1.5 rounded-lg text-xs font-medium transition truncate ${
                phonePlugPower
                  ? "bg-emerald-600 text-white font-semibold"
                  : "bg-slate-800 text-slate-400 hover:bg-slate-700"
              }`}
            >
              Phone: {phonePlugPower ? "ON" : "OFF"}
            </button>
            <button
              onClick={() => toggleDevicePower("plug_laptop_charger")}
              className={`px-2 py-1.5 rounded-lg text-xs font-medium transition truncate ${
                laptopPlugPower
                  ? "bg-emerald-600 text-white font-semibold"
                  : "bg-slate-800 text-slate-400 hover:bg-slate-700"
              }`}
            >
              Laptop: {laptopPlugPower ? "ON" : "OFF"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
