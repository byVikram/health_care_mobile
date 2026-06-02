import React, { useEffect, useMemo, useState } from 'react'
import {
	Alert,
	ScrollView,
	StyleSheet,
	View,
	useWindowDimensions,
} from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import {
	AppButton,
	AppInput,
	AppModal,
	AppMultiSelect,
	AppTimePicker,
	AppToggle,
	AppTypography,
	type AppSelectOption,
} from '../../../../components/common'
import { mergePharmacyProfileData, updatePharmacyProfile } from '../pharmacyService'
import { PharmacyProfileData } from '../../../../types/pharmacy-profile-api'

const DAY_OPTIONS: AppSelectOption[] = [
	{ label: 'Monday', value: 'Mon' },
	{ label: 'Tuesday', value: 'Tue' },
	{ label: 'Wednesday', value: 'Wed' },
	{ label: 'Thursday', value: 'Thu' },
	{ label: 'Friday', value: 'Fri' },
	{ label: 'Saturday', value: 'Sat' },
	{ label: 'Sunday', value: 'Sun' },
]

const PAYMENT_OPTIONS: AppSelectOption[] = [
	{ label: 'UPI', value: 'UPI' },
	{ label: 'Cash', value: 'Cash' },
	{ label: 'Card', value: 'Card' },
]
const SUCCESS_MESSAGE = 'Services saved successfully'

type ServicesFormData = {
	openDays: string[]
	openingTime: string
	closingTime: string
	is24x7: boolean
	emergencyMedicineAvailable: boolean
	homeDeliveryAvailable: boolean
	deliveryRadiusKm: string
	estimatedDeliveryTimeMins: string
	minOrderAmount: string
	paymentMethods: string[]
}

type ServicesTabProps = {
	profileData?: PharmacyProfileData | null
	onProfileChange?: React.Dispatch<React.SetStateAction<PharmacyProfileData | null>>
}

function FieldLabel({ label, required = false }: { label: string; required?: boolean }) {
	return (
		<AppTypography variant="caption" style={styles.fieldLabel}>
			{label}
			{required ? <AppTypography variant="caption" style={styles.requiredMark}>*</AppTypography> : null}
		</AppTypography>
	)
}

function SectionCard({
	title,
	icon,
	children,
}: {
	title: string
	icon: React.ComponentProps<typeof MaterialCommunityIcons>['name']
	children: React.ReactNode
}) {
	return (
		<View style={styles.sectionCard}>
			<View style={styles.sectionHeader}>
				<MaterialCommunityIcons name={icon} size={16} color="#0c7c7c" />
				<AppTypography variant="caption" style={styles.sectionTitle}>
					{title}
				</AppTypography>
			</View>
			<View style={styles.sectionBody}>{children}</View>
		</View>
	)
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

function InputField({
	label,
	value,
	onChangeText,
	placeholder,
	keyboardType = 'default',
	required = false,
}: {
	label: string
	value: string
	onChangeText: (value: string) => void
	placeholder: string
	keyboardType?: React.ComponentProps<typeof AppInput>['keyboardType']
	required?: boolean
}) {
	return (
		<View style={styles.fieldGroup}>
			<FieldLabel label={label} required={required} />
			<AppInput
				value={value}
				onChangeText={onChangeText}
				placeholder={placeholder}
				placeholderTextColor="#9a9a9a"
				keyboardType={keyboardType}
				fieldSize="form"
				noMargin
				dense
			/>
		</View>
	)
}

function ToggleRow({
	title,
	description,
	value,
	onValueChange,
}: {
	title: string
	description?: string
	value: boolean
	onValueChange: (value: boolean) => void
}) {
	return (
		<View style={styles.toggleRow}>
			<View style={styles.toggleCopy}>
				<AppTypography variant="body" style={styles.toggleTitle}>
					{title}
				</AppTypography>
				{description ? (
					<AppTypography variant="caption" style={styles.toggleDescription}>
						{description}
					</AppTypography>
				) : null}
			</View>
			<AppToggle
				value={value}
				onValueChange={onValueChange}
				showStatusText={false}
				accessibilityLabel={title}
				style={styles.toggleControl}
			/>
		</View>
	)
}

export default function ServicesTab({ profileData, onProfileChange }: ServicesTabProps) {
	const { width } = useWindowDimensions()
	const isTablet = width >= 768 && width < 1024
	const isMobile = width < 768
	const useTwoColumns = width >= 768

	const [formData, setFormData] = useState<ServicesFormData>({
		openDays: [],
		openingTime: '09:00',
		closingTime: '22:00',
		is24x7: false,
		emergencyMedicineAvailable: false,
		homeDeliveryAvailable: false,
		deliveryRadiusKm: '',
		estimatedDeliveryTimeMins: '',
		minOrderAmount: '',
		paymentMethods: [],
	})
	const [isSaving, setIsSaving] = useState(false)
	const [successModalVisible, setSuccessModalVisible] = useState(false)

	const updateFormData = <K extends keyof ServicesFormData>(key: K, value: ServicesFormData[K]) => {
		setFormData((prev) => ({ ...prev, [key]: value }))
	}

	useEffect(() => {
		const services = profileData?.services
		if (!services) return

		setFormData({
			openDays: Array.isArray(services.open_days) ? services.open_days : [],
			openingTime: services.operating_hours?.open || '09:00',
			closingTime: services.operating_hours?.close || '22:00',
			is24x7: Boolean(services.is_24_x_7),
			emergencyMedicineAvailable: Boolean(services.emergency_medicine_available),
			homeDeliveryAvailable: Boolean(services.home_delivery_available),
			deliveryRadiusKm: services.delivery_radius_km !== undefined ? String(services.delivery_radius_km) : '',
			estimatedDeliveryTimeMins:
				services.estimated_delivery_time_mins !== undefined ? String(services.estimated_delivery_time_mins) : '',
			minOrderAmount: services.min_order_amount !== undefined ? String(services.min_order_amount) : '',
			paymentMethods: Array.isArray(services.payment_methods) ? services.payment_methods : [],
		})
	}, [profileData?.services])

	const handleSave = async () => {
		const deliveryRadius = formData.deliveryRadiusKm.trim()
		const deliveryTime = formData.estimatedDeliveryTimeMins.trim()
		const minOrder = formData.minOrderAmount.trim()

		if (!formData.openDays.length) {
			Alert.alert('Validation', 'Please select open days.')
			return
		}

		if (deliveryRadius && Number.isNaN(Number(deliveryRadius))) {
			Alert.alert('Validation', 'Please enter a valid delivery radius.')
			return
		}

		if (deliveryTime && Number.isNaN(Number(deliveryTime))) {
			Alert.alert('Validation', 'Please enter a valid estimated delivery time.')
			return
		}

		if (minOrder && Number.isNaN(Number(minOrder))) {
			Alert.alert('Validation', 'Please enter a valid minimum order amount.')
			return
		}

		const payload = {
			operating_hours: {
				open: formData.openingTime,
				close: formData.closingTime,
			},
			open_days: formData.openDays,
			payment_methods: formData.paymentMethods,
			home_delivery_available: formData.homeDeliveryAvailable,
			delivery_radius_km: deliveryRadius ? Number(deliveryRadius) : 0,
			estimated_delivery_time_mins: deliveryTime ? Number(deliveryTime) : 0,
			min_order_amount: minOrder ? Number(minOrder) : 0,
			is_24_x_7: formData.is24x7,
			emergency_medicine_available: formData.emergencyMedicineAvailable,
		}

		try {
			setIsSaving(true)
			const response = await updatePharmacyProfile(payload)

			if (response?.success === false) {
				Alert.alert('Error', response.message || 'Unable to save pharmacy services right now.')
				return
			}

			onProfileChange?.((current) => mergePharmacyProfileData(current, response.data ?? { services: payload }))
			setSuccessModalVisible(true)
		} catch (error) {
			console.error('[PharmacyServicesTab] save error:', error)
			Alert.alert('Error', 'Unable to save pharmacy services right now.')
		} finally {
			setIsSaving(false)
		}
	}

	const contentWidth = useMemo(() => {
		if (width >= 1280) return 980
		if (width >= 1024) return 920
		if (isTablet) return 820
		return 640
	}, [isTablet, width])

	const sectionPadding = isMobile ? 16 : isTablet ? 20 : 24
	const sectionGap = isMobile ? 14 : 18

	return (
		<ScrollView
			style={styles.container}
			contentContainerStyle={[
				styles.contentContainer,
				{
					paddingHorizontal: sectionPadding,
					paddingTop: sectionPadding,
					paddingBottom: sectionPadding,
				},
			]}
			keyboardShouldPersistTaps="handled"
			showsVerticalScrollIndicator={false}
		>
			<View style={[styles.contentShell, { maxWidth: contentWidth, gap: sectionGap }]}>
				<SectionCard title="Operating Hours" icon="clock-time-four-outline">
					<View style={styles.fieldGroup}>
						<FieldLabel label="Open Days" required />
						<AppMultiSelect
							values={formData.openDays}
							options={DAY_OPTIONS}
							onChange={(values) => updateFormData('openDays', values)}
							placeholder="Select open days"
							borderRadius={10}
							size="form"
							noMargin
						/>
					</View>

					<FormRow stacked={!useTwoColumns} compact={isTablet}>
						<AppTimePicker
							label="Opening Time"
							value={formData.openingTime}
							onChange={(value) => updateFormData('openingTime', value)}
							required
							noMargin
						/>
						<AppTimePicker
							label="Closing Time"
							value={formData.closingTime}
							onChange={(value) => updateFormData('closingTime', value)}
							required
							noMargin
						/>
					</FormRow>
				</SectionCard>

				<SectionCard title="Emergency Services" icon="medical-bag">
					<ToggleRow
						title="24/7 Emergency Service"
						description="Pharmacy services available round the clock"
						value={formData.is24x7}
						onValueChange={(value) => updateFormData('is24x7', value)}
					/>
					<View style={styles.rowDivider} />
					<ToggleRow
						title="Emergency Medicine Available"
						description="Maintain stock of life-saving medicines"
						value={formData.emergencyMedicineAvailable}
						onValueChange={(value) => updateFormData('emergencyMedicineAvailable', value)}
					/>
				</SectionCard>

				<SectionCard title="Delivery Logistics" icon="truck-delivery-outline">
					<ToggleRow
						title="Home Delivery Available"
						value={formData.homeDeliveryAvailable}
						onValueChange={(value) => updateFormData('homeDeliveryAvailable', value)}
					/>

					<FormRow stacked={!useTwoColumns} compact={isTablet}>
						<InputField
							label="Delivery Radius (km)"
							value={formData.deliveryRadiusKm}
							onChangeText={(value) => updateFormData('deliveryRadiusKm', value.replace(/[^\d.]/g, ''))}
							placeholder="Enter radius"
							keyboardType="numeric"
						/>
						<InputField
							label="Estimated Delivery Time (mins)"
							value={formData.estimatedDeliveryTimeMins}
							onChangeText={(value) => updateFormData('estimatedDeliveryTimeMins', value.replace(/\D/g, ''))}
							placeholder="Enter delivery time"
							keyboardType="numeric"
						/>
					</FormRow>

					<InputField
						label="Minimum Order Amount"
						value={formData.minOrderAmount}
						onChangeText={(value) => updateFormData('minOrderAmount', value.replace(/[^\d.]/g, ''))}
						placeholder="Enter minimum order amount"
						keyboardType="numeric"
					/>
				</SectionCard>

				<SectionCard title="Accepted Payments" icon="credit-card-outline">
					<View style={styles.fieldGroup}>
						<FieldLabel label="Payment Methods" />
						<AppMultiSelect
							values={formData.paymentMethods}
							options={PAYMENT_OPTIONS}
							onChange={(values) => updateFormData('paymentMethods', values)}
							placeholder="Select payment methods"
							borderRadius={10}
							size="form"
							noMargin
						/>
					</View>
				</SectionCard>

				<AppButton
					variant="primary"
					formAction
					style={styles.saveButton}
					onPress={handleSave}
					loading={isSaving}
					disabled={isSaving}
				>
					Save
				</AppButton>
			</View>
			<AppModal
				visible={successModalVisible}
				onDismiss={() => setSuccessModalVisible(false)}
				contentContainerStyle={styles.successModalContainer}
			>
				<View style={styles.successIconCircle}>
					<MaterialCommunityIcons name="check" size={46} color="#2E7D32" />
				</View>
				<AppTypography variant="h3" style={styles.successModalTitle}>
					Success
				</AppTypography>
				<AppTypography variant="body" style={styles.successModalMessage}>
					{SUCCESS_MESSAGE}
				</AppTypography>
				<AppButton
					variant="primary"
					formAction
					style={styles.successModalButton}
					contentStyle={styles.successModalButtonContent}
					labelStyle={styles.successModalButtonLabel}
					onPress={() => setSuccessModalVisible(false)}
				>
					Okay
				</AppButton>
			</AppModal>
		</ScrollView>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#f8fafc',
	},
	contentContainer: {
		flexGrow: 1,
		alignItems: 'center',
		backgroundColor: '#f8fafc',
	},
	contentShell: {
		width: '100%',
	},
	sectionCard: {
		width: '100%',
		borderWidth: 1,
		borderColor: '#e4ecef',
		borderRadius: 10,
		backgroundColor: '#ffffff',
		padding: 16,
	},
	sectionHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		marginBottom: 16,
	},
	sectionTitle: {
		color: '#253136',
		fontSize: 13,
		lineHeight: 18,
		fontWeight: '700',
		textTransform: 'uppercase',
	},
	sectionBody: {
		gap: 14,
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
		marginTop: 14,
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
	toggleRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		gap: 12,
	},
	toggleCopy: {
		flex: 1,
		minWidth: 0,
	},
	toggleTitle: {
		color: '#1f2b33',
		fontSize: 14,
		lineHeight: 20,
		fontWeight: '700',
	},
	toggleDescription: {
		color: '#64747c',
		fontSize: 12,
		lineHeight: 17,
		marginTop: 2,
	},
	toggleControl: {
		flexShrink: 0,
	},
	rowDivider: {
		height: 1,
		backgroundColor: '#edf2f4',
		width: '100%',
	},
	saveButton: {
		alignSelf: 'stretch',
		marginTop: 0,
		width: '100%',
		minWidth: 160,
	},
	successModalContainer: {
		alignSelf: 'center',
		width: '78%',
		maxWidth: 330,
		borderRadius: 16,
		paddingHorizontal: 20,
		paddingTop: 18,
		paddingBottom: 18,
	},
	successIconCircle: {
		width: 52,
		height: 52,
		borderRadius: 26,
		backgroundColor: '#E6F4EA',
		alignItems: 'center',
		justifyContent: 'center',
		alignSelf: 'center',
		marginBottom: 12,
	},
	successModalTitle: {
		color: '#000000',
		fontSize: 21,
		lineHeight: 26,
		fontWeight: '700',
		textAlign: 'center',
		marginBottom: 6,
	},
	successModalMessage: {
		color: '#6b6b6b',
		fontSize: 14,
		lineHeight: 20,
		textAlign: 'center',
		marginBottom: 16,
	},
	successModalButton: {
		alignSelf: 'stretch',
		marginTop: 0,
		minWidth: 120,
		borderRadius: 12,
		paddingVertical: 0,
	},
	successModalButtonContent: {
		minHeight: 44,
		paddingVertical: 0,
	},
	successModalButtonLabel: {
		fontSize: 16,
		lineHeight: 20,
		fontWeight: '700',
	},
})
