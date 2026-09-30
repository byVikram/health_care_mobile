import type { NavigatorScreenParams } from '@react-navigation/native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs'
import { ROUTES } from './routes'

import type { DoctorDetailData } from '../types/doctor-detail'
import type { LabBookingDraft } from '../features/laboratory/types'

export type RoleParams = {
	roleId: string
	roleLabel: string
	specialty?: string
}

export type AuthStackParamList = {
	[ROUTES.AUTH.LOGIN]: undefined
	[ROUTES.AUTH.ROLE_SELECTION]: undefined
	[ROUTES.AUTH.SPECIALTY_SELECTION]: RoleParams | undefined
	[ROUTES.AUTH.ONBOARDING]: RoleParams | undefined
	[ROUTES.AUTH.REGISTER]: RoleParams | undefined
}

export type BookingsFilterKey = 'doctor' | 'ancillary' | 'lab' | 'medicine' | 'radiology'

export type MainTabParamList = {
	[ROUTES.MAIN.HOME]: undefined
	[ROUTES.MAIN.SEARCH]:
		| {
				mode?: 'clinic' | 'video'
		  }
		| undefined
	[ROUTES.MAIN.PORTAL]: { filter?: BookingsFilterKey } | undefined
	[ROUTES.MAIN.PROFILE]: undefined
	[ROUTES.MAIN.WALLET]: undefined
	[ROUTES.MAIN.ANCILLARY]: undefined
}

export type ConsultationParams = {
	appointmentId?: string
	appointment_id?: string
	id?: string
	patientId?: string
	patient_id?: string
	doctorID?: string
	doctor_id?: string
	patient?: Record<string, unknown>
	doctor?: Record<string, unknown>
	appointment?: Record<string, unknown>
}

export type PatientPaymentParams = {
	doctor: DoctorDetailData
	hospitalId: string
	hospitalName: string
	appointmentDate: string
	appointmentDateDisplay: string
	startTime: string
	startTimeDisplay: string
	appointmentMode: 'offline' | 'online'
	consultationTypeLabel: string
	fee: number
	referralId?: string
	consentVersionId: string
	/** Family member (patient public id) the appointment is booked for; omitted = self */
	patientId?: string
	patientName?: string
	patientRelation?: string
	/** Optional "Reason for visit" typed on the slot step; prefills pre-intake symptoms */
	reasonForVisit?: string
}

export type DoctorBookSlotParams = {
	doctor: DoctorDetailData
	hospitalId?: string
	mode?: 'clinic' | 'video'
	referralId?: string
}

export type AppointmentConfirmedParams = {
	appointmentId: string
	doctorName: string
	doctorAvatar?: string | null
	doctorSpecialty?: string
	appointmentMode: 'clinic_visit' | 'video_call'
	dateDisplay: string
	timeDisplay: string
	hospitalName: string
	hospitalAddress?: string
	patientName: string
	fee: number
	paymentMethodLabel: string
}

/** A service in the home-care cart (procedure or package), as shown on the booking screens. */
export type AncillaryCartItem = {
	id: string // procedure public id, or package public id when kind === 'package'
	kind: 'procedure' | 'package'
	name: string
	price: number
	mrp?: number | null
	durationMinutes?: number | null
}

/** Catalog -> Book visit: what is being booked (one home-care speciality at a time). */
export type AncillaryBookVisitParams = {
	serviceKey: string // speciality key, e.g. 'nursing-care'
	serviceLabel: string // e.g. 'Nursing care'
	/** Either one package, or one or more procedures -- never both (backend rule). */
	items: AncillaryCartItem[]
	/** Keep the days picked before (e.g. coming back after the provider declined). */
	initialDates?: string[]
	/** Provider to skip when re-picking (declined / expired). */
	excludeProviderId?: string
}

/** Book visit -> Review & pay. */
export type AncillaryReviewPayParams = AncillaryBookVisitParams & {
	provider: {
		provider_public_id: string
		name: string
		avatar_url?: string | null
		specialty?: string | null
		experience_years?: number | null
		distance_km?: number | null
		fee_per_visit: number
	}
	visits: { date: string; start_time: string; end_time: string }[]
}

export type AppStackParamList = {
	[ROUTES.STACK.WALLET]: undefined
	[ROUTES.STACK.WALLET_TOPUP]: undefined
	[ROUTES.STACK.WALLET_TRANSACTIONS]: undefined
	[ROUTES.STACK.WALLET_TRANSACTION_DETAIL]: { id: string }
	[ROUTES.MAIN.TABS]: NavigatorScreenParams<MainTabParamList> | undefined
	[ROUTES.STACK.SEARCH]: undefined
	[ROUTES.STACK.DOCTOR_SEARCH]:
		| { query?: string; specialityId?: string; specialityName?: string; mode?: 'all' | 'video' | 'clinic' }
		| undefined
	[ROUTES.STACK.DOCTOR_DETAIL]: { id: string; referralId?: string }
	[ROUTES.STACK.DOCTOR_BOOK_SLOT]: DoctorBookSlotParams
	[ROUTES.STACK.FAVOURITE_DOCTOR]: undefined
	[ROUTES.STACK.NOTIFICATION]: undefined
	[ROUTES.STACK.CONSULTATION]: ConsultationParams | undefined
	[ROUTES.STACK.HEALTH_PROFILE]: undefined
	[ROUTES.STACK.SETTINGS]: undefined
	[ROUTES.STACK.SCREEN_CAPTURE_TEST]: undefined
	[ROUTES.STACK.DOCTOR_WELCOME]: undefined
	[ROUTES.STACK.ACCOUNT]: undefined
	[ROUTES.STACK.APPOINTMENTS]: { appointmentId?: string } | undefined
	[ROUTES.STACK.RESCHEDULE_APPOINTMENT]: { appointmentId: string }
	[ROUTES.STACK.CANCEL_APPOINTMENT]: { appointmentId: string }
	[ROUTES.STACK.VISIT_SUMMARY]: { appointmentId: string }
	[ROUTES.STACK.APPOINTMENT_CONFIRMED]: AppointmentConfirmedParams
	[ROUTES.STACK.APPOINTMENT_DETAILS]: { appointmentId: string }
	[ROUTES.STACK.CONSENT_FORM]: { paymentParams: Omit<PatientPaymentParams, 'consentVersionId'> }
	[ROUTES.STACK.PHARMACY_SEARCH_PAGE]: undefined
	[ROUTES.STACK.ORDER_LIST]: undefined
	[ROUTES.STACK.ORDER_DETAILS]: { order?: unknown; orderId?: string } | undefined
	[ROUTES.STACK.PLACE_PHARMACY_ORDER]: {
		pharmacyId: string
		pharmacyName: string
		// Optional provider details forwarded from the search list so the booking
		// screen's ProviderDetailsCard can render without an extra fetch.
		pharmacyAddress?: string
		pharmacyCity?: string
		pharmacyPhone?: string
		pharmacyAvatarKey?: string | null
		pharmacyOperatingHours?: { open: string; close: string }
		pharmacyIs24x7?: boolean
	}
	[ROUTES.STACK.PLACE_RADIOLOGY_ORDER]: {
		radiologyId: string
		centerName?: string
		centerAddress?: string
		centerCity?: string
		centerPhone?: string
	}
	[ROUTES.STACK.PLACE_LABORATORY_TEST]: {
		labId: string
		labName: string
		labAddress?: string
		labCity?: string
		labPhone?: string
		labAvatarKey?: string | null
		labOperatingHours?: { open: string; close: string }
		labIs24x7?: boolean
	}
	[ROUTES.STACK.LABORATORY_LIST]: undefined
	[ROUTES.STACK.LABORATORY_ALL_TESTS]: undefined
	[ROUTES.STACK.LABORATORY_ALL_PACKAGES]: undefined
	// Selection lives in LaboratoryCartContext (shared across the Laboratory
	// stack), not route params — this screen just reads it.
	[ROUTES.STACK.LABORATORY_SAMPLE_COLLECTION]: undefined
	[ROUTES.STACK.LABORATORY_SELECT_LAB]: { draft: LabBookingDraft }
	// Lab + appointment fields are only present when `draft.requiresLabSelection`
	// is true (Diagnostic Center Visit tests, and every Package) — Home
	// Sample Collection for individual tests reaches this screen straight
	// from Patient Details with just `draft`, no lab ever chosen.
	[ROUTES.STACK.LABORATORY_BOOKING_SUMMARY]: {
		draft: LabBookingDraft
		labId?: string
		labName?: string
		labAddress?: string
		labCity?: string
		labAvatarKey?: string | null
		labOperatingHours?: { open: string; close: string }
		labIs24x7?: boolean
		date?: string
		timeSlot?: string
	}
	[ROUTES.STACK.LABORATORY_BOOKING_TRACKING]: {
		bookingReference: string
		draft: LabBookingDraft
		labId?: string
		labName?: string
		labAddress?: string
		labCity?: string
		date?: string
		timeSlot?: string
		totalAmount: number
	}
	[ROUTES.STACK.LABORATORY_ORDERS]: undefined
	[ROUTES.STACK.LABORATORY_ORDER_DETAILS]: { publicId: string; booking?: unknown }
	[ROUTES.STACK.ALL_SPECIALITIES]: undefined
	//  Updated: now receives booking data
	[ROUTES.STACK.PATIENT_PAYMENT]: PatientPaymentParams | undefined
	[ROUTES.STACK.PATIENT_QUESTIONS_LIST]: { openAskModal?: boolean } | undefined
	[ROUTES.STACK.PATIENT_QUESTION_DETAIL]: { questionId?: string; question?: any } | undefined
	[ROUTES.STACK.RADIOLOGY_LIST]: { scanTypeId?: number; scanTypeName?: string } | undefined
	[ROUTES.STACK.RADIOLOGY_ORDERS]: undefined
	[ROUTES.STACK.RADIOLOGY_ORDER_DETAIL]: { publicId: string; booking?: any }
	[ROUTES.STACK.RADIOLOGY_SCAN_TYPES]: undefined
	[ROUTES.STACK.COMMUNITY_FORUM]: undefined
	[ROUTES.STACK.COMMUNITY_THREAD]: { threadId: string }
	[ROUTES.STACK.BLOG_LIST]: undefined
	[ROUTES.STACK.BLOG_ARTICLE]: { slug: string }
	[ROUTES.STACK.DOCTOR_EVENTS]: undefined
	[ROUTES.STACK.DOCTOR_EVENT_FORM]: { eventId?: string }
	[ROUTES.STACK.ALL_EVENTS]: undefined
	[ROUTES.STACK.EVENT_DETAILS]: { eventId: string }
	[ROUTES.STACK.PROVIDER_VISIT_DETAILS]: { visitId: string }
	[ROUTES.STACK.PROVIDER_VISIT_IN_PROGRESS]: { visitId: string }
	[ROUTES.STACK.PROVIDER_VISIT_COMPLETE]: { visitId: string }
	[ROUTES.STACK.NURSE_EARNINGS]: undefined
	[ROUTES.STACK.ANCILLARY_SERVICES]: { serviceKey: string; serviceLabel: string; updatedCart?: any[] }
	[ROUTES.STACK.ANCILLARY_BOOK_VISIT]: AncillaryBookVisitParams
	[ROUTES.STACK.ANCILLARY_REVIEW_PAY]: AncillaryReviewPayParams
	/** `booking` omitted (e.g. opened from the Bookings tab) = the page rebuilds it from the order. */
	[ROUTES.STACK.ANCILLARY_REQUEST_SENT]: { requestId: string; booking?: AncillaryBookVisitParams }
	[ROUTES.STACK.ANCILLARY_PROVIDERS]: { serviceKey: string; serviceLabel: string; procedureName?: string }
	[ROUTES.STACK.ANCILLARY_BOOKING_CART]:
		| {
				services?: any[]
		  }
		| undefined
	[ROUTES.STACK.ANCILLARY_BOOKING_SUMMARY]:
		| {
				services?: any[]
		  }
		| undefined
	[ROUTES.STACK.ANCILLARY_BOOKING_DETAILS]:
		| {
				serviceId?: string
				serviceName?: string
				description?: string
				image?: string
				price?: string
				duration?: string
				services?: any[]
		  }
		| undefined
	[ROUTES.STACK.ANCILLARY_PAYMENT]:
		| {
				bookingPayload?: any
		  }
		| undefined
	[ROUTES.STACK.ANCILLARY_PRICING_REVIEW]:
		| {
				bookingPayload?: any
		  }
		| undefined
	[ROUTES.STACK.ANCILLARY_CONFIRMATION]:
		| {
				bookingId?: string
				bookingPayload?: any
		  }
		| undefined
	[ROUTES.STACK.ANCILLARY_BOOKING_STATUS]:
		| {
				bookingId?: string
				bookingData?: any
		  }
		| undefined
	[ROUTES.STACK.ANCILLARY_TRACK_APPOINTMENT]:
		| {
				bookingId?: string
				bookingData?: any
		  }
		| undefined
	[ROUTES.STACK.ANCILLARY_MY_BOOKINGS]: undefined
	[ROUTES.STACK.HOME_CARE_CATALOG]: { updatedCart?: any[] } | undefined
	[ROUTES.STACK.CAREGIVER_SERVICES]: undefined
	[ROUTES.STACK.CAREGIVER_TIME_CONFIG]: {
		careType: 'DAY_CARE' | 'NIGHT_CARE' | 'FULL_DAY_CARE' | 'HOURLY_CARE'
	}
	[ROUTES.STACK.LOCATION_SELECT]: undefined
}

export type RootStackParamList = AuthStackParamList & AppStackParamList
export type AppNavigationParamList = RootStackParamList & MainTabParamList

export type AuthScreenProps<T extends keyof AuthStackParamList> = NativeStackScreenProps<AuthStackParamList, T>
export type AppStackScreenProps<T extends keyof AppStackParamList> = NativeStackScreenProps<AppStackParamList, T>
export type MainTabScreenProps<T extends keyof MainTabParamList> = BottomTabScreenProps<MainTabParamList, T>
