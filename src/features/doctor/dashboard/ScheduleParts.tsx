// src/features/doctor/dashboard/ScheduleParts.tsx
//
// Small pieces of the redesigned Schedule screen ("Doctor Dashboard NEW"):
//   RequestsBanner  the amber "4 booking requests · 1 may need urgent care · Review >" strip under the dates
//   DayProgress     the thin bar and the "4 seen · 1 no-show · 7 to go" line under the day's title

import React from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { AppPathIcon } from '../../../components/common'
import { APP_COLORS, TONES } from '../../../config/theme'

const BANNER_BG = '#FDF1DC'
const BANNER_EDGE = '#F2D9A6'
const BANNER_INK = '#8A5300'
const NO_SHOW = APP_COLORS.offer
const CHEVRON = 'M9 6l6 6-6 6'

export function RequestsBanner({ count, urgent, onPress }: { count: number; urgent: number; onPress: () => void }) {
	if (count <= 0) return null
	return (
		<TouchableOpacity
			onPress={onPress}
			activeOpacity={0.85}
			accessibilityRole="button"
			accessibilityLabel={`${count} booking ${count === 1 ? 'request' : 'requests'}${urgent > 0 ? `, ${urgent} may need urgent care` : ''}. Review`}
			style={styles.banner}
		>
			<View style={styles.badge}>
				<Text style={styles.badgeText}>{count}</Text>
			</View>
			<View style={{ flex: 1, minWidth: 0 }}>
				<Text style={styles.bannerTitle}>
					{count} booking {count === 1 ? 'request' : 'requests'}
				</Text>
				{urgent > 0 && <Text style={styles.bannerSub}>{urgent} may need urgent care</Text>}
			</View>
			<Text style={styles.review}>Review</Text>
			<AppPathIcon d={CHEVRON} size={16} strokeWidth={2.6} color={BANNER_INK} />
		</TouchableOpacity>
	)
}

export function DayProgress({ seen, noShow, toGo }: { seen: number; noShow: number; toGo: number }) {
	const total = seen + noShow + toGo
	if (total <= 0) return null
	return (
		<View style={{ gap: 6 }}>
			<View
				style={styles.track}
				accessible
				accessibilityRole="progressbar"
				accessibilityLabel={`${seen} seen, ${noShow} no-show, ${toGo} to go`}
			>
				<View style={{ flex: seen, backgroundColor: APP_COLORS.primary }} />
				<View style={{ flex: noShow, backgroundColor: NO_SHOW }} />
				<View style={{ flex: toGo }} />
			</View>
			<Text style={styles.summary}>
				<Text style={styles.summaryBold}>{seen} seen</Text>
				{noShow > 0 && (
					<>
						{' · '}
						<Text style={styles.summaryBold}>{noShow} no-show</Text>
					</>
				)}
				{' · '}
				<Text style={styles.summaryBold}>{toGo} to go</Text>
			</Text>
		</View>
	)
}

const styles = StyleSheet.create({
	banner: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		padding: 14,
		borderRadius: 14,
		borderWidth: 1,
		borderColor: BANNER_EDGE,
		backgroundColor: BANNER_BG,
	},
	badge: {
		width: 32,
		height: 32,
		borderRadius: 9999,
		backgroundColor: BANNER_INK,
		alignItems: 'center',
		justifyContent: 'center',
	},
	badgeText: { fontSize: 14, lineHeight: 18, fontWeight: '800', color: '#FFFFFF' },
	bannerTitle: { fontSize: 16, lineHeight: 22, fontWeight: '800', color: APP_COLORS.ink },
	bannerSub: { fontSize: 13, lineHeight: 18, fontWeight: '700', color: BANNER_INK },
	review: { fontSize: 14, lineHeight: 20, fontWeight: '800', color: BANNER_INK },
	track: { flexDirection: 'row', height: 6, borderRadius: 9999, overflow: 'hidden', backgroundColor: TONES.mint.bg },
	summary: { fontSize: 13, lineHeight: 18, color: APP_COLORS.inkMuted },
	summaryBold: { fontWeight: '800', color: APP_COLORS.ink },
})
