// src/features/ancillary/staff/schedule/usePastVisits.ts
//
// The Past visits list, read from the server with the filters it understands (GET /provider/me/orders: `from`, `to`, `type`, `q`)
// instead of filtering every order in the app, PAST_PAGE_SIZE orders at a time (newest first): `loadMore` reads the next page and adds it
// to the list. What the server cannot say about ONE visit of a booking of several days (it only knows the order's status) stays here:
// the status pill filter and the final cut by date, in buildPast. `q` is typed, so it is waited for. A new filter starts again at page 1.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getProviderOrdersFiltered } from '../../ancillaryProviderBookingService'
import { extractApiErrorMessage } from '../../ancillaryService'
import { normalizeProviderOrder, type ProviderOrderView, type RawProviderOrder } from '../providerOrderView'
import { resolveRange, toScheduleVisits, type PastFilters } from './scheduleModel'

const TYPE_DEBOUNCE_MS = 400
const PAST_PAGE_SIZE = 50

export function usePastVisits(filters: PastFilters, today: string) {
	const [orders, setOrders] = useState<ProviderOrderView[]>([])
	const [total, setTotal] = useState(0)
	const [loading, setLoading] = useState(true)
	const [loadingMore, setLoadingMore] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [needle, setNeedle] = useState(filters.needle.trim())
	const page = useRef(1)
	/** Bumped by every new filter: an answer to an older question is dropped. */
	const generation = useRef(0)

	useEffect(() => {
		const t = setTimeout(() => setNeedle(filters.needle.trim()), TYPE_DEBOUNCE_MS)
		return () => clearTimeout(t)
	}, [filters.needle])

	const { from, to } = resolveRange(filters, today)
	// "All time" has no start: the server reads a date, and year 0 is not one.
	const fromParam = from.startsWith('0000') ? undefined : from
	const type = filters.type === 'all' ? undefined : (filters.type.toUpperCase() as 'INSTANT' | 'SCHEDULED')

	const read = useCallback(
		async (next: number) => {
			const mine = generation.current
			try {
				const res = await getProviderOrdersFiltered({
					from: fromParam,
					to,
					type,
					q: needle || undefined,
					page: next,
					page_size: PAST_PAGE_SIZE,
				})
				if (mine !== generation.current) return
				const list = (Array.isArray(res.orders) ? (res.orders as RawProviderOrder[]) : [])
					.map(normalizeProviderOrder)
					.filter((o) => !!o.id)
				page.current = next
				setTotal(res.total)
				setOrders((prev) => {
					if (next === 1) return list
					const seen = new Set(prev.map((o) => o.id))
					return [...prev, ...list.filter((o) => !seen.has(o.id))]
				})
				setError(null)
			} catch (e) {
				if (mine === generation.current) setError(extractApiErrorMessage(e, 'Could not load your past visits.'))
			} finally {
				if (mine === generation.current) {
					setLoading(false)
					setLoadingMore(false)
				}
			}
		},
		[fromParam, to, type, needle]
	)

	useEffect(() => {
		generation.current += 1
		page.current = 1
		setLoading(true)
		setLoadingMore(false)
		void read(1)
	}, [read])

	const hasMore = orders.length < total
	const loadMore = useCallback(() => {
		if (loading || loadingMore || !hasMore) return
		setLoadingMore(true)
		void read(page.current + 1)
	}, [loading, loadingMore, hasMore, read])

	const visits = useMemo(() => toScheduleVisits(orders, today), [orders, today])

	return { visits, loading, loadingMore, hasMore, loadMore, error }
}
