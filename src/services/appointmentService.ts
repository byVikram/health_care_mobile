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

// ── Patient no-show (PNS) policy ─────────────────────────────────────────────

export type NoShowState = 'awaiting_reply' | 'valid' | 'invalid' | 'needs_review'

export interface NoShowReasonOption {
  value: string
  label: string
}

export interface NoShowInfo {
  appointment_id: string
  state: NoShowState
  can_reply: boolean
  /** ISO UTC string ending in Z. */
  reply_deadline: string
  reason: string | null
  reasons: NoShowReasonOption[]
  message: string
}

/**
 * What happened to a missed appointment the doctor marked as a no-show (patient only).
 * 404 = it was not marked a no-show, 403 = not the patient's / family's. The calling screen renders its
 * own error text, so the global error dialog is suppressed.
 */
export async function getNoShow(appointmentId: string): Promise<NoShowInfo> {
  const res = await ApiService.get<{ data: NoShowInfo }>(API_ENDPOINTS.APPOINTMENTS.NO_SHOW(appointmentId), {
    skipGlobalError: true,
  })
  return res.data.data
}

/** The patient's one, final reply (reason = one of `reasons[].value`). 409 when already answered or too late. */
export async function replyToNoShow(appointmentId: string, reason: string): Promise<NoShowInfo> {
  const res = await ApiService.post<{ data: NoShowInfo }>(
    API_ENDPOINTS.APPOINTMENTS.NO_SHOW_REPLY(appointmentId),
    { reason },
    { skipGlobalError: true }
  )
  return res.data.data
}

export interface BookingRestriction {
  restricted: boolean
  /** YYYY-MM-DD */
  until: string | null
  message: string | null
}

/** Whether online booking is paused for the signed-in patient (repeated valid no-shows). */
export async function getBookingRestriction(): Promise<BookingRestriction> {
  const res = await ApiService.get<{ data: BookingRestriction }>(API_ENDPOINTS.APPOINTMENTS.BOOKING_RESTRICTION, {
    skipGlobalError: true,
  })
  return res.data.data
}
