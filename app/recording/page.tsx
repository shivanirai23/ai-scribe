"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  addTranscription,
  startVisit,
  startRecording,
  pauseRecording,
  resumeRecording,
  stopRecording,
  tickTimer,
  setCurrentView,
  setRecordingMode,
  setShowModeWarning,
  setShowQRCode,
  setReportLoading,
  setReportData,
} from "@/store/slices/recordingSlice";
import { Header, UserProfileSidebar } from "@/components/recording/Header";
import { AlertBanners } from "@/components/recording/AlertBanners";
import { RecorderPanel } from "@/components/recording/RecorderPanel";
import { TranscriptionPanel } from "@/components/recording/TranscriptionPanel";
import { QRCodeDialog, ModeWarningDialog } from "@/components/recording/Dialogs";
import { PictureInPicture } from "@/components/recording/PictureInPicture";
import { ProcessingCompletionDialog } from "@/components/recording/ProcessingCompletionDialog";
import { ReportView } from "@/components/report/ReportView";
import type { AlertType } from "@/components/recording/AlertBanners";
import type { ReportData } from "@/store/slices/recordingSlice";

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

export default function RecordingPage() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const recording = useAppSelector((s) => s.recording);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [showCompletionDialog, setShowCompletionDialog] = useState(false);
  const [conversationText, setConversationText] = useState("");

  // Timer tick when recording and not paused
  useEffect(() => {
    if (!recording.isRecording || recording.isPaused) return;
    const interval = setInterval(() => {
      dispatch(tickTimer());
    }, 1000);
    return () => clearInterval(interval);
  }, [recording.isRecording, recording.isPaused, dispatch]);

  const handleStartVisit = () => {
    const visitId = `visit_${Date.now()}`;
    dispatch(startVisit(visitId));
  };

  const handleStartRecording = () => {
    dispatch(startRecording());
  };

  const handlePause = () => dispatch(pauseRecording());
  const handleResume = () => dispatch(resumeRecording());

  const handleStop = () => {
    dispatch(stopRecording());
    // Simulate report loading delay then set mock report
    setTimeout(() => {
      dispatch(setReportData(EMPTY_REPORT));
      setShowCompletionDialog(true);
    }, 2000);
  };

  const handleModeToggle = (mode: "normal" | "conversational") => {
    if (
      mode === "normal" &&
      recording.recordingMode === "conversational" &&
      recording.questionnaireStarted
    ) {
      dispatch(setShowModeWarning(true));
      return;
    }
    dispatch(setRecordingMode(mode));
  };

  const handleStartConversation = async () => {
    const message = conversationText.trim();
    if (!message) return;

    const visitId = `visit_${Date.now()}`;
    dispatch(startVisit(visitId));
    dispatch(addTranscription(message));
    dispatch(setReportLoading(true));
    router.push("/visit-details");

    const callAgentRoute = async <T,>(url: string) => {
      try {
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message,
          }),
        });

        const data = (await response.json()) as T & { error?: string };

        if (!response.ok) {
          return {
            ok: false as const,
            data,
            error: data.error || `Request failed for ${url}`,
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

    const [visitResult, soapResult, icdResult, cpt2Result, followUpResult, emCodeResult, medicationResult] =
      await Promise.all([
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
            start_date: "",
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

          const frequency =
            med.frequency && typeof med.frequency === "object"
              ? (med.frequency as {
                  morning?: unknown;
                  afternoon?: unknown;
                  night?: unknown;
                })
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
              morning: typeof frequency.morning === "string" ? frequency.morning : null,
              afternoon: typeof frequency.afternoon === "string" ? frequency.afternoon : null,
              night: typeof frequency.night === "string" ? frequency.night : null,
            },
            start_date: typeof med.start_date === "string" ? med.start_date : "",
            days: typeof med.days === "string" ? med.days : "",
            instruction: typeof med.instruction === "string" ? med.instruction : "",
          };
        }

        return null;
      })
      .filter((item): item is ReportData["medication"]["prescribed_medications"][number] => item !== null);

    const failedAgents = [
      visitResult.ok ? null : `Visit notes: ${visitResult.error}`,
      soapResult.ok ? null : `SOAP notes: ${soapResult.error}`,
      icdResult.ok ? null : `ICD-10: ${icdResult.error}`,
      cpt2Result.ok ? null : `CPT-2: ${cpt2Result.error}`,
      followUpResult.ok ? null : `Follow-up: ${followUpResult.error}`,
      emCodeResult.ok ? null : `E&M: ${emCodeResult.error}`,
      medicationResult.ok ? null : `Medication: ${medicationResult.error}`,
    ].filter((item): item is string => item !== null);

    dispatch(
      setReportData({
        ...EMPTY_REPORT,
        visitNotes:
          mappedVisitNotes.length > 0
            ? [mappedVisitNotes.join("\n\n")]
            : visitResult.ok
              ? ["No visit notes were returned by the agent."]
              : [`Visit notes generation failed: ${visitResult.error}`],
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
      })
    );

    if (failedAgents.length > 0) {
      console.warn("Some agent requests failed:", failedAgents);
    }
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
        {/* Mode toggle */}
        <div className="flex justify-center mb-6">
          <div className="inline-flex rounded-full p-1 shadow-[0_8px_30px_rgb(0,0,0,0.06)]">
            <button
              onClick={() => handleModeToggle("normal")}
              className={`px-4 py-1 rounded-full text-xs font-medium transition-all ${
                recording.recordingMode === "normal"
                  ? "bg-brand-green text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Normal Mode
            </button>
            <button
              onClick={() => handleModeToggle("conversational")}
              className={`px-4 py-1 rounded-full text-xs font-medium transition-all ${
                recording.recordingMode === "conversational"
                  ? "bg-brand-green text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Conversational Mode
            </button>
          </div>
        </div>

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
              pendingBufferCount={recording.pendingBufferCount}
              onStartVisit={handleStartVisit}
              onStartRecording={handleStartRecording}
              onPause={handlePause}
              onResume={handleResume}
              onStop={handleStop}
            />

            {/* Right: Transcription */}
            <TranscriptionPanel
              transcription={recording.transcription}
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
      <ModeWarningDialog
        open={recording.showModeWarning}
        onClose={() => dispatch(setShowModeWarning(false))}
      />

      <PictureInPicture
        visible={recording.isRecording && !!recording.visitId}
        recordingTime={recording.recordingTime}
        isSpeechDetected={recording.isSpeechDetected}
        previewText={recording.transcription.slice(-1)[0] || "Patient reports headaches..."}
        onPause={recording.isPaused ? handleResume : handlePause}
        onStop={handleStop}
      />

      <ProcessingCompletionDialog
        open={showCompletionDialog}
        onClose={() => setShowCompletionDialog(false)}
        onViewReport={() => {
          setShowCompletionDialog(false);
          dispatch(setCurrentView("report"));
        }}
      />
    </div>
  );
}
