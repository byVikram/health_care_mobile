// src/features/appointment/components/patient-details/CancelAppointmentSheet.tsx
//
// "Cancel this appointment?" sheet (design 7 / 7a). Uses the same cancel
// flow as MobileAppointmentCard: look up the "cancelled" status id from
// APPOINTMENTS.STATUSES, then PATCH APPOINTMENTS.UPDATE.

import React, { useEffect, useState } from 'react'
import ApiService from '../../../../services/apiService'
import { API_ENDPOINTS } from '../../../../constants/apiUrls'
import { updateAppointmentsStatus } from '../../../../services/appointmentService'
import { AppCancelSheet, sheetErrorMessage, type AppCancelResult } from '../../../../components/common'

const REASONS = ['Feeling better', 'Can’t make it', 'Booked by mistake', 'Seeing another doctor']

type AppointmentStatusOption = { id: string; label: string }

type CancelAppointmentSheetProps = {
	visible: boolean
	appointmentId: string
	subtitle: string
	onClose: () => void
	onRescheduleInstead: () => void
	onCancelled: () => void
}

export default function CancelAppointmentSheet({
	visible,
	appointmentId,
	subtitle,
	onClose,
	onRescheduleInstead,
	onCancelled,
}: CancelAppointmentSheetProps) {
	const [cancelledStatusId, setCancelledStatusId] = useState('')

	useEffect(() => {
		if (!visible) return
		if (cancelledStatusId) return
		let mounted = true
		const fetchStatuses = async () => {
			try {
				const res = await ApiService.get<{ success?: boolean; data?: AppointmentStatusOption[] }>(
					API_ENDPOINTS.APPOINTMENTS.STATUSES
				)
				const match = res.data?.data?.find((s) => s.label?.toLowerCase() === 'cancelled')
				if (mounted && match) setCancelledStatusId(match.id)
			} catch (error) {
				console.log('[CancelAppointmentSheet] fetch statuses error:', error)
			}
		}
		fetchStatuses()
		return () => {
			mounted = false
		}
	}, [visible, cancelledStatusId])

	const handleConfirm = async (reason: string | null): Promise<AppCancelResult> => {
		if (!cancelledStatusId) {
			return { ok: false, error: 'Cancellation status is unavailable. Please try again in a moment.' }
		}
		try {
			const res = await updateAppointmentsStatus(appointmentId, cancelledStatusId, reason ?? undefined)
			return res?.success ? { ok: true } : { ok: false, error: res?.message || 'Failed to cancel appointment.' }
		} catch (error) {
			console.log(
				'[CancelAppointmentSheet] cancel error:',
				(error as any)?.response?.data || (error as any)?.message || error
			)
			return { ok: false, error: sheetErrorMessage(error, 'Please try again.') }
		}
	}

	return (
		<AppCancelSheet
			visible={visible}
			title="Cancel this appointment?"
			subtitle={subtitle}
			reasons={REASONS}
			onClose={onClose}
			onRescheduleInstead={onRescheduleInstead}
			confirmLabel="Cancel appointment"
			onConfirm={handleConfirm}
			successTitle="Appointment cancelled"
			onDone={onCancelled}
		/>
	)
}
