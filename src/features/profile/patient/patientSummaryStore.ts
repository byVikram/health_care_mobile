// src/features/profile/patient/patientSummaryStore.ts
//
// The patient summary card (id, name, photo, completion %, family count) shown by the drawer and the health QR,
// kept in memory for the whole app. It is fetched when nothing is stored yet, or after the app itself changed
// something it shows (`markStale`, called by the services that save the patient's details / photo or change the
// family); the next screen that needs it then fetches. The profile hub also writes the fields it already
// received (`patch`), so the card is right as soon as the hub has loaded. No timer. Cleared on logout.

import type { PatientSummary } from '../../../services/homeService'
import { registerSessionCache } from '../../../utils/sessionCache'

let value: PatientSummary | null = null
let stale = false
const listeners = new Set<() => void>()

const emit = () => listeners.forEach((l) => l())

export const patientSummaryStore = {
	get: () => value,
	isStale: () => stale,

	subscribe(listener: () => void) {
		listeners.add(listener)
		return () => {
			listeners.delete(listener)
		}
	},

	/** A freshly fetched summary. */
	set(next: PatientSummary) {
		value = next
		stale = false
		emit()
	},

	/** Fields learned from another response. Leaves "needs a refresh" as it was (the rest may still be out of date). */
	patch(fields: Partial<PatientSummary>) {
		if (!value) return
		value = { ...value, ...fields }
		emit()
	},

	/** The app changed something the summary shows: fetch it again the next time it is needed. */
	markStale() {
		stale = true
	},
}

registerSessionCache(() => {
	value = null
	stale = false
	emit()
})
