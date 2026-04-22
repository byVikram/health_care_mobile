import React, { useMemo, useState } from 'react'
import {
	FlatList,
	Modal,
	Platform,
	Pressable,
	ScrollView,
	StyleSheet,
	TextInput,
	TouchableOpacity,
	View,
	useWindowDimensions,
} from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import * as ImagePicker from 'expo-image-picker'
import { AppTypography } from '../../../../components/common'

const SPECIALIZATION_OPTIONS = [
	'Cardiology',
	'Dermatology',
	'Endocrinology',
	'ENT',
	'General Medicine',
	'Neurology',
	'Oncology',
	'Orthopedics',
	'Pediatrics',
]

const DEGREE_OPTIONS = ['MBBS', 'MD', 'MS', 'DM', 'MCh', 'DNB']

const COLLEGE_OPTIONS = [
	'AIIMS New Delhi',
	'Christian Medical College Vellore',
	'Kasturba Medical College',
	'King George Medical University',
	'Madras Medical College',
	'St. John Medical College',
]

type InputFieldProps = {
	label: string
	value: string
	onChangeText: (value: string) => void
	placeholder: string
	keyboardType?: React.ComponentProps<typeof TextInput>['keyboardType']
	maxLength?: number
	required?: boolean
	rightIcon?: React.ComponentProps<typeof MaterialCommunityIcons>['name']
}

type SelectDropdownProps = {
	label: string
	value?: string
	placeholder: string
	options: string[]
	onSelect: (value: string) => void
	isMobile: boolean
	required?: boolean
	rightIcon?: React.ComponentProps<typeof MaterialCommunityIcons>['name']
}

type UploadBoxProps = {
	label: string
	helperText: string
	fileName?: string
	onUpload: () => void
	stacked: boolean
}

function FormRow({
	children,
	stacked,
	compact,
}: {
	children: React.ReactNode
	stacked: boolean
	compact: boolean
}) {
	return (
		<View style={[styles.formRow, stacked && styles.formRowStacked, compact && styles.formRowCompact]}>
			{React.Children.map(children, (child, index) => (
				<View
					style={[
						styles.formCell,
						stacked
							? [styles.formCellStacked, index === 0 && styles.formCellStackedFirst]
							: index === 0
								? styles.formCellLeft
								: styles.formCellRight,
					]}
				>
					{child}
				</View>
			))}
		</View>
	)
}

function FieldLabel({ label, required = false }: { label: string; required?: boolean }) {
	return (
		<AppTypography variant="caption" style={styles.fieldLabel}>
			{label}
			{required ? <AppTypography variant="caption" style={styles.requiredMark}>*</AppTypography> : null}
		</AppTypography>
	)
}

function InputField({
	label,
	value,
	onChangeText,
	placeholder,
	keyboardType = 'default',
	maxLength,
	required = false,
	rightIcon,
}: InputFieldProps) {
	return (
		<View style={styles.fieldGroup}>
			<FieldLabel label={label} required={required} />
			<View style={styles.inputShell}>
				<TextInput
					value={value}
					onChangeText={onChangeText}
					placeholder={placeholder}
					placeholderTextColor="#9a9a9a"
					style={styles.textInput}
					keyboardType={keyboardType}
					maxLength={maxLength}
				/>
				{rightIcon ? <MaterialCommunityIcons name={rightIcon} size={19} color="#2c7b80" /> : null}
			</View>
		</View>
	)
}

function SelectDropdown({
	label,
	value,
	placeholder,
	options,
	onSelect,
	isMobile,
	required = false,
	rightIcon = 'chevron-right',
}: SelectDropdownProps) {
	const [visible, setVisible] = useState(false)

	return (
		<View style={styles.fieldGroup}>
			<FieldLabel label={label} required={required} />
			<>
				<Pressable style={styles.inputShell} onPress={() => setVisible(true)}>
					<AppTypography variant="body" style={[styles.selectText, !value && styles.placeholderText]}>
						{value || placeholder}
					</AppTypography>
					<MaterialCommunityIcons name={rightIcon} size={20} color="#2c7b80" />
				</Pressable>
				<Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
					<Pressable style={styles.modalOverlay} onPress={() => setVisible(false)}>
						<Pressable style={[styles.modalCard, isMobile && styles.modalCardMobile]} onPress={(event) => event.stopPropagation()}>
							<View style={styles.modalHeader}>
								<AppTypography variant="h4" style={styles.modalTitle}>
									{label}
								</AppTypography>
								<TouchableOpacity onPress={() => setVisible(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
									<MaterialCommunityIcons name="close" size={22} color="#45636d" />
								</TouchableOpacity>
							</View>
							<FlatList
								data={options}
								keyExtractor={(item) => item}
								renderItem={({ item }) => {
									const isSelected = item === value
									return (
										<TouchableOpacity
											style={[styles.optionRow, isSelected && styles.optionRowSelected]}
											onPress={() => {
												onSelect(item)
												setVisible(false)
											}}
										>
											<AppTypography variant="body" style={[styles.optionText, isSelected && styles.optionTextSelected]}>
												{item}
											</AppTypography>
											{isSelected ? <MaterialCommunityIcons name="check-circle" size={20} color="#24a148" /> : null}
										</TouchableOpacity>
									)
								}}
							/>
						</Pressable>
					</Pressable>
				</Modal>
			</>
		</View>
	)
}

function UploadBox({ label, helperText, fileName, onUpload, stacked }: UploadBoxProps) {
	return (
		<View style={styles.fieldGroup}>
			<View style={[styles.uploadSection, stacked && styles.uploadSectionStacked]}>
				<View style={styles.uploadCopy}>
					<FieldLabel label={label} required />
					<AppTypography variant="caption" style={styles.uploadHelperText}>
						{helperText}
					</AppTypography>
					{fileName ? (
						<AppTypography variant="caption" style={styles.uploadFileName}>
							Selected: {fileName}
						</AppTypography>
					) : null}
				</View>
				<TouchableOpacity style={[styles.uploadTile, stacked && styles.uploadTileStacked]} onPress={onUpload} activeOpacity={0.85}>
					<MaterialCommunityIcons name="tray-arrow-up" size={34} color="#ffffff" />
					<AppTypography variant="caption" style={styles.uploadTileText}>
						Upload
					</AppTypography>
				</TouchableOpacity>
			</View>
		</View>
	)
}

export default function ProfessionalDetailsTab() {
	const { width } = useWindowDimensions()

	const isTablet = width >= 768 && width < 1024
	const isMobile = width < 768
	const useTwoColumns = width >= 768

	const [specialization, setSpecialization] = useState('Dentist')
	const [degree, setDegree] = useState('MBBS')
	const [college, setCollege] = useState('Karnataka medical science (KMS)')
	const [year, setYear] = useState('')
	const [uploadedProof, setUploadedProof] = useState('')

	const contentWidth = useMemo(() => {
		if (width >= 1280) return 980
		if (width >= 1024) return 920
		if (isTablet) return 820
		return 640
	}, [isTablet, width])

	const sectionPadding = isMobile ? 16 : isTablet ? 20 : 24
	const rowSpacing = isMobile ? 18 : isTablet ? 18 : 20
	const titleBottom = isMobile ? 18 : 22

	const handleUploadProof = async () => {
		const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()

		if (!permission.granted) {
			return
		}

		const result = await ImagePicker.launchImageLibraryAsync({
			mediaTypes: ImagePicker.MediaTypeOptions.Images,
			allowsMultipleSelection: false,
			quality: 0.8,
		})

		if (result.canceled || !result.assets.length) {
			return
		}

		const asset = result.assets[0]
		const fileLabel = asset.fileName || asset.uri.split('/').pop() || 'Degree proof selected'
		setUploadedProof(fileLabel)
	}

	return (
		<ScrollView
			style={styles.container}
			contentContainerStyle={[styles.contentContainer, { paddingHorizontal: sectionPadding, paddingVertical: sectionPadding }]}
			keyboardShouldPersistTaps="handled"
			showsVerticalScrollIndicator={false}
		>
			<View style={[styles.contentShell, { maxWidth: contentWidth }]}>
				<AppTypography variant="h3" style={[styles.title, { marginBottom: titleBottom }]}>
					Professional Details
				</AppTypography>

				<View style={{ marginBottom: rowSpacing }}>
					<SelectDropdown
						label="Select Specialization"
						value={specialization}
						placeholder="Choose specialization"
						options={SPECIALIZATION_OPTIONS}
						onSelect={setSpecialization}
						isMobile={isMobile}
						rightIcon="pencil-outline"
					/>
				</View>

				<View style={styles.sectionDivider} />

				<View style={{ marginTop: isMobile ? 20 : 24, marginBottom: rowSpacing }}>
					<AppTypography variant="h3" style={styles.sectionTitle}>
						Educational qualification and proof
					</AppTypography>
				</View>

				<View style={{ marginBottom: rowSpacing }}>
					<SelectDropdown
						label="Select Degree"
						value={degree}
						placeholder="Select degree"
						options={DEGREE_OPTIONS}
						onSelect={setDegree}
						isMobile={isMobile}
						required
					/>
				</View>

				<View style={{ marginBottom: rowSpacing }}>
					<FormRow stacked={!useTwoColumns} compact={isTablet}>
						<SelectDropdown
							label="Select College/University"
							value={college}
							placeholder="Select college or university"
							options={COLLEGE_OPTIONS}
							onSelect={setCollege}
							isMobile={isMobile}
							required
						/>
						<InputField
							label="Select Year"
							value={year}
							onChangeText={(value) => setYear(value.replace(/\D/g, '').slice(0, 4))}
							placeholder="Enter year of passing"
							keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'numeric'}
							maxLength={4}
							required
							rightIcon="pencil-outline"
						/>
					</FormRow>
				</View>

				<UploadBox
					label="Upload image or PDF of Qualification proofs"
					helperText="Non allied practitioners should submit council registration proof with mentioned degree name. Allied practitioners should submit mark sheets / passing certificates from UGC approved university."
					fileName={uploadedProof}
					onUpload={handleUploadProof}
					stacked={isMobile}
				/>

				<View style={[styles.sectionDivider, { marginTop: isMobile ? 20 : 24 }]} />
			</View>
		</ScrollView>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#ffffff',
	},
	contentContainer: {
		alignItems: 'center',
	},
	contentShell: {
		width: '100%',
	},
	title: {
		color: '#343434',
		fontSize: 22,
		fontWeight: '600',
	},
	sectionTitle: {
		color: '#343434',
		fontSize: 18,
		lineHeight: 24,
		fontWeight: '500',
	},
	sectionDivider: {
		height: 1,
		backgroundColor: '#e9eef0',
		width: '100%',
	},
	formRow: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		marginHorizontal: -10,
	},
	formRowCompact: {
		marginHorizontal: -8,
	},
	formRowStacked: {
		flexDirection: 'column',
		marginHorizontal: 0,
	},
	formCell: {
		flex: 1,
		minWidth: 0,
	},
	formCellLeft: {
		paddingHorizontal: 10,
	},
	formCellRight: {
		paddingHorizontal: 10,
	},
	formCellStacked: {
		width: '100%',
		marginTop: 16,
	},
	formCellStackedFirst: {
		marginTop: 0,
	},
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
		color: '#ef5d5d',
		fontSize: 14,
		lineHeight: 20,
		fontWeight: '600',
	},
	inputShell: {
		minHeight: 48,
		borderWidth: 1,
		borderColor: '#a7d3db',
		borderRadius: 10,
		paddingHorizontal: 14,
		backgroundColor: '#ffffff',
		flexDirection: 'row',
		alignItems: 'center',
	},
	textInput: {
		flex: 1,
		paddingVertical: Platform.OS === 'web' ? 13 : 11,
		paddingHorizontal: 0,
		fontSize: 14,
		lineHeight: 20,
		color: '#2f2f2f',
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
	uploadSection: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		justifyContent: 'space-between',
		columnGap: 16,
	},
	uploadSectionStacked: {
		flexDirection: 'column',
		rowGap: 14,
	},
	uploadCopy: {
		flex: 1,
		minWidth: 0,
	},
	uploadHelperText: {
		color: '#2f2f2f',
		fontSize: 12,
		lineHeight: 22,
	},
	uploadFileName: {
		marginTop: 6,
		color: '#1f8a8f',
		fontSize: 12,
		lineHeight: 18,
		fontWeight: '600',
	},
	uploadTile: {
		width: 82,
		minWidth: 82,
		height: 82,
		borderWidth: 1,
		borderColor: '#b7b7b7',
		borderRadius: 4,
		backgroundColor: '#d9d9d9',
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: 8,
	},
	uploadTileStacked: {
		width: '100%',
		height: 90,
	},
	uploadTileText: {
		marginTop: 4,
		color: '#ffffff',
		fontSize: 12,
		lineHeight: 16,
		fontWeight: '600',
	},
	modalOverlay: {
		flex: 1,
		backgroundColor: 'rgba(18, 28, 33, 0.28)',
		justifyContent: 'center',
		paddingHorizontal: 20,
	},
	modalCard: {
		width: '100%',
		maxWidth: 420,
		alignSelf: 'center',
		backgroundColor: '#ffffff',
		borderRadius: 16,
		paddingVertical: 8,
		maxHeight: '70%',
	},
	modalCardMobile: {
		maxWidth: '100%',
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
	optionRow: {
		minHeight: 48,
		paddingHorizontal: 18,
		paddingVertical: 12,
		borderTopWidth: 1,
		borderTopColor: '#eef4f5',
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	optionRowSelected: {
		backgroundColor: '#f5fbfb',
	},
	optionText: {
		color: '#2f2f2f',
	},
	optionTextSelected: {
		color: '#1d6d71',
		fontWeight: '600',
	},
})
