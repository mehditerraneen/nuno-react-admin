import React, { useState, useEffect } from "react";
import {
  SimpleForm,
  TextInput,
  ReferenceArrayInput,
  CheckboxGroupInput, // Added for occurrences
  // SelectArrayInput, // No longer used
  ArrayInput,
  SimpleFormIterator,
  ReferenceInput,
  SelectInput,
  NumberInput,
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
  Box,
  Tooltip, // Added for item description tooltip
} from "@mui/material";
import {
  type MyDataProvider,
  type CarePlanDetail,
  type CarePlanDetailUpdatePayload,
  type LongTermCareItem, // Added for typing choice in SelectInput
} from "./dataProvider";
import { type FieldValues } from "react-hook-form";
import { formatTimeFieldsInFormData, formatDurationDisplay } from "./utils/timeUtils";
import { EnhancedTimeInput } from "./components/ReactAdminTimeInput";
import { SmartTimeInput } from "./components/SmartTimeInput";
import { SmartOccurrenceInput } from "./components/SmartOccurrenceInput";
import { LiveDurationCalculator } from "./components/LiveDurationCalculator";
import { TabbedCareFormLayout } from "./components/TabbedCareFormLayout";

// Interface for the structure of long_term_care_items from the form
interface FormLongTermCareItem {
  long_term_care_item_id: Identifier;
  quantity: number;
}

interface CarePlanDetailEditDialogProps {
  open: boolean;
  onClose: () => void;
  carePlanId: Identifier;
  detailToEdit: CarePlanDetail;
  cnsCarePlanId?: Identifier;
}

export const CarePlanDetailEditDialog: React.FC<
  CarePlanDetailEditDialogProps
> = ({ open, onClose, carePlanId, detailToEdit, cnsCarePlanId }) => {
  const dataProvider = useDataProvider<MyDataProvider>();
  const notify = useNotify();
  const [isSaving, setIsSaving] = React.useState(false);
  const [cnsItemIds, setCnsItemIds] = useState<number[]>([]);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Fetch CNS available item IDs when dialog opens
  useEffect(() => {
    if (open) {
      console.log("CarePlanDetailEditDialog - CNS Care Plan ID:", cnsCarePlanId);
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

  // Transform detailToEdit for form initialization
  console.log('🔍 Edit Dialog - detailToEdit:', JSON.stringify(detailToEdit, null, 2));
  
  const initialValues = {
    ...detailToEdit,
    params_occurrence_ids: detailToEdit.params_occurrence.map((occ) => occ.id),
    long_term_care_items: detailToEdit.longtermcareitemquantity_set.map(
      (itemQty) => ({
        long_term_care_item_id: itemQty.long_term_care_item.id,
        quantity: itemQty.quantity,
      }),
    ),
    // Convert time strings to Date objects for React Admin TimeInput
    time_start: detailToEdit.time_start
      ? (() => {
          console.log("🔄 Converting time_start:", detailToEdit.time_start);
          const [hours, minutes] = detailToEdit.time_start.split(":");
          const date = new Date();
          date.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
          console.log("📅 Converted time_start to Date:", date);
          return date;
        })()
      : null,
    time_end: detailToEdit.time_end
      ? (() => {
          console.log("🔄 Converting time_end:", detailToEdit.time_end);
          const [hours, minutes] = detailToEdit.time_end.split(":");
          const date = new Date();
          date.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
          console.log("📅 Converted time_end to Date:", date);
          return date;
        })()
      : null,
  };

  const handleSubmit = async (values: FieldValues) => {
    setIsSaving(true);
    setValidationErrors({}); // Clear previous errors
    
    // Validate required fields before submission
    const missingFields: string[] = [];
    if (!values.name?.trim()) missingFields.push('name');
    if (!values.time_start) missingFields.push('time_start');
    if (!values.time_end) missingFields.push('time_end');
    if (!values.care_actions?.trim()) missingFields.push('care_actions');
    
    if (missingFields.length > 0) {
      const errors: Record<string, string> = {};
      missingFields.forEach(field => {
        errors[field] = `${field.replace('_', ' ')} is required`;
      });
      setValidationErrors(errors);
      notify(`Please fill in required fields: ${missingFields.join(', ')}`, { type: "error" });
      setIsSaving(false);
      return;
    }
    
    // Format time fields before sending to API with extra defensive logic
    const formattedValues = formatTimeFieldsInFormData(values, ['time_start', 'time_end']);
    
    // Double-check time formatting with additional defensive code
    if (formattedValues.time_start && typeof formattedValues.time_start === 'string' && formattedValues.time_start.includes('T')) {
      const date = new Date(formattedValues.time_start);
      formattedValues.time_start = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
      console.log('🔧 Additional time_start formatting applied:', formattedValues.time_start);
    }
    
    if (formattedValues.time_end && typeof formattedValues.time_end === 'string' && formattedValues.time_end.includes('T')) {
      const date = new Date(formattedValues.time_end);
      formattedValues.time_end = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
      console.log('🔧 Additional time_end formatting applied:', formattedValues.time_end);
    }
    
    const payload: CarePlanDetailUpdatePayload = {
      name: formattedValues.name,
      params_occurrence_ids: formattedValues.params_occurrence_ids,
      time_start: formattedValues.time_start, // Properly formatted HH:MM
      time_end: formattedValues.time_end, // Properly formatted HH:MM
      long_term_care_items: formattedValues.long_term_care_items.map(
        (item: FormLongTermCareItem) => ({
          long_term_care_item_id: item.long_term_care_item_id,
          quantity: item.quantity || 1,
        }),
      ),
      care_actions: formattedValues.care_actions,
    };

    try {
      await dataProvider.updateCarePlanDetail(
        carePlanId,
        detailToEdit.id,
        payload,
      );
      notify("Care plan detail updated successfully", { type: "success" });
      onClose(); // Parent component will handle refresh
    } catch (error: unknown) {
      console.error('Error updating care plan detail:', error);
      
      // Handle validation errors from the API
      if (error instanceof Error && error.message.includes('validation')) {
        try {
          const errorData = JSON.parse(error.message.split('validation: ')[1]);
          const parsedErrors: Record<string, string> = {};
          
          Object.keys(errorData).forEach(field => {
            if (Array.isArray(errorData[field])) {
              parsedErrors[field] = errorData[field][0];
            } else {
              parsedErrors[field] = errorData[field];
            }
          });
          
          setValidationErrors(parsedErrors);
          notify('Please fix validation errors', { type: "error" });
        } catch {
          notify(`Error: ${error.message}`, { type: "error" });
        }
      } else {
        let errorMessage = "Could not update care plan detail";
        if (error instanceof Error) {
          errorMessage = error.message;
        }
        notify(`Error: ${errorMessage}`, { type: "error" });
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>Edit Care Plan Detail</DialogTitle>
      <DialogContent>
        <SimpleForm
          onSubmit={handleSubmit}
          record={initialValues} // Pre-fill form with existing data
          toolbar={<></>} // Hide default toolbar
          id="care-plan-edit-form"
        >
          {/* New Tabbed Layout */}
          <TabbedCareFormLayout 
            mode="edit"
            cnsItemIds={cnsItemIds}
            validationErrors={validationErrors}
          />
        </SimpleForm>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isSaving}>
          Cancel
        </Button>
        <Button type="submit" form="care-plan-edit-form" variant="contained" disabled={isSaving}>
          {isSaving ? <CircularProgress size={24} /> : "Save Changes"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
