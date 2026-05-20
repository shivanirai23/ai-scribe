"use client";

import { formatTime } from "@/lib/utils";

interface PictureInPictureProps {
  visible: boolean;
  recordingTime: number;
  isSpeechDetected: boolean;
  previewText: string;
  onPause: () => void;
  onStop: () => void;
}

export function PictureInPicture({
  visible,
  recordingTime,
  isSpeechDetected,
  previewText,
  onPause,
  onStop,
}: PictureInPictureProps) {
  if (!visible) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-white rounded-2xl shadow-lg border border-slate-100 p-3 w-64">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-slate-700">Recording</span>
        <span className="font-mono text-sm text-slate-700">{formatTime(recordingTime)}</span>
      </div>
      <div className="flex items-center gap-2 mb-3">
        <div className="h-2 w-2 rounded-full bg-brand-green animate-pulse" />
        <span className="text-xs text-slate-500">
          {isSpeechDetected ? "Speech detected" : "Listening"}
        </span>
      </div>
      <div className="bg-slate-50 rounded-lg p-2 mb-3 text-xs text-slate-600 max-h-16 overflow-hidden">
        {previewText || "No transcription yet..."}
      </div>
      <div className="flex gap-2">
        <button
          onClick={onPause}
          className="flex-1 bg-brand-orange text-white rounded-lg py-1.5 text-xs font-medium"
        >
          Pause
        </button>
        <button
          onClick={onStop}
          className="flex-1 bg-brand-pink text-white rounded-lg py-1.5 text-xs font-medium"
        >
          Stop
        </button>
      </div>
    </div>
  );
}
