// src/features/ancillary/staff/schedule/useProviderSchedule.ts
//
// Loads what the provider Schedule shows: the visits she holds (GET /provider/me/orders, all of them) and the open jobs
// (GET /provider/me/open-jobs: "Needed now" and "Open near you"). Re-reads on focus and every minute while the screen is on show;
// `reload` is for pull-to-refresh and after an action. A failed open-jobs read keeps the last list instead of blanking it.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useIsFocused } from '@react-navigation/native'
import { getProviderScheduledOrders } from '../../ancillaryProviderBookingService'
import { extractApiErrorMessage } from '../../ancillaryService'
import { getOpenJobs, type OpenJobs } from '../../providerOpenJobsService'
import { normalizeProviderOrder, type RawProviderOrder } from '../providerOrderView'
import { toScheduleVisits, todayIso } from './scheduleModel'

const REFRESH_MS = 60_000
const NO_OPEN_JOBS: OpenJobs = { needed: [], nearby: [] }

export function useProviderSchedule() {
	const isFocused = useIsFocused()
	const [orders, setOrders] = useState<ReturnType<typeof normalizeProviderOrder>[]>([])
	const [openJobs, setOpenJobs] = useState<OpenJobs>(NO_OPEN_JOBS)
	const [loading, setLoading] = useState(false)
	const [loaded, setLoaded] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [today, setToday] = useState(todayIso)
	const seq = useRef(0)

	const reload = useCallback(async () => {
		const mine = ++seq.current
		setLoading(true)
		try {
			const [raw, jobs] = await Promise.all([getProviderScheduledOrders('ALL'), getOpenJobs().catch(() => null)])
			if (mine !== seq.current) return
			const list = Array.isArray(raw) ? (raw as RawProviderOrder[]) : []
			setOrders(list.map(normalizeProviderOrder).filter((o) => !!o.id))
			if (jobs) setOpenJobs(jobs)
			setError(null)
			setToday(todayIso())
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

	return { visits, openJobs, today, loading, loaded, error, reload }
}
