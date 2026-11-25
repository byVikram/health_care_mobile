// src/features/ancillary/patient/useVisitEdits.ts
//
// Cancel / move visits of a scheduled order for Booking details and View visit. Cancelling returns how it went (the cancel sheet shows
// the confirmation, or the server's own message when it refuses -- e.g. the visit got too close while the sheet was open); moving
// returns how it went the same way, for the reschedule sheet (its toast on success, its inline message when the server refuses).
// Both refresh the order either way, so the screen always shows what the server has now.

import { cancelAncillaryVisits, rescheduleAncillaryVisit } from '../ancillaryProviderBookingService'
import type { AppCancelResult, AppRescheduleResult } from '../../../components/common'
import { apiErrorMessage } from './useVisitPatientAddress'

export function useVisitEdits(requestId: string, refresh: () => Promise<void>) {
	/** How the cancellation went (for AppCancelSheet's onConfirm). */
	const cancelVisits = async (visitIds: string[], reason: string): Promise<AppCancelResult> => {
		try {
			await cancelAncillaryVisits(requestId, visitIds, reason)
			return { ok: true }
		} catch (e) {
			return { ok: false, error: apiErrorMessage(e) || 'Please try again.' }
		} finally {
			void refresh()
		}
	}

	/** How the move went (for AppRescheduleSheet's onConfirm). */
	const moveVisit = async (visitId: string, date: string, startTime: string): Promise<AppRescheduleResult> => {
		try {
			await rescheduleAncillaryVisit(requestId, visitId, date, startTime)
			return { ok: true }
		} catch (e) {
			return { ok: false, error: apiErrorMessage(e) || 'Please try again.' }
		} finally {
			void refresh()
		}
	}

	return { cancelVisits, moveVisit }
}
