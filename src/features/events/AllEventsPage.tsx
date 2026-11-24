// src/features/events/AllEventsPage.tsx
//
// "9 · Events": ink header with the search field, category chips, and one card per upcoming event.
// Data: GET /api/events/public (published events that have not finished, soonest first).
// The design's "Registered" tab and "going" counts have no backend yet (registration happens on the organiser's own
// link), so the screen lists upcoming events only.

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
	ActivityIndicator,
	FlatList,
	Pressable,
	RefreshControl,
	StyleSheet,
	Text,
	View,
	useWindowDimensions,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'

import { AppPathIcon, EventCard } from '../../components/common'
import { EVENT_ICONS } from '../../components/common/display/eventLook'
import { APP_COLORS } from '../../config/theme'
import { ROUTES } from '../../navigation/routes'
import type { AppStackParamList } from '../../navigation/types'
import { getPublicEvents } from '../../services/eventService'
import type { EventItem } from '../../types/event'
import { FeedHeader } from '../health-feed/FeedHeader'
import { openRegistration } from './eventActions'

type Nav = NativeStackNavigationProp<AppStackParamList>

const ALL = 'all'

type Tab = 'upcoming' | 'registered'

// The category chips of the design, always shown (even when only a few events exist). Values are the backend's
// `category` keys; any other category an event has gets its own chip after these.
const CATEGORY_CHIPS: { value: string; label: string }[] = [
	{ value: ALL, label: 'All' },
	{ value: 'webinar', label: 'Webinars' },
	{ value: 'health_camp', label: 'Health camps' },
	{ value: 'workshop', label: 'Workshops' },
	{ value: 'seminar', label: 'Seminars' },
	{ value: 'vaccination_camp', label: 'Vaccination camps' },
	{ value: 'health_awareness', label: 'Awareness' },
	{ value: 'live_qa', label: 'Live Q&A' },
	{ value: 'fitness_wellness', label: 'Fitness' },
	{ value: 'nutrition_session', label: 'Nutrition' },
]

export default function AllEventsPage() {
	const navigation = useNavigation<Nav>()
	const { width } = useWindowDimensions()
	const numColumns = width >= 768 ? 2 : 1

	const [events, setEvents] = useState<EventItem[]>([])
	const [loading, setLoading] = useState(true)
	const [refreshing, setRefreshing] = useState(false)
	const [error, setError] = useState(false)
	const [query, setQuery] = useState('')
	const [category, setCategory] = useState(ALL)
	const [tab, setTab] = useState<Tab>('upcoming')

	const load = useCallback(async () => {
		setError(false)
		try {
			setEvents(await getPublicEvents(100))
		} catch {
			setError(true)
		} finally {
			setLoading(false)
		}
	}, [])

	useEffect(() => {
		void load()
	}, [load])

	const chipList = useMemo(() => {
		const known = new Set(CATEGORY_CHIPS.map((c) => c.value))
		const extra = new Map<string, string>()
		for (const e of events)
			if (e.category && !known.has(e.category)) extra.set(e.category, e.category_label || e.category)
		return [...CATEGORY_CHIPS, ...Array.from(extra, ([value, label]) => ({ value, label }))]
	}, [events])

	const q = query.trim().toLowerCase()
	const list = useMemo(
		() =>
			events.filter(
				(e) =>
					(tab === 'upcoming' || !!e.is_registered) &&
					(category === ALL || e.category === category) &&
					(!q ||
						`${e.title} ${e.category_label} ${e.location ?? ''} ${e.description}`.toLowerCase().includes(q))
			),
		[events, category, q, tab]
	)
	const registeredCount = useMemo(() => events.filter((e) => e.is_registered).length, [events])

	const tabs = (
		<View style={styles.tabs} accessibilityRole="tablist">
			{(['upcoming', 'registered'] as const).map((t) => {
				const on = t === tab
				return (
					<Pressable
						key={t}
						accessibilityRole="tab"
						accessibilityState={{ selected: on }}
						onPress={() => setTab(t)}
						style={[styles.tab, on && styles.tabOn]}
					>
						<Text style={[styles.tabText, on && styles.tabTextOn]}>
							{t === 'upcoming' ? 'Upcoming' : `Registered (${registeredCount})`}
						</Text>
					</Pressable>
				)
			})}
		</View>
	)

	const openEvent = (e: EventItem) => navigation.navigate(ROUTES.STACK.EVENT_DETAILS, { eventId: e.id })

	const chips = (
		<View style={styles.chipsWrap}>
			<FlatList
				data={chipList}
				horizontal
				showsHorizontalScrollIndicator={false}
				keyExtractor={(c) => c.value}
				contentContainerStyle={styles.chips}
				renderItem={({ item: c }) => {
					const on = c.value === category
					return (
						<Pressable
							accessibilityRole="button"
							accessibilityState={{ selected: on }}
							onPress={() => setCategory(c.value)}
							style={[styles.chip, on && styles.chipOn]}
						>
							<Text
								numberOfLines={1}
								style={[styles.chipText, { color: on ? '#FFFFFF' : APP_COLORS.ink }]}
							>
								{c.label}
							</Text>
						</Pressable>
					)
				}}
			/>
		</View>
	)

	return (
		<View style={styles.screen}>
			<FeedHeader
				title="Events"
				subtitle="Health camps, webinars & talks near you"
				onBack={() => navigation.goBack()}
				search={{ value: query, onChange: setQuery, context: 'events' }}
			/>
			{tabs}

			{loading ? (
				<ActivityIndicator style={styles.loader} color={APP_COLORS.primary} />
			) : error && events.length === 0 ? (
				<Pressable onPress={() => void load()} accessibilityRole="button" style={styles.emptyBox}>
					<Text style={styles.emptyTitle}>Couldn’t load events</Text>
					<Text style={styles.emptySub}>Tap to try again.</Text>
				</Pressable>
			) : (
				<FlatList
					key={numColumns}
					numColumns={numColumns}
					data={list}
					keyExtractor={(e) => e.id}
					ListHeaderComponent={chips}
					contentContainerStyle={styles.content}
					columnWrapperStyle={numColumns > 1 ? styles.column : undefined}
					showsVerticalScrollIndicator={false}
					refreshControl={
						<RefreshControl
							refreshing={refreshing}
							onRefresh={async () => {
								setRefreshing(true)
								await load()
								setRefreshing(false)
							}}
							tintColor={APP_COLORS.primary}
						/>
					}
					ListEmptyComponent={
						<View style={styles.emptyBox}>
							<View style={styles.emptyIcon}>
								<AppPathIcon
									d={EVENT_ICONS.calendar}
									size={24}
									strokeWidth={2}
									color={APP_COLORS.primary}
								/>
							</View>
							<Text style={styles.emptyTitle}>
								{tab === 'registered' && registeredCount === 0
									? 'No registered events'
									: events.length === 0
										? 'No upcoming events'
										: 'No events found'}
							</Text>
							<Text style={styles.emptySub}>
								{tab === 'registered' && registeredCount === 0
									? 'Events you register for will show up here.'
									: events.length === 0
										? 'New health camps and webinars will show up here.'
										: 'Try another category or search term.'}
							</Text>
						</View>
					}
					renderItem={({ item }) => (
						<View style={numColumns > 1 ? styles.cell : undefined}>
							<EventCard
								item={item}
								onPress={() => openEvent(item)}
								onRegister={() => void openRegistration(item)}
							/>
						</View>
					)}
					ItemSeparatorComponent={numColumns === 1 ? Separator : undefined}
				/>
			)}
		</View>
	)
}

const Separator = () => <View style={{ height: 12 }} />

const styles = StyleSheet.create({
	screen: { flex: 1, backgroundColor: APP_COLORS.pageBg },
	loader: { marginTop: 32 },
	content: { paddingTop: 12, paddingHorizontal: 16, paddingBottom: 32, gap: 0 },
	tabs: {
		flexDirection: 'row',
		backgroundColor: APP_COLORS.surface,
		borderBottomWidth: 1,
		borderBottomColor: APP_COLORS.divider,
	},
	tab: {
		flex: 1,
		height: 44,
		alignItems: 'center',
		justifyContent: 'center',
		borderBottomWidth: 2,
		borderBottomColor: 'transparent',
	},
	tabOn: { borderBottomColor: APP_COLORS.primary },
	tabText: { fontSize: 14, fontWeight: '700', color: APP_COLORS.inkMuted },
	tabTextOn: { color: APP_COLORS.primary },
	chipsWrap: { marginHorizontal: -16, marginBottom: 12 },
	chips: { gap: 8, paddingHorizontal: 16 },
	chip: {
		height: 36,
		paddingHorizontal: 14,
		borderRadius: 9999,
		borderWidth: 1,
		borderColor: APP_COLORS.divider,
		backgroundColor: APP_COLORS.surface,
		alignItems: 'center',
		justifyContent: 'center',
	},
	chipOn: { backgroundColor: APP_COLORS.ink, borderColor: APP_COLORS.ink },
	chipText: { fontSize: 13, fontWeight: '700' },
	column: { gap: 12, marginBottom: 12 },
	cell: { flex: 1 },
	emptyBox: {
		marginTop: 24,
		marginHorizontal: 16,
		paddingVertical: 24,
		paddingHorizontal: 16,
		borderRadius: 14,
		borderWidth: 1,
		borderStyle: 'dashed',
		borderColor: APP_COLORS.divider,
		alignItems: 'center',
		gap: 6,
	},
	emptyIcon: {
		width: 48,
		height: 48,
		borderRadius: 14,
		backgroundColor: APP_COLORS.mint,
		alignItems: 'center',
		justifyContent: 'center',
	},
	emptyTitle: { fontSize: 15, lineHeight: 20, fontWeight: '800', color: APP_COLORS.ink, textAlign: 'center' },
	emptySub: { fontSize: 13, lineHeight: 18, color: APP_COLORS.inkMuted, textAlign: 'center' },
})
