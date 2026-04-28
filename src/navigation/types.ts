import type { NavigatorScreenParams } from '@react-navigation/native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs'
import { ROUTES } from './routes'

export type RoleParams = {
	roleId: string
	roleLabel: string
}

export type AuthStackParamList = {
	[ROUTES.AUTH.LOGIN]: undefined
	[ROUTES.AUTH.ROLE_SELECTION]: undefined
	[ROUTES.AUTH.ONBOARDING]: RoleParams | undefined
	[ROUTES.AUTH.REGISTER]: RoleParams | undefined
}

export type MainTabParamList = {
	[ROUTES.MAIN.HOME]: undefined
	[ROUTES.MAIN.SEARCH]: undefined
	[ROUTES.MAIN.PORTAL]: undefined
	[ROUTES.MAIN.PROFILE]: undefined
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

export type AppStackParamList = {
	[ROUTES.MAIN.TABS]: NavigatorScreenParams<MainTabParamList> | undefined
	[ROUTES.STACK.DOCTOR_SEARCH]: { query?: string } | undefined
	[ROUTES.STACK.DOCTOR_DETAIL]: { id: string }
	[ROUTES.STACK.FAVOURITE_DOCTOR]: undefined
	[ROUTES.STACK.NOTIFICATION]: undefined
	[ROUTES.STACK.CONSULTATION]: ConsultationParams | undefined
	[ROUTES.STACK.HEALTH_PROFILE]: undefined
	[ROUTES.STACK.SETTINGS]: undefined
	[ROUTES.STACK.DOCTOR_WELCOME]: undefined
	[ROUTES.STACK.ACCOUNT]: undefined
	[ROUTES.STACK.VIDEO_CONSULTATION]: { appointmentId: string }
	[ROUTES.STACK.RESCHEDULE_APPOINTMENT]: { appointmentId: string }
	[ROUTES.STACK.CANCEL_APPOINTMENT]: { appointmentId: string }
	[ROUTES.STACK.PATIENT_PAYMENT]: undefined
}

export type RootStackParamList = AuthStackParamList & AppStackParamList
export type AppNavigationParamList = RootStackParamList & MainTabParamList

export type AuthScreenProps<T extends keyof AuthStackParamList> =
	NativeStackScreenProps<AuthStackParamList, T>
export type AppStackScreenProps<T extends keyof AppStackParamList> =
	NativeStackScreenProps<AppStackParamList, T>
export type MainTabScreenProps<T extends keyof MainTabParamList> =
	BottomTabScreenProps<MainTabParamList, T>
