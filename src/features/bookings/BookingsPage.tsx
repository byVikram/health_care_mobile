// src/features/bookings/BookingsPage.tsx
//
// Patient "My bookings" tab (design "3 · Bookings"): ink hero with "My bookings" + "{n} upcoming · {n} today"
// and an Upcoming / Past toggle, a row of category tiles (All / Doctor / Ancillary / Lab / Pharmacy, counts from
// the API), then the combined list from GET /api/patients/me/bookings grouped by day (upcoming) or month (past),
// each rendered with the shared AppBookingCard. Pull to refresh, paged load-more, refetch on focus.
// Taps and card actions go through bookingNavigation.ts (-> each vertical's existing detail screens).
// Other screens deep-link here with `{ filter }` (side drawer): doctor -> Doctor, ancillary -> Ancillary,
// lab -> Lab, medicine -> Pharmacy, radiology -> All (radiology isn't part of this list).
// The old per-vertical lists (AppointmentList, ancillary MyBookingsPage, lab / pharmacy / radiology order lists)
// stay registered as their own stack screens.

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
	ActivityIndicator,
	Pressable,
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
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Toast from 'react-native-toast-message'

import {
	AppBookingCard,
	AppButton,
	AppHeaderBackdrop,
	AppCategoryTile,
	AppIcon,
	AppIconTile,
	AppInfoBanner,
	AppSkeleton,
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
	type BookingsWhen,
} from '../../services/bookingsService'
import { buildS3Url } from '../../utils/s3Utils'
import CancelAppointmentSheet from '../appointment/components/patient-details/CancelAppointmentSheet'
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

const WHEN_TABS: { id: BookingsWhen; label: string }[] = [
	{ id: 'upcoming', label: 'Upcoming' },
	{ id: 'past', label: 'Past' },
]

type ListState = { key: string; items: BookingItem[]; page: number; pages: number }

const dedupe = (items: BookingItem[]) => {
	const seen = new Set<string>()
	return items.filter((i) => {
		const k = bookingKey(i)
		if (seen.has(k)) return false
		seen.add(k)
		return true
	})
}

export default function BookingsPage() {
	const navigation = useNavigation<PortalNavigation>()
	const route = useRoute<PortalRoute>()
	const insets = useSafeAreaInsets()
	const clearance = useTabBarClearance()
	const isFocused = useIsFocused()

	const [when, setWhen] = useState<BookingsWhen>('upcoming')
	const [category, setCategory] = useState<BookingsCategoryFilter>(() =>
		route.params?.filter ? FILTER_TO_CATEGORY[route.params.filter] : 'all'
	)
	const key = `${when}:${category}`

	const [list, setList] = useState<ListState | null>(null)
	const [countsFor, setCountsFor] = useState<{ when: BookingsWhen; counts: BookingsPageData['counts'] } | null>(null)
	const [summary, setSummary] = useState<BookingsPageData['summary'] | null>(null)
	/** when:category key whose first page failed to load (and nothing is cached for it). */
	const [failedKey, setFailedKey] = useState<string | null>(null)
	const [refreshing, setRefreshing] = useState(false)
	const [loadingMore, setLoadingMore] = useState(false)
	const [busyKey, setBusyKey] = useState<string | null>(null)
	const [cancelItem, setCancelItem] = useState<BookingItem | null>(null)
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

	const applyPage = (res: BookingsPageData, forWhen: BookingsWhen) => {
		if (res.counts) setCountsFor({ when: forWhen, counts: res.counts })
		if (res.summary) setSummary(res.summary)
	}

	/** First page for the current when + category. 'refresh' = pull to refresh; otherwise silent when cached. */
	const load = useCallback(
		async (mode: 'focus' | 'refresh' | 'retry') => {
			const req = ++reqRef.current
			const cached = listRef.current?.key === key
			if (mode === 'refresh') setRefreshing(true)
			setFailedKey(null)
			try {
				const res = await getMyBookings({ when, category, page: 1, limit: PAGE_SIZE })
				if (req !== reqRef.current) return
				setList({ key, items: dedupe(res.items ?? []), page: res.page || 1, pages: res.pages || 1 })
				applyPage(res, when)
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
		[key, when, category]
	)

	// Runs on focus and whenever when / category change while focused.
	useFocusEffect(
		useCallback(() => {
			void load('focus')
		}, [load])
	)

	const loadMore = async () => {
		const current = listRef.current
		if (!current || current.key !== key || refreshing || loadingMore) return
		if (current.page >= current.pages) return
		const req = reqRef.current
		setLoadingMore(true)
		try {
			const res = await getMyBookings({ when, category, page: current.page + 1, limit: PAGE_SIZE })
			if (req !== reqRef.current) return
			setList((prev) =>
				prev && prev.key === key
					? {
							key,
							items: dedupe([...prev.items, ...(res.items ?? [])]),
							page: res.page || prev.page + 1,
							pages: res.pages || prev.pages,
						}
					: prev
			)
			applyPage(res, when)
		} catch {
			if (req === reqRef.current) Toast.show({ type: 'error', text1: "Couldn't load more bookings" })
		} finally {
			setLoadingMore(false)
		}
	}

	const items = list?.key === key ? list.items : []
	const sections = useMemo(() => groupBookings(items, when), [items, when])
	const counts = countsFor?.when === when ? countsFor.counts : null
	const showError = failedKey === key && list?.key !== key
	const showSkeleton = list?.key !== key && !showError

	const handlers = useMemo(
		() => ({
			requestAppointmentCancel: (item: BookingItem) => setCancelItem(item),
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
			style={styles.card}
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
	const emptyTitle = `No ${when === 'upcoming' ? 'upcoming' : 'past'}${categoryName} bookings`

	const listHeader = (
		<View style={styles.tiles} accessibilityLabel="Booking type">
			{CATEGORIES.map((c) => (
				<AppCategoryTile
					key={c.id}
					label={c.label}
					iconPath={c.icon}
					tone={c.tone}
					active={category === c.id}
					count={c.id === 'all' ? null : counts?.[c.id]}
					onPress={() => setCategory(c.id)}
				/>
			))}
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
			{isFocused && <StatusBar barStyle="light-content" backgroundColor={APP_COLORS.ink} />}

			<View style={[styles.hero, { paddingTop: insets.top + 8 }]}>
				<AppHeaderBackdrop />
				<View style={styles.heroRow}>
					<Text style={styles.heroTitle} accessibilityRole="header">
						My bookings
					</Text>
					{summary ? (
						<Text
							style={styles.heroSummary}
						>{`${summary.upcoming} upcoming · ${summary.today} today`}</Text>
					) : (
						<View style={styles.heroSummarySkeleton}>
							<AppSkeleton width={140} height={14} borderRadius={7} color={APP_COLORS.primary} />
						</View>
					)}
				</View>
				<View style={styles.whenTrack} accessibilityRole="tablist" accessibilityLabel="When">
					<View style={styles.whenTrackFill} />
					{WHEN_TABS.map((w) => {
						const on = when === w.id
						return (
							<Pressable
								key={w.id}
								accessibilityRole="tab"
								accessibilityState={{ selected: on }}
								onPress={() => setWhen(w.id)}
								style={[styles.whenTab, on && styles.whenTabOn]}
							>
								<Text style={[styles.whenText, on && styles.whenTextOn]}>{w.label}</Text>
							</Pressable>
						)
					})}
				</View>
			</View>

			<SectionList<BookingItem, BookingSection>
				sections={showSkeleton || showError ? [] : sections}
				keyExtractor={bookingKey}
				renderItem={renderItem}
				renderSectionHeader={({ section }) => <Text style={styles.sectionTitle}>{section.title}</Text>}
				stickySectionHeadersEnabled={false}
				ListHeaderComponent={listHeader}
				ListEmptyComponent={listEmpty}
				ListFooterComponent={
					loadingMore ? <ActivityIndicator style={styles.footerSpinner} color={APP_COLORS.primary} /> : null
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
						Toast.show({ type: 'success', text1: 'Appointment cancelled' })
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
	hero: {
		zIndex: 2,
		overflow: 'hidden',
		backgroundColor: APP_COLORS.ink,
		paddingHorizontal: 16,
		paddingBottom: 16,
		gap: 12,
		borderBottomLeftRadius: 24,
		borderBottomRightRadius: 24,
	},
	heroRow: {
		minHeight: 52,
		justifyContent: 'center',
	},
	heroTitle: {
		fontSize: 22,
		lineHeight: 28,
		fontWeight: '800',
		color: APP_COLORS.surface,
	},
	heroSummary: {
		fontSize: 13,
		lineHeight: 18,
		fontWeight: '600',
		color: APP_COLORS.mintAccent,
	},
	heroSummarySkeleton: {
		height: 18,
		justifyContent: 'center',
	},
	whenTrack: {
		flexDirection: 'row',
		gap: 4,
		padding: 4,
		borderRadius: 12,
		overflow: 'hidden',
	},
	// Translucent white track (design: #FFFFFF1F) built from the surface token.
	whenTrackFill: {
		...StyleSheet.absoluteFill,
		backgroundColor: APP_COLORS.surface,
		opacity: 0.12,
	},
	whenTab: {
		flex: 1,
		height: 38,
		borderRadius: 9,
		alignItems: 'center',
		justifyContent: 'center',
	},
	whenTabOn: {
		backgroundColor: APP_COLORS.surface,
	},
	whenText: {
		fontSize: 14,
		lineHeight: 20,
		fontWeight: '700',
		color: APP_COLORS.mint,
	},
	whenTextOn: {
		color: APP_COLORS.ink,
	},
	listContent: {
		paddingTop: 16,
		flexGrow: 1,
	},
	tiles: {
		flexDirection: 'row',
		gap: 6,
		paddingHorizontal: 16,
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
