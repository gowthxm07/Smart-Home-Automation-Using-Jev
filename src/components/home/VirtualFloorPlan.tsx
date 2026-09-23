"use client";

import React, { useState } from "react";
import { useHome } from "@/context/HomeContext";
import { RoomId } from "@/types/device";
import { DeviceCard } from "@/components/devices/DeviceCard";
import { Home, Bed, Utensils, DoorOpen, Briefcase, LayoutGrid } from "lucide-react";

export const VirtualFloorPlan: React.FC = () => {
  const { homeState } = useHome();
  const [selectedRoom, setSelectedRoom] = useState<RoomId | "ALL">("ALL");

  const getRoomIcon = (roomId: RoomId) => {
    switch (roomId) {
      case "living_room":
        return <Home className="w-4 h-4" />;
      case "bedroom":
        return <Bed className="w-4 h-4" />;
      case "kitchen":
        return <Utensils className="w-4 h-4" />;
      case "entrance":
        return <DoorOpen className="w-4 h-4" />;
      case "study":
        return <Briefcase className="w-4 h-4" />;
    }
  };

  const devicesList = Object.values(homeState.devices);

  const filteredDevices =
    selectedRoom === "ALL"
      ? devicesList
      : devicesList.filter((d) => d.roomId === selectedRoom);

  return (
    <div className="glass-panel rounded-2xl p-5 border border-slate-800 shadow-xl space-y-5">
      {/* Header and Filter Tabs */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse-subtle"></span>
            <h2 className="text-base font-semibold text-slate-100">Virtual Smart Home Environment</h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            5 Simulated Zones &bull; 18 Virtual Multi-Attribute Devices
          </p>
        </div>

        {/* Room Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1 sm:pb-0">
          <button
            onClick={() => setSelectedRoom("ALL")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition whitespace-nowrap ${
              selectedRoom === "ALL"
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                : "bg-slate-900/80 text-slate-400 hover:text-slate-200 border border-slate-800"
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            All Rooms ({devicesList.length})
          </button>

          {homeState.rooms.map((room) => {
            const count = devicesList.filter((d) => d.roomId === room.id).length;
            const isSelected = selectedRoom === room.id;
            return (
              <button
                key={room.id}
                onClick={() => setSelectedRoom(room.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition whitespace-nowrap ${
                  isSelected
                    ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                    : "bg-slate-900/80 text-slate-400 hover:text-slate-200 border border-slate-800"
                }`}
              >
                {getRoomIcon(room.id)}
                {room.name} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Room Summary Cards Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {homeState.rooms.map((room) => {
          const roomDevices = devicesList.filter((d) => d.roomId === room.id);
          const activeInRoom = roomDevices.filter((d) => {
            if ("power" in d.state) return d.state.power === "ON";
            if ("state" in d.state) {
              return d.state.state === "OPEN" || d.state.state === "ARMED" || d.state.state === "UNLOCKED";
            }
            return false;
          }).length;

          const isCurrentFilter = selectedRoom === room.id;

          return (
            <div
              key={room.id}
              onClick={() => setSelectedRoom(selectedRoom === room.id ? "ALL" : room.id)}
              className={`cursor-pointer rounded-xl p-3 border transition-all ${
                isCurrentFilter
                  ? "bg-blue-950/40 border-blue-500/50 shadow-md shadow-blue-500/10"
                  : "bg-slate-900/50 border-slate-800 hover:border-slate-700"
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-slate-400">{getRoomIcon(room.id)}</span>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                    activeInRoom > 0
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      : "bg-slate-800 text-slate-500"
                  }`}
                >
                  {activeInRoom} Active
                </span>
              </div>
              <h4 className="text-xs font-semibold text-slate-200">{room.name}</h4>
              <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{roomDevices.length} devices</p>
            </div>
          );
        })}
      </div>

      {/* Devices Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pt-1">
        {filteredDevices.map((device) => (
          <DeviceCard key={device.id} device={device} />
        ))}
      </div>
    </div>
  );
};
