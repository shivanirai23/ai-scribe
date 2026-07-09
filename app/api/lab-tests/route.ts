import { NextResponse } from "next/server";
import { HIKIGAI_AGENT_TIMEOUT_MS, hikigai } from "@/lib/hikigai";

export const maxDuration = 300;

interface LabTestRequest {
  message?: string;
  current_date?: string;
}

type LabTestItem = {
  name: string;
  date?: string;
  notes?: string;
  reason?: string;
  diagnosis?: string;
  fasting_required?: string;
  order_type?: string;
  priority?: string;
};

function todayMMDDYYYY(): string {
  return new Date().toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  });
}

function normalizeLabTests(payload: unknown): LabTestItem[] {
  if (!payload || typeof payload !== "object") {
    return [];
  }

  const data = payload as {
    lab_test?: unknown;
    lab_tests?: unknown;
    output?: { lab_test?: unknown; lab_tests?: unknown };
    data?: { lab_test?: unknown; lab_tests?: unknown };
  };

  const tests =
    data.lab_test ??
    data.lab_tests ??
    data.output?.lab_test ??
    data.output?.lab_tests ??
    data.data?.lab_test ??
    data.data?.lab_tests;

  if (!Array.isArray(tests)) {
    return [];
  }

  const str = (value: unknown): string | undefined =>
    typeof value === "string" && value.trim() ? value : undefined;

  return tests
    .map((entry): LabTestItem | null => {
      if (!entry || typeof entry !== "object") return null;
      const item = entry as Record<string, unknown>;
      const name =
        typeof item.name === "string"
          ? item.name
          : typeof item.test_name === "string"
            ? item.test_name
            : "";
      if (!name.trim()) return null;
      return {
        name,
        ...(str(item.date) ? { date: str(item.date) } : {}),
        ...(str(item.notes) ? { notes: str(item.notes) } : {}),
        ...(str(item.reason) ? { reason: str(item.reason) } : {}),
        ...(str(item.diagnosis) ? { diagnosis: str(item.diagnosis) } : {}),
        ...(str(item.fasting_required) ? { fasting_required: str(item.fasting_required) } : {}),
        ...(str(item.order_type) ? { order_type: str(item.order_type) } : {}),
        ...(str(item.priority) ? { priority: str(item.priority) } : {}),
      };
    })
    .filter((item): item is LabTestItem => item !== null);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as LabTestRequest;
    const message = body.message?.trim();
    const current_date = body.current_date?.trim() || todayMMDDYYYY();

    if (!message) {
      return NextResponse.json({ error: "message is required" }, { status: 400 });
    }

    const agentResponse = await hikigai.invokeAgent(
      "lab-test-agent",
      { transcription: message, current_date },
      HIKIGAI_AGENT_TIMEOUT_MS
    );
    // console.log("[lab-test-agent] raw invoke output:", JSON.stringify(agentResponse));

    const lab_test = normalizeLabTests(agentResponse);
    return NextResponse.json({ lab_test }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate lab tests";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
