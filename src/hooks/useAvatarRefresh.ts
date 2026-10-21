// Photos reach the app as signed links that stop working after an hour, so a screen that stays open (or an app that
// stays in the background) must fetch fresh ones. This calls `refresh` every 50 minutes and whenever the app comes
// back to the foreground. `refresh` should reload quietly (no spinner) and replace the links it holds.

import { useEffect, useRef } from 'react'
import { AppState } from 'react-native'

export const AVATAR_REFRESH_MS = 50 * 60 * 1000 // the signed link lasts an hour

export function useAvatarRefresh(refresh: () => void | Promise<void>, enabled: boolean = true) {
	const latest = useRef(refresh)
	useEffect(() => {
		latest.current = refresh
	})

	useEffect(() => {
		if (!enabled) return
		const run = () => {
			void Promise.resolve(latest.current()).catch(() => {
				// keep what is shown; the next refresh tries again
			})
		}
		const timer = setInterval(run, AVATAR_REFRESH_MS)
		const subscription = AppState.addEventListener('change', (state) => {
			if (state === 'active') run()
		})
		return () => {
			clearInterval(timer)
			subscription.remove()
		}
	}, [enabled])
}
