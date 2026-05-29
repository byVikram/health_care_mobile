import React, { useMemo, useState } from 'react'
import {
	Modal,
	Platform,
	Pressable,
	StyleProp,
	StyleSheet,
	View,
	ViewStyle,
} from 'react-native'
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useTheme } from 'react-native-paper'
import { AppTypography } from './AppTypography'

export interface AppTimePickerProps {
	value?: string
	onChange: (value: string) => void
	label?: string
	placeholder?: string
	disabled?: boolean
	error?: string
	errorText?: string
	required?: boolean
	style?: StyleProp<ViewStyle>
	noMargin?: boolean
}

const parseTimeValue = (value?: string) => {
	const [hours = '0', minutes = '0'] = (value || '').split(':')
	const date = new Date()
	date.setHours(Number(hours) || 0, Number(minutes) || 0, 0, 0)
	return date
}

const formatTimeForValue = (date: Date) => {
	const hours = String(date.getHours()).padStart(2, '0')
	const minutes = String(date.getMinutes()).padStart(2, '0')
	return `${hours}:${minutes}`
}

const formatTimeForDisplay = (value?: string) => {
	if (!value) return ''

	return parseTimeValue(value).toLocaleTimeString('en-US', {
		hour: '2-digit',
		minute: '2-digit',
		hour12: true,
	})
}

export const AppTimePicker = ({
	value,
	onChange,
	label,
	placeholder = 'Select time',
	disabled = false,
	error,
	errorText,
	required = false,
	style,
	noMargin = false,
}: AppTimePickerProps) => {
	const theme = useTheme()
	const [pickerVisible, setPickerVisible] = useState(false)
	const [iosDraftDate, setIosDraftDate] = useState(() => parseTimeValue(value))
	const validationText = errorText ?? error
	const displayValue = useMemo(() => formatTimeForDisplay(value), [value])

	const openPicker = () => {
		if (disabled) return
		setIosDraftDate(parseTimeValue(value))
		setPickerVisible(true)
	}

	const closePicker = () => setPickerVisible(false)

	const handleAndroidChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
		closePicker()
		if (event.type === 'dismissed' || !selectedDate) return
		onChange(formatTimeForValue(selectedDate))
	}

	const handleIosChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
		if (!selectedDate) return
		setIosDraftDate(selectedDate)
	}

	const confirmIosValue = () => {
		onChange(formatTimeForValue(iosDraftDate))
		closePicker()
	}

	return (
		<View style={[styles.container, noMargin && styles.containerNoMargin, style]}>
			{label ? (
				<AppTypography variant="caption" style={styles.label}>
					{label}
					{required ? (
						<AppTypography variant="caption" style={styles.requiredMark}>
							*
						</AppTypography>
					) : null}
				</AppTypography>
			) : null}

			<Pressable
				style={[
					styles.input,
					validationText && { borderColor: theme.colors.error },
					disabled && styles.inputDisabled,
				]}
				onPress={openPicker}
				accessibilityRole="button"
				accessibilityLabel={label || placeholder}
				disabled={disabled}
			>
				<AppTypography
					variant="body"
					style={[styles.inputText, !displayValue && styles.placeholderText, disabled && styles.disabledText]}
					numberOfLines={1}
				>
					{displayValue || placeholder}
				</AppTypography>
				<MaterialCommunityIcons name="clock-time-four-outline" size={18} color={disabled ? '#a7b2b8' : '#61727b'} />
			</Pressable>

			{validationText ? (
				<AppTypography variant="caption" style={[styles.errorText, { color: theme.colors.error }]}>
					{validationText}
				</AppTypography>
			) : null}

			{pickerVisible && Platform.OS !== 'ios' ? (
				<DateTimePicker
					value={parseTimeValue(value)}
					mode="time"
					display="default"
					onChange={handleAndroidChange}
				/>
			) : null}

			<Modal visible={pickerVisible && Platform.OS === 'ios'} transparent animationType="fade" onRequestClose={closePicker}>
				<Pressable style={styles.modalOverlay} onPress={closePicker}>
					<Pressable style={styles.iosSheet} onPress={(event) => event.stopPropagation()}>
						<View style={styles.iosHeader}>
							<Pressable onPress={closePicker} hitSlop={8}>
								<AppTypography variant="body" style={styles.iosActionText}>
									Cancel
								</AppTypography>
							</Pressable>
							<Pressable onPress={confirmIosValue} hitSlop={8}>
								<AppTypography variant="body" style={[styles.iosActionText, styles.iosDoneText]}>
									Done
								</AppTypography>
							</Pressable>
						</View>
						<DateTimePicker
							value={iosDraftDate}
							mode="time"
							display="spinner"
							onChange={handleIosChange}
						/>
					</Pressable>
				</Pressable>
			</Modal>
		</View>
	)
}

export default AppTimePicker

const styles = StyleSheet.create({
	container: {
		marginBottom: 16,
		width: '100%',
	},
	containerNoMargin: {
		marginBottom: 0,
	},
	label: {
		marginBottom: 8,
		fontSize: 14,
		lineHeight: 20,
		color: '#8f8f8f',
		fontWeight: '500',
	},
	requiredMark: {
		color: '#ef5d5d',
		fontSize: 14,
		lineHeight: 20,
		fontWeight: '600',
	},
	input: {
		height: 48,
		borderWidth: 1,
		borderColor: '#a7d3db',
		borderRadius: 10,
		backgroundColor: '#ffffff',
		paddingHorizontal: 14,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	inputDisabled: {
		backgroundColor: '#f3f6f7',
		borderColor: '#d6e0e3',
	},
	inputText: {
		flex: 1,
		color: '#2f2f2f',
		fontSize: 14,
		lineHeight: 20,
		marginRight: 8,
	},
	placeholderText: {
		color: '#9a9a9a',
	},
	disabledText: {
		color: '#98a5aa',
	},
	errorText: {
		marginTop: 4,
		marginLeft: 4,
		fontSize: 12,
		lineHeight: 16,
	},
	modalOverlay: {
		flex: 1,
		backgroundColor: 'rgba(18, 28, 33, 0.28)',
		justifyContent: 'flex-end',
	},
	iosSheet: {
		backgroundColor: '#ffffff',
		borderTopLeftRadius: 18,
		borderTopRightRadius: 18,
		paddingBottom: 12,
	},
	iosHeader: {
		minHeight: 48,
		paddingHorizontal: 18,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderBottomColor: '#e4ecef',
	},
	iosActionText: {
		color: '#61727b',
		fontSize: 14,
		fontWeight: '600',
	},
	iosDoneText: {
		color: '#0c7c7c',
	},
})
