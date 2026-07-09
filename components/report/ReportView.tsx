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
  Calendar,
  FileText,
  Stethoscope,
  Pill,
  FlaskConical,
  ClipboardCheck,
} from "lucide-react";

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { apiFetch, cleanDateValue, withoutBasePath } from "@/lib/utils";
import { formatMedicationFrequency } from "@/lib/medication";
import { getProcedureTypeBadge } from "@/lib/procedure-types";
import { chargeVisitMinutesIfNeeded } from "@/lib/auth/minutes";
import { exportVisitReportPdf } from "@/lib/report-pdf";
import {
  setCurrentView,
  endVisit,
  setReportData,
} from "@/store/slices/recordingSlice";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";


function RetryButton({ onClick, isLoading = false }: { onClick: () => void; isLoading?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={isLoading}
      className="text-xs px-2 h-7 rounded-full border border-slate-200 hover:border-amber-500 hover:text-amber-500 transition-colors flex items-center disabled:opacity-60 disabled:cursor-not-allowed"
    >
      <RefreshCcw className={`h-3 w-3 mr-1 ${isLoading ? "animate-spin" : ""}`} />
      {isLoading ? "Retrying" : "Retry"}
    </button>
  );
}

function buildTranscriptMessage(transcription: string[]) {
  return transcription
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join("\n");
}

function getApiError(
  response: Response,
  data: { error?: string },
  fallbackMessage: string
): string | null {
  const responseError =
    typeof data.error === "string" && data.error.trim() ? data.error.trim() : null;

  if (!response.ok || responseError) {
    return responseError || fallbackMessage;
  }

  return null;
}

function MedicalNotesTab({ transcriptMessage }: { transcriptMessage: string }) {
  const dispatch = useAppDispatch();
  const reportData = useAppSelector((s) => s.recording.reportData);
  const reportLoading = useAppSelector((s) => s.recording.reportLoading);

  const [expandedSoap, setExpandedSoap] = useState<Record<string, boolean>>({});
  const [retryingSection, setRetryingSection] = useState<"visit" | "soap" | "icd" | "cpt" | "cpt2" | "em" | null>(null);
  const [retryErrors, setRetryErrors] = useState<Record<string, string>>({});

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

  const retryVisitNotes = async () => {
    if (!transcriptMessage) return;
    setRetryingSection("visit");
    setRetryErrors((prev) => ({ ...prev, visit: "" }));
    try {
      const response = await apiFetch("/api/visit-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: transcriptMessage }),
      });

      const data = (await response.json()) as { visit_notes?: string[]; error?: string };
      const apiError = getApiError(response, data, "Visit notes retry failed");
      if (apiError) {
        throw new Error(apiError);
      }

      const mappedVisitNotes = (data.visit_notes || []).filter((item) => item.trim().length > 0);
      dispatch(
        setReportData({
          ...reportData,
          visitNotes: mappedVisitNotes.length > 0 ? [mappedVisitNotes.join("\n\n")] : [],
        })
      );
    } catch (error) {
      setRetryErrors((prev) => ({
        ...prev,
        visit: error instanceof Error ? error.message : "Visit notes retry failed",
      }));
    } finally {
      setRetryingSection(null);
    }
  };

  const retrySoapNotes = async () => {
    if (!transcriptMessage) return;
    setRetryingSection("soap");
    setRetryErrors((prev) => ({ ...prev, soap: "" }));
    try {
      const response = await apiFetch("/api/soap-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: transcriptMessage }),
      });

      const data = (await response.json()) as {
        subjective?: string;
        objective?: string;
        assessment?: string;
        plan?: string;
        error?: string;
      };

      const apiError = getApiError(response, data, "SOAP notes retry failed");
      if (apiError) {
        throw new Error(apiError);
      }

      const subjective = data.subjective?.trim() || "";
      const objective = data.objective?.trim() || "";
      const assessment = data.assessment?.trim() || "";
      const plan = data.plan?.trim() || "";

      dispatch(
        setReportData({
          ...reportData,
          soapNote: {
            subjective: subjective ? { subjective } : {},
            objective: objective ? { objective } : {},
            assessment: assessment ? { assessment } : {},
            plan: plan ? { plan } : {},
          },
        })
      );
    } catch (error) {
      setRetryErrors((prev) => ({
        ...prev,
        soap: error instanceof Error ? error.message : "SOAP notes retry failed",
      }));
    } finally {
      setRetryingSection(null);
    }
  };

  const retryIcdCodes = async () => {
    if (!transcriptMessage) return;
    setRetryingSection("icd");
    setRetryErrors((prev) => ({ ...prev, icd: "" }));
    try {
      const response = await apiFetch("/api/icd-10-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: transcriptMessage }),
      });

      const data =
        (await response.json()) as {
          icd_codes?: Array<{ icd_10_code: string; name: string }>;
          error?: string;
        };

      const apiError = getApiError(response, data, "ICD-10 retry failed");
      if (apiError) {
        throw new Error(apiError);
      }

      dispatch(
        setReportData({
          ...reportData,
          icdCodes: {
            icd_codes: data.icd_codes || [],
          },
        })
      );
    } catch (error) {
      setRetryErrors((prev) => ({
        ...prev,
        icd: error instanceof Error ? error.message : "ICD-10 retry failed",
      }));
    } finally {
      setRetryingSection(null);
    }
  };

  const retryCptCodes = async () => {
    if (!transcriptMessage) return;
    setRetryingSection("cpt");
    setRetryErrors((prev) => ({ ...prev, cpt: "" }));
    try {
      const response = await apiFetch("/api/cpt-pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: transcriptMessage }),
      });

      const data = (await response.json()) as {
        cpt_codes?: Array<{ cpt_code: string; name: string }>;
        error?: string;
      };

      const apiError = getApiError(response, data, "CPT retry failed");
      if (apiError) {
        throw new Error(apiError);
      }

      dispatch(
        setReportData({
          ...reportData,
          cptCodes: {
            cpt_codes: data.cpt_codes || [],
          },
        })
      );
    } catch (error) {
      setRetryErrors((prev) => ({
        ...prev,
        cpt: error instanceof Error ? error.message : "CPT retry failed",
      }));
    } finally {
      setRetryingSection(null);
    }
  };

  const retryCpt2Codes = async () => {
    if (!transcriptMessage) return;
    setRetryingSection("cpt2");
    setRetryErrors((prev) => ({ ...prev, cpt2: "" }));
    try {
      const response = await apiFetch("/api/cpt2-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: transcriptMessage }),
      });

      const data = (await response.json()) as {
        codes?: Array<{ cpt2_code: string; description: string }>;
        error?: string;
      };

      const apiError = getApiError(response, data, "CPT-2 retry failed");
      if (apiError) {
        throw new Error(apiError);
      }

      dispatch(
        setReportData({
          ...reportData,
          cpt2Codes: {
            codes: data.codes || [],
          },
        })
      );
    } catch (error) {
      setRetryErrors((prev) => ({
        ...prev,
        cpt2: error instanceof Error ? error.message : "CPT-2 retry failed",
      }));
    } finally {
      setRetryingSection(null);
    }
  };

  const retryEmCode = async () => {
    if (!transcriptMessage) return;
    setRetryingSection("em");
    setRetryErrors((prev) => ({ ...prev, em: "" }));
    try {
      const response = await apiFetch("/api/em-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: transcriptMessage }),
      });

      const data = (await response.json()) as {
        em_code?: string;
        description?: string;
        error?: string;
      };

      const apiError = getApiError(response, data, "E/M retry failed");
      if (apiError) {
        throw new Error(apiError);
      }

      dispatch(
        setReportData({
          ...reportData,
          emCodes: {
            em_code: data.em_code || "",
            description: data.description || "",
          },
        })
      );
    } catch (error) {
      setRetryErrors((prev) => ({
        ...prev,
        em: error instanceof Error ? error.message : "E/M retry failed",
      }));
    } finally {
      setRetryingSection(null);
    }
  };

  const isVisitSummaryMissing = !reportData.visitNotes[0];

  const soapSections = [
    { key: "subjective", label: "Subjective" },
    { key: "objective", label: "Objective" },
    { key: "assessment", label: "Assessment" },
    { key: "plan", label: "Plan" },
  ] as const;

  return (
    <div className="p-3 sm:p-6 space-y-4">
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
        {/* Visit Summary — hidden during loading */}
        {!reportLoading && <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-[0_2px_6px_rgba(0,0,0,0.04),0_0_16px_2px_rgba(191,223,241,0.9)] flex flex-col max-h-[60vh] overflow-hidden">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-medium text-lg text-black">Visit Summary</h3>
            <div className="flex gap-2">
              {isVisitSummaryMissing && (
                <RetryButton onClick={retryVisitNotes} isLoading={retryingSection === "visit"} />
              )}
            </div>
          </div>
          {!!retryErrors.visit && (
            <p className="text-xs text-rose-600 mb-2">{retryErrors.visit}</p>
          )}
          <div className="text-justify whitespace-pre-line overflow-y-auto flex-1 min-h-0 pr-4 text-sm text-slate-700">
            {reportData.visitNotes[0] || (
              <p className="text-slate-400 italic">No visit summary available.</p>
            )}
          </div>
        </div>}

        {/* SOAP Notes */}
        <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-[0_2px_6px_rgba(0,0,0,0.04),0_0_16px_2px_rgba(191,223,241,0.9)] flex flex-col overflow-hidden max-h-[60vh]">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-medium text-lg text-black">SOAP Notes</h3>
            {soapSections.some(({ key }) => Object.keys(reportData.soapNote[key]).length === 0) && (
              <RetryButton onClick={retrySoapNotes} isLoading={retryingSection === "soap"} />
            )}
          </div>
          {!!retryErrors.soap && (
            <p className="text-xs text-rose-600 mb-2">{retryErrors.soap}</p>
          )}
          <div className="space-y-3 overflow-y-auto flex-1">
            {soapSections.map(({ key, label }) => {
              const section = reportData.soapNote[key];
              const text = Object.values(section).join("\n");
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
            {reportData.icdCodes.icd_codes.length === 0 && (
              <RetryButton onClick={retryIcdCodes} isLoading={retryingSection === "icd"} />
            )}
          </div>
          {!!retryErrors.icd && <p className="text-xs text-rose-600 mb-2">{retryErrors.icd}</p>}
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
            {reportData.cptCodes.cpt_codes.length === 0 && (
              <RetryButton onClick={retryCptCodes} isLoading={retryingSection === "cpt"} />
            )}
          </div>
          {!!retryErrors.cpt && <p className="text-xs text-rose-600 mb-2">{retryErrors.cpt}</p>}
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
            {reportData.cpt2Codes.codes.length === 0 && (
              <RetryButton onClick={retryCpt2Codes} isLoading={retryingSection === "cpt2"} />
            )}
          </div>
          {!!retryErrors.cpt2 && <p className="text-xs text-rose-600 mb-2">{retryErrors.cpt2}</p>}
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

        {/* EM Codes */}
        <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-[0_2px_6px_rgba(0,0,0,0.04),0_0_16px_2px_rgba(191,223,241,0.9)] max-h-[350px] flex flex-col">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-medium text-lg text-black">EM Codes</h3>
            {!reportData.emCodes.em_code && (
              <RetryButton onClick={retryEmCode} isLoading={retryingSection === "em"} />
            )}
          </div>
          {!!retryErrors.em && <p className="text-xs text-rose-600 mb-2">{retryErrors.em}</p>}
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

function OrdersTab({ transcriptMessage }: { transcriptMessage: string }) {
  const dispatch = useAppDispatch();
  const reportData = useAppSelector((s) => s.recording.reportData);
  const reportLoading = useAppSelector((s) => s.recording.reportLoading);
  const [retryingSection, setRetryingSection] = useState<"medications" | "labs" | "followup" | "procedures" | "referrals" | null>(null);
  const [retryingVaccines, setRetryingVaccines] = useState(false);
  const [retryErrors, setRetryErrors] = useState<Record<string, string>>({});

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
  const labs = (reportData.labtest.lab_test as Array<Record<string, unknown>>)
    .map((item) => {
      const name = typeof item.name === "string" ? item.name : "";
      if (!name.trim()) return null;
      return {
        name,
        date: typeof item.date === "string" && item.date.trim() ? item.date : "N/A",
        notes:
          typeof item.notes === "string" && item.notes.trim()
            ? item.notes
            : typeof item.reason === "string" && item.reason.trim()
              ? item.reason
              : "N/A",
      };
    })
    .filter((item): item is { name: string; date: string; notes: string } => item !== null);
  const followup = reportData.followup.follow_up_appointment;
  const vaccines = (reportData.vaccine.vaccine as Array<Record<string, unknown>>)
    .map((item) => {
      const name =
        typeof item.name === "string"
          ? item.name
          : typeof item.vaccine_name === "string"
            ? item.vaccine_name
            : "";
      if (!name.trim()) return null;
      return {
        name,
        dose:
          typeof item.dose === "string" && item.dose.trim()
            ? item.dose
            : typeof item.dose_number === "string" && item.dose_number.trim()
              ? item.dose_number
              : "N/A",
        date: typeof item.date === "string" && item.date.trim() ? item.date : "N/A",
      };
    })
    .filter((item): item is { name: string; dose: string; date: string } => item !== null);
  const procedures = (reportData.procedure.procedure as Array<Record<string, unknown>>)
    .map((item) => {
      const name =
        typeof item.name === "string"
          ? item.name
          : typeof item.procedure_name === "string"
            ? item.procedure_name
            : "";
      if (!name.trim()) return null;
      return {
        name,
        date: typeof item.date === "string" && item.date.trim() ? item.date : "N/A",
        notes:
          typeof item.reason === "string"
            ? item.reason
            : typeof item.clinical_context === "string"
              ? item.clinical_context
              : "N/A",
        badge: getProcedureTypeBadge(
          typeof item.procedure_type === "string" ? item.procedure_type : undefined
        ),
      };
    })
    .filter((item): item is { name: string; date: string; notes: string; badge: string } => item !== null);

  const allProcedures = [
    ...procedures.map((item) => ({
      key: `procedure-${item.name}-${item.date}`,
      name: item.name,
      badge: item.badge,
      date: item.date,
      detailLabel: "Note",
      detail: item.notes,
    })),
    ...vaccines.map((item) => ({
      key: `vaccine-${item.name}-${item.date}`,
      name: item.name,
      badge: "Vaccine",
      date: item.date,
      detailLabel: "Dose",
      detail: item.dose,
    })),
  ];

  const referrals = (reportData.referrals as Array<Record<string, unknown>>)
    .map((item) => {
      const specialist =
        typeof item.specialist === "string"
          ? item.specialist
          : typeof item.name === "string"
            ? item.name
            : "";
      if (!specialist.trim()) return null;
      return {
        specialist,
        reason:
          typeof item.reason === "string"
            ? item.reason
            : typeof item.clinical_context === "string"
              ? item.clinical_context
              : "",
        notes:
          typeof item.notes === "string"
            ? item.notes
            : "",
        badge:
          typeof item.type === "string" && item.type.trim()
            ? item.type
            : "routine",
      };
    })
    .filter((item): item is { specialist: string; reason: string; notes: string; badge: string } => item !== null);

  const followupCard = (() => {
    if (!followup) {
      return null;
    }
    const item = followup as unknown as Record<string, unknown>;
    return {
      date: cleanDateValue(item.date) || cleanDateValue(item.duration) || "N/A",
      reason:
        (typeof item.reason === "string" && item.reason.trim()) ||
        "No follow-up reason provided",
      instructions:
        (typeof item.instructions === "string" && item.instructions.trim()) ||
        "No additional instructions",
      badge:
        (typeof item.visit_type === "string" && item.visit_type.trim()
          ? `${item.visit_type} Follow-Up`
          : "Routine Follow-Up"),
    };
  })();

  const retryMedications = async () => {
    if (!transcriptMessage) return;
    setRetryingSection("medications");
    setRetryErrors((prev) => ({ ...prev, medications: "" }));
    try {
      const response = await apiFetch("/api/medications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: transcriptMessage }),
      });
      const data = (await response.json()) as { medication?: unknown[]; error?: string };
      const apiError = getApiError(response, data, "Medication retry failed");
      if (apiError) {
        throw new Error(apiError);
      }

      const today = new Date().toLocaleDateString("en-US", {
        month: "2-digit",
        day: "2-digit",
        year: "numeric",
      });

      const mappedPrescribedMedications = (data.medication || [])
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
                  ? (() => {
                      try {
                        return JSON.parse(rawFreq) as {
                          morning?: unknown;
                          afternoon?: unknown;
                          night?: unknown;
                        };
                      } catch {
                        return {};
                      }
                    })()
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
              start_date:
                typeof med.start_date === "string" && med.start_date ? med.start_date : today,
              days: typeof med.days === "string" ? med.days : "",
              instruction: typeof med.instruction === "string" ? med.instruction : "",
            };
          }

          return null;
        })
        .filter(
          (
            item
          ): item is {
            correct_medicine_name: string;
            dosage: string;
            unit: string;
            frequency: { morning: string | null; afternoon: string | null; night: string | null };
            start_date: string;
            days: string;
            instruction: string;
          } => item !== null
        );

      dispatch(
        setReportData({
          ...reportData,
          medication: {
            ...reportData.medication,
            prescribed_medications: mappedPrescribedMedications,
          },
        })
      );
    } catch (error) {
      setRetryErrors((prev) => ({
        ...prev,
        medications: error instanceof Error ? error.message : "Medication retry failed",
      }));
    } finally {
      setRetryingSection(null);
    }
  };

  const retryLabTests = async () => {
    if (!transcriptMessage) return;
    setRetryingSection("labs");
    setRetryErrors((prev) => ({ ...prev, labs: "" }));
    try {
      const response = await apiFetch("/api/lab-tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: transcriptMessage }),
      });
      const data = (await response.json()) as { lab_test?: unknown[]; error?: string };
      const apiError = getApiError(response, data, "Lab tests retry failed");
      if (apiError) {
        throw new Error(apiError);
      }

      dispatch(
        setReportData({
          ...reportData,
          labtest: {
            lab_test: data.lab_test || [],
          },
        })
      );
    } catch (error) {
      setRetryErrors((prev) => ({
        ...prev,
        labs: error instanceof Error ? error.message : "Lab tests retry failed",
      }));
    } finally {
      setRetryingSection(null);
    }
  };

  const retryFollowup = async () => {
    if (!transcriptMessage) return;
    setRetryingSection("followup");
    setRetryErrors((prev) => ({ ...prev, followup: "" }));
    try {
      const response = await apiFetch("/api/follow-ups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: transcriptMessage }),
      });
      const data = (await response.json()) as { follow_ups?: unknown[]; error?: string };
      const apiError = getApiError(response, data, "Follow-up retry failed");
      if (apiError) {
        throw new Error(apiError);
      }

      const firstFollowUp = (data.follow_ups || [])[0];
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
            cleanDateValue(item.duration) ||
            cleanDateValue(item.date) ||
            "";
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

      dispatch(
        setReportData({
          ...reportData,
          followup: {
            follow_up_appointment: mappedFollowUp,
          },
        })
      );
    } catch (error) {
      setRetryErrors((prev) => ({
        ...prev,
        followup: error instanceof Error ? error.message : "Follow-up retry failed",
      }));
    } finally {
      setRetryingSection(null);
    }
  };

  const retryProcedures = async () => {
    if (!transcriptMessage) return;
    setRetryingSection("procedures");
    setRetryErrors((prev) => ({ ...prev, procedures: "" }));
    try {
      const response = await apiFetch("/api/procedures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: transcriptMessage }),
      });

      const data = (await response.json()) as {
        procedure?: unknown[];
        procedures?: unknown[];
        error?: string;
      };

      const apiError = getApiError(response, data, "Procedures retry failed");
      if (apiError) {
        throw new Error(apiError);
      }

      dispatch(
        setReportData({
          ...reportData,
          procedure: {
            procedure: data.procedure || data.procedures || [],
          },
        })
      );
    } catch (error) {
      setRetryErrors((prev) => ({
        ...prev,
        procedures: error instanceof Error ? error.message : "Procedures retry failed",
      }));
    } finally {
      setRetryingSection(null);
    }
  };

  const retryVaccines = async () => {
    if (!transcriptMessage) return;
    setRetryingVaccines(true);
    setRetryErrors((prev) => ({ ...prev, vaccines: "" }));
    try {
      const response = await apiFetch("/api/vaccines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: transcriptMessage }),
      });

      const data = (await response.json()) as { vaccine?: unknown[]; error?: string };
      const apiError = getApiError(response, data, "Vaccines retry failed");
      if (apiError) {
        throw new Error(apiError);
      }

      dispatch(
        setReportData({
          ...reportData,
          vaccine: {
            vaccine: data.vaccine || [],
          },
        })
      );
    } catch (error) {
      setRetryErrors((prev) => ({
        ...prev,
        vaccines: error instanceof Error ? error.message : "Vaccines retry failed",
      }));
    } finally {
      setRetryingVaccines(false);
    }
  };

  const retryReferrals = async () => {
    if (!transcriptMessage) return;
    setRetryingSection("referrals");
    setRetryErrors((prev) => ({ ...prev, referrals: "" }));
    try {
      const response = await apiFetch("/api/referrals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: transcriptMessage }),
      });
      const data = (await response.json()) as { referrals?: unknown[]; error?: string };
      const apiError = getApiError(response, data, "Referrals retry failed");
      if (apiError) {
        throw new Error(apiError);
      }

      dispatch(
        setReportData({
          ...reportData,
          referrals: data.referrals || [],
        })
      );
    } catch (error) {
      setRetryErrors((prev) => ({
        ...prev,
        referrals: error instanceof Error ? error.message : "Referrals retry failed",
      }));
    } finally {
      setRetryingSection(null);
    }
  };

  return (
    <div className="p-3 sm:p-6 space-y-4">
      <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-[0_2px_6px_rgba(0,0,0,0.04),0_0_16px_2px_rgba(191,223,241,0.9)]">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-medium text-lg text-black flex items-center gap-2">
            <Pill className="h-4 w-4 text-slate-400" />
            Prescribed Medications
          </h3>
          {meds.length === 0 && <RetryButton onClick={retryMedications} isLoading={retryingSection === "medications"} />}
        </div>
        {!!retryErrors.medications && <p className="text-xs text-rose-600 mb-2">{retryErrors.medications}</p>}
        {meds.length === 0 ? (
          <div className="text-center p-4 text-slate-500">No medications prescribed</div>
        ) : (
          <div className="space-y-2">
            {meds.map((med, i) => (
              <div key={i} className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
                  <div className="font-bold text-sm text-slate-900 col-span-2 md:col-span-1">{med.correct_medicine_name}</div>
                  <div>
                    <p className="text-sm font-semibold text-slate-600">Dosage</p>
                    <p className="text-sm text-slate-800">{med.dosage && med.unit ? `${med.dosage} ${med.unit}` : med.dosage || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-600">Frequency</p>
                    <p className="text-sm text-slate-800">{formatMedicationFrequency(med.frequency)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-600">Start Date</p>
                    <p className="text-sm text-slate-800">{med.start_date || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-600">Duration</p>
                    <p className="text-sm text-slate-800">{med.days ? `${med.days} days` : "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-600">Instructions</p>
                    <p className="text-sm text-slate-800">{med.instruction || "N/A"}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-[0_2px_6px_rgba(0,0,0,0.04),0_0_16px_2px_rgba(191,223,241,0.9)]">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-medium text-lg text-black flex items-center gap-2">
              <FlaskConical className="h-4 w-4 text-slate-400" />
              Recommended Lab Tests
            </h3>
            {labs.length === 0 && <RetryButton onClick={retryLabTests} isLoading={retryingSection === "labs"} />}
          </div>
          {!!retryErrors.labs && <p className="text-xs text-rose-600 mb-2">{retryErrors.labs}</p>}
          {labs.length === 0 ? (
            <div className="text-center p-4 text-slate-500">No lab tests recommended</div>
          ) : (
            <div className="space-y-2">
              {labs.map((lab, i) => (
                <div key={i} className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-sm">
                  <p className="text-sm font-bold text-slate-900">{lab.name}</p>
                  <p className="text-sm font-semibold text-slate-600 mt-1">Date</p>
                  <p className="text-sm text-slate-800">{lab.date}</p>
                  <p className="text-sm font-semibold text-slate-600 mt-1">Notes</p>
                  <p className="text-sm text-slate-800">{lab.notes}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-[0_2px_6px_rgba(0,0,0,0.04),0_0_16px_2px_rgba(191,223,241,0.9)]">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-medium text-lg text-black flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4 text-slate-400" />
              Procedures
            </h3>
            <div className="flex items-center gap-2">
              {procedures.length === 0 && (
                <RetryButton onClick={retryProcedures} isLoading={retryingSection === "procedures"} />
              )}
              {vaccines.length === 0 && (
                <RetryButton onClick={retryVaccines} isLoading={retryingVaccines} />
              )}
            </div>
          </div>
          {!!retryErrors.procedures && <p className="text-xs text-rose-600 mb-2">{retryErrors.procedures}</p>}
          {!!retryErrors.vaccines && <p className="text-xs text-rose-600 mb-2">{retryErrors.vaccines}</p>}

          {allProcedures.length === 0 ? (
            <div className="text-center p-4 text-slate-500">No procedure information available</div>
          ) : (
            <div className="space-y-2">
              {allProcedures.map((item) => (
                <div key={item.key} className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-slate-900">{item.name}</p>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        item.badge === "Vaccine"
                          ? "bg-sky-100 text-sky-700"
                          : "bg-orange-100 text-orange-600"
                      }`}
                    >
                      {item.badge}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-slate-600 mt-1">Date</p>
                  <p className="text-sm text-slate-800">{item.date}</p>
                  <p className="text-sm font-semibold text-slate-600 mt-1">{item.detailLabel}</p>
                  <p className="text-sm text-slate-800">{item.detail}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-[0_2px_6px_rgba(0,0,0,0.04),0_0_16px_2px_rgba(191,223,241,0.9)]">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-medium text-lg text-black flex items-center gap-2">
              <Stethoscope className="h-4 w-4 text-slate-400" />
              Referrals
            </h3>
            {referrals.length === 0 && <RetryButton onClick={retryReferrals} isLoading={retryingSection === "referrals"} />}
          </div>
          {!!retryErrors.referrals && <p className="text-xs text-rose-600 mb-2">{retryErrors.referrals}</p>}
          {referrals.length === 0 ? (
            <div className="text-center p-4 text-slate-500">No referrals available</div>
          ) : (
            <div className="space-y-2">
              {referrals.map((referral, i) => (
                <div key={i} className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-slate-900">{referral.specialist}</p>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">{referral.badge}</span>
                  </div>
                  <p className="text-sm text-slate-800 mt-1"><span className="font-semibold text-slate-600">Reason:</span> {referral.reason || "N/A"}</p>
                  <p className="text-sm text-slate-800"><span className="font-semibold text-slate-600">Notes:</span> {referral.notes || "N/A"}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-[0_2px_6px_rgba(0,0,0,0.04),0_0_16px_2px_rgba(191,223,241,0.9)]">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-medium text-lg text-black flex items-center gap-2">
              <Calendar className="h-4 w-4 text-slate-400" />
              Follow-up Appointment
            </h3>
            {!followupCard && <RetryButton onClick={retryFollowup} isLoading={retryingSection === "followup"} />}
          </div>
          {!!retryErrors.followup && <p className="text-xs text-rose-600 mb-2">{retryErrors.followup}</p>}
          {!followupCard ? (
            <div className="text-center p-4 text-slate-500">No follow-up appointment scheduled</div>
          ) : (
            <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-slate-900">{followupCard.date}</p>
                <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">{followupCard.badge}</span>
              </div>
              <p className="text-sm text-slate-800 mt-1"><span className="font-semibold text-slate-600">Reason:</span> {followupCard.reason}</p>
              <p className="text-sm text-slate-800"><span className="font-semibold text-slate-600">Instructions:</span> {followupCard.instructions}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TranscriptionTab() {
  const transcription = useAppSelector((s) => s.recording.transcription);
  const formattedTranscription = useAppSelector((s) => s.recording.formattedTranscription);
  const reportLoading = useAppSelector((s) => s.recording.reportLoading);
  const displayTranscription = formattedTranscription ?? transcription;

  const speakerRows = displayTranscription
    .map((line, index) => {
      const doctorMatch = line.match(/^doctor\s*:\s*(.*)$/i);
      if (doctorMatch) {
        return { key: index, speaker: "Doctor", message: doctorMatch[1]?.trim() || "", tone: "doctor" as const };
      }

      const patientMatch = line.match(/^patient\s*:\s*(.*)$/i);
      if (patientMatch) {
        return { key: index, speaker: "Patient", message: patientMatch[1]?.trim() || "", tone: "patient" as const };
      }

      return { key: index, speaker: "Doctor", message: line, tone: "doctor" as const };
    })
    .filter((row) => row.message.length > 0);

  return (
    <div className="p-3 sm:p-6">
      <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-[0_2px_6px_rgba(0,0,0,0.04),0_0_16px_2px_rgba(191,223,241,0.9)]">
          <h3 className="font-medium text-lg text-black mb-4 flex items-center gap-2">
          <FileText className="h-5 w-5 text-slate-500" />
          Full Conversation
        </h3>
        <div className="bg-slate-50 rounded-xl p-4 max-h-[60vh] overflow-y-auto border border-slate-100">
          {reportLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-4 bg-slate-200 rounded animate-pulse" />
              ))}
            </div>
          ) : speakerRows.length === 0 ? (
            <p className="text-slate-400 italic text-center">No transcription available</p>
          ) : (
            speakerRows.map((row) => (
              <div key={row.key} className="flex items-start gap-3 mb-4">
                <div
                  className={`h-9 w-9 rounded-full text-white text-sm font-semibold flex items-center justify-center flex-shrink-0 ${
                    row.tone === "doctor" ? "bg-brand-blue" : "bg-brand-orange"
                  }`}
                >
                  {row.tone === "doctor" ? "D" : "P"}
                </div>
                <div className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-sm">
                  <p className={`text-lg font-semibold ${row.tone === "doctor" ? "text-brand-blue" : "text-brand-orange"}`}>
                    {row.speaker}
                  </p>
                  <p className="text-base leading-relaxed text-slate-700">{row.message}</p>
                </div>
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
  const isVisitDetailsRoute = withoutBasePath(pathname ?? "") === "/visit-details";
  const { reportData, reportLoading, visitId, transcription, formattedTranscription, recordingTime, visitMinutesCharged } = useAppSelector((s) => s.recording);
  const transcriptMessage = buildTranscriptMessage(transcription);
  const displayTranscription = formattedTranscription ?? transcription;
  const [isExporting, setIsExporting] = useState(false);
  const [exportWarning, setExportWarning] = useState("");

  const handleBack = () => {
    dispatch(setCurrentView("recording"));
    if (isVisitDetailsRoute) {
      router.push("/recording");
    }
  };

  const handleEndVisit = async () => {
    await chargeVisitMinutesIfNeeded(dispatch, recordingTime, visitMinutesCharged);
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
      await exportVisitReportPdf({
        reportData,
        visitId,
        transcription: displayTranscription,
      });
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
                <MedicalNotesTab transcriptMessage={transcriptMessage} />
              </TabsContent>
              <TabsContent value="orders">
                <OrdersTab transcriptMessage={transcriptMessage} />
              </TabsContent>
              <TabsContent value="transcription">
                <TranscriptionTab />
              </TabsContent>
            </Tabs>
          </div>
        </main>
      )}

    </div>
  );
}
