// src/features/ancillary/staff/schedule/useProviderSchedule.ts
//
// Loads what the provider Schedule shows: the visits she holds (GET /provider/me/orders, only the window the screen shows: yesterday to
// SCHEDULE_AHEAD_DAYS ahead, plus every order still active; the history is the Past view's, which pages) and the open jobs
// (GET /provider/me/open-jobs: "Needed now" and "Open near you"). Re-reads on focus and every minute while the screen is on show;
// `reload` is for pull-to-refresh and after an action. A failed open-jobs read keeps the last list instead of blanking it.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useIsFocused } from '@react-navigation/native'
import { getProviderScheduleOrders } from '../../ancillaryProviderBookingService'
import { extractApiErrorMessage } from '../../ancillaryService'
import { getOpenJobs, type OpenJobs } from '../../providerOpenJobsService'
import { getProviderOnlineStatus } from '../../providerVisitService'
import { normalizeProviderOrder, type RawProviderOrder } from '../providerOrderView'
import { addDaysIso, toScheduleVisits, todayIso } from './scheduleModel'

const REFRESH_MS = 60_000
/** The Schedule's calendar reaches two months ahead: ask for that far, not for everything. */
const SCHEDULE_AHEAD_DAYS = 70
const NO_OPEN_JOBS: OpenJobs = { needed: [], nearby: [] }

/** The open jobs, or null when they could not be read (the caller keeps the list it had). */
const readOpenJobs = async (): Promise<OpenJobs | null> => {
	try {
		return await getOpenJobs()
	} catch {
		return null
	}
}

/** Whether she is online (the Today switch), or null when it could not be read. */
const readOnline = async (): Promise<boolean | null> => {
	try {
		return await getProviderOnlineStatus({ silent: true })
	} catch {
		return null
	}
}

export function useProviderSchedule() {
	const isFocused = useIsFocused()
	const [orders, setOrders] = useState<ReturnType<typeof normalizeProviderOrder>[]>([])
	const [openJobs, setOpenJobs] = useState<OpenJobs>(NO_OPEN_JOBS)
	const [loading, setLoading] = useState(false)
	const [loaded, setLoaded] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [today, setToday] = useState(todayIso)
	/** null until the server answers (or when it cannot be read): treated as "not known", never as offline. */
	const [online, setOnline] = useState<boolean | null>(null)
	const seq = useRef(0)

	const reload = useCallback(async () => {
		const mine = ++seq.current
		setLoading(true)
		try {
			const now = todayIso()
			const [raw, jobs, isOnline] = await Promise.all([
				getProviderScheduleOrders(addDaysIso(now, -1), addDaysIso(now, SCHEDULE_AHEAD_DAYS)),
				readOpenJobs(),
				readOnline(),
			])
			if (mine !== seq.current) return
			if (isOnline !== null) setOnline(isOnline)
			const list = Array.isArray(raw) ? (raw as RawProviderOrder[]) : []
			setOrders(list.map(normalizeProviderOrder).filter((o) => !!o.id))
			if (jobs) setOpenJobs(jobs)
			setError(null)
			setToday(now)
		} catch (e) {
			if (mine !== seq.current) return
			setError(extractApiErrorMessage(e, 'Could not load your schedule.'))
		} finally {
			if (mine === seq.current) {
				setLoading(false)
				setLoaded(true)
			}
		}
	}, [])

	useEffect(() => {
		if (!isFocused) return
		void reload()
		const t = setInterval(() => void reload(), REFRESH_MS)
		return () => clearInterval(t)
	}, [isFocused, reload])

	const visits = useMemo(() => toScheduleVisits(orders, today), [orders, today])

	return { visits, openJobs, today, online, loading, loaded, error, reload }
}
