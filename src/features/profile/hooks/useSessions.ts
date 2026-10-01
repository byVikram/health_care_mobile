// Logged-in devices for Login & security: load, log one out, log out all others, and confirm a new login.

import { useCallback, useEffect, useState } from 'react'
import {
	acknowledgeSession,
	getSessions,
	logoutOtherSessions,
	logoutSession,
	type Session,
} from '../../auth/authService'

export function useSessions() {
	const [sessions, setSessions] = useState<Session[]>([])
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)

	const load = useCallback(async () => {
		setError(null)
		try {
			const res = await getSessions()
			setSessions(res.data ?? [])
		} catch (e) {
			setError(e instanceof Error ? e.message : 'Could not load your devices')
		} finally {
			setLoading(false)
		}
	}, [])

	useEffect(() => {
		void load()
	}, [load])

	const logOut = useCallback(async (id: string) => {
		await logoutSession(id)
		setSessions((cur) => cur.filter((s) => s.id !== id))
	}, [])

	const logOutOthers = useCallback(async () => {
		const revoked = await logoutOtherSessions()
		setSessions((cur) => cur.filter((s) => s.is_current))
		return revoked
	}, [])

	const acknowledge = useCallback(async (id: string) => {
		await acknowledgeSession(id)
		setSessions((cur) => cur.map((s) => (s.id === id ? { ...s, is_new: false } : s)))
	}, [])

	return {
		loading,
		error,
		reload: load,
		current: sessions.find((s) => s.is_current) ?? null,
		others: sessions.filter((s) => !s.is_current),
		logOut,
		logOutOthers,
		acknowledge,
	}
}
