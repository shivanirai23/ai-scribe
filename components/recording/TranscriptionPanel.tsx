"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Eye } from "lucide-react";

interface TranscriptionPanelProps {
  transcription: string[];
  liveDraft?: string;
  isRecording: boolean;
  isPaused: boolean;
  hasVisit: boolean;
  hasReport?: boolean;
  onViewReport?: () => void;
}

export function TranscriptionPanel({
  transcription,
  liveDraft,
  isRecording,
  isPaused,
  hasVisit,
  hasReport = false,
  onViewReport,
}: TranscriptionPanelProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcription, liveDraft]);

  return (
    <div className="flex flex-col bg-white rounded-2xl shadow-[0_2px_6px_rgba(0,0,0,0.04),0_0_16px_2px_rgba(191,223,241,0.9)] p-6 pt-4">
      <div className="flex justify-between mb-4 items-center">
        <h2 className="text-lg font-medium flex items-center gap-2">
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-brand-blue to-brand-green">
            Live Transcription
          </span>
          {isRecording && !isPaused && (
            <span className="inline-block h-2 w-2 rounded-full bg-brand-green animate-pulse" />
          )}
        </h2>
        {(hasReport || transcription.length > 0) && !isRecording && onViewReport && (
          <button
            onClick={onViewReport}
            className="text-xs text-brand-blue flex items-center gap-1 hover:underline"
          >
            <Eye className="h-3 w-3" />
            Report
          </button>
        )}
      </div>

      <div className="bg-slate-50 rounded-xl p-5 overflow-y-auto border border-slate-100 h-[63vh] flex flex-col">
        {!hasVisit ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-slate-400 italic text-center">Start a visit to proceed</p>
          </div>
        ) : transcription.length === 0 && !liveDraft ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-slate-400 italic text-center">
              {isRecording ? "Listening..." : "Start recording to see transcription"}
            </p>
          </div>
        ) : (
          <>
            <AnimatePresence initial={false}>
              {transcription.map((text, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20, filter: "blur(8px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  className="mb-3"
                >
                  <p className="leading-relaxed text-sm">{text}</p>
                </motion.div>
              ))}
              {!!liveDraft && (
                <motion.div
                  key="live-draft"
                  initial={{ opacity: 0.5 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.25 }}
                  className="mb-3"
                >
                  <p className="leading-relaxed text-sm text-slate-500 italic">{liveDraft}</p>
                </motion.div>
              )}
            </AnimatePresence>
            {isRecording && !isPaused && (
              <motion.span
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="inline-block h-4 w-1 bg-brand-blue ml-1"
              />
            )}
            <div ref={bottomRef} />
          </>
        )}
      </div>
    </div>
  );
}
