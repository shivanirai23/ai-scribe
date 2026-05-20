"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Wifi, WifiOff, Unplug, Mic, Volume2, X } from "lucide-react";

export type AlertType = "network-slow" | "no-network" | "socket-disconnected" | "microphone" | "voice-low";

interface Alert {
  type: AlertType;
  id: string;
}

const ALERT_CONFIG: Record<
  AlertType,
  { bg: string; border: string; iconColor: string; textColor: string; icon: React.ReactNode; title: string; message: string }
> = {
  "no-network": {
    bg: "bg-red-50",
    border: "border-red-200",
    iconColor: "text-red-600",
    textColor: "text-red-700",
    icon: <WifiOff className="h-5 w-5" />,
    title: "No Connection",
    message: "Connection lost. Trying to reconnect…",
  },
  "socket-disconnected": {
    bg: "bg-yellow-50",
    border: "border-yellow-200",
    iconColor: "text-yellow-600",
    textColor: "text-yellow-700",
    icon: <Unplug className="h-5 w-5" />,
    title: "Disconnected",
    message: "Connection lost. Trying to reconnect…",
  },
  "network-slow": {
    bg: "bg-orange-50",
    border: "border-orange-200",
    iconColor: "text-orange-600",
    textColor: "text-orange-700",
    icon: <Wifi className="h-5 w-5" />,
    title: "Slow Connection",
    message: "Please check your internet connection.",
  },
  microphone: {
    bg: "bg-red-50",
    border: "border-red-200",
    iconColor: "text-red-600",
    textColor: "text-red-700",
    icon: <Mic className="h-5 w-5" />,
    title: "Microphone Issue",
    message: "No voice detected for some time. Please check your microphone settings.",
  },
  "voice-low": {
    bg: "bg-yellow-50",
    border: "border-yellow-200",
    iconColor: "text-yellow-600",
    textColor: "text-yellow-700",
    icon: <Volume2 className="h-5 w-5" />,
    title: "Low Voice",
    message: "Please speak louder or move closer to your microphone.",
  },
};

interface AlertBannerProps {
  alerts: Alert[];
  onDismiss: (id: string) => void;
}

export function AlertBanners({ alerts, onDismiss }: AlertBannerProps) {
  return (
    <div className="space-y-2">
      <AnimatePresence>
        {alerts.map((alert) => {
          const cfg = ALERT_CONFIG[alert.type];
          return (
            <motion.div
              key={alert.id}
              initial={{ opacity: 0, y: -50, height: 0 }}
              animate={{ opacity: 1, y: 0, height: "auto" }}
              exit={{ opacity: 0, y: -20, height: 0 }}
              transition={{ duration: 0.3 }}
              className={`${cfg.bg} ${cfg.border} border rounded-lg p-4 shadow-sm overflow-hidden`}
            >
              <div className="flex items-start space-x-3">
                <div className={`${cfg.iconColor} mt-0.5`}>{cfg.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className={`text-sm font-medium ${cfg.textColor}`}>{cfg.title}</h3>
                      <p className={`text-sm ${cfg.textColor} opacity-90 mt-1`}>{cfg.message}</p>
                    </div>
                    <button
                      onClick={() => onDismiss(alert.id)}
                      className={`${cfg.textColor} hover:bg-white/50 p-1 h-7 w-7 flex items-center justify-center rounded transition-colors ml-2`}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
