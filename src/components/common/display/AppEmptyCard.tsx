// src/components/common/display/AppEmptyCard.tsx
//
// "Nothing here yet" card from the Medical records design: a white bordered card with a 15/800 title and a muted
// explanation, centred. For an empty list inside a scrolling page (an empty search, a tab with no items).

import React from 'react'
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native'
import { APP_COLORS } from '../../../config/theme'

export type AppEmptyCardProps = {
	title: string
	message?: string
	style?: StyleProp<ViewStyle>
}

export function AppEmptyCard({ title, message, style }: AppEmptyCardProps) {
	return (
		<View
			style={[styles.card, style]}
			accessibilityRole="text"
			accessibilityLabel={message ? `${title}. ${message}` : title}
		>
			<Text style={styles.title}>{title}</Text>
			{!!message && <Text style={styles.message}>{message}</Text>}
		</View>
	)
}

const styles = StyleSheet.create({
	card: {
		paddingVertical: 28,
		paddingHorizontal: 16,
		borderRadius: 14,
		backgroundColor: APP_COLORS.surface,
		borderWidth: 1,
		borderColor: APP_COLORS.divider,
		alignItems: 'center',
		gap: 4,
	},
	title: { fontSize: 15, lineHeight: 20, fontWeight: '800', color: APP_COLORS.ink, textAlign: 'center' },
	message: { fontSize: 13, lineHeight: 18, color: APP_COLORS.inkMuted, textAlign: 'center' },
})

export default AppEmptyCard
