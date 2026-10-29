// src/features/appointment/useBookingRestriction.ts
//
// Whether online booking is paused for the signed-in patient (patient no-show policy). Fetched when the booking UI
// opens. A failed lookup never blocks booking -- the server enforces the pause and answers 403 BOOKING_RESTRICTED.

import { useEffect, useState } from 'react'
import { getBookingRestriction } from '../../services/appointmentService'

// The last answer, shared by every screen of a booking (slot page, then confirm page) so one booking asks the server once.
const FRESH_MS = 60_000
let known: { restricted: boolean; message: string | null; at: number } | null = null
const freshKnown = () => (known && Date.now() - known.at < FRESH_MS ? known : null)

export function useBookingRestriction() {
	const [restricted, setRestricted] = useState(() => freshKnown()?.restricted ?? false)
	const [message, setMessage] = useState<string | null>(() => freshKnown()?.message ?? null)

	useEffect(() => {
		if (freshKnown()) return
		let active = true
		getBookingRestriction()
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
