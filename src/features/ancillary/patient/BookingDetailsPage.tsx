import React, { useState, useEffect, useMemo } from 'react'
import {
	ActivityIndicator,
	Image,
	ScrollView,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
	useWindowDimensions,
} from 'react-native'
import { useNavigation, useRoute } from '@react-navigation/native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { safeJsonParse } from '../../../utils/jsonUtils'
import { getPatientDetails } from '../../../features/profile/patient/PatientProfileService'
import { ROUTES } from '../../../navigation/routes'
import {
	AddressSelectionSheet,
	AppBottomSheet,
	AppButton,
	AppInput,
	AppScreenHeader,
	AppSelect,
	AppSelectOption,
	AppTypography,
	BookingProgressStepper,
	PatientProfileSelectorBottomSheet,
	SelectionRowCard,
	ServiceProcedureItem,
	StatusModal,
} from '../../../components/common'
import DateSlotPicker from '../../../components/common/DateSlotPicker'
import { SlotGroup } from '../../doctor/doctorService'
import {
	ANCILLARY_BOOKING_STEPS,
	ANCILLARY_STEPPER_THEME,
	navigateAncillaryStep,
} from '../utils/bookingProgressStepperConfig'
import {
	createDefaultRecurringSchedule,
	RecurringVisitSchedule,
} from '../components/RecurringVisitCalendar'
import SelectedProcedureCard from '../components/SelectedProcedureCard'
import { AncillaryProvider } from '../ancillaryService'

const GENDER_OPTIONS: AppSelectOption[] = [
	{ label: 'Male', value: 'Male' },
	{ label: 'Female', value: 'Female' },
	{ label: 'Other', value: 'Other' },
]

const RELATIONSHIP_OPTIONS: AppSelectOption[] = [
	{ label: 'Self', value: 'Self' },
	{ label: 'Parent', value: 'Parent' },
	{ label: 'Spouse', value: 'Spouse' },
	{ label: 'Child', value: 'Child' },
	{ label: 'Other', value: 'Other' },
]

interface AddressItem {
	id: string
	label: string
	address: string
	icon: string
	isCurrentLocation: boolean
	latitude?: number
	longitude?: number
	isDefault?: boolean
}

const CURRENT_LOCATION_ADDRESS: AddressItem = {
	id: 'current_loc',
	label: 'Use Current Location',
	address: 'GPS Location (Detecting current address...)',
	icon: 'navigate-outline',
	isCurrentLocation: true,
}

const ANCILLARY_SLOTS: SlotGroup[] = [
	{
		label: 'Morning Slots',
		slots: [
			{ id: 's1', start_time: '9:00 AM - 10:00 AM', end_time: '', status: 'AVAILABLE' },
			{ id: 's2', start_time: '11:00 AM - 12:00 PM', end_time: '', status: 'AVAILABLE' },
		],
	},
	{
		label: 'Afternoon & Evening Slots',
		slots: [
			{ id: 's3', start_time: '2:00 PM - 3:00 PM', end_time: '', status: 'AVAILABLE' },
			{ id: 's4', start_time: '5:00 PM - 6:00 PM', end_time: '', status: 'AVAILABLE' },
			{ id: 's5', start_time: '7:00 PM - 8:00 PM', end_time: '', status: 'AVAILABLE' },
		],
	},
]

const DEFAULT_MOCK_SERVICES: ServiceProcedureItem[] = [
	{
		id: 'gen1',
		title: 'Wound Dressing & Care',
		description: 'Sterile dressing for surgical, burn or chronic diabetic wounds',
		duration: '30 - 45 mins',
		price: '₹499',
		image: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=500&q=80',
		verified: true,
	},
]

export default function BookingDetailsPage() {
	const navigation = useNavigation<any>()
	const route = useRoute<any>()
	const insets = useSafeAreaInsets()
	const { width } = useWindowDimensions()
	const isTablet = width >= 768

	const routeParams = route.params || {}
	const payloadObj = routeParams.bookingPayload || routeParams.payload || {}
	const currentServiceKey = payloadObj.serviceKey || routeParams.serviceKey || 'nursing-care'
	const isHomeCare = currentServiceKey === 'home-care' || currentServiceKey === 'home-care-time'
	const initialServices: ServiceProcedureItem[] = useMemo(() => {
		if (payloadObj.services && Array.isArray(payloadObj.services) && payloadObj.services.length > 0) {
			return payloadObj.services
		}
		if (routeParams.services && Array.isArray(routeParams.services) && routeParams.services.length > 0) {
			return routeParams.services
		}
		if (routeParams.selectedServices && Array.isArray(routeParams.selectedServices) && routeParams.selectedServices.length > 0) {
			return routeParams.selectedServices
		}
		if (routeParams.service) {
			return [routeParams.service]
		}
		return DEFAULT_MOCK_SERVICES
	}, [route.params])

	// 1. Multiple Selected Services State
	const [services, setServices] = useState<ServiceProcedureItem[]>(initialServices)

	useEffect(() => {
		if (initialServices && initialServices.length > 0) {
			setServices(initialServices)
		}
	}, [initialServices])

	// 1b. Per-Service Recurring Visit Scheduling State (independent per selected service)
	const [expandedServiceIds, setExpandedServiceIds] = useState<Record<string, boolean>>({})
	const [serviceSchedules, setServiceSchedules] = useState<Record<string, RecurringVisitSchedule>>({})

	const toggleServiceExpanded = (serviceId: string) => {
		setExpandedServiceIds((prev) => ({ ...prev, [serviceId]: !prev[serviceId] }))
	}

	const getServiceSchedule = (serviceId: string): RecurringVisitSchedule =>
		serviceSchedules[serviceId] ?? createDefaultRecurringSchedule()

	const updateServiceSchedule = (serviceId: string, next: RecurringVisitSchedule) => {
		setServiceSchedules((prev) => ({ ...prev, [serviceId]: next }))
	}

	// 2. Patient Details State
	const [patient, setPatient] = useState<{
		publicId?: string
		name: string
		age: string
		gender: string
		bloodGroup: string
		relationship: string
		avatar?: string
	} | null>(null)
	const [loadingPatient, setLoadingPatient] = useState<boolean>(true)
	const [patientErrorModalVisible, setPatientErrorModalVisible] = useState<boolean>(false)
	const [validationModalTitle, setValidationModalTitle] = useState<string>('Unable to Book')
	const [validationModalMessage, setValidationModalMessage] = useState<string>('We couldn\'t retrieve the patient details required to complete this booking. Please try again.')

	// 3. Booking Dispatch Mode State (INSTANT vs SCHEDULED)
	const [bookingType, setBookingType] = useState<'INSTANT' | 'SCHEDULED'>('INSTANT')

	// 4. Visit Details State
	const [visit, setVisit] = useState<{
		addressId: string
		addressLabel: string
		address: string
		latitude?: number
		longitude?: number
		dateId: string
		date: string
		timeSlot: string
		timeBadge: string
	}>({
		addressId: 'addr1',
		addressLabel: 'Home',
		address: '42 Healthcare Avenue, Flat 3B, Sector 18, New Delhi - 110001',
		latitude: undefined,
		longitude: undefined,
		dateId: 'd1',
		date: 'Today, 10 Aug 2025',
		timeSlot: '09:00 AM - 10:00 AM',
		timeBadge: 'Instant Dispatch (15-30 mins)',
	})

	// Edit Modal Visibility States
	const [editPatientVisible, setEditPatientVisible] = useState(false)
	const [editVisitVisible, setEditVisitVisible] = useState(false)
	const [switchProfileVisible, setSwitchProfileVisible] = useState(false)
	const [selectedProfileId, setSelectedProfileId] = useState<string>('self-1')

	// Temporary Form States for Patient Edit Sheet
	const [tempPatientName, setTempPatientName] = useState('')
	const [tempPatientAge, setTempPatientAge] = useState('')
	const [tempPatientGender, setTempPatientGender] = useState('')
	const [tempPatientRel, setTempPatientRel] = useState('Self')

	// Nurse Assignment Preference State
	const [assignmentMode, setAssignmentMode] = useState<'SYSTEM_MATCH' | 'SELECT_NURSE'>('SYSTEM_MATCH')
	const [selectedNurse, setSelectedNurse] = useState<AncillaryProvider | null>(null)
	const [nurseBottomSheetVisible, setNurseBottomSheetVisible] = useState(false)

	const fetchProfile = async () => {
			setLoadingPatient(true)

			try {
				let resolvedName = ''
				let resolvedPublicId = ''
				let personalData: any = null

				// 1. Try to get full details from getPatientDetails API
				try {
					const response = await getPatientDetails()
					if (response && response.success && response.data) {
						personalData = response.data.personal
						resolvedName = personalData?.name || response.data.name || ''
						resolvedPublicId = response.data.public_id || response.data.id || personalData?.public_id || personalData?.id || ''
					}
				} catch (detailsErr) {
					console.log('[BookingDetailsPage] Notice: getPatientDetails API call failed:', detailsErr)
				}



				// 3. If still missing, check logged-in user in AsyncStorage
				if (!resolvedPublicId || !resolvedName || resolvedName.trim() === '') {
					try {
						const userRaw = await AsyncStorage.getItem('user')
						if (userRaw) {
							const userData = safeJsonParse<any>(userRaw)
							if (userData) {
								if (!resolvedPublicId) {
									resolvedPublicId = userData.publicId || userData.public_id || userData.id || ''
								}
								if (!resolvedName || resolvedName.trim() === '') {
									resolvedName = userData.name || userData.full_name || ''
								}
							}
						}
					} catch (storageErr) {
						console.log('[BookingDetailsPage] Notice: reading AsyncStorage user failed:', storageErr)
					}
				}

				// Validate resolved real patient
				const isBlockedPlaceholder = ['Patient Account Holder', 'John Doe', 'Eleanor Vance', 'Patient Recipient', 'Patient'].includes(resolvedName.trim())
				if (resolvedName && typeof resolvedName === 'string' && resolvedName.trim() !== '' && !isBlockedPlaceholder && resolvedPublicId) {
					let parsedAge = ''
					if (personalData?.date_of_birth) {
						const dob = new Date(personalData.date_of_birth)
						if (!isNaN(dob.getTime())) {
							const diff = Date.now() - dob.getTime()
							parsedAge = String(Math.abs(new Date(diff).getUTCFullYear() - 1970))
						}
					} else if (personalData?.age) {
						parsedAge = String(personalData.age)
					}

					const loadedPatient = {
						publicId: resolvedPublicId,
						name: resolvedName.trim(),
						age: parsedAge,
						gender: personalData?.gender || '',
						bloodGroup: personalData?.blood_group || '',
						relationship: personalData?.relation || 'Self',
						avatar: personalData?.avatar,
					}
					setPatient(loadedPatient)
					setTempPatientName(loadedPatient.name)
					setTempPatientAge(loadedPatient.age)
					setTempPatientGender(loadedPatient.gender)
					setTempPatientRel(loadedPatient.relationship)
					setLoadingPatient(false)
					return
				}
			} catch (e) {
				console.error('Failed to fetch patient profile details from API', e)
			}

			// If genuine patient details are not available, STOP booking and show error modal
			setPatient(null)
			setLoadingPatient(false)
			setValidationModalTitle('Unable to Book')
			setValidationModalMessage("We couldn't retrieve the patient details required to complete this booking. Please try again.")
			setPatientErrorModalVisible(true)
	}

	useEffect(() => {
		void fetchProfile()
	}, [])

	useEffect(() => {
		if (routeParams.selectedNurse) {
			setSelectedNurse(routeParams.selectedNurse)
			setAssignmentMode('SELECT_NURSE')
		} else if (routeParams.clearSelectedNurse) {
			setSelectedNurse(null)
			setAssignmentMode('SYSTEM_MATCH')
		}

		if (routeParams.bookingType === 'SCHEDULED' && routeParams.scheduledStartTime) {
			setBookingType('SCHEDULED')
			setVisit((prev) => ({
				...prev,
				date: routeParams.scheduledDate || prev.date,
				timeSlot: `${routeParams.scheduledStartTime} - ${routeParams.scheduledEndTime || ''}`,
				timeBadge: 'Scheduled Slot Confirmed',
			}))
		}
	}, [
		routeParams.selectedNurse,
		routeParams.clearSelectedNurse,
		routeParams.bookingType,
		routeParams.scheduledStartTime,
		routeParams.scheduledDate,
		routeParams.scheduledEndTime,
	])

	// Dynamic Charges Calculation
	const procedureBaseFee = useMemo(() => {
		return services.reduce((total, item) => {
			const num = parseInt(item.price.replace(/[^\d]/g, ''), 10)
			return total + (isNaN(num) ? 0 : num)
		}, 0)
	}, [services])

	const homeVisitFee = 150
	const taxes = Math.round((procedureBaseFee + homeVisitFee) * 0.03)
	const grandTotal = procedureBaseFee + homeVisitFee + taxes

	const charges = {
		basePrice: `₹${procedureBaseFee}`,
		visitFee: `₹${homeVisitFee}`,
		taxes: `₹${taxes}`,
		totalAmount: `₹${grandTotal}`,
	}

	const handleRemoveService = (serviceId: string) => {
		setServices((prev) => prev.filter((s) => s.id !== serviceId))
	}

	const handleEditServices = () => {
		// Pass the current (post-deletion) services list back to the catalog
		// screen so its own selection state stays in sync -- a plain goBack()
		// would leave the catalog's cart state stale, still showing services
		// that were removed here.
		const editServiceKey = payloadObj.serviceKey || routeParams.serviceKey || 'nursing-care'
		const editServiceLabel = payloadObj.serviceLabel || routeParams.serviceLabel || 'Nursing Care'
		// Home Care's "Activities & Tasks" catalog is its own screen
		// (HomeCareServiceCatalogScreen, HOME_CARE_CATALOG route) -- unlike
		// Nursing/Physiotherapy/Rehab Care/etc., which all share
		// AncillaryServiceCatalogScreen under ANCILLARY_SERVICES with a
		// different serviceKey each. Routing 'home-care' there would land on
		// the Caregiver launcher menu instead of the catalog with this cart.
		if (editServiceKey === 'home-care') {
			navigation.navigate(ROUTES.STACK.HOME_CARE_CATALOG, {
				updatedCart: services,
			})
			return
		}
		navigation.navigate(ROUTES.STACK.ANCILLARY_SERVICES, {
			serviceKey: editServiceKey,
			serviceLabel: editServiceLabel,
			updatedCart: services,
		})
	}

	const handleSelectProfile = (selected: any) => {
		setSelectedProfileId(selected.id)
		const targetPublicId = selected.publicId || selected.public_id || selected.id
		setPatient({
			publicId: targetPublicId,
			name: selected.name,
			age: String(selected.age),
			gender: selected.gender,
			bloodGroup: selected.bloodGroup || '',
			relationship: selected.relationship || selected.relation || 'Family Member',
			avatar: selected.avatar,
		})
	}

	const handleSavePatientDetails = () => {
		setPatient((prev) => {
			if (!prev) return null
			return {
				...prev,
				name: tempPatientName || prev.name,
				age: tempPatientAge || prev.age,
				gender: tempPatientGender || prev.gender,
				relationship: tempPatientRel || prev.relationship,
			}
		})
		setEditPatientVisible(false)
	}

	const handleContinueToPayment = () => {
		// 1. Validate Patient Details
		if (!patient || !patient.name || typeof patient.name !== 'string' || patient.name.trim() === '' || !patient.publicId || ['Patient Account Holder', 'John Doe', 'Eleanor Vance', 'Patient Recipient', 'Patient'].includes(patient.name.trim())) {
			setValidationModalTitle('Unable to Book')
			setValidationModalMessage("We couldn't retrieve the patient details required to complete this booking. Please try again.")
			setPatientErrorModalVisible(true)
			return
		}

		// 2. Validate Selected Services/Procedures
		if (!services || services.length === 0) {
			setValidationModalTitle('Unable to Book')
			setValidationModalMessage("Please select at least one healthcare service or procedure to continue with your booking.")
			setPatientErrorModalVisible(true)
			return
		}

		// 3. Validate Delivery Address
		if (!visit || !visit.address || typeof visit.address !== 'string' || visit.address.trim() === '' || visit.address.includes('Detecting')) {
			setValidationModalTitle('Unable to Book')
			setValidationModalMessage("A valid delivery address is required for doorstep care. Please select or provide your address.")
			setPatientErrorModalVisible(true)
			return
		}

		// 4. Validate Scheduled Date & Time (if Scheduled)
		if (bookingType === 'SCHEDULED' && (!visit.date || !visit.timeSlot || visit.date.trim() === '')) {
			setValidationModalTitle('Unable to Book')
			setValidationModalMessage("Please select an appointment date and time slot for your scheduled care visit.")
			setPatientErrorModalVisible(true)
			return
		}

		const bookingPayload = {
			services,
			patient,
			visit,
			charges,
			bookingType,
			assignmentMode,
			selectedNurse,
		}

		navigation.navigate(ROUTES.STACK.ANCILLARY_PAYMENT, {
			bookingPayload,
		})
	}

	return (
		<View style={styles.container}>
			<AppScreenHeader title="Booking Details" />

			<ScrollView
				contentContainerStyle={[
					styles.scrollContent,
					isTablet && styles.scrollContentTablet,
					{ paddingBottom: insets.bottom + 120 },
				]}
				showsVerticalScrollIndicator={false}
			>
				{/* STEP PROGRESS INDICATOR */}
				<View style={styles.stepperContainer}>
					<BookingProgressStepper
						steps={ANCILLARY_BOOKING_STEPS}
						currentIndex={1}
						theme={ANCILLARY_STEPPER_THEME}
						onStepPress={(index) => navigateAncillaryStep(navigation, 1, index)}
					/>
				</View>

				{/* 1. SECTION: PATIENT RECIPIENT PROFILE */}
				<View style={styles.sectionBlock}>
					<View style={styles.sectionHeaderRow}>
						<AppTypography variant="h3" style={styles.sectionHeading}>
							Patient Recipient
						</AppTypography>
						<TouchableOpacity style={styles.actionBtn} onPress={() => setSwitchProfileVisible(true)} activeOpacity={0.7}>
							<AppTypography variant="caption" style={styles.actionBtnText}>
								Switch Profile
							</AppTypography>
						</TouchableOpacity>
					</View>

					{loadingPatient ? (
						<View style={[styles.patientProfileBox, { justifyContent: 'center', paddingVertical: 20 }]}>
							<ActivityIndicator size="small" color="#2B6F71" />
							<AppTypography variant="caption" style={{ color: '#546E7A', marginLeft: 8 }}>
								Retrieving patient details...
							</AppTypography>
						</View>
					) : patient ? (
						<View style={styles.patientProfileBox}>
							<Image source={{ uri: patient.avatar }} style={styles.patientAvatar} resizeMode="cover" />
							<View style={styles.patientInfoCol}>
								<View style={styles.patientNameRow}>
									<AppTypography variant="h3" style={styles.patientName}>
										{patient.name}
									</AppTypography>
									<View style={styles.relationChip}>
										<AppTypography variant="caption" style={styles.relationText}>
											{patient.relationship}
										</AppTypography>
									</View>
								</View>
								<AppTypography variant="caption" style={styles.patientMetaText}>
									{patient.age ? `${patient.age} Yrs` : ''} {patient.gender ? ` •  ${patient.gender}` : ''} {patient.bloodGroup ? ` •  Blood Group: ${patient.bloodGroup}` : ''}
								</AppTypography>
							</View>
						</View>
					) : (
						<View style={[styles.patientProfileBox, { backgroundColor: '#FEF2F2', borderColor: '#FCA5A5', borderWidth: 1 }]}>
							<Ionicons name="alert-circle-outline" size={24} color="#DC2626" />
							<View style={{ flex: 1 }}>
								<AppTypography variant="h4" style={{ color: '#991B1B' }}>
									Patient Details Unavailable
								</AppTypography>
								<AppTypography variant="caption" style={{ color: '#B91C1C', marginTop: 2 }}>
									Unable to retrieve recipient details. Please try again.
								</AppTypography>
							</View>
							<TouchableOpacity onPress={fetchProfile} style={{ backgroundColor: '#DC2626', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 }}>
								<AppTypography variant="caption" style={{ color: '#FFFFFF', fontWeight: '700' }}>Retry</AppTypography>
							</TouchableOpacity>
						</View>
					)}
				</View>

				{/* 8px GREY SECTION DIVIDER BAR */}
				<View style={styles.sectionDividerBar} />

				{/* 2. SECTION: LOCATION */}
				<View style={styles.sectionBlock}>
					<View style={styles.sectionHeaderRow}>
						<AppTypography variant="h3" style={styles.sectionHeading}>
							Location
						</AppTypography>
					</View>

					{/* ADDRESS BLOCK */}
					<View style={styles.locationSummaryBox}>
						<View style={styles.locationItem}>
							<View style={styles.locationIconWrap}>
								<Ionicons name="location-outline" size={18} color="#2B6F71" />
							</View>
							<View style={styles.locationTextCol}>
								<View style={styles.locationHeaderRow}>
									<AppTypography variant="h4" style={styles.locationTitle}>
										Visit Address ({visit.addressLabel})
									</AppTypography>
									<TouchableOpacity onPress={() => setEditVisitVisible(true)} activeOpacity={0.7}>
										<AppTypography variant="caption" style={styles.changeLinkText}>
											Change
										</AppTypography>
									</TouchableOpacity>
								</View>
								<AppTypography variant="caption" style={styles.locationAddressText}>
									{visit.address}
								</AppTypography>
							</View>
						</View>

						<View style={styles.locationDivider} />

						{/* SLOT / ARRIVAL WINDOW */}
						<View style={styles.locationItem}>
							<View style={styles.locationIconWrap}>
								<Ionicons name="time-outline" size={18} color="#2B6F71" />
							</View>
							<View style={styles.locationTextCol}>
								<AppTypography variant="h4" style={styles.locationTitle}>
									{bookingType === 'INSTANT' ? 'Estimated Arrival Window' : 'Scheduled Date & Time'}
								</AppTypography>
								<AppTypography variant="body" style={styles.locationTimeVal}>
									{bookingType === 'INSTANT'
										? 'Within 15 - 30 minutes of booking'
										: `${visit.date} • ${visit.timeSlot}`}
								</AppTypography>
							</View>
						</View>
					</View>
				</View>

{/* 8px GREY SECTION DIVIDER BAR */}
				<View style={styles.sectionDividerBar} />

				{/* 3. SECTION: SELECTED PROCEDURES */}
				<View style={styles.sectionBlock}>
					<View style={styles.sectionHeaderRow}>
						<AppTypography variant="h3" style={styles.sectionHeading}>
							Selected Procedures ({services.length})
						</AppTypography>
						<TouchableOpacity style={styles.actionBtn} onPress={handleEditServices} activeOpacity={0.7}>
							<AppTypography variant="caption" style={styles.actionBtnText}>
								+ Add Services
							</AppTypography>
						</TouchableOpacity>
					</View>

					{services.length > 0 ? (
						<View style={styles.servicesList}>
							{services.map((item) => (
								<SelectedProcedureCard
									key={item.id}
									service={item}
									showDelete={services.length > 1}
									onRemove={() => handleRemoveService(item.id)}
									expanded={!!expandedServiceIds[item.id]}
									onToggleExpand={() => toggleServiceExpanded(item.id)}
									schedule={getServiceSchedule(item.id)}
									onScheduleChange={(next) => updateServiceSchedule(item.id, next)}
								/>
							))}
						</View>
					) : (
						<View style={styles.emptyBox}>
							<AppTypography variant="caption" style={styles.emptyText}>
								No services selected. Tap Add Services to configure.
							</AppTypography>
						</View>
					)}
				</View>

								{/* 8px GREY SECTION DIVIDER BAR */}
				{!isHomeCare && <View style={styles.sectionDividerBar} />}

				{/* 4. SECTION: NURSE ASSIGNMENT PREFERENCE (Nursing/Physiotherapy/etc. only —
					Home Care always dispatches via the default SYSTEM_MATCH assignment mode,
					so this choice is not shown for that service) */}
				{!isHomeCare && (
				<View style={styles.sectionBlock}>
					<View style={styles.sectionHeaderRow}>
						<AppTypography variant="h3" style={styles.sectionHeading}>
							How would you like to choose your nurse?
						</AppTypography>
					</View>
					<AppTypography variant="caption" style={styles.sectionSubheading}>
						Choose auto-matching for fastest dispatch or browse and pick your preferred nurse.
					</AppTypography>

					<View style={styles.nurseChoiceContainer}>
						{/* OPTION 1: Let the System Select */}
						<SelectionRowCard
							icon={
								<Ionicons
									name="flash"
									size={20}
									color={assignmentMode === 'SYSTEM_MATCH' ? '#FFFFFF' : '#0C7C7C'}
								/>
							}
							title="Let the System Select"
							subtitle="Fastest dispatch • Automatically matches the nearest qualified nurse to your location (15-30 mins)."
							badgeText="RECOMMENDED"
							selected={assignmentMode === 'SYSTEM_MATCH'}
							onPress={() => {
								setAssignmentMode('SYSTEM_MATCH')
								setSelectedNurse(null)
							}}
						/>

						{/* OPTION 2: Select a Nurse */}
						<SelectionRowCard
							icon={
								<Ionicons
									name="person"
									size={20}
									color={assignmentMode === 'SELECT_NURSE' ? '#FFFFFF' : '#0C7C7C'}
								/>
							}
							title="Select an Available Nurse"
							subtitle="Browse nearby certified nurses and select a 30-minute booking slot."
							selected={assignmentMode === 'SELECT_NURSE'}
							onPress={() => {
								setAssignmentMode('SELECT_NURSE')
								if (!selectedNurse) {
									console.log('[BookingDetailsPage] Option 2 pressed. Navigating to ANCILLARY_PROVIDERS with coords:', {
										latitude: visit.latitude,
										longitude: visit.longitude,
										address: visit.address,
									})
									navigation.navigate(ROUTES.STACK.ANCILLARY_PROVIDERS, {
										isSelectionMode: true,
										serviceKey: payloadObj.serviceKey || routeParams.serviceKey || 'nursing-care',
										serviceLabel: payloadObj.serviceLabel || routeParams.serviceLabel || 'Nursing Care',
										procedureName: services[0]?.title,
										procedureId: services[0]?.id,
										services,
										latitude: visit.latitude,
										longitude: visit.longitude,
										selectedNurseId: undefined,
									})
								}
							}}
						/>
					</View>

					{/* WHEN SELECT_NURSE IS ACTIVE */}
					{assignmentMode === 'SELECT_NURSE' && (
						selectedNurse ? (
							<View style={styles.selectedNurseCardContainer}>
								<View style={styles.selectedNurseCardHeader}>
									<View style={styles.selectedBadgeRow}>
										<Ionicons name="checkmark-circle" size={15} color="#047857" />
										<AppTypography variant="caption" style={styles.selectedBadgeLabel}>
											Selected Nurse
										</AppTypography>
									</View>
									<TouchableOpacity
										style={styles.changeNurseBtn}
										onPress={() => {
											console.log('[BookingDetailsPage] Change Nurse pressed. Navigating with coords:', {
												latitude: visit.latitude,
												longitude: visit.longitude,
											})
											navigation.navigate(ROUTES.STACK.ANCILLARY_PROVIDERS, {
												isSelectionMode: true,
												serviceKey: payloadObj.serviceKey || routeParams.serviceKey || 'nursing-care',
												serviceLabel: payloadObj.serviceLabel || routeParams.serviceLabel || 'Nursing Care',
												procedureName: services[0]?.title,
												procedureId: services[0]?.id,
												services,
												latitude: visit.latitude,
												longitude: visit.longitude,
												selectedNurseId: selectedNurse?.id,
											})
										}}
										activeOpacity={0.7}
									>
										<Ionicons name="swap-horizontal" size={14} color="#0C7C7C" />
										<AppTypography variant="caption" style={styles.changeNurseBtnText}>
											Change Nurse
										</AppTypography>
									</TouchableOpacity>
								</View>

								<View style={styles.selectedNurseRow}>
									<Image source={{ uri: selectedNurse.avatar }} style={styles.selectedNurseAvatar} />
									<View style={styles.selectedNurseInfo}>
										<View style={styles.nameAndBadge}>
											<AppTypography variant="subtitle" style={styles.selectedNurseName}>
												{selectedNurse.name}
											</AppTypography>
											<View style={styles.rnChip}>
												<AppTypography variant="caption" style={styles.rnChipText}>
													{selectedNurse.credentials}
												</AppTypography>
											</View>
										</View>
										<View style={styles.selectedNurseStats}>
											{selectedNurse.experience != null && (
												<>
													<AppTypography variant="caption" style={styles.statText}>
														{selectedNurse.experience} yrs exp
													</AppTypography>
													<AppTypography variant="caption" style={styles.statDot}>•</AppTypography>
												</>
											)}
											<AppTypography variant="caption" style={[styles.statText, { color: '#047857', fontWeight: '600' }]}>
												Previously Consulted
											</AppTypography>
										</View>
									</View>
								</View>
							</View>
						) : (
							<TouchableOpacity
								style={styles.browsePromptCard}
								onPress={() => {
									console.log('[BookingDetailsPage] Browse Prompt pressed. Navigating with coords:', {
										latitude: visit.latitude,
										longitude: visit.longitude,
									})
									navigation.navigate(ROUTES.STACK.ANCILLARY_PROVIDERS, {
										isSelectionMode: true,
										serviceKey: payloadObj.serviceKey || routeParams.serviceKey || 'nursing-care',
										serviceLabel: payloadObj.serviceLabel || routeParams.serviceLabel || 'Nursing Care',
										procedureName: services[0]?.title,
										procedureId: services[0]?.id,
										services,
										latitude: visit.latitude,
										longitude: visit.longitude,
										selectedNurseId: undefined,
									})
								}}
								activeOpacity={0.8}
							>
								<View style={styles.browsePromptLeft}>
									<View style={styles.browseIconCircle}>
										<Ionicons name="search" size={18} color="#0C7C7C" />
									</View>
									<View style={styles.browsePromptTextCol}>
										<AppTypography variant="subtitle" style={styles.browsePromptTitle}>
											Choose a Previous Nurse
										</AppTypography>
										<AppTypography variant="caption" style={styles.browsePromptSub}>
											Tap here to view nurses you have previously consulted
										</AppTypography>
									</View>
								</View>
								<View style={styles.browsePromptCta}>
									<AppTypography variant="caption" style={styles.browsePromptCtaText}>Select Nurse</AppTypography>
									<Ionicons name="chevron-forward" size={14} color="#0C7C7C" />
								</View>
							</TouchableOpacity>
						)
					)}
				</View>
				)}

				{/* 8px GREY SECTION DIVIDER BAR */}
				<View style={styles.sectionDividerBar} />

				{/* 5. SECTION: PAYMENT SUMMARY */}
				<View style={styles.sectionBlock}>
					<View style={styles.sectionHeaderRow}>
						<AppTypography variant="h3" style={styles.sectionHeading}>
							Payment Breakdown
						</AppTypography>
					</View>

					<View style={styles.billingList}>
						<View style={styles.billingRow}>
							<AppTypography variant="body" style={styles.billingLabel}>
								Procedure Charges ({services.length} item{services.length > 1 ? 's' : ''})
							</AppTypography>
							<AppTypography variant="body" style={styles.billingVal}>
								{charges.basePrice}
							</AppTypography>
						</View>

						<View style={styles.billingRow}>
							<AppTypography variant="body" style={styles.billingLabel}>
								Specialist Doorstep Visit Fee
							</AppTypography>
							<AppTypography variant="body" style={styles.billingVal}>
								{charges.visitFee}
							</AppTypography>
						</View>

						<View style={styles.billingRow}>
							<AppTypography variant="body" style={styles.billingLabel}>
								Taxes & Operational Fee (3% GST)
							</AppTypography>
							<AppTypography variant="body" style={styles.billingVal}>
								{charges.taxes}
							</AppTypography>
						</View>

						<View style={styles.totalDivider} />

						<View style={styles.totalRow}>
							<AppTypography variant="h3" style={styles.totalLabel}>
								Total Payable Amount
							</AppTypography>
							<AppTypography variant="h3" style={styles.totalVal}>
								{charges.totalAmount}
							</AppTypography>
						</View>
					</View>

					{/* GUARANTEE BADGE */}
					<View style={styles.guaranteeBox}>
						<Ionicons name="shield-checkmark-outline" size={18} color="#059669" />
						<AppTypography variant="caption" style={styles.guaranteeText}>
							100% Certified Nurses • Sanitized Equipment
						</AppTypography>
					</View>
				</View>
			</ScrollView>

			{/* FIXED BOTTOM CHECKOUT FOOTER */}
			<View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
				<View style={styles.bottomBarPriceCol}>
					<AppTypography variant="caption" style={styles.bottomBarTotalLabel}>
						Total Amount
					</AppTypography>
					<AppTypography variant="h3" style={styles.bottomBarTotalVal}>
						{charges.totalAmount}
					</AppTypography>
				</View>

				<AppButton
					variant="primary"
					onPress={handleContinueToPayment}
					disabled={services.length === 0}
					style={styles.continueBtn}
				>
					Proceed to Payment
				</AppButton>
			</View>

			{/* EDIT PATIENT MODAL SHEET */}
			<AppBottomSheet
				visible={editPatientVisible}
				onClose={() => setEditPatientVisible(false)}
				title="Edit Patient Details"
			>
				<View style={styles.modalFormContent}>
					<AppInput label="Full Name" value={tempPatientName} onChangeText={setTempPatientName} placeholder="Enter name" />
					<AppInput label="Age (Years)" value={tempPatientAge} onChangeText={setTempPatientAge} keyboardType="numeric" placeholder="Enter age" />
					<AppSelect label="Gender" value={tempPatientGender} options={GENDER_OPTIONS} onSelect={(val) => setTempPatientGender(val as string)} />
					<AppSelect label="Relationship" value={tempPatientRel} options={RELATIONSHIP_OPTIONS} onSelect={(val) => setTempPatientRel(val as string)} />

					<AppButton variant="primary" onPress={handleSavePatientDetails} style={styles.modalSaveBtn}>
						Save Patient Details
					</AppButton>
				</View>
			</AppBottomSheet>

			{/* EDIT VISIT ADDRESS & SCHEDULE MODAL SHEET */}
			<AppBottomSheet
				visible={editVisitVisible}
				onClose={() => setEditVisitVisible(false)}
				title="Select Visit Address"
			>
				<View style={styles.modalFormContent}>
					<AppTypography variant="caption" style={styles.addressSectionSubtitle}>
						SELECT DELIVERY ADDRESS
					</AppTypography>

					<AddressSelectionSheet
						selectedAddressId={visit.addressId}
						allowAddNew={false}
						onSelectAddress={(addr) => {
							const combinedAddress = `${addr.address_line}, ${addr.city} ${addr.pincode}`
							console.log('[BookingDetailsPage] Address selected:', addr.id, addr.label, combinedAddress, {
								latitude: addr.latitude,
								longitude: addr.longitude,
							})
							setVisit((prev) => ({
								...prev,
								addressId: addr.id,
								addressLabel: addr.label,
								address: combinedAddress,
								latitude: addr.latitude,
								longitude: addr.longitude,
							}))
						}}
						leadingItem={
							<TouchableOpacity
								style={[
									styles.addressCardItem,
									visit.addressId === CURRENT_LOCATION_ADDRESS.id && styles.addressCardItemSelected,
									styles.addressCardItemCurrent,
								]}
								onPress={() => {
									console.log(
										'[BookingDetailsPage] Address selected:',
										CURRENT_LOCATION_ADDRESS.id,
										CURRENT_LOCATION_ADDRESS.label,
										CURRENT_LOCATION_ADDRESS.address,
										{ latitude: undefined, longitude: undefined },
									)
									setVisit((prev) => ({
										...prev,
										addressId: CURRENT_LOCATION_ADDRESS.id,
										addressLabel: CURRENT_LOCATION_ADDRESS.label,
										address: CURRENT_LOCATION_ADDRESS.address,
										latitude: undefined,
										longitude: undefined,
									}))
								}}
								activeOpacity={0.8}
							>
								<View
									style={[
										styles.addressIconWrap,
										visit.addressId === CURRENT_LOCATION_ADDRESS.id && styles.addressIconWrapSelected,
									]}
								>
									<Ionicons
										name={CURRENT_LOCATION_ADDRESS.icon as any}
										size={18}
										color={visit.addressId === CURRENT_LOCATION_ADDRESS.id ? '#FFFFFF' : '#0C7C7C'}
									/>
								</View>

								<View style={styles.addressTextCol}>
									<View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
										<AppTypography
											variant="h4"
											style={[
												styles.addressLabelText,
												visit.addressId === CURRENT_LOCATION_ADDRESS.id && styles.addressLabelTextSelected,
											]}
										>
											{CURRENT_LOCATION_ADDRESS.label}
										</AppTypography>
										<View style={styles.gpsPill}>
											<AppTypography variant="caption" style={styles.gpsPillText}>
												GPS DETECTED
											</AppTypography>
										</View>
									</View>
									<AppTypography variant="caption" style={styles.addressValText} numberOfLines={2}>
										{CURRENT_LOCATION_ADDRESS.address}
									</AppTypography>
								</View>

								<View
									style={[
										styles.radioDotOuter,
										visit.addressId === CURRENT_LOCATION_ADDRESS.id && styles.radioDotOuterSelected,
									]}
								>
									{visit.addressId === CURRENT_LOCATION_ADDRESS.id && <View style={styles.radioDotInner} />}
								</View>
							</TouchableOpacity>
						}
						renderAddressRow={({ address: addr, selected, onPress }) => (
							<TouchableOpacity
								key={addr.id}
								style={[styles.addressCardItem, selected && styles.addressCardItemSelected]}
								onPress={onPress}
								activeOpacity={0.8}
							>
								<View style={[styles.addressIconWrap, selected && styles.addressIconWrapSelected]}>
									<Ionicons
										name={addr.label.toLowerCase().includes('work') ? 'briefcase-outline' : 'home-outline'}
										size={18}
										color={selected ? '#FFFFFF' : '#475569'}
									/>
								</View>

								<View style={styles.addressTextCol}>
									<AppTypography variant="h4" style={[styles.addressLabelText, selected && styles.addressLabelTextSelected]}>
										{addr.label}
									</AppTypography>
									<AppTypography variant="caption" style={styles.addressValText} numberOfLines={2}>
										{`${addr.address_line}, ${addr.city} ${addr.pincode}`}
									</AppTypography>
								</View>

								<View style={[styles.radioDotOuter, selected && styles.radioDotOuterSelected]}>
									{selected && <View style={styles.radioDotInner} />}
								</View>
							</TouchableOpacity>
						)}
					/>

					<AppButton variant="primary" onPress={() => setEditVisitVisible(false)} style={styles.modalSaveBtn}>
						Confirm Address
					</AppButton>
				</View>
			</AppBottomSheet>

			{/* PATIENT PROFILE SELECTOR BOTTOM SHEET */}
			<PatientProfileSelectorBottomSheet
				visible={switchProfileVisible}
				onClose={() => setSwitchProfileVisible(false)}
				onSelectProfile={handleSelectProfile}
				selectedProfileId={selectedProfileId}
			/>

			{/* PATIENT ERROR MODAL */}
			<StatusModal
				visible={patientErrorModalVisible}
				status="error"
				title={validationModalTitle}
				description={validationModalMessage}
				submitText="Try Again"
				onSubmit={() => {
					setPatientErrorModalVisible(false)
					void fetchProfile()
				}}
				cancelText="Close"
				onCancel={() => setPatientErrorModalVisible(false)}
			/>
		</View>
	)
}

const styles = StyleSheet.create({
	/* Nurse Assignment Preference Styles */
	sectionSubheading: {
		fontSize: 12.5,
		color: '#64748B',
		marginTop: -8,
		marginBottom: 2,
		lineHeight: 18,
	},
	nurseChoiceContainer: {
		gap: 10,
	},
	selectedNurseCardContainer: {
		marginTop: 8,
		backgroundColor: '#FFFFFF',
		borderWidth: 1.5,
		borderColor: '#0C7C7C',
		borderRadius: 14,
		padding: 12,
		shadowColor: '#0C7C7C',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.05,
		shadowRadius: 6,
		elevation: 2,
	},
	selectedNurseCardHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingBottom: 10,
		marginBottom: 10,
		borderBottomWidth: 1,
		borderBottomColor: '#F1F5F9',
	},
	selectedBadgeRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 5,
	},
	selectedBadgeLabel: {
		fontSize: 11.5,
		fontWeight: '700',
		color: '#047857',
	},
	changeNurseBtn: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
		backgroundColor: '#F0FDFA',
		borderWidth: 1,
		borderColor: '#CCFBF1',
		paddingHorizontal: 10,
		paddingVertical: 4,
		borderRadius: 8,
	},
	changeNurseBtnText: {
		fontSize: 11.5,
		fontWeight: '700',
		color: '#0C7C7C',
	},
	selectedNurseRow: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	selectedNurseAvatar: {
		width: 46,
		height: 46,
		borderRadius: 23,
		marginRight: 12,
		backgroundColor: '#F1F5F9',
	},
	selectedNurseInfo: {
		flex: 1,
	},
	nameAndBadge: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		marginBottom: 3,
	},
	selectedNurseName: {
		fontSize: 14.5,
		fontWeight: '700',
		color: '#0F172A',
	},
	rnChip: {
		backgroundColor: '#CCFBF1',
		paddingHorizontal: 6,
		paddingVertical: 2,
		borderRadius: 4,
	},
	rnChipText: {
		fontSize: 10.5,
		fontWeight: '700',
		color: '#0F766E',
	},
	selectedNurseStats: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 5,
	},
	statItem: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 2,
	},
	statTextBold: {
		fontSize: 11.5,
		fontWeight: '700',
		color: '#1E293B',
	},
	statTextMuted: {
		fontSize: 11,
		color: '#64748B',
	},
	statDot: {
		fontSize: 10,
		color: '#CBD5E1',
	},
	statText: {
		fontSize: 11.5,
		color: '#64748B',
	},
	browsePromptCard: {
		marginTop: 8,
		backgroundColor: '#F0FDFA',
		borderWidth: 1.5,
		borderColor: '#99F6E4',
		borderStyle: 'dashed',
		borderRadius: 14,
		padding: 12,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	browsePromptLeft: {
		flexDirection: 'row',
		alignItems: 'center',
		flex: 1,
	},
	browseIconCircle: {
		width: 36,
		height: 36,
		borderRadius: 18,
		backgroundColor: '#CCFBF1',
		alignItems: 'center',
		justifyContent: 'center',
		marginRight: 10,
	},
	browsePromptTextCol: {
		flex: 1,
	},
	browsePromptTitle: {
		fontSize: 13.5,
		fontWeight: '700',
		color: '#0F766E',
	},
	browsePromptSub: {
		fontSize: 11.5,
		color: '#115E59',
		marginTop: 1,
	},
	browsePromptCta: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 2,
		backgroundColor: '#FFFFFF',
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 6,
		borderWidth: 1,
		borderColor: '#CCFBF1',
	},
	browsePromptCtaText: {
		fontSize: 11.5,
		fontWeight: '700',
		color: '#0F766E',
	},
	container: {
		flex: 1,
		backgroundColor: '#FFFFFF',
	},
	scrollContent: {
		paddingHorizontal: 0,
		paddingTop: 12,
	},
	scrollContentTablet: {
		maxWidth: 640,
		alignSelf: 'center',
		width: '100%',
	},
	stepperContainer: {
		paddingHorizontal: 16,
		marginBottom: 4,
	},

	/* MOBILE-FIRST FULL-WIDTH SECTION BLOCKS */
	sectionBlock: {
		backgroundColor: '#FFFFFF',
		paddingHorizontal: 16,
		paddingVertical: 16,
		gap: 14,
	},
	sectionDividerBar: {
		height: 8,
		backgroundColor: '#F4F6F9',
		borderTopWidth: 1,
		borderBottomWidth: 1,
		borderColor: '#E2E8F0',
	},
	sectionHeaderRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	sectionHeading: {
		fontSize: 16.5,
		fontWeight: '700',
		color: '#0F172A',
		letterSpacing: -0.2,
	},
	actionBtn: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	actionBtnText: {
		fontSize: 13,
		fontWeight: '600',
		color: '#2B6F71',
		letterSpacing: 0.1,
	},

	/* SERVICES LIST */
	servicesList: {
		gap: 12,
	},
	emptyBox: {
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 20,
		gap: 6,
	},
	emptyText: {
		fontSize: 13,
		color: '#64748B',
	},

	/* PATIENT RECIPIENT PROFILE */
	patientProfileBox: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#F8FAFC',
		borderRadius: 12,
		padding: 14,
		gap: 14,
	},
	patientAvatar: {
		width: 48,
		height: 48,
		borderRadius: 24,
	},
	patientInfoCol: {
		flex: 1,
		gap: 3,
	},
	patientNameRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
	},
	patientName: {
		fontSize: 15.5,
		fontWeight: '700',
		color: '#0F172A',
	},
	relationChip: {
		backgroundColor: 'rgba(43, 111, 113, 0.12)',
		paddingHorizontal: 8,
		paddingVertical: 3,
		borderRadius: 6,
	},
	relationText: {
		fontSize: 11.5,
		fontWeight: '700',
		color: '#2B6F71',
	},
	patientMetaText: {
		fontSize: 12.5,
		color: '#64748B',
		marginTop: 2,
	},

	/* DISPATCH MODE TOGGLE CONTROL */
	modeToggleRow: {
		flexDirection: 'row',
		backgroundColor: '#F1F5F9',
		borderRadius: 12,
		padding: 4,
		gap: 4,
	},
	modeTab: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 10,
		borderRadius: 10,
		gap: 6,
	},
	modeTabActive: {
		backgroundColor: '#2B6F71',
	},
	modeTabText: {
		fontSize: 13.5,
		fontWeight: '600',
		color: '#2B6F71',
	},
	modeTabTextActive: {
		color: '#FFFFFF',
		fontWeight: '700',
	},
	helperBanner: {
		flexDirection: 'row',
		alignItems: 'center',
		borderRadius: 10,
		padding: 10,
		gap: 8,
	},
	instantBannerBg: {
		backgroundColor: 'rgba(6, 95, 70, 0.08)',
	},
	scheduledBannerBg: {
		backgroundColor: 'rgba(30, 64, 175, 0.08)',
	},
	helperText: {
		fontSize: 11.5,
		flex: 1,
		lineHeight: 16,
	},
	instantHelperColor: {
		color: '#065F46',
	},
	scheduledHelperColor: {
		color: '#1E40AF',
	},

	/* LOCATION BLOCK */
	locationSummaryBox: {
		backgroundColor: '#F8FAFC',
		borderRadius: 12,
		padding: 14,
		gap: 12,
	},
	locationItem: {
		flexDirection: 'row',
		gap: 12,
		alignItems: 'flex-start',
	},
	locationIconWrap: {
		width: 34,
		height: 34,
		borderRadius: 17,
		backgroundColor: '#E6F4F4',
		justifyContent: 'center',
		alignItems: 'center',
	},
	locationTextCol: {
		flex: 1,
		gap: 3,
	},
	locationHeaderRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	locationTitle: {
		fontSize: 13.5,
		fontWeight: '700',
		color: '#0F172A',
	},
	changeLinkText: {
		fontSize: 12.5,
		fontWeight: '600',
		color: '#2B6F71',
	},
	locationAddressText: {
		fontSize: 12.5,
		color: '#64748B',
		lineHeight: 18,
	},
	locationDivider: {
		height: 1,
		backgroundColor: '#E2E8F0',
	},
	locationTimeVal: {
		fontSize: 13,
		color: '#2B6F71',
		fontWeight: '700',
	},

	/* PAYMENT SUMMARY */
	billingList: {
		gap: 10,
	},
	billingRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	billingLabel: {
		fontSize: 13.5,
		color: '#475569',
	},
	billingVal: {
		fontSize: 13.5,
		fontWeight: '600',
		color: '#0F172A',
	},
	totalDivider: {
		height: 1,
		backgroundColor: '#E2E8F0',
		marginVertical: 4,
	},
	totalRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	totalLabel: {
		fontSize: 16,
		fontWeight: '700',
		color: '#0F172A',
	},
	totalVal: {
		fontSize: 19,
		fontWeight: '800',
		color: '#2B6F71',
	},
	guaranteeBox: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: 'rgba(5, 150, 105, 0.08)',
		borderRadius: 12,
		padding: 12,
		gap: 10,
		marginTop: 6,
	},
	guaranteeText: {
		fontSize: 12,
		color: '#047857',
		fontWeight: '600',
		flex: 1,
		lineHeight: 17,
	},

	/* STICKY BOTTOM CHECKOUT FOOTER */
	bottomBar: {
		position: 'absolute',
		bottom: 0,
		left: 0,
		right: 0,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		backgroundColor: '#FFFFFF',
		paddingHorizontal: 20,
		paddingTop: 12,
		borderTopWidth: 1,
		borderTopColor: '#E2E8F0',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: -3 },
		shadowOpacity: 0.06,
		shadowRadius: 6,
		elevation: 8,
	},
	bottomBarPriceCol: {
		justifyContent: 'center',
	},
	bottomBarTotalLabel: {
		fontSize: 11,
		fontWeight: '600',
		color: '#64748B',
		letterSpacing: 0.5,
	},
	bottomBarTotalVal: {
		fontSize: 20,
		fontWeight: '800',
		color: '#0F172A',
	},
	continueBtn: {
		minWidth: 180,
	},

	/* MODALS */
	modalFormContent: {
		gap: 12,
		paddingTop: 8,
	},
	modalSaveBtn: {
		marginTop: 8,
	},
	addressSectionSubtitle: {
		fontSize: 11,
		fontWeight: '700',
		color: '#64748B',
		letterSpacing: 0.5,
		marginBottom: 2,
	},
	addressListContainer: {
		gap: 10,
	},
	addressCardItem: {
		flexDirection: 'row',
		alignItems: 'center',
		padding: 12,
		borderRadius: 14,
		backgroundColor: '#F8FAFC',
		borderWidth: 1.5,
		borderColor: '#E2E8F0',
		gap: 12,
	},
	addressCardItemSelected: {
		backgroundColor: '#F0F9F9',
		borderColor: '#0C7C7C',
	},
	addressCardItemCurrent: {
		borderStyle: 'dashed',
	},
	addressIconWrap: {
		width: 36,
		height: 36,
		borderRadius: 18,
		backgroundColor: '#E2E8F0',
		alignItems: 'center',
		justifyContent: 'center',
	},
	addressIconWrapSelected: {
		backgroundColor: '#0C7C7C',
	},
	addressTextCol: {
		flex: 1,
		gap: 2,
	},
	addressLabelText: {
		fontSize: 14,
		fontWeight: '700',
		color: '#0F172A',
	},
	addressLabelTextSelected: {
		color: '#0C7C7C',
	},
	addressValText: {
		fontSize: 12,
		color: '#64748B',
		lineHeight: 16,
	},
	gpsPill: {
		backgroundColor: '#E6F4F4',
		paddingHorizontal: 6,
		paddingVertical: 2,
		borderRadius: 4,
	},
	gpsPillText: {
		fontSize: 9.5,
		fontWeight: '800',
		color: '#0C7C7C',
	},
	radioDotOuter: {
		width: 20,
		height: 20,
		borderRadius: 10,
		borderWidth: 2,
		borderColor: '#CBD5E1',
		alignItems: 'center',
		justifyContent: 'center',
	},
	radioDotOuterSelected: {
		borderColor: '#0C7C7C',
	},
	radioDotInner: {
		width: 10,
		height: 10,
		borderRadius: 5,
		backgroundColor: '#0C7C7C',
	},
})
