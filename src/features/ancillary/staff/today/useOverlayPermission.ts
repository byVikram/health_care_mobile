// src/features/ancillary/staff/today/useOverlayPermission.ts
//
// Whether the provider still has to allow "Display over other apps", which a new instant request needs to appear as a card over
// whatever is on screen (a ride-request style card). The ring and the lock-screen card work without it, so this is only a prompt.
// Re-checked whenever the app comes back to the front, which is when the provider returns from Android's settings page.
// `needed` is false on a build without the native ring (and on iOS), so nothing is shown there.
import { useCallback, useEffect, useState } from 'react'
import { AppState } from 'react-native'
import { canShowOverOtherApps, hasNativeRing, openOverlaySettings } from '../../../../services/offerNotification'

export function useOverlayPermission() {
	const [needed, setNeeded] = useState(false)

	const check = useCallback(async () => {
		if (!hasNativeRing()) return
		setNeeded(!(await canShowOverOtherApps()))
	}, [])

	useEffect(() => {
		void check()
		const sub = AppState.addEventListener('change', (state) => {
			if (state === 'active') void check()
		})
		return () => sub.remove()
	}, [check])

	return { needed, open: openOverlaySettings }
}
