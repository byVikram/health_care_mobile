// src/features/ancillary/staff/availability/useProviderAvailability.ts
//
// State + API calls behind the provider's availability screen (Schedule tab):
//   weekly hours, visit length and travel radius  -> one draft, saved together with the Save button
//   date overrides (leave / different hours)      -> saved / removed immediately
//   booked visits per date                        -> confirmed orders, so the override sheet can warn
// Endpoints (all under /api/ancillary/provider/me/availability, see ancillaryProfileService.ts):
//   GET/PUT weekly schedule, GET/POST overrides, DELETE overrides/{id}; travel radius = PUT /me/profile
//   geofence_radius_km.
import { useCallback, useEffect, useMemo, useState } from 'react'
import Toast from 'react-native-toast-message'
import { useAncillarySpecialty } from '../../../../context/AuthContext'
import { getProviderScheduledOrders } from '../../ancillaryProviderBookingService'
import { fetchProviderProfile } from '../../ancillaryService'
import {
	ancillaryOverrideBodies,
	ancillaryScheduleToWeek,
	groupAncillaryOverrides,
	weekToAncillarySchedules,
	type AncillaryOverrideRow,
} from '../../../profile/availability/availabilityAdapters'
import {
	DAY_FULL,
	SECTION_DEFAULT_RANGE,
	cloneWeek,
	emptyDay,
	toIsoDate,
	weekHasErrors,
	type DateOverride,
	type WeekSections,
} from '../../../profile/availability/availabilityUtils'
import { ancillaryConfigFor } from '../../../profile/config/ancillaryProfileConfig'
import {
	createProviderOverride,
	deleteProviderOverride,
	fetchProviderOverrides,
	fetchProviderSchedule,
	saveProviderSchedule,
	saveProviderTravelRadius,
} from '../../../profile/ancillary/ancillaryProfileService'
import { useProfileForm } from '../../../profile/hooks/useProfileForm'

export interface ProviderAvailabilityDraft {
	week: WeekSections
	/** Visit / session / shift length in minutes. */
	unit: number
	/** Travel radius in km. */
	travel: number
}

const WEEKDAYS = [1, 2, 3, 4, 5]
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)
const FINISHED = /^(COMPLETED|CANCEL|EXPIRED|FAILED|UNASSIGNED)/

export function useProviderAvailability() {
	const { specialtyId } = useAncillarySpecialty()
	const config = ancillaryConfigFor(specialtyId)

	const [day, setDay] = useState(1)
	const [rows, setRows] = useState<AncillaryOverrideRow[]>([])
	const [bookedByDate, setBookedByDate] = useState<Record<string, number>>({})
	const [actionError, setActionError] = useState<string | null>(null)

	const load = useCallback(async (): Promise<ProviderAvailabilityDraft> => {
		const [schedule, profile] = await Promise.all([fetchProviderSchedule(), fetchProviderProfile()])
		const { week, slotDuration } = ancillaryScheduleToWeek(schedule)
		return {
			week,
			unit: slotDuration ?? config.defaultUnit,
			travel: Math.round(profile?.geofence_radius_km ?? profile?.geofence_radius ?? config.travelOptions[1]),
		}
	}, [config])

	const save = useCallback(async (draft: ProviderAvailabilityDraft, saved: ProviderAvailabilityDraft) => {
		if (!same(draft.week, saved.week) || draft.unit !== saved.unit) {
			await saveProviderSchedule(weekToAncillarySchedules(draft.week, draft.unit))
		}
		if (draft.travel !== saved.travel) await saveProviderTravelRadius(draft.travel)
		return draft
	}, [])

	const form = useProfileForm<ProviderAvailabilityDraft>({ load, save, successMessage: 'Availability saved' })
	const { draft } = form

	const invalid = useMemo(() => !!draft && weekHasErrors(draft.week), [draft])

	const setWeek = (next: WeekSections) => form.setDraft((cur) => (cur ? { ...cur, week: next } : cur))

	const toggleDay = (on: boolean) => {
		if (!draft) return
		const next = cloneWeek(draft.week)
		next[day] = on ? { ...emptyDay(), morning: [SECTION_DEFAULT_RANGE.morning] } : emptyDay()
		setWeek(next)
	}

	const changeDay = (sections: WeekSections[number]) => {
		if (!draft) return
		const next = cloneWeek(draft.week)
		next[day] = sections
		setWeek(next)
	}

	const copyToWeekdays = () => {
		if (!draft) return
		const next = cloneWeek(draft.week)
		for (const d of WEEKDAYS) next[d] = JSON.parse(JSON.stringify(draft.week[day]))
		setWeek(next)
		Toast.show({ type: 'success', text1: `${DAY_FULL[day]}'s hours copied to Monday–Friday` })
	}

	// ── Date overrides (immediate) ───────────────────────────────────────────
	const loadOverrides = useCallback(async () => {
		try {
			setRows(await fetchProviderOverrides())
		} catch {
			// The weekly tab still works; the list just stays empty.
		}
	}, [])

	const loadBooked = useCallback(async () => {
		try {
			const orders = await getProviderScheduledOrders('CONFIRMED')
			const counts: Record<string, number> = {}
			for (const order of orders) {
				for (const v of order.visits ?? []) {
					if (!v.date || FINISHED.test(String(v.status ?? '').toUpperCase())) continue
					counts[v.date] = (counts[v.date] ?? 0) + 1
				}
			}
			setBookedByDate(counts)
		} catch {
			// Warning is a nicety; saving an override does not depend on it.
		}
	}, [])

	useEffect(() => {
		void loadOverrides()
		void loadBooked()
	}, [loadOverrides, loadBooked])

	const today = toIsoDate(new Date())
	const overrides = useMemo(() => groupAncillaryOverrides(rows).filter((o) => o.date >= today), [rows, today])

	const deleteRows = async (ids: number[]) => {
		for (const id of ids) await deleteProviderOverride(id)
	}

	/** Replaces `initial` (when editing) with the new override; shows an error modal on failure. */
	const saveOverride = async (
		o: Pick<DateOverride, 'date' | 'off' | 'ranges' | 'note'>,
		initial: DateOverride | null
	): Promise<boolean> => {
		try {
			if (initial) await deleteRows(initial.ids)
			for (const body of ancillaryOverrideBodies(o)) await createProviderOverride(body)
			Toast.show({ type: 'success', text1: 'Date override saved' })
			return true
		} catch (e) {
			setActionError(e instanceof Error ? e.message : 'Please try again.')
			return false
		} finally {
			await loadOverrides()
		}
	}

	const removeOverride = async (o: DateOverride): Promise<void> => {
		try {
			await deleteRows(o.ids)
			Toast.show({ type: 'success', text1: 'Date override removed' })
		} catch (e) {
			setActionError(e instanceof Error ? e.message : 'Please try again.')
		} finally {
			await loadOverrides()
		}
	}

	return {
		config,
		form,
		draft,
		invalid,
		day,
		setDay,
		toggleDay,
		changeDay,
		copyToWeekdays,
		setUnit: (unit: number) => form.setDraft((cur) => (cur ? { ...cur, unit } : cur)),
		setTravel: (travel: number) => form.setDraft((cur) => (cur ? { ...cur, travel } : cur)),
		overrides,
		bookedByDate,
		saveOverride,
		removeOverride,
		actionError,
		clearActionError: () => setActionError(null),
	}
}
