import {
	KeyboardAvoidingView,
	Modal,
	Platform,
	Pressable,
	ScrollView,
	StyleSheet,
	TextInput,
	TouchableOpacity,
	View,
} from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { AppTypography } from '../../../components/common'
import { useState } from 'react'

const TEAL = '#2b6f71'
const TEAL_LIGHT = '#e8f4f4'
const BORDER = '#d6e8ea'
const PLACEHOLDER = '#b0bec5'
const LABEL_COLOR = '#37474f'

interface VitalsFormData {
	bloodPressure: string
	fastingSugar: string
	randomSugar: string
	weight: string
	waist: string
	ldl: string
	hba1c: string
	hdl: string
	tgl: string
	pulseRate: string
	respirationRate: string
	spo2: string
	temperature: string
}

interface AddVitalsModalProps {
	visible: boolean
	onClose: () => void
	onSave?: (data: VitalsFormData) => void
}

const INITIAL_FORM: VitalsFormData = {
	bloodPressure: '',
	fastingSugar: '',
	randomSugar: '',
	weight: '',
	waist: '',
	ldl: '',
	hba1c: '',
	hdl: '',
	tgl: '',
	pulseRate: '',
	respirationRate: '',
	spo2: '',
	temperature: '',
}

function VitalInput({
	label,
	value,
	onChangeText,
	placeholder,
	keyboardType = 'numeric',
}: {
	label: string
	value: string
	onChangeText: (v: string) => void
	placeholder: string
	keyboardType?: React.ComponentProps<typeof TextInput>['keyboardType']
}) {
	return (
		<View style={styles.inputGroup}>
			<AppTypography variant="caption" style={styles.inputLabel}>
				{label}
			</AppTypography>
			<View style={styles.inputShell}>
				<TextInput
					value={value}
					onChangeText={onChangeText}
					placeholder={placeholder}
					placeholderTextColor={PLACEHOLDER}
					style={styles.textInput}
					keyboardType={keyboardType}
				/>
			</View>
		</View>
	)
}

export default function AddVitalsModal({ visible, onClose, onSave }: AddVitalsModalProps) {
	const [form, setForm] = useState<VitalsFormData>(INITIAL_FORM)

	const update = (key: keyof VitalsFormData) => (value: string) =>
		setForm((prev) => ({ ...prev, [key]: value }))

	const handleSave = () => {
		onSave?.(form)
		setForm(INITIAL_FORM)
		onClose()
	}

	const handleCancel = () => {
		setForm(INITIAL_FORM)
		onClose()
	}

	return (
		<Modal visible={visible} transparent animationType="fade" onRequestClose={handleCancel}>
			<Pressable style={styles.overlay} onPress={handleCancel}>
				<KeyboardAvoidingView
					behavior={Platform.OS === 'ios' ? 'padding' : undefined}
					style={styles.kavWrapper}
				>
					<Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
						{/* Header */}
						<View style={styles.header}>
							<View>
								<AppTypography variant="h4" style={styles.title}>
									Add Vitals
								</AppTypography>
								<AppTypography variant="caption" style={styles.subtitle}>
									Enter Patient Vitals Value
								</AppTypography>
							</View>
							<TouchableOpacity onPress={handleCancel} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
								<MaterialCommunityIcons name="close" size={22} color="#546e7a" />
							</TouchableOpacity>
						</View>

						<ScrollView
							style={styles.body}
							contentContainerStyle={styles.bodyContent}
							showsVerticalScrollIndicator={false}
							keyboardShouldPersistTaps="handled"
						>
							{/* Primary vitals grid */}
							<View style={styles.grid}>
								<VitalInput
									label="Blood Pressure"
									value={form.bloodPressure}
									onChangeText={update('bloodPressure')}
									placeholder="mm/Hg"
									keyboardType="default"
								/>
								<VitalInput
									label="Fasting Sugar"
									value={form.fastingSugar}
									onChangeText={update('fastingSugar')}
									placeholder="mg/dL"
								/>
								<VitalInput
									label="Random Sugar"
									value={form.randomSugar}
									onChangeText={update('randomSugar')}
									placeholder="mg/dL"
								/>
								<VitalInput
									label="Weight"
									value={form.weight}
									onChangeText={update('weight')}
									placeholder="Kg"
								/>
							</View>

							{/* Divider */}
							<View style={styles.divider} />

							{/* Other vitals section */}
							<AppTypography variant="body" style={styles.sectionLabel}>
								Other Vitals
							</AppTypography>

							<View style={styles.grid}>
								<VitalInput
									label="Waist"
									value={form.waist}
									onChangeText={update('waist')}
									placeholder="cms"
								/>
								<VitalInput
									label="LDL"
									value={form.ldl}
									onChangeText={update('ldl')}
									placeholder="mg/dL"
								/>
								<VitalInput
									label="HbA1C"
									value={form.hba1c}
									onChangeText={update('hba1c')}
									placeholder="%"
								/>
								<VitalInput
									label="HDL"
									value={form.hdl}
									onChangeText={update('hdl')}
									placeholder="mg/dL"
								/>
								<VitalInput
									label="TGL"
									value={form.tgl}
									onChangeText={update('tgl')}
									placeholder="mg/dL"
								/>
								<VitalInput
									label="Pulse Rate"
									value={form.pulseRate}
									onChangeText={update('pulseRate')}
									placeholder="bpm"
								/>
								<VitalInput
									label="Respiration rate"
									value={form.respirationRate}
									onChangeText={update('respirationRate')}
									placeholder="bpm"
								/>
								<VitalInput
									label="SpO2"
									value={form.spo2}
									onChangeText={update('spo2')}
									placeholder="Value"
								/>
							</View>

							{/* Temperature — full width */}
							<View style={styles.singleInput}>
								<VitalInput
									label="Temperature"
									value={form.temperature}
									onChangeText={update('temperature')}
									placeholder="F"
								/>
							</View>
						</ScrollView>

						{/* Footer buttons */}
						<View style={styles.footer}>
							<TouchableOpacity style={styles.cancelBtn} onPress={handleCancel} activeOpacity={0.8}>
								<AppTypography variant="body" style={styles.cancelText}>
									Cancel
								</AppTypography>
							</TouchableOpacity>
							<TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.85}>
								<AppTypography variant="body" style={styles.saveText}>
									Save
								</AppTypography>
							</TouchableOpacity>
						</View>
					</Pressable>
				</KeyboardAvoidingView>
			</Pressable>
		</Modal>
	)
}

const styles = StyleSheet.create({
	overlay: {
		flex: 1,
		backgroundColor: 'rgba(15, 30, 35, 0.35)',
		justifyContent: 'center',
		alignItems: 'center',
		paddingHorizontal: 16,
	},
	kavWrapper: {
		width: '100%',
		maxWidth: 620,
	},
	card: {
		backgroundColor: '#ffffff',
		borderRadius: 16,
		overflow: 'hidden',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 8 },
		shadowOpacity: 0.12,
		shadowRadius: 24,
		elevation: 12,
	},
	header: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		justifyContent: 'space-between',
		paddingHorizontal: 20,
		paddingTop: 20,
		paddingBottom: 12,
	},
	title: {
		color: '#1a2e35',
		fontSize: 17,
		fontWeight: '700',
		lineHeight: 22,
	},
	subtitle: {
		color: '#78909c',
		fontSize: 12,
		lineHeight: 17,
		marginTop: 2,
	},
	body: {
		maxHeight: 420,
	},
	bodyContent: {
		paddingHorizontal: 20,
		paddingBottom: 12,
	},
	grid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		marginHorizontal: -6,
	},
	inputGroup: {
		width: '50%',
		paddingHorizontal: 6,
		marginBottom: 14,
	},
	inputLabel: {
		fontSize: 12,
		color: LABEL_COLOR,
		fontWeight: '500',
		marginBottom: 6,
		lineHeight: 16,
	},
	inputShell: {
		borderWidth: 1,
		borderColor: BORDER,
		borderRadius: 20,
		paddingHorizontal: 14,
		height: 40,
		backgroundColor: '#ffffff',
		justifyContent: 'center',
	},
	textInput: {
		fontSize: 13,
		color: '#2f2f2f',
		padding: 0,
	},
	divider: {
		height: 1,
		backgroundColor: '#e8f0f1',
		marginVertical: 14,
	},
	sectionLabel: {
		color: TEAL,
		fontSize: 13,
		fontWeight: '600',
		marginBottom: 12,
	},
	singleInput: {
		width: '100%',
		paddingRight: 6,
	},
	footer: {
		flexDirection: 'row',
		borderTopWidth: 1,
		borderTopColor: '#eef2f3',
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
		fontWeight: '500',
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
		fontWeight: '600',
	},
})
