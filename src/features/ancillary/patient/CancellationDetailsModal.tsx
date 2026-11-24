// src/features/ancillary/patient/CancellationDetailsModal.tsx
//
// "Cancel booking request" (a request still searching, or the whole booking) on the shared AppCancelSheet: a reason (optional; when none
// is picked the backend's own default, "Cancelled by patient", is sent, so a skipped reason is not mistaken for a chosen "Other reason"),
// the free-cancellation notice, and Keep booking / Cancel request. There is no refund or fee text: a patient pays after each visit, so
// nothing is taken up front and there is nothing to refund. The page runs the cancellation and returns how it went; the sheet shows the
// confirmation or the error, and `onDone` is the follow-up (go back).
import React from 'react'
import { AppCancelSheet, type AppCancelResult } from '../../../components/common'

/** What is sent when the patient picks no reason: the text POST /patient/requests/{id}/cancel and cancelCareRequestPatientBackend default to. */
export const NO_REASON_GIVEN = 'Cancelled by patient'

export const CANCELLATION_REASONS = [
	{ id: '1', label: 'Wait time is too long' },
	{ id: '2', label: 'Booked by mistake / wrong address' },
	{ id: '3', label: 'Patient condition improved / no longer required' },
	{ id: '4', label: 'Found alternative care professional' },
	{ id: '5', label: 'Other reason' },
]

interface CancellationDetailsModalProps {
	visible: boolean
	onClose: () => void
	onConfirmCancel: (reason: string) => Promise<AppCancelResult>
	/** The confirmation was closed (the request is cancelled): go back. */
	onDone: () => void
	feeAmount?: string
}

export default function CancellationDetailsModal({
	visible,
	onClose,
	onConfirmCancel,
	onDone,
}: CancellationDetailsModalProps) {
	return (
		<AppCancelSheet
			visible={visible}
			title="Cancel booking request?"
			reasons={CANCELLATION_REASONS.map((r) => r.label)}
			notice={{ tone: 'warning', text: 'Free cancellation is available before provider assignment.' }}
			confirmLabel="Cancel request"
			successTitle="Request cancelled"
			onClose={onClose}
			onDone={onDone}
			onConfirm={(reason) => onConfirmCancel(reason ?? NO_REASON_GIVEN)}
		/>
	)
}
