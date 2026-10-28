// src/features/ancillary/patient/useVisitEdits.ts
//
// Cancel / move visits of a scheduled order for Booking details and View visit: runs the call, shows the toast
// (the server's own message when it refuses -- e.g. the visit got too close while the sheet was open) and
// refreshes the order either way, so the screen always shows what the server has now.

import { useState } from 'react'
import Toast from 'react-native-toast-message'
import { cancelAncillaryVisits, rescheduleAncillaryVisit } from '../ancillaryProviderBookingService'
import { plural } from './ancillaryBookingCopy'
import { apiErrorMessage } from './useVisitPatientAddress'

export function useVisitEdits(requestId: string, refresh: () => Promise<void>) {
	const [cancelling, setCancelling] = useState(false)
	const [moving, setMoving] = useState(false)

	/** True when the visits were cancelled. */
	const cancelVisits = async (visitIds: string[], reason: string) => {
		setCancelling(true)
		try {
			await cancelAncillaryVisits(requestId, visitIds, reason)
			Toast.show({ type: 'success', text1: `${plural(visitIds.length, 'visit')} cancelled` })
			return true
		} catch (e) {
			Toast.show({ type: 'error', text1: "Couldn't cancel", text2: apiErrorMessage(e) || 'Please try again.' })
			return false
		} finally {
			setCancelling(false)
			void refresh()
		}
	}

	/** True when the visit was moved. */
	const moveVisit = async (visitId: string, date: string, startTime: string) => {
		setMoving(true)
		try {
			await rescheduleAncillaryVisit(requestId, visitId, date, startTime)
			Toast.show({ type: 'success', text1: 'Visit rescheduled' })
			return true
		} catch (e) {
			Toast.show({
				type: 'error',
				text1: "Couldn't reschedule",
				text2: apiErrorMessage(e) || 'Please try again.',
			})
			return false
		} finally {
			setMoving(false)
			void refresh()
		}
	}

	return { cancelling, moving, cancelVisits, moveVisit }
}
