import { describe, expect, it } from "vitest";
import {
  classifyPlanningEmailError,
  toPlanningEmailErrorMessage,
} from "./planningEmail";

describe("classifyPlanningEmailError", () => {
  it("returns unknown when detail is missing", () => {
    expect(classifyPlanningEmailError("")).toBe("unknown");
    expect(classifyPlanningEmailError()).toBe("unknown");
    expect(classifyPlanningEmailError(null)).toBe("unknown");
  });

  it("detects missing email errors", () => {
    expect(classifyPlanningEmailError("No email address for employee")).toBe(
      "missing_email",
    );
    expect(classifyPlanningEmailError("Adresse email manquante")).toBe(
      "missing_email",
    );
  });

  it("detects smtp refusal errors", () => {
    expect(classifyPlanningEmailError("SMTP 550 refused")).toBe("smtp_refused");
    expect(classifyPlanningEmailError("Message rejected by SMTP relay")).toBe(
      "smtp_refused",
    );
  });

  it("detects no-shifts errors", () => {
    expect(
      classifyPlanningEmailError("No shifts found for selected period"),
    ).toBe("no_shifts");
    expect(classifyPlanningEmailError("Planning vide pour cet employé")).toBe(
      "no_shifts",
    );
  });
});

describe("toPlanningEmailErrorMessage", () => {
  it("returns user-friendly messages for known categories", () => {
    expect(toPlanningEmailErrorMessage("No email address")).toContain(
      "n'a pas d'adresse email",
    );
    expect(toPlanningEmailErrorMessage("SMTP 550")).toContain("serveur email");
  });

  it("falls back to original detail when category is unknown", () => {
    expect(toPlanningEmailErrorMessage("Unexpected failure")).toBe(
      "Unexpected failure",
    );
  });

  it("returns generic fallback when detail is missing", () => {
    expect(toPlanningEmailErrorMessage()).toBe("Échec de l'envoi du planning.");
    expect(toPlanningEmailErrorMessage(null)).toBe(
      "Échec de l'envoi du planning.",
    );
  });
});
