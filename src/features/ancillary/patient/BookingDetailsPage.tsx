import React, { useState, useEffect } from 'react'
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
	CommonCard,
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
	const [patient, setPatient] = useState({
		name: 'John Doe',
		age: '45',
		gender: 'Male',
		bloodGroup: 'O+',
		relationship: 'Self',
		avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
	})

	// 3. Booking Dispatch Mode State (INSTANT vs SCHEDULED)
	const [bookingType, setBookingType] = useState<'INSTANT' | 'SCHEDULED'>('INSTANT')

	// 4. Visit Details State
	const [visit, setVisit] = useState({
		addressId: 'addr1',
		addressLabel: 'Home',
		address: '42 Healthcare Avenue, Flat 3B, Sector 18, New Delhi - 110001',
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
				name: 'John Doe',
				age: '45',
				gender: 'Male',
				bloodGroup: 'O+',
				relationship: 'Self',
				avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
			}

			try {
				const apiAddresses = await getPatientAddresses()
				if (apiAddresses && apiAddresses.length > 0) {
					const formattedList = apiAddresses.map((addr: any) => ({
						id: String(addr.id),
						label: addr.label || addr.title || 'Home',
						address: addr.address_line ? `${addr.address_line}, ${addr.city || ''} ${addr.pincode || ''}` : `${addr.address_line_1 || ''}, ${addr.city || ''}`,
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
						let parsedAge = '45'
						if (personal.date_of_birth) {
							const dob = new Date(personal.date_of_birth)
							const diff = Date.now() - dob.getTime()
							parsedAge = String(Math.abs(new Date(diff).getUTCFullYear() - 1970))
						}

						loadedPatient = {
							name: personal.name || 'John Doe',
							age: parsedAge,
							gender: personal.gender || 'Male',
							bloodGroup: personal.blood_group || 'O+',
							relationship: 'Self',
							avatar: personal.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
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
						name: userData.name || 'John Doe',
						age: userData.age || '45',
						gender: userData.gender || 'Male',
						bloodGroup: userData.bloodGroup || 'O+',
						relationship: 'Self',
						avatar: userData.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
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


	// Dynamic Charges Calculation based on ALL selected services
	const basePriceSum = services.reduce((sum, item) => {
		const numeric = parseInt(item.price.replace(/[^0-9]/g, '')) || 499
		return sum + numeric
	}, 0)
	const visitFee = 150
	const taxes = 18
	const totalAmount = basePriceSum + visitFee + taxes

	const charges = {
		basePrice: `₹${basePriceSum}`,
		visitFee: `₹${visitFee}`,
		taxes: `₹${taxes}`,
		totalAmount: `₹${totalAmount}`,
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
		setPatient({
			name: selected.name,
			age: String(selected.age),
			gender: selected.gender,
			bloodGroup: selected.bloodGroup || 'O+',
			relationship: selected.relationship,
			avatar: selected.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
		})
	}

	const handleOpenPatientEdit = () => {
		setTempPatientName(patient.name)
		setTempPatientAge(patient.age)
		setTempPatientGender(patient.gender)
		setTempPatientRel(patient.relationship)
		setEditPatientVisible(true)
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
				{/* 1. SECTION: SELECTED SERVICES SUMMARY */}
				<View style={styles.sectionHeaderRow}>
					<AppTypography variant="h3" style={styles.sectionHeading}>
						Selected Procedures & Services ({services.length})
					</AppTypography>
					<TouchableOpacity style={styles.headerActionBtn} onPress={handleEditServices} activeOpacity={0.7}>
						<MaterialCommunityIcons name="plus-circle-outline" size={15} color="#1F5F68" />
						<AppTypography variant="caption" style={styles.actionBtnText}>
							Add / Change
						</AppTypography>
					</TouchableOpacity>
				</View>

				{services.length > 0 ? (
					<View style={styles.servicesListContainer}>
						{services.map((item, index) => (
							<View key={item.id} style={styles.serviceItemFlat}>
								{index > 0 && <View style={styles.itemDivider} />}
								<View style={styles.serviceItemRow}>
									<View style={styles.serviceTextCol}>
										<View style={styles.serviceTitleRow}>
											<AppTypography variant="h4" style={styles.serviceTitle} numberOfLines={1}>
												{item.title}
											</AppTypography>
											{services.length > 1 && (
												<TouchableOpacity
													style={styles.removeBtn}
													onPress={() => handleRemoveService(item.id)}
													activeOpacity={0.7}
												>
													<Ionicons name="trash-outline" size={17} color="#D32F2F" />
												</TouchableOpacity>
											)}
										</View>
										<AppTypography variant="caption" style={styles.serviceDesc} numberOfLines={2}>
											{item.description}
										</AppTypography>

										<View style={styles.metaBadgeRow}>
											<View style={styles.metaItem}>
												<Ionicons name="time-outline" size={12} color="#526062" />
												<AppTypography variant="caption" style={styles.metaText}>
													{item.duration || '30-45 mins'}
												</AppTypography>
											</View>
											<View style={styles.metaItem}>
												<Ionicons name="shield-checkmark" size={12} color="#1F5F68" />
												<AppTypography variant="caption" style={styles.metaText}>
													Verified Specialist
												</AppTypography>
											</View>
										</View>
									</View>
								</View>

								<View style={styles.serviceFooterRow}>
									<AppTypography variant="h3" style={styles.priceVal}>
										{item.price}
									</AppTypography>
								</View>
							</View>
						))}
					</View>
				) : (
					<View style={styles.emptyBox}>
						<MaterialCommunityIcons name="medical-bag" size={32} color="#94A3B8" />
						<AppTypography variant="caption" style={styles.emptyText}>
							No services selected. Add services to configure your appointment.
						</AppTypography>
					</View>
				)}

				<View style={styles.sectionDivider} />

				{/* 2. SECTION: PATIENT PROFILE */}
				<View style={styles.sectionHeaderRow}>
					<AppTypography variant="h3" style={styles.sectionHeading}>
						Patient Profile
					</AppTypography>
					<TouchableOpacity style={styles.headerActionBtn} onPress={() => setSwitchProfileVisible(true)} activeOpacity={0.7}>
						<MaterialCommunityIcons name="account-switch-outline" size={15} color="#1F5F68" />
						<AppTypography variant="caption" style={styles.actionBtnText}>
							Switch Profile
						</AppTypography>
					</TouchableOpacity>
				</View>


				<View style={styles.patientProfileContainer}>
					<Image source={{ uri: patient.avatar }} style={styles.patientAvatar} resizeMode="cover" />
					<View style={styles.patientInfoCol}>
						<View style={styles.patientNameRow}>
							<AppTypography variant="h3" style={styles.patientName}>
								{patient.name}
							</AppTypography>
							<View style={styles.relationshipChip}>
								<AppTypography variant="caption" style={styles.relationshipText}>
									{patient.relationship}
								</AppTypography>
							</View>
						</View>
						<AppTypography variant="caption" style={styles.patientMeta}>
							{patient.age} Yrs  •  {patient.gender}  •  Blood Group: {patient.bloodGroup}
						</AppTypography>
					</View>
				</View>

				<View style={styles.sectionDivider} />

				{/* 3. SECTION: VISIT DISPATCH TYPE & SCHEDULE */}
				<View style={styles.sectionHeaderRow}>
					<AppTypography variant="h3" style={styles.sectionHeading}>
						Booking Mode & Schedule
					</AppTypography>
					<TouchableOpacity
						style={styles.headerActionBtn}
						onPress={() => setEditVisitVisible(true)}
						activeOpacity={0.7}
					>
						<MaterialCommunityIcons
							name={bookingType === 'INSTANT' ? 'map-marker-outline' : 'pencil-outline'}
							size={15}
							color="#1F5F68"
						/>
						<AppTypography variant="caption" style={styles.actionBtnText}>
							{bookingType === 'INSTANT' ? 'Change Address' : 'Modify Schedule & Address'}
						</AppTypography>
					</TouchableOpacity>
				</View>

				{/* INTERACTIVE DISPATCH MODE TOGGLE SWITCHER */}
				<View style={styles.dispatchToggleWrap}>
					<TouchableOpacity
						style={[styles.dispatchToggleTab, bookingType === 'INSTANT' && styles.dispatchToggleTabActive]}
						onPress={() => {
							setBookingType('INSTANT')
							setVisit((prev) => ({ ...prev, timeBadge: 'Instant Dispatch (15-30 mins)' }))
						}}
						activeOpacity={0.88}
					>
						<Ionicons name="flash" size={16} color={bookingType === 'INSTANT' ? '#FFFFFF' : '#1F5F68'} />
						<AppTypography variant="h4" style={[styles.dispatchToggleText, bookingType === 'INSTANT' && styles.dispatchToggleTextActive]}>
							Instant Care
						</AppTypography>
					</TouchableOpacity>

					<TouchableOpacity
						style={[styles.dispatchToggleTab, bookingType === 'SCHEDULED' && styles.dispatchToggleTabActive]}
						onPress={() => {
							setBookingType('SCHEDULED')
							setVisit((prev) => ({ ...prev, timeBadge: 'Scheduled Appointment' }))
							setEditVisitVisible(true)
						}}
						activeOpacity={0.88}
					>
						<Ionicons name="calendar" size={16} color={bookingType === 'SCHEDULED' ? '#FFFFFF' : '#1F5F68'} />
						<AppTypography variant="h4" style={[styles.dispatchToggleText, bookingType === 'SCHEDULED' && styles.dispatchToggleTextActive]}>
							Schedule Visit
						</AppTypography>
					</TouchableOpacity>
				</View>

				{/* DISPATCH MODE HELPER BANNER */}
				<View style={[styles.dispatchHelperBanner, bookingType === 'INSTANT' ? styles.instantBannerBg : styles.scheduledBannerBg]}>
					<Ionicons
						name={bookingType === 'INSTANT' ? 'information-circle' : 'time'}
						size={18}
						color={bookingType === 'INSTANT' ? '#065F46' : '#1E40AF'}
					/>
					<AppTypography variant="caption" style={[styles.dispatchHelperText, bookingType === 'INSTANT' ? styles.instantHelperTextColor : styles.scheduledHelperTextColor]}>
						{bookingType === 'INSTANT'
							? '⚡ Instant Care Mode: Certified nurse nearby will be alerted immediately after booking.'
							: '📅 Scheduled Care Mode: Nurse will be assigned & dispatched at your chosen date & time slot.'}
					</AppTypography>
				</View>

				<View style={styles.visitSummaryBlock}>
					{/* Address Row */}
					<View style={styles.visitSummaryItem}>
						<View style={styles.visitIconBox}>
							<MaterialCommunityIcons name="map-marker" size={18} color="#1F5F68" />
						</View>
						<View style={styles.visitDetailsCol}>
							<View style={styles.addressLabelRow}>
								<AppTypography variant="h4" style={styles.visitDetailsHeading}>
									Selected Visit Address
								</AppTypography>
								<View style={styles.addressTypeBadge}>
									<AppTypography variant="caption" style={styles.addressTypeText}>
										{visit.addressLabel}
									</AppTypography>
								</View>
								<TouchableOpacity
									style={styles.changeAddressLinkBtn}
									onPress={() => setEditVisitVisible(true)}
									activeOpacity={0.7}
								>
									<AppTypography variant="caption" style={styles.changeAddressLinkText}>
										Change
									</AppTypography>
								</TouchableOpacity>
							</View>
							<AppTypography variant="caption" style={styles.visitDetailsVal}>
								{visit.address}
							</AppTypography>
						</View>
					</View>

					<View style={styles.visitItemSeparator} />

					{/* Date & Time Row */}
					<View style={styles.visitSummaryItem}>
						<View style={styles.visitIconBox}>
							<MaterialCommunityIcons
								name={bookingType === 'INSTANT' ? 'lightning-bolt' : 'calendar-clock'}
								size={18}
								color="#1F5F68"
							/>
						</View>
						<View style={styles.visitDetailsCol}>
							<AppTypography variant="h4" style={styles.visitDetailsHeading}>
								{bookingType === 'INSTANT' ? 'Care Dispatch Arrival Window' : 'Preferred Date & Time Slot'}
							</AppTypography>
							<View style={styles.visitTimeValRow}>
								<AppTypography variant="body" style={styles.visitTimeValText}>
									{bookingType === 'INSTANT'
										? 'Within 15 - 30 minutes of booking'
										: `${visit.date}  •  ${visit.timeSlot}`}
								</AppTypography>
								<View style={styles.timeStatusBadge}>
									<AppTypography variant="caption" style={styles.timeStatusText}>
										{visit.timeBadge}
									</AppTypography>
								</View>
							</View>
						</View>
					</View>
				</View>

				<View style={styles.sectionDivider} />

				{/* 4. SECTION: BILLING BREAKDOWN */}
				<View style={styles.billingCard}>
					<AppTypography variant="h4" style={styles.billingTitle}>
						Payment Summary
					</AppTypography>

					<View style={styles.billingRow}>
						<AppTypography variant="body" style={styles.billingLabel}>
							Procedure Base Charges ({services.length} item{services.length > 1 ? 's' : ''})
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

					<View style={styles.billingTotalRow}>
						<AppTypography variant="h3" style={styles.totalLabel}>
							Total Payable Amount
						</AppTypography>
						<AppTypography variant="h3" style={styles.totalVal}>
							{charges.totalAmount}
						</AppTypography>
					</View>
				</View>

				<View style={styles.guaranteeBox}>
					<MaterialCommunityIcons name="shield-check" size={20} color="#059669" />
					<AppTypography variant="caption" style={styles.guaranteeText}>
						100% Certified & Background Checked Healthcare Professionals. Cancellation available before service start.
					</AppTypography>
				</View>
			</ScrollView>

			{/* 7. Bottom Fixed Action Bar */}
			<View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
				<View style={styles.bottomBarPriceCol}>
					<AppTypography variant="caption" style={styles.bottomBarTotalLabel}>
						Total Price
					</AppTypography>
					<AppTypography variant="h2" style={styles.bottomBarTotalVal}>
						{charges.totalAmount}
					</AppTypography>
				</View>
				<AppButton
					variant="primary"
					disabled={services.length === 0}
					onPress={handleContinueToPayment}
					style={styles.continueBtn}
				>
					Confirm & Proceed →
				</AppButton>
			</View>

			{/* 8. Edit Patient Details Bottom Sheet */}
			<AppBottomSheet
				visible={editPatientVisible}
				title="Edit Patient Details"
				onClose={() => setEditPatientVisible(false)}
			>
				<View style={styles.sheetFormContainer}>
					<AppInput
						label="Patient Full Name"
						value={tempPatientName}
						onChangeText={setTempPatientName}
						fieldSize="form"
					/>
					<AppInput
						label="Age"
						keyboardType="numeric"
						value={tempPatientAge}
						onChangeText={setTempPatientAge}
						fieldSize="form"
					/>
					<AppSelect
						label="Gender"
						options={GENDER_OPTIONS}
						value={tempPatientGender}
						onSelect={setTempPatientGender}
						size="form"
					/>
					<AppSelect
						label="Relationship"
						options={RELATIONSHIP_OPTIONS}
						value={tempPatientRel}
						onSelect={setTempPatientRel}
						size="form"
					/>

					<AppButton
						variant="primary"
						formAction
						style={styles.saveSheetBtn}
						onPress={handleSavePatientDetails}
					>
						Save Patient Details
					</AppButton>
				</View>
			</AppBottomSheet>

			{/* 9. Edit Visit Details Bottom Sheet */}
			<EditVisitModal
				visible={editVisitVisible}
				bookingType={bookingType}
				currentAddressId={visit.addressId}
				currentDate={selectedDateObj}
				currentTimeSlot={visit.timeSlot}
				addressOptions={addressOptions}
				onClose={() => setEditVisitVisible(false)}
				onSave={handleSaveVisitDetails}
				onOpenMap={() => {
					setEditVisitVisible(false)
					navigation.navigate(ROUTES.STACK.LOCATION_SELECT)
				}}
			/>

			{/* 10. Patient Profile Selector Bottom Sheet */}
			<PatientProfileSelectorBottomSheet
				visible={switchProfileVisible}
				onClose={() => setSwitchProfileVisible(false)}
				selectedProfileId={selectedProfileId}
				onSelectProfile={(profile: any) => {
					setSelectedProfileId(profile.id)
					setPatient({
						name: profile.name || 'John Doe',
						age: String(profile.age || '45'),
						gender: profile.gender || 'Male',
						bloodGroup: profile.bloodGroup || 'O+',
						relationship: profile.relationship || 'Self',
						avatar: profile.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
					})
					setSwitchProfileVisible(false)
				}}
			/>
		</View>
	)
}

// Sub-Component: Edit Visit Details Bottom Sheet
interface EditVisitModalProps {
	visible: boolean
	bookingType: 'INSTANT' | 'SCHEDULED'
	currentAddressId: string
	currentDate: Date
	currentTimeSlot: string
	addressOptions?: AppSelectOption[]
	onClose: () => void
	onSave: (addressId: string, selectedDate: Date, timeSlot: string) => void
	onOpenMap: () => void
}

const EditVisitModal: React.FC<EditVisitModalProps> = ({
	visible,
	bookingType,
	currentAddressId,
	currentDate,
	currentTimeSlot,
	addressOptions,
	onClose,
	onSave,
	onOpenMap,
}) => {
	const { width } = useWindowDimensions()
	const isTablet = width >= 768

	const [selectedAddrId, setSelectedAddrId] = useState(currentAddressId)
	const [selectedDate, setSelectedDate] = useState<Date>(currentDate || new Date())
	const [selectedSlot, setSelectedSlot] = useState(currentTimeSlot)

	const isInstant = bookingType === 'INSTANT'

	return (
		<AppBottomSheet
			visible={visible}
			title={isInstant ? 'Select Visit Address' : 'Modify Schedule & Address'}
			onClose={onClose}
		>
			<View style={styles.sheetFormContainer}>
				{/* Address Section */}
				<View style={styles.sheetSectionHeaderRow}>
					<AppTypography variant="h4" style={styles.sheetSectionTitle}>
						{isInstant ? 'Select Delivery Address for Immediate Care' : 'Selected Visit Address'}
					</AppTypography>
					<TouchableOpacity style={styles.mapLinkBtn} onPress={onOpenMap} activeOpacity={0.7}>
						<Ionicons name="map-outline" size={14} color="#1F5F68" />
						<AppTypography variant="caption" style={styles.mapLinkText}>
							Choose on Map
						</AppTypography>
					</TouchableOpacity>
				</View>

				<AppSelect
					options={addressOptions || ADDRESS_SELECT_OPTIONS}
					value={selectedAddrId}
					onSelect={setSelectedAddrId}
					size="form"
				/>

				{isInstant ? (
					<View style={styles.instantNoticeBox}>
						<Ionicons name="flash-outline" size={18} color="#065F46" />
						<AppTypography variant="caption" style={styles.instantNoticeText}>
							⚡ Nurse will be dispatched immediately to this address after payment authorization (~15-30 min arrival).
						</AppTypography>
					</View>
				) : (
					/* Responsive Date & Time Picker for Scheduled Visit */
					<View style={styles.dateSlotPickerWrapper}>
						<DateSlotPicker
							selectedDate={selectedDate}
							onDateChange={setSelectedDate}
							selectedTime={selectedSlot}
							onTimeChange={setSelectedSlot}
							availableSlots={ANCILLARY_SLOTS}
							dateLabel="Select Preferred Date"
							timeLabel="Select Time Slot"
							timeSlotColumns={isTablet ? 2 : 1}
							disablePast
							hideHeader={false}
							showAppointmentTypeToggle={false}
						/>
					</View>
				)}

				<AppButton
					variant="primary"
					formAction
					style={styles.saveSheetBtn}
					onPress={() => onSave(selectedAddrId, selectedDate, selectedSlot)}
				>
					{isInstant ? 'Save & Use This Address' : 'Save Schedule & Address'}
				</AppButton>
			</View>
		</AppBottomSheet>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#FFFFFF',
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
		paddingTop: 20,
	},
	progressStepper: {
		marginBottom: 20,
	},
	sectionHeaderRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginTop: 8,
		marginBottom: 12,
	},
	patientActionRow: {
		flexDirection: 'row',
		alignItems: 'center',
	},

	sectionHeading: {
		fontSize: 15,
		fontWeight: '800',
		color: '#1A2E35',
		letterSpacing: 0.1,
	},
	headerActionBtn: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
		paddingVertical: 4,
		paddingHorizontal: 8,
		borderRadius: 8,
		backgroundColor: '#F0F9F9',
	},
	actionBtnText: {
		fontSize: 12,
		fontWeight: '700',
		color: '#1F5F68',
	},
	servicesListContainer: {
		marginBottom: 8,
	},
	serviceItemFlat: {
		paddingVertical: 12,
	},
	itemDivider: {
		height: 1,
		backgroundColor: '#ECEFF1',
		marginBottom: 12,
	},
	serviceItemRow: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		marginBottom: 10,
	},
	serviceImage: {
		width: 60,
		height: 60,
		borderRadius: 12,
		backgroundColor: '#F1F5F9',
	},
	serviceTextCol: {
		flex: 1,
		marginLeft: 12,
	},
	serviceTitleRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	serviceTitle: {
		fontSize: 14,
		fontWeight: '800',
		color: '#1A2E35',
		flex: 1,
	},
	removeBtn: {
		padding: 4,
		marginLeft: 8,
	},
	serviceDesc: {
		fontSize: 11,
		color: '#546E7A',
		marginTop: 2,
		lineHeight: 15,
	},
	metaBadgeRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		marginTop: 6,
	},
	metaItem: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
	},
	metaText: {
		fontSize: 10,
		color: '#607D8B',
		fontWeight: '600',
	},
	serviceFooterRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginTop: 2,
	},
	councilBadge: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#E6F3F4',
		paddingHorizontal: 8,
		paddingVertical: 2,
		borderRadius: 6,
		gap: 4,
	},
	councilText: {
		fontSize: 9,
		fontWeight: '700',
		color: '#1F5F68',
	},
	priceVal: {
		fontSize: 15,
		fontWeight: '800',
		color: '#1F5F68',
	},
	emptyBox: {
		paddingVertical: 24,
		paddingHorizontal: 16,
		alignItems: 'center',
		backgroundColor: '#F8FAFC',
		borderRadius: 16,
		borderWidth: 1,
		borderColor: '#ECEFF1',
		gap: 8,
		marginBottom: 16,
	},
	emptyText: {
		fontSize: 12,
		color: '#78909C',
		textAlign: 'center',
		lineHeight: 16,
	},
	sectionDivider: {
		height: 1,
		backgroundColor: '#ECEFF1',
		marginVertical: 16,
	},
	patientProfileContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#F8FAFC',
		borderRadius: 16,
		padding: 16,
		borderWidth: 1,
		borderColor: '#ECEFF1',
	},
	patientAvatar: {
		width: 50,
		height: 50,
		borderRadius: 25,
		backgroundColor: '#CFD8DC',
	},
	patientInfoCol: {
		flex: 1,
		marginLeft: 14,
	},
	patientNameRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		marginBottom: 4,
	},
	patientName: {
		fontSize: 15,
		fontWeight: '800',
		color: '#1A2E35',
	},
	relationshipChip: {
		backgroundColor: '#ECEFF1',
		paddingHorizontal: 6,
		paddingVertical: 1.5,
		borderRadius: 6,
	},
	relationshipText: {
		fontSize: 10,
		fontWeight: '700',
		color: '#546E7A',
		textTransform: 'uppercase',
	},
	patientMeta: {
		fontSize: 12,
		color: '#546E7A',
		fontWeight: '500',
	},
	visitSummaryBlock: {
		backgroundColor: '#FFFFFF',
		borderRadius: 16,
		borderWidth: 1,
		borderColor: '#ECEFF1',
		paddingVertical: 8,
		paddingHorizontal: 14,
		elevation: 1,
		shadowColor: '#000000',
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.03,
		shadowRadius: 2,
	},
	visitSummaryItem: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		paddingVertical: 12,
	},
	visitIconBox: {
		width: 32,
		height: 32,
		borderRadius: 16,
		backgroundColor: '#E6F3F4',
		alignItems: 'center',
		justifyContent: 'center',
		marginTop: 2,
	},
	visitDetailsCol: {
		flex: 1,
		marginLeft: 12,
	},
	addressLabelRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		marginBottom: 4,
	},
	visitDetailsHeading: {
		fontSize: 13,
		fontWeight: '700',
		color: '#546E7A',
	},
	addressTypeBadge: {
		backgroundColor: '#E6F3F4',
		paddingHorizontal: 6,
		paddingVertical: 1.5,
		borderRadius: 6,
	},
	addressTypeText: {
		fontSize: 9,
		fontWeight: '700',
		color: '#1F5F68',
	},
	visitDetailsVal: {
		fontSize: 12,
		color: '#1A2E35',
		lineHeight: 16,
	},
	visitItemSeparator: {
		height: 1,
		backgroundColor: '#ECEFF1',
	},
	visitTimeValRow: {
		flexDirection: 'row',
		alignItems: 'center',
		flexWrap: 'wrap',
		gap: 8,
		marginTop: 4,
	},
	visitTimeValText: {
		fontSize: 12,
		fontWeight: '700',
		color: '#1A2E35',
	},
	timeStatusBadge: {
		backgroundColor: '#FFECB3',
		paddingHorizontal: 6,
		paddingVertical: 2,
		borderRadius: 6,
	},
	timeStatusText: {
		fontSize: 9,
		fontWeight: '700',
		color: '#B7791F',
	},
	receiptContainer: {
		backgroundColor: '#F8FAFC',
		borderRadius: 16,
		padding: 16,
		borderWidth: 1,
		borderColor: '#ECEFF1',
	},
	receiptItem: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginVertical: 4,
	},
	receiptItemLabel: {
		fontSize: 12,
		color: '#546E7A',
	},
	receiptItemVal: {
		fontSize: 13,
		fontWeight: '700',
		color: '#1A2E35',
	},
	receiptDivider: {
		height: 1,
		backgroundColor: '#ECEFF1',
		marginVertical: 10,
	},
	receiptTotalRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
	},
	receiptTotalLabel: {
		fontSize: 14,
		fontWeight: '800',
		color: '#1A2E35',
	},
	receiptTotalVal: {
		fontSize: 18,
		fontWeight: '800',
		color: '#1F5F68',
	},
	reassuranceBanner: {
		flexDirection: 'row',
		backgroundColor: '#F0F9F9',
		borderRadius: 12,
		padding: 12,
		marginTop: 20,
		marginBottom: 10,
		alignItems: 'center',
		gap: 10,
	},
	reassuranceText: {
		flex: 1,
		fontSize: 10.5,
		color: '#1F5F68',
		lineHeight: 14,
		fontWeight: '500',
	},
	stickyFooter: {
		position: 'absolute',
		bottom: 0,
		left: 0,
		right: 0,
		backgroundColor: '#FFFFFF',
		borderTopWidth: 1,
		borderTopColor: '#ECEFF1',
		paddingHorizontal: 16,
		paddingTop: 12,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		elevation: 8,
		shadowColor: '#000000',
		shadowOffset: { width: 0, height: -3 },
		shadowOpacity: 0.08,
		shadowRadius: 6,
	},
	stickyLeft: {
		flex: 1,
		marginRight: 16,
	},
	stickyPayLabel: {
		fontSize: 10,
		color: '#78909C',
		fontWeight: '700',
		textTransform: 'uppercase',
	},
	stickyPayVal: {
		fontSize: 20,
		fontWeight: '800',
		color: '#1F5F68',
		lineHeight: 24,
	},
	stickyPaySub: {
		fontSize: 10,
		color: '#78909C',
		marginTop: 1,
	},
	continueBtn: {
		backgroundColor: '#1F5F68',
		borderRadius: 12,
		minWidth: 180,
		height: 48,
		justifyContent: 'center',
	},
	sheetFormContainer: {
		paddingVertical: 12,
	},
	saveSheetBtn: {
		marginTop: 16,
		borderRadius: 12,
	},
	sheetSectionHeaderRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginBottom: 10,
	},
	sheetSectionTitle: {
		fontSize: 14,
		fontWeight: '700',
		color: '#191C1D',
	},
	sheetSectionTitleMargin: {
		fontSize: 14,
		fontWeight: '700',
		color: '#191C1D',
		marginTop: 16,
		marginBottom: 10,
	},
	mapLinkBtn: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
	},
	mapLinkText: {
		fontSize: 12,
		fontWeight: '600',
		color: '#1F5F68',
	},
	sheetAddrItem: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#F8FAFC',
		borderRadius: 12,
		padding: 12,
		marginBottom: 8,
		borderWidth: 1,
		borderColor: '#E2E8F0',
	},
	sheetAddrItemSelected: {
		backgroundColor: '#F0F9F9',
		borderColor: '#1F5F68',
	},
	radioCircle: {
		width: 18,
		height: 18,
		borderRadius: 9,
		borderWidth: 1.5,
		borderColor: '#1F5F68',
		alignItems: 'center',
		justifyContent: 'center',
		marginRight: 10,
	},
	radioDot: {
		width: 10,
		height: 10,
		borderRadius: 5,
		backgroundColor: '#1F5F68',
	},
	sheetAddrTextCol: {
		flex: 1,
	},
	sheetAddrLabel: {
		fontSize: 13,
		fontWeight: '700',
		color: '#191C1D',
	},
	sheetAddrSub: {
		fontSize: 11,
		color: '#526062',
		marginTop: 2,
	},
	dateRowScroll: {
		gap: 8,
		paddingRight: 12,
	},
	dateChip: {
		backgroundColor: '#F8FAFC',
		borderRadius: 10,
		paddingHorizontal: 14,
		paddingVertical: 8,
		alignItems: 'center',
		borderWidth: 1,
		borderColor: '#E2E8F0',
		minWidth: 70,
	},
	dateChipSelected: {
		backgroundColor: '#1F5F68',
		borderColor: '#1F5F68',
	},
	dateChipText: {
		fontSize: 10,
		color: '#64748B',
		fontWeight: '600',
	},
	dateChipTextSelected: {
		color: 'rgba(255,255,255,0.85)',
	},
	dateChipDate: {
		fontSize: 12,
		fontWeight: '700',
		color: '#191C1D',
		marginTop: 2,
	},
	dateChipDateSelected: {
		color: '#FFFFFF',
	},
	slotGrid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 8,
	},
	slotItem: {
		backgroundColor: '#F8FAFC',
		borderRadius: 10,
		paddingHorizontal: 12,
		paddingVertical: 8,
		borderWidth: 1,
		borderColor: '#E2E8F0',
	},
	slotItemSelected: {
		backgroundColor: '#1F5F68',
		borderColor: '#1F5F68',
	},
	slotItemText: {
		fontSize: 11,
		fontWeight: '600',
		color: '#1F5F68',
	},
	slotItemTextSelected: {
		color: '#FFFFFF',
	},
	dateSlotPickerWrapper: {
		marginTop: 8,
		marginBottom: 8,
		marginHorizontal: -8,
	},
	dispatchToggleWrap: {
		flexDirection: 'row',
		backgroundColor: '#F1F5F9',
		borderRadius: 14,
		padding: 4,
		marginVertical: 12,
		borderWidth: 1,
		borderColor: '#E2E8F0',
	},
	dispatchToggleTab: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 10,
		paddingHorizontal: 12,
		borderRadius: 10,
		gap: 6,
	},
	dispatchToggleTabActive: {
		backgroundColor: '#1F5F68',
		shadowColor: '#1F5F68',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.15,
		shadowRadius: 4,
		elevation: 2,
	},
	dispatchToggleText: {
		fontSize: 13,
		fontWeight: '600',
		color: '#475569',
	},
	dispatchToggleTextActive: {
		color: '#FFFFFF',
		fontWeight: '700',
	},
	dispatchHelperBanner: {
		flexDirection: 'row',
		alignItems: 'center',
		borderRadius: 12,
		paddingHorizontal: 12,
		paddingVertical: 10,
		marginBottom: 16,
		gap: 8,
	},
	instantBannerBg: {
		backgroundColor: '#ECFDF5',
		borderColor: '#A7F3D0',
		borderWidth: 1,
	},
	scheduledBannerBg: {
		backgroundColor: '#EFF6FF',
		borderColor: '#BFDBFE',
		borderWidth: 1,
	},
	dispatchHelperText: {
		flex: 1,
		fontSize: 11.5,
		lineHeight: 16,
	},
	instantHelperTextColor: {
		color: '#065F46',
	},
	scheduledHelperTextColor: {
		color: '#1E40AF',
	},
	changeAddressLinkBtn: {
		marginLeft: 'auto',
		paddingHorizontal: 8,
		paddingVertical: 2,
		borderRadius: 6,
		backgroundColor: '#E6F3F4',
	},
	changeAddressLinkText: {
		fontSize: 10,
		fontWeight: '700',
		color: '#1F5F68',
	},
	instantNoticeBox: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#ECFDF5',
		borderRadius: 12,
		padding: 12,
		marginVertical: 14,
		gap: 8,
		borderWidth: 1,
		borderColor: '#A7F3D0',
	},
	instantNoticeText: {
		flex: 1,
		fontSize: 11.5,
		color: '#065F46',
		lineHeight: 16,
	},
	billingCard: {
		backgroundColor: '#FFFFFF',
		borderRadius: 16,
		padding: 16,
		borderWidth: 1,
		borderColor: '#E2E8F0',
		marginVertical: 12,
		gap: 10,
	},
	billingTitle: {
		fontSize: 15,
		fontWeight: '700',
		color: '#0F172A',
		marginBottom: 4,
	},
	billingRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
	},
	billingLabel: {
		fontSize: 12.5,
		color: '#64748B',
	},
	billingVal: {
		fontSize: 13,
		fontWeight: '600',
		color: '#1E293B',
	},
	billingTotalRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingTop: 10,
		borderTopWidth: 1,
		borderTopColor: '#E2E8F0',
		marginTop: 4,
	},
	totalLabel: {
		fontSize: 14,
		fontWeight: '700',
		color: '#0F172A',
	},
	totalVal: {
		fontSize: 16,
		fontWeight: '700',
		color: '#1F5F68',
	},
	guaranteeBox: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#ECFDF5',
		borderRadius: 12,
		padding: 12,
		marginVertical: 12,
		gap: 10,
	},
	guaranteeText: {
		flex: 1,
		fontSize: 11.5,
		color: '#065F46',
		lineHeight: 16,
	},
	bottomBar: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		backgroundColor: '#FFFFFF',
		paddingHorizontal: 20,
		paddingTop: 12,
		borderTopWidth: 1,
		borderTopColor: '#E2E8F0',
	},
	bottomBarPriceCol: {
		justifyContent: 'center',
	},
	bottomBarTotalLabel: {
		fontSize: 11,
		color: '#64748B',
	},
	bottomBarTotalVal: {
		fontSize: 18,
		fontWeight: '700',
		color: '#0F172A',
	},
})
