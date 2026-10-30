// src/features/ancillary/patient/useScheduledOrder.ts
//
// A scheduled order, loaded when the screen focuses and polled every 15 s while it is focused (a provider gets
// assigned, a visit starts ...). Polling stops after a few failures in a row (`retry` restarts it). Shared by
// Booking details and View visit.

import { useCallback, useEffect, useRef, useState } from 'react'
import { useFocusEffect } from '@react-navigation/native'
import { getAncillaryOrder, type AncillaryOrder } from '../ancillaryProviderBookingService'

const POLL_MS = 15000
const MAX_POLL_FAILURES = 3

export function useScheduledOrder(requestId: string) {
	const [order, setOrder] = useState<AncillaryOrder | null>(null)
	const [loading, setLoading] = useState(true)
	const [failures, setFailures] = useState(0)

	const activeRef = useRef(true)
	const inFlightRef = useRef(false)
	const failuresRef = useRef(0)
	failuresRef.current = failures

	useEffect(() => {
		activeRef.current = true
		return () => {
			activeRef.current = false
		}
	}, [])

	const refresh = useCallback(async () => {
		if (inFlightRef.current) return
		inFlightRef.current = true
		try {
			const o = await getAncillaryOrder(requestId)
			if (!activeRef.current) return
			setOrder(o)
			setFailures(0)
		} catch {
			if (activeRef.current) setFailures((f) => f + 1)
		} finally {
			inFlightRef.current = false
			if (activeRef.current) setLoading(false)
		}
	}, [requestId])

	// Poll while focused; stop after a few failures in a row (the Retry link restarts it).
	useFocusEffect(
		useCallback(() => {
			void refresh()
			const id = setInterval(() => {
				if (failuresRef.current < MAX_POLL_FAILURES) void refresh()
			}, POLL_MS)
			return () => clearInterval(id)
		}, [refresh])
	)

	const retry = () => {
		setFailures(0)
		void refresh()
	}

	return { order, loading, failures, pollStalled: failures >= MAX_POLL_FAILURES, refresh, retry }
}
