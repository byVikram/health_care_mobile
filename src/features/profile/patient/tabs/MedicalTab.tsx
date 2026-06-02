import React, { useState } from 'react'
import {
	View,
	ScrollView,
	TouchableOpacity,
	StyleSheet,
	Modal,
	KeyboardAvoidingView,
	TextInput,
	Platform,
} from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { AppTypography, AppButton } from '../../../../components/common'
import type { PatientProfileState } from '../PatientProfileService'

interface Props {
	data: PatientProfileState
	onChange: (key: keyof PatientProfileState, value: any) => void
	onSave: () => void
	saving: boolean
}

type MultiFieldKey = 'allergies' | 'chronicConditions'

interface MultiFieldDetails {
	key: MultiFieldKey
	label: string
	addLabel: string
	placeholder: string
}

const FIELD_DETAILS: Record<MultiFieldKey, MultiFieldDetails> = {
	allergies: {
		key: 'allergies',
		label: 'Allergies',
		addLabel: 'Add Allergies',
		placeholder: 'Write your allergy',
	},
	chronicConditions: {
		key: 'chronicConditions',
		label: 'Chronic diseases',
		addLabel: 'Add Chronic diseases',
		placeholder: 'Write your condition',
	},
}

export default function MedicalTab({ data, onChange, onSave, saving }: Props) {
	const [multiModalVisible, setMultiModalVisible] = useState(false)
	const [activeKey, setActiveKey] = useState<MultiFieldKey>('allergies')
	const [multiDraft, setMultiDraft] = useState('')

	const removeMultiItem = (key: MultiFieldKey, idx: number) => {
		const currentValues = data[key] || []
		const next = currentValues.filter((_, i) => i !== idx)
		onChange(key, next)
	}

	const addMultiItem = () => {
		if (!multiDraft.trim()) return
		const currentValues = data[activeKey] || []
		const next = [...currentValues, multiDraft.trim()]
		onChange(activeKey, next)
		setMultiDraft('')
		setMultiModalVisible(false)
	}

	const renderMultiField = (fieldKey: MultiFieldKey) => {
		const details = FIELD_DETAILS[fieldKey]
		const values = data[fieldKey] || []

		return (
			<View key={fieldKey} style={styles.multiFieldContainer}>
				<View style={styles.multiFieldHeader}>
					<AppTypography variant="caption" style={styles.fieldLabel}>
						{details.label}
					</AppTypography>
					<TouchableOpacity
						onPress={() => {
							setActiveKey(fieldKey)
							setMultiDraft('')
							setMultiModalVisible(true)
						}}
						activeOpacity={0.8}
						style={styles.addMultiBtn}
					>
						<AppTypography variant="caption" style={styles.addMultiTxt}>
							+ add
						</AppTypography>
					</TouchableOpacity>
				</View>
				<View style={styles.chipsContainer}>
					{values.map((item, idx) => (
						<View key={idx} style={styles.chip}>
							<AppTypography variant="body" style={styles.chipText}>
								{item}
							</AppTypography>
							<TouchableOpacity onPress={() => removeMultiItem(fieldKey, idx)}>
								<MaterialCommunityIcons name="close-circle" size={16} color="#0c7c7c" style={styles.chipCloseIcon} />
							</TouchableOpacity>
						</View>
					))}
					{values.length === 0 && (
						<AppTypography variant="body" style={styles.noItemsText}>
							No {details.label.toLowerCase()} added yet.
						</AppTypography>
					)}
				</View>
			</View>
		)
	}

	const activeFieldDetails = FIELD_DETAILS[activeKey]

	return (
		<ScrollView
			style={styles.scroll}
			contentContainerStyle={styles.scrollContent}
			keyboardShouldPersistTaps="handled"
			showsVerticalScrollIndicator={false}
		>
			<View style={styles.formFieldsWrapper}>
				{renderMultiField('allergies')}
				{renderMultiField('chronicConditions')}
			</View>

			<View style={styles.saveButtonWrapper}>
				<AppButton
					variant="primary"
					formAction
					style={styles.saveButton}
					onPress={onSave}
					loading={saving}
					disabled={saving}
				>
					Save
				</AppButton>
			</View>

			{/* Multi Modal Sheet */}
			<Modal
				visible={multiModalVisible}
				transparent
				animationType="slide"
				onRequestClose={() => setMultiModalVisible(false)}
			>
				<TouchableOpacity
					style={styles.modalOverlay}
					activeOpacity={1}
					onPress={() => setMultiModalVisible(false)}
				/>
				<KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
					<View style={styles.multiSheet}>
						<View style={styles.sheetHandle} />

						{/* Sheet header */}
						<View style={styles.sheetHeader}>
							<TouchableOpacity onPress={() => setMultiModalVisible(false)}>
								<MaterialCommunityIcons
									name="chevron-left"
									size={24}
									color="#0c7c7c"
								/>
							</TouchableOpacity>
							<AppTypography variant="h4" style={styles.sheetTitle}>
								{activeFieldDetails.addLabel}
							</AppTypography>
						</View>

						<AppTypography variant="caption" style={styles.sheetSubtitle}>
							Add {activeFieldDetails.label}
						</AppTypography>

						{/* Textarea input */}
						<View style={styles.multiInputBox}>
							<TextInput
								style={styles.multiTextInput}
								value={multiDraft}
								onChangeText={setMultiDraft}
								placeholder={activeFieldDetails.placeholder}
								placeholderTextColor="#b0bcc0"
								multiline
								autoFocus
								textAlignVertical="top"
							/>
						</View>

						{/* Save button */}
						<TouchableOpacity
							style={[styles.saveBtnModal, !multiDraft.trim() && styles.saveBtnModalDisabled]}
							onPress={addMultiItem}
							activeOpacity={0.8}
							disabled={!multiDraft.trim()}
						>
							<AppTypography variant="subtitle" style={styles.saveBtnModalTxt}>
								Save
							</AppTypography>
						</TouchableOpacity>
					</View>
				</KeyboardAvoidingView>
			</Modal>
		</ScrollView>
	)
}

const styles = StyleSheet.create({
	scroll: {
		flex: 1,
		backgroundColor: '#fff',
	},
	scrollContent: {
		flexGrow: 1,
	},
	formFieldsWrapper: {
		paddingHorizontal: 16,
		paddingVertical: 16,
	},
	fieldLabel: {
		marginBottom: 8,
		fontSize: 14,
		lineHeight: 20,
		color: '#8f8f8f',
		fontWeight: '500',
	},
	saveButtonWrapper: {
		paddingHorizontal: 16,
		paddingBottom: 24,
		alignItems: 'center',
	},
	saveButton: {
		width: '100%',
		// maxWidth: 320,
	},
	multiFieldContainer: {
		marginBottom: 16,
	},
	multiFieldHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 8,
	},
	addMultiBtn: {
		paddingVertical: 2,
		paddingHorizontal: 8,
	},
	addMultiTxt: {
		color: '#0c7c7c',
		fontWeight: '600',
	},
	chipsContainer: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		marginTop: 4,
	},
	chip: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#f0f7f7',
		borderWidth: 1,
		borderColor: '#d4e8ea',
		borderRadius: 20,
		paddingVertical: 6,
		paddingHorizontal: 12,
		margin: 4,
	},
	chipText: {
		fontSize: 14,
		color: '#2c3e50',
		marginRight: 6,
	},
	chipCloseIcon: {
		marginTop: 1,
	},
	noItemsText: {
		color: '#9aabb0',
		fontSize: 14,
		fontStyle: 'italic',
		marginLeft: 4,
		marginTop: 4,
	},
	modalOverlay: {
		flex: 1,
		backgroundColor: 'rgba(0,0,0,0.35)',
	},
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
	saveBtnModal: {
		marginHorizontal: 16,
		marginTop: 16,
		backgroundColor: '#0c7c7c',
		borderRadius: 24,
		paddingVertical: 13,
		alignItems: 'center',
	},
	saveBtnModalDisabled: {
		opacity: 0.45,
	},
	saveBtnModalTxt: {
		color: '#fff',
		fontWeight: '600',
	},
})
