import { NextResponse } from "next/server";
import { hikigai } from "@/lib/hikigai";

interface ReferralRequest {
  message?: string;
}

type ReferralItem = {
  specialist: string;
  reason: string;
  notes: string;
  type: string;
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

function normalizeReferrals(payload: unknown): ReferralItem[] {
  if (!payload || typeof payload !== "object") {
    return [];
  }

  const root = payload as Record<string, unknown>;
  const contentPayload =
    typeof root.content === "string" && root.content.trim()
      ? parseJsonFromContent(root.content)
      : null;

  const sources = [root, root.output, root.data, contentPayload].filter(
    (item): item is Record<string, unknown> => !!item && typeof item === "object"
  );

  const referrals: ReferralItem[] = [];

  for (const source of sources) {
    const value = source.referrals;
    if (!Array.isArray(value)) {
      continue;
    }

    for (const row of value) {
      if (typeof row === "string") {
        if (!row.trim()) continue;
        referrals.push({
          specialist: row,
          reason: "",
          notes: "",
          type: "routine",
        });
        continue;
      }

      if (!row || typeof row !== "object") {
        continue;
      }

      const item = row as Record<string, unknown>;
      const specialist =
        typeof item.specialist === "string"
          ? item.specialist
          : typeof item.specialty === "string"
            ? item.specialty
            : typeof item.provider === "string"
              ? item.provider
              : typeof item.name === "string"
                ? item.name
                : "";

      if (!specialist.trim()) {
        continue;
      }

      const notes =
        typeof item.notes === "string"
          ? item.notes
          : Array.isArray(item.recommendations)
            ? item.recommendations.filter((entry): entry is string => typeof entry === "string").join("; ")
            : "";

      referrals.push({
        specialist,
        reason:
          typeof item.reason === "string"
            ? item.reason
            : typeof item.clinical_context === "string"
              ? item.clinical_context
              : "",
        notes,
        type:
          typeof item.type === "string"
            ? item.type
            : typeof item.urgency === "string"
              ? item.urgency
              : "routine",
      });
    }
  }

  return referrals;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ReferralRequest;
    const message = body.message?.trim();

    if (!message) {
      return NextResponse.json({ error: "message is required" }, { status: 400 });
    }

    const agentResponse = await hikigai.invokeAgent("referral-agent-v2", { message });
    // console.log("[referral-agent-v2] raw invoke output:", JSON.stringify(agentResponse));

    const referrals = normalizeReferrals(agentResponse);
    return NextResponse.json({ referrals }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate referrals";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
