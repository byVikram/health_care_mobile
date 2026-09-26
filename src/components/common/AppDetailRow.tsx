// src/components/common/AppDetailRow.tsx
//
// Label/value row from the Appointment-details design: 36px APP_COLORS.pageBg icon tile, 11/14 700 caps
// eyebrow, 14/20 700 value, 12/16 muted sub, optional small outline action on the right and a
// APP_COLORS.divider bottom border (min height 52).

import React from 'react'
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { APP_COLORS } from '../../config/theme'
import { AppActionChip } from './AppActionChip'
import { AppIconTile } from './AppIconTile'

type IconName = keyof typeof MaterialCommunityIcons.glyphMap

export type AppDetailRowAction = {
	label: string
	onPress: () => void
	icon?: IconName
	filled?: boolean
}

export type AppDetailRowProps = {
	icon?: IconName
	/** Custom tile content (e.g. a <AppIcon />) instead of `icon`. */
	iconNode?: React.ReactNode
	/** Tile background. Defaults to APP_COLORS.pageBg. */
	iconBackground?: string
	/** Icon colour. Defaults to APP_COLORS.primary. */
	iconColor?: string
	/** Eyebrow label (rendered upper-case). */
	label: string
	value: string
	sub?: string
	/** Max lines for value/sub. Defaults to 2. */
	numberOfLines?: number
	action?: AppDetailRowAction
	/** Custom right-hand node (overrides `action`). */
	right?: React.ReactNode
	/** Bottom APP_COLORS.divider border. Defaults to true. */
	divider?: boolean
	style?: StyleProp<ViewStyle>
}

export function AppDetailRow({
	icon,
	iconNode,
	iconBackground = APP_COLORS.pageBg,
	iconColor = APP_COLORS.primary,
	label,
	value,
	sub,
	numberOfLines = 2,
	action,
	right,
	divider = true,
	style,
}: AppDetailRowProps) {
	return (
		<View style={[styles.row, divider && styles.divider, style]}>
			{(icon || iconNode) && (
				<AppIconTile
					icon={icon}
					size={36}
					radius={10}
					iconSize={18}
					backgroundColor={iconBackground}
					iconColor={iconColor}
				>
					{iconNode}
				</AppIconTile>
			)}
			<View style={styles.text} accessible accessibilityLabel={[label, value, sub].filter(Boolean).join(', ')}>
				<Text style={styles.eyebrow}>{label.toUpperCase()}</Text>
				<Text style={styles.value} numberOfLines={numberOfLines}>
					{value}
				</Text>
				{!!sub && (
					<Text style={styles.sub} numberOfLines={numberOfLines}>
						{sub}
					</Text>
				)}
			</View>
			{right ??
				(action ? (
					<AppActionChip
						label={action.label}
						onPress={action.onPress}
						icon={action.icon}
						filled={action.filled}
					/>
				) : null)}
		</View>
	)
}

const styles = StyleSheet.create({
	row: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		minHeight: 52,
	},
	divider: {
		borderBottomWidth: 1,
		borderBottomColor: APP_COLORS.divider,
	},
	text: {
		flex: 1,
		minWidth: 0,
	},
	eyebrow: {
		fontSize: 11,
		lineHeight: 14,
		fontWeight: '700',
		letterSpacing: 0.44,
		color: APP_COLORS.inkMuted,
	},
	value: {
		fontSize: 14,
		lineHeight: 20,
		fontWeight: '700',
		color: APP_COLORS.ink,
	},
	sub: {
		fontSize: 12,
		lineHeight: 16,
		color: APP_COLORS.inkMuted,
	},
})

export default AppDetailRow
