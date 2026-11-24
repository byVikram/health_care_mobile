// src/features/ancillary/staff/schedule/usePastVisits.ts
//
// The Past visits list, read from the server with the filters it understands (GET /provider/me/orders: `from`, `to`, `type`, `q`)
// instead of filtering every order in the app. What the server cannot say about ONE visit of a booking of several days (it only knows
// the order's status) stays here: the status pill filter and the final cut by date, in buildPast. `q` is typed, so it is waited for.
import { useEffect, useState } from 'react'
import { getProviderOrdersFiltered } from '../../ancillaryProviderBookingService'
import { extractApiErrorMessage } from '../../ancillaryService'
import { normalizeProviderOrder, type RawProviderOrder } from '../providerOrderView'
import { resolveRange, toScheduleVisits, type PastFilters, type ScheduleVisit } from './scheduleModel'

const TYPE_DEBOUNCE_MS = 400

export function usePastVisits(filters: PastFilters, today: string) {
	const [visits, setVisits] = useState<ScheduleVisit[]>([])
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const [needle, setNeedle] = useState(filters.needle.trim())

	useEffect(() => {
		const t = setTimeout(() => setNeedle(filters.needle.trim()), TYPE_DEBOUNCE_MS)
		return () => clearTimeout(t)
	}, [filters.needle])

	const { from, to } = resolveRange(filters, today)
	// "All time" has no start: the server reads a date, and year 0 is not one.
	const fromParam = from.startsWith('0000') ? undefined : from
	const type = filters.type === 'all' ? undefined : (filters.type.toUpperCase() as 'INSTANT' | 'SCHEDULED')

	useEffect(() => {
		let active = true
		const run = async () => {
			setLoading(true)
			try {
				const { orders } = await getProviderOrdersFiltered({
					from: fromParam,
					to,
					type,
					q: needle || undefined,
				})
				if (!active) return
				const list = (Array.isArray(orders) ? (orders as RawProviderOrder[]) : [])
					.map(normalizeProviderOrder)
					.filter((o) => !!o.id)
				setVisits(toScheduleVisits(list, today))
				setError(null)
			} catch (e) {
				if (active) setError(extractApiErrorMessage(e, 'Could not load your past visits.'))
			} finally {
				if (active) setLoading(false)
			}
		}
		void run()
		return () => {
			active = false
		}
	}, [fromParam, to, type, needle, today])

	return { visits, loading, error }
}
