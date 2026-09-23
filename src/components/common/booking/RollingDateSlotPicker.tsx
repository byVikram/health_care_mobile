import React from 'react'
import { ScrollView, StyleProp, StyleSheet, TouchableOpacity, View, ViewStyle } from 'react-native'
import { AppTypography } from '../AppTypography'

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

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
}

const formatDateIso = (d: Date): string => {
	const year = d.getFullYear()
	const month = String(d.getMonth() + 1).padStart(2, '0')
	const day = String(d.getDate()).padStart(2, '0')
	return `${year}-${month}-${day}`
}

export function DateStrip({ selectedDate, onSelectDate, dayCount = 7, style }: DateStripProps) {
	const upcomingDates = React.useMemo(() => {
		return Array.from({ length: dayCount }, (_, i) => {
			const d = new Date()
			d.setDate(d.getDate() + i)
			return d
		})
	}, [dayCount])

	return (
		<View style={[styles.dateStripContainer, style]}>
			<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateScrollContent}>
				{upcomingDates.map((d) => {
					const isSelected = formatDateIso(d) === formatDateIso(selectedDate)
					return (
						<TouchableOpacity
							key={d.toISOString()}
							style={[styles.dateChip, isSelected && styles.dateChipSelected]}
							onPress={() => onSelectDate(d)}
							activeOpacity={0.8}
						>
							<AppTypography variant="caption" style={[styles.dateChipDay, isSelected && styles.dateChipTextSelected]}>
								{DAY_NAMES[d.getDay()]}
							</AppTypography>
							<AppTypography variant="h4" style={[styles.dateChipNum, isSelected && styles.dateChipTextSelected]}>
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
}

export interface SlotChipGridProps {
	slots: SlotChipItem[]
	selectedValue: string | null
	onSelectValue: (value: string) => void
	/** Shown instead of the grid when `slots` is empty. */
	emptyLabel?: string
	style?: StyleProp<ViewStyle>
}

export function SlotChipGrid({ slots, selectedValue, onSelectValue, emptyLabel, style }: SlotChipGridProps) {
	if (slots.length === 0) {
		return emptyLabel ? (
			<AppTypography variant="caption" style={styles.noSlotsText}>
				{emptyLabel}
			</AppTypography>
		) : null
	}

	return (
		<View style={[styles.slotsGridFlex, style]}>
			{slots.map((slot) => {
				const isSelected = selectedValue === slot.value
				return (
					<TouchableOpacity
						key={slot.value}
						style={[styles.slotChip, isSelected && styles.slotChipSelected, slot.disabled && styles.slotChipDisabled]}
						onPress={() => !slot.disabled && onSelectValue(slot.value)}
						disabled={slot.disabled}
						activeOpacity={0.7}
					>
						<AppTypography
							variant="caption"
							style={[
								styles.slotChipText,
								isSelected && styles.slotChipTextSelected,
								slot.disabled && styles.slotChipTextDisabled,
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
})
