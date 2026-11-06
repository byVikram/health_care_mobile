// src/components/common/display/AppDashedActionCard.tsx
//
// Dashed "add something" card from the Medical records design ("Upload health records"): a 1.5px dashed border, a 44px
// mint tile with an icon, a title and a muted line, and a small primary action pill on the right. The whole card is the
// button. Use it where a list invites the user to add its first (or next) item.

import React from 'react'
import { StyleSheet, Text, TouchableOpacity, View, type StyleProp, type ViewStyle } from 'react-native'
import { APP_COLORS } from '../../../config/theme'
import { AppIconTile } from './AppIconTile'
import { AppPathIcon } from './AppIcon'

export type AppDashedActionCardProps = {
	title: string
	subtitle?: string
	/** Label of the pill on the right ("Upload"). */
	actionLabel: string
	/** 24x24 stroke path for the tile. */
	iconPath: string
	onPress: () => void
	style?: StyleProp<ViewStyle>
}

export function AppDashedActionCard({
	title,
	subtitle,
	actionLabel,
	iconPath,
	onPress,
	style,
}: AppDashedActionCardProps) {
	return (
		<TouchableOpacity
			onPress={onPress}
			activeOpacity={0.85}
			accessibilityRole="button"
			accessibilityLabel={`${title}. ${actionLabel}`}
			style={[styles.card, style]}
		>
			<AppIconTile tone="mint" size={44} radius={12} iconSize={22}>
				<AppPathIcon d={iconPath} size={22} strokeWidth={2} color={APP_COLORS.primary} />
			</AppIconTile>
			<View style={styles.text}>
				<Text style={styles.title}>{title}</Text>
				{!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
			</View>
			<View style={styles.action}>
				<Text style={styles.actionText}>{actionLabel}</Text>
			</View>
		</TouchableOpacity>
	)
}

const styles = StyleSheet.create({
	card: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		paddingVertical: 12,
		paddingHorizontal: 14,
		borderRadius: 14,
		borderWidth: 1.5,
		borderStyle: 'dashed',
		borderColor: '#9FB4B6',
		backgroundColor: APP_COLORS.surface,
	},
	text: { flex: 1, minWidth: 0 },
	title: { fontSize: 15, lineHeight: 20, fontWeight: '800', color: APP_COLORS.ink },
	subtitle: { fontSize: 12, lineHeight: 16, color: APP_COLORS.inkMuted },
	action: {
		height: 32,
		paddingHorizontal: 12,
		borderRadius: 8,
		backgroundColor: APP_COLORS.primary,
		justifyContent: 'center',
	},
	actionText: { fontSize: 12, fontWeight: '800', color: '#FFFFFF' },
})

export default AppDashedActionCard
