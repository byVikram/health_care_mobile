// src/components/common/inputs/AppCheckList.tsx
//
// Tick-off list from the provider visit designs.
//   variant 'round'  -- "Procedure steps": 48px rows with a bottom divider, 24px round check (success when
//                       done), done labels muted + struck through (14/20 700).
//   variant 'square' -- "Bring with you": 40px rows, 22px rounded-square check (primary when checked),
//                       14/20 600 labels, no divider.
// Each row is a checkbox (accessibilityRole 'checkbox').

import React from 'react'
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { APP_COLORS } from '../../../config/theme'

export type AppCheckListItem = {
	key: string
	label: string
	checked: boolean
}

export type AppCheckListProps = {
	items: AppCheckListItem[]
	onToggle: (key: string, checked: boolean) => void
	variant?: 'round' | 'square'
	disabled?: boolean
	style?: StyleProp<ViewStyle>
}

export function AppCheckList({ items, onToggle, variant = 'round', disabled = false, style }: AppCheckListProps) {
	const round = variant === 'round'
	return (
		<View style={style}>
			{items.map((item, i) => {
				const on = item.checked
				const fill = round ? APP_COLORS.success : APP_COLORS.primary
				return (
					<Pressable
						key={item.key}
						onPress={() => onToggle(item.key, !on)}
						disabled={disabled}
						accessibilityRole="checkbox"
						accessibilityState={{ checked: on, disabled }}
						accessibilityLabel={item.label}
						style={({ pressed }) => [
							round ? styles.rowRound : styles.rowSquare,
							round && i < items.length - 1 && styles.divider,
							pressed && styles.pressed,
						]}
					>
						<View
							style={[
								round ? styles.boxRound : styles.boxSquare,
								{
									borderColor: on ? fill : APP_COLORS.border,
									backgroundColor: on ? fill : APP_COLORS.surface,
								},
							]}
						>
							{on ? (
								<MaterialCommunityIcons
									name="check"
									size={round ? 16 : 14}
									color={APP_COLORS.surface}
								/>
							) : null}
						</View>
						<Text style={[round ? styles.labelRound : styles.labelSquare, round && on && styles.labelDone]}>
							{item.label}
						</Text>
					</Pressable>
				)
			})}
		</View>
	)
}

const styles = StyleSheet.create({
	rowRound: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		minHeight: 48,
		paddingVertical: 6,
	},
	rowSquare: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
		minHeight: 40,
	},
	divider: {
		borderBottomWidth: 1,
		borderBottomColor: APP_COLORS.divider,
	},
	pressed: {
		opacity: 0.8,
	},
	boxRound: {
		width: 24,
		height: 24,
		borderRadius: 12,
		borderWidth: 2,
		alignItems: 'center',
		justifyContent: 'center',
	},
	boxSquare: {
		width: 22,
		height: 22,
		borderRadius: 6,
		borderWidth: 2,
		alignItems: 'center',
		justifyContent: 'center',
	},
	labelRound: {
		flex: 1,
		fontSize: 14,
		lineHeight: 20,
		fontWeight: '700',
		color: APP_COLORS.ink,
	},
	labelDone: {
		color: APP_COLORS.inkMuted,
		textDecorationLine: 'line-through',
	},
	labelSquare: {
		flex: 1,
		fontSize: 14,
		lineHeight: 20,
		fontWeight: '600',
		color: APP_COLORS.ink,
	},
})

export default AppCheckList
