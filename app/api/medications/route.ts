import { NextResponse } from "next/server";
import { HIKIGAI_AGENT_TIMEOUT_MS, hikigai } from "@/lib/hikigai";

export const maxDuration = 300;

interface MedicationRequest {
  message?: string;
}

type MedicationItem = {
  correct_medicine_name: string;
  dosage: string;
  unit: string;
  frequency: { morning: string | null; afternoon: string | null; night: string | null };
  start_date: string;
  days: string;
  instruction: string;
};

function str(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function normalizeFrequency(rawFreq: unknown): MedicationItem["frequency"] {
  if (rawFreq && typeof rawFreq === "object") {
    const freq = rawFreq as { morning?: unknown; afternoon?: unknown; night?: unknown };
    return {
      morning: freq.morning != null ? String(freq.morning) : null,
      afternoon: freq.afternoon != null ? String(freq.afternoon) : null,
      night: freq.night != null ? String(freq.night) : null,
    };
  }

  if (typeof rawFreq === "string") {
    try {
      return normalizeFrequency(JSON.parse(rawFreq));
    } catch {
      return { morning: null, afternoon: null, night: null };
    }
  }

  return { morning: null, afternoon: null, night: null };
}

function normalizeMedicationItem(entry: unknown): MedicationItem | null {
  if (typeof entry === "string") {
    const name = entry.trim();
    return name
      ? {
          correct_medicine_name: name,
          dosage: "",
          unit: "",
          frequency: { morning: null, afternoon: null, night: null },
          start_date: "",
          days: "",
          instruction: "",
        }
      : null;
  }

  if (!entry || typeof entry !== "object") {
    return null;
  }

  const item = entry as Record<string, unknown>;
  const medicineName =
    str(item.correct_medicine_name) ??
    str(item.medicine_name) ??
    str(item.medicineName) ??
    str(item.name) ??
    "";

  if (!medicineName) {
    return null;
  }

  return {
    correct_medicine_name: medicineName,
    dosage: str(item.dosage) ?? str(item.dose) ?? "",
    unit: str(item.unit) ?? "",
    frequency: normalizeFrequency(item.frequency),
    start_date: str(item.start_date) ?? str(item.startDate) ?? "",
    days: str(item.days) ?? "",
    instruction: str(item.instruction) ?? str(item.instructions) ?? "",
  };
}

function normalizeMedication(payload: unknown): MedicationItem[] {
  if (!payload || typeof payload !== "object") {
    return [];
  }

  const data = payload as {
    medication?: unknown;
    output?: {
      medication?: unknown;
    };
    data?: {
      medication?: unknown;
    };
  };

  const medication = data.medication ?? data.output?.medication ?? data.data?.medication;
  if (!Array.isArray(medication)) {
    return [];
  }

  return medication
    .map((entry) => normalizeMedicationItem(entry))
    .filter((item): item is MedicationItem => item !== null);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as MedicationRequest;
    const message = body.message?.trim();

    if (!message) {
      return NextResponse.json({ error: "message is required" }, { status: 400 });
    }

    const agentResponse = await hikigai.invokeAgent("medication-agent", { message }, HIKIGAI_AGENT_TIMEOUT_MS);
    console.log("[medication-agent] raw invoke output:", JSON.stringify(agentResponse));

    const medication = normalizeMedication(agentResponse);
    console.log("[medication-agent] normalized output:", JSON.stringify({ medication }));
    return NextResponse.json({ medication }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate medication data";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
