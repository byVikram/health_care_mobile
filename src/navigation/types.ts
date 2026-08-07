import type { NavigatorScreenParams } from '@react-navigation/native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs'
import { ROUTES } from './routes'

import type { DoctorDetailData } from '../types/doctor-detail'

export type RoleParams = {
	roleId: string
	roleLabel: string
	specialty?: string
}

export type AuthStackParamList = {
	[ROUTES.AUTH.LOGIN]: undefined
	[ROUTES.AUTH.ROLE_SELECTION]: undefined
	[ROUTES.AUTH.ONBOARDING]: RoleParams | undefined
	[ROUTES.AUTH.REGISTER]: RoleParams | undefined
}

export type MainTabParamList = {
	[ROUTES.MAIN.HOME]: undefined
	[ROUTES.MAIN.SEARCH]:
		| {
				mode?: 'clinic' | 'video'
		  }
		| undefined
	[ROUTES.MAIN.PORTAL]: undefined
	[ROUTES.MAIN.PROFILE]: undefined
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
}

export type AppStackParamList = {
	[ROUTES.MAIN.TABS]: NavigatorScreenParams<MainTabParamList> | undefined
	[ROUTES.STACK.SEARCH]: undefined
	[ROUTES.STACK.DOCTOR_SEARCH]:
		| { query?: string; specialityId?: string; specialityName?: string; mode?: 'all' | 'video' | 'clinic' }
		| undefined
	[ROUTES.STACK.DOCTOR_DETAIL]: { id: string; referralId?: string }
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
	[ROUTES.STACK.CONSENT_FORM]: { paymentParams: Omit<PatientPaymentParams, 'consentVersionId'> }
	[ROUTES.STACK.PHARMACY_SEARCH_PAGE]: undefined
	[ROUTES.STACK.ORDER_LIST]: undefined
	[ROUTES.STACK.ORDER_DETAILS]: { order?: unknown } | undefined
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
	[ROUTES.STACK.TRANSPORTATION_LANDING]: undefined
	[ROUTES.STACK.BOOK_RIDE]: { appointmentId: string; type?: 'onward' | 'return' }
	[ROUTES.STACK.RIDE_TRACKING]: { appointmentId: string; type?: 'onward' | 'return' }
	[ROUTES.STACK.DOCTOR_EVENTS]: undefined
	[ROUTES.STACK.DOCTOR_EVENT_FORM]: { eventId?: string }
	[ROUTES.STACK.ALL_EVENTS]: undefined
	[ROUTES.STACK.EVENT_DETAILS]: { eventId: string }
	[ROUTES.STACK.NURSE_ACTIVE_BOOKING]: { bookingId: string }
	[ROUTES.STACK.NURSE_PATIENT_VERIFICATION]: { bookingId: string }
	[ROUTES.STACK.NURSE_SERVICE_IN_PROGRESS]: { bookingId: string }
	[ROUTES.STACK.NURSE_COMPLETE_SERVICE]: { bookingId: string; elapsedSeconds: number }
	[ROUTES.STACK.ANCILLARY_SERVICES]: { serviceKey: string; serviceLabel: string }
	[ROUTES.STACK.ANCILLARY_PROVIDERS]: { serviceKey: string; serviceLabel: string; procedureName?: string }
	[ROUTES.STACK.LOCATION_SELECT]: undefined
}

export type RootStackParamList = AuthStackParamList & AppStackParamList
export type AppNavigationParamList = RootStackParamList & MainTabParamList

export type AuthScreenProps<T extends keyof AuthStackParamList> = NativeStackScreenProps<AuthStackParamList, T>
export type AppStackScreenProps<T extends keyof AppStackParamList> = NativeStackScreenProps<AppStackParamList, T>
export type MainTabScreenProps<T extends keyof MainTabParamList> = BottomTabScreenProps<MainTabParamList, T>
