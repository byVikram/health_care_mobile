import React, { useState } from 'react'
import {
	Image,
	ScrollView,
	StyleSheet,
	TouchableOpacity,
	View,
	useWindowDimensions,
} from 'react-native'
import { useNavigation, useRoute } from '@react-navigation/native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { ROUTES } from '../../navigation/routes'
import { useAuth } from '../../context/AuthContext'
import AppScreenHeader from '../../components/common/AppScreenHeader'
import { AppTypography } from '../../components/common/AppTypography'
import { AppInput } from '../../components/common/AppInput'
import { AppSelect, AppSelectOption } from '../../components/common/AppSelect'
import { AppButton } from '../../components/common/AppButton'
import UploadSection from './components/UploadSection'

const GENDER_OPTIONS: AppSelectOption[] = [
	{ label: 'Male', value: 'male' },
	{ label: 'Female', value: 'female' },
	{ label: 'Other', value: 'other' },
]

const RELATIONSHIP_OPTIONS: AppSelectOption[] = [
	{ label: 'Self', value: 'self' },
	{ label: 'Parent', value: 'parent' },
	{ label: 'Spouse', value: 'spouse' },
	{ label: 'Child', value: 'child' },
	{ label: 'Other', value: 'other' },
]

const SAVED_ADDRESSES = [
	{
		id: 'addr1',
		label: 'Home',
		address: '42 Healthcare Avenue, Flat 3B, Sector 18',
		city: 'New Delhi',
		icon: 'home-outline',
	},
	{
		id: 'addr2',
		label: 'Work',
		address: 'Tech Park Tower B, 5th Floor, Cyber City',
		city: 'Gurugram',
		icon: 'briefcase-outline',
	},
]

const DATE_OPTIONS = [
	{ id: 'd1', label: 'Today', date: 'Oct 14' },
	{ id: 'd2', label: 'Tomorrow', date: 'Oct 15' },
	{ id: 'd3', label: 'Wed', date: 'Oct 16' },
	{ id: 'd4', label: 'Thu', date: 'Oct 17' },
	{ id: 'd5', label: 'Fri', date: 'Oct 18' },
]

const TIME_SLOTS = [
	'09:00 AM - 10:00 AM',
	'11:00 AM - 12:00 PM',
	'02:00 PM - 03:00 PM',
	'05:00 PM - 06:00 PM',
	'07:00 PM - 08:00 PM',
]

export default function BookingDetailsPage() {
	const navigation = useNavigation<any>()
	const route = useRoute<any>()
	const insets = useSafeAreaInsets()
	const { width } = useWindowDimensions()
	const { currentLocation } = useAuth()
	const isTablet = width >= 768

	const serviceParams = route.params || {}
	const servicesList = serviceParams.services || []
	const serviceName =
		serviceParams.serviceName ||
		(servicesList.length > 0 ? servicesList[0].title : 'Wound Dressing & Care')
	const description =
		serviceParams.description ||
		(servicesList.length > 0
			? servicesList.map((s: any) => s.title).join(', ')
			: 'Professional sterile dressing & home care.')
	const image =
		serviceParams.image ||
		(servicesList.length > 0 ? servicesList[0].image : 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=600&q=80')
	const serviceCount = servicesList.length > 0 ? servicesList.length : 1

	// Form State - Patient Details
	const [name, setName] = useState('')
	const [age, setAge] = useState('')
	const [gender, setGender] = useState('')
	const [relationship, setRelationship] = useState('')

	// Form State - Medical Details
	const [condition, setCondition] = useState('')
	const [notes, setNotes] = useState('')
	const [uploadedFiles, setUploadedFiles] = useState<string[]>([])

	// Form State - Location & Schedule
	const [selectedAddressId, setSelectedAddressId] = useState('addr1')
	const [selectedDateId, setSelectedDateId] = useState('d1')
	const [selectedTimeSlot, setSelectedTimeSlot] = useState(TIME_SLOTS[0])

	// Validation Error States
	const [errors, setErrors] = useState<Record<string, string>>({})

	const handleAddFile = (fileName: string) => {
		setUploadedFiles((prev) => [...prev, fileName])
	}

	const handleRemoveFile = (index: number) => {
		setUploadedFiles((prev) => prev.filter((_, i) => i !== index))
	}

	const validateForm = () => {
		const newErrors: Record<string, string> = {}

		if (!name.trim()) newErrors.name = 'Patient name is required'
		if (!age.trim()) {
			newErrors.age = 'Age is required'
		} else if (isNaN(Number(age)) || Number(age) <= 0 || Number(age) > 120) {
			newErrors.age = 'Enter a valid age'
		}
		if (!gender) newErrors.gender = 'Please select gender'
		if (!relationship) newErrors.relationship = 'Please select relationship'
		if (!selectedAddressId && !currentLocation?.address) {
			newErrors.address = 'Please select a visit location'
		}
		if (!selectedTimeSlot) newErrors.timeSlot = 'Please select an appointment time slot'

		setErrors(newErrors)
		return Object.keys(newErrors).length === 0
	}

	const handleContinue = () => {
		if (validateForm()) {
			const selectedAddrObj = SAVED_ADDRESSES.find((a) => a.id === selectedAddressId)
			const selectedDateObj = DATE_OPTIONS.find((d) => d.id === selectedDateId)

			const bookingPayload = {
				serviceName,
				serviceCount,
				services: servicesList,
				patient: { name, age, gender, relationship },
				medical: { condition, notes, uploadedFiles },
				location: currentLocation?.address || selectedAddrObj?.address || 'Selected Location',
				schedule: {
					dateLabel: selectedDateObj ? `${selectedDateObj.label}, ${selectedDateObj.date}` : 'Today',
					timeSlot: selectedTimeSlot,
				},
			}

			// Navigate to Pricing Review screen
			navigation.navigate(ROUTES.STACK.ANCILLARY_PRICING_REVIEW, {
				bookingPayload,
			})
		}
	}

	return (
		<View style={styles.container}>
			<AppScreenHeader title="Booking Details" />

			<ScrollView
				contentContainerStyle={[
					styles.scrollContent,
					isTablet && styles.scrollContentTablet,
					{ paddingBottom: insets.bottom + 24 },
				]}
				showsVerticalScrollIndicator={false}
			>
				{/* 1. Top Reference Summary (Selected Services - Read-only) */}
				<View style={styles.card}>
					<View style={styles.topSummaryBadgeRow}>
						<AppTypography variant="caption" style={styles.sectionBadge}>
							SELECTED HEALTHCARE SERVICE
						</AppTypography>
						<View style={styles.countChip}>
							<AppTypography variant="caption" style={styles.countChipText}>
								{serviceCount} Service{serviceCount > 1 ? 's' : ''} Selected
							</AppTypography>
						</View>
					</View>

					<View style={styles.serviceRow}>
						{image ? (
							<Image
								source={{ uri: image }}
								style={[styles.serviceImage, isTablet && styles.serviceImageTablet]}
								resizeMode="cover"
							/>
						) : null}
						<View style={styles.serviceTextCol}>
							<AppTypography variant="h3" style={styles.serviceTitle} numberOfLines={1}>
								{serviceName}
							</AppTypography>
							{description ? (
								<AppTypography variant="caption" style={styles.serviceDesc} numberOfLines={2}>
									{description}
								</AppTypography>
							) : null}
						</View>
					</View>
				</View>

				{/* 2. Patient Details Section */}
				<View style={styles.card}>
					<AppTypography variant="h3" style={styles.sectionTitle}>
						Patient Details
					</AppTypography>

					<View style={isTablet ? styles.rowTablet : undefined}>
						<View style={isTablet ? styles.colTablet : undefined}>
							<AppInput
								label="Patient Full Name *"
								placeholder="Enter full name"
								value={name}
								onChangeText={(val) => {
									setName(val)
									if (errors.name) setErrors((e) => ({ ...e, name: '' }))
								}}
								errorText={errors.name}
								fieldSize="form"
							/>
						</View>
						<View style={isTablet ? styles.colTablet : undefined}>
							<AppInput
								label="Age *"
								placeholder="e.g. 34"
								keyboardType="numeric"
								value={age}
								onChangeText={(val) => {
									setAge(val)
									if (errors.age) setErrors((e) => ({ ...e, age: '' }))
								}}
								errorText={errors.age}
								fieldSize="form"
							/>
						</View>
					</View>

					<View style={isTablet ? styles.rowTablet : undefined}>
						<View style={isTablet ? styles.colTablet : undefined}>
							<AppSelect
								label="Gender *"
								placeholder="Select gender"
								options={GENDER_OPTIONS}
								value={gender}
								onSelect={(val) => {
									setGender(val)
									if (errors.gender) setErrors((e) => ({ ...e, gender: '' }))
								}}
								errorText={errors.gender}
								size="form"
							/>
						</View>
						<View style={isTablet ? styles.colTablet : undefined}>
							<AppSelect
								label="Relationship to Patient *"
								placeholder="Select relationship"
								options={RELATIONSHIP_OPTIONS}
								value={relationship}
								onSelect={(val) => {
									setRelationship(val)
									if (errors.relationship) setErrors((e) => ({ ...e, relationship: '' }))
								}}
								errorText={errors.relationship}
								size="form"
							/>
						</View>
					</View>
				</View>

				{/* 3. Medical Details Section */}
				<View style={styles.card}>
					<AppTypography variant="h3" style={styles.sectionTitle}>
						Medical Details
					</AppTypography>

					<AppInput
						label="Health Condition / Primary Complaint"
						placeholder="e.g. Surgical wound dressing, diabetes vitals check, IV drip"
						value={condition}
						onChangeText={setCondition}
						fieldSize="form"
					/>

					<AppInput
						label="Notes & Special Instructions"
						placeholder="Additional instructions for the nurse, allergies, or specific requests..."
						multiline
						numberOfLines={3}
						value={notes}
						onChangeText={setNotes}
					/>

					{/* Prescription Upload */}
					<View style={styles.uploadContainer}>
						<AppTypography variant="h4" style={styles.uploadTitle}>
							Prescription Upload
						</AppTypography>
						<AppTypography variant="caption" style={styles.uploadSubtitle}>
							Upload doctor's prescription or relevant medical report (optional)
						</AppTypography>
						<UploadSection
							files={uploadedFiles}
							onAddFile={handleAddFile}
							onRemoveFile={handleRemoveFile}
						/>
					</View>
				</View>

				{/* 4. Visit Location Section */}
				<View style={styles.card}>
					<View style={styles.locationHeaderRow}>
						<AppTypography variant="h3" style={styles.sectionTitleNoMargin}>
							Visit Location
						</AppTypography>
						<TouchableOpacity
							style={styles.changeLocBtn}
							onPress={() => navigation.navigate(ROUTES.STACK.LOCATION_SELECT)}
							activeOpacity={0.7}
						>
							<Ionicons name="map-outline" size={16} color="#1F5F68" />
							<AppTypography variant="caption" style={styles.changeLocText}>
								Choose on Map
							</AppTypography>
						</TouchableOpacity>
					</View>

					<View style={styles.addressList}>
						{SAVED_ADDRESSES.map((addr) => {
							const isSelected = selectedAddressId === addr.id
							return (
								<TouchableOpacity
									key={addr.id}
									style={[styles.addressItem, isSelected && styles.addressItemSelected]}
									onPress={() => {
										setSelectedAddressId(addr.id)
										if (errors.address) setErrors((e) => ({ ...e, address: '' }))
									}}
									activeOpacity={0.8}
								>
									<View style={styles.addressRadioCircle}>
										{isSelected && <View style={styles.addressRadioDot} />}
									</View>

									<View style={styles.addressTextCol}>
										<View style={styles.addressBadgeRow}>
											<Ionicons name={addr.icon as any} size={15} color="#1F5F68" />
											<AppTypography variant="h4" style={styles.addressLabel}>
												{addr.label}
											</AppTypography>
										</View>
										<AppTypography variant="caption" style={styles.addressSubtext}>
											{addr.address}, {addr.city}
										</AppTypography>
									</View>
								</TouchableOpacity>
							)
						})}
					</View>
					{errors.address && (
						<AppTypography variant="caption" style={styles.errorText}>
							{errors.address}
						</AppTypography>
					)}
				</View>

				{/* 5. Appointment Scheduling Section */}
				<View style={styles.card}>
					<AppTypography variant="h3" style={styles.sectionTitle}>
						Appointment Scheduling
					</AppTypography>

					{/* Date Selector */}
					<AppTypography variant="caption" style={styles.subLabel}>
						Select Preferred Date
					</AppTypography>
					<ScrollView
						horizontal
						showsHorizontalScrollIndicator={false}
						contentContainerStyle={styles.dateScrollContent}
					>
						{DATE_OPTIONS.map((d) => {
							const isSelected = selectedDateId === d.id
							return (
								<TouchableOpacity
									key={d.id}
									style={[styles.datePill, isSelected && styles.datePillSelected]}
									onPress={() => setSelectedDateId(d.id)}
									activeOpacity={0.8}
								>
									<AppTypography
										variant="caption"
										style={[styles.datePillLabel, isSelected && styles.datePillLabelSelected]}
									>
										{d.label}
									</AppTypography>
									<AppTypography
										variant="h4"
										style={[styles.datePillDate, isSelected && styles.datePillDateSelected]}
									>
										{d.date}
									</AppTypography>
								</TouchableOpacity>
							)
						})}
					</ScrollView>

					{/* Time Slot Selector */}
					<AppTypography variant="caption" style={styles.subLabel}>
						Select Available Time Slot
					</AppTypography>
					<View style={styles.timeSlotGrid}>
						{TIME_SLOTS.map((slot) => {
							const isSelected = selectedTimeSlot === slot
							return (
								<TouchableOpacity
									key={slot}
									style={[styles.slotChip, isSelected && styles.slotChipSelected]}
									onPress={() => {
										setSelectedTimeSlot(slot)
										if (errors.timeSlot) setErrors((e) => ({ ...e, timeSlot: '' }))
									}}
									activeOpacity={0.8}
								>
									<Ionicons
										name="time-outline"
										size={14}
										color={isSelected ? '#FFFFFF' : '#1F5F68'}
									/>
									<AppTypography
										variant="caption"
										style={[styles.slotChipText, isSelected && styles.slotChipTextSelected]}
									>
										{slot}
									</AppTypography>
								</TouchableOpacity>
							)
						})}
					</View>
					{errors.timeSlot && (
						<AppTypography variant="caption" style={styles.errorText}>
							{errors.timeSlot}
						</AppTypography>
					)}
				</View>

				{/* 6. Primary Continue Button */}
				<View style={styles.buttonContainer}>
					<AppButton
						variant="primary"
						onPress={handleContinue}
						formAction
						style={styles.continueBtn}
					>
						Continue
					</AppButton>
				</View>
			</ScrollView>
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#F8FAFC',
	},
	scrollContent: {
		paddingHorizontal: 16,
		paddingTop: 16,
	},
	scrollContentTablet: {
		maxWidth: 720,
		width: '100%',
		alignSelf: 'center',
		paddingHorizontal: 24,
		paddingTop: 24,
	},
	card: {
		backgroundColor: '#FFFFFF',
		borderRadius: 16,
		padding: 16,
		marginBottom: 16,
		borderWidth: 1,
		borderColor: '#E8ECEC',
		elevation: 1,
		shadowColor: '#000000',
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.04,
		shadowRadius: 4,
	},
	topSummaryBadgeRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginBottom: 8,
	},
	sectionBadge: {
		fontSize: 10,
		fontWeight: '700',
		color: '#1F5F68',
		letterSpacing: 0.5,
	},
	countChip: {
		backgroundColor: '#E6F3F4',
		paddingHorizontal: 8,
		paddingVertical: 2,
		borderRadius: 10,
	},
	countChipText: {
		fontSize: 10,
		fontWeight: '700',
		color: '#1F5F68',
	},
	serviceRow: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	serviceImage: {
		width: 64,
		height: 64,
		borderRadius: 10,
		backgroundColor: '#F1F5F9',
	},
	serviceImageTablet: {
		width: 80,
		height: 80,
		borderRadius: 12,
	},
	serviceTextCol: {
		flex: 1,
		marginLeft: 12,
	},
	serviceTitle: {
		fontSize: 15,
		fontWeight: '700',
		color: '#191C1D',
		lineHeight: 20,
	},
	serviceDesc: {
		fontSize: 12,
		color: '#526062',
		marginTop: 3,
		lineHeight: 16,
	},
	sectionTitle: {
		fontSize: 17,
		fontWeight: '700',
		color: '#191C1D',
		marginBottom: 16,
	},
	sectionTitleNoMargin: {
		fontSize: 17,
		fontWeight: '700',
		color: '#191C1D',
	},
	rowTablet: {
		flexDirection: 'row',
		gap: 16,
	},
	colTablet: {
		flex: 1,
	},
	uploadContainer: {
		marginTop: 8,
	},
	uploadTitle: {
		fontSize: 14,
		fontWeight: '600',
		color: '#191C1D',
		marginBottom: 2,
	},
	uploadSubtitle: {
		fontSize: 12,
		color: '#526062',
		marginBottom: 12,
	},
	locationHeaderRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginBottom: 14,
	},
	changeLocBtn: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
	},
	changeLocText: {
		fontSize: 12,
		fontWeight: '600',
		color: '#1F5F68',
	},
	addressList: {
		gap: 10,
	},
	addressItem: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#F8FAFC',
		borderRadius: 12,
		padding: 12,
		borderWidth: 1,
		borderColor: '#E2E8F0',
	},
	addressItemSelected: {
		backgroundColor: '#F0F9F9',
		borderColor: '#1F5F68',
	},
	addressRadioCircle: {
		width: 18,
		height: 18,
		borderRadius: 9,
		borderWidth: 1.5,
		borderColor: '#1F5F68',
		alignItems: 'center',
		justifyContent: 'center',
		marginRight: 10,
	},
	addressRadioDot: {
		width: 10,
		height: 10,
		borderRadius: 5,
		backgroundColor: '#1F5F68',
	},
	addressTextCol: {
		flex: 1,
	},
	addressBadgeRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		marginBottom: 2,
	},
	addressLabel: {
		fontSize: 14,
		fontWeight: '700',
		color: '#191C1D',
	},
	addressSubtext: {
		fontSize: 12,
		color: '#526062',
		lineHeight: 16,
	},
	subLabel: {
		fontSize: 12,
		fontWeight: '700',
		color: '#526062',
		marginBottom: 8,
		marginTop: 4,
	},
	dateScrollContent: {
		gap: 10,
		paddingRight: 12,
		marginBottom: 16,
	},
	datePill: {
		backgroundColor: '#F8FAFC',
		borderRadius: 12,
		paddingHorizontal: 16,
		paddingVertical: 10,
		alignItems: 'center',
		borderWidth: 1,
		borderColor: '#E2E8F0',
		minWidth: 76,
	},
	datePillSelected: {
		backgroundColor: '#1F5F68',
		borderColor: '#1F5F68',
	},
	datePillLabel: {
		fontSize: 11,
		color: '#64748B',
		fontWeight: '600',
	},
	datePillLabelSelected: {
		color: 'rgba(255,255,255,0.85)',
	},
	datePillDate: {
		fontSize: 13,
		fontWeight: '700',
		color: '#191C1D',
		marginTop: 2,
	},
	datePillDateSelected: {
		color: '#FFFFFF',
	},
	timeSlotGrid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 8,
	},
	slotChip: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#F8FAFC',
		borderRadius: 12,
		paddingHorizontal: 12,
		paddingVertical: 8,
		borderWidth: 1,
		borderColor: '#E2E8F0',
		gap: 6,
	},
	slotChipSelected: {
		backgroundColor: '#1F5F68',
		borderColor: '#1F5F68',
	},
	slotChipText: {
		fontSize: 12,
		fontWeight: '600',
		color: '#1F5F68',
	},
	slotChipTextSelected: {
		color: '#FFFFFF',
	},
	errorText: {
		color: '#D32F2F',
		fontSize: 11,
		marginTop: 6,
	},
	buttonContainer: {
		marginTop: 8,
		marginBottom: 16,
	},
	continueBtn: {
		width: '100%',
		borderRadius: 14,
	},
})
