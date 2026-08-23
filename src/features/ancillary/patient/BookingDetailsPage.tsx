import React, { useState, useEffect, useMemo } from 'react'
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
import AsyncStorage from '@react-native-async-storage/async-storage'
import { getPatientDetails, getPatientAddresses } from '../../../features/profile/patient/PatientProfileService'
import { ROUTES } from '../../../navigation/routes'
import {
	AppBottomSheet,
	AppButton,
	AppInput,
	AppScreenHeader,
	AppSelect,
	AppSelectOption,
	AppTypography,
	PatientProfileSelectorBottomSheet,
} from '../../../components/common'
import DateSlotPicker from '../../../components/common/DateSlotPicker'
import { SlotGroup } from '../../doctor/doctorService'
import { ServiceProcedureItem } from '../components/AllServiceCard'
import { BookingProgressStepper } from '../components/BookingProgressStepper'

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

const SAVED_ADDRESSES = [
	{
		id: 'addr1',
		label: 'Home',
		address: '42 Healthcare Avenue, Flat 3B, Sector 18, New Delhi - 110001',
		icon: 'home-outline',
	},
	{
		id: 'addr2',
		label: 'Work',
		address: 'Tech Park Tower B, 5th Floor, Cyber City, Gurugram - 122002',
		icon: 'briefcase-outline',
	},
]

const ADDRESS_SELECT_OPTIONS: AppSelectOption[] = SAVED_ADDRESSES.map((addr) => ({
	label: `${addr.label} (${addr.address})`,
	value: addr.id,
}))

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const ANCILLARY_SLOTS: SlotGroup[] = [
	{
		label: 'Morning Slots',
		slots: [
			{ id: 's1', start_time: '9:00 AM – 10:00 AM', end_time: '', status: 'AVAILABLE' },
			{ id: 's2', start_time: '11:00 AM – 12:00 PM', end_time: '', status: 'AVAILABLE' },
		],
	},
	{
		label: 'Afternoon & Evening Slots',
		slots: [
			{ id: 's3', start_time: '2:00 PM – 3:00 PM', end_time: '', status: 'AVAILABLE' },
			{ id: 's4', start_time: '5:00 PM – 6:00 PM', end_time: '', status: 'AVAILABLE' },
			{ id: 's5', start_time: '7:00 PM – 8:00 PM', end_time: '', status: 'AVAILABLE' },
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
	const initialServices: ServiceProcedureItem[] =
		(routeParams.services && routeParams.services.length > 0)
			? routeParams.services
			: (routeParams.selectedServices && routeParams.selectedServices.length > 0)
				? routeParams.selectedServices
				: (routeParams.service ? [routeParams.service] : DEFAULT_MOCK_SERVICES)

	// 1. Multiple Selected Services State
	const [services, setServices] = useState<ServiceProcedureItem[]>(initialServices)

	// 2. Patient Details State
	const [patient, setPatient] = useState<{
		publicId?: string
		name: string
		age: string
		gender: string
		bloodGroup: string
		relationship: string
		avatar?: string
	}>({
		publicId: undefined,
		name: 'Patient Account Holder',
		age: '',
		gender: '',
		bloodGroup: '',
		relationship: 'Self',
		avatar: undefined,
	})

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
	const [tempPatientName, setTempPatientName] = useState(patient.name)
	const [tempPatientAge, setTempPatientAge] = useState(patient.age)
	const [tempPatientGender, setTempPatientGender] = useState(patient.gender)
	const [tempPatientRel, setTempPatientRel] = useState(patient.relationship)

	// Dynamic Saved Addresses State
	const [savedAddressesList, setSavedAddressesList] = useState(SAVED_ADDRESSES)
	const [addressOptions, setAddressOptions] = useState<AppSelectOption[]>(ADDRESS_SELECT_OPTIONS)

	useEffect(() => {
		const fetchProfile = async () => {
			let loadedPatient = {
				publicId: undefined as string | undefined,
				name: 'Patient Account Holder',
				age: '',
				gender: '',
				bloodGroup: '',
				relationship: 'Self',
				avatar: undefined as string | undefined,
			}

			try {
				const apiAddresses = await getPatientAddresses()
				if (apiAddresses && apiAddresses.length > 0) {
					const formattedList = apiAddresses.map((addr: any) => ({
						id: String(addr.id),
						label: addr.label || addr.title || 'Home',
						address: addr.address_line ? `${addr.address_line}, ${addr.city || ''} ${addr.pincode || ''}` : `${addr.address_line_1 || ''}, ${addr.city || ''}`,
						latitude: addr.latitude != null ? Number(addr.latitude) : undefined,
						longitude: addr.longitude != null ? Number(addr.longitude) : undefined,
						icon: (addr.label || addr.title || '').toLowerCase().includes('work') ? 'briefcase-outline' : 'home-outline',
					}))
					setSavedAddressesList(formattedList)

					const selectOptions: AppSelectOption[] = formattedList.map((addr) => ({
						label: `${addr.label} (${addr.address})`,
						value: addr.id,
					}))
					setAddressOptions(selectOptions)

					const firstAddr = formattedList[0]
					setVisit((prev) => ({
						...prev,
						addressId: firstAddr.id,
						addressLabel: firstAddr.label,
						address: firstAddr.address,
						latitude: firstAddr.latitude,
						longitude: firstAddr.longitude,
					}))
				}
			} catch (addrErr) {
				console.log('[BookingDetailsPage] Saved addresses API notice:', addrErr)
			}

			try {
				const response = await getPatientDetails()
				if (response.success && response.data) {
					const personal = response.data.personal
					if (personal) {
						let parsedAge = ''
						if (personal.date_of_birth) {
							const dob = new Date(personal.date_of_birth)
							const diff = Date.now() - dob.getTime()
							parsedAge = String(Math.abs(new Date(diff).getUTCFullYear() - 1970))
						}

						loadedPatient = {
							publicId: response.data.public_id || personal.public_id || response.data.id,
							name: personal.name || 'Patient Account Holder',
							age: parsedAge,
							gender: personal.gender || '',
							bloodGroup: personal.blood_group || '',
							relationship: 'Self',
							avatar: personal.avatar,
						}
						setPatient(loadedPatient)
						setTempPatientName(loadedPatient.name)
						setTempPatientAge(loadedPatient.age)
						setTempPatientGender(loadedPatient.gender)
						setTempPatientRel(loadedPatient.relationship)
						return
					}
				}
			} catch (e) {
				console.error('Failed to fetch patient profile details from API', e)
			}

			try {
				const userRaw = await AsyncStorage.getItem('user')
				if (userRaw) {
					const userData = JSON.parse(userRaw)
					loadedPatient = {
						publicId: userData.public_id || userData.publicId,
						name: userData.name || 'John Doe',
						age: userData.age || '45',
						gender: userData.gender || 'Male',
						bloodGroup: userData.bloodGroup || 'O+',
						relationship: 'Self',
						avatar: userData.avatar || undefined,
					}
					setPatient(loadedPatient)
					setTempPatientName(loadedPatient.name)
					setTempPatientAge(loadedPatient.age)
					setTempPatientGender(loadedPatient.gender)
					setTempPatientRel(loadedPatient.relationship)
				}
			} catch (err) {
				console.error('Failed to load user profile from AsyncStorage', err)
			}
		}

		fetchProfile()
	}, [])

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
		if (navigation.canGoBack()) {
			navigation.goBack()
		} else {
			navigation.navigate(ROUTES.STACK.ANCILLARY_SERVICES, {
				serviceKey: 'nursing',
				serviceLabel: 'Nursing Care',
			})
		}
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
		setPatient((prev) => ({
			...prev,
			name: tempPatientName || prev.name,
			age: tempPatientAge || prev.age,
			gender: tempPatientGender || prev.gender,
			relationship: tempPatientRel || prev.relationship,
		}))
		setEditPatientVisible(false)
	}

	const [selectedDateObj, setSelectedDateObj] = useState<Date>(new Date())

	const handleSaveVisitDetails = (addressId: string, newDate: Date, timeSlot: string) => {
		const selectedAddrObj = savedAddressesList.find((a) => a.id === addressId) || SAVED_ADDRESSES.find((a) => a.id === addressId)
		setSelectedDateObj(newDate)

		const dayStr = `${newDate.getDate()} ${MONTH_NAMES[newDate.getMonth()]} ${newDate.getFullYear()}`

		setVisit({
			addressId,
			addressLabel: selectedAddrObj?.label || 'Home',
			address: selectedAddrObj?.address || visit.address,
			latitude: (selectedAddrObj as any)?.latitude,
			longitude: (selectedAddrObj as any)?.longitude,
			dateId: 'custom',
			date: dayStr,
			timeSlot: timeSlot || '09:00 AM - 10:00 AM',
			timeBadge: 'Confirmed',
		})
		setEditVisitVisible(false)
	}

	const handleContinueToPayment = () => {
		const bookingPayload = {
			services,
			patient,
			visit,
			charges,
			bookingType,
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
					<BookingProgressStepper currentStep={2} />
				</View>

				{/* 1. SECTION: SELECTED PROCEDURES */}
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
							{services.map((item, index) => (
								<View key={item.id} style={[styles.serviceRow, index > 0 && styles.serviceRowBorder]}>
									<Image source={{ uri: item.image }} style={styles.serviceThumb} resizeMode="cover" />
									<View style={styles.serviceTextCol}>
										<View style={styles.titleRow}>
											<AppTypography variant="h4" style={styles.serviceTitle} numberOfLines={1}>
												{item.title}
											</AppTypography>
											{services.length > 1 && (
												<TouchableOpacity onPress={() => handleRemoveService(item.id)} activeOpacity={0.7}>
													<Ionicons name="trash-outline" size={17} color="#D32F2F" />
												</TouchableOpacity>
											)}
										</View>
										<AppTypography variant="caption" style={styles.serviceDesc} numberOfLines={1}>
											{item.description}
										</AppTypography>
										<View style={styles.serviceMetaRow}>
											<View style={styles.durationPill}>
												<Ionicons name="time-outline" size={12} color="#546E7A" />
												<AppTypography variant="caption" style={styles.durationText}>
													{item.duration || '30-45 mins'}
												</AppTypography>
											</View>
											<AppTypography variant="h4" style={styles.servicePrice}>
												{item.price}
											</AppTypography>
										</View>
									</View>
								</View>
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
				<View style={styles.sectionDividerBar} />

				{/* 2. SECTION: PATIENT RECIPIENT PROFILE */}
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
								{patient.age} Yrs  •  {patient.gender}  •  Blood Group: {patient.bloodGroup}
							</AppTypography>
						</View>
					</View>
				</View>

				{/* 8px GREY SECTION DIVIDER BAR */}
				<View style={styles.sectionDividerBar} />

				{/* 3. SECTION: CARE DISPATCH MODE & LOCATION */}
				<View style={styles.sectionBlock}>
					<View style={styles.sectionHeaderRow}>
						<AppTypography variant="h3" style={styles.sectionHeading}>
							Care Mode & Location
						</AppTypography>
					</View>

					{/* CARE MODE SEGMENTED CONTROL */}
					<View style={styles.modeToggleRow}>
						<TouchableOpacity
							style={[styles.modeTab, bookingType === 'INSTANT' && styles.modeTabActive]}
							onPress={() => {
								setBookingType('INSTANT')
								setVisit((prev) => ({ ...prev, timeBadge: 'Instant Dispatch (15-30 mins)' }))
							}}
							activeOpacity={0.88}
						>
							<Ionicons name="flash" size={15} color={bookingType === 'INSTANT' ? '#FFFFFF' : '#2B6F71'} />
							<AppTypography variant="h4" style={[styles.modeTabText, bookingType === 'INSTANT' && styles.modeTabTextActive]}>
								Instant Care
							</AppTypography>
						</TouchableOpacity>

						<TouchableOpacity
							style={[styles.modeTab, bookingType === 'SCHEDULED' && styles.modeTabActive]}
							onPress={() => {
								setBookingType('SCHEDULED')
								setVisit((prev) => ({ ...prev, timeBadge: 'Scheduled Appointment' }))
								setEditVisitVisible(true)
							}}
							activeOpacity={0.88}
						>
							<Ionicons name="calendar" size={15} color={bookingType === 'SCHEDULED' ? '#FFFFFF' : '#2B6F71'} />
							<AppTypography variant="h4" style={[styles.modeTabText, bookingType === 'SCHEDULED' && styles.modeTabTextActive]}>
								Schedule Visit
							</AppTypography>
						</TouchableOpacity>
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

				{/* 4. SECTION: PAYMENT SUMMARY */}
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
								Taxes & Operational Fee (5% GST)
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
					Proceed to Payment ➔
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
				title={bookingType === 'INSTANT' ? 'Change Visit Address' : 'Configure Schedule & Address'}
			>
				<View style={styles.modalFormContent}>
					<AppSelect
						label="Select Visit Address"
						value={visit.addressId}
						options={addressOptions}
						onSelect={(id) => {
							const selected = savedAddressesList.find((a) => a.id === id)
							if (selected) {
								setVisit((prev) => ({
									...prev,
									addressId: selected.id,
									addressLabel: selected.label,
									address: selected.address,
								}))
							}
						}}
					/>

					{bookingType === 'SCHEDULED' && (
						<DateSlotPicker
							selectedDate={selectedDateObj}
							onDateChange={(newDate: Date) => setSelectedDateObj(newDate)}
							selectedTime={visit.timeSlot}
							onTimeChange={(timeStr: any) => {
								handleSaveVisitDetails(visit.addressId, selectedDateObj, String(timeStr || '09:00 AM - 10:00 AM'))
							}}
							availableSlots={ANCILLARY_SLOTS}
						/>
					)}

					{bookingType === 'INSTANT' && (
						<AppButton variant="primary" onPress={() => setEditVisitVisible(false)} style={styles.modalSaveBtn}>
							Confirm Location
						</AppButton>
					)}
				</View>
			</AppBottomSheet>

			{/* PATIENT PROFILE SELECTOR BOTTOM SHEET */}
			<PatientProfileSelectorBottomSheet
				visible={switchProfileVisible}
				onClose={() => setSwitchProfileVisible(false)}
				onSelectProfile={handleSelectProfile}
				selectedProfileId={selectedProfileId}
			/>
		</View>
	)
}

const styles = StyleSheet.create({
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
	serviceRow: {
		flexDirection: 'row',
		gap: 14,
		alignItems: 'center',
	},
	serviceRowBorder: {
		paddingTop: 12,
		borderTopWidth: 1,
		borderTopColor: '#F1F5F9',
	},
	serviceThumb: {
		width: 72,
		height: 72,
		borderRadius: 12,
		backgroundColor: '#F1F5F9',
	},
	serviceTextCol: {
		flex: 1,
		gap: 4,
	},
	titleRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	serviceTitle: {
		fontSize: 15,
		fontWeight: '700',
		color: '#0F172A',
		flex: 1,
	},
	serviceDesc: {
		fontSize: 12.5,
		color: '#64748B',
		lineHeight: 17,
	},
	serviceMetaRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginTop: 4,
	},
	durationPill: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
		backgroundColor: '#F1F5F9',
		paddingHorizontal: 8,
		paddingVertical: 3,
		borderRadius: 6,
	},
	durationText: {
		fontSize: 11.5,
		color: '#475569',
		fontWeight: '500',
	},
	servicePrice: {
		fontSize: 16,
		fontWeight: '700',
		color: '#0F172A',
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
})
