// src/components/common/display/AppSoftCard.tsx
//
// Bordered white card from the doctor-dashboard designs (Up next / Later today / request cards):
// surface bg, 1px APP_COLORS.divider border, radius 12-14. Deliberately plainer than CommonCard
// (no drop shadow) — this is the "flat outline" card style used across the doctor dashboard,
// schedule, engage and consultation screens, and reusable as-is for future modules (Pharmacy,
// Laboratory order cards, etc.) that want the same flat-card look.

import React from 'react'
import { StyleSheet, TouchableOpacity, View, type StyleProp, type ViewStyle } from 'react-native'
import { APP_COLORS } from '../../../config/theme'

export type AppSoftCardProps = {
	children?: React.ReactNode
	/** Corner radius. Defaults to 14. */
	radius?: number
	/** Inner padding. Defaults to 14. Pass 0 to lay out padding yourself (e.g. a card with an inset footer band). */
	padding?: number
	/** Border colour override. Defaults to APP_COLORS.divider; pass e.g. APP_COLORS.mintAccent for a "success/done" card. */
	borderColor?: string
	/** Makes the whole card pressable (e.g. a request card that opens a detail screen). */
	onPress?: () => void
	style?: StyleProp<ViewStyle>
	accessibilityLabel?: string
}

export function AppSoftCard({
	children,
	radius = 14,
	padding = 14,
	borderColor = APP_COLORS.divider,
	onPress,
	style,
	accessibilityLabel,
}: AppSoftCardProps) {
	const cardStyle = [styles.card, { borderRadius: radius, padding, borderColor }, style]
	if (onPress) {
		return (
			<TouchableOpacity
				style={cardStyle}
				onPress={onPress}
				accessibilityRole="button"
				accessibilityLabel={accessibilityLabel}
				activeOpacity={0.85}
			>
				{children}
			</TouchableOpacity>
		)
	}
	return (
		<View style={cardStyle} accessibilityLabel={accessibilityLabel}>
			{children}
		</View>
	)
}

const styles = StyleSheet.create({
	card: {
		backgroundColor: APP_COLORS.surface,
		borderWidth: 1,
		overflow: 'hidden',
	},
})

export default AppSoftCard
