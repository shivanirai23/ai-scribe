export function formatMedicationFrequency(frequency: {
  morning?: string | null;
  afternoon?: string | null;
  night?: string | null;
} | null | undefined): string {
  const morning = frequency?.morning ?? "0";
  const afternoon = frequency?.afternoon ?? "0";
  const night = frequency?.night ?? "0";
  return `M:${morning} A:${afternoon} N:${night}`;
}
