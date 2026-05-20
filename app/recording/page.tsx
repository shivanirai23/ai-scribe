"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
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

  const handleStartConversation = () => {
    const visitId = `visit_${Date.now()}`;
    dispatch(startVisit(visitId));
    dispatch(setReportData(EMPTY_REPORT));
    router.push("/visit-details");
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
