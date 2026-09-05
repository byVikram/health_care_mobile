// src/services/reviewService.ts
import ApiService from './apiService'
import { API_ENDPOINTS } from '../constants/apiUrls'

export interface DoctorReview {
  id: string
  rating: number
  comment: string | null
  created_at: string | null
}

export interface AppointmentReviewResponse {
  success: boolean
  message: string
  data: DoctorReview | null
}

export interface CreateReviewPayload {
  doctor_id: string | number
  appointment_id: string | number
  rating: number
  comment?: string
}


/**
 * Fetch a patient's own review for a specific appointment.
 */
export async function getReviewForAppointment(appointmentId: string): Promise<DoctorReview | null> {
  try {
    const res = await ApiService.get<AppointmentReviewResponse>(
      API_ENDPOINTS.REVIEWS.BY_APPOINTMENT(appointmentId)
    )
    if (res.data?.success) {
      return res.data.data
    }
    return null
  } catch (err) {
    console.error('Failed to fetch review for appointment:', err)
    return null
  }
}

/**
 * Submit a new review for an appointment.
 */
export async function createReview(payload: CreateReviewPayload): Promise<{ success: boolean; message: string }> {
  const res = await ApiService.post<{ success: boolean; message: string }>(
    API_ENDPOINTS.REVIEWS.CREATE,
    payload
  )
  return res.data
}
