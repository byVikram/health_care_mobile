// Availability for doctors: hours per hospital / clinic and per mode (in clinic or video). Ancillary providers keep no schedule
// (only the online switch on Today); their profile row opens TravelRadiusPage instead.
//   Weekly hours  -- pick a day, turn it on, then add Morning / Afternoon / Evening time ranges; "Copy to
//                    all weekdays"; slot length. Saved with the footer button.
//   Special days -- leave / unavailable, a break, or different hours for one date. Each save / delete is immediate.

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import Toast from 'react-native-toast-message'
import {
	AppButton,
	AppConfirmSheet,
	AppFormCard,
	AppSaveFooter,
	AppSegmentedControl,
	AppToggle,
} from '../../../components/common'
import { APP_COLORS } from '../../../config/theme'
import { useAuth } from '../../../context/AuthContext'
import {
	createDoctorOverride,
	deleteDoctorOverride,
	fetchDoctorHospitals,
	fetchDoctorOverrides,
	saveDoctorWeeklyHours,
} from '../doctor/doctorProfileService'
import TravelRadiusPage from '../ancillary/TravelRadiusPage'
import { useProfileForm } from '../hooks/useProfileForm'
import { ProfileScreen } from '../shared/components/ProfileScreen'
import {
	DAY_FULL,
	SECTION_DEFAULT_RANGE,
	cloneWeek,
	dayRanges,
	daySummary,
	emptyDay,
	isDayOn,
	parseIsoDate,
	toIsoDate,
	weekHasErrors,
	type DateOverride,
	type TimeRange,
	type WeekSections,
} from './availabilityUtils'
import {
	doctorAvailabilityToWeek,
	doctorOverridePayload,
	groupDoctorOverrides,
	weeksToDoctorAvailability,
	type DoctorMode,
	type DoctorOverrideRow,
} from './availabilityAdapters'
import { DayStrip } from './components/DayStrip'
import { DaySections } from './components/DaySections'
import { SlotLengthCard } from './components/SlotLengthCard'
import { OverrideList } from './components/OverrideList'
import { OverrideSheet } from './components/OverrideSheet'
import { ClinicPickerSheet } from './components/ClinicPickerSheet'
import { showStatusModal } from '../../../services/apiService'

type Place = { id: string; name: string }

interface AvailabilityDraft {
	weeks: Record<string, Record<DoctorMode, WeekSections>>
	slots: Record<string, Record<DoctorMode, number>>
}

const DOCTOR_SLOTS = [10, 15, 20, 30]
const MODE_OPTIONS: { value: DoctorMode; label: string }[] = [
	{ value: 'clinic', label: 'In clinic' },
	{ value: 'video', label: 'Video' },
]
const WEEKDAYS = [1, 2, 3, 4, 5]

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

/** Doctors set hours per clinic; an ancillary provider only sets how far they travel. */
export default function AvailabilityPage() {
	const { role } = useAuth()
	return role === 'doctor' ? <DoctorAvailabilityPage /> : <TravelRadiusPage />
}

function DoctorAvailabilityPage() {
	const [places, setPlaces] = useState<Place[]>([])
	const [placeId, setPlaceId] = useState<string>('')
	const [mode, setMode] = useState<DoctorMode>('clinic')
	const [tab, setTab] = useState<'week' | 'dates'>('week')
	const [day, setDay] = useState(1)
	// "Same hours Mon–Fri": while on, an edit to any weekday is applied to all five weekdays
	const [sameHours, setSameHours] = useState(false)
	const [pickerOpen, setPickerOpen] = useState(false)

	const [doctorRows, setDoctorRows] = useState<DoctorOverrideRow[]>([])
	const [sheet, setSheet] = useState<{ initial: DateOverride | null } | null>(null)
	const [removing, setRemoving] = useState<DateOverride | null>(null)

	// ── Weekly hours (draft + footer save) ───────────────────────────────────
	const load = useCallback(async (): Promise<AvailabilityDraft> => {
		const hospitals = await fetchDoctorHospitals()
		const list = hospitals
			.filter((h) => h.hospital?.id)
			.map((h) => ({
				id: h.hospital!.id,
				name: h.hospital!.name || 'Clinic',
				primary: !!h.is_primary,
				availability: h.availability,
			}))
			.sort((a, b) => Number(b.primary) - Number(a.primary))
		setPlaces(list.map(({ id, name }) => ({ id, name })))
		setPlaceId((cur) => (list.some((p) => p.id === cur) ? cur : (list[0]?.id ?? '')))
		const weeks: AvailabilityDraft['weeks'] = {}
		const slots: AvailabilityDraft['slots'] = {}
		for (const p of list) {
			const clinic = doctorAvailabilityToWeek(p.availability, 'clinic')
			const video = doctorAvailabilityToWeek(p.availability, 'video')
			weeks[p.id] = { clinic: clinic.week, video: video.week }
			slots[p.id] = { clinic: clinic.slotDuration ?? 15, video: video.slotDuration ?? 15 }
		}
		return { weeks, slots }
	}, [])

	const save = useCallback(async (draft: AvailabilityDraft, saved: AvailabilityDraft) => {
		for (const id of Object.keys(draft.weeks)) {
			if (same(draft.weeks[id], saved.weeks[id]) && same(draft.slots[id], saved.slots[id])) continue
			await saveDoctorWeeklyHours(id, weeksToDoctorAvailability(draft.weeks[id], draft.slots[id]))
		}
		return draft
	}, [])

	const form = useProfileForm<AvailabilityDraft>({ load, save, successMessage: 'Availability saved' })
	const { draft } = form
	const week = draft?.weeks[placeId]?.[mode]

	const placeName = (id: string) => places.find((p) => p.id === id)?.name ?? 'Clinic'

	/**
	 * The same day's ranges of the SAME kind at other places, for clash checks (two clinics at once). Video and
	 * in-clinic hours may share a time: a booking of either one takes that time for both.
	 */
	const othersFor = useCallback(
		(pid: string, m: DoctorMode, d: number): { place: string; range: TimeRange }[] => {
			if (!draft) return []
			const out: { place: string; range: TimeRange }[] = []
			for (const [otherId, modes] of Object.entries(draft.weeks)) {
				for (const otherMode of [m]) {
					if (otherId === pid) continue
					const label = `${placeName(otherId).split(',')[0]}${otherMode === 'video' ? ' (video)' : ''}`
					for (const range of dayRanges(modes[otherMode][d])) out.push({ place: label, range })
				}
			}
			return out
		},
		[draft, places]
	)

	const invalid = useMemo(() => {
		if (!draft) return false
		return Object.entries(draft.weeks).some(([pid, modes]) =>
			(['clinic', 'video'] as DoctorMode[]).some((m) => weekHasErrors(modes[m], (d) => othersFor(pid, m, d)))
		)
	}, [draft, othersFor])

	const setWeek = (next: WeekSections) =>
		form.setDraft((cur) =>
			cur
				? {
						...cur,
						weeks: { ...cur.weeks, [placeId]: { ...cur.weeks[placeId], [mode]: next } },
					}
				: cur
		)

	const setSlot = (minutes: number) =>
		form.setDraft((cur) =>
			cur
				? {
						...cur,
						slots: { ...cur.slots, [placeId]: { ...cur.slots[placeId], [mode]: minutes } },
					}
				: cur
		)

	/** Put `value` on day `d`; with "Same hours Mon–Fri" on, a weekday's value goes to every weekday. */
	const setDayValue = (d: number, value: WeekSections[number]) => {
		if (!week) return
		const next = cloneWeek(week)
		const targets = sameHours && WEEKDAYS.includes(d) ? WEEKDAYS : [d]
		for (const t of targets) next[t] = JSON.parse(JSON.stringify(value))
		setWeek(next)
	}

	const toggleDay = (on: boolean) =>
		setDayValue(day, on ? { ...emptyDay(), morning: [SECTION_DEFAULT_RANGE.morning] } : emptyDay())

	const toggleSameHours = (on: boolean) => {
		setSameHours(on)
		if (!on || !week) return
		// Turning it on makes the selected weekday (Monday when a weekend day is open) the shared set of hours.
		const source = WEEKDAYS.includes(day) ? day : 1
		const next = cloneWeek(week)
		for (const d of WEEKDAYS) next[d] = JSON.parse(JSON.stringify(week[source]))
		setWeek(next)
	}

	// ── Date overrides (immediate) ───────────────────────────────────────────
	const loadOverrides = useCallback(async () => {
		try {
			setDoctorRows(await fetchDoctorOverrides())
		} catch {
			// The weekly tab still works; the list just stays empty.
		}
	}, [])

	useEffect(() => {
		void loadOverrides()
	}, [loadOverrides])

	const today = toIsoDate(new Date())
	const overrides = useMemo(
		() => groupDoctorOverrides(doctorRows, placeId, mode).filter((o) => o.date >= today),
		[doctorRows, placeId, mode, today]
	)

	const offLabel = 'Unavailable all day'

	const deleteRows = async (ids: number[]) => {
		for (const id of ids) await deleteDoctorOverride(id)
	}

	const saveOverride = async (o: Pick<DateOverride, 'date' | 'off' | 'ranges' | 'note'>) => {
		try {
			if (sheet?.initial) await deleteRows(sheet.initial.ids)
			await createDoctorOverride(
				doctorOverridePayload(placeId, mode, o, week ? dayRanges(week[parseIsoDate(o.date).getDay()]) : [])
			)
			setSheet(null)
			Toast.show({ type: 'success', text1: 'Special day saved' })
		} catch (e) {
			showStatusModal({
				status: 'error',
				title: "Couldn't update availability",
				description: e instanceof Error ? e.message : 'Please try again.',
				submitText: 'OK',
			})
		} finally {
			await loadOverrides()
		}
	}

	const removeOverride = async () => {
		if (!removing) return
		try {
			await deleteRows(removing.ids)
			Toast.show({ type: 'success', text1: 'Special day removed' })
		} catch (e) {
			showStatusModal({
				status: 'error',
				title: "Couldn't update availability",
				description: e instanceof Error ? e.message : 'Please try again.',
				submitText: 'OK',
			})
		} finally {
			setRemoving(null)
			await loadOverrides()
		}
	}

	const currentSlot = draft?.slots[placeId]?.[mode]

	return (
		<ProfileScreen
			title="Availability"
			subtitle="Hours are set per clinic"
			loading={form.loading}
			loadError={form.loadError}
			onRetry={form.reload}
			saveError={form.saveError}
			onDismissSaveError={form.clearSaveError}
			footer={
				tab === 'week' && places.length > 0 ? (
					<AppSaveFooter
						onSave={form.submit}
						dirty={form.dirty}
						saving={form.saving}
						invalid={invalid}
						label="Save availability"
						invalidLabel="Fix the highlighted times"
					/>
				) : null
			}
			overlays={
				<>
					<ClinicPickerSheet
						visible={pickerOpen}
						onClose={() => setPickerOpen(false)}
						clinics={places.map((p) => ({
							id: p.id,
							name: p.name,
							summary: draft
								? `${[1, 2, 3, 4, 5, 6, 0].filter((d) => isDayOn(draft.weeks[p.id].clinic[d]) || isDayOn(draft.weeks[p.id].video[d])).length} days a week`
								: '',
						}))}
						selectedId={placeId}
						onSelect={setPlaceId}
					/>
					<OverrideSheet
						visible={!!sheet}
						onClose={() => setSheet(null)}
						initial={sheet?.initial ?? null}
						takenDates={overrides.map((o) => o.date)}
						offLabel={offLabel}
						subtitle={`Only for ${placeName(placeId)} · ${mode === 'clinic' ? 'in clinic' : 'video'}`}
						allowNote={false}
						weeklyRanges={(iso) => (week ? dayRanges(week[parseIsoDate(iso).getDay()]) : [])}
						onSave={saveOverride}
					/>
					<AppConfirmSheet
						visible={!!removing}
						onClose={() => setRemoving(null)}
						title="Remove this special day?"
						message="Your weekly hours will apply on this date again."
						confirmLabel="Remove"
						onConfirm={removeOverride}
					/>
				</>
			}
		>
			{places.length === 0 ? (
				<AppFormCard
					title="No hospitals or clinics yet"
					helper="Add a place you consult at first, then set its hours here."
				/>
			) : (
				draft &&
				week && (
					<>
						<View style={styles.placeCard}>
							<AppSegmentedControl
								options={MODE_OPTIONS}
								value={mode}
								onChange={setMode}
								accessibilityLabel="Appointment type"
							/>
							<Text style={[styles.eyebrow, mode === 'video' && styles.placeOff]}>SCHEDULE FOR</Text>
							<TouchableOpacity
								style={[styles.placeRow, mode === 'video' && styles.placeRowOff]}
								onPress={() => setPickerOpen(true)}
								// Video calls aren't tied to a clinic, so the card is greyed out and can't be changed there.
								disabled={places.length < 2 || mode === 'video'}
								accessibilityRole="button"
								accessibilityState={{ disabled: places.length < 2 || mode === 'video' }}
								accessibilityLabel={`Schedule for ${placeName(placeId)}. Change clinic`}
								accessibilityHint={mode === 'video' ? 'Not used for video calls' : undefined}
							>
								<MaterialCommunityIcons name="hospital-building" size={22} color={APP_COLORS.primary} />
								<Text style={styles.placeName} numberOfLines={1}>
									{placeName(placeId)}
								</Text>
								{places.length > 1 && <Text style={styles.change}>Change</Text>}
							</TouchableOpacity>
						</View>

						<View style={styles.tabs}>
							<AppSegmentedControl
								options={[
									{ value: 'week', label: 'Weekly hours' },
									{ value: 'dates', label: 'Special days' },
								]}
								value={tab}
								onChange={setTab}
								shape="rounded"
								tabs
								accessibilityLabel="Schedule view"
							/>
						</View>

						{tab === 'week' ? (
							<AppFormCard
								title="Weekly hours"
								helper="Pick a day, then add one or more time ranges, e.g. 9–10 AM and 11 AM–12 PM."
							>
								<SlotLengthCard
									options={DOCTOR_SLOTS}
									value={currentSlot}
									onChange={setSlot}
									sameHours={sameHours}
									onSameHoursChange={toggleSameHours}
								/>
								<DayStrip week={week} selected={day} onSelect={setDay} />
								<View style={styles.dayHead}>
									<View style={styles.flex}>
										<Text style={styles.dayTitle}>{DAY_FULL[day]}</Text>
										<Text style={styles.daySub}>{daySummary(week[day])}</Text>
									</View>
									<AppToggle
										value={isDayOn(week[day])}
										onValueChange={toggleDay}
										accessibilityLabel={`Available on ${DAY_FULL[day]}`}
									/>
								</View>
								{isDayOn(week[day]) ? (
									<DaySections
										day={week[day]}
										onChange={(next) => setDayValue(day, next)}
										others={othersFor(placeId, mode, day)}
									/>
								) : (
									<Text style={styles.offText}>
										No bookings on {DAY_FULL[day]}s. Turn on to add hours.
									</Text>
								)}
							</AppFormCard>
						) : (
							<AppFormCard
								title="Special days"
								helper="Time off, a break, or different hours on one particular day at this clinic."
							>
								<OverrideList
									overrides={overrides}
									offLabel={offLabel}
									onEdit={(o) => setSheet({ initial: o })}
									onRemove={setRemoving}
								/>
								<AppButton
									variant="outline"
									size="md"
									icon="calendar-plus"
									onPress={() => setSheet({ initial: null })}
								>
									Add a special day
								</AppButton>
							</AppFormCard>
						)}
					</>
				)
			)}
		</ProfileScreen>
	)
}

const styles = StyleSheet.create({
	flex: {
		flex: 1,
	},
	placeCard: {
		backgroundColor: APP_COLORS.surface,
		padding: 16,
		gap: 10,
	},
	eyebrow: {
		fontSize: 12,
		lineHeight: 16,
		fontWeight: '800',
		letterSpacing: 0.7,
		color: APP_COLORS.inkMuted,
	},
	placeRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
		padding: 12,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: APP_COLORS.divider,
	},
	// Video mode: the clinic doesn't apply, so the card reads as unavailable.
	placeOff: {
		opacity: 0.45,
	},
	placeRowOff: {
		opacity: 0.45,
		backgroundColor: APP_COLORS.pageBg,
	},
	placeName: {
		flex: 1,
		fontSize: 15,
		lineHeight: 20,
		fontWeight: '700',
		color: APP_COLORS.ink,
	},
	change: {
		fontSize: 13,
		fontWeight: '700',
		color: APP_COLORS.primary,
	},
	tabs: {
		paddingHorizontal: 16,
		paddingTop: 4,
	},
	dayHead: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
	},
	dayTitle: {
		fontSize: 16,
		lineHeight: 22,
		fontWeight: '800',
		color: APP_COLORS.ink,
	},
	daySub: {
		fontSize: 12,
		lineHeight: 16,
		color: APP_COLORS.inkMuted,
	},
	offText: {
		fontSize: 13,
		lineHeight: 18,
		color: APP_COLORS.inkMuted,
	},
})
