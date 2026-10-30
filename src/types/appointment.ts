// src/types/appointment.ts

export interface AppointmentHistoryEntry {
  action: string          // e.g. 'created' | 'rescheduled' | 'confirmed' | 'cancelled'
  actor_type: string      // 'doctor' | 'patient' | 'system'
  // Backend may return a plain string OR a slot object {appointment_date, start_time, end_time}
  old_value: unknown
  new_value: unknown
  reason: string | null
  created_at: string      // ISO timestamp
}

export type AppointmentStatusValue = 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'rescheduled' | 'reschedule_required' | 'no_show' | string

export interface AppointmentStatus {
  id: string
  label: AppointmentStatusValue
}

export interface AppointmentDoctor {
  id: string
  name: string
  avatar_s3_key: string | undefined
  specialty?: string
  specialization?: string  // alternate key some backends use
}

export interface AppointmentPatient {
  id: string
  name: string
  avatar_s3_key: string | null
  age: number
  gender: string
}

export interface AppointmentHospital {
  id: string
  name: string
  address: string
  latitude?: number | null
  longitude?: number | null
}

export interface Appointment {
  id: string
  public_id: string
  booking_id?: string
  appointment_mode: 'clinic visit' | 'video call' | string
  appointment_date: string
  appointment_time?: string
  start_time: string
  end_time: string
  fees: number
  created_at: string
  status: AppointmentStatusValue | AppointmentStatus
  doctor: AppointmentDoctor
  patient: AppointmentPatient | null
  hospital: AppointmentHospital | null
  symptoms?: string | null
  duration?: string | null
  severity?: 'mild' | 'moderate' | 'severe' | null
  pre_intake?: {
    symptoms?: string
    duration?: string
    severity?: string
  } | null
  history?: AppointmentHistoryEntry[]
  rescheduled_by?: string | null
  /** The patient's consent code was already entered for this appointment: the doctor opens the consultation directly. */
  access_verified?: boolean
  reason?: string | null
  referral?: {
    id: string
    referring_doctor: {
      id: string
      name: string
      avatar_s3_key?: string | null
      avatar_url?: string | null
      avatar?: string | null
      profile_picture?: string | null
      photo_url?: string | null
      image_url?: string | null
    }
    notes: string | null
    status: string
  } | null
}

export interface AppointmentsResponse {
  success: boolean
  message: string
  data: Appointment[]
  meta?: {
    total?: number
    page?: number
    limit?: number
    pages?: number
  }
  total: number
  page: number
  limit: number
  pages: number
}

export interface AppointmentParams {
  appointment_date?: string
  appSearch?: string
}
