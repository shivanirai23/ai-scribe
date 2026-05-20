"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Download,
  X,
  Loader2,
  AlertTriangle,
  ClipboardList,
  Lock,
  MessageSquare,
  RefreshCcw,
  Pencil,
  Save,
  Calendar,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  setCurrentView,
  endVisit,
  updateVisitNote,
} from "@/store/slices/recordingSlice";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import Image from "next/image";

function RetryButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="text-xs px-2 h-7 rounded-full border border-slate-200 hover:border-amber-500 hover:text-amber-500 transition-colors flex items-center"
    >
      <RefreshCcw className="h-3 w-3 mr-1" />
      Retry
    </button>
  );
}

function MedicalNotesTab() {
  const dispatch = useAppDispatch();
  const reportData = useAppSelector((s) => s.recording.reportData);
  const reportLoading = useAppSelector((s) => s.recording.reportLoading);

  const [editingVisitNotes, setEditingVisitNotes] = useState(false);
  const [editedNote, setEditedNote] = useState("");
  const [expandedSoap, setExpandedSoap] = useState<Record<string, boolean>>({});

  if (reportLoading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="flex flex-col items-center">
          <Loader2 className="h-10 w-10 text-brand-blue animate-spin mb-4" />
          <p className="text-slate-500">Processing visit notes...</p>
        </div>
      </div>
    );
  }

  if (!reportData) return null;

  const startEdit = () => {
    setEditedNote(reportData.visitNotes[0] || "");
    setEditingVisitNotes(true);
  };

  const saveEdit = () => {
    dispatch(updateVisitNote(editedNote));
    setEditingVisitNotes(false);
  };

  const soapSections = [
    { key: "subjective", label: "Subjective" },
    { key: "objective", label: "Objective" },
    { key: "assessment", label: "Assessment" },
    { key: "plan", label: "Plan" },
  ] as const;

  return (
    <div className="p-3 sm:p-6 space-y-4">
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
        {/* Visit Summary */}
        <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-[0_2px_6px_rgba(0,0,0,0.04),0_0_16px_2px_rgba(191,223,241,0.9)] flex flex-col max-h-[60vh] overflow-hidden">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-medium text-lg text-black">Visit Summary</h3>
            <div className="flex gap-2">
              {!editingVisitNotes && reportData.visitNotes[0] && (
                <button
                  onClick={startEdit}
                  className="h-8 w-8 p-0 flex items-center justify-center rounded hover:bg-slate-100 transition-colors"
                >
                  <Pencil className="h-4 w-4 text-slate-500" />
                </button>
              )}
              {!reportData.visitNotes[0] && <RetryButton onClick={() => {}} />}
            </div>
          </div>
          {editingVisitNotes ? (
            <div className="space-y-4 flex-1 flex flex-col">
              <textarea
                value={editedNote}
                onChange={(e) => setEditedNote(e.target.value)}
                className="w-full flex-1 min-h-[200px] p-4 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-blue/50 font-sans text-sm leading-relaxed resize-y"
                placeholder="Enter visit notes..."
              />
              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => setEditingVisitNotes(false)}
                  className="text-slate-500 hover:text-slate-700 text-sm px-3 py-2"
                >
                  Cancel
                </button>
                <button
                  onClick={saveEdit}
                  className="bg-brand-blue hover:bg-brand-blue/90 text-white rounded-md px-4 py-2 text-sm flex items-center transition-colors"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </button>
              </div>
            </div>
          ) : (
            <div className="text-justify whitespace-pre-line overflow-y-auto flex-1 min-h-0 pr-4 text-sm text-slate-700">
              {reportData.visitNotes[0] || (
                <p className="text-slate-400 italic">No visit summary available.</p>
              )}
            </div>
          )}
        </div>

        {/* SOAP Notes */}
        <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-[0_2px_6px_rgba(0,0,0,0.04),0_0_16px_2px_rgba(191,223,241,0.9)] flex flex-col overflow-hidden max-h-[60vh]">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-medium text-lg text-black">SOAP Notes</h3>
            {soapSections.some(({ key }) => Object.keys(reportData.soapNote[key]).length === 0) && (
              <RetryButton onClick={() => {}} />
            )}
          </div>
          <div className="space-y-3 overflow-y-auto flex-1">
            {soapSections.map(({ key, label }) => {
              const section = reportData.soapNote[key];
              const text = Object.entries(section)
                .map(([k, v]) => (k ? `${k}: ${v}` : `${v}`))
                .join("\n");
              const isExpanded = expandedSoap[key];
              const canToggle = text.trim().length > 180;
              return (
                <div
                  key={key}
                  className="bg-white p-2 rounded-xl border border-slate-50 shadow-md relative"
                >
                  <h4 className="font-medium text-base text-black mb-1">{label}</h4>
                  <div
                    className={`text-sm text-slate-700 whitespace-pre-line ${!isExpanded && canToggle ? "line-clamp-2" : ""}`}
                  >
                    {text}
                  </div>
                  {canToggle && !isExpanded && (
                    <button
                      onClick={() => setExpandedSoap((p) => ({ ...p, [key]: true }))}
                      className="text-sm text-blue-500 hover:text-blue-700 font-medium mt-1"
                    >
                      Read more
                    </button>
                  )}
                  {canToggle && isExpanded && (
                    <button
                      onClick={() => setExpandedSoap((p) => ({ ...p, [key]: false }))}
                      className="text-sm text-blue-500 hover:text-blue-700 font-medium mt-1"
                    >
                      Show less
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Code cards */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 mt-4">
        {/* ICD-10 */}
        <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-[0_2px_6px_rgba(0,0,0,0.04),0_0_16px_2px_rgba(191,223,241,0.9)] max-h-[350px] flex flex-col">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-medium text-lg text-black">ICD-10 Coding</h3>
            {reportData.icdCodes.icd_codes.length === 0 && <RetryButton onClick={() => {}} />}
          </div>
          <div className="space-y-3 overflow-y-auto flex-1 min-h-0 pr-2 pb-2">
            {reportData.icdCodes.icd_codes.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-2">No ICD codes available</p>
            ) : (
              reportData.icdCodes.icd_codes.map((c, i) => (
                <div key={i} className="bg-white p-2.5 rounded-xl border border-slate-50 shadow-md">
                  <p className="font-bold text-sm leading-snug">
                    {c.icd_10_code} -{" "}
                    <span className="font-medium text-slate-700">{c.name}</span>
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* CPT Codes */}
        <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-[0_2px_6px_rgba(0,0,0,0.04),0_0_16px_2px_rgba(191,223,241,0.9)] max-h-[350px] flex flex-col">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-medium text-lg text-black">CPT Codes</h3>
          </div>
          <div className="space-y-3 overflow-y-auto flex-1 min-h-0 pr-2 pb-2">
            {reportData.cptCodes.cpt_codes.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-2">No CPT codes available</p>
            ) : (
              reportData.cptCodes.cpt_codes.map((c, i) => (
                <div key={i} className="bg-white p-2.5 rounded-xl border border-slate-50 shadow-md">
                  <p className="font-bold text-sm leading-snug">
                    {c.cpt_code} -{" "}
                    <span className="font-medium text-slate-700">{c.name}</span>
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* CPT-2 Codes */}
        <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-[0_2px_6px_rgba(0,0,0,0.04),0_0_16px_2px_rgba(191,223,241,0.9)] max-h-[350px] flex flex-col">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-medium text-lg text-black">CPT-2 Codes</h3>
          </div>
          <div className="space-y-3 overflow-y-auto flex-1 min-h-0 pr-2 pb-2">
            {reportData.cpt2Codes.codes.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-2">No CPT-2 codes available</p>
            ) : (
              reportData.cpt2Codes.codes.map((c, i) => (
                <div key={i} className="bg-white p-2.5 rounded-xl border border-slate-50 shadow-md">
                  <p className="font-bold text-sm leading-snug">
                    {c.cpt2_code} -{" "}
                    <span className="font-medium text-slate-700">{c.description}</span>
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* E&M Codes */}
        <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-[0_2px_6px_rgba(0,0,0,0.04),0_0_16px_2px_rgba(191,223,241,0.9)] max-h-[350px] flex flex-col">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-medium text-lg text-black">E&amp;M Codes</h3>
          </div>
          <div className="space-y-3 overflow-y-auto flex-1 min-h-0 pr-2 pb-2">
            {!reportData.emCodes.em_code ? (
              <p className="text-sm text-slate-500 text-center py-2">No E&M codes available</p>
            ) : (
              <div className="bg-white p-2.5 rounded-xl border border-slate-50 shadow-md">
                <p className="font-bold text-sm leading-snug">
                  {reportData.emCodes.em_code} -{" "}
                  <span className="font-medium text-slate-700">{reportData.emCodes.description}</span>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function OrdersTab() {
  const reportData = useAppSelector((s) => s.recording.reportData);
  const reportLoading = useAppSelector((s) => s.recording.reportLoading);

  if (reportLoading) {
    return (
      <div className="p-3 sm:p-6 space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-slate-50 p-3 rounded-lg animate-pulse">
            <div className="h-4 bg-slate-200 rounded w-1/3 mb-2" />
            <div className="h-4 bg-slate-200 rounded w-full" />
          </div>
        ))}
      </div>
    );
  }

  if (!reportData) return null;

  const meds = reportData.medication.prescribed_medications;
  const labs = reportData.labtest.lab_test as Array<{ name: string; reason?: string }>;
  const followup = reportData.followup.follow_up_appointment;
  const vaccines = reportData.vaccine.vaccine as Array<{ name: string }>;
  const procedures = reportData.procedure.procedure as Array<{ name: string; reason?: string }>;
  const referrals = reportData.referrals as Array<{ specialist: string; reason?: string }>;

  return (
    <div className="p-3 sm:p-6 space-y-4">
      {/* Prescribed Medications */}
      <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-[0_2px_6px_rgba(0,0,0,0.04),0_0_16px_2px_rgba(191,223,241,0.9)]">
        <div className="flex justify-between mb-2">
          <h3 className="font-medium text-lg text-black">Prescribed Medications</h3>
          {meds.length === 0 && <RetryButton onClick={() => {}} />}
        </div>
        <div className="space-y-3">
          {meds.length === 0 ? (
            <div className="text-center p-4 text-slate-500">No medications prescribed</div>
          ) : (
            meds.map((med, i) => (
              <div key={i} className="bg-white p-2 rounded-xl border border-slate-50 shadow-md">
                <div className="grid grid-cols-2 gap-2 md:grid-cols-6 md:gap-0 items-center">
                  <div className="font-medium text-base text-black col-span-1">
                    {med.correct_medicine_name}
                  </div>
                  <div className="col-span-1">
                    <p className="text-sm text-slate-500">Dosage</p>
                    <p className="text-sm">{med.dosage} {med.unit}</p>
                  </div>
                  <div className="col-span-1">
                    <p className="text-sm text-slate-500">Frequency</p>
                    <p className="text-sm">
                      M: {med.frequency.morning || "0"}, A: {med.frequency.afternoon || "0"}, N: {med.frequency.night || "0"}
                    </p>
                  </div>
                  <div className="col-span-1">
                    <p className="text-sm text-slate-500">Start Date</p>
                    <p className="text-sm">{med.start_date}</p>
                  </div>
                  <div className="col-span-1">
                    <p className="text-sm text-slate-500">Duration</p>
                    <p className="text-sm">{med.days} days</p>
                  </div>
                  <div className="col-span-1">
                    <p className="text-sm text-slate-500">Instructions</p>
                    <p className="text-sm">{med.instruction}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Lab Tests */}
      <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-[0_2px_6px_rgba(0,0,0,0.04),0_0_16px_2px_rgba(191,223,241,0.9)]">
        <div className="flex justify-between mb-2">
          <h3 className="font-medium text-lg text-black">Recommended Lab Tests</h3>
        </div>
        <div className="space-y-3">
          {labs.length === 0 ? (
            <div className="text-center p-4 text-slate-500">No lab tests recommended</div>
          ) : (
            labs.map((lab, i) => (
              <div key={i} className="bg-white p-2 rounded-xl border border-slate-50 shadow-md">
                <p className="font-medium text-sm">{lab.name}</p>
                {lab.reason && <p className="text-sm text-slate-500">{lab.reason}</p>}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Procedures */}
      {procedures.length > 0 && (
        <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-[0_2px_6px_rgba(0,0,0,0.04),0_0_16px_2px_rgba(191,223,241,0.9)]">
          <h3 className="font-medium text-lg text-black mb-2">Procedures</h3>
          <div className="space-y-2">
            {procedures.map((p, i) => (
              <div key={i} className="bg-white p-2 rounded-xl border border-slate-50 shadow-md">
                <p className="font-medium text-sm">{p.name}</p>
                {p.reason && <p className="text-sm text-slate-500">{p.reason}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Follow-up */}
      <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-[0_2px_6px_rgba(0,0,0,0.04),0_0_16px_2px_rgba(191,223,241,0.9)]">
        <div className="flex items-center gap-2 mb-2">
          <Calendar className="h-5 w-5 text-brand-orange" />
          <h3 className="font-medium text-lg text-black">Follow-up Appointment</h3>
        </div>
        {!followup ? (
          <div className="text-center p-4 text-slate-500">No follow-up scheduled</div>
        ) : (
          <div className="bg-white p-2 rounded-xl border border-slate-50 shadow-md">
            <p className="font-medium text-sm">In {followup.duration}</p>
            <p className="text-sm text-slate-500">{followup.reason}</p>
          </div>
        )}
      </div>

      {/* Vaccines */}
      {vaccines.length > 0 && (
        <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-[0_2px_6px_rgba(0,0,0,0.04),0_0_16px_2px_rgba(191,223,241,0.9)]">
          <h3 className="font-medium text-lg text-black mb-2">Vaccines</h3>
          <div className="space-y-2">
            {vaccines.map((v, i) => (
              <div key={i} className="bg-white p-2 rounded-xl border border-slate-50 shadow-md">
                <p className="font-medium text-sm">{v.name}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Referrals */}
      {referrals.length > 0 && (
        <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-[0_2px_6px_rgba(0,0,0,0.04),0_0_16px_2px_rgba(191,223,241,0.9)]">
          <h3 className="font-medium text-lg text-black mb-2">Referrals</h3>
          <div className="space-y-2">
            {(referrals as Array<{ specialist: string; reason?: string }>).map((r, i) => (
              <div key={i} className="bg-white p-2 rounded-xl border border-slate-50 shadow-md">
                <p className="font-medium text-sm">{r.specialist}</p>
                {r.reason && <p className="text-sm text-slate-500">{r.reason}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TranscriptionTab() {
  const transcription = useAppSelector((s) => s.recording.transcription);
  const reportLoading = useAppSelector((s) => s.recording.reportLoading);

  return (
    <div className="p-3 sm:p-6">
      <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-[0_2px_6px_rgba(0,0,0,0.04),0_0_16px_2px_rgba(191,223,241,0.9)]">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-medium text-lg text-black">Transcription</h3>
          <button className="text-xs px-3 h-8 rounded-full border border-slate-200 hover:border-brand-blue hover:text-brand-blue flex items-center gap-1 transition-colors">
            <Download className="h-3 w-3" />
            Download
          </button>
        </div>
        <div className="bg-slate-50 rounded-xl p-4 max-h-[60vh] overflow-y-auto border border-slate-100">
          {reportLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-4 bg-slate-200 rounded animate-pulse" />
              ))}
            </div>
          ) : transcription.length === 0 ? (
            <p className="text-slate-400 italic text-center">No transcription available</p>
          ) : (
            transcription.map((text, i) => (
              <div key={i} className="mb-3">
                <p className="leading-relaxed text-sm">{text}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export function ReportView() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const pathname = usePathname();
  const isVisitDetailsRoute = pathname === "/visit-details";
  const { reportData, reportLoading, visitId, transcription } = useAppSelector((s) => s.recording);
  const [showBackWarning, setShowBackWarning] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportWarning, setExportWarning] = useState("");

  const handleBack = () => {
    setShowBackWarning(true);
  };

  const handleEndVisit = () => {
    dispatch(endVisit());
    if (isVisitDetailsRoute) {
      router.push("/recording");
    }
  };

  const handleExportPDF = async () => {
    if (!reportData) {
      setExportWarning("No report data available to export.");
      setTimeout(() => setExportWarning(""), 3000);
      return;
    }

    setIsExporting(true);
    try {
      const { default: jsPDF } = await import("jspdf");
      const doc = new jsPDF();

      const pageHeight = doc.internal.pageSize.getHeight();
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 14;
      const maxWidth = pageWidth - margin * 2;
      let y = 20;

      const sanitize = (text: string) =>
        text.replace(/[^\x20-\x7E\n]/g, "").trim();

      const checkPage = (lineHeight: number) => {
        if (y + lineHeight > pageHeight - 10) {
          doc.addPage();
          y = 20;
        }
      };

      const addText = (text: string, fontSize: number, isBold = false) => {
        doc.setFontSize(fontSize);
        doc.setFont("helvetica", isBold ? "bold" : "normal");
        const lines = doc.splitTextToSize(sanitize(text), maxWidth);
        (lines as string[]).forEach((line) => {
          checkPage(fontSize * 0.4 + 2);
          doc.text(line, margin, y);
          y += fontSize * 0.4 + 2;
        });
      };

      const addSectionHeader = (title: string) => {
        y += 4;
        checkPage(14);
        doc.setFontSize(13);
        doc.setFont("helvetica", "bold");
        doc.text(sanitize(title), margin, y);
        y += 7;
        doc.setDrawColor(200, 200, 200);
        doc.line(margin, y, pageWidth - margin, y);
        y += 4;
      };

      // 1. Report title + metadata
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text("Visit Report", margin, y);
      y += 10;
      addText(`Visit ID: ${visitId || "draft"}`, 10);
      addText(`Generated: ${new Date().toLocaleString()}`, 10);
      y += 6;

      // 2. Visit Summary
      addSectionHeader("Visit Summary");
      addText(reportData.visitNotes[0] || "Insufficient content", 10);

      // 3. SOAP Notes
      addSectionHeader("SOAP Notes");
      const soapSections = [
        { label: "Subjective", data: reportData.soapNote.subjective },
        { label: "Objective", data: reportData.soapNote.objective },
        { label: "Assessment", data: reportData.soapNote.assessment },
        { label: "Plan", data: reportData.soapNote.plan },
      ] as const;
      for (const { label, data } of soapSections) {
        addText(label, 11, true);
        const text = Object.entries(data)
          .map(([k, v]) => `${k}: ${v}`)
          .join("\n");
        addText(text || "Insufficient content", 10);
        y += 3;
      }

      // 4. Medical Coding
      addSectionHeader("Medical Coding");
      addText("ICD-10 Codes", 11, true);
      if (reportData.icdCodes.icd_codes.length === 0) {
        addText("Insufficient content", 10);
      } else {
        reportData.icdCodes.icd_codes.forEach((c) =>
          addText(`${c.icd_10_code} - ${c.name}`, 10)
        );
      }
      y += 3;

      addText("CPT Codes", 11, true);
      if (reportData.cptCodes.cpt_codes.length === 0) {
        addText("Insufficient content", 10);
      } else {
        reportData.cptCodes.cpt_codes.forEach((c) =>
          addText(`${c.cpt_code} - ${c.name}`, 10)
        );
      }
      y += 3;

      addText("CPT-2 Codes", 11, true);
      if (reportData.cpt2Codes.codes.length === 0) {
        addText("Insufficient content", 10);
      } else {
        reportData.cpt2Codes.codes.forEach((c) =>
          addText(`${c.cpt2_code} - ${c.description}`, 10)
        );
      }
      y += 3;

      addText("E/M Code", 11, true);
      addText(
        reportData.emCodes.em_code
          ? `${reportData.emCodes.em_code} - ${reportData.emCodes.description}`
          : "Insufficient content",
        10
      );

      // 5. Orders
      addSectionHeader("Orders");

      addText("Prescribed Medications", 11, true);
      const meds = reportData.medication.prescribed_medications;
      if (meds.length === 0) {
        addText("No medications prescribed", 10);
      } else {
        meds.forEach((med) =>
          addText(
            `${med.correct_medicine_name} - ${med.dosage} ${med.unit}, ` +
              `Freq M:${med.frequency.morning || "0"}/A:${med.frequency.afternoon || "0"}/N:${med.frequency.night || "0"}, ` +
              `${med.days} days, ${med.instruction}`,
            10
          )
        );
      }
      y += 3;

      const labs = reportData.labtest.lab_test as Array<{ name: string; reason?: string }>;
      addText("Lab Tests", 11, true);
      if (labs.length === 0) {
        addText("No lab tests recommended", 10);
      } else {
        labs.forEach((lab) =>
          addText(`${lab.name}${lab.reason ? ` - ${lab.reason}` : ""}`, 10)
        );
      }
      y += 3;

      const procedures = reportData.procedure.procedure as Array<{ name: string; reason?: string }>;
      if (procedures.length > 0) {
        addText("Procedures", 11, true);
        procedures.forEach((p) =>
          addText(`${p.name}${p.reason ? ` - ${p.reason}` : ""}`, 10)
        );
        y += 3;
      }

      const followup = reportData.followup.follow_up_appointment;
      addText("Follow-up Appointment", 11, true);
      addText(
        followup ? `In ${followup.duration} - ${followup.reason}` : "No follow-up scheduled",
        10
      );
      y += 3;

      const vaccines = reportData.vaccine.vaccine as Array<{ name: string }>;
      if (vaccines.length > 0) {
        addText("Vaccines", 11, true);
        vaccines.forEach((v) => addText(v.name, 10));
        y += 3;
      }

      const referrals = reportData.referrals as Array<{ specialist: string; reason?: string }>;
      if (referrals.length > 0) {
        addText("Referrals", 11, true);
        referrals.forEach((r) =>
          addText(`${r.specialist}${r.reason ? ` - ${r.reason}` : ""}`, 10)
        );
      }

      // 6. Full Transcription
      addSectionHeader("Full Transcription");
      if (transcription.length === 0) {
        addText("Insufficient content", 10);
      } else {
        transcription.forEach((text) => addText(text, 10));
      }

      doc.save(`visit-report-${visitId || "draft"}.pdf`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Report Header */}
      <header className="bg-white border-b border-slate-100 py-2 px-2 sm:py-4 sm:px-6 flex justify-between items-center gap-1 sm:gap-2 sticky top-0 z-50 shadow-sm">
        <button
          onClick={handleBack}
          className="flex items-center space-x-1 sm:space-x-2 text-slate-600 hover:text-brand-blue px-1 sm:px-3 text-sm transition-colors"
        >
          <ArrowLeft className="h-4 w-4 shrink-0" />
          <span className="hidden sm:inline">Back to Recording</span>
        </button>

        <h1 className="text-xs sm:text-lg font-bold bg-clip-text text-transparent bg-brand-gradient truncate">
          HIKIGAI AIScribe
        </h1>

        <div className="flex space-x-1 sm:space-x-2">
          {exportWarning && (
            <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-2 py-1">
              <AlertTriangle className="h-3 w-3 shrink-0" />
              <span className="hidden sm:inline">{exportWarning}</span>
            </span>
          )}
          <button
            onClick={handleExportPDF}
            disabled={isExporting}
            className="rounded-full border border-slate-200 hover:border-brand-green hover:text-brand-green text-xs sm:text-sm px-2 sm:px-3 h-8 sm:h-9 flex items-center transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isExporting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin sm:mr-2" />
                <span className="hidden sm:inline">Exporting...</span>
              </>
            ) : (
              <>
                <Download className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Export PDF</span>
              </>
            )}
          </button>
          <button
            onClick={handleEndVisit}
            className="text-red-500 hover:text-white hover:bg-red-500 border border-red-200 rounded-full px-2 sm:px-4 h-8 sm:h-9 flex items-center text-sm transition-colors"
          >
            <X className="h-4 w-4 sm:mr-1" />
            <span className="hidden sm:inline">End Visit</span>
          </button>
        </div>
      </header>

      {/* Loading state */}
      {reportLoading && (
        <div className="flex justify-center items-center h-[60vh]">
          <div className="flex flex-col items-center text-center">
            <Loader2 className="h-12 w-12 text-brand-blue animate-spin mb-4" />
            <h2 className="text-xl font-medium text-brand-blue mb-2">
              Processing Your Transcription
            </h2>
            <p className="text-slate-600 max-w-md mb-4">
              We&apos;re analyzing the conversation and generating your medical report. This may take
              a few moments.
            </p>
          </div>
        </div>
      )}

      {/* No data state */}
      {!reportLoading && !reportData && (
        <div className="flex justify-center items-center h-[60vh]">
          <div className="flex flex-col items-center text-center">
            <AlertTriangle className="h-12 w-12 text-brand-orange mb-4" />
            <h2 className="text-xl font-medium text-brand-orange mb-2">
              No Report Data Available
            </h2>
            <p className="text-slate-600 max-w-md mb-4">
              We couldn&apos;t find any report data. Please go back to the recording page to start
              a new session.
            </p>
            <button
              onClick={() => dispatch(setCurrentView("recording"))}
              className="mt-2 bg-brand-blue text-white hover:bg-brand-pink rounded-lg px-6 py-2 transition-colors"
            >
              Return to Recording
            </button>
          </div>
        </div>
      )}

      {/* Tabs — shown when data is ready or still loading */}
      {(reportData || reportLoading) && (
        <main className="mx-2 py-3 px-2 sm:mx-8 sm:py-8 sm:px-6">
          <h1 className="text-base sm:text-2xl mb-2 font-semibold text-slate-800">Visit Notes</h1>
          <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] overflow-hidden">
            <Tabs defaultValue="medical-notes">
              <div className="overflow-x-auto px-2 sm:px-4 pt-2 pb-2">
                <TabsList className="grid grid-cols-3 bg-transparent rounded-lg p-1 gap-1 sm:gap-2 h-auto w-full">
                  <TabsTrigger value="medical-notes">
                    <ClipboardList className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                    <span className="truncate">Medical Notes</span>
                  </TabsTrigger>
                  <TabsTrigger value="orders">
                    <Lock className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                    <span className="truncate">Orders</span>
                  </TabsTrigger>
                  <TabsTrigger value="transcription">
                    <MessageSquare className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                    <span className="truncate">Transcription</span>
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="medical-notes">
                <MedicalNotesTab />
              </TabsContent>
              <TabsContent value="orders">
                <OrdersTab />
              </TabsContent>
              <TabsContent value="transcription">
                <TranscriptionTab />
              </TabsContent>
            </Tabs>
          </div>
        </main>
      )}

      {/* Back Warning Dialog */}
      <Dialog open={showBackWarning} onOpenChange={setShowBackWarning}>
        <DialogContent className="max-w-md p-6" showClose={false}>
          <h2 className="text-lg font-semibold text-slate-700 mb-2">Unsaved Changes</h2>
          <p className="text-sm text-slate-600 mb-4">
            You have unsaved changes to the visit notes. Going back will discard these changes.
          </p>
          <div className="flex items-center gap-2 mb-4">
            <input
              type="checkbox"
              id="dont-show-again"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="rounded"
            />
            <label htmlFor="dont-show-again" className="text-sm text-slate-600">
              Don&apos;t show this again
            </label>
          </div>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setShowBackWarning(false)}
              className="border border-slate-200 rounded-md px-4 py-2 text-sm hover:bg-slate-50"
            >
              Stay
            </button>
            <button
              onClick={() => {
                setShowBackWarning(false);
                if (isVisitDetailsRoute) {
                  router.push("/recording");
                } else {
                  dispatch(setCurrentView("recording"));
                }
              }}
              className="bg-brand-blue text-white hover:bg-brand-pink rounded-md px-4 py-2 text-sm transition-colors"
            >
              Discard &amp; Go Back
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
