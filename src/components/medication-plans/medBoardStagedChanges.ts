import { useCallback, useMemo, useState } from "react";
import type { Medication, ScheduleRule } from "../../types/medicationPlans";

/**
 * Staged change types. A staged change is a draft mutation the user has made
 * but not committed to the backend yet. Applying them runs a single
 * bulk-update POST; discarding them leaves the server state untouched.
 */
export type StagedChange =
  | {
      id: string;
      kind: "update_medication";
      medicationId: number;
      patch: Partial<Medication>;
    }
  | {
      id: string;
      kind: "archive_medication";
      medicationId: number;
      dateEnded: string;
    }
  | {
      id: string;
      kind: "remove_medication";
      medicationId: number;
    }
  | {
      id: string;
      kind: "add_rule";
      medicationId: number;
      rule: Omit<ScheduleRule, "id">;
      // temp identifier so UI can show/discard it before the server assigns one
      tempRuleId: string;
    }
  | {
      id: string;
      kind: "update_rule";
      medicationId: number;
      ruleId: number;
      patch: Partial<ScheduleRule>;
    }
  | {
      id: string;
      kind: "remove_rule";
      medicationId: number;
      ruleId: number;
    };

let seq = 0;
const newId = () => `chg_${Date.now().toString(36)}_${seq++}`;

const todayIso = (): string => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

/**
 * Apply staged changes to the raw medications list to produce the
 * projected "what the user sees" state. Pure function — no side effects.
 */
export const projectMedications = (
  original: Medication[],
  staged: StagedChange[],
): Medication[] => {
  if (staged.length === 0) return original;

  const byId = new Map<number, Medication>();
  for (const m of original) byId.set(m.id, { ...m, schedule_rules: [...(m.schedule_rules ?? [])] });
  const removedIds = new Set<number>();

  for (const c of staged) {
    if (c.kind === "remove_medication") {
      removedIds.add(c.medicationId);
      continue;
    }
    const med = byId.get(c.medicationId);
    if (!med) continue;

    switch (c.kind) {
      case "update_medication":
        Object.assign(med, c.patch);
        break;
      case "archive_medication":
        med.date_ended = c.dateEnded;
        break;
      case "add_rule":
        med.schedule_rules = [
          ...(med.schedule_rules ?? []),
          { ...(c.rule as ScheduleRule) },
        ];
        break;
      case "update_rule":
        med.schedule_rules = (med.schedule_rules ?? []).map((r) =>
          r.id === c.ruleId ? { ...r, ...c.patch } : r,
        );
        break;
      case "remove_rule":
        med.schedule_rules = (med.schedule_rules ?? []).filter(
          (r) => r.id !== c.ruleId,
        );
        break;
    }
  }

  return Array.from(byId.values()).filter((m) => !removedIds.has(m.id));
};

export const changesForMedication = (
  staged: StagedChange[],
  medicationId: number,
): StagedChange[] =>
  staged.filter((c) => c.medicationId === medicationId);

export interface UseStagedChangesApi {
  changes: StagedChange[];
  hasChanges: boolean;
  archiveMedication: (medicationId: number) => void;
  updateMedication: (medicationId: number, patch: Partial<Medication>) => void;
  removeMedication: (medicationId: number) => void;
  addRule: (
    medicationId: number,
    rule: Omit<ScheduleRule, "id">,
  ) => string;
  updateRule: (
    medicationId: number,
    ruleId: number,
    patch: Partial<ScheduleRule>,
  ) => void;
  removeRule: (medicationId: number, ruleId: number) => void;
  discard: (changeId: string) => void;
  discardForMedication: (medicationId: number) => void;
  discardAll: () => void;
}

export const useStagedChanges = (): UseStagedChangesApi => {
  const [changes, setChanges] = useState<StagedChange[]>([]);

  const archiveMedication = useCallback((medicationId: number) => {
    setChanges((prev) => {
      // Replace any prior archive for this med
      const filtered = prev.filter(
        (c) => !(c.kind === "archive_medication" && c.medicationId === medicationId),
      );
      return [
        ...filtered,
        {
          id: newId(),
          kind: "archive_medication",
          medicationId,
          dateEnded: todayIso(),
        },
      ];
    });
  }, []);

  const updateMedication = useCallback(
    (medicationId: number, patch: Partial<Medication>) => {
      setChanges((prev) => {
        // Coalesce consecutive updates for the same med into a single change
        const lastSame = prev
          .slice()
          .reverse()
          .find(
            (c) =>
              c.kind === "update_medication" && c.medicationId === medicationId,
          );
        if (lastSame && lastSame.kind === "update_medication") {
          return prev.map((c) =>
            c === lastSame
              ? { ...lastSame, patch: { ...lastSame.patch, ...patch } }
              : c,
          );
        }
        return [
          ...prev,
          { id: newId(), kind: "update_medication", medicationId, patch },
        ];
      });
    },
    [],
  );

  const removeMedication = useCallback((medicationId: number) => {
    setChanges((prev) => [
      // drop any prior changes on this med
      ...prev.filter((c) => c.medicationId !== medicationId),
      { id: newId(), kind: "remove_medication", medicationId },
    ]);
  }, []);

  const addRule = useCallback(
    (medicationId: number, rule: Omit<ScheduleRule, "id">): string => {
      const tempRuleId = `tmp_rule_${Date.now().toString(36)}_${seq++}`;
      setChanges((prev) => [
        ...prev,
        {
          id: newId(),
          kind: "add_rule",
          medicationId,
          rule,
          tempRuleId,
        },
      ]);
      return tempRuleId;
    },
    [],
  );

  const updateRule = useCallback(
    (medicationId: number, ruleId: number, patch: Partial<ScheduleRule>) => {
      setChanges((prev) => [
        ...prev,
        { id: newId(), kind: "update_rule", medicationId, ruleId, patch },
      ]);
    },
    [],
  );

  const removeRule = useCallback((medicationId: number, ruleId: number) => {
    setChanges((prev) => [
      ...prev,
      { id: newId(), kind: "remove_rule", medicationId, ruleId },
    ]);
  }, []);

  const discard = useCallback((changeId: string) => {
    setChanges((prev) => prev.filter((c) => c.id !== changeId));
  }, []);

  const discardForMedication = useCallback((medicationId: number) => {
    setChanges((prev) => prev.filter((c) => c.medicationId !== medicationId));
  }, []);

  const discardAll = useCallback(() => setChanges([]), []);

  return useMemo(
    () => ({
      changes,
      hasChanges: changes.length > 0,
      archiveMedication,
      updateMedication,
      removeMedication,
      addRule,
      updateRule,
      removeRule,
      discard,
      discardForMedication,
      discardAll,
    }),
    [
      changes,
      archiveMedication,
      updateMedication,
      removeMedication,
      addRule,
      updateRule,
      removeRule,
      discard,
      discardForMedication,
      discardAll,
    ],
  );
};
