import React from "react";
import {
  Lightbulb,
  Fan,
  Wind,
  Thermometer,
  Tv,
  Lock,
  Unlock,
  Shield,
  ShieldAlert,
  Blinds,
  Zap,
  Power,
} from "lucide-react";
import { Device, DeviceCategory } from "@/types/device";

interface DeviceIconProps {
  device: Device;
  className?: string;
}

export const DeviceIcon: React.FC<DeviceIconProps> = ({ device, className = "w-5 h-5" }) => {
  const cat = device.category;
  const isPowerOn = "power" in device.state ? device.state.power === "ON" : false;

  switch (cat) {
    case "LIGHT":
      return (
        <Lightbulb
          className={`${className} ${
            isPowerOn ? "text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]" : "text-slate-500"
          }`}
        />
      );
    case "CLIMATE":
      if ("speed" in device.state) {
        return (
          <Fan
            className={`${className} ${
              isPowerOn ? "text-cyan-400 animate-spin" : "text-slate-500"
            }`}
            style={{
              animationDuration:
                device.state.speed === 3 ? "0.6s" : device.state.speed === 2 ? "1.2s" : "2s",
            }}
          />
        );
      }
      if ("ambientTemperature" in device.state) {
        return <Thermometer className={`${className} text-cyan-400`} />;
      }
      return <Wind className={`${className} ${isPowerOn ? "text-cyan-400" : "text-slate-500"}`} />;
    case "ENTERTAINMENT":
      return (
        <Tv
          className={`${className} ${
            isPowerOn ? "text-purple-400 drop-shadow-[0_0_8px_rgba(168,85,247,0.5)]" : "text-slate-500"
          }`}
        />
      );
    case "SECURITY":
      if ("state" in device.state) {
        if (device.id.includes("lock")) {
          return device.state.state === "LOCKED" ? (
            <Lock className={`${className} text-emerald-400`} />
          ) : (
            <Unlock className={`${className} text-rose-400`} />
          );
        }
        return device.state.state === "ARMED" ? (
          <ShieldAlert className={`${className} text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]`} />
        ) : (
          <Shield className={`${className} text-slate-500`} />
        );
      }
      return <Shield className={className} />;
    case "CURTAIN":
      return (
        <Blinds
          className={`${className} ${
            device.state && "state" in device.state && device.state.state === "OPEN"
              ? "text-blue-400"
              : "text-slate-500"
          }`}
        />
      );
    case "POWER":
      return (
        <Zap
          className={`${className} ${
            isPowerOn ? "text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "text-slate-500"
          }`}
        />
      );
    default:
      return <Power className={className} />;
  }
};
