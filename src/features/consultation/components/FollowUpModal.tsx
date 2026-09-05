import React, { useState, useEffect } from 'react'
import {
	Modal,
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	TextInput,
	Platform,
	ScrollView,
	KeyboardAvoidingView,
	ActivityIndicator,
} from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker'

const TEAL = '#2b6f71'
const TEAL_LIGHT = '#e8f4f4'
const BORDER = '#d6e8ea'
const PLACEHOLDER = '#b0bec5'
const LABEL_COLOR = '#37474f'

type ChipOption = '1 Week' | '2 Weeks' | '1 Month' | 'Custom Date'

interface FollowUpModalProps {
	visible: boolean
	onClose: () => void
	onSave: (dueDate: Date, note: string) => Promise<void> | void
	loading?: boolean
}

export default function FollowUpModal({
	visible,
	onClose,
	onSave,
	loading = false,
}: FollowUpModalProps) {
	const [selectedChip, setSelectedChip] = useState<ChipOption>('1 Week')
	const [dueDate, setDueDate] = useState<Date>(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000))
	const [customDate, setCustomDate] = useState<Date | null>(null)
	const [showDatePicker, setShowDatePicker] = useState<boolean>(false)
	const [note, setNote] = useState<string>('')
	const [error, setError] = useState<string>('')

	useEffect(() => {
		if (visible) {
			setSelectedChip('1 Week')
			setDueDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000))
			setCustomDate(null)
			setShowDatePicker(false)
			setNote('')
			setError('')
		}
	}, [visible])

	const handleChipSelect = (chip: ChipOption) => {
		setSelectedChip(chip)
		setError('')
		const now = new Date()
		if (chip === '1 Week') {
			setShowDatePicker(false)
			setDueDate(new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000))
		} else if (chip === '2 Weeks') {
			setShowDatePicker(false)
			setDueDate(new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000))
		} else if (chip === '1 Month') {
			setShowDatePicker(false)
			const nextMonth = new Date(now)
			nextMonth.setMonth(nextMonth.getMonth() + 1)
			setDueDate(nextMonth)
		} else if (chip === 'Custom Date') {
			if (customDate) {
				setDueDate(customDate)
			} else {
				const today = new Date()
				setDueDate(today)
				setCustomDate(today)
			}
			setShowDatePicker(true)
		}
	}

	const handleDateChange = (event: DateTimePickerEvent, selected?: Date) => {
		if (Platform.OS === 'android') {
			setShowDatePicker(false)
		}
		if (event.type === 'dismissed' || !selected) {
			return
		}
		const today = new Date()
		today.setHours(0, 0, 0, 0)
		if (selected < today) {
			setError('Please select a date in the future.')
			return
		}
		setError('')
		setDueDate(selected)
		setCustomDate(selected)
		setSelectedChip('Custom Date')
	}


	const handleSave = async () => {
		const today = new Date()
		today.setHours(0, 0, 0, 0)
		if (dueDate < today) {
			setError('Please select a valid future follow-up date.')
			return
		}
		await onSave(dueDate, note.trim())
	}

	const formatDateDisplay = (d: Date) => {
		return d.toLocaleDateString('en-US', {
			weekday: 'short',
			year: 'numeric',
			month: 'short',
			day: 'numeric',
		})
	}

	return (
		<Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
			<KeyboardAvoidingView
				behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
				style={styles.overlay}
			>
				<View style={styles.card}>
					{/* Header */}
					<View style={styles.header}>
						<View style={styles.titleRow}>
							<MaterialCommunityIcons name="calendar-sync" size={22} color={TEAL} style={{ marginRight: 8 }} />
							<Text style={styles.title}>Doctor Follow-up (Reconnect)</Text>
						</View>
						<TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
							<MaterialCommunityIcons name="close" size={24} color="#607d8b" />
						</TouchableOpacity>
					</View>
					<Text style={styles.subtitle}>
						Recommend a follow-up timeframe for this patient after consultation.
					</Text>

					<ScrollView style={styles.body} contentContainerStyle={{ paddingBottom: 16 }}>
						{/* Quick selection chips */}
						<Text style={styles.sectionLabel}>Select Timeframe</Text>
						<View style={styles.chipContainer}>
							{(['1 Week', '2 Weeks', '1 Month', 'Custom Date'] as ChipOption[]).map((chip) => {
								const active = selectedChip === chip
								return (
									<TouchableOpacity
										key={chip}
										style={[styles.chip, active && styles.chipActive]}
										onPress={() => handleChipSelect(chip)}
									>
										<MaterialCommunityIcons
											name={chip === 'Custom Date' ? 'calendar-edit' : 'clock-outline'}
											size={16}
											color={active ? '#ffffff' : TEAL}
											style={{ marginRight: 6 }}
										/>
										<Text style={[styles.chipText, active && styles.chipTextActive]}>{chip}</Text>
									</TouchableOpacity>
								)
							})}
						</View>

						{/* Follow-up Date Display / Picker trigger */}
						{selectedChip !== 'Custom Date' ? (
							<>
								<Text style={styles.sectionLabel}>Follow-up Due Date</Text>
								<TouchableOpacity
									style={styles.dateSelector}
									onPress={() => handleChipSelect('Custom Date')}
									activeOpacity={0.8}
								>
									<MaterialCommunityIcons name="calendar-month" size={20} color={TEAL} />
									<Text style={styles.dateText}>{formatDateDisplay(dueDate)}</Text>
									<MaterialCommunityIcons name="pencil-outline" size={18} color="#607d8b" />
								</TouchableOpacity>
							</>
						) : (
							<>
								<Text style={styles.sectionLabel}>Select Custom Date</Text>
								{Platform.OS !== 'android' ? (
									<View style={styles.datePickerWrap}>
										<DateTimePicker
											value={dueDate}
											mode="date"
											minimumDate={new Date()}
											display={Platform.OS === 'ios' ? 'inline' : 'default'}
											onChange={handleDateChange}
										/>
									</View>
								) : (
									<TouchableOpacity
										style={styles.dateSelector}
										onPress={() => setShowDatePicker(true)}
										activeOpacity={0.8}
									>
										<MaterialCommunityIcons name="calendar-month" size={20} color={TEAL} />
										<Text style={styles.dateText}>{formatDateDisplay(dueDate)}</Text>
										<MaterialCommunityIcons name="pencil-outline" size={18} color="#607d8b" />
									</TouchableOpacity>
								)}
								{Platform.OS === 'android' && showDatePicker && (
									<DateTimePicker
										value={dueDate}
										mode="date"
										minimumDate={new Date()}
										display="calendar"
										onChange={handleDateChange}
									/>
								)}
							</>
						)}


						{error ? <Text style={styles.errorText}>{error}</Text> : null}

						{/* Doctor's Note */}
						<Text style={[styles.sectionLabel, { marginTop: 16 }]}>Optional Doctor's Note</Text>
						<View style={styles.noteContainer}>
							<TextInput
								style={styles.textInput}
								placeholder="e.g., Please review blood pressure after medication..."
								placeholderTextColor={PLACEHOLDER}
								multiline
								numberOfLines={3}
								value={note}
								onChangeText={setNote}
							/>
						</View>
					</ScrollView>

					{/* Footer buttons */}
					<View style={styles.footer}>
						<TouchableOpacity
							style={styles.cancelBtn}
							onPress={onClose}
							disabled={loading}
						>
							<Text style={styles.cancelText}>Cancel</Text>
						</TouchableOpacity>
						<TouchableOpacity
							style={[styles.saveBtn, loading && { opacity: 0.7 }]}
							onPress={handleSave}
							disabled={loading}
						>
							{loading ? (
								<ActivityIndicator color="#ffffff" size="small" />
							) : (
								<Text style={styles.saveText}>Save</Text>
							)}
						</TouchableOpacity>
					</View>
				</View>
			</KeyboardAvoidingView>
		</Modal>
	)
}

const styles = StyleSheet.create({
	overlay: {
		flex: 1,
		backgroundColor: 'rgba(0, 0, 0, 0.55)',
		justifyContent: 'center',
		paddingHorizontal: 16,
	},
	card: {
		backgroundColor: '#ffffff',
		borderRadius: 16,
		maxHeight: '85%',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 10 },
		shadowOpacity: 0.25,
		shadowRadius: 16,
		elevation: 10,
		overflow: 'hidden',
	},
	header: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingHorizontal: 20,
		paddingTop: 18,
		paddingBottom: 6,
	},
	titleRow: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	title: {
		fontSize: 18,
		fontWeight: '700',
		color: '#1a3b3c',
	},
	subtitle: {
		fontSize: 13,
		color: '#607d8b',
		paddingHorizontal: 20,
		marginBottom: 16,
	},
	body: {
		paddingHorizontal: 20,
	},
	sectionLabel: {
		color: TEAL,
		fontSize: 13,
		fontWeight: '600',
		marginBottom: 8,
	},
	chipContainer: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 8,
		marginBottom: 16,
	},
	chip: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: TEAL_LIGHT,
		paddingVertical: 8,
		paddingHorizontal: 12,
		borderRadius: 20,
		borderWidth: 1,
		borderColor: BORDER,
	},
	chipActive: {
		backgroundColor: TEAL,
		borderColor: TEAL,
	},
	chipText: {
		fontSize: 13,
		fontWeight: '600',
		color: TEAL,
	},
	chipTextActive: {
		color: '#ffffff',
	},
	dateSelector: {
		flexDirection: 'row',
		alignItems: 'center',
		borderWidth: 1,
		borderColor: BORDER,
		borderRadius: 12,
		paddingHorizontal: 14,
		paddingVertical: 12,
		backgroundColor: '#f9fcfc',
	},
	dateText: {
		flex: 1,
		fontSize: 14,
		fontWeight: '600',
		color: '#2f2f2f',
		marginLeft: 10,
	},
	datePickerWrap: {
		marginTop: 8,
		backgroundColor: '#ffffff',
		borderRadius: 12,
		borderWidth: 1,
		borderColor: BORDER,
		padding: 8,
	},
	errorText: {
		color: '#d32f2f',
		fontSize: 12,
		marginTop: 6,
		fontWeight: '500',
	},
	noteContainer: {
		borderWidth: 1,
		borderColor: BORDER,
		borderRadius: 12,
		backgroundColor: '#f9fcfc',
		paddingHorizontal: 12,
		paddingVertical: 10,
		minHeight: 80,
	},
	textInput: {
		fontSize: 13,
		color: '#2f2f2f',
		textAlignVertical: 'top',
	},
	footer: {
		flexDirection: 'row',
		borderTopWidth: 1,
		borderTopColor: '#eef2f3',
		marginTop: 8,
	},
	cancelBtn: {
		flex: 1,
		height: 52,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: TEAL_LIGHT,
	},
	cancelText: {
		color: '#546e7a',
		fontSize: 15,
		fontWeight: '600',
	},
	saveBtn: {
		flex: 1,
		height: 52,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: TEAL,
	},
	saveText: {
		color: '#ffffff',
		fontSize: 15,
		fontWeight: '700',
	},
})
