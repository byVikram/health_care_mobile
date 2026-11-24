// src/features/ancillary/patient/CancellationDetailsModal.tsx
//
// "Cancel booking request" (a request still searching, or the whole booking) on the shared AppCancelSheet: a reason (optional; "Other
// reason" is sent when none is picked), the free-cancellation notice, the refund terms, and Keep booking / Confirm cancel. The page runs
// the cancellation and returns how it went; the sheet shows the confirmation or the error, and `onDone` is the follow-up (go back).
import React from 'react'
import { AppCancelSheet, type AppCancelResult } from '../../../components/common'

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
			notice={{
				tone: 'warning',
				text: 'Free cancellation is available before provider assignment. 100% refund will be processed to original payment method.',
			}}
			footnote="Refund terms: before provider assignment, a full 100% refund. Provider en route (more than 5 mins): ₹100 travel fee applies."
			confirmLabel="Cancel request"
			successTitle="Request cancelled"
			onClose={onClose}
			onDone={onDone}
			onConfirm={(reason) => onConfirmCancel(reason ?? 'Other reason')}
		/>
	)
}
