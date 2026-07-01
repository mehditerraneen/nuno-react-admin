import React, { createContext, useContext } from "react";
import type { CarePlanDetail } from "../dataProvider";
import {
  calculateSessionDuration,
  type SiblingSessionUsage,
} from "../utils/timeUtils";

interface WeeklyBudgetContextValue {
  /**
   * Other sessions of the SAME care plan (excluding the one being edited),
   * used to accumulate weekly minutes per care item. Empty in create mode or
   * when no provider wraps the form.
   */
  siblingDetails: CarePlanDetail[];
}

const WeeklyBudgetContext = createContext<WeeklyBudgetContextValue>({
  siblingDetails: [],
});

export const WeeklyBudgetProvider = WeeklyBudgetContext.Provider;

/** Raw sibling CarePlanDetails provided to the form (empty by default). */
export const useSiblingDetails = (): CarePlanDetail[] =>
  useContext(WeeklyBudgetContext).siblingDetails;

/** Sibling sessions reduced to the shape the budget calculator consumes. */
export const useSiblingSessions = (): SiblingSessionUsage[] => {
  const siblingDetails = useSiblingDetails();
  return React.useMemo(
    () =>
      siblingDetails.map((d) => ({
        minutes: calculateSessionDuration(d.time_start, d.time_end),
        occurrences: d.params_occurrence ?? [],
        itemCodes: (d.longtermcareitemquantity_set ?? [])
          .map((iq) => iq.long_term_care_item?.code)
          .filter((c): c is string => !!c),
      })),
    [siblingDetails],
  );
};
