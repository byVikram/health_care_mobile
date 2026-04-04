// src/types/appointment.ts

export type AppointmentStatusValue = 'pending' | 'confirmed' | 'completed' | 'cancelled' | string

export interface AppointmentStatus {
	id: string
	label: AppointmentStatusValue
}

export interface AppointmentDoctor {
	id: string
	name: string
}

export interface AppointmentPatient {
	id: string
	name: string
	avatar_s3_key: string | null
}

export interface AppointmentHospital {
	id: string
	name: string
	address: string
}

export interface Appointment {
	id: string
	appointment_mode: 'offline' | 'online'
	appointment_date: string
	appointment_time: string
	fees: number
	created_at: string
	status: AppointmentStatusValue | AppointmentStatus
	doctor: AppointmentDoctor
	patient: AppointmentPatient | null
	hospital: AppointmentHospital | null
}

export interface AppointmentsResponse {
	success: boolean
	message: string
	data: Appointment[]
	total: number
	page: number
	limit: number
	pages: number
}
