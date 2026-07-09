export function getProcedureTypeBadge(procedureType: string | undefined | null): string {
  const normalized = (procedureType ?? "").toLowerCase().trim().replace(/-/g, "_");

  if (normalized === "in_office") {
    return "In Office Procedure";
  }

  if (normalized === "imaging") {
    return "Imaging Procedure";
  }

  if (normalized === "laboratory") {
    return "Lab Procedure";
  }

  return "In House Procedure";
}
