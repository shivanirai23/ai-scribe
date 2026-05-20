import { NextResponse } from "next/server";
import { hikigai } from "@/lib/hikigai";

interface MedicationRequest {
  message?: string;
}

function normalizeMedication(payload: unknown): unknown[] {
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
  return Array.isArray(medication) ? medication : [];
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as MedicationRequest;
    const message = body.message?.trim();

    if (!message) {
      return NextResponse.json({ error: "message is required" }, { status: 400 });
    }

    const agentResponse = await hikigai.invokeAgent("medication-agent", { message });
    console.log("[medication-agent] raw invoke output:", JSON.stringify(agentResponse));

    const medication = normalizeMedication(agentResponse);
    return NextResponse.json({ medication }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate medication data";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}