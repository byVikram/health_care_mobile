import React, { useEffect, useMemo, useState } from 'react'
import {
	ActivityIndicator,
	ScrollView,
	StyleSheet,
	TouchableOpacity,
	View,
	useWindowDimensions,
} from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import {
	AppButton,
	AppInput,
	AppSelect,
	AppSelectOption,
	AppStickyFooter,
	AppTypography,
	OtpVerifyModal,
	StatusModal,
} from '../../../../components/common'

type Option = AppSelectOption

type BankFormData = {
	accountHolderName: string
	bankName: string
	branchName: string
	accountType: string
	accountNumber: string
	confirmAccountNumber: string
	ifscCode: string
	upiId: string
	panNumber: string
}

type BankFormErrors = Partial<Record<keyof BankFormData, string>>

const ACCOUNT_TYPE_OPTIONS: Option[] = [
	{ label: 'Savings', value: 'Savings' },
	{ label: 'Current', value: 'Current' },
]

// India NEFT/RTGS-style IFSC: 4 letters + 0 + 6 alphanumeric
const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/
// Account number: digits only, 9-18 characters (typical Indian bank account length range)
const ACCOUNT_NUMBER_REGEX = /^[0-9]{9,18}$/
const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/
const UPI_REGEX = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/
const NAME_REGEX = /^[A-Za-z][A-Za-z\s.'-]{1,99}$/

// Demo-mode OTP accepted while there is no dedicated backend endpoint for
// re-authenticating a bank-details edit. Matches the backend's hardcoded
// demo OTP (see app/utils/otp.py: get_hardcoded_otp -> '123456'), the same
// one used for login/appointment OTP verification. Replace with a real
// send-otp / verify-otp API call once a dedicated backend piece exists.
const DEMO_EDIT_OTP_CODES = ['123456']
const OTP_LENGTH = 6

const STORAGE_KEYS: Record<keyof Omit<BankFormData, 'confirmAccountNumber'>, string> = {
	accountHolderName: 'ancillary_bank_account_holder_name',
	bankName: 'ancillary_bank_name',
	branchName: 'ancillary_bank_branch_name',
	accountType: 'ancillary_bank_account_type',
	accountNumber: 'ancillary_bank_account_number',
	ifscCode: 'ancillary_bank_ifsc_code',
	upiId: 'ancillary_bank_upi_id',
	panNumber: 'ancillary_bank_pan_number',
}

const EMPTY_FORM: BankFormData = {
	accountHolderName: '',
	bankName: '',
	branchName: '',
	accountType: '',
	accountNumber: '',
	confirmAccountNumber: '',
	ifscCode: '',
	upiId: '',
	panNumber: '',
}

function validateField(field: keyof BankFormData, value: string, formData: BankFormData): string | undefined {
	const trimmed = value.trim()

	switch (field) {
		case 'accountHolderName':
			if (!trimmed) return 'Account holder name is required.'
			if (!NAME_REGEX.test(trimmed)) return 'Enter a valid name.'
			return undefined
		case 'bankName':
			if (!trimmed) return 'Bank name is required.'
			return undefined
		case 'branchName':
			return undefined
		case 'accountType':
			if (!trimmed) return 'Account type is required.'
			return undefined
		case 'accountNumber':
			if (!trimmed) return 'Account number is required.'
			if (!ACCOUNT_NUMBER_REGEX.test(trimmed)) return 'Enter a valid account number (9-18 digits).'
			return undefined
		case 'confirmAccountNumber':
			if (!trimmed) return 'Please re-enter the account number.'
			if (trimmed !== formData.accountNumber.trim()) return 'Account numbers do not match.'
			return undefined
		case 'ifscCode':
			if (!trimmed) return 'IFSC code is required.'
			if (!IFSC_REGEX.test(trimmed.toUpperCase())) return 'Enter a valid IFSC code (e.g. SBIN0001234).'
			return undefined
		case 'upiId':
			if (!trimmed) return undefined
			if (!UPI_REGEX.test(trimmed)) return 'Enter a valid UPI ID (e.g. name@bank).'
			return undefined
		case 'panNumber':
			if (!trimmed) return undefined
			if (!PAN_REGEX.test(trimmed.toUpperCase())) return 'Enter a valid PAN (e.g. ABCDE1234F).'
			return undefined
		default:
			return undefined
	}
}

const REQUIRED_FIELDS: (keyof BankFormData)[] = [
	'accountHolderName',
	'bankName',
	'accountType',
	'accountNumber',
	'confirmAccountNumber',
	'ifscCode',
]

function isFormComplete(formData: BankFormData): boolean {
	return (Object.keys(formData) as (keyof BankFormData)[]).every((field) => {
		const isRequired = REQUIRED_FIELDS.includes(field)
		const value = formData[field]
		if (!isRequired && !value.trim()) return true
		return validateField(field, value, formData) === undefined
	})
}

function maskAccountNumber(value: string): string {
	const trimmed = value.trim()
	if (!trimmed) return '—'
	if (trimmed.length <= 4) return '•'.repeat(trimmed.length)
	return `${'•'.repeat(trimmed.length - 4)}${trimmed.slice(-4)}`
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
			{required ? (
				<AppTypography variant="caption" style={styles.requiredMark}>
					{' '}*
				</AppTypography>
			) : null}
		</AppTypography>
	)
}

function SectionTitle({ children }: { children: React.ReactNode }) {
	return (
		<AppTypography variant="h4" style={styles.sectionTitle}>
			{children}
		</AppTypography>
	)
}

function InputField({
	label,
	value,
	onChangeText,
	onBlur,
	placeholder,
	keyboardType = 'default',
	autoCapitalize = 'sentences',
	maxLength,
	required = false,
	errorText,
	secureToggle = false,
	secureVisible = false,
	onToggleSecure,
}: {
	label: string
	value: string
	onChangeText: (value: string) => void
	onBlur?: () => void
	placeholder: string
	keyboardType?: React.ComponentProps<typeof AppInput>['keyboardType']
	autoCapitalize?: React.ComponentProps<typeof AppInput>['autoCapitalize']
	maxLength?: number
	required?: boolean
	errorText?: string
	secureToggle?: boolean
	secureVisible?: boolean
	onToggleSecure?: () => void
}) {
	return (
		<View style={styles.fieldGroup}>
			<FieldLabel label={label} required={required} />
			<AppInput
				value={value}
				onChangeText={onChangeText}
				onBlur={onBlur}
				placeholder={placeholder}
				placeholderTextColor="#9a9a9a"
				keyboardType={keyboardType}
				autoCapitalize={autoCapitalize}
				maxLength={maxLength}
				errorText={errorText}
				secureTextEntry={secureToggle && !secureVisible}
				right={
					secureToggle ? (
						<AppInput.Icon
							icon={secureVisible ? 'eye-off-outline' : 'eye-outline'}
							color="#62707a"
							onPress={onToggleSecure}
							forceTextInputFocus={false}
						/>
					) : undefined
				}
				fieldSize="form"
				noMargin
				dense
			/>
		</View>
	)
}

function SelectDropdown({
	label,
	value,
	placeholder,
	options,
	onSelect,
	required = false,
	errorText,
}: {
	label: string
	value?: string
	placeholder: string
	options: Option[]
	onSelect: (value: string) => void
	required?: boolean
	errorText?: string
}) {
	return (
		<View style={styles.fieldGroup}>
			<FieldLabel label={label} required={required} />
			<AppSelect
				value={value}
				placeholder={placeholder}
				options={options}
				onSelect={onSelect}
				borderRadius={10}
				size="form"
				errorText={errorText}
				noMargin
			/>
		</View>
	)
}

function ViewField({
	label,
	value,
	rightAccessory,
}: {
	label: string
	value: string
	rightAccessory?: React.ReactNode
}) {
	return (
		<View style={styles.viewFieldGroup}>
			<AppTypography variant="caption" style={styles.viewFieldLabel}>
				{label}
			</AppTypography>
			<View style={styles.viewFieldValueRow}>
				<AppTypography variant="body" style={styles.viewFieldValue} numberOfLines={1}>
					{value || '—'}
				</AppTypography>
				{rightAccessory}
			</View>
		</View>
	)
}

export default function BankDetailsTab() {
	const { width } = useWindowDimensions()

	const isTablet = width >= 768 && width < 1024
	const isMobile = width < 768
	const useTwoColumns = width >= 768

	const [formData, setFormData] = useState<BankFormData>(EMPTY_FORM)
	const [savedSnapshot, setSavedSnapshot] = useState<BankFormData | null>(null)
	const [mode, setMode] = useState<'view' | 'edit'>('edit')
	const [errors, setErrors] = useState<BankFormErrors>({})
	const [touched, setTouched] = useState<Partial<Record<keyof BankFormData, boolean>>>({})
	const [showAccountNumber, setShowAccountNumber] = useState(false)
	const [loading, setLoading] = useState(false)
	const [isSaving, setIsSaving] = useState(false)
	const [statusModal, setStatusModal] = useState<{
		visible: boolean
		status: 'success' | 'error'
		title: string
		description: string
		submitText?: string
	} | null>(null)

	// --- Edit re-authentication (OTP gate) ---
	const [otpModalVisible, setOtpModalVisible] = useState(false)

	useEffect(() => {
		const loadDetails = async () => {
			try {
				setLoading(true)
				const entries = await AsyncStorage.multiGet(Object.values(STORAGE_KEYS))
				const stored: Record<string, string> = {}
				entries.forEach(([key, value]) => {
					const field = (Object.keys(STORAGE_KEYS) as (keyof typeof STORAGE_KEYS)[]).find(
						(f) => STORAGE_KEYS[f] === key
					)
					if (field) stored[field] = value || ''
				})

				const loadedForm: BankFormData = {
					...EMPTY_FORM,
					...stored,
					// Pre-fill the confirmation field so an already-saved account number
					// doesn't force the nurse to re-type it unless they change it.
					confirmAccountNumber: stored.accountNumber || '',
				}

				const alreadySaved = !!stored.accountHolderName && !!stored.accountNumber

				setFormData(loadedForm)
				if (alreadySaved) {
					setSavedSnapshot(loadedForm)
					setMode('view')
				} else {
					setMode('edit')
				}
			} catch (e) {
				console.log('[BankDetailsTab] load error:', e)
			} finally {
				setLoading(false)
			}
		}

		loadDetails()
	}, [])

	const updateFormData = (field: keyof BankFormData, value: string) => {
		setFormData((prev) => {
			const next = { ...prev, [field]: value }
			return next
		})

		setErrors((prev) => {
			if (!prev[field] && field !== 'accountNumber') return prev
			const next = { ...prev }
			delete next[field]
			// If account number changes after confirm was already validated, re-check the match live.
			if (field === 'accountNumber' && touched.confirmAccountNumber) {
				delete next.confirmAccountNumber
			}
			return next
		})
	}

	const handleBlur = (field: keyof BankFormData) => {
		setTouched((prev) => ({ ...prev, [field]: true }))
		setErrors((prev) => ({
			...prev,
			[field]: validateField(field, formData[field], formData),
		}))
	}

	const isValid = useMemo(() => isFormComplete(formData), [formData])

	const handleSave = async () => {
		const nextErrors: BankFormErrors = {}
		;(Object.keys(formData) as (keyof BankFormData)[]).forEach((field) => {
			const error = validateField(field, formData[field], formData)
			if (error) nextErrors[field] = error
		})

		setErrors(nextErrors)
		setTouched({
			accountHolderName: true,
			bankName: true,
			branchName: true,
			accountType: true,
			accountNumber: true,
			confirmAccountNumber: true,
			ifscCode: true,
			upiId: true,
			panNumber: true,
		})

		if (Object.keys(nextErrors).length > 0) return

		try {
			setIsSaving(true)
			await AsyncStorage.multiSet([
				[STORAGE_KEYS.accountHolderName, formData.accountHolderName.trim()],
				[STORAGE_KEYS.bankName, formData.bankName.trim()],
				[STORAGE_KEYS.branchName, formData.branchName.trim()],
				[STORAGE_KEYS.accountType, formData.accountType],
				[STORAGE_KEYS.accountNumber, formData.accountNumber.trim()],
				[STORAGE_KEYS.ifscCode, formData.ifscCode.trim().toUpperCase()],
				[STORAGE_KEYS.upiId, formData.upiId.trim()],
				[STORAGE_KEYS.panNumber, formData.panNumber.trim().toUpperCase()],
			])

			const savedForm: BankFormData = {
				...formData,
				ifscCode: formData.ifscCode.trim().toUpperCase(),
				panNumber: formData.panNumber.trim().toUpperCase(),
				confirmAccountNumber: formData.accountNumber.trim(),
			}
			setFormData(savedForm)
			setSavedSnapshot(savedForm)
			setShowAccountNumber(false)
			setMode('view')

			setStatusModal({
				visible: true,
				status: 'success',
				title: 'Success',
				description: 'Bank details saved successfully.',
				submitText: 'Okay',
			})
		} catch (error) {
			console.log('[BankDetailsTab] save error:', error)
			setStatusModal({
				visible: true,
				status: 'error',
				title: 'Error',
				description: 'Unable to save bank details right now.',
				submitText: 'Okay',
			})
		} finally {
			setIsSaving(false)
		}
	}

	const handleRequestEdit = () => {
		setOtpModalVisible(true)
	}

	const handleVerifyEditOtp = async (code: string): Promise<{ success: boolean; message?: string }> => {
		if (!DEMO_EDIT_OTP_CODES.includes(code)) {
			return { success: false, message: 'Invalid OTP. Please try again.' }
		}
		return { success: true }
	}

	const handleEditOtpVerified = () => {
		setErrors({})
		setTouched({})
		setMode('edit')
	}

	const handleCancelEdit = () => {
		if (savedSnapshot) {
			setFormData(savedSnapshot)
		}
		setErrors({})
		setTouched({})
		setShowAccountNumber(false)
		setMode('view')
	}

	const contentWidth = useMemo(() => {
		if (width >= 1280) return 760
		if (width >= 1024) return 680
		if (isTablet) return 600
		return 640
	}, [isTablet, width])

	const sectionPadding = isMobile ? 16 : isTablet ? 20 : 24
	const rowSpacing = isMobile ? 18 : 20

	if (loading) {
		return (
			<View style={styles.loadingContainer}>
				<ActivityIndicator size="small" color="#0c7c7c" />
			</View>
		)
	}

	if (mode === 'view') {
		return (
			<View style={{ flex: 1 }}>
				<ScrollView
					style={styles.container}
					contentContainerStyle={[
						styles.contentContainer,
						{
							paddingHorizontal: sectionPadding,
							paddingTop: sectionPadding,
							paddingBottom: 100,
						},
					]}
					showsVerticalScrollIndicator={false}
				>
					<View style={[styles.contentShell, { maxWidth: contentWidth }]}>
						<View style={styles.viewHeaderRow}>
							<View style={{ flex: 1 }}>
								<SectionTitle>Bank Details</SectionTitle>
								<AppTypography variant="caption" style={styles.sectionSubtitle}>
									Securely add and manage your payout bank account
								</AppTypography>
							</View>
							<TouchableOpacity style={styles.editButton} onPress={handleRequestEdit} activeOpacity={0.8}>
								<MaterialCommunityIcons name="pencil-outline" size={16} color="#0c7c7c" />
								<AppTypography variant="caption" style={styles.editButtonText}>
									Edit
								</AppTypography>
							</TouchableOpacity>
						</View>

						<View style={styles.viewCard}>
							<FormRow stacked={!useTwoColumns} compact={isTablet}>
								<ViewField label="Account Holder Name" value={formData.accountHolderName} />
								<ViewField label="Bank Name" value={formData.bankName} />
							</FormRow>
							<FormRow stacked={!useTwoColumns} compact={isTablet}>
								<ViewField label="Branch Name" value={formData.branchName} />
								<ViewField label="Account Type" value={formData.accountType} />
							</FormRow>
							<FormRow stacked={!useTwoColumns} compact={isTablet}>
								<ViewField
									label="Account Number"
									value={showAccountNumber ? formData.accountNumber : maskAccountNumber(formData.accountNumber)}
									rightAccessory={
										<TouchableOpacity onPress={() => setShowAccountNumber((prev) => !prev)} hitSlop={8}>
											<MaterialCommunityIcons
												name={showAccountNumber ? 'eye-off-outline' : 'eye-outline'}
												size={18}
												color="#62707a"
											/>
										</TouchableOpacity>
									}
								/>
								<ViewField label="UPI ID" value={formData.upiId} />
							</FormRow>
							<FormRow stacked={!useTwoColumns} compact={isTablet}>
								<ViewField label="PAN Number" value={formData.panNumber} />
							</FormRow>
						</View>
					</View>
				</ScrollView>

				<OtpVerifyModal
					visible={otpModalVisible}
					onDismiss={() => setOtpModalVisible(false)}
					title="Verify to Edit"
					description="For your security, enter the OTP sent to your registered mobile number to edit your bank details."
					length={OTP_LENGTH}
					onVerify={handleVerifyEditOtp}
					onSuccess={handleEditOtpVerified}
				/>

				{statusModal && (
					<StatusModal
						visible={statusModal.visible}
						status={statusModal.status}
						title={statusModal.title}
						description={statusModal.description}
						submitText={statusModal.submitText}
						onSubmit={() => setStatusModal(null)}
						onCancel={() => setStatusModal(null)}
					/>
				)}
			</View>
		)
	}

	return (
		<View style={{ flex: 1 }}>
			<ScrollView
				style={styles.container}
				contentContainerStyle={[
					styles.contentContainer,
					{
						paddingHorizontal: sectionPadding,
						paddingTop: sectionPadding,
						paddingBottom: 100,
					},
				]}
				keyboardShouldPersistTaps="handled"
				showsVerticalScrollIndicator={false}
			>
				<View style={[styles.contentShell, { maxWidth: contentWidth }]}>
					<View style={{ marginBottom: rowSpacing }}>
						<View style={styles.viewHeaderRow}>
							<View style={{ flex: 1 }}>
								<SectionTitle>Bank Details</SectionTitle>
								<AppTypography variant="caption" style={styles.sectionSubtitle}>
									Securely add and manage your payout bank account
								</AppTypography>
							</View>
							{savedSnapshot ? (
								<TouchableOpacity onPress={handleCancelEdit} hitSlop={8}>
									<AppTypography variant="caption" style={styles.cancelEditText}>
										Cancel
									</AppTypography>
								</TouchableOpacity>
							) : null}
						</View>

						<View style={{ gap: 18, marginTop: 8 }}>
							<FormRow stacked={!useTwoColumns} compact={isTablet}>
								<InputField
									label="Account Holder Name"
									value={formData.accountHolderName}
									onChangeText={(val) => updateFormData('accountHolderName', val)}
									onBlur={() => handleBlur('accountHolderName')}
									placeholder="Enter account holder name"
									required
									errorText={touched.accountHolderName ? errors.accountHolderName : undefined}
								/>
								<InputField
									label="Bank Name"
									value={formData.bankName}
									onChangeText={(val) => updateFormData('bankName', val)}
									onBlur={() => handleBlur('bankName')}
									placeholder="Enter bank name"
									required
									errorText={touched.bankName ? errors.bankName : undefined}
								/>
							</FormRow>

							<FormRow stacked={!useTwoColumns} compact={isTablet}>
								<InputField
									label="Branch Name"
									value={formData.branchName}
									onChangeText={(val) => updateFormData('branchName', val)}
									onBlur={() => handleBlur('branchName')}
									placeholder="Enter branch name (optional)"
								/>
								<SelectDropdown
									label="Account Type"
									value={formData.accountType}
									placeholder="Select account type"
									options={ACCOUNT_TYPE_OPTIONS}
									onSelect={(val) => {
										updateFormData('accountType', val)
										setTouched((prev) => ({ ...prev, accountType: true }))
										setErrors((prev) => ({ ...prev, accountType: undefined }))
									}}
									required
									errorText={touched.accountType ? errors.accountType : undefined}
								/>
							</FormRow>

							<FormRow stacked={!useTwoColumns} compact={isTablet}>
								<InputField
									label="Account Number"
									value={formData.accountNumber}
									onChangeText={(val) => updateFormData('accountNumber', val.replace(/[^0-9]/g, ''))}
									onBlur={() => handleBlur('accountNumber')}
									placeholder="Enter account number"
									keyboardType="number-pad"
									maxLength={18}
									required
									errorText={touched.accountNumber ? errors.accountNumber : undefined}
									secureToggle
									secureVisible={showAccountNumber}
									onToggleSecure={() => setShowAccountNumber((prev) => !prev)}
								/>
								<InputField
									label="Re-enter Account Number"
									value={formData.confirmAccountNumber}
									onChangeText={(val) => updateFormData('confirmAccountNumber', val.replace(/[^0-9]/g, ''))}
									onBlur={() => handleBlur('confirmAccountNumber')}
									placeholder="Re-enter account number"
									keyboardType="number-pad"
									maxLength={18}
									required
									errorText={touched.confirmAccountNumber ? errors.confirmAccountNumber : undefined}
								/>
							</FormRow>

							<FormRow stacked={!useTwoColumns} compact={isTablet}>
								<InputField
									label="IFSC Code"
									value={formData.ifscCode}
									onChangeText={(val) => updateFormData('ifscCode', val.toUpperCase())}
									onBlur={() => handleBlur('ifscCode')}
									placeholder="e.g. SBIN0001234"
									autoCapitalize="characters"
									maxLength={11}
									required
									errorText={touched.ifscCode ? errors.ifscCode : undefined}
								/>
								<InputField
									label="UPI ID"
									value={formData.upiId}
									onChangeText={(val) => updateFormData('upiId', val)}
									onBlur={() => handleBlur('upiId')}
									placeholder="yourname@bank (optional)"
									autoCapitalize="none"
									errorText={touched.upiId ? errors.upiId : undefined}
								/>
							</FormRow>

							<FormRow stacked={!useTwoColumns} compact={isTablet}>
								<InputField
									label="PAN Number"
									value={formData.panNumber}
									onChangeText={(val) => updateFormData('panNumber', val.toUpperCase())}
									onBlur={() => handleBlur('panNumber')}
									placeholder="e.g. ABCDE1234F (optional)"
									autoCapitalize="characters"
									maxLength={10}
									errorText={touched.panNumber ? errors.panNumber : undefined}
								/>
							</FormRow>
						</View>
					</View>
				</View>
			</ScrollView>

			<AppStickyFooter onPress={handleSave} disabled={isSaving || !isValid} buttonStyle={styles.saveButton}>
				Save
			</AppStickyFooter>

			{statusModal && (
				<StatusModal
					visible={statusModal.visible}
					status={statusModal.status}
					title={statusModal.title}
					description={statusModal.description}
					submitText={statusModal.submitText}
					onSubmit={() => setStatusModal(null)}
					onCancel={() => setStatusModal(null)}
				/>
			)}
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#ffffff',
	},
	loadingContainer: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#ffffff',
	},
	contentContainer: {
		flexGrow: 1,
		alignItems: 'center',
	},
	contentShell: {
		width: '100%',
	},
	sectionTitle: {
		color: '#343434',
		fontSize: 18,
		lineHeight: 24,
		fontWeight: '700',
		marginBottom: 4,
	},
	sectionSubtitle: {
		color: '#62707a',
		fontSize: 13,
		lineHeight: 18,
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
	saveButton: {
		alignSelf: 'stretch',
		marginTop: 0,
		width: '100%',
	},
	viewHeaderRow: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		justifyContent: 'space-between',
		marginBottom: 16,
	},
	editButton: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		paddingVertical: 6,
		paddingHorizontal: 12,
		borderRadius: 8,
		borderWidth: 1,
		borderColor: '#cce6e6',
		backgroundColor: '#f6fafb',
	},
	editButtonText: {
		color: '#0c7c7c',
		fontWeight: '700',
		fontSize: 13,
	},
	cancelEditText: {
		color: '#62707a',
		fontWeight: '600',
		fontSize: 13,
		textDecorationLine: 'underline',
		marginTop: 4,
	},
	viewCard: {
		gap: 18,
	},
	viewFieldGroup: {
		width: '100%',
	},
	viewFieldLabel: {
		fontSize: 13,
		lineHeight: 18,
		color: '#8f8f8f',
		fontWeight: '500',
		marginBottom: 6,
	},
	viewFieldValueRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		gap: 8,
		paddingVertical: 12,
		paddingHorizontal: 14,
		backgroundColor: '#f6fafb',
		borderRadius: 10,
		borderWidth: 1,
		borderColor: '#e9eef0',
	},
	viewFieldValue: {
		flex: 1,
		fontSize: 14,
		color: '#1a2226',
		fontWeight: '600',
	},
	otpDescription: {
		fontSize: 13,
		color: '#62707a',
		lineHeight: 19,
		marginBottom: 16,
	},
	otpHint: {
		fontSize: 12,
		color: '#9a6b00',
		marginTop: 8,
	},
	otpVerifyButton: {
		alignSelf: 'stretch',
		width: '100%',
		marginTop: 20,
	},
})
