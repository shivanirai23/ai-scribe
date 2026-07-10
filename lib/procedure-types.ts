function normalizeProcedureType(procedureType: string | undefined | null): string {
  return (procedureType ?? "").toLowerCase().trim().replace(/[\s-]+/g, "_");
}

function isImagingRadiologyOrder(normalized: string): boolean {
  return (
    normalized === "imaging" ||
    normalized === "imaging_radiology_order" ||
    normalized === "imaging_radiology_orders"
  );
}

export function getProcedureTypeBadge(procedureType: string | undefined | null): string {
  const normalized = normalizeProcedureType(procedureType);

  if (normalized === "in_office" || normalized === "in_office_procedure") {
    return "In Office Procedure";
  }

  if (isImagingRadiologyOrder(normalized)) {
    return "Radiology Orders";
  }

  if (normalized === "laboratory" || normalized === "lab") {
    return "Lab Procedure";
  }

  return "In House Procedure";
}

export function getProcedureTypeBadgeClass(badge: string): string {
  if (badge === "Vaccine" || badge === "Radiology Orders") {
    return "bg-sky-100 text-sky-700";
  }

  return "bg-orange-100 text-orange-600";
}
