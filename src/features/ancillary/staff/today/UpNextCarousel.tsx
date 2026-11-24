// src/features/ancillary/staff/today/UpNextCarousel.tsx
//
// "Up next · N" of the provider Home (Ancillary Home design): a snapping row of visit cards, then a dashed "Full schedule" card
// at the end, with a dot for the card on show. A card: a strip (INSTANT / SCHEDULED + when), the patient with a status chip, the
// services, the address with the minutes away, a tag, and Call + Open visit (the first card is filled, the rest outlined).
import React, { useState } from 'react'
import {
	Pressable,
	ScrollView,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
	type NativeScrollEvent,
	type NativeSyntheticEvent,
} from 'react-native'
import { AppPathIcon } from '../../../../components/common'
import { APP_COLORS } from '../../../../config/theme'
import { PATHS } from '../schedule/scheduleTheme'
import type { UpNextCard } from './upNextView'

const CARD_W = 318
const GAP = 10

type Props = {
	cards: UpNextCard[]
	onOpen: (card: UpNextCard) => void
	onCall: (card: UpNextCard) => void
	onFullSchedule: () => void
}

export function UpNextCarousel({ cards, onOpen, onCall, onFullSchedule }: Props) {
	const [active, setActive] = useState(0)

	const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
		const i = Math.round(e.nativeEvent.contentOffset.x / (CARD_W + GAP))
		const next = Math.max(0, Math.min(i, cards.length - 1))
		if (next !== active) setActive(next)
	}

	return (
		<View style={styles.section}>
			<View style={styles.head}>
				<Text style={styles.title} accessibilityRole="header">
					Up next
					<Text style={styles.count}>{` · ${cards.length}`}</Text>
				</Text>
				<TouchableOpacity
					onPress={onFullSchedule}
					activeOpacity={0.7}
					accessibilityRole="link"
					style={styles.link}
				>
					<Text style={styles.linkText}>Full schedule</Text>
					<AppPathIcon d={PATHS.chevronRight} size={16} strokeWidth={2.4} color={APP_COLORS.primary} />
				</TouchableOpacity>
			</View>

			<ScrollView
				horizontal
				showsHorizontalScrollIndicator={false}
				snapToInterval={CARD_W + GAP}
				snapToAlignment="start"
				decelerationRate="fast"
				contentContainerStyle={styles.row}
				onScroll={onScroll}
				scrollEventThrottle={32}
			>
				{cards.map((c, i) => (
					<View
						key={c.id}
						accessible
						accessibilityLabel={`${i + 1} of ${cards.length} · ${c.name}`}
						style={[
							styles.card,
							{ borderWidth: i === 0 ? 2 : 1, borderColor: i === 0 ? c.accent : APP_COLORS.divider },
						]}
					>
						<View style={[styles.strip, { backgroundColor: c.stripBg }]}>
							<Text style={[styles.stripText, { color: c.stripInk }]}>{c.strip}</Text>
							<Text style={styles.when}>{c.when}</Text>
						</View>
						<View style={styles.body}>
							<View style={styles.who}>
								<View style={[styles.avatar, { backgroundColor: c.stripBg }]}>
									<Text style={[styles.avatarText, { color: c.stripInk }]}>{c.initials}</Text>
								</View>
								<View style={styles.whoText}>
									<Text style={styles.name} numberOfLines={1}>
										{c.name}
									</Text>
									{!!c.who && (
										<Text style={styles.whoLine} numberOfLines={1}>
											{c.who}
										</Text>
									)}
								</View>
								<View style={styles.status}>
									<Text style={styles.statusText}>{c.status}</Text>
								</View>
							</View>

							<View style={styles.services}>
								<Text style={styles.servicesLabel}>SERVICES</Text>
								<Text style={styles.servicesText} numberOfLines={2}>
									{c.service}
								</Text>
							</View>

							<View style={styles.addrRow}>
								<AppPathIcon d={PATHS.pin} size={16} strokeWidth={2.2} color={APP_COLORS.primary} />
								<Text style={styles.addr} numberOfLines={1}>
									{c.address}
								</Text>
								{!!c.live && <Text style={styles.live}>{c.live}</Text>}
							</View>

							<View style={styles.tags}>
								{c.tags.map((t) => (
									<View key={t.label} style={[styles.tag, { backgroundColor: t.bg }]}>
										<Text style={[styles.tagText, { color: t.ink }]}>{t.label}</Text>
									</View>
								))}
							</View>

							<View style={styles.actions}>
								<Pressable
									onPress={() => onCall(c)}
									accessibilityRole="button"
									accessibilityLabel={`Call ${c.name}`}
									style={styles.callBtn}
								>
									<AppPathIcon d={PATHS.phone} size={20} strokeWidth={2} color={APP_COLORS.primary} />
								</Pressable>
								<TouchableOpacity
									onPress={() => onOpen(c)}
									activeOpacity={0.85}
									accessibilityRole="button"
									style={[styles.cta, c.primary && styles.ctaPrimary]}
								>
									<Text style={[styles.ctaText, c.primary && styles.ctaTextPrimary]}>{c.cta}</Text>
								</TouchableOpacity>
							</View>
						</View>
					</View>
				))}

				<Pressable onPress={onFullSchedule} accessibilityRole="link" style={styles.more}>
					<View style={styles.moreCircle}>
						<AppPathIcon d={PATHS.calendar} size={22} strokeWidth={2.2} color={APP_COLORS.primary} />
					</View>
					<Text style={styles.moreText}>Full schedule</Text>
				</Pressable>
			</ScrollView>

			{cards.length > 1 && (
				<View style={styles.dots} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
					{cards.map((c, i) => (
						<View
							key={c.id}
							style={[
								styles.dot,
								{
									width: i === active ? 18 : 6,
									backgroundColor: i === active ? APP_COLORS.primary : '#C9D5D6',
								},
							]}
						/>
					))}
				</View>
			)}
		</View>
	)
}

const styles = StyleSheet.create({
	section: { gap: 10 },
	head: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		gap: 8,
		paddingHorizontal: 16,
	},
	title: { fontSize: 16, lineHeight: 22, fontWeight: '800', color: APP_COLORS.ink },
	count: { fontWeight: '700', color: APP_COLORS.inkMuted },
	link: { height: 36, flexDirection: 'row', alignItems: 'center', gap: 2 },
	linkText: { fontSize: 13, fontWeight: '700', color: APP_COLORS.primary },
	row: { gap: GAP, paddingHorizontal: 16, paddingTop: 2, paddingBottom: 4 },
	card: {
		width: CARD_W,
		borderRadius: 14,
		backgroundColor: APP_COLORS.surface,
		overflow: 'hidden',
	},
	strip: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingVertical: 10,
		paddingHorizontal: 14,
	},
	stripText: { fontSize: 11, lineHeight: 14, fontWeight: '800', letterSpacing: 0.7 },
	when: { fontSize: 13, lineHeight: 18, fontWeight: '800', color: APP_COLORS.ink },
	body: { flex: 1, padding: 14, gap: 12 },
	who: { flexDirection: 'row', alignItems: 'center', gap: 12 },
	avatar: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
	avatarText: { fontSize: 16, fontWeight: '800' },
	whoText: { flex: 1, minWidth: 0 },
	name: { fontSize: 16, lineHeight: 22, fontWeight: '800', color: APP_COLORS.ink },
	whoLine: { fontSize: 13, lineHeight: 18, color: APP_COLORS.inkMuted },
	status: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, backgroundColor: APP_COLORS.successBg },
	statusText: { fontSize: 11, lineHeight: 16, fontWeight: '700', color: APP_COLORS.success },
	services: { padding: 10, paddingHorizontal: 12, borderRadius: 10, backgroundColor: APP_COLORS.pageBg, gap: 2 },
	servicesLabel: { fontSize: 11, lineHeight: 14, fontWeight: '800', letterSpacing: 0.7, color: APP_COLORS.inkMuted },
	servicesText: { minHeight: 36, fontSize: 13, lineHeight: 18, color: APP_COLORS.ink },
	addrRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
	addr: { flex: 1, minWidth: 0, fontSize: 13, lineHeight: 18, color: '#3F5357' },
	live: { fontSize: 12, fontWeight: '700', color: '#B4532A' },
	tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, minHeight: 22 },
	tag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
	tagText: { fontSize: 12, lineHeight: 18, fontWeight: '700' },
	actions: { marginTop: 'auto', flexDirection: 'row', gap: 8 },
	callBtn: {
		width: 44,
		height: 44,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: APP_COLORS.border,
		backgroundColor: APP_COLORS.surface,
		alignItems: 'center',
		justifyContent: 'center',
	},
	cta: {
		flex: 1,
		height: 44,
		borderRadius: 12,
		borderWidth: 1.5,
		borderColor: APP_COLORS.primary,
		backgroundColor: APP_COLORS.surface,
		alignItems: 'center',
		justifyContent: 'center',
	},
	ctaPrimary: { backgroundColor: APP_COLORS.primary },
	ctaText: { fontSize: 14, fontWeight: '800', color: APP_COLORS.primary },
	ctaTextPrimary: { color: '#FFFFFF' },
	more: {
		width: 140,
		borderRadius: 14,
		borderWidth: 1.5,
		borderStyle: 'dashed',
		borderColor: '#9FC3C4',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 8,
	},
	moreCircle: {
		width: 44,
		height: 44,
		borderRadius: 22,
		backgroundColor: APP_COLORS.mint,
		alignItems: 'center',
		justifyContent: 'center',
	},
	moreText: { fontSize: 14, fontWeight: '800', color: APP_COLORS.primary, textAlign: 'center' },
	dots: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
	dot: { height: 6, borderRadius: 3 },
})
