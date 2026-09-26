import React from 'react'
import { ScrollView, StyleProp, StyleSheet, TouchableOpacity, View, ViewStyle } from 'react-native'
import { AppTypography } from '../AppTypography'
import { APP_COLORS } from '../../../config/theme'

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTH_LONG = [
	'January',
	'February',
	'March',
	'April',
	'May',
	'June',
	'July',
	'August',
	'September',
	'October',
	'November',
	'December',
]

/** This intentionally does NOT reuse `common/DateSlotPicker.tsx` — that
 *  component's date model is a navigable calendar week (Sun-Sat containing
 *  the selected date, with past days disabled), used by several unrelated
 *  doctor-appointment/consultation screens. Ancillary and Laboratory all use
 *  a different model: a fixed rolling window starting today, no navigation,
 *  no past-date concept — reconciling the two would mean touching shared
 *  date-computation logic those other screens depend on. This is a separate,
 *  purpose-built component for the rolling-window pattern only. */
export interface DateStripProps {
	selectedDate: Date
	onSelectDate: (date: Date) => void
	/** Number of upcoming days shown, starting today. Defaults to 7. */
	dayCount?: number
	style?: StyleProp<ViewStyle>
	/**
	 * 'scroll' (default) is the existing horizontal chip strip. 'grid' is the KarolaHealth
	 * design: equal-width columns (one per day), 56h cells radius 12, "Today" label on today.
	 */
	variant?: 'scroll' | 'grid'
	/** Days for which this returns true are greyed out (APP_COLORS.inkDisabled / APP_COLORS.divider) and not selectable. */
	isDateDisabled?: (d: Date) => boolean
	/** Line-through the date number of disabled days. */
	strikeDisabled?: boolean
	/** Accessibility suffix for disabled days, e.g. "clinic closed". */
	disabledAccessibilityHint?: string
}

const formatDateIso = (d: Date): string => {
	const year = d.getFullYear()
	const month = String(d.getMonth() + 1).padStart(2, '0')
	const day = String(d.getDate()).padStart(2, '0')
	return `${year}-${month}-${day}`
}

export function DateStrip({
	selectedDate,
	onSelectDate,
	dayCount = 7,
	style,
	variant = 'scroll',
	isDateDisabled,
	strikeDisabled = false,
	disabledAccessibilityHint,
}: DateStripProps) {
	const upcomingDates = React.useMemo(() => {
		return Array.from({ length: dayCount }, (_, i) => {
			const d = new Date()
			d.setDate(d.getDate() + i)
			return d
		})
	}, [dayCount])

	const selectedIso = formatDateIso(selectedDate)

	if (variant === 'grid') {
		const todayIso = formatDateIso(new Date())
		return (
			<View style={[styles.dateGrid, style]} accessibilityRole="radiogroup">
				{upcomingDates.map((d) => {
					const iso = formatDateIso(d)
					const disabled = !!isDateDisabled?.(d)
					const on = iso === selectedIso && !disabled
					const hint = disabled && disabledAccessibilityHint ? `, ${disabledAccessibilityHint}` : ''
					return (
						<TouchableOpacity
							key={iso}
							disabled={disabled}
							onPress={() => onSelectDate(d)}
							activeOpacity={0.8}
							accessibilityRole="radio"
							accessibilityState={{ checked: on, disabled }}
							accessibilityLabel={`${DAY_NAMES[d.getDay()]} ${d.getDate()} ${MONTH_LONG[d.getMonth()]}${hint}`}
							style={[styles.gridCell, on && styles.cellOn, disabled && styles.gridCellOff]}
						>
							<AppTypography style={[styles.gridDow, on && styles.textOn, disabled && styles.textOff]}>
								{iso === todayIso ? 'Today' : DAY_NAMES[d.getDay()]}
							</AppTypography>
							<AppTypography
								style={[
									styles.gridNum,
									on && styles.textOn,
									disabled && styles.textOff,
									disabled && strikeDisabled && styles.struck,
								]}
							>
								{d.getDate()}
							</AppTypography>
						</TouchableOpacity>
					)
				})}
			</View>
		)
	}

	return (
		<View style={[styles.dateStripContainer, style]}>
			<ScrollView
				horizontal
				showsHorizontalScrollIndicator={false}
				contentContainerStyle={styles.dateScrollContent}
			>
				{upcomingDates.map((d) => {
					const isSelected = formatDateIso(d) === selectedIso
					// Only set when the caller passes isDateDisabled — existing callers are unaffected.
					const disabled = !!isDateDisabled?.(d)
					return (
						<TouchableOpacity
							key={d.toISOString()}
							style={[
								styles.dateChip,
								isSelected && styles.dateChipSelected,
								disabled && styles.gridCellOff,
							]}
							onPress={() => onSelectDate(d)}
							activeOpacity={0.8}
							disabled={disabled || undefined}
						>
							<AppTypography
								variant="caption"
								style={[
									styles.dateChipDay,
									isSelected && styles.dateChipTextSelected,
									disabled && styles.textOff,
								]}
							>
								{DAY_NAMES[d.getDay()]}
							</AppTypography>
							<AppTypography
								variant="h4"
								style={[
									styles.dateChipNum,
									isSelected && styles.dateChipTextSelected,
									disabled && styles.textOff,
									disabled && strikeDisabled && styles.struck,
								]}
							>
								{d.getDate()}
							</AppTypography>
						</TouchableOpacity>
					)
				})}
			</ScrollView>
		</View>
	)
}

export interface SlotChipItem {
	value: string
	label: string
	disabled?: boolean
	/** Booked slot: line-through label; in the `columns` grid also a APP_COLORS.pageBg cell. Not selectable. */
	struck?: boolean
	/** Accessibility label override (defaults to `label` + state). */
	accessibilityLabel?: string
}

export interface SlotChipGridProps {
	slots: SlotChipItem[]
	selectedValue: string | null
	onSelectValue: (value: string) => void
	/** Shown instead of the grid when `slots` is empty. */
	emptyLabel?: string
	style?: StyleProp<ViewStyle>
	/**
	 * When set, renders the KarolaHealth design grid: this many equal columns (design = 3),
	 * 44h cells, radius 12, APP_COLORS colours. Omit to keep the existing wrapping chips.
	 */
	columns?: number
}

const GRID_GAP = 8

export function SlotChipGrid({ slots, selectedValue, onSelectValue, emptyLabel, style, columns }: SlotChipGridProps) {
	const [gridWidth, setGridWidth] = React.useState(0)

	if (slots.length === 0) {
		return emptyLabel ? (
			<AppTypography variant="caption" style={styles.noSlotsText}>
				{emptyLabel}
			</AppTypography>
		) : null
	}

	if (columns && columns > 0) {
		// Measure the row so cells are exactly (width - gaps) / columns; before the first layout
		// pass fall back to a percentage that fits.
		const cellWidth: ViewStyle['width'] =
			gridWidth > 0
				? Math.floor((gridWidth - GRID_GAP * (columns - 1)) / columns)
				: `${Math.floor(100 / columns) - 3}%`
		return (
			<View
				style={[styles.slotsGridFlex, style]}
				onLayout={(e) => setGridWidth(e.nativeEvent.layout.width)}
				accessibilityRole="radiogroup"
			>
				{slots.map((slot) => {
					const off = !!slot.disabled || !!slot.struck
					const on = selectedValue === slot.value && !off
					const state = slot.struck ? ', booked' : off ? ', unavailable' : on ? ', selected' : ''
					return (
						<TouchableOpacity
							key={slot.value}
							disabled={off}
							onPress={() => onSelectValue(slot.value)}
							activeOpacity={0.8}
							accessibilityRole="radio"
							accessibilityState={{ checked: on, disabled: off }}
							accessibilityLabel={slot.accessibilityLabel ?? `${slot.label}${state}`}
							style={[
								styles.gridSlot,
								{ width: cellWidth },
								on && styles.cellOn,
								off && styles.gridSlotOff,
							]}
						>
							<AppTypography
								style={[
									styles.gridSlotText,
									on && styles.textOn,
									off && styles.textOff,
									slot.struck && styles.struck,
								]}
							>
								{slot.label}
							</AppTypography>
						</TouchableOpacity>
					)
				})}
			</View>
		)
	}

	return (
		<View style={[styles.slotsGridFlex, style]}>
			{slots.map((slot) => {
				const isSelected = selectedValue === slot.value
				const off = slot.disabled || slot.struck
				return (
					<TouchableOpacity
						key={slot.value}
						style={[styles.slotChip, isSelected && styles.slotChipSelected, off && styles.slotChipDisabled]}
						onPress={() => !off && onSelectValue(slot.value)}
						disabled={off}
						activeOpacity={0.7}
						accessibilityLabel={slot.accessibilityLabel}
					>
						<AppTypography
							variant="caption"
							style={[
								styles.slotChipText,
								isSelected && styles.slotChipTextSelected,
								off && styles.slotChipTextDisabled,
								slot.struck && styles.struck,
							]}
						>
							{slot.label}
						</AppTypography>
					</TouchableOpacity>
				)
			})}
		</View>
	)
}

const styles = StyleSheet.create({
	dateStripContainer: {},
	dateScrollContent: {
		gap: 8,
		paddingHorizontal: 2,
	},
	dateChip: {
		width: 54,
		paddingVertical: 8,
		borderRadius: 10,
		backgroundColor: '#FFFFFF',
		borderWidth: 1,
		borderColor: '#E2E8F0',
		alignItems: 'center',
		justifyContent: 'center',
	},
	dateChipSelected: {
		backgroundColor: '#0C7C7C',
		borderColor: '#0C7C7C',
	},
	dateChipDay: {
		fontSize: 11,
		color: '#64748B',
	},
	dateChipNum: {
		fontSize: 15,
		fontWeight: '700',
		color: '#0F172A',
		marginTop: 2,
	},
	dateChipTextSelected: {
		color: '#FFFFFF',
	},
	slotsGridFlex: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 8,
	},
	slotChip: {
		backgroundColor: '#FFFFFF',
		borderWidth: 1,
		borderColor: '#CBD5E1',
		borderRadius: 8,
		paddingHorizontal: 10,
		paddingVertical: 6,
	},
	slotChipSelected: {
		backgroundColor: '#0C7C7C',
		borderColor: '#0C7C7C',
	},
	slotChipDisabled: {
		backgroundColor: '#F1F5F9',
		borderColor: '#E2E8F0',
		opacity: 0.6,
	},
	slotChipText: {
		fontSize: 12,
		fontWeight: '600',
		color: '#334155',
	},
	slotChipTextSelected: {
		color: '#FFFFFF',
	},
	slotChipTextDisabled: {
		color: '#94A3B8',
	},
	noSlotsText: {
		fontSize: 12,
		color: '#64748B',
		fontStyle: 'italic',
		paddingVertical: 4,
	},

	// KarolaHealth design ('grid' date variant / `columns` slot grid)
	dateGrid: {
		flexDirection: 'row',
		gap: 4,
	},
	gridCell: {
		flex: 1,
		minWidth: 0,
		height: 56,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: APP_COLORS.border,
		backgroundColor: APP_COLORS.surface,
		alignItems: 'center',
		justifyContent: 'center',
		gap: 2,
	},
	gridCellOff: {
		borderColor: APP_COLORS.divider,
	},
	gridDow: {
		fontSize: 11,
		lineHeight: 14,
		fontWeight: '600',
		color: APP_COLORS.ink,
	},
	gridNum: {
		fontSize: 18,
		lineHeight: 24,
		fontWeight: '800',
		color: APP_COLORS.ink,
	},
	cellOn: {
		backgroundColor: APP_COLORS.primary,
		borderColor: APP_COLORS.primary,
	},
	textOn: {
		color: '#FFFFFF',
	},
	textOff: {
		color: APP_COLORS.inkDisabled,
	},
	struck: {
		textDecorationLine: 'line-through',
	},
	gridSlot: {
		height: 44,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: APP_COLORS.border,
		backgroundColor: APP_COLORS.surface,
		alignItems: 'center',
		justifyContent: 'center',
	},
	gridSlotOff: {
		backgroundColor: APP_COLORS.pageBg,
		borderColor: APP_COLORS.pageBg,
	},
	gridSlotText: {
		fontSize: 13,
		lineHeight: 18,
		fontWeight: '600',
		color: APP_COLORS.ink,
	},
})
