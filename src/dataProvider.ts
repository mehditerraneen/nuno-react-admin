import simpleRestProvider from "ra-data-simple-rest";
import {
  type DataProvider,
  type GetListParams,
  type GetListResult,
  type GetManyParams,
  type GetManyResult,
  type GetOneResult,
  type Identifier,
} from "react-admin";

// Define interfaces for the CNS Care Plan data structure
interface MedicalCareSummaryPerPatient {
  id: number;
  patient_id: number;
  date_of_request: string;
  referent: string;
  date_of_evaluation: string;
  date_of_notification: string;
  date_of_notification_to_provider: string;
  plan_number: string;
  decision_number: string;
  level_of_needs: number;
  start_of_support: string;
  end_of_support?: string | null;
  date_of_decision: string;
  special_package?: string | null;
  nature_package?: number | null;
  cash_package?: number | null;
  fmi_right: boolean;
  sn_code_aidant?: string | null;
  date_of_change_to_new_plan?: string | null;
  date_of_start_of_plan_for_us?: string | null;
}

interface RawCnsCarePlanItem {
  start_date: string;
  end_date: string;
  medicalSummaryPerPatient: MedicalCareSummaryPerPatient;
  packageLevel: number;
}

// Interface for the data structure after transformation for the Datagrid
// It flattens medicalSummaryPerPatient and adds request_start_date, request_end_date (conditionally)
interface TransformedCnsCarePlanItem extends MedicalCareSummaryPerPatient {
  request_start_date?: string; // Optional: only present for patient-specific filtered view
  request_end_date?: string; // Optional: only present for patient-specific filtered view
  packageLevel?: number; // Optional: only present for patient-specific filtered view
  // id is already in MedicalCareSummaryPerPatient
}

export interface LongTermCareItem {
  id: number;
  code: string;
  description?: string;
  weekly_package?: number; // Duration in minutes per week for this care item
  type?: string; // Type of care item (e.g., "Prestations Aidant", "Prestations Prestataire")
  category?: string; // Alternative field name for item category
  prestataire_type?: string; // Another potential field name
}

export interface CareOccurrence {
  id: number;
  str_name: string;
  value: string;
}

export interface LongTermCareItemQuantity {
  id: number;
  quantity: number;
  long_term_care_item: LongTermCareItem;
}

export interface CarePlanDetail {
  id: number;
  name: string;
  params_occurrence: CareOccurrence[];
  time_start: string; // Assuming time is serialized as string
  time_end: string; // Assuming time is serialized as string
  longtermcareitemquantity_set: LongTermCareItemQuantity[];
  care_actions: string;
  care_plan_to_master_id: number;
}

export interface LongTermCareItemQuantityCreate {
  long_term_care_item_id: number;
  quantity: number;
}

// Payload for updating an existing Care Plan Detail
export type CarePlanDetailUpdatePayload = CarePlanDetailCreate;

export interface CarePlanDetailCreate {
  name: string;
  params_occurrence_ids: Identifier[];
  time_start: string; // Assuming time is string e.g., HH:MM
  time_end: string; // Assuming time is string e.g., HH:MM
  long_term_care_items: LongTermCareItemQuantityCreate[];
  care_actions: string;
}

export interface MedicalCareSummaryPerPatientDetail {
  id: number;
  item: LongTermCareItem;
  custom_description?: string;
  medical_care_summary_per_patient_id: number;
  number_of_care: number;
  periodicity: string;
}

const apiUrl = import.meta.env.VITE_SIMPLE_REST_URL;
console.log("🔧 API URL configured:", apiUrl);
const baseDataProvider: DataProvider = simpleRestProvider(apiUrl);

// Define a custom data provider type that includes our new method
export interface MyDataProvider extends DataProvider {
  getLatestCnsCarePlanForPatient: (
    patientId: Identifier,
  ) => Promise<{ id: Identifier | null }>;
  getCnsCarePlanDetails: (
    planId: Identifier,
  ) => Promise<MedicalCareSummaryPerPatientDetail[]>;
  getCnsAvailableItemIds: (cnsCarePlanId?: Identifier) => Promise<number[]>;
  getCarePlanDetails: (carePlanId: Identifier) => Promise<CarePlanDetail[]>;
  createCarePlanDetail: (
    carePlanId: Identifier,
    data: CarePlanDetailCreate,
  ) => Promise<CarePlanDetail>; // Returns the created detail
  updateCarePlanDetail: (
    carePlanId: Identifier,
    detailId: Identifier,
    data: CarePlanDetailUpdatePayload,
  ) => Promise<CarePlanDetail>; // Returns the updated detail
}

export const dataProvider: MyDataProvider = {
  ...baseDataProvider,
  getList: async (
    resource: string,
    params: GetListParams,
  ): Promise<GetListResult> => {
    if (resource === "patients_with_cns_plan") {
      // This is a virtual resource. We add a permanent filter and call the real 'patients' resource.
      const newParams = {
        ...params,
        filter: {
          ...params.filter,
          has_cns_plan: true,
        },
      };
      // We need to call the 'patients' resource on the base provider
      const patientDataProvider = simpleRestProvider(apiUrl);
      return patientDataProvider.getList("patients", newParams);
    }

    if (resource === "longtermcareitems") {
      // Check if we need to filter by CNS item IDs
      if (params.filter && params.filter.id) {
        const cnsItemIds = params.filter.id;
        console.log("🔍 Filtering long term care items by CNS item IDs:", cnsItemIds);
        
        // If CNS item IDs filter is empty array, return empty result
        if (Array.isArray(cnsItemIds) && cnsItemIds.length === 0) {
          console.log("⚠️ No CNS item IDs provided, returning empty result");
          return {
            data: [],
            total: 0
          };
        }
        
        // Otherwise, proceed with the filtered request
        // The backend API should handle the filtering by these IDs
        return baseDataProvider.getList(resource, params);
      }
      
      // If no CNS filter is provided, log a warning
      console.log("⚠️ Warning: Fetching all long term care items without CNS filtering");
    }

    if (resource === "cnscareplans") {
      const { patient_id, start_date, end_date } = params.filter;

      // If all specific filters are provided, use the detailed patient-specific endpoint
      if (patient_id && start_date && end_date) {
        const query = new URLSearchParams({
          start_date: new Date(start_date).toISOString().split("T")[0],
          end_date: new Date(end_date).toISOString().split("T")[0],
        }).toString();

        const url = `${apiUrl}/cnscareplans/${patient_id}?${query}`;

        try {
          const response = await fetch(url);
          if (!response.ok) {
            throw new Error(response.statusText);
          }
          const jsonData: RawCnsCarePlanItem[] = await response.json();

          const transformedData: TransformedCnsCarePlanItem[] = jsonData.map(
            (item: RawCnsCarePlanItem) => ({
              ...item.medicalSummaryPerPatient,
              id: item.medicalSummaryPerPatient.id, // Ensure id is correctly sourced
              request_start_date: item.start_date, // Specific to this endpoint's response structure
              request_end_date: item.end_date, // Specific to this endpoint's response structure
              packageLevel: item.packageLevel, // Specific to this endpoint's response structure
            }),
          );

          return {
            data: transformedData,
            total: transformedData.length, // This endpoint returns all matching records, so length is total
          };
        } catch (error) {
          console.error(
            "Error fetching patient-specific CNS care plans:",
            error,
          );
          throw error;
        }
      } else {
        // Otherwise, if not all specific filters are present, fetch the general list.
        // The baseDataProvider will handle standard RA query params (_sort, _order, _start, _end).
        // The data from this endpoint (e.g., /cnscareplans) is expected to be an array of
        // MedicalCareSummaryPerPatient-like objects. Fields like request_start_date, request_end_date,
        // and packageLevel (from RawCnsCarePlanItem structure) will be undefined for these records.
        return baseDataProvider.getList(resource, params);
      }
    }

    if (resource === "patients" && params.filter.q) {
      const url = `${apiUrl}/patients/search?query=${encodeURIComponent(params.filter.q)}`;
      return fetch(url)
        .then((response) => response.json())
        .then((data) => ({
          data,
          total: data.length, // The search endpoint returns all results
        }));
    }

    return baseDataProvider.getList(resource, params);
  },
  getLatestCnsCarePlanForPatient: async (
    patientId: Identifier,
  ): Promise<{ id: Identifier | null }> => {
    const url = `${apiUrl}/patients/${patientId}/latest-cns-care-plan`;
    try {
      const response = await fetch(url);
      if (response.status === 404) {
        // No plan found, treat as success with null ID
        return { id: null };
      }
      if (!response.ok) {
        throw new Error(response.statusText);
      }
      const jsonData = await response.json();
      // Expecting jsonData to be { id: 123 } or { medical_care_summary_per_patient_id: 123 } or similar
      const cnsPlanId =
        jsonData.id || jsonData.medical_care_summary_per_patient_id || null;
      return { id: cnsPlanId };
    } catch (error) {
      console.error("Error fetching latest CNS care plan:", error);
      // Rethrow or return a specific error structure if needed by UI
      // For now, let the error propagate to be caught by useQuery/useMutation in the component
      throw error;
    }
  },
  getCnsCarePlanDetails: (planId: Identifier) => {
    const url = `${apiUrl}/fast/cnscareplans/${planId}/details`;
    console.log("🔗 Fetching CNS care plan details from:", url);
    return fetch(url).then((response) => {
      if (!response.ok) {
        return response.json().then((error) => {
          throw new Error(error.detail || "Failed to fetch details");
        });
      }
      return response.json();
    });
  },

  getCarePlanDetails: (carePlanId: Identifier) => {
    const url = `${apiUrl}/careplans/${carePlanId}/details`;
    return fetch(url).then((response) => {
      if (!response.ok) {
        return response.json().then((error) => {
          throw new Error(error.detail || "Failed to fetch care plan details");
        });
      }
      return response.json();
    });
  },

  createCarePlanDetail: async (carePlanId, data) => {
    console.log("🌐 DATA PROVIDER - createCarePlanDetail called!");
    console.log("📋 Care Plan ID:", carePlanId);
    console.log("📦 Data to send:", JSON.stringify(data, null, 2));
    
    const url = `${apiUrl}/careplans/${carePlanId}/details`;
    console.log("🔗 API URL:", url);
    
    const options = {
      method: "POST",
      body: JSON.stringify(data),
      headers: new Headers({ "Content-Type": "application/json" }),
    };
    
    console.log("📤 Making API request...");
    const response = await fetch(url, options);
    console.log("📥 Response status:", response.status);
    
    if (!response.ok) {
      const error = await response.json();
      console.error("❌ API Error:", error);
      throw new Error(error.detail || "Failed to create care plan detail");
    }
    
    const result = await response.json();
    console.log("✅ API Success:", result);
    return result;
  },

  updateCarePlanDetail: async (carePlanId, detailId, data) => {
    const url = `${apiUrl}/careplans/${carePlanId}/details/${detailId}`;
    const options = {
      method: "PUT",
      body: JSON.stringify(data),
      headers: new Headers({ "Content-Type": "application/json" }),
    };
    const response = await fetch(url, options);
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "Failed to update care plan detail");
    }
    return response.json();
  },

  getCnsAvailableItemIds: async (cnsCarePlanId?: Identifier) => {
    try {
      if (!cnsCarePlanId) {
        // If no specific CNS care plan ID, return empty array (no items available)
        return [];
      }
      
      // Get details for the specific CNS care plan
      const details = await dataProvider.getCnsCarePlanDetails(cnsCarePlanId);
      console.log("🔍 CNS care plan details:", details);
      
      // Extract unique item IDs from this specific CNS care plan
      // Filter to only include "Prestations Aidant" items
      const itemIds = new Set<number>();
      details.forEach(detail => {
        if (detail.item?.id) {
          // Check if the item is of type "Prestations Aidant" or related to aide services
          const item = detail.item;
          console.log("🔎 Checking item:", item);
          
          // Multiple possible ways to identify "Prestations Aidant" items:
          const isAidantItem = 
            item.type === "Prestations Aidant" ||
            item.category === "Prestations Aidant" ||
            item.prestataire_type === "Aidant" ||
            item.code?.toLowerCase().includes("aidant") ||
            item.description?.toLowerCase().includes("aidant");
          
          if (isAidantItem) {
            console.log("✅ Item is Prestations Aidant type:", item);
            itemIds.add(detail.item.id);
          } else {
            console.log("❌ Item is not Prestations Aidant type:", item);
          }
        }
      });
      
      console.log("🎯 Filtered Aidant item IDs:", Array.from(itemIds));
      return Array.from(itemIds);
    } catch (error) {
      console.error("Error fetching CNS available item IDs:", error);
      return [];
    }
  },

  getMany: (
    resource: string,
    params: GetManyParams,
  ): Promise<GetManyResult> => {
    const { ids } = params;
    return Promise.all(
      ids.map((id: Identifier) => baseDataProvider.getOne(resource, { id })),
    ).then((responses: GetOneResult[]) => ({
      data: responses.map((response: GetOneResult) => response.data),
    }));
  },
};
