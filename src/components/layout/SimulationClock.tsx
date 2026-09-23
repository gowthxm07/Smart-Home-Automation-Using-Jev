"use client";

import React from "react";
import { useHome } from "@/context/HomeContext";
import { Clock, Play, FastForward, RotateCcw, Calendar } from "lucide-react";

export const SimulationClock: React.FC = () => {
  const {
    homeState,
    formattedSimulationTime,
    formattedSimulationDate,
    toggleClockMode,
    setClockSpeed,
    advanceSimulationTime,
  } = useHome();

  return (
    <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-800 rounded-xl px-3 py-1.5 shadow-inner">
      <div className="flex items-center gap-2 border-r border-slate-800 pr-3">
        <Clock className="w-4 h-4 text-cyan-400" />
        <div>
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-xs sm:text-sm font-bold text-white tracking-wide">
              {formattedSimulationTime}
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              {homeState.isSimulatedClock ? `SIM ${homeState.simulationSpeed}x` : "REAL"}
            </span>
          </div>
          <span className="text-[10px] text-slate-400 flex items-center gap-1">
            <Calendar className="w-2.5 h-2.5" />
            {formattedSimulationDate}
          </span>
        </div>
      </div>

      {/* Clock Controls */}
      <div className="flex items-center gap-1 pl-1">
        <button
          onClick={toggleClockMode}
          title={homeState.isSimulatedClock ? "Switch to Real System Time" : "Switch to Simulated Time"}
          className={`px-2 py-1 rounded text-[10px] font-mono font-medium transition ${
            homeState.isSimulatedClock
              ? "bg-blue-600/30 text-blue-300 border border-blue-500/40"
              : "bg-slate-800 text-slate-400 hover:text-white"
          }`}
        >
          {homeState.isSimulatedClock ? "Sim Mode" : "Real Mode"}
        </button>

        {homeState.isSimulatedClock && (
          <>
            <div className="flex items-center gap-0.5 bg-slate-950/80 p-0.5 rounded border border-slate-800">
              {[1, 5, 60].map((spd) => (
                <button
                  key={spd}
                  onClick={() => setClockSpeed(spd)}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition ${
                    homeState.simulationSpeed === spd
                      ? "bg-cyan-600 text-white font-bold"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {spd}x
                </button>
              ))}
            </div>

            <button
              onClick={() => advanceSimulationTime(15)}
              title="Advance simulated time by +15 minutes"
              className="px-2 py-1 rounded text-[10px] font-mono bg-slate-800 hover:bg-slate-700 text-slate-300 transition flex items-center gap-1"
            >
              <FastForward className="w-3 h-3 text-cyan-400" />
              +15m
            </button>
          </>
        )}
      </div>
    </div>
  );
};
