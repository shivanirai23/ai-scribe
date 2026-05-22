"use client";

import { motion } from "framer-motion";
import { Mic, Play, Pause } from "lucide-react";
import { formatTime } from "@/lib/utils";

interface RecorderPanelProps {
  visitId: string | null;
  isRecording: boolean;
  isPaused: boolean;
  isSpeechDetected: boolean;
  isConnected: boolean;
  isConnecting: boolean;
  recordingTime: number;
  onStartVisit: () => void;
  onStartRecording: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
}

export function RecorderPanel({
  visitId,
  isRecording,
  isPaused,
  isSpeechDetected,
  isConnected,
  isConnecting,
  recordingTime,
  onStartVisit,
  onStartRecording,
  onPause,
  onResume,
  onStop,
}: RecorderPanelProps) {
  // State A: No visit started
  if (!visitId) {
    return (
      <div className="bg-white rounded-2xl p-8 flex justify-center items-center shadow-[0_2px_6px_rgba(0,0,0,0.04),0_0_16px_2px_rgba(191,223,241,0.9)]">
        <div className="flex flex-col items-center h-full">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-center h-full justify-center gap-6"
          >
            <button
              onClick={onStartVisit}
              className="bg-brand-green hover:bg-opacity-90 text-white rounded-xl px-6 py-3 text-base font-medium shadow-md hover:shadow-lg transition-all"
            >
              Start Visit
            </button>
          </motion.div>
        </div>
      </div>
    );
  }

  // States B / C / D: Visit started
  const micBgColor = isRecording
    ? isPaused
      ? "bg-brand-orange"
      : "bg-brand-pink"
    : "bg-brand-green";

  const pulseBgColor = isPaused
    ? "bg-brand-orange"
    : isSpeechDetected
      ? "bg-brand-green"
      : "bg-brand-pink";

  return (
    <div className="bg-white rounded-2xl p-6 flex justify-center items-center shadow-[0_2px_6px_rgba(0,0,0,0.04),0_0_16px_2px_rgba(191,223,241,0.9)]">
      <div className="flex flex-col items-center h-full">
        {/* Mic circle with pulse */}
        <div className="relative mb-8">
          {isRecording && (
            <motion.div
              className="absolute -inset-6"
              animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.2, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <div className={`absolute inset-0 rounded-full ${pulseBgColor} opacity-60`} />
            </motion.div>
          )}
          <div
            className={`h-28 w-28 rounded-full ${micBgColor} flex items-center justify-center shadow-lg relative z-10`}
          >
            {isRecording ? (
              isPaused ? (
                <Play className="h-12 w-12 text-white" />
              ) : (
                <Pause className="h-12 w-12 text-white" />
              )
            ) : (
              <Mic className="h-12 w-12 text-white" />
            )}
          </div>
        </div>

        {/* Connection status or timer */}
        {!isRecording && (
          <div className="text-base text-slate-500 mb-6">
            {isConnecting ? "Connecting..." : isConnected ? "Connected" : "Disconnected"}
          </div>
        )}

        {isRecording && (
          <div className="text-xl font-mono mb-6 text-slate-700">
            {formatTime(recordingTime)}
            {isSpeechDetected && (
              <span className="text-brand-green ml-2 text-base">(Speech detected)</span>
            )}
          </div>
        )}

        {/* Buttons */}
        {!isRecording ? (
          isConnected ? (
            <button
              onClick={onStartRecording}
              className="bg-brand-green hover:bg-opacity-90 text-white rounded-xl px-6 py-3 text-base font-medium shadow-md hover:shadow-lg transition-all"
            >
              Start Recording
            </button>
          ) : (
            <div className="text-sm text-slate-500">
              {isConnecting
                ? "Preparing live transcription socket..."
                : "Socket not connected. Please start visit again."}
            </div>
          )
        ) : (
          <div className="flex space-x-4">
            <button
              onClick={isPaused ? onResume : onPause}
              className="bg-brand-orange hover:bg-opacity-90 text-white rounded-xl px-6 py-3 text-base font-medium shadow-md hover:shadow-lg transition-all"
            >
              {isPaused ? "Resume" : "Pause"}
            </button>
            <button
              onClick={onStop}
              className="bg-brand-pink hover:bg-opacity-90 text-white rounded-xl px-6 py-3 text-base font-medium shadow-md hover:shadow-lg transition-all"
            >
              Stop Recording
            </button>
          </div>
        )}

        {/* Status text */}
        {isRecording && (
          <div className="mt-4 text-sm text-slate-500">
            {isPaused
              ? "Recording paused"
              : isSpeechDetected
                ? "Listening to speech..."
                : "Waiting for speech..."}
          </div>
        )}


      </div>
    </div>
  );
}
