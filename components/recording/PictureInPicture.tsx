"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { X, Mic, PictureInPicture2 } from "lucide-react";
import { formatTime } from "@/lib/utils";

interface PictureInPictureProps {
  recordingTime: number;
  isSpeechDetected: boolean;
  isPaused: boolean;
  previewText: string;
  onPause: () => void;
  onStop: () => void;
}

export function PictureInPicture({
  recordingTime,
  isSpeechDetected,
  isPaused,
  previewText,
  onPause,
  onStop,
}: PictureInPictureProps) {
  const [isPiPOpen, setIsPiPOpen] = useState(false);
  const [useFallbackWindow, setUseFallbackWindow] = useState(false);
  const pipWindowRef = useRef<Window | null>(null);
  const onPauseRef = useRef(onPause);
  const onStopRef = useRef(onStop);

  useEffect(() => {
    onPauseRef.current = onPause;
    onStopRef.current = onStop;
  }, [onPause, onStop]);

  const updatePiPDocument = useCallback(() => {
    const pipWindow = pipWindowRef.current;
    if (!pipWindow || pipWindow.closed) return;

    const doc = pipWindow.document;
    const timerEl = doc.getElementById("pip-timer");
    const statusEl = doc.getElementById("pip-status");
    const textEl = doc.getElementById("pip-preview");
    const pauseBtn = doc.getElementById("pip-pause-btn");

    if (timerEl) timerEl.textContent = formatTime(recordingTime);
    if (statusEl) statusEl.textContent = isSpeechDetected ? "Listening to speech..." : "Waiting for speech...";
    if (textEl) textEl.textContent = previewText || "Waiting for transcription...";
    if (pauseBtn) pauseBtn.textContent = isPaused ? "Resume" : "Pause";
  }, [recordingTime, isSpeechDetected, previewText, isPaused]);

  const closePiP = () => {
    if (pipWindowRef.current && !pipWindowRef.current.closed) {
      pipWindowRef.current.close();
    }
    pipWindowRef.current = null;
    setUseFallbackWindow(false);
    setIsPiPOpen(false);
  };

  const openNativePiP = async () => {
    const api = (window as Window & {
      documentPictureInPicture?: {
        requestWindow: (options?: { width?: number; height?: number }) => Promise<Window>;
      };
    }).documentPictureInPicture;

    if (!api?.requestWindow) return false;

    const pipWindow = await api.requestWindow({ width: 320, height: 430 });
    pipWindowRef.current = pipWindow;

    pipWindow.document.body.innerHTML = `
      <style>
        * { box-sizing: border-box; font-family: ui-sans-serif, system-ui, sans-serif; }
        body { margin: 0; background: #f4f7fb; color: #334155; }
        .wrap { height: 100vh; padding: 10px; }
        .card { border: 1px solid #dbe4ee; border-radius: 12px; background: #fff; box-shadow: 0 8px 20px rgba(15,23,42,0.14); overflow: hidden; }
        .head { background: linear-gradient(90deg, #e5649f, #f7941d); color: #fff; padding: 10px 12px; font-size: 12px; font-weight: 700; display: flex; gap: 8px; align-items: center; }
        .dot { width: 10px; height: 10px; border-radius: 999px; background: #8cc63f; }
        .meta { padding: 10px 12px 6px; font-size: 12px; color: #64748b; display: flex; justify-content: space-between; align-items: center; }
        .status { margin: 0 12px 8px; border-radius: 8px; background: #f8fafc; border: 1px solid #e2e8f0; padding: 8px; font-size: 12px; text-align: center; }
        .title { color: #29abe2; font-size: 12px; font-weight: 700; letter-spacing: 0.03em; margin: 0 12px 6px; }
        .preview { margin: 0 12px 10px; border-radius: 10px; background: #f8fafc; border: 1px solid #e2e8f0; padding: 10px; min-height: 160px; max-height: 180px; overflow: auto; color: #64748b; font-size: 12px; white-space: pre-wrap; }
        .actions { display: flex; gap: 8px; padding: 0 12px 12px; }
        .btn { border: none; border-radius: 8px; color: #fff; padding: 8px 10px; font-size: 12px; font-weight: 700; cursor: pointer; flex: 1; }
        .pause { background: #f7941d; }
        .stop { background: #e5649f; }
      </style>
      <div class="wrap">
        <div class="card">
          <div class="head"><span class="dot"></span>Recording in Progress</div>
          <div class="meta"><span>Live session</span><span id="pip-timer">00:00</span></div>
          <div id="pip-status" class="status">Waiting for speech...</div>
          <div class="title">LIVE TRANSCRIPTION</div>
          <div id="pip-preview" class="preview">Waiting for transcription...</div>
          <div class="actions">
            <button id="pip-pause-btn" class="btn pause">Pause</button>
            <button id="pip-stop-btn" class="btn stop">Stop Recording</button>
          </div>
        </div>
      </div>
    `;

    pipWindow.document.getElementById("pip-pause-btn")?.addEventListener("click", () => {
      onPauseRef.current();
    });
    pipWindow.document.getElementById("pip-stop-btn")?.addEventListener("click", () => {
      onStopRef.current();
    });

    pipWindow.addEventListener("pagehide", () => {
      pipWindowRef.current = null;
      setIsPiPOpen(false);
      setUseFallbackWindow(false);
    });

    updatePiPDocument();
    return true;
  };

  const openPiP = async () => {
    try {
      const opened = await openNativePiP();
      if (opened) {
        setUseFallbackWindow(false);
        setIsPiPOpen(true);
        return;
      }
    } catch {
      // Fallback overlay below.
    }

    setUseFallbackWindow(true);
    setIsPiPOpen(true);
  };

  useEffect(() => {
    return () => {
      if (pipWindowRef.current && !pipWindowRef.current.closed) {
        pipWindowRef.current.close();
      }
      pipWindowRef.current = null;
    };
  }, []);

  useEffect(() => {
    updatePiPDocument();
  }, [updatePiPDocument]);

  return (
    <>
      {useFallbackWindow && isPiPOpen && (
        <div className="fixed right-8 top-36 z-50 w-[320px] bg-white rounded-xl border border-slate-200 shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-brand-pink to-brand-orange px-4 py-3 text-white text-sm font-semibold flex items-center gap-2">
            <div className="h-4 w-4 rounded-full bg-brand-green flex items-center justify-center">
              <Mic className="h-2.5 w-2.5 text-white" />
            </div>
            Recording in Progress
          </div>
          <div className="p-3 bg-white">
            <div className="text-xs text-slate-500 mb-2 flex justify-between">
              <span>Live session</span>
              <span className="font-mono">{formatTime(recordingTime)}</span>
            </div>
            <div className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg p-2 mb-3 text-center">
              {isSpeechDetected ? "Listening to speech..." : "Waiting for speech..."}
            </div>
            <div className="text-[11px] font-semibold text-brand-blue mb-1">LIVE TRANSCRIPTION</div>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-2 mb-3 text-xs text-slate-500 min-h-[140px] max-h-[160px] overflow-auto">
              {previewText || "Waiting for transcription..."}
            </div>
            <div className="flex gap-2">
              <button
                onClick={onPause}
                className="flex-1 bg-brand-orange text-white rounded-lg py-2 text-xs font-semibold"
              >
                {isPaused ? "Resume" : "Pause"}
              </button>
              <button
                onClick={onStop}
                className="flex-1 bg-brand-pink text-white rounded-lg py-2 text-xs font-semibold"
              >
                Stop Recording
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="fixed bottom-4 right-4 z-50">
        {!isPiPOpen ? (
          <button
            onClick={() => void openPiP()}
            className="h-11 rounded-full px-5 text-sm font-semibold text-white shadow-lg bg-gradient-to-r from-brandLight-pink via-brand-orange to-brandLight-orange flex items-center gap-2"
          >
            <PictureInPicture2 className="h-4 w-4" />
            Open Picture-in-Picture
          </button>
        ) : (
          <button
            onClick={closePiP}
            className="h-11 rounded-full px-5 text-sm font-semibold text-white shadow-lg bg-[#ef4444] flex items-center gap-2"
          >
            <X className="h-4 w-4" />
            Close PiP Window
          </button>
        )}
      </div>
    </>
  );
}
