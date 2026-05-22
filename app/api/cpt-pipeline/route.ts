import { NextResponse } from "next/server";
import { hikigai } from "@/lib/hikigai";

interface CptPipelineRequest {
  message?: string;
}

type ProcedureItem = {
  procedure_name: string;
  procedure_type: string;
  clinical_context: string;
  order_status: string;
};

function normalizeProcedures(payload: unknown): ProcedureItem[] {
  if (!payload || typeof payload !== "object") {
    return [];
  }

  const data = payload as {
    procedures?: unknown;
    output?: { procedures?: unknown };
    data?: { procedures?: unknown };
  };

  const procedures = data.procedures ?? data.output?.procedures ?? data.data?.procedures;

  if (!Array.isArray(procedures)) {
    return [];
  }

  return procedures
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const item = entry as Record<string, unknown>;
      const procedure_name = typeof item.procedure_name === "string" ? item.procedure_name : "";
      if (!procedure_name) return null;
      return {
        procedure_name,
        procedure_type: typeof item.procedure_type === "string" ? item.procedure_type : "",
        clinical_context: typeof item.clinical_context === "string" ? item.clinical_context : "",
        order_status: typeof item.order_status === "string" ? item.order_status : "",
      };
    })
    .filter((item): item is ProcedureItem => item !== null);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CptPipelineRequest;
    const message = body.message?.trim();

    if (!message) {
      return NextResponse.json({ error: "message is required" }, { status: 400 });
    }

    const agentResponse = await hikigai.invokeAgent("cpt-coding-pipeline", { message });
    // console.log("[cpt-coding-pipeline] raw invoke output:", JSON.stringify(agentResponse));

    const procedures = normalizeProcedures(agentResponse);
    return NextResponse.json({ procedures }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate CPT pipeline";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
