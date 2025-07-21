import React, { useState, useEffect } from "react";
import {
  SimpleForm,
  useDataProvider,
  useNotify,
  Identifier,
} from "react-admin";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  CircularProgress,
} from "@mui/material";
import { type MyDataProvider, type CarePlanDetailCreate } from "./dataProvider";
import { type FieldValues } from "react-hook-form";
import {
  parseValidationErrors,
  logFormSubmissionError,
  formatErrorMessage,
} from "./utils/errorHandling";
import { ValidationErrorDisplay } from "./components/ValidationErrorDisplay";
import { FormDebugger } from "./components/FormDebugger";
import { formatTimeFieldsInFormData } from "./utils/timeUtils";
import { TabbedCareFormLayout } from "./components/TabbedCareFormLayout";

interface CarePlanDetailCreateDialogProps {
  open: boolean;
  onClose: () => void;
  carePlanId: Identifier;
  cnsCarePlanId?: Identifier;
}

export const CarePlanDetailCreateDialog: React.FC<
  CarePlanDetailCreateDialogProps
> = ({ open, onClose, carePlanId, cnsCarePlanId }) => {
  const dataProvider = useDataProvider<MyDataProvider>();
  const notify = useNotify();
  const [isSaving, setIsSaving] = React.useState(false);
  const [cnsItemIds, setCnsItemIds] = useState<number[]>([]);
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});
  const [lastApiError, setLastApiError] = useState<Error | null>(null);
  const [lastFormData, setLastFormData] = useState<CarePlanDetailCreate | null>(null);

  // Fetch CNS available item IDs when dialog opens
  useEffect(() => {
    if (open) {
      console.log("CarePlanDetailCreateDialog - CNS Care Plan ID:", cnsCarePlanId);
      if (cnsCarePlanId) {
        dataProvider.getCnsAvailableItemIds(cnsCarePlanId).then((ids) => {
          console.log("CNS available item IDs:", ids);
          setCnsItemIds(ids);
        }).catch((error) => {
          console.error("Failed to fetch CNS item IDs:", error);
          setCnsItemIds([-1]); // Use -1 to ensure no items match when error occurs
        });
      } else {
        // No CNS care plan associated, show no items (empty filter)
        console.log("No CNS care plan ID provided, hiding all items");
        setCnsItemIds([-1]); // Use -1 to ensure no items match
      }
    }
  }, [open, cnsCarePlanId, dataProvider]);

  const handleSubmit = async (formValues: FieldValues) => {
    console.log("🔥 HANDLE SUBMIT TRIGGERED!");
    console.log("📝 Raw Form Values:", JSON.stringify(formValues, null, 2));
    
    setIsSaving(true);
    setValidationErrors({}); // Clear previous errors
    
    try {
      // Log raw form values for debugging
      console.log("📝 Raw Form Values (again):", JSON.stringify(formValues, null, 2));
      
      // Format time fields before sending to API with extra defensive logic
      const formattedData = formatTimeFieldsInFormData(formValues, ['time_start', 'time_end']);
      
      // Double-check time formatting with additional defensive code
      if (
        formattedData.time_start &&
        typeof formattedData.time_start === "string" &&
        formattedData.time_start.includes("T")
      ) {
        const date = new Date(formattedData.time_start);
        formattedData.time_start = `${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;
        console.log(
          "🔧 Additional time_start formatting applied:",
          formattedData.time_start
        );
      }
      
      if (
        formattedData.time_end &&
        typeof formattedData.time_end === "string" &&
        formattedData.time_end.includes("T")
      ) {
        const date = new Date(formattedData.time_end);
        formattedData.time_end = `${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;
        console.log(
          "🔧 Additional time_end formatting applied:",
          formattedData.time_end
        );
      }
      
      console.log("🔧 Formatted Data:", JSON.stringify(formattedData, null, 2));
      
      // Validate required fields before submission
      const missingFields: string[] = [];
      if (!formattedData.name?.trim()) missingFields.push('name');
      if (!formattedData.time_start?.trim()) missingFields.push('time_start');
      if (!formattedData.time_end?.trim()) missingFields.push('time_end');
      if (!formattedData.care_actions?.trim()) missingFields.push('care_actions');
      
      if (missingFields.length > 0) {
        const errors: Record<string, string> = {};
        missingFields.forEach(field => {
          errors[field] = `${field.replace('_', ' ')} is required`;
        });
        setValidationErrors(errors);
        notify(`Please fill in required fields: ${missingFields.join(', ')}`, { type: "error" });
        return;
      }
      
      // Construct the data object according to the CarePlanDetailCreate interface
      const dataToSave: CarePlanDetailCreate = {
        name: formattedData.name,
        params_occurrence_ids: formattedData.params_occurrence_ids || [],
        time_start: formattedData.time_start, // Properly formatted HH:MM
        time_end: formattedData.time_end, // Properly formatted HH:MM
        long_term_care_items: formattedData.long_term_care_items?.map(
          (item: any) => ({
            long_term_care_item_id: item.long_term_care_item_id,
            quantity: item.quantity || 1,
          }),
        ) || [], // Transform array input format
        care_actions: formattedData.care_actions || '',
      };

      // Store form data for debugging
      setLastFormData(dataToSave);
      
      // Log form data for debugging
      console.log("🚀 Submitting Care Plan Detail:", JSON.stringify(dataToSave, null, 2));

      await dataProvider.createCarePlanDetail(carePlanId, dataToSave);
      notify("Care plan detail created successfully", { type: "success" });
      onClose(); // Parent component will handle refresh
    } catch (error: any) {
      // Store error for debugging
      setLastApiError(error);
      
      // Enhanced error handling with detailed logging
      logFormSubmissionError(formValues, error, "Create Care Plan Detail");
      
      // Parse and set validation errors
      const parsedErrors = parseValidationErrors(error);
      const errorMessages: Record<string, string> = {};
      
      Object.entries(parsedErrors).forEach(([field, errorObj]) => {
        errorMessages[field] = formatErrorMessage(field, errorObj);
      });
      
      setValidationErrors(errorMessages);
      
      // Show user-friendly notification
      if (errorMessages._global) {
        notify(`Error: ${errorMessages._global}`, { type: "error" });
      } else {
        const fieldErrors = Object.keys(errorMessages).filter(key => key !== '_global');
        if (fieldErrors.length > 0) {
          notify(`Validation errors in: ${fieldErrors.join(', ')}`, { type: "error" });
        } else {
          notify("Could not create care plan detail. Please check your input.", { type: "error" });
        }
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>Add New Care Plan Detail</DialogTitle>
      <DialogContent>
        <SimpleForm
          onSubmit={handleSubmit}
          record={{
            name: '',
            params_occurrence_ids: [],
            time_start: '',
            time_end: '',
            long_term_care_items: [],
            care_actions: ''
          }}
          toolbar={<></>} // Hide default toolbar
          id="care-plan-create-form"
        >
          <ValidationErrorDisplay errors={validationErrors} />
          
          {/* Tabbed Care Form Layout */}
          <TabbedCareFormLayout
            mode="create"
            cnsItemIds={cnsItemIds}
            validationErrors={validationErrors}
          />
          
          {/* Debug info */}
          <div style={{ fontSize: '12px', color: '#666', marginTop: '10px' }}>
            Debug: CNS Item IDs: {JSON.stringify(cnsItemIds)}
          </div>
          
          <FormDebugger 
            formData={lastFormData}
            validationErrors={validationErrors}
            apiError={lastApiError}
          />
        </SimpleForm>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isSaving}>
          Cancel
        </Button>
        <Button 
          type="submit" 
          form="care-plan-create-form"
          variant="contained" 
          disabled={isSaving}
        >
          {isSaving ? <CircularProgress size={24} /> : "Save"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
