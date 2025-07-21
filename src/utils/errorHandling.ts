import { FieldErrors } from "react-hook-form";

// Interface for FastAPI/DRF validation errors
export interface ValidationError {
  detail: Array<{
    loc: (string | number)[];
    msg: string;
    type: string;
    ctx?: Record<string, any>;
  }>;
}

export interface FormValidationErrors {
  [fieldName: string]: {
    message: string;
    type: string;
  };
}

// Convert API validation errors to React Hook Form format
export function parseValidationErrors(apiError: any): FormValidationErrors {
  const errors: FormValidationErrors = {};

  try {
    // Handle FastAPI validation errors
    if (apiError.detail && Array.isArray(apiError.detail)) {
      apiError.detail.forEach((error: any) => {
        if (error.loc && error.msg) {
          // Get field name from location array (e.g., ['body', 'name'] -> 'name')
          const fieldPath = error.loc
            .filter((loc: any) => loc !== "body")
            .join(".");
          if (fieldPath) {
            errors[fieldPath] = {
              message: error.msg,
              type: error.type || "validation",
            };
          }
        }
      });
    }

    // Handle Django REST Framework errors
    else if (typeof apiError.detail === "object") {
      Object.entries(apiError.detail).forEach(([field, messages]) => {
        if (Array.isArray(messages)) {
          errors[field] = {
            message: messages[0] as string,
            type: "validation",
          };
        } else if (typeof messages === "string") {
          errors[field] = {
            message: messages,
            type: "validation",
          };
        }
      });
    }

    // Handle generic error messages
    else if (typeof apiError.detail === "string") {
      errors["_global"] = {
        message: apiError.detail,
        type: "api_error",
      };
    }
  } catch (parseError) {
    console.error("Error parsing validation errors:", parseError);
    errors["_global"] = {
      message: "An unexpected error occurred",
      type: "unknown",
    };
  }

  return errors;
}

// Enhanced error logging for debugging
export function logFormSubmissionError(
  formData: any,
  apiError: any,
  context: string,
) {
  console.group(`🚨 Form Submission Error - ${context}`);
  console.log("📝 Form Data Submitted:", JSON.stringify(formData, null, 2));
  console.log("❌ API Error Response:", JSON.stringify(apiError, null, 2));
  console.log("🔍 Parsed Validation Errors:", parseValidationErrors(apiError));
  console.groupEnd();
}

// Field name mapping for better error display
export const FIELD_DISPLAY_NAMES: Record<string, string> = {
  name: "Detail Name",
  params_occurrence_ids: "Occurrences (Days of Week)",
  time_start: "Start Time",
  time_end: "End Time",
  long_term_care_items: "Long Term Care Items",
  care_actions: "Care Actions",
  long_term_care_item_id: "Care Item",
  quantity: "Quantity",
};

// Get user-friendly field name
export function getFieldDisplayName(fieldName: string): string {
  return (
    FIELD_DISPLAY_NAMES[fieldName] ||
    fieldName.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
  );
}

// Format validation error message for display
export function formatErrorMessage(
  fieldName: string,
  error: { message: string; type: string },
): string {
  const displayName = getFieldDisplayName(fieldName);

  // Special handling for time fields
  if (
    (fieldName === "time_start" || fieldName === "time_end") &&
    (error.type === "value_error" ||
      error.type === "type_error" ||
      error.message.includes("time"))
  ) {
    return `${displayName} must be in HH:MM format (e.g., 07:30, 14:15)`;
  }

  // Common error type mappings
  switch (error.type) {
    case "missing":
      return `${displayName} is required`;
    case "value_error":
      return `${displayName} has an invalid value`;
    case "type_error":
      return `${displayName} must be the correct type`;
    case "too_short":
      return `${displayName} is too short`;
    case "too_long":
      return `${displayName} is too long`;
    default:
      return error.message;
  }
}
