// src/features/bookings/CancelCareBookingSheet.tsx
//
// "Cancel this booking?" for a home-care booking cancelled from the Bookings list, on the shared AppCancelSheet (it used to be a plain
// confirm dialog with a toast and an error pop-up). Cancels the whole booking (POST .../cancel); the sheet says "Booking cancelled" in a
// toast and `onCancelled` refreshes the list, or shows the server's reason inline when it refuses.
import React from 'react'
import { AppCancelSheet, sheetErrorMessage, type AppCancelResult } from '../../components/common'
import { cancelAncillaryOrder } from '../ancillary/ancillaryProviderBookingService'

type Props = {
	visible: boolean
	/** The booking's request id. */
	orderId: string
	/** "Wound dressing" and when ("Tue 26 Sep · 7:00 PM"), shown in the card under the title. */
	title: string
	line?: string
	onClose: () => void
	onCancelled: () => void
}

export default function CancelCareBookingSheet({ visible, orderId, title, line, onClose, onCancelled }: Props) {
	const confirm = async (): Promise<AppCancelResult> => {
		try {
			await cancelAncillaryOrder(orderId)
			return { ok: true }
		} catch (e) {
			return { ok: false, error: sheetErrorMessage(e, 'Please try again.') }
		}
	}

	return (
		<AppCancelSheet
			visible={visible}
			title="Cancel this booking?"
			summary={{ title, line }}
			confirmLabel="Cancel booking"
			successTitle="Booking cancelled"
			onClose={onClose}
			onDone={onCancelled}
			onConfirm={confirm}
		/>
	)
}
