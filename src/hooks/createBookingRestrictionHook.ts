// src/hooks/createBookingRestrictionHook.ts
//
// A hook that says whether booking is paused for the signed-in patient (the patient no-show policy), for one kind of
// booking: the doctor's (features/appointment/useBookingRestriction.ts) and home care's
// (features/ancillary/hooks/useAncillaryBookingRestriction.ts) are made from the same code. Fetched when the booking UI
// opens. A failed lookup never blocks booking -- the server enforces the pause and answers 403 BOOKING_RESTRICTED.

import { useEffect, useState } from 'react'

export interface RestrictionAnswer {
	restricted: boolean
	message: string | null
}

// The last answer is shared by every screen of a booking (slot page, then confirm page), so one booking asks the server once.
const FRESH_MS = 60_000

export function createBookingRestrictionHook(fetchRestriction: () => Promise<RestrictionAnswer>) {
	let known: (RestrictionAnswer & { at: number }) | null = null
	const freshKnown = () => (known && Date.now() - known.at < FRESH_MS ? known : null)

	return function useBookingRestrictionFor() {
		const [restricted, setRestricted] = useState(() => freshKnown()?.restricted ?? false)
		const [message, setMessage] = useState<string | null>(() => freshKnown()?.message ?? null)

		useEffect(() => {
			if (freshKnown()) return
			let active = true
			fetchRestriction()
				.then((r) => {
					known = { restricted: !!r.restricted, message: r.restricted ? r.message : null, at: Date.now() }
					if (active) {
						setRestricted(known.restricted)
						setMessage(known.message)
					}
				})
				.catch(() => {
					// Keep whatever we knew: the server decides on the booking call itself.
				})
			return () => {
				active = false
			}
		}, [])

		return { restricted, message }
	}
}
