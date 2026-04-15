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
  const parseList = (val?: string): string[] => {
    if (!val || !val.trim()) return [];
    return val
      .split(",")
      .map((s: string) => s.trim())
      .filter(Boolean);
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

export const patientService = {
  getPatientDetails: async (
    patientPublicId: string,
  ): Promise<PatientDetails> => {
    try {
      const response = await ApiService.get(
        API_ENDPOINTS.PATIENT.GET_BY_PUBLIC_ID(patientPublicId),
      );

      const patient = unwrapPatient(response);

      return patient;
    } catch (err: any) {
      console.error("[patientService] error:", err);
      throw err;
    }
  },
};
