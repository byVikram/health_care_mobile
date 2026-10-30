// Availability for doctors (hours per hospital / clinic and per mode: in clinic or video) and ancillary
// providers (one schedule plus visit length and travel radius).
//   Weekly hours  -- pick a day, turn it on, then add Morning / Afternoon / Evening time ranges; "Copy to
//                    all weekdays"; slot length. Saved with the footer button.
//   Date overrides -- leave / unavailable, or different hours for one date. Each save / delete is immediate.

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import Toast from 'react-native-toast-message'
import {
	AppButton,
	AppChipGroup,
	AppConfirmSheet,
	AppFormCard,
	AppFormField,
	AppSaveFooter,
	AppSegmentedControl,
	AppToggle,
	StatusModal,
} from '../../../components/common'
import { APP_COLORS } from '../../../config/theme'
import { useAncillarySpecialty, useAuth } from '../../../context/AuthContext'
import { fetchProviderProfile } from '../../ancillary/ancillaryService'
import {
	createDoctorOverride,
	deleteDoctorOverride,
	fetchDoctorHospitals,
	fetchDoctorOverrides,
	saveDoctorWeeklyHours,
} from '../doctor/doctorProfileService'
import {
	createProviderOverride,
	deleteProviderOverride,
	fetchProviderOverrides,
	fetchProviderSchedule,
	saveProviderSchedule,
	saveProviderTravelRadius,
} from '../ancillary/ancillaryProfileService'
import { ancillaryConfigFor, formatUnit } from '../config/ancillaryProfileConfig'
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
	toIsoDate,
	weekHasErrors,
	type DateOverride,
	type TimeRange,
	type WeekSections,
} from './availabilityUtils'
import {
	ancillaryOverrideBodies,
	ancillaryScheduleToWeek,
	doctorAvailabilityToWeek,
	doctorOverridePayload,
	groupAncillaryOverrides,
	groupDoctorOverrides,
	weekToAncillarySchedules,
	weeksToDoctorAvailability,
	type AncillaryOverrideRow,
	type DoctorMode,
	type DoctorOverrideRow,
} from './availabilityAdapters'
import { DayStrip } from './components/DayStrip'
import { DaySections } from './components/DaySections'
import { SlotLengthCard } from './components/SlotLengthCard'
import { OverrideList } from './components/OverrideList'
import { OverrideSheet } from './components/OverrideSheet'
import { ClinicPickerSheet } from './components/ClinicPickerSheet'

type Place = { id: string; name: string }

interface AvailabilityDraft {
	weeks: Record<string, Record<DoctorMode, WeekSections>>
	slots: Record<string, Record<DoctorMode, number>>
	travel: number
}

const ANCILLARY_PLACE = 'me'
const DOCTOR_SLOTS = [10, 15, 20, 30]
const MODE_OPTIONS: { value: DoctorMode; label: string }[] = [
	{ value: 'clinic', label: 'In clinic' },
	{ value: 'video', label: 'Video' },
]
const WEEKDAYS = [1, 2, 3, 4, 5]

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

export default function AvailabilityPage() {
	const { role } = useAuth()
	const isDoctor = role === 'doctor'
	const { specialtyId } = useAncillarySpecialty()
	const config = ancillaryConfigFor(specialtyId)

	const [places, setPlaces] = useState<Place[]>([])
	const [placeId, setPlaceId] = useState<string>(ANCILLARY_PLACE)
	const [mode, setMode] = useState<DoctorMode>('clinic')
	const [tab, setTab] = useState<'week' | 'dates'>('week')
	const [day, setDay] = useState(1)
	const [pickerOpen, setPickerOpen] = useState(false)

	const [doctorRows, setDoctorRows] = useState<DoctorOverrideRow[]>([])
	const [ancillaryRows, setAncillaryRows] = useState<AncillaryOverrideRow[]>([])
	const [sheet, setSheet] = useState<{ initial: DateOverride | null } | null>(null)
	const [removing, setRemoving] = useState<DateOverride | null>(null)
	const [actionError, setActionError] = useState<string | null>(null)

	// ── Weekly hours (draft + footer save) ───────────────────────────────────
	const load = useCallback(async (): Promise<AvailabilityDraft> => {
		if (isDoctor) {
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
			return { weeks, slots, travel: 0 }
		}
		const [schedule, profile] = await Promise.all([fetchProviderSchedule(), fetchProviderProfile()])
		const { week, slotDuration } = ancillaryScheduleToWeek(schedule)
		setPlaces([{ id: ANCILLARY_PLACE, name: 'Home visits' }])
		return {
			weeks: { [ANCILLARY_PLACE]: { clinic: week, video: week } },
			slots: {
				[ANCILLARY_PLACE]: {
					clinic: slotDuration ?? config.defaultUnit,
					video: slotDuration ?? config.defaultUnit,
				},
			},
			travel: Math.round(profile?.geofence_radius_km ?? profile?.geofence_radius ?? config.travelOptions[1]),
		}
	}, [isDoctor, config])

	const save = useCallback(
		async (draft: AvailabilityDraft, saved: AvailabilityDraft) => {
			if (isDoctor) {
				for (const id of Object.keys(draft.weeks)) {
					if (same(draft.weeks[id], saved.weeks[id]) && same(draft.slots[id], saved.slots[id])) continue
					await saveDoctorWeeklyHours(id, weeksToDoctorAvailability(draft.weeks[id], draft.slots[id]))
				}
			} else {
				const week = draft.weeks[ANCILLARY_PLACE].clinic
				const slot = draft.slots[ANCILLARY_PLACE].clinic
				if (!same(week, saved.weeks[ANCILLARY_PLACE].clinic) || slot !== saved.slots[ANCILLARY_PLACE].clinic) {
					await saveProviderSchedule(weekToAncillarySchedules(week, slot))
				}
				if (draft.travel !== saved.travel) await saveProviderTravelRadius(draft.travel)
			}
			return draft
		},
		[isDoctor]
	)

	const form = useProfileForm<AvailabilityDraft>({ load, save, successMessage: 'Availability saved' })
	const { draft } = form
	const activeMode: DoctorMode = isDoctor ? mode : 'clinic'
	const week = draft?.weeks[placeId]?.[activeMode]

	const placeName = (id: string) => places.find((p) => p.id === id)?.name ?? 'Clinic'

	/** Doctor: the same day's ranges at other places / the other mode, for clash checks. */
	const othersFor = useCallback(
		(pid: string, m: DoctorMode, d: number): { place: string; range: TimeRange }[] => {
			if (!isDoctor || !draft) return []
			const out: { place: string; range: TimeRange }[] = []
			for (const [otherId, modes] of Object.entries(draft.weeks)) {
				for (const otherMode of ['clinic', 'video'] as DoctorMode[]) {
					if (otherId === pid && otherMode === m) continue
					const label = `${placeName(otherId).split(',')[0]}${otherMode === 'video' ? ' (video)' : ''}`
					for (const range of dayRanges(modes[otherMode][d])) out.push({ place: label, range })
				}
			}
			return out
		},
		[isDoctor, draft, places]
	)

	const invalid = useMemo(() => {
		if (!draft) return false
		return Object.entries(draft.weeks).some(([pid, modes]) =>
			(isDoctor ? (['clinic', 'video'] as DoctorMode[]) : (['clinic'] as DoctorMode[])).some((m) =>
				weekHasErrors(modes[m], (d) => othersFor(pid, m, d))
			)
		)
	}, [draft, isDoctor, othersFor])

	const setWeek = (next: WeekSections) =>
		form.setDraft((cur) =>
			cur
				? {
						...cur,
						weeks: {
							...cur.weeks,
							[placeId]: isDoctor
								? { ...cur.weeks[placeId], [activeMode]: next }
								: { clinic: next, video: next },
						},
					}
				: cur
		)

	const setSlot = (minutes: number) =>
		form.setDraft((cur) =>
			cur
				? {
						...cur,
						slots: {
							...cur.slots,
							[placeId]: isDoctor
								? { ...cur.slots[placeId], [activeMode]: minutes }
								: { clinic: minutes, video: minutes },
						},
					}
				: cur
		)

	const toggleDay = (on: boolean) => {
		if (!week) return
		const next = cloneWeek(week)
		next[day] = on ? { ...emptyDay(), morning: [SECTION_DEFAULT_RANGE.morning] } : emptyDay()
		setWeek(next)
	}

	const copyToWeekdays = () => {
		if (!week) return
		const next = cloneWeek(week)
		for (const d of WEEKDAYS) next[d] = JSON.parse(JSON.stringify(week[day]))
		setWeek(next)
		Toast.show({ type: 'success', text1: `${DAY_FULL[day]}'s hours copied to Monday–Friday` })
	}

	// ── Date overrides (immediate) ───────────────────────────────────────────
	const loadOverrides = useCallback(async () => {
		try {
			if (isDoctor) setDoctorRows(await fetchDoctorOverrides())
			else setAncillaryRows(await fetchProviderOverrides())
		} catch {
			// The weekly tab still works; the list just stays empty.
		}
	}, [isDoctor])

	useEffect(() => {
		void loadOverrides()
	}, [loadOverrides])

	const today = toIsoDate(new Date())
	const overrides = useMemo(
		() =>
			(isDoctor
				? groupDoctorOverrides(doctorRows, placeId, activeMode)
				: groupAncillaryOverrides(ancillaryRows)
			).filter((o) => o.date >= today),
		[isDoctor, doctorRows, ancillaryRows, placeId, activeMode, today]
	)

	const offLabel = isDoctor ? 'Unavailable all day' : 'On leave'

	const deleteRows = async (ids: number[]) => {
		for (const id of ids) {
			if (isDoctor) await deleteDoctorOverride(id)
			else await deleteProviderOverride(id)
		}
	}

	const saveOverride = async (o: Pick<DateOverride, 'date' | 'off' | 'ranges' | 'note'>) => {
		try {
			if (sheet?.initial) await deleteRows(sheet.initial.ids)
			if (isDoctor) await createDoctorOverride(doctorOverridePayload(placeId, activeMode, o))
			else for (const body of ancillaryOverrideBodies(o)) await createProviderOverride(body)
			setSheet(null)
			Toast.show({ type: 'success', text1: 'Date override saved' })
		} catch (e) {
			setActionError(e instanceof Error ? e.message : 'Please try again.')
		} finally {
			await loadOverrides()
		}
	}

	const removeOverride = async () => {
		if (!removing) return
		try {
			await deleteRows(removing.ids)
			Toast.show({ type: 'success', text1: 'Date override removed' })
		} catch (e) {
			setActionError(e instanceof Error ? e.message : 'Please try again.')
		} finally {
			setRemoving(null)
			await loadOverrides()
		}
	}

	const slotOptions = (isDoctor ? DOCTOR_SLOTS : config.unitOptions).map((m) => ({
		value: String(m),
		label: formatUnit(m),
	}))
	const currentSlot = draft?.slots[placeId]?.[activeMode]

	return (
		<ProfileScreen
			title="Availability"
			subtitle={isDoctor ? 'Hours are set per clinic' : 'Patients book only these times'}
			loading={form.loading}
			loadError={form.loadError}
			onRetry={form.reload}
			saveError={form.saveError}
			onDismissSaveError={form.clearSaveError}
			footer={
				tab === 'week' && (!isDoctor || places.length > 0) ? (
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
					{isDoctor && (
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
					)}
					<OverrideSheet
						visible={!!sheet}
						onClose={() => setSheet(null)}
						initial={sheet?.initial ?? null}
						takenDates={overrides.map((o) => o.date)}
						offLabel={offLabel}
						subtitle={
							isDoctor
								? `Only for ${placeName(placeId)} · ${activeMode === 'clinic' ? 'in clinic' : 'video'}`
								: 'Weekly hours stay the same on other dates'
						}
						allowNote={!isDoctor}
						onSave={saveOverride}
					/>
					<AppConfirmSheet
						visible={!!removing}
						onClose={() => setRemoving(null)}
						title="Remove this date override?"
						message="Your weekly hours will apply on this date again."
						confirmLabel="Remove"
						onConfirm={removeOverride}
					/>
					<StatusModal
						visible={!!actionError}
						status="error"
						title="Couldn't update availability"
						description={actionError || ''}
						submitText="OK"
						onSubmit={() => setActionError(null)}
					/>
				</>
			}
		>
			{isDoctor && places.length === 0 ? (
				<AppFormCard
					title="No hospitals or clinics yet"
					helper="Add a place you consult at first, then set its hours here."
				/>
			) : (
				draft &&
				week && (
					<>
						{isDoctor && (
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
									<MaterialCommunityIcons
										name="hospital-building"
										size={22}
										color={APP_COLORS.primary}
									/>
									<Text style={styles.placeName} numberOfLines={1}>
										{placeName(placeId)}
									</Text>
									{places.length > 1 && <Text style={styles.change}>Change</Text>}
								</TouchableOpacity>
							</View>
						)}

						<View style={styles.tabs}>
							<AppSegmentedControl
								options={[
									{ value: 'week', label: 'Weekly hours' },
									{ value: 'dates', label: isDoctor ? 'Date overrides' : 'Leave & overrides' },
								]}
								value={tab}
								onChange={setTab}
								shape="rounded"
								tabs
								accessibilityLabel="Schedule view"
							/>
						</View>

						{tab === 'week' ? (
							<>
								<AppFormCard
									title="Weekly hours"
									helper="Pick a day, then add one or more time ranges, e.g. 9–10 AM and 11 AM–12 PM."
								>
									{isDoctor && (
										<SlotLengthCard
											options={DOCTOR_SLOTS}
											value={currentSlot}
											onChange={setSlot}
											copyLabel={`Copy ${DAY_FULL[day]}'s hours to all weekdays`}
											onCopy={copyToWeekdays}
											copyDisabled={!isDayOn(week[day])}
										/>
									)}
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
										<>
											<DaySections
												day={week[day]}
												onChange={(next) => {
													const w = cloneWeek(week)
													w[day] = next
													setWeek(w)
												}}
												others={othersFor(placeId, activeMode, day)}
											/>
											{!isDoctor && (
												<View style={styles.copyRow}>
													<TouchableOpacity
														onPress={copyToWeekdays}
														hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
														accessibilityRole="button"
													>
														<Text style={styles.copyLink}>Copy to all weekdays</Text>
													</TouchableOpacity>
												</View>
											)}
										</>
									) : (
										<Text style={styles.offText}>
											No bookings on {DAY_FULL[day]}s. Turn on to add hours.
										</Text>
									)}
								</AppFormCard>

								{!isDoctor && (
									<AppFormCard title={config.unitLabel}>
										<AppChipGroup
											options={slotOptions}
											values={currentSlot ? [String(currentSlot)] : []}
											onChange={(v) => v[0] && setSlot(Number(v[0]))}
											single
											accessibilityLabel={config.unitLabel}
										/>
										<AppFormField label="How far I travel">
											<AppChipGroup
												options={config.travelOptions.map((km) => ({
													value: String(km),
													label: `${km} km`,
												}))}
												values={[String(draft.travel)]}
												onChange={(v) => v[0] && form.set('travel', Number(v[0]))}
												single
												accessibilityLabel="How far I travel"
											/>
										</AppFormField>
									</AppFormCard>
								)}
							</>
						) : (
							<AppFormCard
								title={isDoctor ? 'Date overrides' : 'Leave & date overrides'}
								helper={
									isDoctor
										? 'Holidays, half days or different hours at this clinic only.'
										: 'Take a day off or change hours for one date. Weekly hours stay the same.'
								}
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
									Add date override
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
	// plain primary text link from the design (not a bordered button)
	copyRow: {
		flexDirection: 'row',
		justifyContent: 'flex-end',
	},
	copyLink: {
		fontSize: 13,
		lineHeight: 18,
		fontWeight: '700',
		color: APP_COLORS.primary,
	},
	offText: {
		fontSize: 13,
		lineHeight: 18,
		color: APP_COLORS.inkMuted,
	},
})
