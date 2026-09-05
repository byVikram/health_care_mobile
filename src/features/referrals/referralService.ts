// src/features/referrals/referralService.ts
//
// React Native port of the web referralService.ts + types/referral.ts.
// Talks to the same backend endpoints (app/referrals/router.py) — no
// backend changes required.

import ApiService from '../../services/apiService'
import { API_ENDPOINTS } from '../../constants/apiUrls'

// ── Types ─────────────────────────────────────────────────────────────────

export type ReferralStatus = 'pending' | 'appointment_booked' | 'completed' | 'cancelled'

export interface ReferralDoctorBrief {
	id: string
	name: string
	avatar_s3_key?: string | null
	avatar_url?: string | null
	avatar?: string | null
	profile_picture?: string | null
	photo_url?: string | null
	image_url?: string | null
}

export interface ReferralPatientBrief {
	id: string
	name: string
	avatar_s3_key: string | null
}

export interface ReferralAppointmentBrief {
	id: string
	appointment_date: string
	start_time: string
	appointment_mode: string
	status: string
}

export interface Referral {
	id: string
	status: ReferralStatus
	notes: string | null
	is_active: boolean
	created_at: string
	updated_at: string
	referring_doctor: ReferralDoctorBrief
	referred_doctor: ReferralDoctorBrief
	patient: ReferralPatientBrief
	appointment: ReferralAppointmentBrief | null
	referred_appointment: ReferralAppointmentBrief | null
}

export interface ReferralResponse {
	success: boolean
	message: string
	data: Referral
}

export interface ReferralsListResponse {
	success: boolean
	message: string
	data: Referral[]
}

export interface CreateReferralPayload {
	appointment_id: string
	referred_doctor_id: string
	notes?: string
}

// ── Notifications ─────────────────────────────────────────────────────────

export interface AppNotification {
	id: string
	type: string
	title: string
	message: string
	reference_type: string | null
	reference_id: string | null
	redirect_type: string | null
	redirect_id: string | null
	is_read: boolean
	created_at: string
}

export interface NotificationsResponse {
	success: boolean
	message: string
	data: AppNotification[]
}

export interface NotificationResponse {
	success: boolean
	message: string
	data: AppNotification
}

// ── Referral APIs ────────────────────────────────────────────────────────

export const createReferral = async (payload: CreateReferralPayload): Promise<Referral> => {
	const res = await ApiService.post<ReferralResponse>(API_ENDPOINTS.REFERRALS.CREATE, payload)
	return res.data.data
}

export const getReferralsSent = async (): Promise<Referral[]> => {
	const res = await ApiService.get<ReferralsListResponse>(API_ENDPOINTS.REFERRALS.SENT)
	return res.data.data
}

export const getReferralsReceived = async (): Promise<Referral[]> => {
	const res = await ApiService.get<ReferralsListResponse>(API_ENDPOINTS.REFERRALS.RECEIVED)
	return res.data.data
}

export const getReferralDetail = async (id: string): Promise<Referral> => {
	const res = await ApiService.get<ReferralResponse>(API_ENDPOINTS.REFERRALS.DETAIL(id))
	return res.data.data
}

// ── Notification APIs ────────────────────────────────────────────────────

export const getNotifications = async (unreadOnly = false): Promise<AppNotification[]> => {
	const res = await ApiService.getWithParams<NotificationsResponse>(API_ENDPOINTS.NOTIFICATIONS.LIST, {
		unread_only: unreadOnly,
	})
	return res.data.data
}

export const markNotificationRead = async (id: string): Promise<AppNotification> => {
	const res = await ApiService.patch<NotificationResponse>(API_ENDPOINTS.NOTIFICATIONS.MARK_READ(id), {
		is_read: true,
	})
	return res.data.data
}
