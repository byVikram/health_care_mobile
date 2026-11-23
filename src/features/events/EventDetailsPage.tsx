// src/features/events/EventDetailsPage.tsx
//
// "9a · Event detail": the shared teal header bar (back chevron, share), the hero (cover picture or the category's tone and icon), a card
// that overlaps it (category + mode badges, title, date, time, venue), the description, and a footer with "Add to
// calendar" and "Register now". Data: GET /api/events/public/{id}. Registration is the organiser's own link, so the
// design's in-app "Registered" state, "going" count and host card are not shown.

import React, { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, Image, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native'
import { useNavigation, useRoute } from '@react-navigation/native'
import type { RouteProp } from '@react-navigation/native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { AppPathIcon, AppScreenHeader } from '../../components/common'
import { EVENT_ICONS, lookForEvent } from '../../components/common/display/eventLook'
import { APP_COLORS } from '../../config/theme'
import type { AppStackParamList } from '../../navigation/types'
import { getPublicEvent } from '../../services/eventService'
import type { EventItem } from '../../types/event'
import { addToCalendar } from '../../utils/calendar'
import { eventDateParts, formatTimeRange, isOnlineEvent, parseEventDate } from '../../utils/eventFormat'
import { openWebUrl } from '../../utils/safeLinking'
import { openRegistration } from './eventActions'

type EventDetailsRoute = RouteProp<AppStackParamList, 'EventDetails'>

function InfoRow({ icon, title, sub }: { icon: string; title: string; sub?: string }) {
	return (
		<View style={styles.infoRow}>
			<View style={styles.infoIcon}>
				<AppPathIcon d={icon} size={20} strokeWidth={2} color={APP_COLORS.primary} />
			</View>
			<View style={styles.infoText}>
				<Text style={styles.infoTitle}>{title}</Text>
				{!!sub && <Text style={styles.infoSub}>{sub}</Text>}
			</View>
		</View>
	)
}

export default function EventDetailsPage() {
	const navigation = useNavigation()
	const { eventId } = useRoute<EventDetailsRoute>().params
	const insets = useSafeAreaInsets()

	const [event, setEvent] = useState<EventItem | null>(null)
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState(false)

	const load = useCallback(async () => {
		setLoading(true)
		setError(false)
		try {
			setEvent(await getPublicEvent(eventId))
		} catch {
			setError(true)
		} finally {
			setLoading(false)
		}
	}, [eventId])

	useEffect(() => {
		void load()
	}, [load])

	const header = (shareButton?: React.ReactNode) => (
		<AppScreenHeader
			variant="bar"
			solid
			title="Event details"
			onBack={() => navigation.goBack()}
			backAccessibilityLabel="Back to events"
			rightElement={shareButton}
		/>
	)

	if (loading || error || !event) {
		return (
			<View style={styles.screen}>
				{header()}
				<View style={styles.center}>
					{loading ? (
						<ActivityIndicator color={APP_COLORS.primary} />
					) : (
						<Pressable onPress={() => void load()} accessibilityRole="button">
							<Text style={styles.infoTitle}>
								{error
									? 'Couldn’t load this event. Tap to try again.'
									: 'This event is no longer available.'}
							</Text>
						</Pressable>
					)}
				</View>
			</View>
		)
	}

	const look = lookForEvent(event.category)
	const online = isOnlineEvent(event)
	const date = eventDateParts(event.event_date)
	const time = formatTimeRange(event.event_date, event.event_time, event.end_time)
	const venue = event.location?.trim()
	const hasLink = !!event.registration_link?.trim()

	const share = async () => {
		const when = [date.long, time].filter(Boolean).join(', ')
		const message = [event.title, when, online ? 'Online' : venue, hasLink ? event.registration_link : '']
			.filter(Boolean)
			.join('\n')
		try {
			await Share.share({ message })
		} catch {
			// The user closed the share sheet or sharing is unavailable: nothing to tell them.
		}
	}

	const calendar = async () => {
		const start = parseEventDate(event.event_date, event.event_time)
		if (!start) return
		await addToCalendar({
			title: event.title,
			start,
			end: parseEventDate(event.event_date, event.end_time),
			location: online ? undefined : venue,
			notes: event.description,
		})
	}

	const directions = async () => {
		if (!venue) return
		try {
			await openWebUrl(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venue)}`)
		} catch {
			// Maps could not be opened; the venue is still shown on screen.
		}
	}

	return (
		<View style={styles.screen}>
			{header(
				<Pressable
					onPress={() => void share()}
					accessibilityRole="button"
					accessibilityLabel="Share event"
					style={styles.shareBtn}
				>
					<AppPathIcon d={EVENT_ICONS.share} size={22} strokeWidth={2} color="#FFFFFF" />
				</Pressable>
			)}
			<ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
				<View style={[styles.hero, { backgroundColor: look.tone.bg }]}>
					{event.cover_image_url ? (
						<Image
							source={{ uri: event.cover_image_url }}
							style={StyleSheet.absoluteFill}
							resizeMode="cover"
						/>
					) : (
						<>
							<View style={styles.heroCircleA} />
							<View style={styles.heroCircleB} />
							<AppPathIcon d={look.icon} size={64} strokeWidth={1.6} color={look.tone.ink} />
						</>
					)}
				</View>

				<View style={styles.card}>
					<View style={styles.badges}>
						<Text style={[styles.badge, { backgroundColor: look.tone.bg, color: look.tone.ink }]}>
							{event.category_label || event.category}
						</Text>
						<Text style={[styles.badge, styles.badgeDark]}>{online ? 'Online' : 'In person'}</Text>
					</View>
					<Text style={styles.title}>{event.title}</Text>
					<InfoRow icon={EVENT_ICONS.calendar} title={date.long} />
					<InfoRow icon={EVENT_ICONS.clock} title={time} />
					<InfoRow
						icon={online ? EVENT_ICONS.video : EVENT_ICONS.pin}
						title={online ? 'Online event' : venue || 'Venue to be announced'}
						sub={online && hasLink ? 'Register to get the joining details' : undefined}
					/>
					{!online && !!venue && (
						<Pressable onPress={() => void directions()} accessibilityRole="link" style={styles.directions}>
							<Text style={styles.directionsText}>Get directions</Text>
							<AppPathIcon
								d={EVENT_ICONS.chevron}
								size={14}
								strokeWidth={2.4}
								color={APP_COLORS.primary}
							/>
						</Pressable>
					)}
				</View>

				<View style={styles.section}>
					<Text style={styles.h2} accessibilityRole="header">
						About this event
					</Text>
					<Text style={styles.body}>{event.description}</Text>
				</View>
			</ScrollView>

			<View style={[styles.footer, { paddingBottom: 20 + Math.max(insets.bottom - 12, 0) }]}>
				<Pressable onPress={() => void calendar()} accessibilityRole="button" style={styles.calendarBtn}>
					<AppPathIcon d={EVENT_ICONS.calendar} size={18} strokeWidth={2} color={APP_COLORS.primary} />
					<Text style={styles.calendarText}>Add to calendar</Text>
				</Pressable>
				{hasLink && (
					<Pressable
						onPress={() => void openRegistration(event)}
						accessibilityRole="button"
						style={styles.registerBtn}
					>
						<Text style={styles.registerText}>Register now</Text>
					</Pressable>
				)}
			</View>
		</View>
	)
}

const styles = StyleSheet.create({
	screen: { flex: 1, backgroundColor: APP_COLORS.pageBg },
	center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
	content: { paddingBottom: 24, gap: 12 },
	shareBtn: { width: 44, height: 44, marginRight: -10, alignItems: 'center', justifyContent: 'center' },
	hero: { height: 220, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
	heroCircleA: {
		position: 'absolute',
		right: -40,
		top: -40,
		width: 200,
		height: 200,
		borderRadius: 100,
		backgroundColor: '#FFFFFF66',
	},
	heroCircleB: {
		position: 'absolute',
		left: -30,
		bottom: -60,
		width: 160,
		height: 160,
		borderRadius: 80,
		backgroundColor: '#FFFFFF4D',
	},
	card: {
		marginHorizontal: 16,
		marginTop: -36,
		padding: 16,
		gap: 14,
		borderRadius: 16,
		backgroundColor: APP_COLORS.surface,
		borderWidth: 1,
		borderColor: APP_COLORS.divider,
	},
	badges: { flexDirection: 'row', alignItems: 'center', gap: 8 },
	badge: {
		paddingHorizontal: 8,
		paddingVertical: 2,
		borderRadius: 6,
		overflow: 'hidden',
		fontSize: 11,
		lineHeight: 16,
		fontWeight: '800',
	},
	badgeDark: { backgroundColor: APP_COLORS.ink, color: '#FFFFFF', fontWeight: '700' },
	title: { fontSize: 22, lineHeight: 28, fontWeight: '800', color: APP_COLORS.ink },
	infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
	infoIcon: {
		width: 40,
		height: 40,
		borderRadius: 12,
		backgroundColor: APP_COLORS.mint,
		alignItems: 'center',
		justifyContent: 'center',
	},
	infoText: { flex: 1, minWidth: 0, justifyContent: 'center', minHeight: 40 },
	infoTitle: { fontSize: 15, lineHeight: 20, fontWeight: '700', color: APP_COLORS.ink },
	infoSub: { fontSize: 13, lineHeight: 18, color: APP_COLORS.inkMuted },
	directions: {
		alignSelf: 'flex-start',
		marginTop: -4,
		marginLeft: 52,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
	},
	directionsText: { fontSize: 13, fontWeight: '700', color: APP_COLORS.primary },
	section: {
		marginHorizontal: 16,
		padding: 16,
		gap: 8,
		borderRadius: 14,
		backgroundColor: APP_COLORS.surface,
		borderWidth: 1,
		borderColor: APP_COLORS.divider,
	},
	h2: { fontSize: 16, lineHeight: 22, fontWeight: '800', color: APP_COLORS.ink },
	body: { fontSize: 14, lineHeight: 21, color: APP_COLORS.ink },
	footer: {
		flexDirection: 'row',
		gap: 10,
		paddingHorizontal: 16,
		paddingTop: 12,
		backgroundColor: APP_COLORS.surface,
		borderTopWidth: 1,
		borderTopColor: APP_COLORS.divider,
	},
	calendarBtn: {
		flexGrow: 1,
		height: 48,
		paddingHorizontal: 14,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: APP_COLORS.primary,
		backgroundColor: APP_COLORS.surface,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 6,
	},
	calendarText: { fontSize: 14, fontWeight: '700', color: APP_COLORS.primary },
	registerBtn: {
		flexGrow: 1,
		height: 48,
		borderRadius: 12,
		backgroundColor: APP_COLORS.primary,
		alignItems: 'center',
		justifyContent: 'center',
	},
	registerText: { fontSize: 15, fontWeight: '800', color: '#FFFFFF' },
})
