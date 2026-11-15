// src/features/app-update/useAppUpdateCheck.ts
//
// The launch check, run by App.tsx behind the splash on every cold start: ONE call to GET /api/lookup/app-config
// with the platform, then the installed build number (expo-application) against the `app_update` it returns.
//
// It never blocks or breaks the app: no network, a slow or failing server, an unknown build number or nothing
// published all end as "nothing to show". The splash waits for `checked`, capped by CHECK_TIMEOUT_MS.

import { useCallback, useEffect, useState } from 'react'
import { Platform } from 'react-native'
import * as Application from 'expo-application'
import { getAppConfig, type AppUpdate } from '../../services/homeService'
import { seedAppConfigFromLaunch } from '../dashboard/useHomeChromeData'
import { updateKind, type UpdateKind } from './appUpdate'

/** Longest the splash waits for the answer; after that the app opens as if there were no update. */
const CHECK_TIMEOUT_MS = 3000

const withTimeout = <T>(work: Promise<T>, ms: number): Promise<T> =>
	new Promise<T>((resolve, reject) => {
		const timer = setTimeout(() => reject(new Error('app update check timed out')), ms)
		work.then(
			(value) => {
				clearTimeout(timer)
				resolve(value)
			},
			(error: unknown) => {
				clearTimeout(timer)
				reject(error)
			}
		)
	})

type CheckState = { checked: boolean; kind: UpdateKind; update: AppUpdate | null }

export function useAppUpdateCheck() {
	const [state, setState] = useState<CheckState>({ checked: false, kind: 'none', update: null })

	useEffect(() => {
		let live = true
		const finish = (next: Partial<CheckState>) => {
			if (live) setState({ checked: true, kind: 'none', update: null, ...next })
		}
		const run = async () => {
			const platform = Platform.OS === 'android' || Platform.OS === 'ios' ? Platform.OS : null
			const installed = Number.parseInt(Application.nativeBuildVersion ?? '', 10)
			if (!platform || !Number.isFinite(installed)) {
				finish({})
				return
			}
			try {
				const config = await withTimeout(getAppConfig(platform), CHECK_TIMEOUT_MS)
				seedAppConfigFromLaunch(config)
				const update = config.app_update ?? null
				finish({ kind: updateKind(installed, update), update })
			} catch {
				// Offline, slow or failing server: carry on without an update prompt.
				finish({})
			}
		}
		void run()
		return () => {
			live = false
		}
	}, [])

	/** "Later" on an optional update: hide it for this launch (the next launch checks again). */
	const dismiss = useCallback(() => setState((prev) => ({ ...prev, kind: 'none' })), [])

	return { ...state, dismiss }
}
