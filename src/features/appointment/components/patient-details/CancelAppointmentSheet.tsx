// src/features/appointment/components/patient-details/CancelAppointmentSheet.tsx
//
// "Cancel this appointment?" sheet (design 7 / 7a). Uses the same cancel
// flow as MobileAppointmentCard: look up the "cancelled" status id from
// APPOINTMENTS.STATUSES, then PATCH APPOINTMENTS.UPDATE.

import React, { useEffect, useState } from 'react'
import ApiService, { showStatusModal } from '../../../../services/apiService'
import { API_ENDPOINTS } from '../../../../constants/apiUrls'
import { updateAppointmentsStatus } from '../../../../services/appointmentService'
import { AppCancelSheet } from '../../../../components/common'

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
	const [submitting, setSubmitting] = useState(false)

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

	const handleConfirm = async (reason: string | null) => {
		if (submitting) return
		if (!cancelledStatusId) {
			showStatusModal({
				status: 'error',
				title: 'Unable to cancel',
				description: 'Cancellation status is unavailable. Please try again in a moment.',
				submitText: 'OK',
			})
			return
		}
		setSubmitting(true)
		try {
			const res = await updateAppointmentsStatus(appointmentId, cancelledStatusId, reason ?? undefined)
			if (res?.success) {
				onCancelled()
			} else {
				showStatusModal({
					status: 'error',
					title: "Couldn't cancel the appointment",
					description: res?.message || 'Failed to cancel appointment.',
					submitText: 'OK',
				})
			}
		} catch (error: any) {
			console.log('[CancelAppointmentSheet] cancel error:', error?.response?.data || error?.message || error)
			showStatusModal({
				status: 'error',
				title: "Couldn't cancel the appointment",
				description: 'Please try again.',
				submitText: 'OK',
			})
		} finally {
			setSubmitting(false)
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
			onConfirm={handleConfirm}
			busy={submitting}
		/>
	)
}
