// src/features/doctor/dashboard/useDoctorStatus.ts
//
// The doctor's profile / verification state (GET /api/doctors/me/status) for DoctorStatusBanner. Read every time the
// screen is shown and every time the app comes back to it (a bottom-tab screen stays focused while the app is in the
// background), so the banner is gone as soon as an admin has approved the doctor. A failed call keeps what was shown.

import { useCallback, useEffect, useState } from 'react'
import { AppState } from 'react-native'
import { useFocusEffect } from '@react-navigation/native'

import { getDoctorStatus } from '../doctorService'
import type { DoctorStatus } from './DoctorStatusBanner'

export function useDoctorStatus() {
	// Null until the first answer (the banner shows nothing then), and if it never comes.
	const [status, setStatus] = useState<DoctorStatus | null>(null)

	const reload = useCallback(async () => {
		try {
			setStatus(await getDoctorStatus())
		} catch {
			// Non-fatal: the banner just stays as it was.
		}
	}, [])

	useFocusEffect(
		useCallback(() => {
			void reload()
		}, [reload])
	)

	useEffect(() => {
		const sub = AppState.addEventListener('change', (state) => {
			if (state === 'active') void reload()
		})
		return () => sub.remove()
	}, [reload])

	return { status, reload }
}
