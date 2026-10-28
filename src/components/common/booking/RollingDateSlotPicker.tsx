import React from 'react'
import { ScrollView, StyleProp, StyleSheet, TouchableOpacity, View, ViewStyle } from 'react-native'
import { AppTypography } from '../display/AppTypography'
import { APP_COLORS } from '../../../config/theme'
import { DOW_LABELS, MONTH_LONG, formatDateForApi } from '../../../utils/date'

/** This intentionally does NOT reuse `common/DateSlotPicker.tsx` — that
 *  component's date model is a navigable calendar week (Sun-Sat containing
 *  the selected date, with past days disabled), used by several unrelated
 *  doctor-appointment/consultation screens. Ancillary and Laboratory all use
 *  a different model: a fixed rolling window starting today, no navigation,
 *  no past-date concept — reconciling the two would mean touching shared
 *  date-computation logic those other screens depend on. This is a separate,
 *  purpose-built component for the rolling-window pattern only. */
export interface DateStripProps {
	/** Single-select value. Optional when `selectedDates` is passed. */
	selectedDate?: Date
	onSelectDate: (date: Date) => void
	/**
	 * Opt-in multi-select: every 'YYYY-MM-DD' in this list is highlighted (overrides `selectedDate`).
	 * `onSelectDate` still fires per tap -- the caller decides whether a tap adds, removes or replaces.
	 */
	selectedDates?: string[]
	/**
	 * 'grid' only, opt-in: wrap the days into rows of this many equal columns (e.g. 7 for a 14-day
	 * two-week grid). Omit to keep the single row of flex cells.
	 */
	columns?: number
	/**
	 * 'grid' only, opt-in: 'compact' = the Book-visit design cell (52h, radius 10, 10/12 700 CAPS weekday
	 * with "TODAY", 16/20 800 date). Defaults to 'regular' (existing 56h cell).
	 */
	density?: 'regular' | 'compact'
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
	/** 'grid' only: 'YYYY-MM-DD' days that get a small dot under the date (e.g. days that already have a visit). */
	markedDates?: string[]
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
	selectedDates,
	columns,
	density = 'regular',
	markedDates,
}: DateStripProps) {
	const upcomingDates = React.useMemo(() => {
		return Array.from({ length: dayCount }, (_, i) => {
			const d = new Date()
			d.setDate(d.getDate() + i)
			return d
		})
	}, [dayCount])

	const selectedIso = selectedDate ? formatDateForApi(selectedDate) : ''
	const isOn = (iso: string) => (selectedDates ? selectedDates.includes(iso) : iso === selectedIso)

	if (variant === 'grid') {
		const todayIso = formatDateForApi(new Date())
		const multi = !!selectedDates
		const compact = density === 'compact'
		const cols = columns ?? 0
		const wrap = cols > 0
		const cells = upcomingDates.map((d) => {
			const iso = formatDateForApi(d)
			const disabled = !!isDateDisabled?.(d)
			const on = isOn(iso) && !disabled
			const hint = disabled && disabledAccessibilityHint ? `, ${disabledAccessibilityHint}` : ''
			const isToday = iso === todayIso
			const dow = isToday ? 'Today' : DOW_LABELS[d.getDay()]
			return (
				<TouchableOpacity
					key={iso}
					disabled={disabled}
					onPress={() => onSelectDate(d)}
					activeOpacity={0.8}
					accessibilityRole={multi ? 'checkbox' : 'radio'}
					accessibilityState={{ checked: on, disabled }}
					accessibilityLabel={`${DOW_LABELS[d.getDay()]} ${d.getDate()} ${MONTH_LONG[d.getMonth()]}${hint}`}
					style={[
						styles.gridCell,
						compact && styles.gridCellCompact,
						on && styles.cellOn,
						disabled && styles.gridCellOff,
					]}
				>
					<AppTypography
						style={[
							compact ? styles.gridDowCompact : styles.gridDow,
							on && styles.textOn,
							disabled && styles.textOff,
						]}
					>
						{compact ? dow.toUpperCase() : dow}
					</AppTypography>
					<AppTypography
						style={[
							compact ? styles.gridNumCompact : styles.gridNum,
							on && styles.textOn,
							disabled && styles.textOff,
							disabled && strikeDisabled && styles.struck,
						]}
					>
						{d.getDate()}
					</AppTypography>
					{markedDates?.includes(iso) && <View style={styles.markDot} />}
				</TouchableOpacity>
			)
		})

		if (!wrap) {
			return (
				<View style={[styles.dateGrid, style]} accessibilityRole={multi ? undefined : 'radiogroup'}>
					{cells}
				</View>
			)
		}
		// Wrapped grid (e.g. 7 columns x 2 weeks): one row per `cols` days, every cell flex: 1, so the columns are
		// always equal and nothing depends on a measured width (a late or zero measurement used to squash the days
		// into thin lines). A short last row is padded with empty cells to keep the same column width.
		const rows: React.ReactNode[][] = []
		for (let i = 0; i < cells.length; i += cols) rows.push(cells.slice(i, i + cols))
		return (
			<View style={[styles.dateGridRows, style]} accessibilityRole={multi ? undefined : 'radiogroup'}>
				{rows.map((row, r) => (
					<View key={r} style={styles.dateGrid}>
						{row}
						{Array.from({ length: cols - row.length }, (_, k) => (
							<View key={`pad-${k}`} style={styles.gridPad} />
						))}
					</View>
				))}
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
					const isSelected = isOn(formatDateForApi(d))
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
								{DOW_LABELS[d.getDay()]}
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
	/**
	 * `columns` grid only. 'compact' = the Schedule-a-visit chip (38h, radius 10, 12/700, 6px gaps, a
	 * booked/too-soon cell keeps its divider border); 'tight' = the Reschedule-visit sheet chip (36h, radius 8).
	 * Defaults to 'regular' (44h, radius 12, 8px gaps).
	 */
	density?: 'regular' | 'compact' | 'tight'
}

const GRID_GAP = 8
const COMPACT_GRID_GAP = 6

export function SlotChipGrid({
	slots,
	selectedValue,
	onSelectValue,
	emptyLabel,
	style,
	columns,
	density = 'regular',
}: SlotChipGridProps) {
	if (slots.length === 0) {
		return emptyLabel ? (
			<AppTypography variant="caption" style={styles.noSlotsText}>
				{emptyLabel}
			</AppTypography>
		) : null
	}

	if (columns && columns > 0) {
		// One row per `columns` slots, every cell flex: 1, so the columns are always equal and nothing depends on a
		// measured width (a late or zero measurement squashed the cells). A short last row is padded with empty cells.
		const gap = density === 'regular' ? GRID_GAP : COMPACT_GRID_GAP
		const cells = slots.map((slot) => {
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
						density === 'compact' && styles.gridSlotCompact,
						density === 'tight' && styles.gridSlotTight,
						on && styles.cellOn,
						off && styles.gridSlotOff,
						off && density !== 'regular' && styles.gridSlotOffBordered,
					]}
				>
					<AppTypography
						style={[
							styles.gridSlotText,
							density !== 'regular' && styles.gridSlotTextCompact,
							on && styles.textOn,
							off && styles.textOff,
							slot.struck && styles.struck,
						]}
					>
						{slot.label}
					</AppTypography>
				</TouchableOpacity>
			)
		})
		const rows: React.ReactNode[][] = []
		for (let i = 0; i < cells.length; i += columns) rows.push(cells.slice(i, i + columns))
		return (
			<View style={[{ gap }, style]} accessibilityRole="radiogroup">
				{rows.map((row, r) => (
					<View key={r} style={[styles.slotRow, { gap }]}>
						{row}
						{Array.from({ length: columns - row.length }, (_, k) => (
							<View key={`pad-${k}`} style={styles.gridSlotPad} />
						))}
					</View>
				))}
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
	dateGridRows: {
		gap: 4,
	},
	gridPad: {
		flex: 1,
		minWidth: 0,
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
	gridCellCompact: {
		height: 52,
		borderRadius: 10,
		borderColor: APP_COLORS.divider,
		gap: 1,
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
	gridDowCompact: {
		fontSize: 10,
		lineHeight: 12,
		fontWeight: '700',
		color: APP_COLORS.ink,
	},
	gridNumCompact: {
		fontSize: 16,
		lineHeight: 20,
		fontWeight: '800',
		color: APP_COLORS.ink,
	},
	gridNum: {
		fontSize: 18,
		lineHeight: 24,
		fontWeight: '800',
		color: APP_COLORS.ink,
	},
	markDot: {
		position: 'absolute',
		bottom: 4,
		width: 4,
		height: 4,
		borderRadius: 9999,
		backgroundColor: APP_COLORS.inkDisabled,
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
	slotRow: {
		flexDirection: 'row',
	},
	gridSlotPad: {
		flex: 1,
		minWidth: 0,
	},
	gridSlot: {
		flex: 1,
		minWidth: 0,
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
	gridSlotCompact: {
		height: 38,
		borderRadius: 10,
	},
	gridSlotTight: {
		height: 36,
		borderRadius: 8,
	},
	gridSlotOffBordered: {
		borderColor: APP_COLORS.divider,
	},
	gridSlotTextCompact: {
		fontSize: 12,
		lineHeight: 16,
		fontWeight: '700',
	},
})
