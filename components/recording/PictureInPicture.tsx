"use client";

import { useEffect, useRef, useState } from "react";
import { useAppSelector } from "@/store/hooks";
import { formatTime } from "@/lib/utils";

interface PictureInPictureProps {
  isPaused: boolean;
  recordingTime: number;
  isSpeechDetected: boolean;
  transcriptionText: string | string[];
  onPause?: () => void;
  onResume?: () => void;
  onStop?: () => void;
}

declare global {
  interface Window {
    documentPictureInPicture?: {
      requestWindow(options?: { width?: number; height?: number }): Promise<Window>;
      window: Window | null;
    };
    __openAIScribePiP?: () => void;
  }
}

export function PictureInPicture({
  isPaused,
  recordingTime,
  isSpeechDetected,
  transcriptionText,
  onPause,
  onResume,
  onStop,
}: PictureInPictureProps) {
  const isRecording = useAppSelector((state) => state.recording.isRecording);
  const pipWindowRef = useRef<Window | null>(null);
  const [isPipSupported, setIsPipSupported] = useState(false);
  const [isPipOpen, setIsPipOpen] = useState(false);
  const [hasUserGesture, setHasUserGesture] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const pendingPipOpenRef = useRef(false);
  const promptTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pauseHandlerRef = useRef<(() => void) | null>(null);
  const stopHandlerRef = useRef<(() => void) | null>(null);

  // Keep latest handlers accessible from stale closures
  const onPauseRef = useRef(onPause);
  const onResumeRef = useRef(onResume);
  const onStopRef = useRef(onStop);
  const isPausedRef = useRef(isPaused);
  useEffect(() => { onPauseRef.current = onPause; }, [onPause]);
  useEffect(() => { onResumeRef.current = onResume; }, [onResume]);
  useEffect(() => { onStopRef.current = onStop; }, [onStop]);
  useEffect(() => { isPausedRef.current = isPaused; }, [isPaused]);

  const isRecordingRef = useRef(isRecording);
  const hasUserGestureRef = useRef(hasUserGesture);
  const isPipOpenRef = useRef(isPipOpen);
  useEffect(() => { isRecordingRef.current = isRecording; }, [isRecording]);
  useEffect(() => { hasUserGestureRef.current = hasUserGesture; }, [hasUserGesture]);
  useEffect(() => { isPipOpenRef.current = isPipOpen; }, [isPipOpen]);

  const formatTranscriptionLines = (text: string | string[]): string => {
    const combined = Array.isArray(text) ? text.join(" ") : text;
    const lines = combined.split(/[.!?]+/).filter((l) => l.trim().length > 0);
    if (lines.length === 0) return "";
    return lines.map((l) => `<div class="pip-line">${l.trim()}.</div>`).join("");
  };

  const closePipWindow = () => {
    if (pipWindowRef.current && !pipWindowRef.current.closed) {
      pipWindowRef.current.close();
    }
    pipWindowRef.current = null;
    setIsPipOpen(false);
  };

  // Build the full PiP page HTML
  const buildPipHtml = () => {
    const time = formatTime(recordingTime);
    const statusText = isPaused
      ? "Recording Paused"
      : isSpeechDetected
      ? "Listening to speech..."
      : "Waiting for speech...";
    const transcriptionHtml = (() => {
      const hasContent = Array.isArray(transcriptionText)
        ? transcriptionText.length > 0
        : transcriptionText && transcriptionText.length > 0;
      if (!hasContent) return `<span class="empty">Waiting for transcription...</span>`;
      return formatTranscriptionLines(transcriptionText) + (!isPaused ? `<span class="cursor"></span>` : "");
    })();

    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
      *{margin:0;padding:0;box-sizing:border-box}
      body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#fff;overflow:hidden;height:100vh}
      .container{display:flex;flex-direction:column;height:100vh}
      .header{background:linear-gradient(to right,#e5649f,#f7941d);padding:12px;display:flex;align-items:center;gap:8px;color:#fff}
      .icon{width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:16px;background:#8cc63f}
      .icon.paused{background:#f7941d}
      .header-text{flex:1}
      .header-title{font-weight:600;font-size:14px}
      .header-time{font-family:monospace;font-size:12px;opacity:.9}
      .content{flex:1;padding:14px;display:flex;flex-direction:column;gap:10px;overflow:hidden}
      .status{text-align:center;padding:10px;background:#f8f9fa;border-radius:8px;font-size:13px;color:#495057;font-weight:500;display:flex;align-items:center;justify-content:center;gap:6px}
      .dot{width:8px;height:8px;border-radius:50%;background:#8cc63f;animation:blink 1.5s ease-in-out infinite;flex-shrink:0}
      @keyframes blink{0%,100%{opacity:1}50%{opacity:.3}}
      .transcription-box{background:#f8f9fa;border-radius:8px;padding:12px;flex:1;overflow-y:auto;border:1px solid #e9ecef}
      .transcription-label{font-size:11px;font-weight:600;color:#29abe2;margin-bottom:8px;text-transform:uppercase;letter-spacing:.5px}
      .transcription-body{font-size:13px;line-height:1.6;color:#212529}
      .pip-line{margin-bottom:8px;padding-bottom:6px;border-bottom:1px solid #f0f0f0}
      .pip-line:last-of-type{border-bottom:none}
      .empty{font-size:13px;color:#adb5bd;font-style:italic}
      .cursor{display:inline-block;width:2px;height:14px;background:#29abe2;margin-left:2px;animation:blink .7s ease-in-out infinite}
      .controls{padding:12px;display:flex;gap:8px;justify-content:center;border-top:1px solid #e9ecef}
      .btn{padding:8px 16px;border:none;border-radius:8px;font-size:13px;font-weight:500;cursor:pointer;color:#fff;transition:opacity .2s}
      .btn:hover{opacity:.9}
      .btn-pause{background:#f7941d}
      .btn-stop{background:#e5649f}
    </style></head><body>
    <div class="container">
      <div class="header">
        <div class="icon${isPaused ? " paused" : ""}" id="pip-icon">${isPaused ? "⏸" : "🎤"}</div>
        <div class="header-text">
          <div class="header-title">Recording in Progress</div>
          <div class="header-time" id="pip-timer">${time}</div>
        </div>
      </div>
      <div class="content">
        <div class="status">
          ${!isPaused ? `<div class="dot"></div>` : ""}
          <span id="pip-status">${statusText}</span>
        </div>
        <div class="transcription-box">
          <div class="transcription-label">Live Transcription</div>
          <div class="transcription-body" id="pip-transcription">${transcriptionHtml}</div>
        </div>
      </div>
      <div class="controls">
        <button class="btn btn-pause" id="pip-pause-btn">${isPaused ? "▶ Resume" : "⏸ Pause"}</button>
        <button class="btn btn-stop" id="pip-stop-btn">⏹ Stop Recording</button>
      </div>
    </div>
    </body></html>`;
  };

  const openPipWindow = async () => {
    if (!isPipSupported || !window.documentPictureInPicture) return;
    try {
      if (pipWindowRef.current && !pipWindowRef.current.closed) {
        pipWindowRef.current.close();
      }

      const pipWindow = await window.documentPictureInPicture.requestWindow({ width: 400, height: 500 });
      pipWindowRef.current = pipWindow;
      setIsPipOpen(true);

      pipWindow.document.write(buildPipHtml());
      pipWindow.document.close();

      pauseHandlerRef.current = () => {
        if (isPausedRef.current) {
          onResumeRef.current?.();
        } else {
          onPauseRef.current?.();
        }
      };

      stopHandlerRef.current = () => {
        window.focus();
        onStopRef.current?.();
        setTimeout(() => { pipWindow.close(); }, 100);
      };

      pipWindow.document.getElementById("pip-pause-btn")?.addEventListener("click", () => {
        pauseHandlerRef.current?.();
      });
      pipWindow.document.getElementById("pip-stop-btn")?.addEventListener("click", () => {
        stopHandlerRef.current?.();
      });

      pipWindow.addEventListener("pagehide", () => {
        setIsPipOpen(false);
        pipWindowRef.current = null;
      });
    } catch {
      // PiP failed — handled by caller
    }
  };

  // Check support and expose global trigger
  useEffect(() => {
    const supported = "documentPictureInPicture" in window;
    setIsPipSupported(supported);
    if (supported) {
      window.__openAIScribePiP = () => { void openPipWindow(); };
    }
    return () => { delete window.__openAIScribePiP; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Capture user gesture for later use
  useEffect(() => {
    if (!isRecording || !isPipSupported) return;
    const capture = () => {
      setHasUserGesture(true);
      if (showPrompt) {
        setShowPrompt(false);
        if (promptTimeoutRef.current) clearTimeout(promptTimeoutRef.current);
      }
    };
    document.addEventListener("mousedown", capture, true);
    document.addEventListener("keydown", capture, true);
    document.addEventListener("click", capture, true);
    document.addEventListener("touchstart", capture, true);
    return () => {
      document.removeEventListener("mousedown", capture, true);
      document.removeEventListener("keydown", capture, true);
      document.removeEventListener("click", capture, true);
      document.removeEventListener("touchstart", capture, true);
    };
  }, [isRecording, isPipSupported, showPrompt]);

  // Auto-set gesture flag when recording starts
  useEffect(() => {
    if (isRecording && !hasUserGesture && isPipSupported) {
      setHasUserGesture(true);
    }
  }, [isRecording, hasUserGesture, isPipSupported]);

  // Visibility-change: auto-open on hide, auto-close on return (Google Meet behavior)
  useEffect(() => {
    if (!isPipSupported) return;

    const handleVisibilityChange = async () => {
      const hidden = document.hidden;
      const recording = isRecordingRef.current;
      const gesture = hasUserGestureRef.current;
      const pipOpen = isPipOpenRef.current;

      if (hidden && recording && !pipOpen) {
        if (gesture) {
          try { await openPipWindow(); } catch { pendingPipOpenRef.current = true; }
        } else {
          pendingPipOpenRef.current = true;
        }
      } else if (!hidden && pipOpen) {
        closePipWindow();
        pendingPipOpenRef.current = false;
      } else if (!hidden && !pipOpen && recording && pendingPipOpenRef.current) {
        setShowPrompt(true);
        if (promptTimeoutRef.current) clearTimeout(promptTimeoutRef.current);
        promptTimeoutRef.current = setTimeout(() => {
          setShowPrompt(false);
          pendingPipOpenRef.current = false;
        }, 8000);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (promptTimeoutRef.current) clearTimeout(promptTimeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPipSupported]);

  // Sync live state into open PiP window
  useEffect(() => {
    const pipWindow = pipWindowRef.current;
    if (!pipWindow || pipWindow.closed) return;
    const doc = pipWindow.document;

    const timerEl = doc.getElementById("pip-timer");
    if (timerEl) timerEl.textContent = formatTime(recordingTime);

    const statusEl = doc.getElementById("pip-status");
    if (statusEl) statusEl.textContent = isPaused ? "Recording Paused" : isSpeechDetected ? "Listening to speech..." : "Waiting for speech...";

    const transcriptionEl = doc.getElementById("pip-transcription");
    const transcriptionBox = doc.querySelector(".transcription-box");
    if (transcriptionEl) {
      const hasContent = Array.isArray(transcriptionText)
        ? transcriptionText.length > 0
        : transcriptionText && transcriptionText.length > 0;
      transcriptionEl.innerHTML = hasContent
        ? formatTranscriptionLines(transcriptionText) + (!isPaused ? `<span class="cursor"></span>` : "")
        : `<span class="empty">Waiting for transcription...</span>`;
      if (transcriptionBox && !isPaused) {
        requestAnimationFrame(() => { transcriptionBox.scrollTop = transcriptionBox.scrollHeight; });
      }
    }

    const pauseBtn = doc.getElementById("pip-pause-btn");
    if (pauseBtn) {
      pauseBtn.textContent = isPaused ? "▶ Resume" : "⏸ Pause";
      pauseBtn.className = "btn btn-pause";
    }

    const iconEl = doc.getElementById("pip-icon");
    if (iconEl) {
      iconEl.className = `icon${isPaused ? " paused" : ""}`;
      iconEl.textContent = isPaused ? "⏸" : "🎤";
    }

    // Keep pause handler in sync
    pauseHandlerRef.current = () => {
      if (isPausedRef.current) { onResumeRef.current?.(); } else { onPauseRef.current?.(); }
    };
  }, [recordingTime, isPaused, isSpeechDetected, transcriptionText]);

  // Close PiP when recording stops
  useEffect(() => {
    if (!isRecording && isPipOpen) closePipWindow();
  }, [isRecording, isPipOpen]);

  // Reset gesture flag when recording stops
  useEffect(() => {
    if (!isRecording) {
      setHasUserGesture(false);
      pendingPipOpenRef.current = false;
    }
  }, [isRecording]);

  // Cleanup on unmount
  useEffect(() => {
    return () => { closePipWindow(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dismissPrompt = () => {
    setShowPrompt(false);
    pendingPipOpenRef.current = false;
    if (promptTimeoutRef.current) clearTimeout(promptTimeoutRef.current);
  };

  return (
    <>
      {/* Toast prompt when auto-open failed */}
      {showPrompt && isRecording && !isPipOpen && isPipSupported && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[10000] bg-gradient-to-r from-brand-pink via-brand-orange to-brand-green text-white px-6 py-4 rounded-2xl shadow-2xl max-w-md">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 mt-0.5">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="font-bold text-sm mb-1">Keep Recording Visible</p>
              <p className="text-xs opacity-90 mb-3">Enable Picture-in-Picture to see your recording when switching tabs</p>
              <div className="flex gap-2">
                <button
                  onClick={() => { dismissPrompt(); void openPipWindow(); }}
                  className="bg-white text-brand-pink font-semibold px-3 py-1.5 rounded-lg text-xs hover:bg-opacity-90 transition-all"
                >
                  Enable PiP
                </button>
                <button
                  onClick={dismissPrompt}
                  className="text-white font-medium px-3 py-1.5 rounded-lg text-xs hover:bg-white hover:bg-opacity-10 transition-all"
                >
                  Dismiss
                </button>
              </div>
            </div>
            <button onClick={dismissPrompt} className="flex-shrink-0 hover:bg-white hover:bg-opacity-20 rounded-full p-1 transition-all">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* PiP toggle button */}
      {isRecording && isPipSupported && !showPrompt && (
        <button
          onClick={() => { if (isPipOpen) { closePipWindow(); } else { void openPipWindow(); } }}
          className={`fixed bottom-4 right-4 z-[10000] text-white px-5 py-2.5 rounded-full shadow-2xl text-sm font-semibold hover:scale-105 transition-transform flex items-center gap-2 ${
            isPipOpen
              ? "bg-gradient-to-r from-red-500 to-red-600"
              : "bg-gradient-to-r from-brand-pink to-brand-orange animate-pulse"
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {isPipOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            )}
          </svg>
          {isPipOpen ? "Close PiP" : "Open Picture-in-Picture"}
        </button>
      )}

      {/* Dev warning if unsupported */}
      {!isPipSupported && process.env.NODE_ENV === "development" && (
        <div className="fixed bottom-4 right-4 z-[10000] bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg text-xs">
          PiP API not supported in this browser
        </div>
      )}
    </>
  );
}
