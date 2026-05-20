import { NextResponse } from "next/server";
import { hikigai } from "@/lib/hikigai";

interface SoapNotesRequest {
  message?: string;
  patient_context?: string;
}

interface SoapOutput {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
}

function normalizeSoapOutput(payload: unknown): SoapOutput {
  const emptyOutput: SoapOutput = {
    subjective: "",
    objective: "",
    assessment: "",
    plan: "",
  };

  if (!payload || typeof payload !== "object") {
    return emptyOutput;
  }

  const data = payload as {
    output?: Record<string, unknown>;
    data?: Record<string, unknown>;
    subjective?: unknown;
    objective?: unknown;
    assessment?: unknown;
    plan?: unknown;
  };

  const container = (data.output || data.data || data) as Record<string, unknown>;
  const readField = (field: "subjective" | "objective" | "assessment" | "plan") => {
    const value = container[field];
    return typeof value === "string" ? value : "";
  };

  return {
    subjective: readField("subjective"),
    objective: readField("objective"),
    assessment: readField("assessment"),
    plan: readField("plan"),
  };
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SoapNotesRequest;
    const message = body.message?.trim();

    if (!message) {
      return NextResponse.json({ error: "message is required" }, { status: 400 });
    }

    const input = body.patient_context?.trim()
      ? { message, patient_context: body.patient_context.trim() }
      : { message };

    const agentResponse = await hikigai.invokeAgent("soap-notes-agent", input);
    console.log("[soap-notes-agent] raw invoke output:", JSON.stringify(agentResponse));

    const output = normalizeSoapOutput(agentResponse);

    return NextResponse.json(output, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate soap notes";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}