export type ReferralItem = {
  specialty: string;
  referred_to: string;
  reason: string;
  urgency: string;
  notes: string;
};

function str(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

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

export function normalizeReferralItem(row: unknown): ReferralItem | null {
  if (typeof row === "string") {
    const specialty = row.trim();
    return specialty
      ? {
          specialty,
          referred_to: "",
          reason: "",
          urgency: "routine",
          notes: "",
        }
      : null;
  }

  if (!row || typeof row !== "object") {
    return null;
  }

  const item = row as Record<string, unknown>;
  const specialty =
    str(item.specialty) ||
    str(item.specialist) ||
    str(item.provider) ||
    str(item.name);

  if (!specialty) {
    return null;
  }

  const notes =
    str(item.notes) ||
    (Array.isArray(item.recommendations)
      ? item.recommendations
          .filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0)
          .join("; ")
      : "");

  return {
    specialty,
    referred_to: str(item.referred_to),
    reason: str(item.reason) || str(item.clinical_context),
    urgency: str(item.urgency) || str(item.type) || "routine",
    notes,
  };
}

export function normalizeReferrals(payload: unknown): ReferralItem[] {
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
      const normalized = normalizeReferralItem(row);
      if (normalized) {
        referrals.push(normalized);
      }
    }
  }

  return referrals;
}

export function formatReferralUrgency(urgency: string | undefined | null): string {
  const value = (urgency ?? "routine").trim();
  if (!value) {
    return "Routine";
  }

  return value.charAt(0).toUpperCase() + value.slice(1);
}
