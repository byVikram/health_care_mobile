import React, { useMemo, useState } from 'react'
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker'
import { Modal, Platform, Pressable, StyleSheet, TouchableOpacity, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useTheme } from 'react-native-paper'
import { AppTypography } from './AppTypography'

export interface AppCalendarProps {
	label?: string
	value: string
	onChange: (value: string) => void
	placeholder?: string
	required?: boolean
	isMobile?: boolean
	modalTitle?: string
	minimumDate?: Date
	maximumDate?: Date
	defaultDate?: Date
}

const today = () => {
	const date = new Date()
	date.setHours(23, 59, 59, 999)
	return date
}

const defaultDate = () => {
	const date = new Date()
	date.setFullYear(date.getFullYear() - 25)
	date.setHours(12, 0, 0, 0)
	return date
}

const toIsoDate = (val: string): string => {
	if (!val) return ''
	const trimmed = val.trim()
	if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed
	const match = trimmed.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/)
	if (match) {
		const day = match[1].padStart(2, '0')
		const month = match[2].padStart(2, '0')
		const year = match[3]
		return `${year}-${month}-${day}`
	}
	return ''
}

const fromIsoDate = (isoVal: string): string => {
	if (!isoVal) return ''
	const trimmed = isoVal.trim()
	const matchIso = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
	if (matchIso) {
		const year = matchIso[1]
		const month = matchIso[2].padStart(2, '0')
		const day = matchIso[3].padStart(2, '0')
		return `${day}-${month}-${year}`
	}
	const matchDisplay = trimmed.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/)
	if (matchDisplay) {
		const day = matchDisplay[1].padStart(2, '0')
		const month = matchDisplay[2].padStart(2, '0')
		const year = matchDisplay[3]
		return `${day}-${month}-${year}`
	}
	return isoVal
}

const getDateFromDisplayValue = (value: string) => {
	if (!value) return null
	const iso = toIsoDate(value)
	if (!iso) return null

	const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/)
	if (!match) return null

	const year = Number(match[1])
	const month = Number(match[2]) - 1
	const day = Number(match[3])
	const date = new Date(year, month, day, 12, 0, 0, 0)

	if (date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day) return null

	return date
}

const formatDisplayValue = (date: Date) =>
	`${String(date.getDate()).padStart(2, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${date.getFullYear()}`

const formatDateToIso = (date: Date): string => {
	const year = date.getFullYear()
	const month = String(date.getMonth() + 1).padStart(2, '0')
	const day = String(date.getDate()).padStart(2, '0')
	return `${year}-${month}-${day}`
}

export const AppCalendar = ({
	label,
	value,
	onChange,
	placeholder = 'Select date',
	required = false,
	isMobile = false,
	modalTitle = 'Select DOB',
	minimumDate,
	maximumDate,
	defaultDate,
}: AppCalendarProps) => {
	const resolvedMaxDate = useMemo(() => {
		if (maximumDate !== undefined) return maximumDate
		if (minimumDate === undefined) {
			const max = new Date()
			max.setHours(23, 59, 59, 999)
			return max
		}
		return undefined
	}, [maximumDate, minimumDate])

	const resolvedMinDate = useMemo(() => {
		if (minimumDate !== undefined) return minimumDate
		return undefined
	}, [minimumDate])

	const resolvedDefaultDate = useMemo(() => {
		if (defaultDate !== undefined) return defaultDate
		if (minimumDate !== undefined) return minimumDate
		const date = new Date()
		date.setFullYear(date.getFullYear() - 25)
		date.setHours(12, 0, 0, 0)
		return date
	}, [defaultDate, minimumDate])

	const [showPicker, setShowPicker] = useState(false)
	const [pickerDate, setPickerDate] = useState(() => {
		const parsed = getDateFromDisplayValue(value)
		if (parsed) {
			if (resolvedMaxDate && parsed > resolvedMaxDate) return resolvedMaxDate
			if (resolvedMinDate && parsed < resolvedMinDate) return resolvedMinDate
			return parsed
		}
		return resolvedDefaultDate
	})
	const displayValue = value ? fromIsoDate(value) || value : placeholder

	const openPicker = () => {
		console.log('[DOB] Current state:', value)
		console.log('[DOB] Calendar opened')
		const parsed = getDateFromDisplayValue(value)
		let nextDate = parsed || resolvedDefaultDate
		if (resolvedMaxDate && nextDate > resolvedMaxDate) nextDate = resolvedMaxDate
		if (resolvedMinDate && nextDate < resolvedMinDate) nextDate = resolvedMinDate
		setPickerDate(nextDate)
		setShowPicker(true)
	}

	const closePicker = () => setShowPicker(false)

	const handleDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
		if (Platform.OS === 'android') {
			setShowPicker(false)
		}

		if (event.type === 'dismissed' || !selectedDate) return

		console.log('[DOB] Selected date:', selectedDate)
		let normalizedDate = new Date(selectedDate)
		normalizedDate.setHours(12, 0, 0, 0)
		if (resolvedMaxDate && normalizedDate > resolvedMaxDate) {
			normalizedDate = resolvedMaxDate
		}
		if (resolvedMinDate && normalizedDate < resolvedMinDate) {
			normalizedDate = resolvedMinDate
		}

		const formatted = formatDisplayValue(normalizedDate)
		console.log('[DOB] New DOB:', formatted)
		setPickerDate(normalizedDate)
		onChange(formatted)
	}

	const picker = (
		<DateTimePicker
			value={pickerDate}
			mode="date"
			display={Platform.OS === 'ios' ? 'inline' : Platform.OS === 'android' ? 'calendar' : 'default'}
			minimumDate={resolvedMinDate}
			maximumDate={resolvedMaxDate}
			onChange={handleDateChange}
		/>
	)

	const theme = useTheme()
	const appFontFamily = (theme as any)?.fonts?.bodyMedium?.fontFamily || (theme as any)?.fonts?.bodyLarge?.fontFamily || 'Roboto, "Helvetica Neue", Helvetica, Arial, sans-serif'

	if (Platform.OS === 'web') {
		const maxIso = resolvedMaxDate ? formatDateToIso(resolvedMaxDate) : undefined
		const minIso = resolvedMinDate ? formatDateToIso(resolvedMinDate) : undefined
		const isoValue = toIsoDate(value)
		const dateInputStyleId = 'app-calendar-web-date-style'

		if (typeof document !== 'undefined' && !document.getElementById(dateInputStyleId)) {
			const styleTag = document.createElement('style')
			styleTag.id = dateInputStyleId
			styleTag.textContent = `
				.app-calendar-date-input {
					font-family: ${appFontFamily}, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
					font-size: 14px !important;
					font-weight: 400 !important;
					line-height: 20px !important;
					color: #2f2f2f;
					box-sizing: border-box;
				}
				.app-calendar-date-input::-webkit-datetime-edit,
				.app-calendar-date-input::-webkit-datetime-edit-fields-wrapper,
				.app-calendar-date-input::-webkit-datetime-edit-text,
				.app-calendar-date-input::-webkit-datetime-edit-month-field,
				.app-calendar-date-input::-webkit-datetime-edit-day-field,
				.app-calendar-date-input::-webkit-datetime-edit-year-field {
					font-family: inherit !important;
					font-size: 14px !important;
					font-weight: 400 !important;
					line-height: 20px !important;
				}
				.app-calendar-date-input.is-placeholder,
				.app-calendar-date-input.is-placeholder::-webkit-datetime-edit,
				.app-calendar-date-input.is-placeholder::-webkit-datetime-edit-fields-wrapper,
				.app-calendar-date-input.is-placeholder::-webkit-datetime-edit-text,
				.app-calendar-date-input.is-placeholder::-webkit-datetime-edit-month-field,
				.app-calendar-date-input.is-placeholder::-webkit-datetime-edit-day-field,
				.app-calendar-date-input.is-placeholder::-webkit-datetime-edit-year-field {
					color: #9a9a9a !important;
				}
				.app-calendar-date-input:not(.is-placeholder),
				.app-calendar-date-input:not(.is-placeholder)::-webkit-datetime-edit,
				.app-calendar-date-input:not(.is-placeholder)::-webkit-datetime-edit-fields-wrapper,
				.app-calendar-date-input:not(.is-placeholder)::-webkit-datetime-edit-text,
				.app-calendar-date-input:not(.is-placeholder)::-webkit-datetime-edit-month-field,
				.app-calendar-date-input:not(.is-placeholder)::-webkit-datetime-edit-day-field,
				.app-calendar-date-input:not(.is-placeholder)::-webkit-datetime-edit-year-field {
					color: #2f2f2f !important;
				}
				.app-calendar-date-input::-webkit-calendar-picker-indicator {
					cursor: pointer;
					opacity: 0.65;
				}
				.app-calendar-date-input::-webkit-calendar-picker-indicator:hover {
					opacity: 1;
				}
			`
			document.head.appendChild(styleTag)
		}

		return (
			<View style={styles.fieldGroup}>
				{label ? (
					<AppTypography variant="caption" style={styles.fieldLabel}>
						{label}
						{required ? (
							<AppTypography variant="caption" style={styles.requiredMark}>
								{' '}
								*
							</AppTypography>
						) : null}
					</AppTypography>
				) : null}
				<View style={styles.inputShell}>
					{React.createElement('input', {
						type: 'date',
						value: isoValue,
						max: maxIso,
						min: minIso,
						className: `app-calendar-date-input ${!value ? 'is-placeholder' : ''}`,
						onClick: (e: any) => {
							console.log('[DOB] Current state:', value)
							console.log('[DOB] Calendar opened')
							try {
								e?.currentTarget?.showPicker?.()
							} catch {}
						},
						onChange: (e: any) => {
							const next = e?.target?.value
							console.log('[DOB] Web input changed:', next)
							console.log('[DOB] Selected date:', next)
							if (next) {
								const formatted = fromIsoDate(next)
								console.log('[DOB] New DOB:', formatted)
								onChange(formatted)
							} else if (e?.target?.value === '') {
								// User explicitly cleared the date field
								console.log('[DOB] New DOB: (cleared)')
								onChange('')
							}
						},
						style: {
							width: '100%',
							height: 38,
							border: 'none',
							outline: 'none',
							backgroundColor: 'transparent',
							padding: 0,
							margin: 0,
							fontSize: 14,
							fontFamily: `${appFontFamily}, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`,
							fontWeight: '400',
							lineHeight: '20px',
							color: value ? '#2f2f2f' : '#9a9a9a',
							cursor: 'pointer',
						},
					})}
				</View>
			</View>
		)
	}

	return (
		<View style={styles.fieldGroup}>
			{label ? (
				<AppTypography variant="caption" style={styles.fieldLabel}>
					{label}
					{required ? (
						<AppTypography variant="caption" style={styles.requiredMark}>
							{' '}
							*
						</AppTypography>
					) : null}
				</AppTypography>
			) : null}
			<Pressable style={styles.inputShell} onPress={openPicker}>
				<AppTypography variant="body" style={[styles.selectText, !value && styles.placeholderText]}>
					{displayValue}
				</AppTypography>
				<MaterialCommunityIcons name="calendar-month-outline" size={20} color="#2c7b80" />
			</Pressable>
			{showPicker && Platform.OS === 'android' ? picker : null}
			{Platform.OS !== 'android' ? (
				<Modal visible={showPicker} transparent animationType="fade" onRequestClose={closePicker}>
					<Pressable style={styles.modalOverlay} onPress={closePicker}>
						<Pressable
							style={[styles.calendarModalCard, isMobile && styles.modalCardMobile]}
							onPress={(event) => event.stopPropagation()}
						>
							<View style={styles.modalHeader}>
								<AppTypography variant="h4" style={styles.modalTitle}>
									{modalTitle}
								</AppTypography>
								<TouchableOpacity
									onPress={closePicker}
									hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
								>
									<MaterialCommunityIcons name="close" size={22} color="#45636d" />
								</TouchableOpacity>
							</View>
							<View style={styles.calendarPickerBody}>{picker}</View>
							<View style={styles.modalActions}>
								<TouchableOpacity style={styles.doneButton} onPress={closePicker}>
									<AppTypography variant="body" style={styles.doneButtonText}>
										Done
									</AppTypography>
								</TouchableOpacity>
							</View>
						</Pressable>
					</Pressable>
				</Modal>
			) : null}
		</View>
	)
}

const styles = StyleSheet.create({
	fieldGroup: {
		width: '100%',
	},
	fieldLabel: {
		marginBottom: 8,
		fontSize: 14,
		lineHeight: 20,
		color: '#8f8f8f',
		fontWeight: '500',
	},
	requiredMark: {
		color: '#d84545',
		fontSize: 12,
		lineHeight: 14,
		fontWeight: '700',
		textAlignVertical: 'top',
	},
	inputShell: {
		minHeight: 42,
		borderWidth: 1,
		borderColor: '#a7d3db',
		borderRadius: 8,
		paddingHorizontal: 14,
		backgroundColor: '#ffffff',
		flexDirection: 'row',
		alignItems: 'center',
	},
	selectText: {
		flex: 1,
		fontSize: 14,
		lineHeight: 20,
		color: '#2f2f2f',
	},
	placeholderText: {
		color: '#9a9a9a',
	},
	modalOverlay: {
		flex: 1,
		backgroundColor: 'rgba(18, 28, 33, 0.28)',
		justifyContent: 'center',
		paddingHorizontal: 20,
	},
	modalCardMobile: {
		maxWidth: '100%',
	},
	calendarModalCard: {
		width: '100%',
		maxWidth: 420,
		alignSelf: 'center',
		backgroundColor: '#ffffff',
		borderRadius: 16,
		paddingVertical: 8,
		maxHeight: '78%',
	},
	modalHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 18,
		paddingTop: 10,
		paddingBottom: 8,
	},
	modalTitle: {
		color: '#343434',
	},
	calendarPickerBody: {
		paddingHorizontal: 12,
		paddingBottom: 12,
	},
	modalActions: {
		paddingHorizontal: 18,
		paddingVertical: 12,
		borderTopWidth: 1,
		borderTopColor: '#eef4f5',
		alignItems: 'flex-end',
	},
	doneButton: {
		minWidth: 96,
		borderRadius: 8,
		backgroundColor: '#0c7c7c',
		paddingHorizontal: 16,
		paddingVertical: 10,
		alignItems: 'center',
	},
	doneButtonText: {
		color: '#ffffff',
		fontWeight: '600',
	},
})
