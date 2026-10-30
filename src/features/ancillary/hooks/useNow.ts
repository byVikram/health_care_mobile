// src/features/ancillary/hooks/useNow.ts
//
// The current time, refreshed every minute while the screen is mounted, so "too soon" slots and "can still be
// cancelled" stay right on a screen that is left open.

import { useEffect, useState } from 'react'

export function useNow(intervalMs = 60000) {
	const [now, setNow] = useState(() => new Date())
	useEffect(() => {
		const id = setInterval(() => setNow(new Date()), intervalMs)
		return () => clearInterval(id)
	}, [intervalMs])
	return now
}
