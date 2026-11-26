// src/features/bookings/BookingsPage.tsx
//
// Patient "My bookings" tab (design "3 · Bookings"): the shared solid app bar (AppScreenHeader) with "My bookings" and
// "{n} upcoming · {n} today", a row of category tiles (All / Doctor / Ancillary / Lab / Pharmacy, with the totals from the API),
// then ONE list from GET /api/patients/me/bookings: what is coming up first, grouped by day (Today / Tomorrow / ...), then the past
// ones grouped by month (the month titles are the only separator), each rendered with the shared AppBookingCard. There is no
// Upcoming / Past toggle: the upcoming pages load first, the past ones follow when the upcoming are done (two cursors, the API's
// `when=upcoming|past`).
// Pull to refresh, paged load-more, refetch on focus.
// Taps and card actions go through bookingNavigation.ts (-> each vertical's existing detail screens).
// Other screens deep-link here with `{ filter }` (side drawer): doctor -> Doctor, ancillary -> Ancillary,
// lab -> Lab, medicine -> Pharmacy, radiology -> All (radiology isn't part of this list).
// The old per-vertical lists (ancillary MyBookingsPage, lab / pharmacy / radiology order lists) stay registered as their own
// stack screens. (The old doctor-appointments list screen is gone: a notification, like a tap here, opens AppointmentDetails.)

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
	ActivityIndicator,
	RefreshControl,
	SectionList,
	StatusBar,
	StyleSheet,
	Text,
	View,
} from 'react-native'
import {
	useFocusEffect,
	useIsFocused,
	useNavigation,
	useRoute,
	type CompositeNavigationProp,
	type RouteProp,
} from '@react-navigation/native'
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import Toast from 'react-native-toast-message'

import {
	AppBookingCard,
	AppButton,
	AppCategoryTile,
	AppIcon,
	AppIconTile,
	AppInfoBanner,
	AppSkeleton,
	AppScreenHeader,
	type AppBookingCardAction,
} from '../../components/common'
import { APP_COLORS, type ToneKey } from '../../config/theme'
import { ROUTES } from '../../navigation/routes'
import type { AppStackParamList, BookingsFilterKey, MainTabParamList } from '../../navigation/types'
import { useTabBarClearance } from '../../navigation/tabBar'
import {
	getMyBookings,
	type BookingAction,
	type BookingItem,
	type BookingsCategoryFilter,
	type BookingsPage as BookingsPageData,
} from '../../services/bookingsService'
import { buildS3Url } from '../../utils/s3Utils'
import CancelAppointmentSheet from '../appointment/components/patient-details/CancelAppointmentSheet'
import CancelCareBookingSheet from './CancelCareBookingSheet'
import NoShowReplySheet from '../appointment/components/NoShowReplySheet'
import { actionBusyKey, bookingKey, goHome, openBookingTarget, runBookingAction } from './bookingNavigation'
import {
	CATEGORY_KIND,
	statusChipTone,
	isNoShowBooking,
	groupBookings,
	patientLabel,
	whenLabel,
	whereIconProps,
	type BookingSection,
} from './bookingListUtils'

type PortalNavigation = CompositeNavigationProp<
	BottomTabNavigationProp<MainTabParamList, typeof ROUTES.MAIN.PORTAL>,
	NativeStackNavigationProp<AppStackParamList>
>
type PortalRoute = RouteProp<MainTabParamList, typeof ROUTES.MAIN.PORTAL>

const PAGE_SIZE = 20

const FILTER_TO_CATEGORY: Record<BookingsFilterKey, BookingsCategoryFilter> = {
	doctor: 'doctor',
	ancillary: 'ancillary',
	lab: 'lab',
	medicine: 'pharmacy',
	radiology: 'all',
}

const CATEGORIES: { id: BookingsCategoryFilter; label: string; tone: ToneKey; icon: string }[] = [
	{ id: 'all', label: 'All', tone: 'mint', icon: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z' },
	{
		id: 'doctor',
		label: 'Doctor',
		tone: 'sky',
		icon: 'M5 3v5a5 5 0 0 0 10 0V3M10 13v3a4 4 0 0 0 8 0v-3M18 13a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
	},
	{
		id: 'ancillary',
		label: 'Ancillary',
		tone: 'peach',
		icon: 'M11 14h2a2 2 0 1 0 0-4h-3c-.6 0-1.1.2-1.4.6L3 16M7 20l1.6-1.4c.3-.4.8-.6 1.4-.6h4c1.1 0 2.1-.4 2.8-1.2l4.6-4.4a2 2 0 0 0-2.75-2.91l-4.2 3.9M2 15l6 6M19.5 8.5c.7-.7 1.5-1.6 1.5-2.7A2.73 2.73 0 0 0 16 4a2.78 2.78 0 0 0-5 1.8c0 1.2.8 2 1.5 2.8L16 12z',
	},
	{
		id: 'lab',
		label: 'Lab',
		tone: 'lilac',
		icon: 'M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.7 3h10.6a2 2 0 0 0 1.7-3l-5-9V3M7.5 15h9',
	},
	{
		id: 'pharmacy',
		label: 'Pharmacy',
		tone: 'sand',
		icon: 'M10.5 20.5a4.95 4.95 0 0 1-7-7l6-6a4.95 4.95 0 0 1 7 7zM8.5 8.5l7 7',
	},
]

/** One of the two cursors (upcoming, past): the items loaded so far and the page reached. */
type Part = { items: BookingItem[]; page: number; pages: number }
type ListState = { key: string; up: Part; past: Part }

const dedupe = (items: BookingItem[]) => {
	const seen = new Set<string>()
	return items.filter((i) => {
		const k = bookingKey(i)
		if (seen.has(k)) return false
		seen.add(k)
		return true
	})
}

const toPart = (res: BookingsPageData): Part => ({
	items: dedupe(res.items ?? []),
	page: res.page || 1,
	pages: res.pages || 1,
})
const isDone = (part: Part) => part.page >= part.pages

export default function BookingsPage() {
	const navigation = useNavigation<PortalNavigation>()
	const route = useRoute<PortalRoute>()
	const clearance = useTabBarClearance()
	const isFocused = useIsFocused()

	const [category, setCategory] = useState<BookingsCategoryFilter>(() =>
		route.params?.filter ? FILTER_TO_CATEGORY[route.params.filter] : 'all'
	)
	const key = category

	const [list, setList] = useState<ListState | null>(null)
	// The tiles' counts of the upcoming and of the past bookings: a tile shows their total.
	const [counts, setCounts] = useState<{
		up: BookingsPageData['counts']
		past: BookingsPageData['counts']
	} | null>(null)
	const [summary, setSummary] = useState<BookingsPageData['summary'] | null>(null)
	/** The category whose first page failed to load (and nothing is cached for it). */
	const [failedKey, setFailedKey] = useState<string | null>(null)
	const [refreshing, setRefreshing] = useState(false)
	const [loadingMore, setLoadingMore] = useState(false)
	const [busyKey, setBusyKey] = useState<string | null>(null)
	const [cancelItem, setCancelItem] = useState<BookingItem | null>(null)
	const [cancelCareItem, setCancelCareItem] = useState<BookingItem | null>(null)
	// A doctor appointment marked as a no-show whose "What happened?" sheet is open.
	const [noShowItem, setNoShowItem] = useState<BookingItem | null>(null)

	const reqRef = useRef(0)
	const listRef = useRef<ListState | null>(null)
	listRef.current = list

	// Deep link from the side drawer etc.: pick the category, then clear the param so the same link works again.
	const filterParam = route.params?.filter
	useEffect(() => {
		if (!filterParam) return
		setCategory(FILTER_TO_CATEGORY[filterParam] ?? 'all')
		navigation.setParams({ filter: undefined })
	}, [filterParam, navigation])

	/** First page of the upcoming and of the past bookings of the category, together. 'refresh' = pull to refresh; otherwise silent when cached. */
	const load = useCallback(
		async (mode: 'focus' | 'refresh' | 'retry') => {
			const req = ++reqRef.current
			const cached = listRef.current?.key === key
			if (mode === 'refresh') setRefreshing(true)
			setFailedKey(null)
			try {
				const [upcoming, past] = await Promise.all([
					getMyBookings({ when: 'upcoming', category, page: 1, limit: PAGE_SIZE }),
					getMyBookings({ when: 'past', category, page: 1, limit: PAGE_SIZE }),
				])
				if (req !== reqRef.current) return
				setList({ key, up: toPart(upcoming), past: toPart(past) })
				if (upcoming.counts && past.counts) setCounts({ up: upcoming.counts, past: past.counts })
				if (upcoming.summary) setSummary(upcoming.summary)
			} catch {
				if (req !== reqRef.current) return
				if (cached && mode === 'refresh') {
					Toast.show({ type: 'error', text1: "Couldn't refresh your bookings", text2: 'Please try again.' })
				} else if (!cached) {
					setFailedKey(key)
				}
			} finally {
				if (req === reqRef.current) setRefreshing(false)
			}
		},
		[key, category]
	)

	// Runs on focus and whenever when / category change while focused.
	useFocusEffect(
		useCallback(() => {
			void load('focus')
		}, [load])
	)

	// The next page: of the upcoming bookings while there are more, then of the past ones.
	const loadMore = async () => {
		const current = listRef.current
		if (!current || current.key !== key || refreshing || loadingMore) return
		const which = isDone(current.up) ? 'past' : 'up'
		const part = current[which]
		if (isDone(part)) return
		const req = reqRef.current
		setLoadingMore(true)
		try {
			const res = await getMyBookings({
				when: which === 'up' ? 'upcoming' : 'past',
				category,
				page: part.page + 1,
				limit: PAGE_SIZE,
			})
			if (req !== reqRef.current) return
			setList((prev) =>
				prev && prev.key === key
					? {
							...prev,
							[which]: {
								items: dedupe([...prev[which].items, ...(res.items ?? [])]),
								page: res.page || prev[which].page + 1,
								pages: res.pages || prev[which].pages,
							},
						}
					: prev
			)
		} catch {
			if (req === reqRef.current) Toast.show({ type: 'error', text1: "Couldn't load more bookings" })
		} finally {
			setLoadingMore(false)
		}
	}

	const loaded = list?.key === key ? list : null
	// Upcoming first; the past ones only once every upcoming page is in, so a past booking never lands above an upcoming one.
	const sections = useMemo<BookingSection[]>(() => {
		if (!loaded) return []
		const upcoming = groupBookings(loaded.up.items, 'upcoming')
		if (!isDone(loaded.up)) return upcoming
		const upKeys = new Set(loaded.up.items.map(bookingKey))
		const past = groupBookings(
			loaded.past.items.filter((i) => !upKeys.has(bookingKey(i))),
			'past'
		)
		return [...upcoming, ...past]
	}, [loaded])
	const pastKeys = useMemo(() => new Set(loaded?.past.items.map(bookingKey) ?? []), [loaded])
	const noUpcoming = !!loaded && loaded.up.items.length === 0 && loaded.past.items.length > 0
	const showError = failedKey === key && list?.key !== key
	const showSkeleton = list?.key !== key && !showError

	const handlers = useMemo(
		() => ({
			requestAppointmentCancel: (item: BookingItem) => setCancelItem(item),
			requestCareCancel: (item: BookingItem) => setCancelCareItem(item),
			setBusy: setBusyKey,
			onChanged: () => void load('focus'),
		}),
		[load]
	)

	const toCardAction = (item: BookingItem, action: BookingAction | null): AppBookingCardAction | undefined =>
		action
			? {
					label: action.label,
					loading: busyKey === actionBusyKey(item, action.key),
					disabled: !!busyKey,
					onPress: () => void runBookingAction(navigation, item, action.key, handlers),
				}
			: undefined

	// A no-show's primary action is "Tell us what happened" (the sheet decides whether replying is still open);
	// "Book again" stays as the secondary one. The card itself still opens the appointment.
	const noShowAction = (item: BookingItem): AppBookingCardAction | undefined =>
		isNoShowBooking(item)
			? { label: 'Tell us what happened', disabled: !!busyKey, onPress: () => setNoShowItem(item) }
			: undefined

	const renderItem = ({ item }: { item: BookingItem }) => (
		<AppBookingCard
			style={[styles.card, pastKeys.has(bookingKey(item)) && styles.pastCard]}
			kind={CATEGORY_KIND[item.category] ?? 'doctor'}
			kindLabel={item.kind_label || undefined}
			imageUri={buildS3Url(item.avatar_url)}
			status={
				item.status
					? { label: item.status.label, tone: statusChipTone(item.status) }
					: undefined
			}
			title={item.title}
			sub={item.subtitle ?? undefined}
			patientLabel={patientLabel(item)}
			when={whenLabel(item)}
			where={item.where ?? undefined}
			{...whereIconProps(item.where_type)}
			note={item.note || undefined}
			refLabel={item.ref ?? undefined}
			primaryAction={noShowAction(item) ?? toCardAction(item, item.actions?.primary ?? null)}
			secondaryAction={toCardAction(item, item.actions?.secondary ?? null)}
			onPress={() => openBookingTarget(navigation, item)}
			accessibilityHint="Opens the booking"
		/>
	)

	const categoryName = category === 'all' ? '' : ` ${CATEGORIES.find((c) => c.id === category)?.label.toLowerCase()}`
	const emptyTitle = `No${categoryName} bookings yet`

	const listHeader = (
		<View style={styles.headerWrap}>
			<View style={styles.tiles} accessibilityLabel="Booking type">
				{CATEGORIES.map((c) => (
					<AppCategoryTile
						key={c.id}
						label={c.label}
						iconPath={c.icon}
						tone={c.tone}
						active={category === c.id}
						count={c.id === 'all' || !counts ? null : (counts.up[c.id] ?? 0) + (counts.past[c.id] ?? 0)}
						onPress={() => setCategory(c.id)}
					/>
				))}
			</View>
			{noUpcoming && <Text style={styles.noUpcoming}>{`No upcoming${categoryName} bookings`}</Text>}
		</View>
	)

	const listEmpty = showSkeleton ? (
		<View style={styles.skeletons}>
			<AppSkeleton width={96} height={16} borderRadius={6} color={APP_COLORS.divider} />
			{[0, 1, 2].map((i) => (
				<View key={i} style={styles.skeletonCard}>
					<View style={styles.skeletonHead}>
						<AppSkeleton width={48} height={48} borderRadius={12} color={APP_COLORS.neutralBg} />
						<View style={styles.skeletonLines}>
							<AppSkeleton width="45%" height={12} borderRadius={4} color={APP_COLORS.neutralBg} />
							<AppSkeleton width="75%" height={18} borderRadius={6} color={APP_COLORS.neutralBg} />
							<AppSkeleton width="60%" height={12} borderRadius={4} color={APP_COLORS.neutralBg} />
						</View>
					</View>
					<AppSkeleton height={56} borderRadius={10} color={APP_COLORS.neutralBg} />
				</View>
			))}
		</View>
	) : showError ? (
		<View style={styles.stateWrap}>
			<AppInfoBanner
				tone="danger"
				title="Couldn't load your bookings"
				subtitle="Check your connection and try again."
				action={{ label: 'Retry', onPress: () => void load('retry') }}
			/>
		</View>
	) : (
		<View style={styles.empty}>
			<AppIconTile size={52} radius={14} tone="mint">
				<AppIcon name="calendar" size={26} color={APP_COLORS.primary} />
			</AppIconTile>
			<Text style={styles.emptyTitle} accessibilityRole="header">
				{emptyTitle}
			</Text>
			<Text style={styles.emptyBody}>Book a doctor, lab test, ancillary service or medicines from Home.</Text>
			<AppButton size="md" style={styles.emptyButton} onPress={() => goHome(navigation)}>
				Go to Home
			</AppButton>
		</View>
	)

	return (
		<View style={styles.container}>
			{isFocused && <StatusBar barStyle="light-content" />}

			<AppScreenHeader
				variant="bar"
				solid
				showBack={false}
				title="My bookings"
				subtitle={summary ? `${summary.upcoming} upcoming · ${summary.today} today` : undefined}
			/>

			<SectionList<BookingItem, BookingSection>
				sections={showSkeleton || showError ? [] : sections}
				keyExtractor={bookingKey}
				renderItem={renderItem}
				renderSectionHeader={({ section }) => <Text style={styles.sectionTitle}>{section.title}</Text>}
				stickySectionHeadersEnabled={false}
				ListHeaderComponent={listHeader}
				ListEmptyComponent={listEmpty}
				ListFooterComponent={
					loadingMore ? <ActivityIndicator style={styles.footerSpinner} color={APP_COLORS.primary} /> : undefined
				}
				onEndReached={() => void loadMore()}
				onEndReachedThreshold={0.4}
				refreshControl={
					<RefreshControl
						refreshing={refreshing}
						onRefresh={() => void load('refresh')}
						tintColor={APP_COLORS.primary}
						colors={[APP_COLORS.primary]}
					/>
				}
				contentContainerStyle={[styles.listContent, { paddingBottom: clearance }]}
				showsVerticalScrollIndicator={false}
			/>

			{!!noShowItem && (
				<NoShowReplySheet
					visible
					appointmentId={noShowItem.category === 'ancillary' ? undefined : noShowItem.target.id}
					visitId={
						noShowItem.category === 'ancillary' ? (noShowItem.missed_visit_id ?? undefined) : undefined
					}
					onClose={() => setNoShowItem(null)}
				/>
			)}

			{!!cancelItem && (
				<CancelAppointmentSheet
					visible
					appointmentId={cancelItem.target.id}
					subtitle={[cancelItem.title, whenLabel(cancelItem)].filter(Boolean).join(' · ')}
					onClose={() => setCancelItem(null)}
					onRescheduleInstead={() => {
						const item = cancelItem
						setCancelItem(null)
						openBookingTarget(navigation, item)
					}}
					onCancelled={() => {
						setCancelItem(null)
						void load('focus')
					}}
				/>
			)}

			{!!cancelCareItem && (
				<CancelCareBookingSheet
					visible
					orderId={cancelCareItem.target.id}
					title={cancelCareItem.title}
					line={whenLabel(cancelCareItem)}
					onClose={() => setCancelCareItem(null)}
					onCancelled={() => {
						setCancelCareItem(null)
						void load('focus')
					}}
				/>
			)}
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: APP_COLORS.pageBg,
	},
	listContent: {
		paddingTop: 16,
		flexGrow: 1,
	},
	headerWrap: {
		gap: 12,
	},
	tiles: {
		flexDirection: 'row',
		gap: 6,
		paddingHorizontal: 16,
	},
	noUpcoming: {
		paddingHorizontal: 16,
		fontSize: 14,
		lineHeight: 20,
		color: APP_COLORS.inkMuted,
	},

	sectionTitle: {
		marginTop: 18,
		paddingHorizontal: 16,
		fontSize: 13,
		lineHeight: 18,
		fontWeight: '800',
		letterSpacing: 0.65,
		color: APP_COLORS.inkMuted,
	},
	card: {
		marginHorizontal: 16,
		marginTop: 10,
	},
	// A past booking reads quieter than one still to come.
	pastCard: {
		opacity: 0.88,
	},
	footerSpinner: {
		marginVertical: 16,
	},
	skeletons: {
		marginTop: 18,
		paddingHorizontal: 16,
		gap: 10,
	},
	skeletonCard: {
		padding: 14,
		gap: 12,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: APP_COLORS.divider,
		backgroundColor: APP_COLORS.surface,
	},
	skeletonHead: {
		flexDirection: 'row',
		gap: 12,
	},
	skeletonLines: {
		flex: 1,
		gap: 6,
	},
	stateWrap: {
		marginTop: 18,
		paddingHorizontal: 16,
	},
	empty: {
		marginTop: 24,
		marginHorizontal: 16,
		paddingVertical: 28,
		paddingHorizontal: 16,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: APP_COLORS.divider,
		backgroundColor: APP_COLORS.surface,
		alignItems: 'center',
		gap: 8,
	},
	emptyTitle: {
		fontSize: 17,
		lineHeight: 24,
		fontWeight: '700',
		color: APP_COLORS.ink,
		textAlign: 'center',
	},
	emptyBody: {
		fontSize: 14,
		lineHeight: 20,
		color: APP_COLORS.inkMuted,
		textAlign: 'center',
	},
	emptyButton: {
		marginTop: 4,
	},
})
