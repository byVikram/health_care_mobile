// Morning / Afternoon / Evening editor for one day (weekly hours, or one date override): each section
// lists its time ranges (start – end selects in 30-minute steps inside the section's window, remove
// button, inline error) with an "Add time" link. `others` feeds clash checks against other places.

import React from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { AppSelect, FORM_SELECT_PROPS } from '../../../../components/common'
import { APP_COLORS } from '../../../../config/theme'
import {
	SECTION_DEFAULT_RANGE,
	SECTION_KEYS,
	SECTION_META,
	rangeError,
	timeOptions,
	toHHMM,
	toMinutes,
	type DaySections as DaySectionsValue,
	type SectionKey,
	type TimeRange,
} from '../availabilityUtils'

type IconName = keyof typeof MaterialCommunityIcons.glyphMap

const SECTION_ICON: Record<SectionKey, IconName> = {
	morning: 'weather-sunset-up',
	afternoon: 'weather-sunny',
	evening: 'weather-night',
}

export type DaySectionsProps = {
	day: DaySectionsValue
	onChange: (day: DaySectionsValue) => void
	others?: { place: string; range: TimeRange }[]
}

/** Next free slot in a section after its last range, else the section default. */
const nextRange = (section: SectionKey, ranges: TimeRange[]): TimeRange => {
	if (!ranges.length) return SECTION_DEFAULT_RANGE[section]
	const lastEnd = Math.max(...ranges.map((r) => toMinutes(r.end)))
	const { to } = SECTION_META[section]
	const start = Math.min(lastEnd + 30, to - 30)
	return { start: toHHMM(start), end: toHHMM(Math.min(start + 60, to)) }
}

export function DaySections({ day, onChange, others = [] }: DaySectionsProps) {
	const update = (section: SectionKey, ranges: TimeRange[]) => onChange({ ...day, [section]: ranges })

	return (
		<View style={styles.wrap}>
			{SECTION_KEYS.map((section) => {
				const meta = SECTION_META[section]
				const ranges = day[section]
				return (
					<View key={section} style={styles.section}>
						<View style={styles.sectionHead}>
							<MaterialCommunityIcons name={SECTION_ICON[section]} size={18} color={APP_COLORS.primary} />
							<Text style={styles.sectionTitle}>{meta.label}</Text>
							<Text style={styles.sectionHint}>{ranges.length ? '' : 'Not available'}</Text>
						</View>
						{ranges.map((r, i) => {
							const error = rangeError(day, section, i, others)
							return (
								<View key={`${section}-${i}`} style={styles.rangeBlock}>
									<View style={styles.rangeRow}>
										<AppSelect
											{...FORM_SELECT_PROPS}
											style={styles.flex}
											options={timeOptions(section, 'start')}
											value={r.start}
											onSelect={(v) =>
												update(
													section,
													ranges.map((x, j) => (j === i ? { ...x, start: v } : x))
												)
											}
										/>
										<Text style={styles.dash}>–</Text>
										<AppSelect
											{...FORM_SELECT_PROPS}
											style={styles.flex}
											options={timeOptions(section, 'end')}
											value={r.end}
											onSelect={(v) =>
												update(
													section,
													ranges.map((x, j) => (j === i ? { ...x, end: v } : x))
												)
											}
										/>
										<TouchableOpacity
											style={styles.remove}
											onPress={() =>
												update(
													section,
													ranges.filter((_, j) => j !== i)
												)
											}
											accessibilityRole="button"
											accessibilityLabel="Remove this time"
										>
											<MaterialCommunityIcons name="close" size={18} color={APP_COLORS.danger} />
										</TouchableOpacity>
									</View>
									{!!error && <Text style={styles.error}>{error}</Text>}
								</View>
							)
						})}
						<TouchableOpacity
							style={styles.add}
							onPress={() => update(section, [...ranges, nextRange(section, ranges)])}
							accessibilityRole="button"
							accessibilityLabel={`Add ${meta.label.toLowerCase()} time`}
						>
							<MaterialCommunityIcons name="plus" size={16} color={APP_COLORS.primary} />
							<Text style={styles.addText}>Add time</Text>
						</TouchableOpacity>
					</View>
				)
			})}
		</View>
	)
}

const styles = StyleSheet.create({
	wrap: {
		gap: 12,
	},
	flex: {
		flex: 1,
	},
	section: {
		padding: 12,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: APP_COLORS.divider,
		gap: 8,
	},
	sectionHead: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
	},
	sectionTitle: {
		fontSize: 14,
		lineHeight: 20,
		fontWeight: '800',
		color: APP_COLORS.ink,
	},
	sectionHint: {
		flex: 1,
		textAlign: 'right',
		fontSize: 12,
		color: APP_COLORS.inkMuted,
	},
	rangeBlock: {
		gap: 4,
	},
	rangeRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
	},
	dash: {
		fontSize: 16,
		color: APP_COLORS.inkMuted,
	},
	remove: {
		width: 40,
		height: 40,
		borderWidth: 1,
		borderColor: APP_COLORS.divider,
		borderRadius: 10,
		alignItems: 'center',
		justifyContent: 'center',
	},
	error: {
		fontSize: 12,
		lineHeight: 16,
		fontWeight: '600',
		color: APP_COLORS.danger,
	},
	add: {
		alignSelf: 'flex-start',
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
		paddingVertical: 4,
	},
	addText: {
		fontSize: 13,
		fontWeight: '700',
		color: APP_COLORS.primary,
	},
})

export default DaySections
