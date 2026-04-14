import React, { useState } from 'react'
import {
	View,
	Text,
	TextInput,
	TouchableOpacity,
	Modal,
	FlatList,
	Platform,
	StyleSheet,
	KeyboardAvoidingView,
} from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import CloseCircle from '../../assets/icons/cross_icon.svg'
import EditIcon from '../../assets/icons/edit_icon.svg'
import DateTimePicker from '@react-native-community/datetimepicker'
import type { ProfileFieldConfig } from './profileFieldsConfig'
import { getMultiValues, setMultiValues } from './profileFieldsConfig'

import { theme } from '../../config/theme'

const TEAL = '#1a8c8c'

interface Props {
	config: ProfileFieldConfig
	value?: string
	onChange: (key: string, value: string) => void
}

export default function HealthProfileField({ config, value, onChange }: Props) {
	const { key, label, type, placeholder, options, unit, verified, addLabel } = config

	const [editing, setEditing] = useState(false)
	const [draft, setDraft] = useState(value ?? '')
	const [showPicker, setShowPicker] = useState(false)
	const [showSelect, setShowSelect] = useState(false)
	const [showMulti, setShowMulti] = useState(false)
	const [multiDraft, setMultiDraft] = useState('')

	// ── single field helpers ──────────────────────────────────────────────────
	const commitText = () => {
		if (draft.trim()) onChange(key, draft.trim())
		setEditing(false)
	}
	const cancelEdit = () => {
		setDraft(value ?? '')
		setEditing(false)
	}

	// ── multi field helpers ───────────────────────────────────────────────────
	const multiValues = getMultiValues(value)

	const addMultiItem = () => {
		if (!multiDraft.trim()) return
		const next = [...multiValues, multiDraft.trim()]
		onChange(key, setMultiValues(next))
		setMultiDraft('')
	}

	const removeMultiItem = (idx: number) => {
		const next = multiValues.filter((_, i) => i !== idx)
		onChange(key, setMultiValues(next))
	}

	// ── date ──────────────────────────────────────────────────────────────────
	const handleDateChange = (_: any, selected?: Date) => {
		if (Platform.OS === 'android') setShowPicker(false)
		if (selected) {
			onChange(key, selected.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }))
		}
	}
	const parsedDate = (() => {
		if (!value) return new Date()
		const [d, m, y] = value.split('/').map(Number)
		const dt = new Date(y, m - 1, d)
		return isNaN(dt.getTime()) ? new Date() : dt
	})()

	// ── MULTI field render ────────────────────────────────────────────────────
	if (type === 'multi') {
		return (
			<View style={styles.wrapper}>
				{/* Row: label | + add */}
				<View style={styles.row}>
					<Text style={styles.label}>{label}</Text>
					<TouchableOpacity
						onPress={() => setShowMulti(true)}
						activeOpacity={0.7}
						hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
					>
						<Text style={styles.addBtn}>+ add</Text>
					</TouchableOpacity>
				</View>

				{/* Existing items listed below */}
				{multiValues.map((item, idx) => (
					<View key={idx} style={styles.multiItem}>
						<Text style={styles.multiItemTxt}>{item}</Text>
						<TouchableOpacity
							onPress={() => removeMultiItem(idx)}
							hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
						>
							<CloseCircle width={16} height={16} />
						</TouchableOpacity>
					</View>
				))}

				{/* Add modal — full-screen sheet */}
				<Modal visible={showMulti} transparent animationType="slide" onRequestClose={() => setShowMulti(false)}>
					<TouchableOpacity
						style={styles.modalOverlay}
						activeOpacity={1}
						onPress={() => setShowMulti(false)}
					/>
					<KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
						<View style={styles.multiSheet}>
							<View style={styles.sheetHandle} />

							{/* Sheet header */}
							<View style={styles.sheetHeader}>
								<TouchableOpacity onPress={() => setShowMulti(false)}>
									<MaterialCommunityIcons
										name="chevron-left"
										size={24}
										color={theme.colors.primary}
									/>
								</TouchableOpacity>
								<Text style={styles.sheetTitle}>{addLabel ?? label}</Text>
							</View>

							<Text style={styles.sheetSubtitle}>{addLabel ?? `Add ${label}`}</Text>

							{/* Textarea input */}
							<View style={styles.multiInputBox}>
								<TextInput
									style={styles.multiTextInput}
									value={multiDraft}
									onChangeText={setMultiDraft}
									placeholder={placeholder ?? `Write your ${label.toLowerCase()}`}
									placeholderTextColor="#b0bcc0"
									multiline
									autoFocus
									textAlignVertical="top"
								/>
							</View>

							{/* Save button */}
							<TouchableOpacity
								style={[styles.saveBtn, !multiDraft.trim() && styles.saveBtnDisabled]}
								onPress={addMultiItem}
								activeOpacity={0.8}
							>
								<Text style={styles.saveBtnTxt}>Save</Text>
							</TouchableOpacity>
						</View>
					</KeyboardAvoidingView>
				</Modal>
			</View>
		)
	}

	// ── Standard single-value field ───────────────────────────────────────────
	return (
		<View style={styles.wrapper}>
			<View style={styles.row}>
				<View style={styles.labelBlock}>
					<Text style={styles.label}>{label}</Text>
					{!!value && !editing && (
						<View style={styles.valueRow}>
							<Text style={styles.value}>
								{value}
								{unit ? ` ${unit}` : ''}
							</Text>
							{verified && (
								<MaterialCommunityIcons
									name="check-circle"
									size={15}
									color={theme.colors.primary}
									style={{ marginLeft: 5 }}
								/>
							)}
						</View>
					)}
				</View>

				{!editing &&
					(!value ? (
						<TouchableOpacity
							onPress={() => {
								if (type === 'date') {
									setShowPicker(true)
									return
								}
								if (type === 'select') {
									setShowSelect(true)
									return
								}
								setDraft('')
								setEditing(true)
							}}
							activeOpacity={0.7}
							hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
						>
							<Text style={styles.addBtn}>+ add</Text>
						</TouchableOpacity>
					) : (
						<TouchableOpacity
							onPress={() => {
								if (type === 'date') {
									setShowPicker(true)
									return
								}
								if (type === 'select') {
									setShowSelect(true)
									return
								}
								setDraft(value)
								setEditing(true)
							}}
							activeOpacity={0.7}
							hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
						>
							<EditIcon width={18} height={18} />
						</TouchableOpacity>
					))}
			</View>

			{editing && (
				<View style={styles.editRow}>
					<View style={styles.inputBox}>
						<TextInput
							style={styles.textInput}
							value={draft}
							onChangeText={setDraft}
							autoFocus
							keyboardType={
								type === 'phone'
									? 'phone-pad'
									: type === 'email'
										? 'email-address'
										: type === 'number'
											? 'numeric'
											: 'default'
							}
							returnKeyType="done"
							onSubmitEditing={commitText}
							placeholder={placeholder}
							placeholderTextColor="#b0bcc0"
						/>
						{!!unit && <Text style={styles.unitTxt}>{unit}</Text>}
					</View>
					<TouchableOpacity onPress={cancelEdit} style={styles.iconBtn}>
						<MaterialCommunityIcons name="close" size={17} color="#888" />
					</TouchableOpacity>
					<TouchableOpacity onPress={commitText} style={[styles.iconBtn, styles.checkBtn]}>
						<MaterialCommunityIcons name="check" size={17} color="#fff" />
					</TouchableOpacity>
				</View>
			)}

			{showPicker && (
				<DateTimePicker
					value={parsedDate}
					mode="date"
					display={Platform.OS === 'ios' ? 'spinner' : 'default'}
					maximumDate={new Date()}
					onChange={handleDateChange}
				/>
			)}

			{showSelect && (
				<Modal transparent animationType="slide" onRequestClose={() => setShowSelect(false)}>
					<TouchableOpacity
						style={styles.modalOverlay}
						activeOpacity={1}
						onPress={() => setShowSelect(false)}
					/>
					<View style={styles.bottomSheet}>
						<View style={styles.sheetHandle} />
						<Text style={styles.sheetTitle}>{label}</Text>
						<FlatList
							data={options ?? []}
							keyExtractor={(item) => item}
							renderItem={({ item }) => (
								<TouchableOpacity
									style={[styles.optionRow, value === item && styles.optionRowActive]}
									onPress={() => {
										onChange(key, item)
										setShowSelect(false)
									}}
									activeOpacity={0.7}
								>
									<Text style={[styles.optionTxt, value === item && styles.optionTxtActive]}>
										{item}
									</Text>
									{value === item && (
										<MaterialCommunityIcons name="check" size={18} color={theme.colors.primary} />
									)}
								</TouchableOpacity>
							)}
						/>
					</View>
				</Modal>
			)}
		</View>
	)
}

const styles = StyleSheet.create({
	wrapper: {
		backgroundColor: '#fff',
		borderBottomWidth: 0.5,
		borderBottomColor: '#e8ecee',
	},
	row: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingVertical: 13,
		paddingHorizontal: 16,
		// minHeight: 52,
	},
	labelBlock: { flex: 1, paddingRight: 12, justifyContent: 'center', minHeight: 20 },
	label: { fontSize: 12, color: '#7a8c91', marginBottom: 2 },
	valueRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
	value: { fontSize: 14, fontWeight: '500', color: '#1a2226' },
	addBtn: { fontSize: 13, color: theme.colors.primary, fontWeight: '600' },

	multiItem: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 16,
		paddingVertical: 13, // ← slightly taller rows
		borderTopWidth: 0.5,
		borderTopColor: '#f0f3f4',
	},
	multiItemTxt: {
		fontSize: 15, // ← slightly larger text (matches screenshot)
		color: '#1a2226',
		flex: 1,
		marginRight: 10,
	},

	// multi modal sheet
	multiSheet: {
		backgroundColor: '#fff',
		borderTopLeftRadius: 20,
		borderTopRightRadius: 20,
		paddingBottom: 32,
		minHeight: 300,
	},
	sheetHandle: {
		width: 40,
		height: 4,
		borderRadius: 2,
		backgroundColor: '#d0dadd',
		alignSelf: 'center',
		marginTop: 10,
		marginBottom: 4,
	},
	sheetHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 14,
		paddingVertical: 10,
		borderBottomWidth: 0.5,
		borderBottomColor: '#e8ecee',
		gap: 4,
	},
	sheetTitle: {
		fontSize: 15,
		fontWeight: '600',
		color: '#1a2226',
	},
	sheetSubtitle: {
		fontSize: 13,
		color: '#7a8c91',
		paddingHorizontal: 16,
		paddingTop: 14,
		paddingBottom: 6,
	},
	multiInputBox: {
		marginHorizontal: 16,
		borderWidth: 1,
		borderColor: '#d0dadd',
		borderRadius: 10,
		minHeight: 100,
		padding: 12,
		backgroundColor: '#fafcfc',
	},
	multiTextInput: {
		fontSize: 14,
		color: '#1a2226',
		minHeight: 80,
		padding: 0,
	},
	saveBtn: {
		marginHorizontal: 16,
		marginTop: 16,
		backgroundColor: theme.colors.primary,
		borderRadius: 24,
		paddingVertical: 13,
		alignItems: 'center',
	},
	saveBtnDisabled: { opacity: 0.45 },
	saveBtnTxt: { color: '#fff', fontSize: 15, fontWeight: '600' },

	// single field edit row
	editRow: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 16,
		paddingVertical: 0,
		gap: 8,
		// minHeight: 52,
	},
	inputBox: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center',
		borderWidth: 1.5,
		borderColor: theme.colors.primary,
		borderRadius: 10,
		paddingHorizontal: 12,
		paddingVertical: 0,
		backgroundColor: '#f8fdfd',
		minHeight: 42,
	},
	textInput: { flex: 1, fontSize: 14, color: '#1a2226', padding: 0 },
	unitTxt: { fontSize: 13, color: '#7a8c91', marginLeft: 4 },
	iconBtn: {
		width: 34,
		height: 34,
		borderRadius: 17,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#e8ecee',
		flexShrink: 0,
	},
	checkBtn: { backgroundColor: theme.colors.primary },

	// select modal
	modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
	bottomSheet: {
		backgroundColor: '#ad1b1b',
		borderTopLeftRadius: 20,
		borderTopRightRadius: 20,
		paddingBottom: 32,
		maxHeight: '60%',
	},
	optionRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 20,
		paddingVertical: 14,
		borderBottomWidth: 0.5,
		borderBottomColor: '#f0f3f4',
	},
	optionRowActive: { backgroundColor: '#f0fafa' },
	optionTxt: { fontSize: 14, color: '#2a3a3e' },
	optionTxtActive: { color: theme.colors.primary, fontWeight: '600' },
})
