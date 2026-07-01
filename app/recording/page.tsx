"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  addTranscription,
  startVisit,
  startRecording,
  pauseRecording,
  resumeRecording,
  stopRecording,
  endVisit,
  tickTimer,
  setCurrentView,
  setShowQRCode,
  setReportLoading,
  setReportData,
  setConnectionState,
  setSpeechDetected,
  setFormattedTranscription,
} from "@/store/slices/recordingSlice";
import { Header, UserProfileSidebar } from "@/components/recording/Header";
import { AlertBanners } from "@/components/recording/AlertBanners";
import { RecorderPanel } from "@/components/recording/RecorderPanel";
import { TranscriptionPanel } from "@/components/recording/TranscriptionPanel";
import { PictureInPicture } from "@/components/recording/PictureInPicture";
import { QRCodeDialog } from "@/components/recording/Dialogs";
import { ReportView } from "@/components/report/ReportView";
import type { AlertType } from "@/components/recording/AlertBanners";
import type { ReportData } from "@/store/slices/recordingSlice";
import { apiFetch } from "@/lib/utils";

interface AlertItem {
  type: AlertType;
  id: string;
}

const EMPTY_REPORT: ReportData = {
  visitNotes: [],
  soapNote: {
    subjective: {},
    objective: {},
    assessment: {},
    plan: {},
  },
  icdCodes: { icd_codes: [] },
  cptCodes: { cpt_codes: [] },
  cpt2Codes: { codes: [] },
  emCodes: { em_code: "", description: "" },
  medication: { prescribed_medications: [], in_clinic_medications: [] },
  labtest: { lab_test: [] },
  followup: { follow_up_appointment: null },
  vaccine: { vaccine: [] },
  procedure: { procedure: [] },
  referrals: [],
};

const SAMPLE_RATE = 16000;
const CHUNK_SIZE = 4096;
const SPEECH_THRESHOLD = 0.01;
const RECONNECT_BASE_DELAY_MS = 1500;
const RECONNECT_MAX_DELAY_MS = 15000;
const PCM_MIME_TYPE = "audio/pcm;rate=16000";

interface LiveConfigResponse {
  baseUrl: string;
  apiKey: string;
  projectId: string;
  agentName: string;
  error?: string;
  diagnostics?: {
    requestPath?: string;
    refererPath?: string;
    host?: string | null;
    basepathEnv?: string | null;
    usingFallbacks?: {
      projectId?: boolean;
      backendUrl?: boolean;
    };
    hasApiKey?: boolean;
  };
}

function createSessionId() {
  if (typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function float32ToPcmArrayBuffer(chunk: Float32Array) {
  const buffer = new ArrayBuffer(chunk.length * 2);
  const view = new DataView(buffer);

  for (let i = 0; i < chunk.length; i++) {
    const sample = Math.max(-1, Math.min(1, chunk[i]));
    view.setInt16(i * 2, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
  }

  return buffer;
}

function arrayBufferToBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function normalizeSpeaker(value: string) {
  const lower = value.trim().toLowerCase();
  if (lower === "doctor") return "Doctor";
  if (lower === "patient") return "Patient";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function extractSpeakerLines(payload: unknown): string[] {
  if (!payload) {
    return [];
  }

  if (typeof payload === "string") {
    try {
      return extractSpeakerLines(JSON.parse(payload));
    } catch {
      return [];
    }
  }

  if (Array.isArray(payload)) {
    return payload.flatMap((item) => extractSpeakerLines(item));
  }

  if (typeof payload === "object") {
    const obj = payload as Record<string, unknown>;

    if (Array.isArray(obj.transcript)) {
      return extractSpeakerLines(obj.transcript);
    }

    const lines: string[] = [];
    if (typeof obj.doctor === "string" && obj.doctor.trim()) {
      lines.push(`Doctor: ${obj.doctor.trim()}`);
    }
    if (typeof obj.patient === "string" && obj.patient.trim()) {
      lines.push(`Patient: ${obj.patient.trim()}`);
    }

    if (lines.length > 0) {
      return lines;
    }

    for (const [speaker, value] of Object.entries(obj)) {
      if (typeof value === "string" && value.trim()) {
        lines.push(`${normalizeSpeaker(speaker)}: ${value.trim()}`);
      }
    }
    return lines;
  }

  return [];
}

export default function RecordingPage() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const recording = useAppSelector((s) => s.recording);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [noTranscriptToast, setNoTranscriptToast] = useState(false);
  const [conversationText, setConversationText] = useState("");
  const [liveDraft, setLiveDraft] = useState("");
  const liveDraftRef = useRef("");

  const wsRef = useRef<WebSocket | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const audioStreamActiveRef = useRef(false);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptRef = useRef(0);
  const manualSocketCloseRef = useRef(false);
  const liveSessionActiveRef = useRef(false);
  const liveConfigRef = useRef<LiveConfigResponse | null>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const recordingRef = useRef(false);
  const pausedRef = useRef(false);

  useEffect(() => {
    recordingRef.current = recording.isRecording;
    pausedRef.current = recording.isPaused;
  }, [recording.isRecording, recording.isPaused]);

  useEffect(() => {
    liveDraftRef.current = liveDraft;
  }, [liveDraft]);

  useEffect(() => {
    return () => {
      if (scriptProcessorRef.current) {
        scriptProcessorRef.current.disconnect();
        scriptProcessorRef.current = null;
      }
      if (audioCtxRef.current) {
        void audioCtxRef.current.close();
        audioCtxRef.current = null;
      }
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach((track) => track.stop());
        micStreamRef.current = null;
      }

      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }

      liveSessionActiveRef.current = false;
      manualSocketCloseRef.current = true;
      const socket = wsRef.current;
      if (socket && socket.readyState === WebSocket.OPEN) {
        try {
          if (audioStreamActiveRef.current) {
            socket.send(JSON.stringify({ type: "end" }));
            audioStreamActiveRef.current = false;
          }
          socket.send(JSON.stringify({ type: "disconnect" }));
        } catch {
          // ignore send errors during cleanup
        }
      }
      if (socket) {
        manualSocketCloseRef.current = true;
        socket.onopen = null;
        socket.onmessage = null;
        socket.onerror = null;
        socket.onclose = null;
        socket.close(1000, "cleanup");
      }
      wsRef.current = null;
      audioStreamActiveRef.current = false;
      dispatch(setSpeechDetected(false));
      dispatch(setConnectionState({ isConnected: false, isConnecting: false }));
    };
  }, [dispatch]);

  const pushAlert = (type: AlertType, id: string) => {
    setAlerts((prev) => {
      if (prev.some((item) => item.id === id)) {
        return prev;
      }
      return [...prev, { type, id }];
    });
  };

  const stopReconnectTimer = () => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  };

  const shouldKeepLiveSocket = () =>
    liveSessionActiveRef.current && !manualSocketCloseRef.current;

  const scheduleLiveReconnect = (connect: () => Promise<void>) => {
    if (!shouldKeepLiveSocket()) {
      dispatch(setConnectionState({ isConnected: false, isConnecting: false }));
      return;
    }

    reconnectAttemptRef.current += 1;
    const delay = Math.min(
      RECONNECT_BASE_DELAY_MS * Math.min(reconnectAttemptRef.current, 10),
      RECONNECT_MAX_DELAY_MS
    );
    dispatch(setConnectionState({ isConnected: false, isConnecting: true }));
    pushAlert("socket-disconnected", "socket-reconnecting");

    stopReconnectTimer();
    reconnectTimerRef.current = setTimeout(async () => {
      if (!shouldKeepLiveSocket()) {
        return;
      }

      try {
        await connect();
      } catch {
        scheduleLiveReconnect(connect);
      }
    }, delay);
  };

  const sendLiveFrame = (payload: Record<string, unknown>) => {
    const socket = wsRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      return false;
    }

    socket.send(JSON.stringify(payload));
    return true;
  };

  const startRecordingStream = () => {
    if (audioStreamActiveRef.current) {
      return;
    }

    if (sendLiveFrame({ type: "start", modality: "audio" })) {
      audioStreamActiveRef.current = true;
    }
  };

  const sendPcmDataFrame = (chunk: Float32Array) => {
    sendLiveFrame({
      type: "data",
      modality: "audio",
      content: arrayBufferToBase64(float32ToPcmArrayBuffer(chunk)),
      mime_type: PCM_MIME_TYPE,
    });
  };

  const endRecordingStream = () => {
    if (!audioStreamActiveRef.current) {
      return;
    }

    sendLiveFrame({ type: "end" });
    audioStreamActiveRef.current = false;
  };

  const closeLiveSocket = () => {
    liveSessionActiveRef.current = false;
    manualSocketCloseRef.current = true;
    stopReconnectTimer();
    endRecordingStream();

    const socket = wsRef.current;
    if (socket && socket.readyState === WebSocket.OPEN) {
      try {
        socket.send(JSON.stringify({ type: "disconnect" }));
      } catch {
        // ignore send errors during close
      }
    }

    if (socket) {
      socket.onopen = null;
      socket.onmessage = null;
      socket.onerror = null;
      socket.onclose = null;
      socket.close(1000, "cleanup");
    }

    wsRef.current = null;
    audioStreamActiveRef.current = false;
    dispatch(setConnectionState({ isConnected: false, isConnecting: false }));
  };

  const stopAudioCapture = () => {
    endRecordingStream();
    if (scriptProcessorRef.current) {
      scriptProcessorRef.current.disconnect();
      scriptProcessorRef.current = null;
    }
    if (audioCtxRef.current) {
      void audioCtxRef.current.close();
      audioCtxRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((track) => track.stop());
      micStreamRef.current = null;
    }
    dispatch(setSpeechDetected(false));
  };

  const handleAudioProcess = (event: AudioProcessingEvent) => {
    if (!recordingRef.current || pausedRef.current) {
      dispatch(setSpeechDetected(false));
      return;
    }

    if (!audioStreamActiveRef.current) {
      startRecordingStream();
    }

    const input = event.inputBuffer.getChannelData(0);
    let sumSq = 0;
    for (let i = 0; i < input.length; i++) {
      sumSq += input[i] * input[i];
    }
    const rms = Math.sqrt(sumSq / input.length);
    const isSpeech = rms >= SPEECH_THRESHOLD;
    dispatch(setSpeechDetected(isSpeech));

    if (audioStreamActiveRef.current) {
      sendPcmDataFrame(input);
    }
  };

  const startAudioCapture = async () => {
    try {
      micStreamRef.current = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: SAMPLE_RATE,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: false,
        },
      });

      try {
        audioCtxRef.current = new AudioContext({ sampleRate: SAMPLE_RATE });
      } catch {
        audioCtxRef.current = new AudioContext();
      }

      const source = audioCtxRef.current.createMediaStreamSource(micStreamRef.current);
      const processor = audioCtxRef.current.createScriptProcessor(CHUNK_SIZE, 1, 1);
      processor.onaudioprocess = handleAudioProcess;
      source.connect(processor);
      processor.connect(audioCtxRef.current.destination);
      scriptProcessorRef.current = processor;
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to access microphone";
      pushAlert("microphone", `mic-error:${message}`);
      return false;
    }
  };

  const connectLiveSocket = async () => {
    stopReconnectTimer();
    manualSocketCloseRef.current = false;
    liveSessionActiveRef.current = true;
    reconnectAttemptRef.current = 0;
    dispatch(setConnectionState({ isConnected: false, isConnecting: true }));
    setLiveDraft("");
    audioStreamActiveRef.current = false;

    const openSocket = () =>
        new Promise<void>((resolve, reject) => {
          const activeConfig = liveConfigRef.current;
          const currentSessionId = sessionIdRef.current;

          if (!activeConfig || !currentSessionId) {
            reject(new Error("Missing reconnect session context"));
            return;
          }

          const agentSlug = activeConfig.agentName || "live-transcriber-agent";
          const wsUrl = `${activeConfig.baseUrl.replace(/^http/, "ws")}/api/v1/agents/${agentSlug}/live`;
          const socket = new WebSocket(wsUrl);
          wsRef.current = socket;
          let settled = false;

          socket.onopen = () => {
            socket.send(
              JSON.stringify({
                type: "auth",
                api_key: activeConfig.apiKey,
                session_id: currentSessionId,
              })
            );
            reconnectAttemptRef.current = 0;
            audioStreamActiveRef.current = false;
            dispatch(setConnectionState({ isConnected: true, isConnecting: false }));
            setAlerts((prev) => prev.filter((a) => a.type !== "socket-disconnected"));
            if (recordingRef.current && !pausedRef.current) {
              startRecordingStream();
            }
            if (!settled) {
              settled = true;
              resolve();
            }
          };

          socket.onmessage = (messageEvent) => {
            try {
              const event = JSON.parse(messageEvent.data) as {
                type?: string;
                modality?: string;
                source?: string;
                content?: string;
                message?: string;
                partial?: boolean;
                finished?: boolean;
              };

              const type = event.type || "";

              if (
                type === "data" &&
                event.modality === "text" &&
                event.source === "input_transcription" &&
                typeof event.content === "string"
              ) {
                setLiveDraft(event.content);

                if (event.finished === true || event.partial === false) {
                  const finalText = event.content.trim();
                  if (finalText) {
                    dispatch(addTranscription(finalText));
                  }
                  setLiveDraft("");
                }
                return;
              }

              if (type === "end") {
                const finalText = liveDraftRef.current.trim();
                if (finalText) {
                  dispatch(addTranscription(finalText));
                  setLiveDraft("");
                }
                return;
              }

              if (type === "error") {
                const errorMessage = event.message || "Live socket error";
                pushAlert("socket-disconnected", `socket-error:${errorMessage}`);
              }
            } catch {
              pushAlert("network-slow", "socket-parse-error");
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

            audioStreamActiveRef.current = false;
            dispatch(setConnectionState({ isConnected: false, isConnecting: false }));
            if (recordingRef.current) {
              dispatch(setSpeechDetected(false));
            }

            if (manualSocketCloseRef.current) {
              return;
            }

            scheduleLiveReconnect(attemptLiveConnection);
          };
        });

    const attemptLiveConnection = async () => {
      if (!shouldKeepLiveSocket()) {
        return;
      }

      dispatch(setConnectionState({ isConnected: false, isConnecting: true }));

      if (!liveConfigRef.current) {
        const configResponse = await apiFetch("/api/live-transcriber/config");
        const config = (await configResponse.json()) as LiveConfigResponse;
        liveConfigRef.current = config;

        if (!configResponse.ok) {
          throw new Error(config.error || "Failed to load live transcriber config");
        }
      }

      if (!sessionIdRef.current) {
        sessionIdRef.current = createSessionId();
      }

      await openSocket();
    };

    try {
      await attemptLiveConnection();
    } catch (error) {
      if (!shouldKeepLiveSocket()) {
        dispatch(setConnectionState({ isConnected: false, isConnecting: false }));
        return;
      }

      const message = error instanceof Error ? error.message : "Unable to connect live socket";
      pushAlert("socket-disconnected", `socket-connect:${message}`);

      // Config fetch failures never reach onclose; socket failures are handled there.
      if (!wsRef.current) {
        scheduleLiveReconnect(attemptLiveConnection);
      }
    }
  };

  // Timer tick when recording and not paused
  useEffect(() => {
    if (!recording.isRecording || recording.isPaused) return;
    const interval = setInterval(() => {
      dispatch(tickTimer());
    }, 1000);
    return () => clearInterval(interval);
  }, [recording.isRecording, recording.isPaused, dispatch]);

  const handleStartVisit = async () => {
    const visitId = `visit_${Date.now()}`;
    dispatch(startVisit(visitId));
    await connectLiveSocket();
  };

  const handleStartRecording = async () => {
    if (!recording.isConnected || recording.isConnecting) {
      return;
    }

    const micStarted = await startAudioCapture();
    if (!micStarted) {
      return;
    }

    dispatch(startRecording());
    recordingRef.current = true;
    startRecordingStream();
  };

  const handlePause = () => dispatch(pauseRecording());
  const handleResume = () => dispatch(resumeRecording());

  const generateReportFromMessage = async (rawMessage: string) => {
    const callAgentRoute = async <T,>(url: string) => {
      try {
        const response = await apiFetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: rawMessage,
          }),
        });

        const data = (await response.json()) as T & { error?: string };

        const responseError =
          typeof data.error === "string" && data.error.trim() ? data.error.trim() : null;

        if (!response.ok || responseError) {
          return {
            ok: false as const,
            data: null,
            error: responseError || `Request failed for ${url}`,
          };
        }

        return {
          ok: true as const,
          data,
          error: null,
        };
      } catch (error) {
        return {
          ok: false as const,
          data: null,
          error: error instanceof Error ? error.message : `Request failed for ${url}`,
        };
      }
    };

    const callTranscriptionFormatter = async () => {
      try {
        const formatterResponse = await apiFetch("/api/transcription-formatter", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: rawMessage,
          }),
        });

        if (!formatterResponse.ok) {
          const formatterData = (await formatterResponse.json().catch(() => ({}))) as { error?: string };
          return {
            ok: false as const,
            error: formatterData.error || "Transcription formatter failed",
          };
        }

        const formatterData = (await formatterResponse.json()) as {
          transcription?: unknown;
          transcript?: unknown;
        };
        const formattedPayload = formatterData.transcription ?? formatterData.transcript;
        const speakerLines = extractSpeakerLines(formattedPayload);

        if (speakerLines.length > 0) {
          dispatch(setFormattedTranscription(speakerLines));
          console.log("[generateReport] Formatted transcription lines:", speakerLines);
        } else if (typeof formatterData.transcription === "string" && formatterData.transcription.trim()) {
          const lines = formatterData.transcription
            .split("\n")
            .map((line) => line.trim())
            .filter((line) => line.length > 0);
          dispatch(setFormattedTranscription(lines.length > 0 ? lines : [formatterData.transcription]));
          console.log("[generateReport] Formatted transcription:", formatterData.transcription);
        }

        return {
          ok: true as const,
          error: null,
        };
      } catch (error) {
        console.error("[generateReport] Transcription formatter error:", error);
        return {
          ok: false as const,
          error: error instanceof Error ? error.message : "Transcription formatter failed",
        };
      }
    };

    const today = new Date().toLocaleDateString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
    });

    const [formatterResult, visitResult, soapResult, icdResult, cpt2Result, followUpResult, emCodeResult, medicationResult, procedureResult, referralResult, cptPipelineResult, labTestResult] =
      await Promise.all([
        callTranscriptionFormatter(),
        callAgentRoute<{
          visit_notes?: string[];
        }>("/api/visit-notes"),
        callAgentRoute<{
          subjective?: string;
          objective?: string;
          assessment?: string;
          plan?: string;
        }>("/api/soap-notes"),
        callAgentRoute<{
          icd_codes?: Array<{
            icd_10_code: string;
            name: string;
          }>;
        }>("/api/icd-10-codes"),
        callAgentRoute<{
          codes?: Array<{
            cpt2_code: string;
            description: string;
          }>;
        }>("/api/cpt2-codes"),
        callAgentRoute<{
          follow_ups?: unknown[];
        }>("/api/follow-ups"),
        callAgentRoute<{
          em_code?: string;
          description?: string;
        }>("/api/em-code"),
        callAgentRoute<{
          medication?: unknown[];
        }>("/api/medications"),
        callAgentRoute<{
          procedure?: unknown[];
          procedures?: unknown[];
        }>("/api/procedures"),
        callAgentRoute<{
          referrals?: unknown[];
        }>("/api/referrals"),
        callAgentRoute<{
          procedures?: unknown[];
          cpt_codes?: Array<{ cpt_code: string; name: string }>;
        }>("/api/cpt-pipeline"),
        callAgentRoute<{
          lab_test?: unknown[];
        }>("/api/lab-tests"),
      ]);

    const visitData = (visitResult.data || {}) as {
      visit_notes?: string[];
    };

    const soapData = (soapResult.data || {}) as {
      subjective?: string;
      objective?: string;
      assessment?: string;
      plan?: string;
    };

    const icdData = (icdResult.data || {}) as {
      icd_codes?: Array<{
        icd_10_code: string;
        name: string;
      }>;
    };

    const cpt2Data = (cpt2Result.data || {}) as {
      codes?: Array<{
        cpt2_code: string;
        description: string;
      }>;
    };

    const followUpData = (followUpResult.data || {}) as {
      follow_ups?: unknown[];
    };

    const emCodeData = (emCodeResult.data || {}) as {
      em_code?: string;
      description?: string;
    };

    const medicationData = (medicationResult.data || {}) as {
      medication?: unknown[];
    };

    const procedureData = (procedureResult.data || {}) as {
      procedure?: unknown[];
      procedures?: unknown[];
    };

    const referralData = (referralResult.data || {}) as {
      referrals?: unknown[];
    };

    const cptPipelineData = (cptPipelineResult.data || {}) as {
      procedures?: unknown[];
      cpt_codes?: Array<{ cpt_code: string; name: string }>;
    };

    const labTestData = (labTestResult.data || {}) as {
      lab_test?: unknown[];
    };

    const mappedVisitNotes = (visitData.visit_notes || []).filter((item) => item.trim().length > 0);
    const subjective = soapData.subjective?.trim() || "";
    const objective = soapData.objective?.trim() || "";
    const assessment = soapData.assessment?.trim() || "";
    const plan = soapData.plan?.trim() || "";
    const mappedIcdCodes = icdData.icd_codes || [];
    const mappedCpt2Codes = cpt2Data.codes || [];
    const firstFollowUp = (followUpData.follow_ups || [])[0];
    const mappedFollowUp = (() => {
      if (!firstFollowUp) {
        return null;
      }

      if (typeof firstFollowUp === "string") {
        return {
          duration: "",
          reason: firstFollowUp,
        };
      }

      if (typeof firstFollowUp === "object") {
        const item = firstFollowUp as {
          duration?: unknown;
          reason?: unknown;
          description?: unknown;
          text?: unknown;
          date?: unknown;
        };

        const duration =
          typeof item.duration === "string"
            ? item.duration
            : typeof item.date === "string"
              ? item.date
              : "";
        const reason =
          typeof item.reason === "string"
            ? item.reason
            : typeof item.description === "string"
              ? item.description
              : typeof item.text === "string"
                ? item.text
                : "";

        if (!duration && !reason) {
          return null;
        }

        return {
          duration,
          reason,
        };
      }

      return null;
    })();

    const mappedPrescribedMedications = (medicationData.medication || [])
      .map((item) => {
        if (typeof item === "string") {
          return {
            correct_medicine_name: item,
            dosage: "",
            unit: "",
            frequency: { morning: null, afternoon: null, night: null },
            start_date: today,
            days: "",
            instruction: "",
          };
        }

        if (item && typeof item === "object") {
          const med = item as {
            correct_medicine_name?: unknown;
            medicine_name?: unknown;
            name?: unknown;
            dosage?: unknown;
            unit?: unknown;
            start_date?: unknown;
            days?: unknown;
            instruction?: unknown;
            frequency?: unknown;
          };

          const rawFreq = med.frequency;
          const frequency =
            rawFreq && typeof rawFreq === "object"
              ? (rawFreq as { morning?: unknown; afternoon?: unknown; night?: unknown })
              : typeof rawFreq === "string"
                ? (() => { try { return JSON.parse(rawFreq) as { morning?: unknown; afternoon?: unknown; night?: unknown }; } catch { return {}; } })()
                : {};

          const medicineName =
            typeof med.correct_medicine_name === "string"
              ? med.correct_medicine_name
              : typeof med.medicine_name === "string"
                ? med.medicine_name
                : typeof med.name === "string"
                  ? med.name
                  : "";

          if (!medicineName) {
            return null;
          }

          return {
            correct_medicine_name: medicineName,
            dosage: typeof med.dosage === "string" ? med.dosage : "",
            unit: typeof med.unit === "string" ? med.unit : "",
            frequency: {
              morning: frequency.morning != null ? String(frequency.morning) : null,
              afternoon: frequency.afternoon != null ? String(frequency.afternoon) : null,
              night: frequency.night != null ? String(frequency.night) : null,
            },
            start_date: typeof med.start_date === "string" && med.start_date ? med.start_date : today,
            days: typeof med.days === "string" ? med.days : "",
            instruction: typeof med.instruction === "string" ? med.instruction : "",
          };
        }

        return null;
      })
      .filter((item): item is ReportData["medication"]["prescribed_medications"][number] => item !== null);

    const mappedProcedures = (
      procedureData.procedure || procedureData.procedures || cptPipelineData.procedures || []
    )
      .map((item) => {
        if (!item || typeof item !== "object") return null;
        const procedure = item as {
          name?: unknown;
          reason?: unknown;
          procedure_name?: unknown;
          clinical_context?: unknown;
        };

        const name =
          typeof procedure.name === "string"
            ? procedure.name
            : typeof procedure.procedure_name === "string"
              ? procedure.procedure_name
              : "";

        if (!name.trim()) {
          return null;
        }

        return {
          name,
          reason:
            typeof procedure.reason === "string"
              ? procedure.reason
              : typeof procedure.clinical_context === "string"
                ? procedure.clinical_context
                : "",
        };
      })
      .filter((item): item is { name: string; reason: string } => item !== null);

    const mappedReferrals = (referralData.referrals || [])
      .map((item) => {
        if (typeof item === "string") {
          return {
            name: item,
            reason: "",
            notes: "",
            type: "routine",
          };
        }

        if (!item || typeof item !== "object") {
          return null;
        }

        const referral = item as {
          specialist?: unknown;
          specialty?: unknown;
          provider?: unknown;
          name?: unknown;
          reason?: unknown;
          clinical_context?: unknown;
          notes?: unknown;
          type?: unknown;
          urgency?: unknown;
        };

        const name =
          typeof referral.specialist === "string"
            ? referral.specialist
            : typeof referral.specialty === "string"
              ? referral.specialty
              : typeof referral.provider === "string"
                ? referral.provider
                : typeof referral.name === "string"
                  ? referral.name
                  : "";

        if (!name.trim()) {
          return null;
        }

        return {
          name,
          reason:
            typeof referral.reason === "string"
              ? referral.reason
              : typeof referral.clinical_context === "string"
                ? referral.clinical_context
                : "",
          notes: typeof referral.notes === "string" ? referral.notes : "",
          type:
            typeof referral.type === "string"
              ? referral.type
              : typeof referral.urgency === "string"
                ? referral.urgency
                : "routine",
        };
      })
      .filter((item): item is { name: string; reason: string; notes: string; type: string } => item !== null);

    const mappedCptCodes = cptPipelineData.cpt_codes || [];
    const mappedLabTests = (labTestData.lab_test || []) as unknown[];

    const failedAgents = [
      formatterResult.ok ? null : `Transcription formatter: ${formatterResult.error}`,
      visitResult.ok ? null : `Visit notes: ${visitResult.error}`,
      soapResult.ok ? null : `SOAP notes: ${soapResult.error}`,
      icdResult.ok ? null : `ICD-10: ${icdResult.error}`,
      cpt2Result.ok ? null : `CPT-2: ${cpt2Result.error}`,
      followUpResult.ok ? null : `Follow-up: ${followUpResult.error}`,
      emCodeResult.ok ? null : `E&M: ${emCodeResult.error}`,
      medicationResult.ok ? null : `Medication: ${medicationResult.error}`,
      procedureResult.ok ? null : `Procedures: ${procedureResult.error}`,
      referralResult.ok ? null : `Referrals: ${referralResult.error}`,
      cptPipelineResult.ok ? null : `CPT pipeline: ${cptPipelineResult.error}`,
      labTestResult.ok ? null : `Lab tests: ${labTestResult.error}`,
    ].filter((item): item is string => item !== null);

    dispatch(
      setReportData({
        ...EMPTY_REPORT,
        visitNotes: visitResult.ok && mappedVisitNotes.length > 0
          ? [mappedVisitNotes.join("\n\n")]
          : [],
        soapNote: {
          subjective: subjective ? { subjective } : {},
          objective: objective ? { objective } : {},
          assessment: assessment ? { assessment } : {},
          plan: plan ? { plan } : {},
        },
        icdCodes: {
          icd_codes: mappedIcdCodes,
        },
        cpt2Codes: {
          codes: mappedCpt2Codes,
        },
        cptCodes: {
          cpt_codes: mappedCptCodes,
        },
        emCodes: {
          em_code: emCodeData.em_code || "",
          description: emCodeData.description || "",
        },
        followup: {
          follow_up_appointment: mappedFollowUp,
        },
        medication: {
          prescribed_medications: mappedPrescribedMedications,
          in_clinic_medications: [],
        },
        procedure: {
          procedure: mappedProcedures,
        },
        referrals: mappedReferrals,
        labtest: {
          lab_test: mappedLabTests,
        },
      })
    );

    if (failedAgents.length > 0) {
      console.warn("Some agent requests failed:", failedAgents);
    }
  };

  const handleStop = async () => {
    recordingRef.current = false;
    stopAudioCapture();
    closeLiveSocket();

    const draft = liveDraftRef.current.trim();
    if (draft) {
      dispatch(addTranscription(draft));
      setLiveDraft("");
    }

    const transcriptMessage = [...recording.transcription, ...(draft ? [draft] : [])]
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .join("\n");

    if (!transcriptMessage) {
      // Fully reset state so Start Visit button reappears
      dispatch(endVisit());
      setNoTranscriptToast(true);
      setTimeout(() => setNoTranscriptToast(false), 5000);
      return;
    }

    dispatch(stopRecording());

    await generateReportFromMessage(transcriptMessage);
    dispatch(setCurrentView("report"));
  };

  const handleStartConversation = async () => {
    const message = conversationText.trim();
    if (!message) return;

    const visitId = `visit_${Date.now()}`;
    dispatch(startVisit(visitId));
    dispatch(addTranscription(message));
    dispatch(setReportLoading(true));
    router.push("/visit-details");

    await generateReportFromMessage(message);
  };

  const dismissAlert = (id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  if (recording.currentView === "report") {
    return <ReportView />;
  }

  return (
    <div className="min-h-screen max-h-screen bg-white flex-col flex">
      <Header />
      <UserProfileSidebar />

      {/* Alert banners */}
      {alerts.length > 0 && (
        <div className="container mx-auto px-8 pt-4">
          <AlertBanners alerts={alerts} onDismiss={dismissAlert} />
        </div>
      )}

      {/* Main content */}
      <main className="container mx-auto pt-2 pb-6 px-6 flex-1 flex flex-col">
        {recording.recordingMode === "conversational" ? (
          <div className="w-full flex-1 flex items-start justify-center">
            <div className="w-full max-w-3xl bg-white rounded-2xl p-6 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-slate-100">
              <h2 className="text-xl font-semibold text-slate-800 mb-2">Conversation Input</h2>
              <p className="text-sm text-slate-500 mb-4">
                Paste or type the complete doctor-patient conversation below.
              </p>
              <textarea
                value={conversationText}
                onChange={(e) => setConversationText(e.target.value)}
                placeholder="Doctor: Good morning...\nPatient: I have a headache..."
                className="w-full min-h-[280px] p-4 rounded-xl border border-slate-200 text-sm leading-relaxed resize-y focus:outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue"
              />
              <button
                onClick={handleStartConversation}
                disabled={!conversationText.trim()}
                className="mt-4 w-full sm:w-auto px-6 h-12 bg-brand-green hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-base font-medium shadow-md hover:shadow-lg transition-all"
              >
                Start
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full flex-1 min-h-0">
            {/* Left: Recorder */}
            <RecorderPanel
              visitId={recording.visitId}
              isRecording={recording.isRecording}
              isPaused={recording.isPaused}
              isSpeechDetected={recording.isSpeechDetected}
              isConnected={recording.isConnected}
              isConnecting={recording.isConnecting}
              recordingTime={recording.recordingTime}
              onStartVisit={handleStartVisit}
              onStartRecording={handleStartRecording}
              onPause={handlePause}
              onResume={handleResume}
              onStop={handleStop}
            />

            {/* Right: Transcription */}
            <TranscriptionPanel
              transcription={recording.transcription}
              liveDraft={liveDraft}
              isRecording={recording.isRecording}
              isPaused={recording.isPaused}
              hasVisit={!!recording.visitId}
              onViewReport={() => dispatch(setCurrentView("report"))}
            />
          </div>
        )}
      </main>

      {/* Dialogs */}
      <QRCodeDialog
        open={recording.showQRCode}
        onClose={() => dispatch(setShowQRCode(false))}
        visitId={recording.visitId}
      />

      {recording.isRecording && recording.currentView === "recording" && (
        <PictureInPicture
          recordingTime={recording.recordingTime}
          isSpeechDetected={recording.isSpeechDetected}
          isPaused={recording.isPaused}
          transcriptionText={recording.transcription}
          onPause={() => dispatch(pauseRecording())}
          onResume={() => dispatch(resumeRecording())}
          onStop={handleStop}
        />
      )}

      {/* No-transcription toast */}
      {noTranscriptToast && (
        <div className="fixed bottom-6 right-6 z-[10001] flex items-start gap-3 bg-white border border-rose-200 shadow-2xl rounded-2xl px-5 py-4 max-w-sm animate-in slide-in-from-bottom-4 fade-in duration-300">
          <div className="flex-shrink-0 mt-0.5 h-8 w-8 rounded-full bg-rose-100 flex items-center justify-center">
            <svg className="h-4 w-4 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="font-semibold text-sm text-slate-900">No transcription captured</p>
            <p className="text-sm text-slate-500 mt-0.5">Please start recording and speak before stopping.</p>
          </div>
          <button
            onClick={() => setNoTranscriptToast(false)}
            className="flex-shrink-0 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

    </div>
  );
}
