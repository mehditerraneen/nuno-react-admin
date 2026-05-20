export type PlanningEmailErrorType =
  | "missing_email"
  | "smtp_refused"
  | "no_shifts"
  | "unknown";

export const classifyPlanningEmailError = (
  detail?: string | null,
): PlanningEmailErrorType => {
  const normalized = (detail || "").toLowerCase();

  if (!normalized) return "unknown";

  if (
    normalized.includes("no email") ||
    normalized.includes("missing email") ||
    normalized.includes("email address") ||
    normalized.includes("adresse email")
  ) {
    return "missing_email";
  }

  if (
    normalized.includes("smtp") ||
    normalized.includes("refused") ||
    normalized.includes("rejected") ||
    normalized.includes("550") ||
    normalized.includes("554")
  ) {
    return "smtp_refused";
  }

  if (
    normalized.includes("no shifts") ||
    normalized.includes("aucune affectation") ||
    normalized.includes("planning vide")
  ) {
    return "no_shifts";
  }

  return "unknown";
};

export const toPlanningEmailErrorMessage = (detail?: string | null): string => {
  const type = classifyPlanningEmailError(detail);

  switch (type) {
    case "missing_email":
      return "Impossible d'envoyer: l'employé n'a pas d'adresse email.";
    case "smtp_refused":
      return "Le serveur email a refusé l'envoi. Vérifiez la configuration SMTP et réessayez.";
    case "no_shifts":
      return "Le planning de l'employé est vide.";
    default:
      return detail || "Échec de l'envoi du planning.";
  }
};
