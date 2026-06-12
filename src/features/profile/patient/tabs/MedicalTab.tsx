import React, { useState } from 'react'
import {
	View,
	ScrollView,
	TouchableOpacity,
	StyleSheet,
	TextInput,
	KeyboardAvoidingView,
	Platform,
} from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { AppTypography, AppButton } from '../../../../components/common'
import { AppBottomSheet } from '../../../../components/common'
import type { PatientProfileState } from '../PatientProfileService'

interface Props {
	data: PatientProfileState
	onChange: (key: keyof PatientProfileState, value: any) => void
	onSave: () => void
	saving: boolean
}

type MultiFieldKey = 'allergies' | 'chronicConditions' | 'currentMedications'

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
	currentMedications: {
		key: 'currentMedications',
		label: 'Current Medications',
		addLabel: 'Add Current Medications',
		placeholder: 'Write your medication',
	},
}

export default function MedicalTab({ data, onChange, onSave, saving }: Props) {
	const [sheetVisible, setSheetVisible] = useState(false)
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
		setSheetVisible(false)
	}

	const openSheet = (fieldKey: MultiFieldKey) => {
		setActiveKey(fieldKey)
		setMultiDraft('')
		setSheetVisible(true)
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
						onPress={() => openSheet(fieldKey)}
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
								<MaterialCommunityIcons
									name="close-circle"
									size={16}
									color="#0c7c7c"
									style={styles.chipCloseIcon}
								/>
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
				{renderMultiField('currentMedications')}

				<View style={styles.multiFieldContainer}>
					<AppTypography variant="caption" style={styles.fieldLabel}>
						Family History
					</AppTypography>
					<View style={styles.multiInputBox}>
						<TextInput
							style={styles.multiTextInput}
							value={data.familyHistory}
							onChangeText={(val: string) => onChange('familyHistory', val)}
							placeholder="Write relevant family medical history"
							placeholderTextColor="#b0bcc0"
							multiline
							textAlignVertical="top"
						/>
					</View>
				</View>
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

			<AppBottomSheet
				visible={sheetVisible}
				title={activeFieldDetails.addLabel}
				onClose={() => setSheetVisible(false)}
			>
				<KeyboardAvoidingView
					behavior={Platform.OS === 'ios' ? 'padding' : undefined}
					keyboardVerticalOffset={Platform.OS === 'ios' ? 20 : 0}
				>
					<View style={styles.sheetBody}>
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

						<TouchableOpacity
							style={[styles.saveBtnSheet, !multiDraft.trim() && styles.saveBtnSheetDisabled]}
							onPress={addMultiItem}
							activeOpacity={0.8}
							disabled={!multiDraft.trim()}
						>
							<AppTypography variant="subtitle" style={styles.saveBtnSheetTxt}>
								Save
							</AppTypography>
						</TouchableOpacity>
					</View>
				</KeyboardAvoidingView>
			</AppBottomSheet>
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
	multiInputBox: {
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
	// Sheet content
	sheetBody: {
		paddingHorizontal: 16,
		paddingTop: 4,
		paddingBottom: 8,
	},
	saveBtnSheet: {
		marginTop: 16,
		backgroundColor: '#0c7c7c',
		borderRadius: 24,
		paddingVertical: 13,
		alignItems: 'center',
	},
	saveBtnSheetDisabled: {
		opacity: 0.45,
	},
	saveBtnSheetTxt: {
		color: '#fff',
		fontWeight: '600',
	},
})
