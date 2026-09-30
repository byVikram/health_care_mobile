import ApiService from "../../services/apiService";
import { API_ENDPOINTS } from "../../constants/apiUrls";

export interface PatientDetails {
  id: string;
  patient_public_id: string;
  name: string;
  age: number;
  gender: string;
  phone: string;
  email: string;
  avatar?: string;
  avatar_s3_key?: string | null;
  date_of_birth: string;
  marital_status: string;
  weight: string;
  height: string;
  blood_group: string;
  address: string;
  occupation: string;
  location: string;
  emergency_contact: {
    name: string;
    relation: string;
    number: string;
  };
  chronic_diseases: string[];
  allergies: string[];
  smoking_status: string;
  alcohol_consumption: string;
  diet_type: string;
  activity_level?: string;
  sleep_hours?: string;
  current_medications?: string;
  past_surgeries?: string;
  family_history?: string;
}

export interface DocterDetails {
  
  name: string;
  degree: string;
  specialization: string;
  clinicName: string;
  clinicAddress: string;
}
/**
 * API response shape:
 * {
 *   id: "pat-pub-...",
 *   personal: { name, contact_number, email, gender, date_of_birth, ... },
 *   medical:  { allergies, chronic_conditions, current_medications, ... },
 *   lifestyle:{ smoking_status, alcohol_consumption, diet_type, ... }
 * }
 */
function unwrapPatient(response: any): PatientDetails {
  // Step 1: unwrap common API envelopes
  const raw =
    response?.data?.data ??
    response?.data?.patient ??
    response?.data ??
    response?.patient ??
    response;

  // Step 2: extract nested sections
  const personal = raw?.personal ?? {};
  const medical = raw?.medical ?? {};
  const lifestyle = raw?.lifestyle ?? {};

  // Step 3: parse allergies — API returns a comma-separated string
  const parseList = (val: any): string[] => {
    if (!val) return [];

    if (Array.isArray(val)) {
      return val;
    }

    if (typeof val === "string") {
      return val
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }

    return [];
  };

  return {
    id: raw?.id ?? "",
    patient_public_id: raw?.id ?? raw?.patient_public_id ?? "",

    // personal
    name: personal?.name ?? "",
    phone: personal?.contact_number ?? "",
    email: personal?.email ?? "",
    gender: personal?.gender ?? "",
    date_of_birth: personal?.date_of_birth ?? "",
    blood_group: personal?.blood_group ?? "",
    marital_status: personal?.marital_status ?? "",
    height: personal?.height ? `${personal.height} cm` : "",
    weight: personal?.weight ? `${personal.weight} kg` : "",
    location: personal?.location ?? "",
    address: personal?.location ?? "",
    avatar: personal?.avatar ?? personal?.avatar_s3_key ?? undefined,
    avatar_s3_key: personal?.avatar_s3_key ?? null,
    emergency_contact: {
      name: personal?.emergency_contact?.name ?? "",
      relation: personal?.emergency_contact?.relation ?? "",
      number: personal?.emergency_contact?.number ?? "",
    },

    // medical — allergies & chronic_conditions come as comma strings
    allergies: parseList(medical?.allergies),
    chronic_diseases: parseList(medical?.chronic_conditions),
    current_medications: medical?.current_medications ?? "",
    past_surgeries: medical?.past_surgeries ?? "",
    family_history: medical?.family_history ?? "",

    // lifestyle
    smoking_status: lifestyle?.smoking_status ?? "",
    alcohol_consumption: lifestyle?.alcohol_consumption ?? "",
    diet_type: lifestyle?.diet_type ?? "",
    activity_level: lifestyle?.activity_level ?? "",
    sleep_hours: lifestyle?.sleep_hours ? String(lifestyle.sleep_hours) : "",

    // not in API yet — keep empty
    occupation: "",
    age: raw?.age ?? 0,
  };
}

export interface TreatmentRecord {
  id: string;
  appointment_id: number;
  vitals?: Record<string, any> | null;
  notes?: string | null;
  prescription_s3_key?: string | null;
  follow_up_date?: string | null;
  created_at: string;
  doctor_name?: string;
  hospital_name?: string;
}

export interface LaboratoryReportRecord {
  id: number;
  public_id: string;
  booking_id: number;
  patient_id: number;
  report_pdf_s3_key: string;
  result_values?: Record<string, any> | null;
  report_images_s3_keys?: string[] | null;
  summary_findings?: string | null;
  uploaded_at: string;
}

export interface RadiologyReportRecord {
  id: number;
  public_id: string;
  booking_id: number;
  patient_id: number;
  report_pdf_s3_key: string;
  dicom_images_s3_keys?: string[] | null;
  scan_images_s3_keys?: string[] | null;
  summary_findings?: string | null;
  uploaded_at: string;
}

export const patientService = {
  getPatientDetails: async (
    patientPublicId: string,
  ): Promise<PatientDetails> => {
    try {
      const response = await ApiService.get(
        API_ENDPOINTS.PATIENT.GET_BY_PUBLIC_ID(patientPublicId),
      );
      console.log("API response:", response);

      const patient = unwrapPatient(response);

      return patient;
    } catch (err: any) {
      console.error("[patientService] error:", err);
      throw err;
    }
  },

  getPatientTreatmentHistory: async (
    patientPublicId: string,
  ): Promise<TreatmentRecord[]> => {
    try {
      const response = await ApiService.get<{ success: boolean; data: TreatmentRecord[] }>(
        API_ENDPOINTS.PATIENT.TREATMENT_HISTORY(patientPublicId)
      );
      return response.data?.data ?? [];
    } catch (err: any) {
      console.error("[patientService.getPatientTreatmentHistory] error:", err);
      throw err;
    }
  },

  getPatientLaboratoryReports: async (
    patientPublicId: string,
  ): Promise<LaboratoryReportRecord[]> => {
    try {
      const response = await ApiService.get<{ success: boolean; data: LaboratoryReportRecord[] }>(
        API_ENDPOINTS.PATIENT.LABORATORY_REPORTS(patientPublicId)
      );
      return response.data?.data ?? [];
    } catch (err: any) {
      console.error("[patientService.getPatientLaboratoryReports] error:", err);
      throw err;
    }
  },

  getPatientRadiologyReports: async (
    patientPublicId: string,
  ): Promise<RadiologyReportRecord[]> => {
    try {
      const response = await ApiService.get<{ success: boolean; data: RadiologyReportRecord[] }>(
        API_ENDPOINTS.PATIENT.RADIOLOGY_REPORTS(patientPublicId)
      );
      return response.data?.data ?? [];
    } catch (err: any) {
      console.error("[patientService.getPatientRadiologyReports] error:", err);
      throw err;
    }
  },
};

export interface TreatmentSavePayload {
  vitals?: Record<string, any> | null;
  notes?: string | null;
  prescription_s3_key?: string | null;
  follow_up_date?: string | null; // "YYYY-MM-DD"
}

export const treatmentService = {
  getByAppointment: async (appointmentId: string): Promise<TreatmentRecord | null> => {
    try {
      const response = await ApiService.get<{ success: boolean; data: TreatmentRecord }>(
        API_ENDPOINTS.TREATMENTS.BY_APPOINTMENT(appointmentId),
      );
      return response.data?.data ?? null;
    } catch (err: any) {
      if (err?.response?.status === 404) return null;
      throw err;
    }
  },

  // Creates the treatment record if none exists yet for this appointment, otherwise updates
  // the existing one -- the backend rejects a second create with 409 Conflict (one treatment
  // record per appointment), so the caller always wants "save these fields" either way.
  save: async (appointmentId: string, payload: TreatmentSavePayload): Promise<TreatmentRecord> => {
    const existing = await treatmentService.getByAppointment(appointmentId);
    if (existing) {
      const response = await ApiService.patch<{ success: boolean; data: TreatmentRecord }>(
        API_ENDPOINTS.TREATMENTS.BY_APPOINTMENT(appointmentId),
        payload,
      );
      return response.data.data;
    }
    const response = await ApiService.post<{ success: boolean; data: TreatmentRecord }>(
      API_ENDPOINTS.TREATMENTS.CREATE,
      { appointment_id: appointmentId, ...payload },
    );
    return response.data.data;
  },
};

export const doctorService = {
  getDoctorDetails: async (doctorId: string): Promise<DocterDetails> => {
    try {
      // Use the doctorId parameter in the API call
      const response = await ApiService.get(
        `${API_ENDPOINTS.DOCTOR_PROFILE.DETAILS}/${doctorId}` // Pass doctorId to the endpoint
      );  
      return (response as any).data.data;
    } catch (err: any) {
      console.error("[doctorService] error:", err);
      throw err;
    }
  },

  updateDoctorProfile: async (profileData: any) => {
    try {
      const response = await ApiService.patch(
        `${API_ENDPOINTS.DOCTOR_PROFILE.PROFESSIONAL_DETAILS}`,
        profileData,
      );
      return response.data;
    } catch (err: any) {
      console.error("[doctorService] error:", err);
      throw err;
    }
  },
};
