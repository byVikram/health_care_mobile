// src/features/doctor/doctorService.ts
import ApiService from '../../services/apiService'
import { API_ENDPOINTS } from '../../constants/apiUrls'
import { AppointmentsResponse } from '../../types/appointment'
import { DoctorSearchResponse } from '../../types/doctor-search'
import { DoctorDetailResponse } from '../../types/doctor-detail'
import { SpecialitiesResponse } from '../../types/speciality'
import { DoctorProfileApiResponse, DoctorProfileApiData } from '../../types/doctor-profile-api'
import { DoctorProfile } from '../../types/doctor-profile'

export interface TimeSlot {
	id: string | number
	start_time: string
	end_time: string
	status: 'AVAILABLE' | 'BOOKED' | 'UNAVAILABLE'
}
// Add this to doctorService.ts
export interface Appointment {
    id: string;
    appointment_date: string;
    doctor_name?: string;
    patient_name?: string;
    status?: string;
    time?: string;
    notes?: string;
}

export interface SlotGroup {
	label: string
	period: string
	slots: TimeSlot[]
}

export interface AppointmentParams {
	page?: number
	limit?: number
	appointment_date?: string
	status?: string
}

export interface DoctorSearchParams {
	page?: number
	limit?: number
	search?: string
	speciality_id?: string
	consultation_type?: 'clinic' | 'video' | 'all'
	min_rating?: number
	max_price?: number
	sort?: string
}

export interface CreateAppointmentPayload {
	doctor_id: string
	hospital_id?: string
	appointment_mode: 'offline' | 'online'
	appointment_date: string
	appointment_time: string
}

export interface CreateAppointmentResponse {
	success: boolean
	message: string
	data?: unknown
}


export interface AppointmentResponse {
    success: boolean
    message: string
    // data: Appointment
}


export const updateAppointmentsStatus = async (appointmentId: string, statusId: string): Promise<AppointmentResponse> => {
    const res = await ApiService.patch<AppointmentResponse>(API_ENDPOINTS.APPOINTMENTS.UPDATE, {
        appointment_id: appointmentId,
        status_id:statusId
    })
    return res.data
}

export interface RescheduleAppointmentPayload {
	appointment_id: string
	appointment_date: string
	start_time: string
	end_time: string | null
	hospital_id?: string
	reason?: string
}

export const rescheduleAppointment = async (
	payload: RescheduleAppointmentPayload
): Promise<AppointmentResponse> => {
	const res = await ApiService.post<AppointmentResponse>(API_ENDPOINTS.APPOINTMENTS.RESCHEDULE, payload)
	return res.data
}

export const getAppointments = async (params?: AppointmentParams): Promise<AppointmentsResponse> => {
	const res = await ApiService.getWithParams<AppointmentsResponse>(
		API_ENDPOINTS.APPOINTMENTS.GET,
		(params ?? {}) as Record<string, unknown>
	)
	return res.data
}

export const createAppointment = async (
	payload: CreateAppointmentPayload
): Promise<CreateAppointmentResponse> => {
	const res = await ApiService.post<CreateAppointmentResponse>(API_ENDPOINTS.APPOINTMENTS.CREATE, payload)
	return res.data
}

export const getDoctors = async (params?: DoctorSearchParams): Promise<DoctorSearchResponse> => {
	const res = await ApiService.getWithParams<DoctorSearchResponse>(
		API_ENDPOINTS.DOCTORS.SEARCH,
		(params ?? {}) as Record<string, unknown>
	)
	return res.data
}

export interface AvailabilityResponse {
	data?: SlotGroup[]
}

export const getDoctorAvailability = async (params: {
	doctor_id?: string
	hospital_id: number | string
	date: string
}): Promise<SlotGroup[] | AvailabilityResponse> => {
	const res = await ApiService.getWithParams<SlotGroup[] | AvailabilityResponse>(
		API_ENDPOINTS.DOCTORS.AVAILABILITY,
		params as Record<string, unknown>
	)
	return res.data
}

export const getDoctorById = async (id: string): Promise<DoctorDetailResponse> => {
	const res = await ApiService.get<DoctorDetailResponse>(API_ENDPOINTS.DOCTORS.DETAIL(id))
	return res.data
}

export const getSpecialities = async (): Promise<SpecialitiesResponse> => {
	const res = await ApiService.get<SpecialitiesResponse>(API_ENDPOINTS.SPECIALITIES.LIST)
	return res.data
}

// -- Doctor profile -------------------------------------------------------------
export const getDoctorProfile = async (): Promise<DoctorProfileApiResponse> => {
	const res = await ApiService.get<DoctorProfileApiResponse>(API_ENDPOINTS.DOCTOR_PROFILE.DETAILS)
	return res.data
}

// Maps API response ? DoctorProfile (used by DoctorProfilePage)
const DAY_MAP: Record<number, keyof DoctorProfile['availability']> = {
	0: 'sunday',
	1: 'monday',
	2: 'tuesday',
	3: 'wednesday',
	4: 'thursday',
	5: 'friday',
	6: 'saturday',
}

export const mapDoctorProfileApi = (data: DoctorProfileApiData): DoctorProfile => {
	// Build availability: day_of_week ? slot_time[]
	const availability: DoctorProfile['availability'] = {
		sunday: [],
		monday: [],
		tuesday: [],
		wednesday: [],
		thursday: [],
		friday: [],
		saturday: [],
	}
	data.availability.forEach((slot) => {
		const dayKey = DAY_MAP[slot.day_of_week]
		if (dayKey && slot.is_active) {
			// Convert "09:00" ? "09:00AM" format
			const [h, m] = slot.slot_time.split(':').map(Number)
			const suffix = h >= 12 ? 'PM' : 'AM'
			const hour = h > 12 ? h - 12 : h === 0 ? 12 : h
			const timeStr = `${String(hour).padStart(2, '0')}:${String(m).padStart(2, '0')}${suffix}`
			availability[dayKey].push(timeStr)
		}
	})

	// Build hospitals
	const hospitals: DoctorProfile['hospitals'] = data.hospitals.map((h) => ({
		id: h.id,
		name: h.hospital.name,
		location: h.hospital.address,
		fullAddress: h.hospital.address,
		isPrimary: h.is_primary,
	}))

	const pd = data.personal_details
	const prof = data.professional_details

	return {
		id: '',
		specialization: prof.specialities?.[0]?.label ?? '',
		personal: {
			name: pd.name,
			contactNumber: '',
			contactVerified: false,
			email: pd.email,
			emailVerified: false,
			gender: pd.gender,
			dateOfBirth: pd.date_of_birth,
			location: pd.location,
			avatar: pd.avatar_s3_key ?? '',
			experience: String(prof.experience_years),
			languages: pd.languages,
		},
		professional: {
			specialization_id: prof.specialities?.[0]?.id ?? '',
			specialization_label: prof.specialities?.[0]?.label ?? '',
			degree: prof.degree,
			college: prof.college,
			yearOfPassing: prof.year_of_passing,
			qualificationProof: prof.qualification_proof_s3_key ?? '',
			registrationNumber: prof.registration_number,
			registrationProof: prof.registration_proof_s3_key ?? '',
			about: prof.about,
		},
		hospitals,
		availability,
	}
}
