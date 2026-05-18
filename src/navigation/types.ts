import type { NavigatorScreenParams } from '@react-navigation/native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs'
import { ROUTES } from './routes'

// Import the DoctorDetailData type from your doctor feature
// Adjust the path as needed.
import type { DoctorDetailData } from '../types/doctor-detail'

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
  [ROUTES.STACK.SEARCH]: undefined
  [ROUTES.STACK.DOCTOR_SEARCH]: { query?: string } | undefined
  [ROUTES.STACK.DOCTOR_DETAIL]: { id: string }
  [ROUTES.STACK.FAVOURITE_DOCTOR]: undefined
  [ROUTES.STACK.NOTIFICATION]: undefined
  [ROUTES.STACK.CONSULTATION]: ConsultationParams | undefined
  [ROUTES.STACK.HEALTH_PROFILE]: undefined
  [ROUTES.STACK.SETTINGS]: undefined
  [ROUTES.STACK.DOCTOR_WELCOME]: undefined
  [ROUTES.STACK.ACCOUNT]: undefined
  [ROUTES.STACK.APPOINTMENTS]: undefined
  [ROUTES.STACK.VIDEO_CONSULTATION]: { appointmentId: string }
  [ROUTES.STACK.RESCHEDULE_APPOINTMENT]: { appointmentId: string }
  [ROUTES.STACK.CANCEL_APPOINTMENT]: { appointmentId: string }
  [ROUTES.STACK.PHARMACY_SEARCH]: undefined
  [ROUTES.STACK.ORDER_DETAILS]: { order?: unknown } | undefined
  // ✅ Updated: now receives booking data
  [ROUTES.STACK.PATIENT_PAYMENT]: {
    doctor: DoctorDetailData
    hospitalId: string
    hospitalName: string
    appointmentDate: string       // YYYY-MM-DD
    appointmentDateDisplay: string // e.g. "Wed Oct 11 2025"
    startTime: string             // HH:MM (24h format)
    startTimeDisplay: string      // e.g. "01:00 PM"
    appointmentMode: 'offline' | 'online'
    consultationTypeLabel: string
    fee: number
  }
}

export type RootStackParamList = AuthStackParamList & AppStackParamList
export type AppNavigationParamList = RootStackParamList & MainTabParamList

export type AuthScreenProps<T extends keyof AuthStackParamList> =
  NativeStackScreenProps<AuthStackParamList, T>
export type AppStackScreenProps<T extends keyof AppStackParamList> =
  NativeStackScreenProps<AppStackParamList, T>
export type MainTabScreenProps<T extends keyof MainTabParamList> =
  BottomTabScreenProps<MainTabParamList, T>
