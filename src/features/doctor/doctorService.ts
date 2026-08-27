// src/features/doctor/doctorService.ts
import ApiService from '../../services/apiService'

import { API_ENDPOINTS } from '../../constants/apiUrls'
import { AppointmentsResponse } from '../../types/appointment'
import { DoctorSearchResponse } from '../../types/doctor-search'
import { DoctorDetailResponse } from '../../types/doctor-detail'
import { SpecialitiesResponse, SymptomsResponse } from '../../types/speciality'
import { DoctorProfileApiResponse, DoctorProfileApiData } from '../../types/doctor-profile-api'
import { DoctorProfile, DoctorDegree } from '../../types/doctor-profile'

export interface TimeSlot {
	id?: string | number
	start_time: string
	end_time: string
	status: 'AVAILABLE' | 'BOOKED' | 'UNAVAILABLE' | 'BLOCKED' | 'OCCUPIED' | ''
	can_toggle?: boolean
	is_enabled?: boolean
	is_booked?: boolean
}
// Add this to doctorService.ts
export interface Appointment {
	id: string
	appointment_date: string
	doctor_name?: string
	patient_name?: string
	status?: string
	time?: string
	notes?: string
}

export interface SlotGroup {
	label: string
	period?: string
	range?: string
	slots: TimeSlot[]
}

export interface AppointmentParams {
	page?: number
	limit?: number
	appointment_date?: string
	status?: string
	variant?: 'upcoming' | 'all'
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
	appointment_mode: 'offline' | 'online' | 'clinic_visit' | 'video_call'
	appointment_date: string
	start_time: string
	end_time?: string
	referral_id?: string
	consent_version_id?: string
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

export interface PreIntakePayload {
	symptoms: string
	duration?: string
	severity?: 'mild' | 'moderate' | 'severe' | ''
}

export const updatePreIntake = async (appointmentId: string, payload: PreIntakePayload) => {
	console.log('PRE_INTAKE URL =>', API_ENDPOINTS.APPOINTMENTS.PRE_INTAKE(appointmentId))
	const res = await ApiService.patch(API_ENDPOINTS.APPOINTMENTS.PRE_INTAKE(appointmentId), payload)
	return res.data
}

export const updateAppointmentsStatus = async (
	appointmentId: string,
	statusId: string,
	reason?: string
): Promise<AppointmentResponse> => {
	console.log('PAYLOAD 👉', {
		appointment_id: appointmentId,
		status_id: statusId,
		...(reason ? { reason } : {}),
	})

	const res = await ApiService.patch<AppointmentResponse>(API_ENDPOINTS.APPOINTMENTS.UPDATE, {
		appointment_id: appointmentId,
		status_id: statusId,
		...(reason ? { reason } : {}),
	})

	console.log('RESPONSE 👉', res.data)

	return res.data
}


export interface RescheduleAppointmentPayload {
	appointment_id: string
	appointment_date: string
	start_time: string
	end_time: string | null
	hospital_id?: string
	reason?: string

	status_id?: string // 👈 ADD THIS
}

export const rescheduleAppointment = async (payload: RescheduleAppointmentPayload): Promise<AppointmentResponse> => {
	const res = await ApiService.post<AppointmentResponse>(API_ENDPOINTS.APPOINTMENTS.RESCHEDULE, payload)
	return res.data
}
export const startConsultation = async (appointmentId: string): Promise<{ success: boolean }> => {
	const res = await ApiService.post<{ success: boolean }>(
		`${API_ENDPOINTS.APPOINTMENTS.GET_BY_ID(appointmentId)}/start-consultation`,
		{}
	)
	return res.data
}

export const getAppointments = async (params?: AppointmentParams): Promise<AppointmentsResponse> => {
	const res = await ApiService.getWithParams<AppointmentsResponse>(
		API_ENDPOINTS.APPOINTMENTS.GET,
		(params ?? {}) as Record<string, unknown>
	)
	return res.data
}

export interface ActiveConsentResponse {
	success: boolean
	data: {
		id: string
		version: string
		content: { points: string[] } | string
		is_active: boolean
	}
}

export const getActiveConsent = async (): Promise<ActiveConsentResponse['data']> => {
	const res = await ApiService.get<ActiveConsentResponse>(API_ENDPOINTS.APPOINTMENTS.ACTIVE_CONSENT)
	return res.data.data
}

export interface DoctorStatusResponse {
	success: boolean
	data: {
		profile_completed: boolean
		is_verified: boolean
	}
}

export const getDoctorStatus = async (): Promise<DoctorStatusResponse['data']> => {
	const res = await ApiService.get<DoctorStatusResponse>(API_ENDPOINTS.DOCTOR_PROFILE.STATUS)
	return res.data.data
}

export const createAppointment = async (payload: CreateAppointmentPayload): Promise<CreateAppointmentResponse> => {
	console.log('[createAppointment][RN] request', {
		url: API_ENDPOINTS.APPOINTMENTS.CREATE,
		payload,

		webComparison:
			'React web booking uses axios interceptor with localStorage access_token and sends Authorization: Bearer <access_token>.',
	})

	const res = await ApiService.post<CreateAppointmentResponse>(API_ENDPOINTS.APPOINTMENTS.CREATE, payload)

	console.log('[createAppointment][RN] response', {
		status: res.status,
		requestHeaders: res.config?.headers,
		data: res.data,
	})

	return res.data
}
export const getDoctors = async (params?: DoctorSearchParams): Promise<DoctorSearchResponse> => {
	const res = await ApiService.getWithParams<DoctorSearchResponse>(
		API_ENDPOINTS.DOCTORS.SEARCH,
		(params ?? {}) as Record<string, unknown>
	)

	console.log('DOCTORS RESPONSE:', JSON.stringify(res.data, null, 2))

	return res.data
}

export interface FavouriteDoctor {
	id: string
	name: string
	is_verified: boolean
	avatar_s3_key: string | null
	location: string | null
	experience_years: number | null
	specialities: string[]
}

export interface FavouritesResponse {
	success: boolean
	message: string
	data: {
		favourites: FavouriteDoctor[]
		favourite_ids: string[]
	}
}

export interface ToggleFavouriteResponse {
	success?: boolean
	message?: string
	data?: {
		action?: 'added' | 'removed'
		favourite_ids?: string[]
		favourites?: FavouriteDoctor[]
	}
}

export const getFavouriteDoctors = async (): Promise<FavouritesResponse> => {
	const res = await ApiService.get<FavouritesResponse>(API_ENDPOINTS.DOCTORS_FAVOURITES.GET)
	return res.data
}

export const toggleFavouriteDoctor = async (publicId: string): Promise<ToggleFavouriteResponse> => {
	const res = await ApiService.post<ToggleFavouriteResponse>(API_ENDPOINTS.DOCTORS_FAVOURITES.TOGGLE(publicId), {})
	return res.data
}

export interface AvailabilityResponse {
	success?: boolean
	message?: string
	data?: any[]
}

export const getDoctorAvailability = async (params: {
	doctor_id?: string
	hospital_id: number | string
	date: string
	location?: string
}): Promise<SlotGroup[] | AvailabilityResponse> => {
	const res = await ApiService.getWithParams<SlotGroup[] | AvailabilityResponse>(
		API_ENDPOINTS.DOCTORS.AVAILABILITY,
		params as Record<string, unknown>
	)
	return res.data
}

export interface SlotOverridePayload {
	hospital_id?: string | null
	date: string
	start_time: string
	end_time: string
	is_blocked: boolean
	reason?: string
}

export interface SlotOverrideBatchPayload {
	hospital_id?: string | number | null
	date: string
	slots: Array<{
		start_time: string
		end_time: string
		is_blocked: boolean
	}>
	appointment_mode?: 'clinic_visit' | 'video_call'
	reason?: string
}

export interface SlotOverrideResponse {
	success: boolean
	message: string
}

export const createSlotOverrideBatch = async (payload: SlotOverrideBatchPayload): Promise<SlotOverrideResponse> => {
	const res = await ApiService.post<SlotOverrideResponse>(API_ENDPOINTS.DOCTORS.OVERRIDES, payload)
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

export const getSymptoms = async (): Promise<SymptomsResponse> => {
	const res = await ApiService.get<SymptomsResponse>(API_ENDPOINTS.SPECIALITIES.SYMPTOMS)
	return res.data
}

export const getAreasOfExpertise = async (): Promise<any> => {
	const res = await ApiService.get<any>(API_ENDPOINTS.AREA_OF_EXPERTISE.LIST)
	return res.data
}

export const getTreatmentsOffering = async (): Promise<any> => {
	const res = await ApiService.get<any>(API_ENDPOINTS.TREATMENTS_OFFERING.LIST)
	return res.data
}

export const createHospital = async (data: Record<string, unknown>) => {
	const res = await ApiService.post(API_ENDPOINTS.DOCTOR_PROFILE.HOSPITALS, data)
	return res.data
}

export const updateHospital = async (hospitalId: string, data: Record<string, unknown>) => {
	const res = await ApiService.patch(`${API_ENDPOINTS.DOCTOR_PROFILE.HOSPITALS}/${hospitalId}`, data)
	return res.data
}

export const deleteHospital = async (hospitalId: string) => {
	const res = await ApiService.delete(`${API_ENDPOINTS.DOCTOR_PROFILE.HOSPITALS}/${hospitalId}`)
	return res.data
}

export interface DoctorAchievementPayload {
	title: string
	category: string
	description: string
	organization: string
	date_awarded: string
	image?: string | null
	document_url?: string | null
	is_public: boolean
}

export interface DoctorAchievement {
	id: string
	title: string
	category: string
	description: string
	organization: string
	date: string
	image: string | null
	isPublic: boolean
}

export const mapDoctorAchievementApi = (item: any): DoctorAchievement => ({
	id: String(item?.id ?? item?.achievement_id ?? Date.now()),
	title: item?.title ?? '',
	category: item?.category ?? '',
	description: item?.description ?? '',
	organization: item?.organization ?? item?.issuing_organization ?? item?.hospital ?? '',
	date: item?.date_awarded ?? item?.awarded_on ?? item?.date ?? '',
	image: item?.image ?? item?.image_url ?? item?.document_url ?? item?.verification_document_s3_key ?? null,
	isPublic: item?.is_public ?? item?.isPublic ?? true,
})

export const getDoctorAchievements = async (): Promise<DoctorAchievement[]> => {
	const res = await ApiService.get<any>(API_ENDPOINTS.DOCTOR_PROFILE.ACHIEVEMENTS)
	const raw = res.data?.data?.achievements ?? res.data?.data ?? res.data?.achievements ?? []
	return Array.isArray(raw) ? raw.map(mapDoctorAchievementApi) : []
}

export const createDoctorAchievement = async (data: DoctorAchievementPayload) => {
	const res = await ApiService.post(API_ENDPOINTS.DOCTOR_PROFILE.ACHIEVEMENTS, data)
	return res.data
}

export const updateDoctorAchievement = async (achievementId: string, data: DoctorAchievementPayload) => {
	const res = await ApiService.patch(`${API_ENDPOINTS.DOCTOR_PROFILE.ACHIEVEMENTS}/${achievementId}`, data)
	return res.data
}

export interface DoctorPersonalUpdatePayload {
	name: string
	avatar_s3_key: string | null
	gender: string
	date_of_birth: string
	location: string
	languages: string[]
	mobile_number: string
	email: string
	experience_years: number
}

export interface DoctorProfessionalUpdatePayload {
	experience_years: number
	degree?: string
	college?: string
	year_of_passing?: string
	qualification_proof_s3_key?: string | null
	registration_number: string
	registration_proof_s3_key: string | null
	about: string
	current_designation?: string
}

export interface DoctorAdditionalDetailsUpdatePayload {
	areas_of_expertise?: string[]
	treatments?: string[]
}

export interface DoctorDegreeUpdatePayload {
	degree: string
	specialization: string | null
	college: string
	year_of_passing: string
	qualification_proof_s3_key: string | null
}

export interface DoctorEducationalQualificationsUpdatePayload {
	degrees: DoctorDegreeUpdatePayload[]
}

export interface DoctorAvailabilityUpdatePayload {
	hospital_id: number | string
	day_of_week: number
	appointment_mode: 'clinic_visit' | 'video_call'
	slots: Array<{
		start_time: string
		end_time: string
		slot_duration: number
		buffer_time: number
	}>
	is_active: boolean
}

export const updateDoctorPersonalDetails = async (data: DoctorPersonalUpdatePayload) => {
	const url = API_ENDPOINTS.DOCTOR_PROFILE.PERSONAL_DETAILS
	console.log('[updateDoctorPersonalDetails] request:', {
		method: 'PATCH',
		url,
		payload: data,
	})

	try {
		const res = await ApiService.patch(url, data)
		console.log('[updateDoctorPersonalDetails] response:', {
			status: res.status,
			url: res.config?.url,
			method: res.config?.method,
			data: res.data,
		})
		return res.data
	} catch (error: any) {
		console.log('[updateDoctorPersonalDetails] error:', {
			status: error?.response?.status,
			url: error?.config?.url,
			method: error?.config?.method,
			data: error?.response?.data,
			message: error?.message,
		})
		throw error
	}
}

export const updateDoctorProfessionalDetails = async (data: DoctorProfessionalUpdatePayload) => {
	const res = await ApiService.patch(API_ENDPOINTS.DOCTOR_PROFILE.PROFESSIONAL_DETAILS, data)
	return res.data
}

export const updateDoctorAdditionalDetails = async (data: DoctorAdditionalDetailsUpdatePayload) => {
	const res = await ApiService.patch(API_ENDPOINTS.DOCTOR_PROFILE.ADDITIONAL_DETAILS, data)
	return res.data
}

export const updateDoctorEducationalQualifications = async (data: DoctorEducationalQualificationsUpdatePayload) => {
	const res = await ApiService.patch(API_ENDPOINTS.DOCTOR_PROFILE.PROFESSIONAL_DETAILS, data)
	return res.data
}

export const updateDoctorAvailability = async (data: DoctorAvailabilityUpdatePayload) => {
	const res = await ApiService.patch(API_ENDPOINTS.DOCTORS.AVAILABILITY, data)
	return res.data
}

// -- Doctor profile -------------------------------------------------------------
export const getDoctorProfile = async (): Promise<DoctorProfileApiResponse> => {
	try {
		const res = await ApiService.get<DoctorProfileApiResponse>(API_ENDPOINTS.DOCTOR_PROFILE.DETAILS)
		console.log('[getDoctorProfile] API response:', res.data)
		return res.data
	} catch (error: any) {
		console.log('[getDoctorProfile] API error:', {
			status: error?.response?.status,
			data: error?.response?.data,
			message: error?.message,
		})
		throw error
	}
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
	;(data.availability ?? []).forEach((slot) => {
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
	const hospitals: DoctorProfile['hospitals'] = (data.hospitals ?? []).map((h) => ({
		id: h.id,
		hospital_id: h.hospital?.id ?? h.id,
		name: h.hospital?.name ?? '',
		location: h.hospital?.address ?? '',
		fullAddress: h.hospital?.address ?? '',
		isPrimary: h.is_primary ?? false,
		phone_number: h.hospital?.contact_number ?? '',
		video_consultation_fee: h.video_consultation_fee ?? '',
		offline_consultation_fee: h.offline_consultation_fee ?? '',
	}))

	const pd = data.personal_details
	const prof = data.professional_details

	return {
		id: '',
		specialization: prof?.specialities?.[0]?.label ?? '',
		personal: {
			name: pd?.name ?? '',
			contactNumber: '',
			contactVerified: false,
			email: pd?.email ?? '',
			emailVerified: false,
			gender: pd?.gender ?? '',
			dateOfBirth: pd?.date_of_birth ?? '',
			location: pd?.location ?? '',
			avatar: pd?.avatar_s3_key ?? '',
			experience: String(prof?.experience_years ?? ''),
			languages: pd?.languages ?? [],
		},
		professional: {
			specialization_id: prof?.specialities?.[0]?.id ?? '',
			specialization_label: prof?.specialities?.[0]?.label ?? '',
			degree: prof?.degree ?? '',
			college: prof?.college ?? '',
			yearOfPassing: prof?.year_of_passing ?? '',
			qualificationProof: prof?.qualification_proof_s3_key ?? '',
			degrees: Array.isArray(prof?.degrees)
				? prof.degrees.map((d) => ({
						id: d.id,
						degree: d.degree,
						specialization: d.specialization || '',
						college: d.college,
						yearOfPassing: d.year_of_passing,
						qualificationProof: d.qualification_proof_s3_key || '',
					}))
				: [],
			registrationNumber: prof?.registration_number ?? '',
			registrationProof: prof?.registration_proof_s3_key ?? '',
			about: prof?.about ?? '',
			currentDesignation: prof?.current_designation ?? '',
			areasOfExpertise: (data.additionalDetail?.areas_of_expertise ?? []).map((a: any) => a.id ?? a.public_id ?? a),
			treatments: (data.additionalDetail?.treatments ?? []).map((t: any) => t.id ?? t.public_id ?? t),
		},
		hospitals,
		availability,
	}
}
