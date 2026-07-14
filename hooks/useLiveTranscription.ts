"use client";

import { useCallback, useEffect, useRef } from "react";
import { apiFetch, withBasePath } from "@/lib/utils";

const INPUT_AUDIO_RATE = 16000;
const KEEPALIVE_MS = 4000;
const SILENT_PCM_MS = 40;
const RECONNECT_BASE_DELAY_MS = 1500;
const RECONNECT_MAX_DELAY_MS = 15000;
const SPEECH_THRESHOLD = 0.01;
const PROTOCOL_VERSION = 2;

interface LiveSessionResponse {
  session_id: string;
  wss_url: string;
  live_token: string;
  protocol_version?: number;
  error?: string;
}

export interface LiveTranscriptionCallbacks {
  onLiveDraft: (text: string) => void;
  onTurnComplete: (text: string) => void;
  onConnectionState: (state: { isConnected: boolean; isConnecting: boolean }) => void;
  onSpeechDetected: (detected: boolean) => void;
  onError: (id: string) => void;
  onClearError?: (idPrefix: string) => void;
}

function createSessionId() {
  if (typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function silentPcmBytes(ms = SILENT_PCM_MS) {
  const byteCount = Math.round((INPUT_AUDIO_RATE * ms) / 1000) * 2;
  return new Uint8Array(byteCount);
}

function getWorkletUrl() {
  if (typeof window === "undefined") {
    return "/pcm-recorder-processor.js";
  }
  return `${window.location.origin}${withBasePath("/pcm-recorder-processor.js")}`;
}

export function useLiveTranscription(callbacks: LiveTranscriptionCallbacks) {
  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;

  const wsRef = useRef<WebSocket | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const currentTurnRef = useRef("");
  const liveDraftRef = useRef("");
  const transcriptTextSourceRef = useRef<string | null>(null);
  const audioStartedRef = useRef(false);
  const audioSendingEnabledRef = useRef(false);
  const sessionActiveRef = useRef(false);
  const manualCloseRef = useRef(false);
  const reconnectAttemptRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const keepaliveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const recorderNodeRef = useRef<AudioWorkletNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const speechRafRef = useRef<number | null>(null);

  const stopSpeechMonitor = useCallback(() => {
    if (speechRafRef.current !== null) {
      cancelAnimationFrame(speechRafRef.current);
      speechRafRef.current = null;
    }
    callbacksRef.current.onSpeechDetected(false);
  }, []);

  const startSpeechMonitor = useCallback(() => {
    stopSpeechMonitor();

    const tick = () => {
      const analyser = analyserRef.current;
      if (!analyser || !audioSendingEnabledRef.current) {
        callbacksRef.current.onSpeechDetected(false);
        speechRafRef.current = requestAnimationFrame(tick);
        return;
      }

      const buf = new Uint8Array(analyser.fftSize);
      analyser.getByteTimeDomainData(buf);

      let sumSq = 0;
      for (let i = 0; i < buf.length; i++) {
        const normalized = (buf[i] - 128) / 128;
        sumSq += normalized * normalized;
      }
      const rms = Math.sqrt(sumSq / buf.length);
      callbacksRef.current.onSpeechDetected(rms >= SPEECH_THRESHOLD);
      speechRafRef.current = requestAnimationFrame(tick);
    };

    speechRafRef.current = requestAnimationFrame(tick);
  }, [stopSpeechMonitor]);

  const sendAudioPcm = useCallback((bytes: Uint8Array) => {
    const socket = wsRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN || !audioStartedRef.current) {
      return;
    }
    socket.send(bytes);
  }, []);

  const stopKeepalive = useCallback(() => {
    if (keepaliveTimerRef.current) {
      clearInterval(keepaliveTimerRef.current);
      keepaliveTimerRef.current = null;
    }
  }, []);

  const startKeepalive = useCallback(() => {
    stopKeepalive();
    keepaliveTimerRef.current = setInterval(() => {
      sendAudioPcm(silentPcmBytes(SILENT_PCM_MS));
    }, KEEPALIVE_MS);
  }, [sendAudioPcm, stopKeepalive]);

  const stopReconnectTimer = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }, []);

  const commitTranscriptLine = useCallback((text: string) => {
    const finalText = String(text || "").trim();
    currentTurnRef.current = "";
    liveDraftRef.current = "";
    callbacksRef.current.onLiveDraft("");

    if (finalText) {
      callbacksRef.current.onTurnComplete(finalText);
    }
  }, []);

  const finishCurrentTurn = useCallback(() => {
    commitTranscriptLine(currentTurnRef.current || liveDraftRef.current);
  }, [commitTranscriptLine]);

  const handleWsJsonFrame = useCallback(
    (frame: {
      type?: string;
      modality?: string;
      source?: string;
      content?: string;
      message?: string;
      partial?: boolean | null;
      finished?: boolean;
    }) => {
      if (!frame || typeof frame !== "object") {
        return;
      }

      const type = frame.type || "";

      if (type === "start") {
        transcriptTextSourceRef.current = null;
        return;
      }

      if (type === "data" && frame.modality === "text") {
        if (frame.partial === true) {
          return;
        }

        const text = frame.content;
        const source = frame.source || "";

        if (source === "input_transcription") {
          if (text) {
            transcriptTextSourceRef.current = "input";
            commitTranscriptLine(text);
          }
          return;
        }

        if (text != null && (source === "output" || source === "output_transcription" || !source)) {
          transcriptTextSourceRef.current = source || "output";
          commitTranscriptLine(text);
          return;
        }
        return;
      }

      if (type === "data" && frame.modality === "audio") {
        return;
      }

      if (type === "end") {
        finishCurrentTurn();
        transcriptTextSourceRef.current = null;
        return;
      }

      if (type === "error") {
        callbacksRef.current.onError(`socket-error:${frame.message || "Agent error"}`);
      }
    },
    [commitTranscriptLine, finishCurrentTurn]
  );

  const closeSocket = useCallback(() => {
    const socket = wsRef.current;
    if (socket) {
      socket.onopen = null;
      socket.onmessage = null;
      socket.onerror = null;
      socket.onclose = null;
      if (socket.readyState === WebSocket.OPEN) {
        socket.close(1000, "cleanup");
      }
    }
    wsRef.current = null;
    audioStartedRef.current = false;
  }, []);

  const shouldKeepSession = useCallback(
    () => sessionActiveRef.current && !manualCloseRef.current,
    []
  );

  const mintLiveSession = useCallback(async () => {
    sessionIdRef.current = sessionIdRef.current || createSessionId();

    const response = await apiFetch("/api/live-transcriber/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_id: sessionIdRef.current,
        user_id: "ai-scribe-browser",
      }),
    });

    const sessionInfo = (await response.json()) as LiveSessionResponse;
    if (!response.ok) {
      throw new Error(sessionInfo.error || "Failed to mint live session");
    }

    sessionIdRef.current = sessionInfo.session_id || sessionIdRef.current;
    return sessionInfo;
  }, []);

  const openWebSocket = useCallback(
    (sessionInfo: LiveSessionResponse) =>
      new Promise<void>((resolve, reject) => {
        const socket = new WebSocket(sessionInfo.wss_url);
        socket.binaryType = "arraybuffer";
        wsRef.current = socket;

        let settled = false;

        socket.onopen = () => {
          socket.send(
            JSON.stringify({
              type: "auth",
              live_token: sessionInfo.live_token,
              session_id: sessionIdRef.current,
              protocol_version: sessionInfo.protocol_version ?? PROTOCOL_VERSION,
            })
          );
          socket.send(
            JSON.stringify({
              type: "start",
              modality: "audio",
              mime_type: "audio/pcm;rate=16000",
              protocol_version: PROTOCOL_VERSION,
            })
          );

          audioStartedRef.current = true;
          setTimeout(() => sendAudioPcm(silentPcmBytes(SILENT_PCM_MS)), 30);
          startKeepalive();

          reconnectAttemptRef.current = 0;
          callbacksRef.current.onConnectionState({ isConnected: true, isConnecting: false });
          callbacksRef.current.onClearError?.("socket-");

          if (!settled) {
            settled = true;
            resolve();
          }
        };

        socket.onmessage = (event) => {
          if (event.data instanceof ArrayBuffer || event.data instanceof Blob) {
            return;
          }
          if (typeof event.data !== "string") {
            return;
          }

          try {
            handleWsJsonFrame(JSON.parse(event.data));
          } catch {
            callbacksRef.current.onError("socket-parse-error");
          }
        };

        socket.onerror = () => {
          if (!settled) {
            settled = true;
            reject(new Error("WebSocket connection failed"));
          }
        };

        socket.onclose = () => {
          if (wsRef.current === socket) {
            wsRef.current = null;
          }

          stopKeepalive();
          audioStartedRef.current = false;
          callbacksRef.current.onConnectionState({ isConnected: false, isConnecting: false });
          stopSpeechMonitor();

          if (manualCloseRef.current) {
            return;
          }

          if (!sessionActiveRef.current) {
            return;
          }

          reconnectAttemptRef.current += 1;
          const delay = Math.min(
            RECONNECT_BASE_DELAY_MS * Math.min(reconnectAttemptRef.current, 10),
            RECONNECT_MAX_DELAY_MS
          );

          callbacksRef.current.onConnectionState({ isConnected: false, isConnecting: true });
          callbacksRef.current.onError("socket-reconnecting");

          stopReconnectTimer();
          reconnectTimerRef.current = setTimeout(() => {
            void connectRef.current?.();
          }, delay);
        };
      }),
    [handleWsJsonFrame, sendAudioPcm, startKeepalive, stopKeepalive, stopReconnectTimer, stopSpeechMonitor]
  );

  const connectRef = useRef<(() => Promise<void>) | null>(null);

  const connect = useCallback(async () => {
    if (!sessionActiveRef.current) {
      return;
    }

    stopReconnectTimer();
    callbacksRef.current.onConnectionState({ isConnected: false, isConnecting: true });

    try {
      const sessionInfo = await mintLiveSession();
      await openWebSocket(sessionInfo);
    } catch (error) {
      if (!shouldKeepSession()) {
        callbacksRef.current.onConnectionState({ isConnected: false, isConnecting: false });
        return;
      }

      const message = error instanceof Error ? error.message : "Unable to connect live socket";
      callbacksRef.current.onError(`socket-connect:${message}`);

      reconnectAttemptRef.current += 1;
      const delay = Math.min(
        RECONNECT_BASE_DELAY_MS * Math.min(reconnectAttemptRef.current, 10),
        RECONNECT_MAX_DELAY_MS
      );

      callbacksRef.current.onConnectionState({ isConnected: false, isConnecting: true });
      callbacksRef.current.onError("socket-reconnecting");

      stopReconnectTimer();
      reconnectTimerRef.current = setTimeout(() => {
        void connectRef.current?.();
      }, delay);
    }
  }, [mintLiveSession, openWebSocket, shouldKeepSession, stopReconnectTimer]);

  connectRef.current = connect;

  const disconnect = useCallback(() => {
    sessionActiveRef.current = false;
    manualCloseRef.current = true;
    audioSendingEnabledRef.current = false;

    stopReconnectTimer();
    stopKeepalive();
    stopSpeechMonitor();
    closeSocket();

    finishCurrentTurn();
    transcriptTextSourceRef.current = null;
    callbacksRef.current.onConnectionState({ isConnected: false, isConnecting: false });
  }, [closeSocket, finishCurrentTurn, stopKeepalive, stopReconnectTimer, stopSpeechMonitor]);

  const stopAudioCapture = useCallback(() => {
    audioSendingEnabledRef.current = false;
    stopSpeechMonitor();

    recorderNodeRef.current?.disconnect();
    analyserRef.current?.disconnect();
    micStreamRef.current?.getTracks().forEach((track) => track.stop());

    recorderNodeRef.current = null;
    analyserRef.current = null;
    micStreamRef.current = null;

    if (audioCtxRef.current) {
      void audioCtxRef.current.close();
      audioCtxRef.current = null;
    }
  }, [stopSpeechMonitor]);

  const startAudioCapture = useCallback(async () => {
    try {
      micStreamRef.current = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      audioCtxRef.current = new AudioContext({
        sampleRate: INPUT_AUDIO_RATE,
        latencyHint: "interactive",
      });

      await audioCtxRef.current.audioWorklet.addModule(getWorkletUrl());

      const source = audioCtxRef.current.createMediaStreamSource(micStreamRef.current);
      analyserRef.current = audioCtxRef.current.createAnalyser();
      analyserRef.current.fftSize = 1024;
      source.connect(analyserRef.current);

      const recorderNode = new AudioWorkletNode(audioCtxRef.current, "pcm-recorder-processor");
      recorderNode.port.onmessage = (event) => {
        if (!(event.data instanceof ArrayBuffer) || !audioSendingEnabledRef.current) {
          return;
        }
        sendAudioPcm(new Uint8Array(event.data));
      };

      analyserRef.current.connect(recorderNode);
      const silentGain = audioCtxRef.current.createGain();
      silentGain.gain.value = 0;
      recorderNode.connect(silentGain);
      silentGain.connect(audioCtxRef.current.destination);
      recorderNodeRef.current = recorderNode;

      if (audioCtxRef.current.state === "suspended") {
        await audioCtxRef.current.resume();
      }

      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to access microphone";
      callbacksRef.current.onError(`mic-error:${message}`);
      return false;
    }
  }, [sendAudioPcm]);

  const startSendingAudio = useCallback(() => {
    audioSendingEnabledRef.current = true;
    startSpeechMonitor();
  }, [startSpeechMonitor]);

  const pauseSendingAudio = useCallback(() => {
    audioSendingEnabledRef.current = false;
    stopSpeechMonitor();
  }, [stopSpeechMonitor]);

  const resumeSendingAudio = useCallback(() => {
    audioSendingEnabledRef.current = true;
    startSpeechMonitor();
  }, [startSpeechMonitor]);

  const startTranscription = useCallback(async (): Promise<boolean> => {
    manualCloseRef.current = false;
    sessionActiveRef.current = true;
    sessionIdRef.current = createSessionId();
    currentTurnRef.current = "";
    liveDraftRef.current = "";
    transcriptTextSourceRef.current = null;
    callbacksRef.current.onLiveDraft("");

    // HTML order: microphone first, then mint + open WebSocket.
    const micStarted = await startAudioCapture();
    if (!micStarted) {
      sessionActiveRef.current = false;
      return false;
    }

    try {
      await connect();
      startSendingAudio();
      return true;
    } catch {
      stopAudioCapture();
      sessionActiveRef.current = false;
      callbacksRef.current.onConnectionState({ isConnected: false, isConnecting: false });
      return false;
    }
  }, [connect, startAudioCapture, startSendingAudio, stopAudioCapture]);

  const flushDraft = useCallback(() => {
    const draft = (currentTurnRef.current || liveDraftRef.current).trim();
    currentTurnRef.current = "";
    liveDraftRef.current = "";
    transcriptTextSourceRef.current = null;
    callbacksRef.current.onLiveDraft("");
    return draft;
  }, []);

  useEffect(() => {
    return () => {
      disconnect();
      stopAudioCapture();
    };
  }, [disconnect, stopAudioCapture]);

  return {
    startTranscription,
    disconnect,
    startAudioCapture,
    stopAudioCapture,
    startSendingAudio,
    pauseSendingAudio,
    resumeSendingAudio,
    flushDraft,
    isSessionActive: () => sessionActiveRef.current,
  };
}
