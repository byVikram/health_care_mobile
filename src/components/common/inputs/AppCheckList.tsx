// src/components/common/inputs/AppCheckList.tsx
//
// Tick-off list from the provider visit designs.
//   variant 'round'  -- "Procedure steps": 48px rows with a bottom divider, 24px round check (success when
//                       done), done labels muted + struck through (14/20 700).
//   variant 'steps'  -- "Procedure steps" of the current design: one bordered card per step (52px, radius 12), a 28px
//                       numbered circle that turns into a green check, a white "Done" chip, the whole card tinted green
//                       when done (labels are not struck through). `divided` / `tone` do not apply.
//   variant 'square' -- "Bring with you": 40px rows, 22px rounded-square check (primary when checked),
//                       14/20 600 labels, no divider (`divided` adds 48px rows with a divider, as in the option sheets).
//   variant 'list'   -- "Cancel visits": 56px rows (padding 10x12) with a divider, 20px rounded-square check,
//                       14/20 800 label + 12/16 muted `sub` line and a muted `trailing` value; `checked: 'mixed'`
//                       shows a minus (a "select all" row); `tone="danger"` fills the check red.
// Each row is a checkbox (accessibilityRole 'checkbox').

import React from 'react'
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { APP_COLORS } from '../../../config/theme'

export type AppCheckListItem = {
	key: string
	label: string
	/** 'mixed' = some of a group are ticked (shown as a minus). */
	checked: boolean | 'mixed'
	/** 'list' variant: muted line under the label. */
	sub?: string
	/** 'list' variant: muted value on the right (a price, "1 of 3"). */
	trailing?: string
	/** Greyed out and not tappable. */
	disabled?: boolean
}

export type AppCheckListProps = {
	items: AppCheckListItem[]
	onToggle: (key: string, checked: boolean) => void
	variant?: 'round' | 'square' | 'list' | 'steps'
	/** 'square' only: divider lines between rows (taller, 48px rows). */
	divided?: boolean
	/** Colour of a ticked box ('list' / 'square'). Defaults to primary ('round' is always success). */
	tone?: 'primary' | 'danger'
	disabled?: boolean
	style?: StyleProp<ViewStyle>
}

export function AppCheckList({
	items,
	onToggle,
	variant = 'round',
	divided = false,
	tone = 'primary',
	disabled = false,
	style,
}: AppCheckListProps) {
	const round = variant === 'round'
	const list = variant === 'list'
	if (variant === 'steps') return <StepCards items={items} onToggle={onToggle} disabled={disabled} style={style} />
	return (
		<View style={style}>
			{items.map((item, i) => {
				const on = item.checked === true
				const mixed = item.checked === 'mixed'
				const off = disabled || !!item.disabled
				const fill = round ? APP_COLORS.success : tone === 'danger' ? APP_COLORS.danger : APP_COLORS.primary
				return (
					<Pressable
						key={item.key}
						onPress={() => onToggle(item.key, !on)}
						disabled={off}
						accessibilityRole="checkbox"
						accessibilityState={{ checked: mixed ? 'mixed' : on, disabled: off }}
						accessibilityLabel={item.label}
						style={({ pressed }) => [
							round ? styles.rowRound : list ? styles.rowList : styles.rowSquare,
							(round || list || divided) && i < items.length - 1 && styles.divider,
							divided && !round && !list && styles.rowDivided,
							off && item.disabled && styles.rowOff,
							pressed && styles.pressed,
						]}
					>
						<View
							style={[
								round ? styles.boxRound : list ? styles.boxList : styles.boxSquare,
								{
									borderColor: on || mixed ? fill : APP_COLORS.border,
									backgroundColor: on || mixed ? fill : APP_COLORS.surface,
								},
							]}
						>
							{on || mixed ? (
								<MaterialCommunityIcons
									name={mixed ? 'minus' : 'check'}
									size={round ? 16 : list ? 12 : 14}
									color={APP_COLORS.surface}
								/>
							) : null}
						</View>
						{list ? (
							<View style={styles.listText}>
								<Text style={styles.labelList}>{item.label}</Text>
								{!!item.sub && <Text style={styles.subList}>{item.sub}</Text>}
							</View>
						) : (
							<Text
								style={[
									round ? styles.labelRound : styles.labelSquare,
									round && on && styles.labelDone,
								]}
							>
								{item.label}
							</Text>
						)}
						{list && !!item.trailing && <Text style={styles.trailingList}>{item.trailing}</Text>}
					</Pressable>
				)
			})}
		</View>
	)
}

/** The numbered step cards ('steps' variant). */
function StepCards({
	items,
	onToggle,
	disabled,
	style,
}: Pick<AppCheckListProps, 'items' | 'onToggle' | 'disabled' | 'style'>) {
	return (
		<View style={[styles.stepList, style]}>
			{items.map((item, i) => {
				const on = item.checked === true
				const off = disabled || !!item.disabled
				return (
					<Pressable
						key={item.key}
						onPress={() => onToggle(item.key, !on)}
						disabled={off}
						accessibilityRole="checkbox"
						accessibilityState={{ checked: on, disabled: off }}
						accessibilityLabel={`Step ${i + 1}: ${item.label}`}
						style={({ pressed }) => [
							styles.step,
							on && styles.stepOn,
							off && item.disabled && styles.rowOff,
							pressed && styles.pressed,
						]}
					>
						<View style={[styles.stepNum, on && styles.stepNumOn]}>
							{on ? (
								<MaterialCommunityIcons name="check" size={16} color={APP_COLORS.surface} />
							) : (
								<Text style={styles.stepNumText}>{i + 1}</Text>
							)}
						</View>
						<Text style={styles.stepLabel}>{item.label}</Text>
						{on ? (
							<View style={styles.doneChip}>
								<Text style={styles.doneChipText}>Done</Text>
							</View>
						) : null}
					</Pressable>
				)
			})}
		</View>
	)
}

const styles = StyleSheet.create({
	stepList: {
		gap: 8,
	},
	step: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		minHeight: 52,
		paddingVertical: 10,
		paddingHorizontal: 12,
		borderRadius: 12,
		borderWidth: 1.5,
		borderColor: '#E3EAEB',
		backgroundColor: APP_COLORS.surface,
	},
	stepOn: {
		borderColor: '#BFE3CF',
		backgroundColor: APP_COLORS.successBg,
	},
	stepNum: {
		width: 28,
		height: 28,
		borderRadius: 14,
		borderWidth: 2,
		borderColor: '#C9D5D6',
		backgroundColor: APP_COLORS.surface,
		alignItems: 'center',
		justifyContent: 'center',
	},
	stepNumOn: {
		borderColor: APP_COLORS.success,
		backgroundColor: APP_COLORS.success,
	},
	stepNumText: {
		fontSize: 13,
		lineHeight: 16,
		fontWeight: '800',
		color: APP_COLORS.inkMuted,
	},
	stepLabel: {
		flex: 1,
		fontSize: 14,
		lineHeight: 20,
		fontWeight: '700',
		color: APP_COLORS.ink,
	},
	doneChip: {
		height: 22,
		paddingHorizontal: 8,
		borderRadius: 6,
		backgroundColor: APP_COLORS.surface,
		justifyContent: 'center',
	},
	doneChipText: {
		fontSize: 11,
		fontWeight: '800',
		color: APP_COLORS.success,
	},
	rowRound: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		minHeight: 48,
		paddingVertical: 6,
	},
	rowList: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		minHeight: 56,
		paddingHorizontal: 12,
		paddingVertical: 10,
	},
	rowOff: {
		opacity: 0.5,
	},
	rowSquare: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
		minHeight: 40,
	},
	rowDivided: {
		minHeight: 48,
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
	boxList: {
		width: 20,
		height: 20,
		borderRadius: 6,
		borderWidth: 2,
		alignItems: 'center',
		justifyContent: 'center',
	},
	listText: {
		flex: 1,
		minWidth: 0,
	},
	labelList: {
		fontSize: 14,
		lineHeight: 20,
		fontWeight: '800',
		color: APP_COLORS.ink,
	},
	subList: {
		fontSize: 12,
		lineHeight: 16,
		color: APP_COLORS.inkMuted,
	},
	trailingList: {
		fontSize: 13,
		lineHeight: 18,
		fontWeight: '700',
		color: APP_COLORS.inkMuted,
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
