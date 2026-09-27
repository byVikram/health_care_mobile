// src/features/ancillary/patient/AncillaryBookVisitPage.tsx
//
// "2b / 2c · Book visit" for every home-care type (nursing, home care, physio, rehab, equipment):
//   1  When do you need the {provider}?  Single visit / Multiple days, quick picks, a 14-day date grid
//      (multi-select, max 7 visits).
//   2  Choose your {provider}            providers matched server-side by speciality, availability across
//      the picked days ("Free on all 3 days" / "Free on 2 of 3 days"), sort, profile sheet.
//   3  Pick a time                       the provider's open slots per day, or one time for every visit;
//      days the provider isn't free on can be removed (or another provider picked).
// Footer: visits + provider summary, total, Continue -> Review & pay.
// Availability is re-fetched whenever the screen regains focus (e.g. after a 409 slot-taken on create).

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { RouteProp } from '@react-navigation/native'
import Toast from 'react-native-toast-message'
import { APP_COLORS } from '../../../config/theme'
import { ROUTES } from '../../../navigation/routes'
import type { AppStackParamList } from '../../../navigation/types'
import { formatDateForApi, monthRangeLabel, nextDays } from '../../../utils/date'
import { buildS3Url } from '../../../utils/s3Utils'
import {
	AppButton,
	AppCartFooter,
	AppChip,
	AppInfoBanner,
	AppProviderCard,
	AppProviderProfileSheet,
	AppScreenHeader,
	AppSegmentedControl,
	AppSkeleton,
	AppTextLink,
	AppToggle,
	DateStrip,
	SlotChipGrid,
} from '../../../components/common'
import type { AppProviderAvailability, SlotChipItem } from '../../../components/common'
import {
	ANCILLARY_BOOKING_MAX_VISITS,
	ANCILLARY_BOOKING_WINDOW_DAYS,
	getProvidersAvailability,
	type ProviderAvailability,
	type ProviderSlot,
} from '../ancillaryProviderBookingService'
import {
	capitalize,
	chipTimeLabel,
	dayLabel,
	distanceLabel,
	experienceLabel,
	firstName,
	inr,
	itemsFee,
	itemsSummary,
	parseSlotKey,
	plural,
	providerNoun,
	selectionFromItems,
	slotKey,
	timeLabel,
} from './ancillaryBookingCopy'
import { useBookingLocation } from './useBookingLocation'

type Nav = NativeStackNavigationProp<AppStackParamList>
type Route = RouteProp<AppStackParamList, typeof ROUTES.STACK.ANCILLARY_BOOK_VISIT>
type Mode = 'single' | 'multiple'
type Sort = 'match' | 'near'

const QUICK_PICKS: { label: string; offsets: number[] }[] = [
	{ label: 'Daily × 3', offsets: [0, 1, 2] },
	{ label: 'Daily × 5', offsets: [0, 1, 2, 3, 4] },
	{ label: 'Every other day × 3', offsets: [0, 2, 4] },
]

const SORTS: { id: Sort; label: string }[] = [
	{ id: 'match', label: 'Best match' },
	{ id: 'near', label: 'Nearest' },
]

const FETCH_DEBOUNCE_MS = 350

const slotsOn = (p: ProviderAvailability, iso: string): ProviderSlot[] =>
	p.dates?.find((d) => d.date === iso)?.slots ?? []

const freeOn = (p: ProviderAvailability, iso: string) =>
	(p.free_dates ?? []).includes(iso) || slotsOn(p, iso).length > 0

function StepTitle({ n, title, right }: { n: number; title: string; right?: string }) {
	return (
		<View style={styles.stepRow}>
			<View style={styles.stepNum}>
				<Text style={styles.stepNumText}>{n}</Text>
			</View>
			<Text style={styles.stepTitle} accessibilityRole="header">
				{title}
			</Text>
			{!!right && <Text style={styles.stepRight}>{right}</Text>}
		</View>
	)
}

export default function AncillaryBookVisitPage() {
	const navigation = useNavigation<Nav>()
	const route = useRoute<Route>()
	const params = route.params
	const { serviceKey, serviceLabel, items, initialDates, excludeProviderId } = params

	const noun = providerNoun(serviceKey)
	const selection = useMemo(() => selectionFromItems(items), [items])
	const baseFee = itemsFee(items)

	// The 14-day window, fixed for the lifetime of the screen.
	const windowDays = useMemo(() => nextDays(ANCILLARY_BOOKING_WINDOW_DAYS), [])
	const windowIsos = useMemo(() => windowDays.map(formatDateForApi), [windowDays])

	const startDates = useMemo(() => {
		const valid = (initialDates ?? []).filter((d) => windowIsos.includes(d))
		return [...new Set(valid)].sort().slice(0, ANCILLARY_BOOKING_MAX_VISITS)
	}, [initialDates, windowIsos])

	const [mode, setMode] = useState<Mode>(startDates.length > 1 ? 'multiple' : 'single')
	const [dates, setDates] = useState<string[]>(startDates)
	const [sort, setSort] = useState<Sort>('match')
	const [providerId, setProviderId] = useState<string | null>(null)
	const [sameTime, setSameTime] = useState(true)
	const [time, setTime] = useState<string | null>(null)
	const [times, setTimes] = useState<Record<string, string>>({})
	const [profileId, setProfileId] = useState<string | null>(null)

	const [providers, setProviders] = useState<ProviderAvailability[]>([])
	const [providersLoading, setProvidersLoading] = useState(false)
	const [providersError, setProvidersError] = useState(false)
	const [reloadKey, setReloadKey] = useState(0)
	const requestIdRef = useRef(0)

	const { coords, loading: locating, error: locationError, locate } = useBookingLocation()

	const datesKey = dates.join(',')
	const isMulti = mode === 'multiple'
	const n = dates.length

	// ---- Availability ----
	useEffect(() => {
		if (!dates.length || !coords) {
			requestIdRef.current++
			setProviders([])
			setProvidersLoading(false)
			setProvidersError(false)
			return
		}
		const requestId = ++requestIdRef.current
		setProvidersLoading(true)
		setProvidersError(false)
		const timer = setTimeout(() => {
			const load = async () => {
				try {
					const list = await getProvidersAvailability({
						dates,
						selection,
						latitude: coords.latitude,
						longitude: coords.longitude,
					})
					if (requestId !== requestIdRef.current) return
					setProviders(list.filter((p) => p.provider_public_id !== excludeProviderId))
				} catch {
					if (requestId !== requestIdRef.current) return
					setProvidersError(true)
				} finally {
					if (requestId === requestIdRef.current) setProvidersLoading(false)
				}
			}
			void load()
		}, FETCH_DEBOUNCE_MS)
		return () => clearTimeout(timer)
		// `dates` is represented by datesKey.
	}, [datesKey, coords?.latitude, coords?.longitude, selection, excludeProviderId, reloadKey])

	// Invalidate in-flight responses on unmount.
	useEffect(
		() => () => {
			requestIdRef.current++
		},
		[]
	)

	// Refresh when coming back to this screen (slots may have been taken meanwhile).
	const focusedOnceRef = useRef(false)
	useFocusEffect(
		useCallback(() => {
			if (focusedOnceRef.current) setReloadKey((k) => k + 1)
			focusedOnceRef.current = true
		}, [])
	)

	const provider = providers.find((p) => p.provider_public_id === providerId) ?? null

	// Selected provider dropped out of the fresh list (booked up / excluded).
	useEffect(() => {
		if (providerId && !providersLoading && !providersError && !provider) {
			setProviderId(null)
			if (providers.length || dates.length) {
				Toast.show({ type: 'info', text1: `That ${noun} is no longer free on these days` })
			}
		}
	}, [providerId, provider, providersLoading, providersError])

	// ---- Derived ----
	const cover = useCallback((p: ProviderAvailability) => dates.filter((d) => freeOn(p, d)).length, [dates])

	const sortedProviders = useMemo(() => {
		const list = providers.map((p, i) => ({ p, i, c: cover(p) }))
		list.sort((a, b) => {
			if (sort === 'near') return (a.p.distance_km ?? Infinity) - (b.p.distance_km ?? Infinity) || a.i - b.i
			return b.c - a.c || a.i - b.i // server order already = all-days first, then distance
		})
		return list
	}, [providers, sort, cover])

	const freeCount = sortedProviders.filter((x) => x.c > 0).length
	const freeDays = provider ? dates.filter((d) => freeOn(provider, d)) : []
	const offDays = provider ? dates.filter((d) => !freeOn(provider, d)) : []
	const useSame = isMulti && sameTime && freeDays.length > 1
	const provFirst = provider ? firstName(provider.name) : ''

	// "Same time for every visit": union of the provider's slots over the free days; a slot is pickable only
	// when it's open on every one of them.
	const sameSlots = useMemo(() => {
		if (!provider || !useSame) return [] as { key: string; slot: ProviderSlot; ok: boolean }[]
		const map = new Map<string, ProviderSlot>()
		freeDays.forEach((d) => slotsOn(provider, d).forEach((s) => map.set(slotKey(s), s)))
		return [...map.entries()]
			.sort(([a], [b]) => a.localeCompare(b))
			.map(([key, slot]) => ({
				key,
				slot,
				ok: freeDays.every((d) => slotsOn(provider, d).some((s) => slotKey(s) === key)),
			}))
	}, [provider, useSame, freeDays.join(',')])

	const sameTimeValid = !!time && sameSlots.some((s) => s.key === time && s.ok)
	const dayTimeValid = (d: string) =>
		!!provider && !!times[d] && slotsOn(provider, d).some((s) => slotKey(s) === times[d])

	const timesDone =
		!!provider &&
		freeDays.length > 0 &&
		offDays.length === 0 &&
		(useSame ? sameTimeValid : freeDays.every(dayTimeValid))

	const fee = provider ? provider.fee_per_visit : baseFee
	const total = fee * Math.max(n, 1)

	// ---- Actions ----
	const resetTimes = () => {
		setTime(null)
		setTimes({})
	}

	const onModeChange = (m: Mode) => {
		setMode(m)
		if (m === 'single' && dates.length > 1) setDates(dates.slice(0, 1))
	}

	const onPickDate = (d: Date) => {
		const iso = formatDateForApi(d)
		if (!isMulti) {
			setDates([iso])
			return
		}
		if (dates.includes(iso)) {
			setDates(dates.filter((x) => x !== iso))
			return
		}
		if (dates.length >= ANCILLARY_BOOKING_MAX_VISITS) {
			Toast.show({ type: 'info', text1: `You can book up to ${ANCILLARY_BOOKING_MAX_VISITS} visits at a time` })
			return
		}
		setDates([...dates, iso].sort())
	}

	const pickQuick = (offsets: number[]) => setDates(offsets.map((o) => windowIsos[o]).filter(Boolean))

	const pickProvider = (id: string) => {
		if (id !== providerId) resetTimes()
		setProviderId(id)
	}

	const removeDay = (d: string) => setDates(dates.filter((x) => x !== d))

	const onContinue = () => {
		if (!provider || !timesDone) return
		const visits = freeDays.map((d) => {
			const s = parseSlotKey(useSame ? (time as string) : times[d])
			return { date: d, start_time: s.start_time, end_time: s.end_time }
		})
		navigation.navigate(ROUTES.STACK.ANCILLARY_REVIEW_PAY, {
			serviceKey,
			serviceLabel,
			items,
			initialDates: dates,
			excludeProviderId,
			provider: {
				provider_public_id: provider.provider_public_id,
				name: provider.name,
				avatar_url: provider.avatar_url,
				specialty: provider.specialty,
				experience_years: provider.experience_years,
				distance_km: provider.distance_km,
				fee_per_visit: provider.fee_per_visit,
			},
			visits,
		})
	}

	// ---- Labels ----
	const dateHint = isMulti
		? n
			? `${plural(n, 'visit')} selected · tap to add or remove days`
			: 'Tap the days you need a visit'
		: n
			? `Visit on ${dayLabel(dates[0])}`
			: 'Pick a day'

	const availabilityFor = (c: number): AppProviderAvailability => {
		if (c === 0) return { label: 'Not free on your days', tone: 'done' }
		if (c === n)
			return { label: n === 1 ? `Free on ${dayLabel(dates[0])}` : `Free on all ${n} days`, tone: 'confirmed' }
		return { label: `Free on ${c} of ${n} days`, tone: 'pending' }
	}

	const ctaLabel = timesDone
		? 'Review'
		: !n
			? 'Pick days'
			: !provider
				? `Choose ${noun}`
				: offDays.length
					? 'Fix days'
					: 'Pick time'

	const summary = n
		? `${plural(n, 'visit')}${provider ? ` · ${provider.name}` : ` · choose a ${noun}`}`
		: 'Pick your days'

	const headerSub = [itemsSummary(items), fee > 0 ? `${inr(fee)} per visit` : ''].filter(Boolean).join(' · ')

	const profile = profileId ? (providers.find((p) => p.provider_public_id === profileId) ?? null) : null
	const profileCover = profile ? cover(profile) : 0

	// ---- Render pieces ----
	const renderProviders = () => {
		if (locating) {
			return (
				<View style={styles.list} accessible accessibilityLabel={`Finding ${noun}s near you`}>
					<Text style={styles.muted}>Finding your location…</Text>
					<AppSkeleton height={96} borderRadius={12} color={APP_COLORS.neutralBg} />
					<AppSkeleton height={96} borderRadius={12} color={APP_COLORS.neutralBg} />
				</View>
			)
		}
		if (!coords) {
			return (
				<AppInfoBanner
					tone="warning"
					icon="map-marker-alert-outline"
					title={locationError || "Couldn't get your location"}
					subtitle={`We need it to find ${noun}s near you.`}
					action={{ label: 'Retry', onPress: () => void locate() }}
				/>
			)
		}
		if (providersLoading && !providers.length) {
			return (
				<View style={styles.list} accessible accessibilityLabel={`Loading ${noun}s`}>
					<AppSkeleton height={112} borderRadius={12} color={APP_COLORS.neutralBg} />
					<AppSkeleton height={112} borderRadius={12} color={APP_COLORS.neutralBg} />
					<AppSkeleton height={112} borderRadius={12} color={APP_COLORS.neutralBg} />
				</View>
			)
		}
		if (providersError) {
			return (
				<AppInfoBanner
					tone="danger"
					title={`Couldn't load ${noun}s`}
					subtitle="Check your connection and try again."
					action={{ label: 'Retry', onPress: () => setReloadKey((k) => k + 1) }}
				/>
			)
		}
		if (!providers.length) {
			return (
				<View style={styles.empty}>
					<Text
						style={styles.emptyTitle}
					>{`No ${noun}s free on ${n === 1 ? 'this day' : 'these days'}`}</Text>
					<Text style={styles.muted}>
						{excludeProviderId
							? `Try other days — the ${noun} you had before is hidden.`
							: 'Try other days, or fewer visits.'}
					</Text>
				</View>
			)
		}
		return (
			<View style={[styles.list, providersLoading && styles.dimmed]} accessibilityRole="radiogroup">
				{sortedProviders.map(({ p, c }) => (
					<AppProviderCard
						key={p.provider_public_id}
						name={p.name}
						avatarUri={buildS3Url(p.avatar_url)}
						feeLabel={`${inr(p.fee_per_visit)}/visit`}
						experienceLabel={experienceLabel(p.experience_years)}
						distanceLabel={distanceLabel(p.distance_km)}
						languages={p.languages}
						availability={availabilityFor(c)}
						selected={p.provider_public_id === providerId}
						disabled={c === 0}
						onPress={() => pickProvider(p.provider_public_id)}
						onViewProfile={() => setProfileId(p.provider_public_id)}
					/>
				))}
			</View>
		)
	}

	const dayRowSlots = (d: string): SlotChipItem[] =>
		provider
			? slotsOn(provider, d).map((s) => ({
					value: slotKey(s),
					label: chipTimeLabel(s.start_time),
					accessibilityLabel: `${dayLabel(d)} ${timeLabel(s.start_time)}`,
				}))
			: []

	const renderSlots = () => {
		if (!provider) return null
		return (
			<>
				{offDays.length > 0 && (
					<View style={styles.offBox}>
						<Text style={styles.offTitle}>
							{`${provFirst} isn’t free on ${offDays.length === 1 ? 'this day' : 'these days'}`}
						</Text>
						{offDays.map((d) => (
							<View key={d} style={styles.offRow}>
								<Text style={styles.offDay}>{dayLabel(d)}</Text>
								<AppButton
									variant="outline"
									size="sm"
									onPress={() => removeDay(d)}
									accessibilityLabel={`Remove ${dayLabel(d)}`}
									style={styles.offBtn}
									labelStyle={styles.offBtnLabel}
								>
									Remove day
								</AppButton>
							</View>
						))}
						<AppTextLink
							label={`Or choose another ${noun}`}
							onPress={() => setProviderId(null)}
							size="sm"
							trailingIcon="none"
						/>
					</View>
				)}

				{isMulti && freeDays.length > 1 && (
					<View style={styles.sameRow}>
						<View style={styles.flex}>
							<Text style={styles.sameTitle}>Same time for every visit</Text>
							<Text style={styles.muted}>
								{sameTime
									? 'Only times free on all days are shown'
									: 'Pick a different time for each day'}
							</Text>
						</View>
						<AppToggle
							value={sameTime}
							onValueChange={(v) => {
								setSameTime(v)
								resetTimes()
							}}
							showStatusText={false}
							activeColor={APP_COLORS.primary}
							inactiveColor={APP_COLORS.inkDisabled}
							accessibilityLabel="Same time for every visit"
						/>
					</View>
				)}

				{freeDays.length > 0 &&
					(useSame ? (
						<View style={styles.slotRow}>
							<View style={styles.slotHead}>
								<Text style={styles.slotLabel}>{`One time for all ${freeDays.length} visits`}</Text>
								<Text style={[styles.slotState, sameTimeValid && styles.slotStateOn]}>
									{sameTimeValid && time ? timeLabel(parseSlotKey(time).start_time) : 'Pick one'}
								</Text>
							</View>
							<SlotChipGrid
								columns={4}
								slots={sameSlots.map(({ key, slot, ok }) => ({
									value: key,
									label: chipTimeLabel(slot.start_time),
									struck: !ok,
									accessibilityLabel: `${timeLabel(slot.start_time)}${ok ? '' : ', not free on every day'}`,
								}))}
								selectedValue={sameTimeValid ? time : null}
								onSelectValue={setTime}
								emptyLabel={`${provFirst} has no open slots on these days`}
							/>
						</View>
					) : (
						freeDays.map((d) => {
							const valid = dayTimeValid(d)
							return (
								<View key={d} style={styles.slotRow}>
									<View style={styles.slotHead}>
										<Text style={styles.slotLabel}>{dayLabel(d)}</Text>
										<Text style={[styles.slotState, valid && styles.slotStateOn]}>
											{valid ? timeLabel(parseSlotKey(times[d]).start_time) : 'Pick a time'}
										</Text>
									</View>
									<SlotChipGrid
										columns={4}
										slots={dayRowSlots(d)}
										selectedValue={valid ? times[d] : null}
										onSelectValue={(v) => setTimes((t) => ({ ...t, [d]: v }))}
										emptyLabel="No open slots on this day"
									/>
								</View>
							)
						})
					))}
			</>
		)
	}

	return (
		<View style={styles.container}>
			<AppScreenHeader
				variant="bar"
				title={`Book ${serviceLabel.toLowerCase()} visit`}
				subtitle={headerSub || undefined}
				onBack={() => navigation.goBack()}
			/>

			<ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
				{/* 1 · When */}
				<View style={styles.section}>
					<StepTitle n={1} title={`When do you need the ${noun}?`} />
					<AppSegmentedControl<Mode>
						options={[
							{ value: 'single', label: 'Single visit' },
							{ value: 'multiple', label: 'Multiple days' },
						]}
						value={mode}
						onChange={onModeChange}
						accessibilityLabel="Visit type"
					/>
					{isMulti && (
						<View style={styles.quick}>
							<Text style={styles.quickLabel}>Quick pick</Text>
							<View style={styles.chips}>
								{QUICK_PICKS.map((q) => {
									const iso = q.offsets.map((o) => windowIsos[o]).join(',')
									return (
										<AppChip
											key={q.label}
											label={q.label}
											variant="soft"
											shape="rounded"
											radius={10}
											size="sm"
											selected={iso === datesKey}
											onPress={() => pickQuick(q.offsets)}
										/>
									)
								})}
							</View>
						</View>
					)}
					<View style={styles.hintRow}>
						<Text style={styles.hint}>{dateHint}</Text>
						<Text style={styles.muted}>{monthRangeLabel(windowDays)}</Text>
					</View>
					<DateStrip
						variant="grid"
						density="compact"
						columns={7}
						dayCount={ANCILLARY_BOOKING_WINDOW_DAYS}
						selectedDates={dates}
						onSelectDate={onPickDate}
					/>
				</View>

				{/* 2 · Provider */}
				{n > 0 && (
					<View style={styles.section}>
						<StepTitle
							n={2}
							title={`Choose your ${noun}`}
							right={
								coords && !providersLoading && !providersError && providers.length
									? `${plural(freeCount, noun)} free`
									: undefined
							}
						/>
						{providers.length > 1 && (
							<View style={styles.chips} accessibilityRole="radiogroup" accessibilityLabel="Sort">
								{SORTS.map((s) => (
									<AppChip
										key={s.id}
										label={s.label}
										selected={sort === s.id}
										onPress={() => setSort(s.id)}
										shape="rounded"
										radius={9}
										size="sm"
										accessibilityRole="radio"
									/>
								))}
							</View>
						)}
						{renderProviders()}
					</View>
				)}

				{/* 3 · Time */}
				{!!provider && n > 0 && (
					<View style={styles.section}>
						<StepTitle n={3} title="Pick a time" right={`${provFirst}’s free slots`} />
						{renderSlots()}
					</View>
				)}
			</ScrollView>

			<AppCartFooter
				countLabel={summary}
				totalLabel={inr(total)}
				ctaLabel={ctaLabel}
				onCtaPress={onContinue}
				ctaDisabled={!timesDone}
			/>

			{!!profile && (
				<AppProviderProfileSheet
					visible={!!profileId}
					onClose={() => setProfileId(null)}
					name={profile.name}
					avatarUri={buildS3Url(profile.avatar_url)}
					role={[capitalize(profile.specialty || noun), experienceLabel(profile.experience_years)]
						.filter(Boolean)
						.join(' · ')}
					experienceLabel={experienceLabel(profile.experience_years)}
					distanceLabel={distanceLabel(profile.distance_km)}
					about={profile.about ?? undefined}
					worksLabel={profile.working_hours_label ?? undefined}
					languages={profile.languages}
					ctaLabel={profileCover === 0 ? 'Not free on your days' : `Choose ${firstName(profile.name)}`}
					ctaDisabled={profileCover === 0}
					onCtaPress={() => {
						pickProvider(profile.provider_public_id)
						setProfileId(null)
					}}
				/>
			)}
		</View>
	)
}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: APP_COLORS.pageBg },
	scroll: { paddingTop: 8, paddingBottom: 16, gap: 8 },
	flex: { flex: 1, minWidth: 0 },
	section: { backgroundColor: APP_COLORS.surface, padding: 16, gap: 12 },
	stepRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
	stepNum: {
		width: 24,
		height: 24,
		borderRadius: 9999,
		backgroundColor: APP_COLORS.ink,
		alignItems: 'center',
		justifyContent: 'center',
	},
	stepNumText: { fontSize: 12, fontWeight: '800', color: APP_COLORS.surface },
	stepTitle: { flex: 1, fontSize: 17, lineHeight: 24, fontWeight: '800', color: APP_COLORS.ink },
	stepRight: { fontSize: 12, lineHeight: 16, fontWeight: '700', color: APP_COLORS.inkMuted },
	quick: { gap: 8 },
	quickLabel: { fontSize: 12, lineHeight: 16, fontWeight: '700', color: APP_COLORS.inkMuted },
	chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
	hintRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 },
	hint: { flex: 1, fontSize: 13, lineHeight: 18, fontWeight: '700', color: APP_COLORS.ink },
	muted: { fontSize: 12, lineHeight: 16, color: APP_COLORS.inkMuted },
	list: { gap: 8 },
	dimmed: { opacity: 0.6 },
	empty: { gap: 4, paddingVertical: 12, alignItems: 'center' },
	emptyTitle: { fontSize: 15, lineHeight: 20, fontWeight: '700', color: APP_COLORS.ink, textAlign: 'center' },
	offBox: { gap: 8, padding: 12, borderRadius: 12, backgroundColor: APP_COLORS.warningBg },
	offTitle: { fontSize: 13, lineHeight: 18, fontWeight: '800', color: APP_COLORS.warning },
	offRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
	offDay: { fontSize: 13, lineHeight: 18, fontWeight: '700', color: APP_COLORS.ink },
	offBtn: { borderColor: APP_COLORS.warning, backgroundColor: APP_COLORS.surface },
	offBtnLabel: { color: APP_COLORS.warning, fontSize: 12 },
	sameRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
		paddingVertical: 10,
		paddingHorizontal: 12,
		borderRadius: 12,
		backgroundColor: APP_COLORS.pageBg,
	},
	sameTitle: { fontSize: 14, lineHeight: 20, fontWeight: '700', color: APP_COLORS.ink },
	slotRow: { gap: 8 },
	slotHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
	slotLabel: { fontSize: 13, lineHeight: 18, fontWeight: '800', color: APP_COLORS.ink },
	slotState: { fontSize: 12, lineHeight: 16, fontWeight: '700', color: APP_COLORS.inkMuted },
	slotStateOn: { color: APP_COLORS.success },
})
