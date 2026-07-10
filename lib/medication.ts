export type MedicationFrequency = {
  morning: string | null;
  afternoon: string | null;
  night: string | null;
};

export function normalizeMedicationFrequency(rawFreq: unknown): MedicationFrequency {
  if (rawFreq && typeof rawFreq === "object") {
    const freq = rawFreq as { morning?: unknown; afternoon?: unknown; night?: unknown };
    return {
      morning: freq.morning != null ? String(freq.morning) : null,
      afternoon: freq.afternoon != null ? String(freq.afternoon) : null,
      night: freq.night != null ? String(freq.night) : null,
    };
  }

  if (typeof rawFreq === "string") {
    const trimmed = rawFreq.trim();
    if (!trimmed) {
      return { morning: null, afternoon: null, night: null };
    }

    if (trimmed.startsWith("{")) {
      try {
        return normalizeMedicationFrequency(JSON.parse(trimmed));
      } catch {
        return { morning: null, afternoon: null, night: null };
      }
    }

    if (trimmed.includes(",")) {
      const [morning, afternoon, night] = trimmed.split(",").map((part) => part.trim());
      return {
        morning: morning || null,
        afternoon: afternoon || null,
        night: night || null,
      };
    }

    return { morning: trimmed, afternoon: null, night: null };
  }

  return { morning: null, afternoon: null, night: null };
}

export function formatMedicationFrequency(frequency: unknown): string {
  const { morning, afternoon, night } = normalizeMedicationFrequency(frequency);
  return `M:${morning ?? "0"} A:${afternoon ?? "0"} N:${night ?? "0"}`;
}
