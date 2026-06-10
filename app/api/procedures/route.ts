import { NextResponse } from "next/server";
import { HIKIGAI_AGENT_TIMEOUT_MS, hikigai } from "@/lib/hikigai";

export const maxDuration = 300;

interface ProcedureRequest {
  message?: string;
}

type ProcedureEntry = {
  name: string;
  date?: string;
  code?: string;
  reason?: string;
  urgency?: string;
  recommendations?: string[];
  procedure_type?: string;
};

function parseJsonFromContent(content: string): unknown {
  const trimmed = content.trim();

  const withoutFence = trimmed
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    return JSON.parse(withoutFence);
  } catch {
    // Fall through to best-effort extraction.
  }

  const firstBrace = withoutFence.indexOf("{");
  const lastBrace = withoutFence.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    const candidate = withoutFence.slice(firstBrace, lastBrace + 1);
    try {
      return JSON.parse(candidate);
    } catch {
      return {};
    }
  }

  return {};
}

function getNestedObject(payload: unknown): Record<string, unknown>[] {
  if (!payload || typeof payload !== "object") {
    return [];
  }

  const root = payload as Record<string, unknown>;
  const fromContent =
    typeof root.content === "string" && root.content.trim()
      ? parseJsonFromContent(root.content)
      : null;

  const objects = [root, root.output, root.data, fromContent].filter(
    (item): item is Record<string, unknown> => !!item && typeof item === "object"
  );

  return objects;
}

function collectProcedureEntries(payload: unknown): ProcedureEntry[] {
  const sources = getNestedObject(payload);
  const normalized: ProcedureEntry[] = [];

  const keys = [
    "procedure",
    "procedures",
    "in_office_procedures",
    "imaging_radiology_orders",
    "general_procedure_list",
  ] as const;

  for (const source of sources) {
    for (const key of keys) {
      const value = source[key];
      if (!Array.isArray(value)) {
        continue;
      }

      for (const row of value) {
        if (!row || typeof row !== "object") {
          continue;
        }

        const item = row as Record<string, unknown>;
        const name =
          typeof item.name === "string"
            ? item.name
            : typeof item.procedure_name === "string"
              ? item.procedure_name
              : typeof item.order_name === "string"
                ? item.order_name
                : "";

        if (!name.trim()) {
          continue;
        }

        const entry: ProcedureEntry = {
          name,
        };

        if (typeof item.date === "string") {
          entry.date = item.date;
        }
        if (typeof item.code === "string") {
          entry.code = item.code;
        }
        if (typeof item.reason === "string") {
          entry.reason = item.reason;
        }
        if (typeof item.urgency === "string") {
          entry.urgency = item.urgency;
        }
        if (Array.isArray(item.recommendations)) {
          entry.recommendations = item.recommendations.filter(
            (recommendation): recommendation is string =>
              typeof recommendation === "string" && recommendation.trim().length > 0
          );
        }

        if (key === "in_office_procedures") {
          entry.procedure_type = "in_office";
        } else if (key === "imaging_radiology_orders") {
          entry.procedure_type = "imaging";
        }

        normalized.push(entry);
      }
    }
  }

  const deduped = new Map<string, ProcedureEntry>();
  for (const entry of normalized) {
    const dedupeKey = `${entry.name}|${entry.date || ""}|${entry.code || ""}`;
    if (!deduped.has(dedupeKey)) {
      deduped.set(dedupeKey, entry);
    }
  }

  return Array.from(deduped.values());
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ProcedureRequest;
    const message = body.message?.trim();

    if (!message) {
      return NextResponse.json({ error: "message is required" }, { status: 400 });
    }

    const agentResponse = await hikigai.invokeAgent("procedure-agent", { message }, HIKIGAI_AGENT_TIMEOUT_MS);
    // console.log("[procedure-agent] raw invoke output:", JSON.stringify(agentResponse));

    const procedure = collectProcedureEntries(agentResponse);
    return NextResponse.json({ procedure }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate procedures";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
