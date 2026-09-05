// src/services/appointmentService.ts
import ApiService from './apiService'
import { API_ENDPOINTS } from '../constants/apiUrls'
import { Appointment } from '../types/appointment'

/**
 * Fetch a single appointment by its UUID, including the `history` array
 * built from AppointmentAudit entries on the backend.
 *
 * The backend may return the appointment wrapped in { data: {...} } or directly.
 * We handle both shapes defensively.
 */
export async function getAppointmentById(id: string): Promise<Appointment> {
  const res = await ApiService.get<Record<string, unknown>>(API_ENDPOINTS.APPOINTMENTS.GET_BY_ID(id))
  const body = res.data
  // Handle { success, message, data: { ...appointment } } wrapper
  if (body && typeof body === 'object' && 'data' in body && body.data && typeof body.data === 'object') {
    return body.data as Appointment
  }
  // Fallback: backend returned the appointment object directly
  return body as unknown as Appointment
}

/**
 * Update an appointment status by POSTing to the update-status endpoint.
 */
export async function updateAppointmentsStatus(
  appointmentId: string,
  statusId: string,
  reason?: string
): Promise<{ success: boolean; message: string }> {
  const res = await ApiService.patch<{ success: boolean; message: string }>(
    API_ENDPOINTS.APPOINTMENTS.UPDATE,
    {
      appointment_id: appointmentId,
      status_id: statusId,
      ...(reason ? { reason } : {}),
    }
  )
  return res.data
}
