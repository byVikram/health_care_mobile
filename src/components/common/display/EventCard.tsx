// src/components/common/display/EventCard.tsx
//
// An event card from the "9 · Events" design, in two sizes:
//   variant 'list'    (Events screen): 96px banner, date tile + title / time / place, footer with Register
//   variant 'compact' (Home strip):    240px wide, 72px banner, title, "Sat, 22 Nov · 9:00 AM – 1:00 PM", place
// The banner is the event's cover picture when it has one, otherwise a soft tone with the category icon. The whole
// card opens the event; Register opens the event's registration link (the list variant shows it only when the event has one).

import React from 'react'
import { Image, Pressable, StyleSheet, Text, View } from 'react-native'
import { APP_COLORS } from '../../../config/theme'
import { eventDateParts, formatTimeRange, isOnlineEvent } from '../../../utils/eventFormat'
import type { EventItem } from '../../../types/event'
import { AppPathIcon } from './AppIcon'
import { EVENT_ICONS, lookForEvent } from './eventLook'

type Props = {
	item: EventItem
	variant?: 'list' | 'compact'
	onPress: () => void
	/** List variant only. Called when Register is tapped. */
	onRegister?: () => void
}

export function eventPlace(item: EventItem) {
	return isOnlineEvent(item) ? 'Online event' : item.location?.trim() || 'Venue to be announced'
}

function EventCard({ item, variant = 'list', onPress, onRegister }: Props) {
	const compact = variant === 'compact'
	const look = lookForEvent(item.category)
	const online = isOnlineEvent(item)
	const date = eventDateParts(item.event_date)
	const time = formatTimeRange(item.event_date, item.event_time, item.end_time)
	const category = item.category_label || item.category
	const hasLink = !!item.registration_link?.trim()
	const bannerHeight = compact ? 72 : 96

	const banner = (
		<View style={[styles.banner, { height: bannerHeight, backgroundColor: look.tone.bg }]}>
			{item.cover_image_url ? (
				<Image source={{ uri: item.cover_image_url }} style={StyleSheet.absoluteFill} resizeMode="cover" />
			) : (
				<>
					<View style={[styles.circleA, compact && styles.circleACompact]} />
					{!compact && <View style={styles.circleB} />}
					<AppPathIcon d={look.icon} size={compact ? 30 : 40} strokeWidth={1.8} color={look.tone.ink} />
				</>
			)}
			<View style={[styles.badge, compact ? styles.badgeLeftCompact : styles.badgeLeft]}>
				<Text style={[styles.badgeText, { color: look.tone.ink }]} numberOfLines={1}>
					{category}
				</Text>
			</View>
			<View style={[styles.badge, styles.badgeDark, compact ? styles.badgeRightCompact : styles.badgeRight]}>
				<Text style={[styles.badgeText, { color: '#FFFFFF' }]}>{online ? 'Online' : 'In person'}</Text>
			</View>
		</View>
	)

	if (compact) {
		return (
			<Pressable
				onPress={onPress}
				accessibilityRole="button"
				accessibilityLabel={`${item.title}, ${date.short}`}
				style={({ pressed }) => [styles.card, styles.compactCard, pressed && styles.pressed]}
			>
				{banner}
				<View style={styles.compactBody}>
					<Text style={styles.compactTitle} numberOfLines={1}>
						{item.title}
					</Text>
					<Text style={styles.meta} numberOfLines={1}>
						{[date.short, time].filter(Boolean).join(' · ')}
					</Text>
					<Text style={styles.place} numberOfLines={1}>
						{eventPlace(item)}
					</Text>
				</View>
			</Pressable>
		)
	}

	return (
		<View style={styles.card}>
			<Pressable
				onPress={onPress}
				accessibilityRole="button"
				accessibilityLabel={`${item.title}, ${date.short}, ${time}`}
				style={({ pressed }) => pressed && styles.pressed}
			>
				{banner}
				<View style={styles.row}>
					<View style={[styles.dateTile, { backgroundColor: look.tone.bg }]}>
						<Text style={[styles.dateMon, { color: look.tone.ink }]}>{date.mon}</Text>
						<Text style={[styles.dateDay, { color: look.tone.ink }]}>{date.day}</Text>
					</View>
					<View style={styles.col}>
						<Text style={styles.title} numberOfLines={2}>
							{item.title}
						</Text>
						<View style={styles.metaRow}>
							<AppPathIcon
								d={EVENT_ICONS.clock}
								size={14}
								strokeWidth={2.2}
								color={APP_COLORS.inkMuted}
							/>
							<Text style={styles.metaFlex}>{[date.dow, time].filter(Boolean).join(' · ')}</Text>
						</View>
						<View style={styles.metaRow}>
							<AppPathIcon
								d={online ? EVENT_ICONS.video : EVENT_ICONS.pin}
								size={14}
								strokeWidth={2.2}
								color={APP_COLORS.inkMuted}
							/>
							<Text style={styles.metaFlex} numberOfLines={2}>
								{eventPlace(item)}
							</Text>
						</View>
					</View>
				</View>
			</Pressable>
			<View style={styles.footer}>
				<Text style={styles.footerNote}>
					{item.going_count != null
						? `${item.going_count} going`
						: hasLink
							? 'Registration open'
							: 'View details'}
				</Text>
				{item.is_registered ? (
					<View style={styles.registeredBtn} accessibilityLabel="You are registered">
						<Text style={styles.registeredText}>Registered ✓</Text>
					</View>
				) : (
					hasLink &&
					!!onRegister && (
						<Pressable
							onPress={onRegister}
							accessibilityRole="button"
							accessibilityLabel={`Register for ${item.title}`}
							style={({ pressed }) => [styles.registerBtn, pressed && styles.pressed]}
						>
							<Text style={styles.registerText}>Register</Text>
						</Pressable>
					)
				)}
			</View>
		</View>
	)
}

export default React.memo(EventCard)

const styles = StyleSheet.create({
	card: {
		borderRadius: 14,
		backgroundColor: APP_COLORS.surface,
		borderWidth: 1,
		borderColor: APP_COLORS.divider,
		overflow: 'hidden',
	},
	compactCard: { width: 240 },
	pressed: { opacity: 0.85 },
	banner: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
	circleA: {
		position: 'absolute',
		right: -24,
		top: -30,
		width: 120,
		height: 120,
		borderRadius: 60,
		backgroundColor: '#FFFFFF66',
	},
	circleACompact: { right: -20, top: -26, width: 90, height: 90, borderRadius: 45 },
	circleB: {
		position: 'absolute',
		left: -20,
		bottom: -40,
		width: 90,
		height: 90,
		borderRadius: 45,
		backgroundColor: '#FFFFFF4D',
	},
	badge: {
		position: 'absolute',
		top: 12,
		maxWidth: '55%',
		paddingHorizontal: 8,
		paddingVertical: 2,
		borderRadius: 6,
		backgroundColor: '#FFFFFF',
	},
	badgeDark: { backgroundColor: APP_COLORS.ink },
	badgeLeft: { left: 12 },
	badgeRight: { right: 12 },
	badgeLeftCompact: { left: 10, top: 10 },
	badgeRightCompact: { right: 10, top: 10 },
	badgeText: { fontSize: 11, lineHeight: 16, fontWeight: '800' },
	row: { flexDirection: 'row', gap: 12, paddingHorizontal: 14, paddingTop: 12 },
	dateTile: { width: 48, height: 52, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
	dateMon: { fontSize: 11, lineHeight: 14, fontWeight: '800' },
	dateDay: { fontSize: 20, lineHeight: 24, fontWeight: '800' },
	col: { flex: 1, minWidth: 0, gap: 3 },
	title: { fontSize: 15, lineHeight: 20, fontWeight: '800', color: APP_COLORS.ink },
	metaRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
	metaFlex: { flex: 1, fontSize: 12, lineHeight: 16, color: APP_COLORS.inkMuted },
	footer: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		paddingHorizontal: 14,
		paddingTop: 10,
		paddingBottom: 12,
	},
	footerNote: { flex: 1, fontSize: 12, lineHeight: 16, fontWeight: '700', color: APP_COLORS.primary },
	registerBtn: {
		height: 36,
		paddingHorizontal: 14,
		borderRadius: 10,
		backgroundColor: APP_COLORS.primary,
		alignItems: 'center',
		justifyContent: 'center',
	},
	registeredBtn: {
		height: 36,
		paddingHorizontal: 14,
		borderRadius: 10,
		backgroundColor: APP_COLORS.mint,
		alignItems: 'center',
		justifyContent: 'center',
	},
	registeredText: { fontSize: 13, fontWeight: '700', color: APP_COLORS.primary },
	registerText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
	compactBody: { gap: 2, paddingHorizontal: 12, paddingTop: 10, paddingBottom: 12 },
	compactTitle: { fontSize: 15, lineHeight: 20, fontWeight: '800', color: APP_COLORS.ink },
	meta: { fontSize: 12, lineHeight: 16, color: APP_COLORS.inkMuted },
	place: { fontSize: 12, lineHeight: 16, fontWeight: '700', color: APP_COLORS.primary },
})
