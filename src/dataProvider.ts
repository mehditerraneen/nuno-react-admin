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
import { authService } from "./services/authService";

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

// Helper function for authenticated fetch with automatic token refresh
export const authenticatedFetch = async (
  url: string,
  options: any = {},
): Promise<Response> => {
  const makeRequest = async () => {
    const token = authService.getAccessToken();

    const headers: HeadersInit = {
      "Content-Type": "application/json",
      ...options.headers,
    };

    if (token) {
      headers.Authorization = token;
    }

    const requestOptions = {
      ...options,
      headers,
    };

    return fetch(url, requestOptions);
  };

  try {
    // Make initial request
    const response = await makeRequest();

    // If we get a 401, try to refresh token and retry
    if (response.status === 401) {
      console.log("🔄 Got 401, attempting token refresh and retry for:", url);

      try {
        await authService.refreshToken();
        console.log("✅ Token refreshed, retrying request");

        // Retry the request with the new token
        const retryResponse = await makeRequest();

        if (retryResponse.status === 401) {
          console.log(
            "❌ Still getting 401 after token refresh, authentication failed",
          );
          authService.logout();
          throw new Error("Authentication failed - please login again");
        }

        return retryResponse;
      } catch (refreshError) {
        console.log("❌ Token refresh failed:", refreshError);
        authService.logout();
        throw new Error("Session expired - please login again");
      }
    }

    return response;
  } catch (error) {
    if (error instanceof TypeError && error.message.includes("fetch")) {
      console.error("❌ Network error:", error);
    }
    throw error;
  }
};

// Create authenticated HTTP client with automatic token refresh
const httpClient = async (url: string, options: any = {}) => {
  const token = authService.getAccessToken();
  console.log(
    "🔑 Making request to:",
    url,
    "with token:",
    token ? "Present" : "Missing",
  );

  return authenticatedFetch(url, options);
};

// Create base data provider with custom response handling
const baseDataProvider: DataProvider = simpleRestProvider(apiUrl, httpClient);

// Define a custom data provider type that includes our new method
// Tour validation interfaces
interface ProposedTourEvent {
  id: number;
  patient_id: number;
  patient_name: string;
  patient_address: string;
  time_start: string;
  time_end: string;
  duration_minutes: number;
  sequence: number;
  state: number;
}

interface ProposedTourData {
  events: ProposedTourEvent[];
  planned_start_time: string;
  planned_end_time: string;
  employee_id: number;
  tour_date: string;
  tour_name?: string;
  include_travel_calculation: boolean;
  include_optimization_suggestions: boolean;
}

interface ValidationError {
  type: string;
  severity: string;
  message: string;
  event_ids?: number[];
  suggested_fix?: string;
}

interface ValidationWarning {
  type: string;
  severity: string;
  message: string;
  event_ids?: number[];
  suggested_fix?: string;
}

interface TravelSegment {
  from_event_id: number;
  to_event_id: number;
  from_location: string;
  to_location: string;
  estimated_duration_minutes: number;
  estimated_distance_km: number;
  departure_time: string;
  arrival_time: string;
  buffer_time_minutes: number;
}

interface TourStatistics {
  total_events: number;
  total_care_time_minutes: number;
  total_travel_time_minutes: number;
  total_tour_duration_minutes: number;
  total_distance_km: number;
  efficiency_score: number;
  utilization_rate: number;
  longest_gap_minutes: number;
  shortest_buffer_minutes: number;
}

interface OptimizationSuggestion {
  type: string;
  description: string;
  impact: string;
  estimated_savings_minutes: number;
  suggested_action: string;
}

interface TourValidationResponse {
  is_valid: boolean;
  validation_errors: ValidationError[];
  warnings: ValidationWarning[];
  travel_segments: TravelSegment[];
  statistics: TourStatistics;
  optimization_suggestions: OptimizationSuggestion[];
  calculated_at: string;
}

export interface ClosestEvent {
  event_id: number;
  patient_name: string;
  patient_address: string;
  distance_km: number;
  duration_minutes: number;
  rank: number;
  cached: boolean;
}

export interface EventProximityResponse {
  source_event_id: number;
  source_patient_name: string;
  source_patient_address: string;
  closest_events: ClosestEvent[];
  total_calculated: number;
  cache_hits: number;
  api_calls_made: number;
  calculated_at: string;
}

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

  // Tours-specific methods
  getDailyEvents: (
    date: string,
    employeeId?: number,
  ) => Promise<{ data: any[] }>;
  optimizeTourByEmployee: (employeeId: number, date: string) => Promise<void>;
  updateEventTimes: (
    eventId: number,
    times: { real_start?: string; real_end?: string },
  ) => Promise<any>;
  getToursByEmployee: (
    employeeId: number,
    date: string,
  ) => Promise<{ data: any }>;

  // Pre-save validation method
  validateProposedTour: (
    proposedData: ProposedTourData,
  ) => Promise<TourValidationResponse>;

  // NEW: Proximity calculation method
  calculateEventProximity: (params: {
    source_event_id: number;
    target_event_ids: number[];
  }) => Promise<EventProximityResponse>;

  // Medication Plans methods
  searchMedicines: (query: string, limit?: number) => Promise<any[]>;
  getMedicationDistributions: (
    planId: Identifier,
    params?: { date_from?: string; date_to?: string; event_id?: number },
  ) => Promise<any[]>;
  addMedicationToPlan: (
    planId: Identifier,
    medicationData: any,
  ) => Promise<any>;
  updateMedication: (
    planId: Identifier,
    medicationId: Identifier,
    data: any,
  ) => Promise<any>;
  deleteMedication: (planId: Identifier, medicationId: Identifier) => Promise<any>;
  bulkUpdateMedications: (
    planId: Identifier,
    medicationIds: number[],
    data: any,
  ) => Promise<{ updated: number; medication_ids: number[] }>;

  // Schedule Rules methods
  getScheduleRules: (
    planId: Identifier,
    medicationId: Identifier,
  ) => Promise<{ data: any[]; total: number }>;
  createScheduleRule: (
    planId: Identifier,
    medicationId: Identifier,
    data: any,
  ) => Promise<any>;
  updateScheduleRule: (
    planId: Identifier,
    medicationId: Identifier,
    ruleId: Identifier,
    data: any,
  ) => Promise<any>;
  deleteScheduleRule: (
    planId: Identifier,
    medicationId: Identifier,
    ruleId: Identifier,
  ) => Promise<any>;

  // Prescriptions methods
  searchPhysicians: (query: string, limit?: number) => Promise<any[]>;
  getPhysicianDetails: (physicianId: Identifier) => Promise<any>;
  getPatientPrescriptions: (patientId: Identifier) => Promise<any[]>;
  getPrescriptionMedications: (prescriptionId: Identifier) => Promise<{ data: any[]; total: number }>;
  uploadPrescriptionFile: (
    prescriptionId: Identifier,
    file: File,
  ) => Promise<any>;
  deletePrescriptionFile: (prescriptionId: Identifier) => Promise<any>;
  getPrescriptionStats: () => Promise<any>;
  bulkDeletePrescriptions: (ids: number[]) => Promise<{ deleted: number }>;

  // Wound Management methods
  getPatientWounds: (patientId: Identifier) => Promise<any[]>;
  getWoundEvolutions: (woundId: Identifier) => Promise<{ data: any[]; total: number }>;
  createWoundEvolution: (woundId: Identifier, data: any) => Promise<any>;
  updateWoundEvolution: (
    woundId: Identifier,
    evolutionId: Identifier,
    data: any,
  ) => Promise<any>;
  deleteWoundEvolution: (woundId: Identifier, evolutionId: Identifier) => Promise<any>;
  getWoundImages: (woundId: Identifier) => Promise<any[]>;
  uploadWoundImage: (
    woundId: Identifier,
    file: File,
    evolutionId?: Identifier,
    comment?: string,
  ) => Promise<any>;
  deleteWoundImage: (woundId: Identifier, imageId: Identifier) => Promise<any>;
  getWoundStatistics: (patientId?: Identifier) => Promise<any>;
  getPatientWoundDiagram: (patientId: Identifier) => Promise<any>;
}

export const dataProvider: MyDataProvider = {
  // Override all CRUD methods to handle Django array responses
  getOne: async (resource: string, params: any) => {
    console.log(
      "🔍 Getting one for resource:",
      resource,
      "with params:",
      params,
    );

    // Handle planning resources
    if (resource.startsWith("planning/")) {
      const url = `${apiUrl}/${resource}/${params.id}`;
      console.log("🔍 DEBUG getOne planning:");
      console.log("  Resource:", resource);
      console.log("  Params:", params);
      console.log("  URL:", url);

      try {
        const response = await httpClient(url);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        console.log("📊 Planning getOne response:", data);

        // Planning API returns {data: {...}} or raw data, normalize it
        if (data && typeof data === "object") {
          // If already wrapped with data key, return as-is
          if (data.data) {
            return data;
          }
          // Otherwise wrap it
          return { data };
        }

        return { data };
      } catch (error: any) {
        console.error("❌ Error getting one planning:", error);
        throw error;
      }
    }

    // Handle employees getOne with standard REST endpoint
    if (resource === "employees") {
      const url = `${apiUrl}/employees/${params.id}`;
      console.log("🌐 Making getOne request to employees endpoint:", url);

      try {
        const response = await httpClient(url);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        console.log("📊 Employee getOne response:", data);

        return { data };
      } catch (error: any) {
        console.error("❌ Error getting one employee:", error);
        throw error;
      }
    }

    // Handle FastAPI resources (apiUrl already includes /fast)
    const url = `${apiUrl}/${resource}/${params.id}`;
    console.log("🌐 Making getOne request to:", url);

    try {
      const response = await httpClient(url);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log("📊 GetOne response for", resource, ":", data);

      // Transform field names for events resource and wrap in React Admin format
      if (data && typeof data === "object" && !data.data) {
        let transformedData = data;

        if (resource === "events") {
          transformedData = {
            ...data,
            // Map FastAPI field names to React Admin expected names
            date: data.day,
            time_start: data.time_start_event,
            time_end: data.time_end_event,
            real_start: data.real_time_start_event,
            real_end: data.real_time_end_event,
            event_type: data.event_type_enum || data.event_type, // Map from backend enum field
            event_address: data.event_address || "", // Add default if missing
          };
        }

        return { data: transformedData };
      } else {
        return data;
      }
    } catch (error: any) {
      console.error("❌ Error getting one", resource, ":", error);
      throw error;
    }
  },

  getMany: async (
    resource: string,
    params: GetManyParams,
  ): Promise<GetManyResult> => {
    console.log(
      "🔍 Getting many for resource:",
      resource,
      "with params:",
      params,
    );
    const { ids } = params;
    try {
      const responses = await Promise.all(
        ids.map((id: Identifier) => dataProvider.getOne(resource, { id })),
      );
      return {
        data: responses.map((response: GetOneResult) => response.data),
      };
    } catch (error: any) {
      console.error("❌ Error getting many", resource, ":", error);
      throw error;
    }
  },

  create: async (resource: string, params: any) => {
    console.log("🔍 Creating for resource:", resource, "with params:", params);
    try {
      // Handle planning resources
      if (resource.startsWith("planning/")) {
        const url = `${apiUrl}/${resource}`;
        const response = await httpClient(url, {
          method: "POST",
          body: JSON.stringify(params.data),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        console.log("📊 Create planning response:", data);

        // Planning API returns {id: X, message: "..."}, wrap it properly
        if (data && typeof data === "object" && data.id) {
          return { data: { id: data.id, ...params.data } };
        } else {
          console.error("❌ Planning creation response missing id:", data);
          throw new Error("Planning creation response must include an id");
        }
      }

      // Handle tours resource with /fast/ prefix
      if (resource === "tours") {
        const url = `${apiUrl}/tours`;
        const response = await httpClient(url, {
          method: "POST",
          body: JSON.stringify(params.data),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        console.log("📊 Create tour response:", data);

        // Ensure response has correct React Admin format
        if (data && typeof data === "object" && data.id) {
          return { data };
        } else {
          console.error("❌ Tour creation response missing id:", data);
          throw new Error("Tour creation response must include an id");
        }
      }

      // Handle events resource with /fast/ prefix
      if (resource === "events") {
        const url = `${apiUrl}/events`;
        const response = await httpClient(url, {
          method: "POST",
          body: JSON.stringify(params.data),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        console.log("📊 Create events response:", data);

        // Transform field names for events
        const transformedData = {
          ...data,
          date: data.day || data.date,
          time_start: data.time_start_event || data.time_start,
          time_end: data.time_end_event || data.time_end,
          real_start: data.real_time_start_event || data.real_start,
          real_end: data.real_time_end_event || data.real_end,
          event_type: data.event_type_enum || data.event_type,
          event_address: data.event_address || "",
        };

        // Ensure response has correct React Admin format
        if (
          transformedData &&
          typeof transformedData === "object" &&
          transformedData.id
        ) {
          return { data: transformedData };
        } else {
          console.error(
            "❌ Events creation response missing id:",
            transformedData,
          );
          throw new Error("Events creation response must include an id");
        }
      }

      // For other resources, use the base data provider
      return await baseDataProvider.create(resource, params);
    } catch (error: any) {
      console.error("❌ Error creating", resource, ":", error);
      throw error;
    }
  },

  update: async (resource: string, params: any) => {
    console.log("🔍 Updating for resource:", resource, "with params:", params);
    try {
      // Handle tours resource with /fast/ prefix
      if (resource === "tours") {
        const url = `${apiUrl}/tours/${params.id}`;
        const response = await httpClient(url, {
          method: "PUT",
          body: JSON.stringify(params.data),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        console.log("📊 Update tour response:", data);

        // Ensure response has correct React Admin format
        if (data && typeof data === "object" && data.id) {
          return { data };
        } else {
          console.error("❌ Tour update response missing id:", data);
          throw new Error("Tour update response must include an id");
        }
      }

      // Handle events resource with /fast/ prefix
      if (resource === "events") {
        const url = `${apiUrl}/events/${params.id}`;
        const response = await httpClient(url, {
          method: "PUT",
          body: JSON.stringify(params.data),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        console.log("📊 Update events response:", data);

        // Transform field names for events
        const transformedData = {
          ...data,
          date: data.day || data.date,
          time_start: data.time_start_event || data.time_start,
          time_end: data.time_end_event || data.time_end,
          real_start: data.real_time_start_event || data.real_start,
          real_end: data.real_time_end_event || data.real_end,
          event_type: data.event_type_enum || data.event_type,
          event_address: data.event_address || "",
        };

        // Ensure response has correct React Admin format
        if (
          transformedData &&
          typeof transformedData === "object" &&
          transformedData.id
        ) {
          return { data: transformedData };
        } else {
          console.error(
            "❌ Events update response missing id:",
            transformedData,
          );
          throw new Error("Events update response must include an id");
        }
      }

      // For other resources, use the base data provider
      return await baseDataProvider.update(resource, params);
    } catch (error: any) {
      console.error("❌ Error updating", resource, ":", error);
      throw error;
    }
  },

  updateMany: async (resource: string, params: any) => {
    console.log(
      "🔍 Updating many for resource:",
      resource,
      "with params:",
      params,
    );
    try {
      return await baseDataProvider.updateMany(resource, params);
    } catch (error: any) {
      console.error("❌ Error updating many", resource, ":", error);
      throw error;
    }
  },

  delete: async (resource: string, params: any) => {
    console.log("🔍 Deleting for resource:", resource, "with params:", params);
    try {
      // Handle tours resource with /fast/ prefix
      if (resource === "tours") {
        const url = `${apiUrl}/tours/${params.id}`;
        const response = await httpClient(url, {
          method: "DELETE",
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        // For delete, we just need to return the deleted record data
        return { data: params.previousData || { id: params.id } };
      }

      // Handle events resource with /fast/ prefix
      if (resource === "events") {
        const url = `${apiUrl}/events/${params.id}`;
        const response = await httpClient(url, {
          method: "DELETE",
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        // For delete, we just need to return the deleted record data
        return { data: params.previousData || { id: params.id } };
      }

      // For other resources, use the base data provider
      return await baseDataProvider.delete(resource, params);
    } catch (error: any) {
      console.error("❌ Error deleting", resource, ":", error);
      throw error;
    }
  },

  deleteMany: async (resource: string, params: any) => {
    console.log(
      "🔍 Deleting many for resource:",
      resource,
      "with params:",
      params,
    );
    try {
      return await baseDataProvider.deleteMany(resource, params);
    } catch (error: any) {
      console.error("❌ Error deleting many", resource, ":", error);
      throw error;
    }
  },

  getManyReference: async (resource: string, params: any) => {
    console.log(
      "🔍 Getting many reference for resource:",
      resource,
      "with params:",
      params,
    );
    try {
      const { target, id, pagination, sort, filter } = params;

      // Create a new filter that includes the reference
      const newFilter = {
        ...filter,
        [target]: id,
      };

      // Use getList with the reference filter
      const result = await dataProvider.getList(resource, {
        pagination,
        sort,
        filter: newFilter,
      });

      return result;
    } catch (error: any) {
      console.error("❌ Error getting many reference", resource, ":", error);
      throw error;
    }
  },
  getList: async (
    resource: string,
    params: GetListParams,
  ): Promise<GetListResult> => {
    console.log(
      "🔍 Getting list for resource:",
      resource,
      "with params:",
      params,
    );

    // Extract common parameters at the beginning
    const { page, perPage } = params.pagination;
    const { field, order } = params.sort;
    const filter = params.filter || {};

    // IMPORTANT: Handle planning resources
    if (resource.startsWith("planning/")) {
      console.log("📅 Handling planning with FastAPI endpoint");

      const url = `${apiUrl}/${resource}`;
      console.log("🌐 Making request to planning endpoint:", url);

      try {
        const response = await httpClient(url);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        console.log("📊 Planning response:", data);

        // API returns {data: [...], total: number}
        if (
          data &&
          typeof data === "object" &&
          data.data &&
          Array.isArray(data.data)
        ) {
          return data;
        } else {
          console.error("❌ Unexpected planning response format:", data);
          throw new Error(`Expected React Admin format for planning`);
        }
      } catch (error: any) {
        console.error("❌ Error fetching planning:", error);
        throw error;
      }
    }

    // IMPORTANT: Handle prescriptions with FastAPI endpoint
    if (resource === "prescriptions") {
      console.log("📋 Handling prescriptions with FastAPI endpoint");

      const queryParams = new URLSearchParams();

      // React Admin pagination
      const start = (page - 1) * perPage;
      const end = page * perPage;
      queryParams.set("_start", start.toString());
      queryParams.set("_end", end.toString());

      // Sorting
      if (field) {
        queryParams.set("_sort", field);
        queryParams.set("_order", order.toUpperCase());
      }

      // Add filters (patient_id, prescriptor_id, date_from, date_to, search)
      Object.keys(filter).forEach((key) => {
        if (filter[key] !== undefined && filter[key] !== null) {
          queryParams.set(key, filter[key].toString());
        }
      });

      const url = `${apiUrl}/prescriptions?${queryParams.toString()}`;
      console.log("🌐 Making request to prescriptions endpoint:", url);

      try {
        const response = await httpClient(url);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        console.log("📊 Prescriptions response:", data);

        // API returns {data: [...], total: number}
        if (
          data &&
          typeof data === "object" &&
          data.data &&
          Array.isArray(data.data)
        ) {
          return data;
        } else {
          console.error("❌ Unexpected prescriptions response format:", data);
          throw new Error(`Expected React Admin format for prescriptions`);
        }
      } catch (error: any) {
        console.error("❌ Error fetching prescriptions:", error);
        throw error;
      }
    }

    // IMPORTANT: Handle medication-plans with FastAPI endpoint
    if (resource === "medication-plans") {
      console.log("💊 Handling medication-plans with FastAPI endpoint");

      const queryParams = new URLSearchParams();

      // React Admin pagination
      const start = (page - 1) * perPage;
      const end = page * perPage;
      queryParams.set("_start", start.toString());
      queryParams.set("_end", end.toString());

      // Sorting
      if (field) {
        queryParams.set("_sort", field);
        queryParams.set("_order", order.toUpperCase());
      }

      // Add filters (patient_id, status, search)
      Object.keys(filter).forEach((key) => {
        if (filter[key] !== undefined && filter[key] !== null) {
          queryParams.set(key, filter[key].toString());
        }
      });

      const url = `${apiUrl}/medication-plans?${queryParams.toString()}`;
      console.log("🌐 Making request to medication-plans endpoint:", url);

      try {
        const response = await httpClient(url);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        console.log("📊 Medication plans response:", data);

        // API returns {data: [...], total: number}
        if (
          data &&
          typeof data === "object" &&
          data.data &&
          Array.isArray(data.data)
        ) {
          return data;
        } else {
          console.error(
            "❌ Unexpected medication-plans response format:",
            data,
          );
          throw new Error(
            `Expected React Admin format for medication-plans`,
          );
        }
      } catch (error: any) {
        console.error("❌ Error fetching medication-plans:", error);
        throw error;
      }
    }

    // IMPORTANT: Handle tours first to prevent double /fast/ prefix
    if (resource === "tours") {
      console.log(
        "🚀 Handling tours with FastAPI endpoint (preventing double /fast/)",
      );

      // For FastAPI endpoints, use simple query params
      const queryParams = new URLSearchParams();

      // Add filters directly (FastAPI expects simple params)
      Object.keys(filter).forEach((key) => {
        if (filter[key] !== undefined && filter[key] !== null) {
          queryParams.set(key, filter[key].toString());
        }
      });

      // Add pagination if needed (FastAPI might use different param names)
      if (page > 1) {
        queryParams.set("page", page.toString());
      }
      if (perPage !== 10) {
        queryParams.set("limit", perPage.toString());
      }

      // Add sorting if needed
      if (field) {
        queryParams.set("sort", field);
        queryParams.set("order", order.toLowerCase());
      }

      const url = `${apiUrl}/tours?${queryParams.toString()}`;
      console.log("🌐 Making request to FastAPI tours endpoint:", url);

      try {
        const response = await httpClient(url);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        console.log("📊 FastAPI tours response:", data);

        // Handle FastAPI response format
        if (Array.isArray(data)) {
          return {
            data: data,
            total: data.length,
          };
        } else if (
          data &&
          typeof data === "object" &&
          data.data &&
          Array.isArray(data.data)
        ) {
          return data;
        } else {
          console.error("❌ Unexpected FastAPI tours response format:", data);
          throw new Error(`Expected array or React Admin format for tours`);
        }
      } catch (error: any) {
        console.error("❌ Error fetching tours from FastAPI:", error);
        throw error;
      }
    }

    if (resource === "patients_with_cns_plan") {
      // This is a virtual resource. We add a permanent filter and call the real 'patients' resource.
      const newParams = {
        ...params,
        filter: {
          ...params.filter,
          has_cns_plan: true,
        },
      };
      // We need to call the 'patients' resource on the authenticated base provider
      return dataProvider.getList("patients", newParams);
    }

    if (resource === "longtermcareitems") {
      // Check if we need to filter by CNS item IDs
      if (params.filter && params.filter.id) {
        const cnsItemIds = params.filter.id;
        console.log(
          "🔍 Filtering long term care items by CNS item IDs:",
          cnsItemIds,
        );

        // If CNS item IDs filter is empty array, return empty result
        if (Array.isArray(cnsItemIds) && cnsItemIds.length === 0) {
          console.log("⚠️ No CNS item IDs provided, returning empty result");
          return {
            data: [],
            total: 0,
          };
        }
      }

      // If no CNS filter is provided, log a warning
      console.log(
        "⚠️ Warning: Fetching all long term care items without CNS filtering",
      );
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
          const response = await authenticatedFetch(url);
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
      }

      // Handle general cnscareplans list (falls through if no specific filters)
      // Django endpoint returns plain array, need to convert to React Admin format
      const queryParams = new URLSearchParams();
      const start = (page - 1) * perPage;
      const end = page * perPage;
      queryParams.set("_start", start.toString());
      queryParams.set("_end", (end + 1).toString());

      if (field) {
        queryParams.set("_sort", field);
        queryParams.set("_order", order.toUpperCase());
      }

      const url = `${apiUrl}/cnscareplans?${queryParams.toString()}`;
      console.log("🌐 Making request to cnscareplans endpoint:", url);

      try {
        const response = await httpClient(url);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        console.log("📊 CNS care plans response:", data);

        // Django endpoint returns plain array
        if (Array.isArray(data)) {
          return {
            data: data,
            total: data.length,
          };
        }

        // If already in React Admin format
        if (
          data &&
          typeof data === "object" &&
          data.data &&
          Array.isArray(data.data)
        ) {
          return data;
        }

        throw new Error("Unexpected cnscareplans response format");
      } catch (error: any) {
        console.error("❌ Error fetching cnscareplans:", error);
        throw error;
      }
    }

    if (resource === "patients" && params.filter?.q) {
      const url = `${apiUrl}/patients/search?query=${encodeURIComponent(params.filter.q)}`;
      const response = await authenticatedFetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      return {
        data,
        total: data.length, // The search endpoint returns all results
      };
    }

    // Handle employees resource with Django endpoints
    if (resource === "employees") {
      let url;

      // Check if we need available employees (with date filters) or all employees
      if (filter.available === true || filter.start || filter.end) {
        // Use available employees endpoint with date range
        const today = new Date().toISOString().split("T")[0];
        const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0];

        const startDate = filter.start || today;
        const endDate = filter.end || nextWeek;

        url = `${apiUrl}/employees/available/?start=${startDate}&end=${endDate}`;
      } else {
        // Use standard employees list endpoint
        url = `${apiUrl}/employees`;
      }

      console.log("🌐 Making request to employees endpoint:", url);

      try {
        const response = await httpClient(url);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        console.log("📊 Employees response:", data);

        // FastAPI now returns proper React Admin format
        if (
          data &&
          typeof data === "object" &&
          data.data &&
          Array.isArray(data.data)
        ) {
          console.log(
            "✅ FastAPI employees response in correct React Admin format",
          );
          return data;
        } else {
          console.error("❌ Unexpected employees response format:", data);
          throw new Error(
            `Expected React Admin format {data: [...], total: number} for employees`,
          );
        }
      } catch (error: any) {
        console.error("❌ Error fetching employees:", error);
        throw error;
      }
    }

    // Handle event-types resource
    if (resource === "event-types") {
      const url = `${apiUrl}/event-types`;
      console.log("🌐 Making request to event-types endpoint:", url);

      try {
        const response = await httpClient(url);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        console.log("📊 Event types response:", data);
        console.log("📊 Event types response type:", typeof data);
        console.log("📊 Event types response is array:", Array.isArray(data));

        if (
          data &&
          typeof data === "object" &&
          data.data &&
          Array.isArray(data.data)
        ) {
          return data;
        } else if (Array.isArray(data)) {
          // Handle simple arrays for reference data like event-types/states
          // Transform array items to ensure they have proper id fields
          const transformedData = data.map((item, index) => {
            if (typeof item === "string") {
              // Handle string arrays like ["GENERIC", "WOUND_CARE", ...] or ["wound_care", "vital_signs", ...]
              return {
                id: item,
                name: item.includes("_")
                  ? item
                      .replace(/_/g, " ")
                      .replace(/\b\w/g, (l) => l.toUpperCase())
                  : item.charAt(0).toUpperCase() + item.slice(1).toLowerCase(),
              };
            } else if (item && typeof item === "object") {
              // Handle object arrays, ensure id exists
              return {
                id: item.id || item.name || item.value || index,
                name:
                  item.name ||
                  item.display_name ||
                  item.label ||
                  item.value ||
                  item.id,
                ...item,
              };
            } else {
              // Fallback for other types
              return {
                id: index,
                name: String(item),
              };
            }
          });

          console.log("✅ Transformed event-types data:", transformedData);

          // If no data was returned, use fallback
          if (transformedData.length === 0) {
            console.log("⚠️ No event types returned from API, using fallback");
            const fallbackEventTypes = [
              "GENERIC",
              "BIRTHDAY",
              "WOUND_CARE",
              "VITAL_SIGNS",
              "MEDICATION",
              "HYGIENE",
              "MOBILITY",
              "NUTRITION",
              "ASSESSMENT",
              "OTHER",
            ];

            const fallbackTransformed = fallbackEventTypes.map((item) => ({
              id: item,
              name: item.includes("_")
                ? item
                    .replace(/_/g, " ")
                    .replace(/\b\w/g, (l) => l.toUpperCase())
                : item.charAt(0).toUpperCase() + item.slice(1).toLowerCase(),
            }));

            return {
              data: fallbackTransformed,
              total: fallbackTransformed.length,
            };
          }

          return {
            data: transformedData,
            total: transformedData.length,
          };
        } else {
          console.error("❌ Unexpected event-types response format:", data);
          throw new Error(
            `Expected React Admin format {data: [...], total: number} for event-types`,
          );
        }
      } catch (error: any) {
        console.error("❌ Error fetching event-types:", error);
        console.log("🔄 Falling back to default event types");

        // Fallback to common event types based on what we've seen in the system
        const fallbackEventTypes = [
          "GENERIC",
          "BIRTHDAY",
          "WOUND_CARE",
          "VITAL_SIGNS",
          "MEDICATION",
          "HYGIENE",
          "MOBILITY",
          "NUTRITION",
          "ASSESSMENT",
          "OTHER",
        ];

        const transformedData = fallbackEventTypes.map((item) => ({
          id: item,
          name: item.includes("_")
            ? item.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
            : item.charAt(0).toUpperCase() + item.slice(1).toLowerCase(),
        }));

        console.log("✅ Using fallback event-types data:", transformedData);

        return {
          data: transformedData,
          total: transformedData.length,
        };
      }
    }

    // Handle event-states resource
    if (resource === "event-states") {
      const url = `${apiUrl}/event-states`;
      console.log("🌐 Making request to event-states endpoint:", url);

      try {
        const response = await httpClient(url);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        console.log("📊 Event states response:", data);

        if (
          data &&
          typeof data === "object" &&
          data.data &&
          Array.isArray(data.data)
        ) {
          return data;
        } else if (Array.isArray(data)) {
          // Handle simple arrays for reference data like event-types/states
          // Transform array items to ensure they have proper id fields
          const transformedData = data.map((item, index) => {
            if (typeof item === "string") {
              // Handle string arrays like ["WAITING", "VALID", ...] or ["waiting", "valid", ...]
              return {
                id: item,
                name: item.includes("_")
                  ? item
                      .replace(/_/g, " ")
                      .replace(/\b\w/g, (l) => l.toUpperCase())
                  : item.charAt(0).toUpperCase() + item.slice(1).toLowerCase(),
              };
            } else if (item && typeof item === "object") {
              // Handle object arrays, ensure id exists
              return {
                id: item.id || item.name || item.value || index,
                name:
                  item.name ||
                  item.display_name ||
                  item.label ||
                  item.value ||
                  item.id,
                ...item,
              };
            } else {
              // Fallback for other types
              return {
                id: index,
                name: String(item),
              };
            }
          });

          console.log("✅ Transformed event-states data:", transformedData);

          return {
            data: transformedData,
            total: transformedData.length,
          };
        } else {
          console.error("❌ Unexpected event-states response format:", data);
          throw new Error(
            `Expected React Admin format {data: [...], total: number} for event-states`,
          );
        }
      } catch (error: any) {
        console.error("❌ Error fetching event-states:", error);
        throw error;
      }
    }

    // Handle specific FastAPI resources that use /fast/ prefix
    if (resource === "events") {
      console.log("🚀 Using FastAPI endpoint for events with /fast/ prefix");

      // For events, use simple query params that FastAPI expects
      const queryParams = new URLSearchParams();

      // Add filters directly (FastAPI expects simple params)
      Object.keys(filter).forEach((key) => {
        if (filter[key] !== undefined && filter[key] !== null) {
          queryParams.set(key, filter[key].toString());
        }
      });

      // Add pagination if needed (FastAPI might use different param names)
      if (page > 1) {
        queryParams.set("page", page.toString());
      }
      if (perPage !== 10) {
        queryParams.set("limit", perPage.toString());
      }

      // Add sorting if needed
      if (field) {
        queryParams.set("sort", field);
        queryParams.set("order", order.toLowerCase());
      }

      const url = `${apiUrl}/events?${queryParams.toString()}`;
      console.log("🌐 Making request to FastAPI events endpoint:", url);

      try {
        const response = await httpClient(url);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        console.log("📊 FastAPI events response:", data);

        // Handle FastAPI response format and transform field names
        if (Array.isArray(data)) {
          // Direct array response
          const transformedData = data.map((item: any) => ({
            ...item,
            // Map FastAPI field names to React Admin expected names
            date: item.day || item.date,
            time_start: item.time_start_event || item.time_start,
            time_end: item.time_end_event || item.time_end,
            real_start: item.real_time_start_event || item.real_start,
            real_end: item.real_time_end_event || item.real_end,
            event_type: item.event_type_enum || item.event_type,
            event_address: item.event_address || "",
          }));

          return {
            data: transformedData,
            total: transformedData.length,
          };
        } else if (
          data &&
          typeof data === "object" &&
          data.data &&
          Array.isArray(data.data)
        ) {
          // React Admin format with field transformation
          const transformedData = data.data.map((item: any) => ({
            ...item,
            date: item.day || item.date,
            time_start: item.time_start_event || item.time_start,
            time_end: item.time_end_event || item.time_end,
            real_start: item.real_time_start_event || item.real_start,
            real_end: item.real_time_end_event || item.real_end,
            event_type: item.event_type_enum || item.event_type,
            event_address: item.event_address || "",
          }));

          return {
            data: transformedData,
            total: data.total,
          };
        } else if (
          data &&
          typeof data === "object" &&
          data.items &&
          Array.isArray(data.items)
        ) {
          // FastAPI paginated format: {items: [...], total: number, page: number, page_size: number}
          console.log(
            "✅ Converting FastAPI paginated events response to React Admin format",
          );
          const transformedData = data.items.map((item: any) => ({
            ...item,
            // Map FastAPI field names to React Admin expected names
            date: item.day || item.date,
            time_start: item.time_start_event || item.time_start,
            time_end: item.time_end_event || item.time_end,
            real_start: item.real_time_start_event || item.real_start,
            real_end: item.real_time_end_event || item.real_end,
            event_type: item.event_type_enum || item.event_type,
            event_address: item.event_address || "",
          }));

          return {
            data: transformedData,
            total: data.total,
          };
        } else {
          console.error("❌ Unexpected FastAPI events response format:", data);
          throw new Error(`Expected array or React Admin format for events`);
        }
      } catch (error: any) {
        console.error("❌ Error fetching events from FastAPI:", error);
        throw error;
      }
    }

    // For all other standard resources, use direct fetch with React Admin format
    console.log("🔧 Using direct fetch for standard resource:", resource);

    // Build the URL with React Admin query parameters

    // Convert React Admin params to simple query params that Django can understand
    const queryParams = new URLSearchParams();

    // Add pagination
    const start = (page - 1) * perPage;
    const end = page * perPage - 1;
    queryParams.set("_start", start.toString());
    queryParams.set("_end", (end + 1).toString()); // Django expects end to be exclusive

    // Add sorting
    if (field) {
      queryParams.set("_sort", field);
      queryParams.set("_order", order.toUpperCase());
    }

    // Add filters
    Object.keys(filter).forEach((key) => {
      if (filter[key] !== undefined && filter[key] !== null) {
        queryParams.set(key, filter[key].toString());
      }
    });

    const url = `${apiUrl}/${resource}?${queryParams.toString()}`;
    console.log("🌐 Making request to:", url);

    try {
      const response = await httpClient(url);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log("📊 Direct fetch response for", resource, ":", data);

      // Handle different FastAPI response formats
      if (
        data &&
        typeof data === "object" &&
        data.data &&
        Array.isArray(data.data)
      ) {
        console.log("✅ FastAPI response in correct React Admin format");
        return data;
      } else if (
        data &&
        typeof data === "object" &&
        data.items &&
        Array.isArray(data.items)
      ) {
        // Handle paginated format: {items: [...], total: number, page: number, page_size: number}
        console.log(
          "✅ Converting FastAPI paginated response to React Admin format",
        );

        // Transform field names for events resource
        let transformedItems = data.items;
        if (resource === "events") {
          transformedItems = data.items.map((item: any) => ({
            ...item,
            // Map FastAPI field names to React Admin expected names
            date: item.day,
            time_start: item.time_start_event,
            time_end: item.time_end_event,
            real_start: item.real_time_start_event,
            real_end: item.real_time_end_event,
            event_type: item.event_type_enum || item.event_type, // Add default if missing
            event_address: item.event_address || "", // Add default if missing
          }));
        }

        return {
          data: transformedItems,
          total: data.total,
        };
      } else {
        console.error("❌ Unexpected response format:", data);
        throw new Error(
          `Expected React Admin format {data: [...], total: number} for ${resource}`,
        );
      }
    } catch (error: any) {
      console.error("❌ Error fetching", resource, ":", error);
      throw error;
    }
  },
  getLatestCnsCarePlanForPatient: async (
    patientId: Identifier,
  ): Promise<{ id: Identifier | null }> => {
    const url = `${apiUrl}/patients/${patientId}/latest-cns-care-plan`;
    try {
      const response = await authenticatedFetch(url);
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
    const url = `${apiUrl}/cnscareplans/${planId}/details`;
    console.log(" Fetching CNS care plan details from:", url);
    return authenticatedFetch(url).then((response) => {
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
    return authenticatedFetch(url).then((response) => {
      if (!response.ok) {
        return response.json().then((error) => {
          throw new Error(error.detail || "Failed to fetch care plan details");
        });
      }
      return response.json();
    });
  },

  createCarePlanDetail: async (carePlanId, data) => {
    console.log(" DATA PROVIDER - createCarePlanDetail called!");
    console.log(" Care Plan ID:", carePlanId);
    console.log(" Data to send:", JSON.stringify(data, null, 2));

    const url = `${apiUrl}/careplans/${carePlanId}/details`;
    console.log(" API URL:", url);

    const options = {
      method: "POST",
      body: JSON.stringify(data),
    };

    console.log(" Making API request...");
    const response = await authenticatedFetch(url, options);
    console.log(" Response status:", response.status);

    if (!response.ok) {
      const error = await response.json();
      console.error(" API Error:", error);
      throw new Error(error.detail || "Failed to create care plan detail");
    }

    const result = await response.json();
    console.log(" API Success:", result);
    return result;
  },

  updateCarePlanDetail: async (carePlanId, detailId, data) => {
    const url = `${apiUrl}/careplans/${carePlanId}/details/${detailId}`;
    const options = {
      method: "PUT",
      body: JSON.stringify(data),
    };
    const response = await authenticatedFetch(url, options);
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

      // Extract ALL unique item IDs from this specific CNS care plan
      const itemIds = new Set<number>();
      details.forEach((detail) => {
        if (detail.item?.id) {
          console.log("✅ Including CNS item:", detail.item);
          itemIds.add(detail.item.id);
        }
      });

      console.log("🎯 All CNS care plan item IDs:", Array.from(itemIds));
      return Array.from(itemIds);
    } catch (error) {
      console.error("Error fetching CNS available item IDs:", error);
      return [];
    }
  },

  // Tours-specific method implementations
  createTour: async (data: { employee_id: number; date: string }) => {
    const url = `${apiUrl}/tours`;
    const response = await authenticatedFetch(url, {
      method: "POST",
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error("Failed to create tour");
    }

    return response.json();
  },

  optimizeTour: async (tourId: number) => {
    const url = `${apiUrl}/tours/${tourId}/optimize`;
    console.log("🚀 Optimizing tour with FastAPI endpoint:", url);
    const response = await authenticatedFetch(url, {
      method: "POST",
    });

    if (!response.ok) {
      throw new Error("Failed to optimize tour");
    }

    return response.json();
  },

  reorderTourEvents: async (tourId: number, eventIds: number[]) => {
    const url = `${apiUrl}/tours/${tourId}/reorder`;
    console.log("🚀 Reordering tour events with FastAPI endpoint:", url);
    const response = await authenticatedFetch(url, {
      method: "PUT",
      body: JSON.stringify({ event_ids: eventIds }),
    });

    if (!response.ok) {
      throw new Error("Failed to reorder tour events");
    }

    return response.json();
  },

  getDailyEvents: async (date: string, employeeId?: number) => {
    const params = new URLSearchParams({ date });
    if (employeeId) {
      params.append("employee_id", employeeId.toString());
    }

    const url = `${apiUrl}/events/daily?${params}`;
    console.log("🚀 Getting daily events with FastAPI endpoint:", url);
    const response = await authenticatedFetch(url);

    if (!response.ok) {
      throw new Error("Failed to fetch daily events");
    }

    const data = await response.json();
    return { data };
  },

  optimizeTourByEmployee: async (employeeId: number, date: string) => {
    const url = `${apiUrl}/tours/optimize`;
    console.log("🚀 Optimizing tour by employee with FastAPI endpoint:", url);
    const response = await authenticatedFetch(url, {
      method: "POST",
      body: JSON.stringify({ employee_id: employeeId, date }),
    });

    if (!response.ok) {
      throw new Error("Failed to optimize tour");
    }

    return response.json();
  },

  updateEventTimes: async (
    eventId: number,
    times: { real_start?: string; real_end?: string },
  ) => {
    const url = `${apiUrl}/events/${eventId}/times`;
    console.log("🚀 Updating event times with FastAPI endpoint:", url);
    const response = await authenticatedFetch(url, {
      method: "PUT",
      body: JSON.stringify(times),
    });

    if (!response.ok) {
      throw new Error("Failed to update event times");
    }

    return response.json();
  },

  getToursByEmployee: async (employeeId: number, date: string) => {
    const url = `${apiUrl}/tours?employee_id=${employeeId}&date=${date}`;
    console.log("🚀 Getting tours by employee with FastAPI endpoint:", url);
    const response = await authenticatedFetch(url);

    if (!response.ok) {
      throw new Error("Failed to fetch tours");
    }

    const data = await response.json();
    return { data };
  },

  // Pre-save validation method
  validateProposedTour: async (
    proposedData: ProposedTourData,
  ): Promise<TourValidationResponse> => {
    const url = `${apiUrl}/tours/validate-proposed`;
    console.log("🚀 Validating proposed tour configuration:", url);
    console.log("📊 Proposed data:", proposedData);

    const response = await authenticatedFetch(url, {
      method: "POST",
      body: JSON.stringify(proposedData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Tour validation failed:", response.status, errorText);
      throw new Error(
        `Failed to validate proposed tour: ${response.status} ${errorText}`,
      );
    }

    const validationResult = await response.json();
    console.log("✅ Tour validation result:", validationResult);

    return validationResult;
  },

  // NEW: Proximity calculation method
  calculateEventProximity: async (params: {
    source_event_id: number;
    target_event_ids: number[];
  }): Promise<EventProximityResponse> => {
    const url = `${apiUrl}/tours/events/proximity`;
    console.log("📍 Calculating event proximity:", url);
    console.log("📊 Proximity params:", params);

    const response = await authenticatedFetch(url, {
      method: "POST",
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Proximity calculation failed:", response.status, errorText);
      throw new Error(
        `Failed to calculate event proximity: ${response.status} ${errorText}`,
      );
    }

    const proximityResult = await response.json();
    console.log("✅ Proximity calculation result:", proximityResult);

    return proximityResult;
  },

  // Medication Plans methods
  searchMedicines: async (query: string, limit: number = 20) => {
    const params = new URLSearchParams({ q: query, limit: limit.toString() });
    const url = `${apiUrl}/medication-plans/medicines/search?${params}`;
    console.log("🔍 Searching medicines:", url);

    const response = await authenticatedFetch(url);

    if (!response.ok) {
      throw new Error("Failed to search medicines");
    }

    return response.json();
  },

  getMedicationDistributions: async (
    planId: Identifier,
    params?: { date_from?: string; date_to?: string; event_id?: number },
  ) => {
    const queryParams = new URLSearchParams();
    if (params?.date_from) queryParams.set("date_from", params.date_from);
    if (params?.date_to) queryParams.set("date_to", params.date_to);
    if (params?.event_id)
      queryParams.set("event_id", params.event_id.toString());

    const url = `${apiUrl}/medication-plans/${planId}/distributions?${queryParams}`;
    console.log("📅 Getting medication distributions:", url);

    const response = await authenticatedFetch(url);

    if (!response.ok) {
      throw new Error("Failed to fetch medication distributions");
    }

    return response.json();
  },

  addMedicationToPlan: async (planId: Identifier, medicationData: any) => {
    const url = `${apiUrl}/medication-plans/${planId}/medications`;
    console.log("➕ Adding medication to plan:", url);

    const response = await authenticatedFetch(url, {
      method: "POST",
      body: JSON.stringify(medicationData),
    });

    if (!response.ok) {
      throw new Error("Failed to add medication to plan");
    }

    return response.json();
  },

  updateMedication: async (
    planId: Identifier,
    medicationId: Identifier,
    data: any,
  ) => {
    const url = `${apiUrl}/medication-plans/${planId}/medications/${medicationId}`;
    console.log("✏️ Updating medication:", url);

    const response = await authenticatedFetch(url, {
      method: "PUT",
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error("Failed to update medication");
    }

    return response.json();
  },

  deleteMedication: async (planId: Identifier, medicationId: Identifier) => {
    const url = `${apiUrl}/medication-plans/${planId}/medications/${medicationId}`;
    console.log("🗑️ Deleting medication:", url);

    const response = await authenticatedFetch(url, {
      method: "DELETE",
    });

    if (!response.ok) {
      throw new Error("Failed to delete medication");
    }

    return response.json();
  },

  bulkUpdateMedications: async (
    planId: Identifier,
    medicationIds: number[],
    data: any,
  ) => {
    const url = `${apiUrl}/medication-plans/${planId}/medications/bulk-update`;
    console.log("🔄 Bulk updating medications:", url);

    const response = await authenticatedFetch(url, {
      method: "POST",
      body: JSON.stringify({
        medication_ids: medicationIds,
        ...data,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to bulk update medications");
    }

    return response.json();
  },

  // Schedule Rules methods
  getScheduleRules: async (planId: Identifier, medicationId: Identifier) => {
    const url = `${apiUrl}/medication-plans/${planId}/medications/${medicationId}/schedule-rules`;
    console.log("📅 Getting schedule rules:", url);

    const response = await authenticatedFetch(url);

    if (!response.ok) {
      throw new Error("Failed to fetch schedule rules");
    }

    return response.json();
  },

  createScheduleRule: async (
    planId: Identifier,
    medicationId: Identifier,
    data: any,
  ) => {
    const url = `${apiUrl}/medication-plans/${planId}/medications/${medicationId}/schedule-rules`;
    console.log("➕ Creating schedule rule:", url);

    const response = await authenticatedFetch(url, {
      method: "POST",
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error("Failed to create schedule rule");
    }

    return response.json();
  },

  updateScheduleRule: async (
    planId: Identifier,
    medicationId: Identifier,
    ruleId: Identifier,
    data: any,
  ) => {
    const url = `${apiUrl}/medication-plans/${planId}/medications/${medicationId}/schedule-rules/${ruleId}`;
    console.log("✏️ Updating schedule rule:", url);

    const response = await authenticatedFetch(url, {
      method: "PUT",
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error("Failed to update schedule rule");
    }

    return response.json();
  },

  deleteScheduleRule: async (
    planId: Identifier,
    medicationId: Identifier,
    ruleId: Identifier,
  ) => {
    const url = `${apiUrl}/medication-plans/${planId}/medications/${medicationId}/schedule-rules/${ruleId}`;
    console.log("🗑️ Deleting schedule rule:", url);

    const response = await authenticatedFetch(url, {
      method: "DELETE",
    });

    if (!response.ok) {
      throw new Error("Failed to delete schedule rule");
    }

    return { id: ruleId };
  },

  // Prescriptions methods
  searchPhysicians: async (query: string, limit: number = 20) => {
    const params = new URLSearchParams({ q: query, limit: limit.toString() });
    const url = `${apiUrl}/prescriptions/physicians/search?${params}`;
    console.log("🔍 Searching physicians:", url);

    const response = await authenticatedFetch(url);

    if (!response.ok) {
      throw new Error("Failed to search physicians");
    }

    return response.json();
  },

  getPhysicianDetails: async (physicianId: Identifier) => {
    const url = `${apiUrl}/prescriptions/physicians/${physicianId}`;
    console.log("👨‍⚕️ Getting physician details:", url);

    const response = await authenticatedFetch(url);

    if (!response.ok) {
      throw new Error("Failed to fetch physician details");
    }

    return response.json();
  },

  getPatientPrescriptions: async (patientId: Identifier) => {
    const url = `${apiUrl}/prescriptions/patients/${patientId}/prescriptions`;
    console.log("📋 Getting patient prescriptions:", url);

    const response = await authenticatedFetch(url);

    if (!response.ok) {
      throw new Error("Failed to fetch patient prescriptions");
    }

    return response.json();
  },

  getPrescriptionMedications: async (prescriptionId: Identifier) => {
    const url = `${apiUrl}/prescriptions/${prescriptionId}/medications`;
    console.log("💊 Getting medications linked to prescription:", url);

    const response = await authenticatedFetch(url);

    if (!response.ok) {
      throw new Error("Failed to fetch prescription medications");
    }

    return response.json();
  },

  uploadPrescriptionFile: async (prescriptionId: Identifier, file: File) => {
    const url = `${apiUrl}/prescriptions/${prescriptionId}/upload`;
    console.log("📤 Uploading prescription file:", url);

    const formData = new FormData();
    formData.append("file", file);

    const token = authService.getAccessToken();
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: token || "",
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error("Failed to upload prescription file");
    }

    return response.json();
  },

  deletePrescriptionFile: async (prescriptionId: Identifier) => {
    const url = `${apiUrl}/prescriptions/${prescriptionId}/file`;
    console.log("🗑️ Deleting prescription file:", url);

    const response = await authenticatedFetch(url, {
      method: "DELETE",
    });

    if (!response.ok) {
      throw new Error("Failed to delete prescription file");
    }

    return response.json();
  },

  getPrescriptionStats: async () => {
    const url = `${apiUrl}/prescriptions/stats/overview`;
    console.log("📊 Getting prescription statistics:", url);

    const response = await authenticatedFetch(url);

    if (!response.ok) {
      throw new Error("Failed to fetch prescription statistics");
    }

    return response.json();
  },

  bulkDeletePrescriptions: async (ids: number[]) => {
    const url = `${apiUrl}/prescriptions/bulk-delete`;
    console.log("🗑️ Bulk deleting prescriptions:", url);

    const response = await authenticatedFetch(url, {
      method: "POST",
      body: JSON.stringify({ ids }),
    });

    if (!response.ok) {
      throw new Error("Failed to bulk delete prescriptions");
    }

    return response.json();
  },

  // Wound Management method implementations
  getPatientWounds: async (patientId: Identifier) => {
    const url = `${apiUrl}/wounds?patient_id=${patientId}`;
    console.log("🩹 Getting patient wounds:", url);

    const response = await authenticatedFetch(url);

    if (!response.ok) {
      throw new Error("Failed to fetch patient wounds");
    }

    return response.json();
  },

  getWoundEvolutions: async (woundId: Identifier) => {
    const url = `${apiUrl}/wounds/${woundId}/evolutions`;
    console.log("📈 Getting wound evolutions:", url);

    const response = await authenticatedFetch(url);

    if (!response.ok) {
      throw new Error("Failed to fetch wound evolutions");
    }

    return response.json();
  },

  createWoundEvolution: async (woundId: Identifier, data: any) => {
    const url = `${apiUrl}/wounds/${woundId}/evolutions`;
    console.log("➕ Creating wound evolution:", url);

    const response = await authenticatedFetch(url, {
      method: "POST",
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error("Failed to create wound evolution");
    }

    return response.json();
  },

  updateWoundEvolution: async (
    woundId: Identifier,
    evolutionId: Identifier,
    data: any,
  ) => {
    const url = `${apiUrl}/wounds/${woundId}/evolutions/${evolutionId}`;
    console.log("✏️ Updating wound evolution:", url);

    const response = await authenticatedFetch(url, {
      method: "PUT",
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error("Failed to update wound evolution");
    }

    return response.json();
  },

  deleteWoundEvolution: async (woundId: Identifier, evolutionId: Identifier) => {
    const url = `${apiUrl}/wounds/${woundId}/evolutions/${evolutionId}`;
    console.log("🗑️ Deleting wound evolution:", url);

    const response = await authenticatedFetch(url, {
      method: "DELETE",
    });

    if (!response.ok) {
      throw new Error("Failed to delete wound evolution");
    }

    return { id: evolutionId };
  },

  getWoundImages: async (woundId: Identifier) => {
    const url = `${apiUrl}/wounds/${woundId}/images`;
    console.log("📷 Getting wound images:", url);

    const response = await authenticatedFetch(url);

    if (!response.ok) {
      throw new Error("Failed to fetch wound images");
    }

    return response.json();
  },

  uploadWoundImage: async (
    woundId: Identifier,
    file: File,
    evolutionId?: Identifier,
    comment?: string,
  ) => {
    const url = `${apiUrl}/wounds/${woundId}/images`;
    console.log("📤 Uploading wound image:", url);

    const formData = new FormData();
    formData.append("file", file);
    if (evolutionId) {
      formData.append("evolution_id", evolutionId.toString());
    }
    if (comment) {
      formData.append("comment", comment);
    }

    const token = authService.getAccessToken();
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: token || "",
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error("Failed to upload wound image");
    }

    return response.json();
  },

  deleteWoundImage: async (woundId: Identifier, imageId: Identifier) => {
    const url = `${apiUrl}/wounds/${woundId}/images/${imageId}`;
    console.log("🗑️ Deleting wound image:", url);

    const response = await authenticatedFetch(url, {
      method: "DELETE",
    });

    if (!response.ok) {
      throw new Error("Failed to delete wound image");
    }

    return { id: imageId };
  },

  getWoundStatistics: async (patientId?: Identifier) => {
    const url = patientId
      ? `${apiUrl}/wounds/statistics?patient_id=${patientId}`
      : `${apiUrl}/wounds/statistics`;
    console.log("📊 Getting wound statistics:", url);

    const response = await authenticatedFetch(url);

    if (!response.ok) {
      throw new Error("Failed to fetch wound statistics");
    }

    return response.json();
  },

  getPatientWoundDiagram: async (patientId: Identifier) => {
    const url = `${apiUrl}/wounds/patient-diagrams/${patientId}`;
    console.log("🗺️ Getting patient wound diagram:", url);

    const response = await authenticatedFetch(url);

    if (!response.ok) {
      // 404 is expected if no diagram exists yet
      if (response.status === 404) {
        return null;
      }
      throw new Error("Failed to fetch patient wound diagram");
    }

    return response.json();
  },

  // ============ Planning Audit API Methods ============

  getCellHistory: async (
    planningId: Identifier,
    employeeId: Identifier,
    date: string
  ) => {
    const url = `${apiUrl}/planning/monthly-planning/${planningId}/cell-history/${employeeId}/${date}`;
    console.log("📜 Getting cell history:", url);

    const response = await authenticatedFetch(url);

    if (!response.ok) {
      throw new Error("Failed to fetch cell history");
    }

    return response.json();
  },

  getPlanningAuditLog: async (
    planningId: Identifier,
    params?: {
      page?: number;
      pageSize?: number;
      employeeId?: number;
      dateFrom?: string;
      dateTo?: string;
      action?: string;
      changedBy?: number;
    }
  ) => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append("page", params.page.toString());
    if (params?.pageSize)
      queryParams.append("page_size", params.pageSize.toString());
    if (params?.employeeId)
      queryParams.append("employee_id", params.employeeId.toString());
    if (params?.dateFrom) queryParams.append("date_from", params.dateFrom);
    if (params?.dateTo) queryParams.append("date_to", params.dateTo);
    if (params?.action) queryParams.append("action", params.action);
    if (params?.changedBy)
      queryParams.append("changed_by", params.changedBy.toString());

    const url = `${apiUrl}/planning/monthly-planning/${planningId}/audit-log?${queryParams.toString()}`;
    console.log("📋 Getting planning audit log:", url);

    const response = await authenticatedFetch(url);

    if (!response.ok) {
      throw new Error("Failed to fetch planning audit log");
    }

    return response.json();
  },

  updateAuditReason: async (auditId: Identifier, changeReason: string) => {
    const url = `${apiUrl}/planning/audit-log/${auditId}/reason`;
    console.log("✏️ Updating audit reason:", url);

    const response = await authenticatedFetch(url, {
      method: "PATCH",
      body: JSON.stringify({ change_reason: changeReason }),
    });

    if (!response.ok) {
      throw new Error("Failed to update audit reason");
    }

    return response.json();
  },
};
