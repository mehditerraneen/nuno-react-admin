// Medical Prescriptions Types

export interface Physician {
  id: number;
  name: string;
  first_name: string;
  phone: string | null;
  email: string | null;
  specialty: string | null;
  address: string | null;
}

export interface Prescription {
  id: number;
  patient_id: number;
  patient_name?: string;
  patient_first_name?: string;
  prescriptor_id: number;
  prescriptor_name?: string;
  prescriptor_first_name?: string;
  prescriptor_specialty?: string;
  date: string;
  end_date: string | null;
  note: string | null;
  file: string | null;
  file_name: string | null;
  file_thumbnail: string | null;
  md5hash: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface PrescriptionListItem {
  id: number;
  patient_id: number;
  patient_name: string;
  patient_first_name: string;
  prescriptor_id: number;
  prescriptor_name: string;
  prescriptor_first_name: string;
  prescriptor_specialty: string | null;
  date: string;
  end_date: string | null;
  has_file: boolean;
  note: string | null;
}

export interface PrescriptionCreate {
  patient_id: number;
  prescriptor_id: number;
  date: string;
  end_date: string | null;
  note: string | null;
}

export interface PrescriptionUpdate {
  prescriptor_id?: number;
  date?: string;
  end_date?: string | null;
  note?: string | null;
}

export interface PrescriptionStats {
  total_prescriptions: number;
  active_prescriptions: number;
  prescriptions_with_files: number;
  top_prescriptors: Array<{
    prescriptor_id: number;
    prescriptor_name: string;
    prescription_count: number;
  }>;
}

export interface FileUploadResponse {
  id: number;
  file: string;
  file_name: string;
  file_thumbnail: string | null;
  md5hash: string;
}
