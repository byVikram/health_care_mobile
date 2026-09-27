// src/components/common/booking/AppReviewItem.tsx
//
// One review from the "Recent reviews" list (nurse profile & reviews sheet): APP_COLORS.pageBg box, padding
// 10x12, radius 10, gap 2. Header row = reviewer 13/700 ink (+ optional muted date) on the left and the
// inline AppRatingStars (with the numeric value) on the right; review text 13/18 ink below.

import React from 'react'
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native'
import { APP_COLORS } from '../../../config/theme'
import { AppRatingStars } from '../display/AppRatingStars'

export type AppReviewItemProps = {
	/** Reviewer display name, e.g. "Priya S.". */
	who: string
	/** Rating out of 5 (number or numeric string such as "4.8"). */
	stars: number | string
	text?: string
	/** Optional relative / absolute date, e.g. "2 weeks ago". */
	dateLabel?: string
	style?: StyleProp<ViewStyle>
}

export function AppReviewItem({ who, stars, text, dateLabel, style }: AppReviewItemProps) {
	const value = Number(stars)
	const rating = Number.isFinite(value) ? value : 0
	const label = [`${who}${dateLabel ? `, ${dateLabel}` : ''}`, `${rating} out of 5 stars`, text]
		.filter(Boolean)
		.join('. ')

	return (
		<View style={[styles.box, style]} accessible accessibilityLabel={label}>
			<View style={styles.header}>
				<View style={styles.who}>
					<Text style={styles.name} numberOfLines={1}>
						{who}
					</Text>
					{!!dateLabel && (
						<Text style={styles.date} numberOfLines={1}>
							{dateLabel}
						</Text>
					)}
				</View>
				<AppRatingStars value={rating} size={12} showValue />
			</View>
			{!!text && <Text style={styles.text}>{text}</Text>}
		</View>
	)
}

const styles = StyleSheet.create({
	box: {
		paddingVertical: 10,
		paddingHorizontal: 12,
		borderRadius: 10,
		backgroundColor: APP_COLORS.pageBg,
		gap: 2,
	},
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		gap: 8,
	},
	who: {
		flex: 1,
		minWidth: 0,
		flexDirection: 'row',
		alignItems: 'baseline',
		gap: 6,
	},
	name: {
		flexShrink: 1,
		fontSize: 13,
		lineHeight: 18,
		fontWeight: '700',
		color: APP_COLORS.ink,
	},
	date: {
		flexShrink: 0,
		fontSize: 12,
		lineHeight: 16,
		color: APP_COLORS.inkMuted,
	},
	text: {
		fontSize: 13,
		lineHeight: 18,
		color: APP_COLORS.ink,
	},
})

export default AppReviewItem
