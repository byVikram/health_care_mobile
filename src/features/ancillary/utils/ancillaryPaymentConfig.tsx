// src/features/ancillary/utils/ancillaryPaymentConfig.tsx
//
// Nursing/Ancillary's own config for the shared `BookingPaymentPage`
// (`src/components/common/booking/BookingPaymentPage.tsx`) — mirrors the
// `bookingProgressStepperConfig.ts` pattern: a feature-owned adapter around a
// shared, feature-agnostic component, kept out of `common/` so the shared
// component has no dependency on this feature's API/service layer.

import React from 'react'
import { Image, StyleSheet, View } from 'react-native'
import { AppTypography } from '../../../components/common'
import {
	BookingPaymentPageConfig,
	BookingPaymentSubmitContext,
} from '../../../components/common/booking/BookingPaymentPage'
import { ROUTES } from '../../../navigation/routes'
import {
	ANCILLARY_BOOKING_STEPS,
	ANCILLARY_STEPPER_THEME,
	navigateAncillaryStep,
} from './bookingProgressStepperConfig'
import ApiService from '../../../services/apiService'
import { API_ENDPOINTS } from '../../../constants/apiUrls'
import { generateIdempotencyKey, createScheduledAncillaryBooking } from '../ancillaryService'

export function buildAncillaryPaymentConfig(navigation: any): BookingPaymentPageConfig {
	return {
		orderSummaryUnitLabel: 'Procedure',
		itemMetaSuffix: ' • Home Visit',
		visitFeeLabel: 'Specialist Doorstep Visit Fee',
		securityNoticeText:
			'Your appointment will be confirmed immediately. Practitioner info and OTP tracking details will be generated upon confirmation.',
		payButtonLabel: 'Confirm & Dispatch Nurse ➔',
		stepper: {
			steps: ANCILLARY_BOOKING_STEPS,
			currentIndex: 2,
			theme: ANCILLARY_STEPPER_THEME,
			onStepPress: (index: number) => navigateAncillaryStep(navigation, 2, index),
		},
		renderExtraSummaryInfo: (payload: any) =>
			payload.selectedNurse ? <PreferredNurseBar nurse={payload.selectedNurse} /> : null,
		activeTaskModal: {
			title: 'Active Request in Progress',
			description:
				'You already have an active nursing request in progress. Please complete your current visit before booking another.',
			submitText: 'Track Active Request',
		},
		onSubmit: async ({
			bookingPayload: payload,
			services,
			charges,
			visit,
			selectedMethodId,
			clientReference,
			patient,
		}: BookingPaymentSubmitContext) => {
			const idempotencyKey = generateIdempotencyKey()

			const requestPayload = {
				publicBookingId: clientReference,
				specialtyId: payload.specialtyId,
				careBookingMode: payload.careBookingMode,
				serviceTypeIds: services.map((s) => s.id),
				serviceTypeId: services[0]?.id || 'srv-01',
				bookingType: payload.bookingType || 'INSTANT',
				scheduledStartTime: payload.bookingType === 'SCHEDULED' ? `${visit.date} ${visit.timeSlot || ''}`.trim() : null,
				paymentMethod: selectedMethodId,
				patientPublicId: patient.publicId,
				address: {
					streetAddress: visit.address,
					...(visit?.latitude != null ? { latitude: visit.latitude } : {}),
					...(visit?.longitude != null ? { longitude: visit.longitude } : {}),
				},
				totalAmount: charges.totalAmount,
				// Numeric/raw breakdown so the backend persists the exact same
				// figures the patient reviewed on this screen instead of a value
				// recomputed server-side (see ancillary_service_requests amount fix).
				charges: {
					procedureOrServiceFee: charges.basePrice,
					transportFee: charges.visitFee,
					tax: charges.taxes,
					totalAmount: charges.totalAmount,
				},
				visitDurationHours: payload.visitDurationHours,
				careInstructions: payload.careInstructions,
				criticalFlags: payload.criticalFlags,
			}

			try {
				if (payload?.scheduledDate && payload?.scheduledStartTime && payload?.providerId) {
					const scheduledRes = await createScheduledAncillaryBooking({
						provider_public_id: payload.providerId,
						scheduled_date: payload.scheduledDate,
						scheduled_start_time: payload.scheduledStartTime,
						scheduled_end_time: payload.scheduledEndTime || '10:30',
						procedure_ids: services.map((s) => String(s.id)),
						medical_notes: payload.notes || '',
						chief_complaint: payload.chiefComplaint || 'Scheduled Healthcare Service',
						street_address: visit.address || 'Selected Location',
						latitude: visit.latitude || 12.9716,
						longitude: visit.longitude || 77.5946,
						payment_method: selectedMethodId,
					})
					return { bookingId: scheduledRes.request_public_id || clientReference }
				}

				const res = await ApiService.post<any>(
					API_ENDPOINTS.ANCILLARY.REQUESTS,
					requestPayload,
					{ headers: { 'Idempotency-Key': idempotencyKey } }
				)
				const resData = res.data?.data || res.data
				return { bookingId: resData?.publicBookingId || resData?.requestId || resData?.id || clientReference }
			} catch (error: any) {
				const errDetail = error.response?.data?.detail || error.response?.data
				if (error.response?.status === 409 || errDetail?.code === 'ACTIVE_TASK_EXISTS') {
					const activeId = errDetail?.activeTask?.requestId || errDetail?.activeTask?.publicBookingId || ''
					throw { isActiveTaskConflict: true, activeTaskId: activeId }
				}
				throw error
			}
		},
		onSuccess: ({ bookingId, bookingPayload: payload, selectedMethodId }) => {
			navigation.navigate(ROUTES.STACK.ANCILLARY_SERVICE_MATCHING, {
				bookingId,
				serviceName: (payload.services || []).map((s: any) => s.title).filter(Boolean).join(', ') || 'In-Home Healthcare Service',
				addressText: payload.visit?.address,
				isScheduled: Boolean(payload?.scheduledDate),
				scheduledDate: payload?.scheduledDate,
				scheduledStartTime: payload?.scheduledStartTime,
				bookingPayload: {
					...payload,
					paymentMethod: selectedMethodId,
				},
			})
		},
		onActiveTaskConflict: (activeTaskId: string) => {
			navigation.navigate(ROUTES.STACK.ANCILLARY_SERVICE_MATCHING, {
				bookingId: activeTaskId,
			})
		},
	}
}

/** Nursing-only "Preferred Nurse" summary bar — unchanged markup/styling from
 *  the pre-split `AncillaryPaymentPage`, injected into the shared
 *  `BookingPaymentPage` via `config.renderExtraSummaryInfo`. */
function PreferredNurseBar({ nurse }: { nurse: any }) {
	return (
		<View style={styles.preferredNurseBar}>
			<Image source={{ uri: nurse.avatar }} style={styles.preferredNurseAvatar} />
			<View style={{ flex: 1 }}>
				<AppTypography variant="caption" style={{ fontWeight: '700', color: '#0F766E' }}>
					Preferred Nurse: {nurse.name} ({nurse.credentials})
				</AppTypography>
				<AppTypography variant="caption" style={{ color: '#0F766E', fontSize: 11, marginTop: 1 }}>
					{nurse.experience} yrs exp • {nurse.rating} ★ • {nurse.distance} km away
				</AppTypography>
			</View>
		</View>
	)
}

const styles = StyleSheet.create({
	preferredNurseBar: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#CCFBF1',
		borderWidth: 1,
		borderColor: '#99F6E4',
		paddingHorizontal: 12,
		paddingVertical: 8,
		borderRadius: 8,
		marginTop: 8,
	},
	preferredNurseAvatar: {
		width: 32,
		height: 32,
		borderRadius: 16,
		marginRight: 10,
	},
})
