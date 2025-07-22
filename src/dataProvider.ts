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

// Helper function to create authenticated headers
const getAuthHeaders = (): HeadersInit => {
  const token = authService.getAccessToken();
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers.Authorization = token;
  }

  return headers;
};

// Create authenticated HTTP client
const httpClient = async (url: string, options: any = {}) => {
  const token = authService.getAccessToken();
  console.log("🔑 Making request to:", url, "with token:", token ? "Present" : "Missing");
  
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

// Create base data provider with custom response handling
const baseDataProvider: DataProvider = simpleRestProvider(apiUrl, httpClient);

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

  // Tours-specific methods
  getDailyEvents: (
    date: string,
    employeeId?: number,
  ) => Promise<{ data: any[] }>;
  optimizeTour: (employeeId: number, date: string) => Promise<void>;
  updateEventTimes: (
    eventId: number,
    times: { real_start?: string; real_end?: string },
  ) => Promise<any>;
  getToursByEmployee: (
    employeeId: number,
    date: string,
  ) => Promise<{ data: any }>;
}

export const dataProvider: MyDataProvider = {
  // Override all CRUD methods to handle Django array responses
  getOne: async (resource: string, params: any) => {
    console.log("🔍 Getting one for resource:", resource, "with params:", params);
    
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
    
    // Handle all other resources with direct FastAPI integration
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
      if (data && typeof data === 'object' && !data.data) {
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
            event_type: data.event_type || "GENERIC", // Add default if missing
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

  getMany: async (resource: string, params: GetManyParams): Promise<GetManyResult> => {
    console.log("🔍 Getting many for resource:", resource, "with params:", params);
    const { ids } = params;
    try {
      const responses = await Promise.all(
        ids.map((id: Identifier) => dataProvider.getOne(resource, { id }))
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
      return await baseDataProvider.create(resource, params);
    } catch (error: any) {
      console.error("❌ Error creating", resource, ":", error);
      throw error;
    }
  },

  update: async (resource: string, params: any) => {
    console.log("🔍 Updating for resource:", resource, "with params:", params);
    try {
      return await baseDataProvider.update(resource, params);
    } catch (error: any) {
      console.error("❌ Error updating", resource, ":", error);
      throw error;
    }
  },

  updateMany: async (resource: string, params: any) => {
    console.log("🔍 Updating many for resource:", resource, "with params:", params);
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
      return await baseDataProvider.delete(resource, params);
    } catch (error: any) {
      console.error("❌ Error deleting", resource, ":", error);
      throw error;
    }
  },

  deleteMany: async (resource: string, params: any) => {
    console.log("🔍 Deleting many for resource:", resource, "with params:", params);
    try {
      return await baseDataProvider.deleteMany(resource, params);
    } catch (error: any) {
      console.error("❌ Error deleting many", resource, ":", error);
      throw error;
    }
  },
  getList: async (
    resource: string,
    params: GetListParams,
  ): Promise<GetListResult> => {
    console.log("🔍 Getting list for resource:", resource, "with params:", params);

    // Extract common parameters at the beginning
    const { page, perPage } = params.pagination;
    const { field, order } = params.sort;
    const filter = params.filter || {};

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
          const response = await fetch(url, {
            headers: getAuthHeaders(),
          });
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
    }

    if (resource === "patients" && params.filter?.q) {
      const url = `${apiUrl}/patients/search?query=${encodeURIComponent(params.filter.q)}`;
      const response = await fetch(url, { headers: getAuthHeaders() });
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
        const today = new Date().toISOString().split('T')[0];
        const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        
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
        if (data && typeof data === 'object' && data.data && Array.isArray(data.data)) {
          console.log("✅ FastAPI employees response in correct React Admin format");
          return data;
        } else {
          console.error("❌ Unexpected employees response format:", data);
          throw new Error(`Expected React Admin format {data: [...], total: number} for employees`);
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
        
        if (data && typeof data === 'object' && data.data && Array.isArray(data.data)) {
          return data;
        } else if (Array.isArray(data)) {
          // Handle simple arrays for reference data like event-types/states
          return {
            data: data,
            total: data.length,
          };
        } else {
          console.error("❌ Unexpected event-types response format:", data);
          throw new Error(`Expected React Admin format {data: [...], total: number} for event-types`);
        }
      } catch (error: any) {
        console.error("❌ Error fetching event-types:", error);
        throw error;
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
        
        if (data && typeof data === 'object' && data.data && Array.isArray(data.data)) {
          return data;
        } else if (Array.isArray(data)) {
          // Handle simple arrays for reference data like event-types/states
          return {
            data: data,
            total: data.length,
          };
        } else {
          console.error("❌ Unexpected event-states response format:", data);
          throw new Error(`Expected React Admin format {data: [...], total: number} for event-states`);
        }
      } catch (error: any) {
        console.error("❌ Error fetching event-states:", error);
        throw error;
      }
    }

    // For all other standard resources, use direct fetch with FastAPI format
    console.log("🔧 Using direct fetch for standard resource:", resource);
    
    // Build the URL with React Admin query parameters
    
    // Convert React Admin params to simple query params that Django can understand
    const queryParams = new URLSearchParams();
    
    // Add pagination
    const start = (page - 1) * perPage;
    const end = page * perPage - 1;
    queryParams.set('_start', start.toString());
    queryParams.set('_end', (end + 1).toString()); // Django expects end to be exclusive
    
    // Add sorting
    if (field) {
      queryParams.set('_sort', field);
      queryParams.set('_order', order.toUpperCase());
    }
    
    // Add filters
    Object.keys(filter).forEach(key => {
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
      if (data && typeof data === 'object' && data.data && Array.isArray(data.data)) {
        console.log("✅ FastAPI response in correct React Admin format");
        return data;
      } else if (data && typeof data === 'object' && data.items && Array.isArray(data.items)) {
        // Handle paginated format: {items: [...], total: number, page: number, page_size: number}
        console.log("✅ Converting FastAPI paginated response to React Admin format");
        
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
            event_type: item.event_type || "GENERIC", // Add default if missing
            event_address: item.event_address || "", // Add default if missing
          }));
        }
        
        return {
          data: transformedItems,
          total: data.total,
        };
      } else {
        console.error("❌ Unexpected response format:", data);
        throw new Error(`Expected React Admin format {data: [...], total: number} for ${resource}`);
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
    console.log(" Fetching CNS care plan details from:", url);
    return fetch(url, {
      headers: getAuthHeaders(),
    }).then((response) => {
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
    return fetch(url, {
      headers: getAuthHeaders(),
    }).then((response) => {
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
      headers: getAuthHeaders(),
    };

    console.log(" Making API request...");
    const response = await fetch(url, options);
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
      headers: getAuthHeaders(),
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
      details.forEach((detail) => {
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


  // Tours-specific method implementations
  getDailyEvents: async (date: string, employeeId?: number) => {
    const params = new URLSearchParams({ date });
    if (employeeId) {
      params.append("employee_id", employeeId.toString());
    }

    const url = `${apiUrl}/events/daily?${params}`;
    const response = await fetch(url, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error("Failed to fetch daily events");
    }

    const data = await response.json();
    return { data };
  },

  optimizeTour: async (employeeId: number, date: string) => {
    const url = `${apiUrl}/tours/optimize`;
    const response = await fetch(url, {
      method: "POST",
      headers: getAuthHeaders(),
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
    const response = await fetch(url, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify(times),
    });

    if (!response.ok) {
      throw new Error("Failed to update event times");
    }

    return response.json();
  },

  getToursByEmployee: async (employeeId: number, date: string) => {
    const url = `${apiUrl}/tours?employee_id=${employeeId}&date=${date}`;
    const response = await fetch(url, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error("Failed to fetch tours");
    }

    const data = await response.json();
    return { data };
  },
};
