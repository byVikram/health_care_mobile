import React, { useState, useEffect, useMemo } from 'react'
import {
	ActivityIndicator,
	Image,
	ScrollView,
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	View,
	useWindowDimensions,
} from 'react-native'
import { useNavigation, useRoute } from '@react-navigation/native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { getPatientDetails, getPatientAddresses } from '../../../features/profile/patient/PatientProfileService'
import { ROUTES } from '../../../navigation/routes'
import {
	AppBottomSheet,
	AppButton,
	AppScreenHeader,
	AppTypography,
	PatientProfileSelectorBottomSheet,
	StatusModal,
} from '../../../components/common'
import { BookingProgressStepper } from '../components/BookingProgressStepper'
import { ServiceProcedureItem } from '../components/AllServiceCard'
import { getAncillaryImageSource } from '../utils/ancillaryImageResolver'

export type CareBookingMode = 'COMPLETE_CARE' | 'FIXED_DURATION'

// Supported Duration Options
export interface DurationOption {
	hours: number
	label: string
	sublabel?: string
}

const DURATION_OPTIONS: DurationOption[] = [
	{ hours: 1, label: '1 hr', sublabel: '1 Hour' },
	{ hours: 2, label: '2 hrs', sublabel: '2 Hours' },
	{ hours: 3, label: '3 hrs', sublabel: '3 Hours' },
	{ hours: 4, label: '4 hrs', sublabel: '4 Hours' },
	{ hours: 8, label: '8 hrs', sublabel: 'Half Day' },
	{ hours: 12, label: '12 hrs', sublabel: 'Full Day' },
]

// Common Recurring Presets
const RECURRING_PRESETS = [
	{ days: 3, label: '3 Days', discount: null },
	{ days: 7, label: '7 Days', discount: '10% OFF' },
	{ days: 14, label: '14 Days', discount: '10% OFF' },
	{ days: 30, label: '30 Days', discount: '10% OFF' },
]

// Time Slot Presets
const TIME_SLOTS = [
	'08:00 AM - 09:00 AM',
	'09:00 AM - 10:00 AM',
	'10:00 AM - 11:00 AM',
	'02:00 PM - 03:00 PM',
	'04:00 PM - 05:00 PM',
	'06:00 PM - 07:00 PM',
]

interface AddressItem {
	id: string
	label: string
	address: string
	latitude?: number
	longitude?: number
	isDefault?: boolean
}

export default function HomeCareBookingDetailsPage() {
	const navigation = useNavigation<any>()
	const route = useRoute<any>()
	const insets = useSafeAreaInsets()
	const { width } = useWindowDimensions()
	const isTablet = width >= 768

	const initialSelectedServices: ServiceProcedureItem[] = route.params?.selectedServices || []
	const [services, setServices] = useState<ServiceProcedureItem[]>(initialSelectedServices)

	useEffect(() => {
		if (route.params?.selectedServices) {
			setServices(route.params.selectedServices)
		}
	}, [route.params?.selectedServices])

	// Care Booking Mode passed from catalog stage
	const [careBookingMode, setCareBookingMode] = useState<CareBookingMode>(
		route.params?.careBookingMode || route.params?.initialCareMode || 'COMPLETE_CARE'
	)

	// 1. Patient State
	const [patient, setPatient] = useState<{
		publicId?: string
		name: string
		age: string
		gender: string
		relationship: string
		avatar?: string
	} | null>(null)
	const [loadingPatient, setLoadingPatient] = useState(true)
	const [switchProfileVisible, setSwitchProfileVisible] = useState(false)
	const [selectedProfileId, setSelectedProfileId] = useState<string>('self-1')

	// 2. Address State
	const [savedAddresses, setSavedAddresses] = useState<AddressItem[]>([])
	const [selectedAddress, setSelectedAddress] = useState<AddressItem | null>(null)
	const [addressSheetVisible, setAddressSheetVisible] = useState(false)

	// 3. Duration State (Used when in FIXED_DURATION mode)
	const [selectedDurationHours, setSelectedDurationHours] = useState<number>(
		route.params?.initialDurationHours || 3
	)

	// 4. Scheduling State
	const [scheduleMode, setScheduleMode] = useState<'ONE_TIME' | 'RECURRING'>('ONE_TIME')
	const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>(
		route.params?.selectedTimeSlot || TIME_SLOTS[1]
	)
	const [recurringDaysCount, setRecurringDaysCount] = useState<number>(7)
	const [startDateOffset, setStartDateOffset] = useState<number>(0) // 0 = today, 1 = tomorrow

	// 5. Care Instructions & Critical Flags
	const [careInstructions, setCareInstructions] = useState<string>(
		route.params?.careRequirements && route.params.careRequirements.length > 0
			? `Care Requirements: ${route.params.careRequirements.join(', ')}`
			: ''
	)
	const [isFallRisk, setIsFallRisk] = useState<boolean>(false)
	const [allergiesText, setAllergiesText] = useState<string>('')

	// 6. Validation / Error Modal
	const [errorModalVisible, setErrorModalVisible] = useState(false)
	const [errorModalTitle, setErrorModalTitle] = useState('Missing Information')
	const [errorModalMessage, setErrorModalMessage] = useState('')

	// Load Initial Data (Patient & Addresses)
	const loadProfileData = async () => {
		try {
			setLoadingPatient(true)
			const patRes = await getPatientDetails()
			if (patRes) {
				const rawData = patRes.data || patRes
				const personal = rawData?.personal || rawData
				setPatient({
					publicId: personal?.public_id || personal?.publicId || personal?.id,
					name: personal?.name || personal?.full_name || 'Patient',
					age: personal?.age ? String(personal.age) : 'Adult',
					gender: personal?.gender || 'Not Specified',
					relationship: personal?.relationship || 'Self',
					avatar: personal?.avatar || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80',
				})
			}

			const addresses = await getPatientAddresses()
			if (addresses && addresses.length > 0) {
				const formatted: AddressItem[] = addresses.map((addr: any) => ({
					id: String(addr.id),
					label: addr.label || addr.title || 'Home',
					address: addr.address_line
						? `${addr.address_line}, ${addr.city || ''} ${addr.pincode || ''}`
						: `${addr.address_line_1 || ''}, ${addr.city || ''}`,
					latitude: addr.latitude != null ? Number(addr.latitude) : undefined,
					longitude: addr.longitude != null ? Number(addr.longitude) : undefined,
					isDefault: addr.is_default || false,
				}))
				setSavedAddresses(formatted)
				const defaultAddr = formatted.find((a) => a.isDefault) || formatted[0]
				setSelectedAddress(defaultAddr)
			} else {
				const fallbackAddr: AddressItem = {
					id: 'default-home',
					label: 'Home',
					address: '42 Healthcare Avenue, Flat 3B, Sector 18, New Delhi - 110001',
				}
				setSavedAddresses([fallbackAddr])
				setSelectedAddress(fallbackAddr)
			}
		} catch (err) {
			console.log('[HomeCareBookingDetailsPage] Load error:', err)
		} finally {
			setLoadingPatient(false)
		}
	}

	useEffect(() => {
		loadProfileData()
	}, [])

	const handleRemoveService = (id: string) => {
		setServices((prev) => prev.filter((s) => s.id !== id))
	}

	const handleAddMoreServices = () => {
		navigation.navigate(ROUTES.STACK.HOME_CARE_CATALOG, {
			updatedCart: services,
			careBookingMode,
		})
	}

	// Dates calculation
	const generatedDatesList = useMemo(() => {
		const dates: string[] = []
		const count = scheduleMode === 'RECURRING' ? recurringDaysCount : 1
		const base = new Date()
		base.setDate(base.getDate() + startDateOffset)

		for (let i = 0; i < count; i++) {
			const d = new Date(base)
			d.setDate(base.getDate() + i)
			const year = d.getFullYear()
			const month = String(d.getMonth() + 1).padStart(2, '0')
			const day = String(d.getDate()).padStart(2, '0')
			dates.push(`${year}-${month}-${day}`)
		}
		return dates
	}, [scheduleMode, recurringDaysCount, startDateOffset])

	const displayDateText = useMemo(() => {
		if (scheduleMode === 'ONE_TIME') {
			const d = new Date()
			d.setDate(d.getDate() + startDateOffset)
			return d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
		}
		if (generatedDatesList.length > 0) {
			const start = new Date(generatedDatesList[0])
			const end = new Date(generatedDatesList[generatedDatesList.length - 1])
			return `${recurringDaysCount} Days (${start.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })} - ${end.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })})`
		}
		return `${recurringDaysCount} Days`
	}, [scheduleMode, recurringDaysCount, startDateOffset, generatedDatesList])

	// Live Authoritative Pricing Calculation
	const pricing = useMemo(() => {
		const hourlyRate = 250
		const visits = scheduleMode === 'RECURRING' ? recurringDaysCount : 1
		const transportFee = 75 * visits

		if (careBookingMode === 'COMPLETE_CARE') {
			// Complete Care: Duration and base care fee assessed on-site at standard ₹250/hr
			const gstTax = Math.round(transportFee * 0.05 * 100) / 100
			const totalAmount = Math.round((transportFee + gstTax) * 100) / 100
			return {
				isCompleteCare: true,
				hourlyRate,
				totalHours: null,
				visits,
				baseCareFee: 0,
				transportFee,
				subtotal: transportFee,
				discount: 0,
				gstTax,
				totalAmount,
			}
		}

		// Hourly Care (Fixed Duration)
		const duration = selectedDurationHours
		const totalHours = duration * visits
		const rawCareFee = hourlyRate * totalHours
		const rawSubtotal = rawCareFee + transportFee

		// 10% discount for recurring bookings >= 7 days
		let discount = 0
		if (scheduleMode === 'RECURRING' && recurringDaysCount >= 7) {
			discount = Math.round(rawSubtotal * 0.1 * 100) / 100
		}

		const taxableAmount = rawSubtotal - discount
		const gstTax = Math.round(taxableAmount * 0.05 * 100) / 100
		const totalAmount = Math.round((taxableAmount + gstTax) * 100) / 100

		return {
			isCompleteCare: false,
			hourlyRate,
			totalHours,
			visits,
			baseCareFee: rawCareFee,
			transportFee,
			subtotal: rawSubtotal,
			discount,
			gstTax,
			totalAmount,
		}
	}, [careBookingMode, selectedDurationHours, scheduleMode, recurringDaysCount])

	const handleProceedToPayment = () => {
		if (services.length === 0) {
			setErrorModalTitle('No Services Selected')
			setErrorModalMessage('Please select at least one Home Care activity to proceed.')
			setErrorModalVisible(true)
			return
		}

		if (!patient || !patient.name || patient.name.trim() === '') {
			setErrorModalTitle('Missing Patient Profile')
			setErrorModalMessage('Please select or verify the patient recipient for this home care booking.')
			setErrorModalVisible(true)
			return
		}

		if (!selectedAddress || !selectedAddress.address) {
			setErrorModalTitle('Missing Address')
			setErrorModalMessage('Please provide a valid home address for the care visit.')
			setErrorModalVisible(true)
			return
		}

		const startDateStr = generatedDatesList[0] || new Date().toISOString().split('T')[0]
		const scheduledStartTime = `${startDateStr} ${selectedTimeSlot}`

		const bookingPayload = {
			specialtyId: 'home-care',
			careBookingMode,
			services,
			patient: {
				publicId: patient.publicId,
				name: patient.name,
				age: patient.age,
				gender: patient.gender,
				relationship: patient.relationship,
				avatar: patient.avatar,
			},
			visit: {
				addressId: selectedAddress.id,
				addressLabel: selectedAddress.label,
				address: selectedAddress.address,
				latitude: selectedAddress.latitude,
				longitude: selectedAddress.longitude,
				date: displayDateText,
				timeSlot: selectedTimeSlot,
			},
			bookingType: 'SCHEDULED',
			scheduledStartTime,
			visitDurationHours: careBookingMode === 'FIXED_DURATION' ? selectedDurationHours : null,
			careInstructions: careInstructions.trim() || undefined,
			criticalFlags: {
				fallRisk: isFallRisk,
				allergies: allergiesText.trim() || undefined,
			},
			charges: {
				basePrice: careBookingMode === 'COMPLETE_CARE' ? 'To be confirmed' : `₹${pricing.baseCareFee}`,
				visitFee: `₹${pricing.transportFee}`,
				discount: pricing.discount > 0 ? `-₹${pricing.discount}` : '₹0',
				taxes: `₹${pricing.gstTax}`,
				totalAmount: `₹${pricing.totalAmount}`,
			},
		}

		navigation.navigate(ROUTES.STACK.ANCILLARY_PAYMENT, {
			bookingPayload,
		})
	}

	return (
		<View style={styles.container}>
			<AppScreenHeader title="Home Care Booking" onBack={() => navigation.goBack()} />

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

				{/* 1. SECTION: SELECTED CARE ACTIVITIES */}
				<View style={styles.sectionBlock}>
					<View style={styles.sectionHeaderRow}>
						<AppTypography variant="h3" style={styles.sectionHeading}>
							Selected Care Activities ({services.length})
						</AppTypography>
						<TouchableOpacity style={styles.actionBtn} onPress={handleAddMoreServices} activeOpacity={0.7}>
							<AppTypography variant="caption" style={styles.actionBtnText}>
								+ Add / Modify
							</AppTypography>
						</TouchableOpacity>
					</View>

					{/* CARE MODE SUMMARY BANNER */}
					<View style={styles.modeBanner}>
						<View style={styles.modeBannerLeft}>
							<Ionicons
								name={careBookingMode === 'COMPLETE_CARE' ? 'shield-checkmark' : 'time'}
								size={18}
								color="#2B6F71"
							/>
							<View style={{ flex: 1 }}>
								<AppTypography variant="subtitle" style={styles.modeBannerTitle}>
									{careBookingMode === 'COMPLETE_CARE'
										? 'Complete Care Mode (Assessment-Based)'
										: `Hourly Care Mode (₹250/hr Standard Rate)`}
								</AppTypography>
								<AppTypography variant="caption" style={styles.modeBannerSub}>
									{careBookingMode === 'COMPLETE_CARE'
										? 'Care duration & service fees are finalized upon caregiver on-site assessment.'
										: 'Selected activities form the care scope for your booked visit hours.'}
								</AppTypography>
							</View>
						</View>
					</View>

					{/* ACTIVITIES LIST CARDS */}
					<View style={styles.servicesList}>
						{services.map((srv) => (
							<View key={srv.id} style={styles.activityCard}>
								<Image
									source={getAncillaryImageSource(srv.image_url || srv.imageUrl || srv.image)}
									style={styles.activityThumb}
									resizeMode="cover"
								/>
								<View style={styles.activityTextCol}>
									<AppTypography variant="h4" style={styles.activityTitle} numberOfLines={1}>
										{srv.title || (srv as any).label || (srv as any).name || ''}
									</AppTypography>
									<AppTypography variant="caption" style={styles.activityDesc} numberOfLines={2}>
										{srv.description}
									</AppTypography>
								</View>

								<View style={styles.activityRightCol}>
									{services.length > 1 ? (
										<TouchableOpacity
											onPress={() => handleRemoveService(srv.id)}
											activeOpacity={0.7}
											hitSlop={8}
											style={styles.trashBtn}
										>
											<Ionicons name="trash-outline" size={17} color="#DC2626" />
										</TouchableOpacity>
									) : null}
								</View>
							</View>
						))}
					</View>
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

					{loadingPatient ? (
						<View style={[styles.patientProfileBox, { justifyContent: 'center', paddingVertical: 20 }]}>
							<ActivityIndicator size="small" color="#2B6F71" />
							<AppTypography variant="caption" style={{ color: '#546E7A', marginLeft: 8 }}>
								Retrieving patient details...
							</AppTypography>
						</View>
					) : patient ? (
						<View style={styles.patientProfileBox}>
							<Image
								source={{ uri: patient.avatar || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80' }}
								style={styles.patientAvatar}
								resizeMode="cover"
							/>
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
									{patient.age ? `${patient.age} Yrs` : ''} {patient.gender ? ` •  ${patient.gender}` : ''}
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
							</View>
						</View>
					)}
				</View>

				{/* 8px GREY SECTION DIVIDER BAR */}
				<View style={styles.sectionDividerBar} />

				{/* 3. SECTION: VISIT LOCATION */}
				<View style={styles.sectionBlock}>
					<View style={styles.sectionHeaderRow}>
						<AppTypography variant="h3" style={styles.sectionHeading}>
							Visit Location
						</AppTypography>
					</View>

					<View style={styles.locationSummaryBox}>
						<View style={styles.locationItem}>
							<View style={styles.locationIconWrap}>
								<Ionicons name="location-outline" size={18} color="#2B6F71" />
							</View>
							<View style={styles.locationTextCol}>
								<View style={styles.locationHeaderRow}>
									<AppTypography variant="h4" style={styles.locationTitle}>
										Visit Address ({selectedAddress?.label || 'Home'})
									</AppTypography>
									<TouchableOpacity onPress={() => setAddressSheetVisible(true)} activeOpacity={0.7}>
										<AppTypography variant="caption" style={styles.changeLinkText}>
											Change
										</AppTypography>
									</TouchableOpacity>
								</View>
								<AppTypography variant="caption" style={styles.locationAddressText}>
									{selectedAddress?.address || 'Select an address'}
								</AppTypography>
							</View>
						</View>
					</View>
				</View>

				{/* 8px GREY SECTION DIVIDER BAR */}
				<View style={styles.sectionDividerBar} />

				{/* 4. SECTION: DURATION & SCHEDULE */}
				<View style={styles.sectionBlock}>
					<View style={styles.sectionHeaderRow}>
						<AppTypography variant="h3" style={styles.sectionHeading}>
							Duration & Schedule
						</AppTypography>
						{route.params?.selectedTimeSlot ? (
							<TouchableOpacity
								style={styles.actionBtn}
								onPress={() => navigation.goBack()}
								activeOpacity={0.7}
								accessibilityRole="button"
								accessibilityLabel="Change schedule"
							>
								<AppTypography variant="caption" style={styles.actionBtnText}>
									Change
								</AppTypography>
							</TouchableOpacity>
						) : null}
					</View>

					{/* DURATION SELECTION / CONFIGURED SUMMARY */}
					{route.params?.selectedTimeSlot ? (
						<View style={styles.configuredReviewCard}>
							<View style={styles.reviewFieldRow}>
								<View style={styles.reviewCol}>
									<AppTypography variant="caption" style={styles.reviewLabel}>
										CARE TYPE
									</AppTypography>
									<AppTypography variant="body" style={styles.reviewValueBold}>
										{route.params?.title || 'Caregiver Service'}
									</AppTypography>
								</View>
								<View style={styles.reviewCol}>
									<AppTypography variant="caption" style={styles.reviewLabel}>
										DURATION
									</AppTypography>
									<AppTypography variant="body" style={styles.reviewValueBold}>
										{selectedDurationHours} {selectedDurationHours === 1 ? 'hour' : 'hours'}
									</AppTypography>
								</View>
							</View>

							<View style={styles.reviewDivider} />

							<View style={styles.reviewFieldRow}>
								<View style={styles.reviewCol}>
									<AppTypography variant="caption" style={styles.reviewLabel}>
										DATE
									</AppTypography>
									<AppTypography variant="body" style={styles.reviewValue}>
										{route.params?.selectedDate || 'Selected Date'}
									</AppTypography>
								</View>
								<View style={styles.reviewCol}>
									<AppTypography variant="caption" style={styles.reviewLabel}>
										CARE HOURS
									</AppTypography>
									<AppTypography variant="body" style={styles.reviewValue}>
										{route.params?.selectedTimeSlot}
									</AppTypography>
								</View>
							</View>
						</View>
					) : careBookingMode === 'FIXED_DURATION' ? (
						<View style={styles.durationSectionWrap}>
							<Text style={styles.inputSubheading}>Daily Visit Duration</Text>
							<View style={styles.durationPillsRow}>
								{DURATION_OPTIONS.map((opt) => {
									const active = selectedDurationHours === opt.hours
									return (
										<TouchableOpacity
											key={opt.hours}
											style={[styles.durationPill, active && styles.durationPillActive]}
											onPress={() => setSelectedDurationHours(opt.hours)}
											activeOpacity={0.8}
										>
											<Text style={[styles.durationLabel, active && styles.durationLabelActive]}>
												{opt.label}
											</Text>
											{opt.sublabel && (
												<Text style={[styles.durationSub, active && styles.durationSubActive]}>
													{opt.sublabel}
												</Text>
											)}
										</TouchableOpacity>
									)
								})}
							</View>
						</View>
					) : (
						<View style={styles.assessmentNoticeCard}>
							<Ionicons name="information-circle-outline" size={20} color="#2B6F71" />
							<View style={{ flex: 1 }}>
								<Text style={styles.assessmentNoticeTitle}>Assessment-Based Care Duration</Text>
								<Text style={styles.assessmentNoticeBody}>
									Our caregiver will evaluate the patient’s complete daily needs on-site. The required daily duration and care schedule will be agreed directly with you.
								</Text>
							</View>
						</View>
					)}

					{/* SCHEDULE FREQUENCY TOGGLE */}
					<Text style={[styles.inputSubheading, { marginTop: 8 }]}>Booking Frequency</Text>
					<View style={styles.modeToggleRow}>
						<TouchableOpacity
							style={[styles.modeTab, scheduleMode === 'ONE_TIME' && styles.modeTabActive]}
							onPress={() => setScheduleMode('ONE_TIME')}
							activeOpacity={0.85}
						>
							<Ionicons
								name="calendar-outline"
								size={16}
								color={scheduleMode === 'ONE_TIME' ? '#FFFFFF' : '#2B6F71'}
							/>
							<Text style={[styles.modeTabText, scheduleMode === 'ONE_TIME' && styles.modeTabTextActive]}>
								One-Time Visit
							</Text>
						</TouchableOpacity>

						<TouchableOpacity
							style={[styles.modeTab, scheduleMode === 'RECURRING' && styles.modeTabActive]}
							onPress={() => setScheduleMode('RECURRING')}
							activeOpacity={0.85}
						>
							<Ionicons
								name="repeat-outline"
								size={16}
								color={scheduleMode === 'RECURRING' ? '#FFFFFF' : '#2B6F71'}
							/>
							<Text style={[styles.modeTabText, scheduleMode === 'RECURRING' && styles.modeTabTextActive]}>
								Recurring Daily Care
							</Text>
							<View style={styles.discountChip}>
								<Text style={styles.discountChipText}>10% OFF</Text>
							</View>
						</TouchableOpacity>
					</View>

					{/* RECURRING DAYS PRESETS */}
					{scheduleMode === 'RECURRING' && (
						<View style={styles.recurringPresetsWrap}>
							<Text style={styles.inputSubheading}>Select Duration Package</Text>
							<View style={styles.presetsRow}>
								{RECURRING_PRESETS.map((preset) => {
									const active = recurringDaysCount === preset.days
									return (
										<TouchableOpacity
											key={preset.days}
											style={[styles.presetChip, active && styles.presetChipActive]}
											onPress={() => setRecurringDaysCount(preset.days)}
											activeOpacity={0.8}
										>
											<Text style={[styles.presetChipText, active && styles.presetChipTextActive]}>
												{preset.label}
											</Text>
											{preset.discount && (
												<Text style={[styles.presetDiscountText, active && styles.presetDiscountTextActive]}>
													{preset.discount}
												</Text>
											)}
										</TouchableOpacity>
									)
								})}
							</View>

							<View style={styles.stepperRow}>
								<Text style={styles.stepperLabel}>Custom Days:</Text>
								<View style={styles.stepperControls}>
									<TouchableOpacity
										style={styles.stepperBtn}
										onPress={() => setRecurringDaysCount((prev) => Math.max(2, prev - 1))}
									>
										<Ionicons name="remove" size={16} color="#0F172A" />
									</TouchableOpacity>
									<Text style={styles.stepperValue}>{recurringDaysCount}</Text>
									<TouchableOpacity
										style={styles.stepperBtn}
										onPress={() => setRecurringDaysCount((prev) => Math.min(60, prev + 1))}
									>
										<Ionicons name="add" size={16} color="#0F172A" />
									</TouchableOpacity>
								</View>
							</View>
						</View>
					)}

					{/* START DATE SELECTION */}
					<Text style={styles.inputSubheading}>
						{scheduleMode === 'RECURRING' ? 'Starting From' : 'Visit Date'}
					</Text>
					<View style={styles.quickDayRow}>
						<TouchableOpacity
							style={[styles.quickDayPill, startDateOffset === 0 && styles.quickDayPillActive]}
							onPress={() => setStartDateOffset(0)}
							activeOpacity={0.8}
						>
							<Text style={[styles.quickDayText, startDateOffset === 0 && styles.quickDayTextActive]}>
								Today
							</Text>
						</TouchableOpacity>
						<TouchableOpacity
							style={[styles.quickDayPill, startDateOffset === 1 && styles.quickDayPillActive]}
							onPress={() => setStartDateOffset(1)}
							activeOpacity={0.8}
						>
							<Text style={[styles.quickDayText, startDateOffset === 1 && styles.quickDayTextActive]}>
								Tomorrow
							</Text>
						</TouchableOpacity>
						<TouchableOpacity
							style={[styles.quickDayPill, startDateOffset === 2 && styles.quickDayPillActive]}
							onPress={() => setStartDateOffset(2)}
							activeOpacity={0.8}
						>
							<Text style={[styles.quickDayText, startDateOffset === 2 && styles.quickDayTextActive]}>
								Day After
							</Text>
						</TouchableOpacity>
					</View>

					{/* TIME SLOT SELECTION */}
					<Text style={styles.inputSubheading}>Preferred Time Slot</Text>
					<ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.timeSlotScroll}>
						{TIME_SLOTS.map((slot) => {
							const active = selectedTimeSlot === slot
							return (
								<TouchableOpacity
									key={slot}
									style={[styles.timeSlotPill, active && styles.timeSlotPillActive]}
									onPress={() => setSelectedTimeSlot(slot)}
									activeOpacity={0.8}
								>
									<Text style={[styles.timeSlotText, active && styles.timeSlotTextActive]}>
										{slot}
									</Text>
								</TouchableOpacity>
							)
						})}
					</ScrollView>

					{/* SUMMARY OF SCHEDULE */}
					<View style={styles.scheduleSummaryBox}>
						<Ionicons name="time" size={16} color="#2B6F71" />
						<Text style={styles.scheduleSummaryText}>
							{displayDateText} • {selectedTimeSlot}
						</Text>
					</View>
				</View>

				{/* 8px GREY SECTION DIVIDER BAR */}
				<View style={styles.sectionDividerBar} />

				{/* 5. SECTION: CARE INSTRUCTIONS & CRITICAL FLAGS */}
				<View style={styles.sectionBlock}>
					<View style={styles.sectionHeaderRow}>
						<AppTypography variant="h3" style={styles.sectionHeading}>
							Care Notes & Safety Flags
						</AppTypography>
					</View>

					{/* Fall Risk Flag */}
					<TouchableOpacity
						style={[styles.flagRow, isFallRisk && styles.flagRowActive]}
						onPress={() => setIsFallRisk(!isFallRisk)}
						activeOpacity={0.85}
					>
						<View style={[styles.checkbox, isFallRisk && styles.checkboxActive]}>
							{isFallRisk && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
						</View>
						<View style={styles.flagMeta}>
							<Text style={styles.flagTitle}>Patient is Fall Risk / Mobility Impaired</Text>
							<Text style={styles.flagSub}>Caregiver will be alerted to take extra fall-prevention measures</Text>
						</View>
					</TouchableOpacity>

					{/* Allergies / Medical Notes */}
					<Text style={[styles.inputSubheading, { marginTop: 4 }]}>Allergies or Medical Conditions (Optional)</Text>
					<TextInput
						style={styles.singleLineInput}
						placeholder="e.g. Penicillin allergy, Diabetes, Hypertension..."
						placeholderTextColor="#94A3B8"
						value={allergiesText}
						onChangeText={setAllergiesText}
					/>

					{/* Special Care Instructions */}
					<Text style={[styles.inputSubheading, { marginTop: 4 }]}>Special Care Instructions (Optional)</Text>
					<View style={styles.textInputWrap}>
						<TextInput
							style={styles.textInput}
							placeholder="Mention any specific routines, diet notes, or preferences for the caregiver..."
							placeholderTextColor="#94A3B8"
							multiline
							numberOfLines={3}
							value={careInstructions}
							onChangeText={setCareInstructions}
							maxLength={300}
						/>
						<Text style={styles.charCounter}>{careInstructions.length}/300</Text>
					</View>
				</View>

				{/* 8px GREY SECTION DIVIDER BAR */}
				<View style={styles.sectionDividerBar} />

				{/* 6. SECTION: PAYMENT SUMMARY / BILL BREAKDOWN */}
				<View style={styles.sectionBlock}>
					<View style={styles.sectionHeaderRow}>
						<AppTypography variant="h3" style={styles.sectionHeading}>
							Payment Summary
						</AppTypography>
						<Text style={styles.authoritativeNote}>Standard ₹250/hr Base</Text>
					</View>

					<View style={styles.billingList}>
						{/* Care Services Calculation */}
						<View style={styles.billingRow}>
							<AppTypography variant="body" style={styles.billingLabel}>
								{careBookingMode === 'COMPLETE_CARE'
									? 'Care Charges (18 Activities Scope)'
									: `Care Charges (${selectedDurationHours}h × ${pricing.visits} visit${pricing.visits > 1 ? 's' : ''} @ ₹250/hr)`}
							</AppTypography>
							<AppTypography variant="subtitle" style={styles.billingVal}>
								{careBookingMode === 'COMPLETE_CARE' ? 'To be confirmed' : `₹${pricing.baseCareFee}`}
							</AppTypography>
						</View>

						{/* Transport / Visit Fee */}
						<View style={styles.billingRow}>
							<AppTypography variant="body" style={styles.billingLabel}>
								{careBookingMode === 'COMPLETE_CARE'
									? `Assessment & Transport Deposit (₹75 × ${pricing.visits})`
									: `Doorstep Transport (₹75 × ${pricing.visits})`}
							</AppTypography>
							<AppTypography variant="subtitle" style={styles.billingVal}>
								₹{pricing.transportFee}
							</AppTypography>
						</View>

						{/* Discount */}
						{pricing.discount > 0 && (
							<View style={styles.billingRow}>
								<AppTypography variant="body" style={[styles.billingLabel, { color: '#059669' }]}>
									Long-term Discount (10% OFF)
								</AppTypography>
								<AppTypography variant="subtitle" style={[styles.billingVal, { color: '#059669' }]}>
									-₹{pricing.discount}
								</AppTypography>
							</View>
						)}

						{/* Taxes */}
						<View style={styles.billingRow}>
							<AppTypography variant="body" style={styles.billingLabel}>
								GST (5%)
							</AppTypography>
							<AppTypography variant="subtitle" style={styles.billingVal}>
								₹{pricing.gstTax}
							</AppTypography>
						</View>

						<View style={styles.totalDivider} />

						{/* Total */}
						<View style={styles.totalRow}>
							<AppTypography variant="h3" style={styles.totalLabel}>
								{careBookingMode === 'COMPLETE_CARE' ? 'Initial Booking Deposit' : 'Total Payable'}
							</AppTypography>
							<AppTypography variant="h2" style={styles.totalVal}>
								₹{pricing.totalAmount}
							</AppTypography>
						</View>

						{careBookingMode === 'COMPLETE_CARE' && (
							<AppTypography variant="caption" style={styles.priceNoteSub}>
								Note: Initial deposit covers caregiver transport and booking. Final care service fees will be calculated at ₹250/hr after care duration is confirmed during on-site assessment.
							</AppTypography>
						)}
					</View>

					{/* Trust Guarantee Box */}
					<View style={styles.guaranteeBox}>
						<MaterialCommunityIcons name="shield-check" size={20} color="#047857" />
						<AppTypography variant="caption" style={styles.guaranteeText}>
							100% Certified Caregivers • Verified Identity & Police Cleared • Compassionate Care
						</AppTypography>
					</View>
				</View>
			</ScrollView>

			{/* STICKY BOTTOM BAR */}
			<View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
				<View style={styles.bottomBarPriceCol}>
					<AppTypography variant="caption" style={styles.bottomBarTotalLabel}>
						{careBookingMode === 'COMPLETE_CARE' ? 'INITIAL DEPOSIT' : 'TOTAL PAYABLE'}
					</AppTypography>
					<AppTypography variant="h2" style={styles.bottomBarTotalVal}>
						₹{pricing.totalAmount}
					</AppTypography>
				</View>
				<AppButton
					variant="primary"
					onPress={handleProceedToPayment}
					disabled={services.length === 0}
					style={styles.continueBtn}
				>
					Proceed to Payment
				</AppButton>
			</View>

			{/* ADDRESS PICKER BOTTOM SHEET */}
			<AppBottomSheet
				visible={addressSheetVisible}
				onClose={() => setAddressSheetVisible(false)}
				title="Select Visit Address"
			>
				<View style={styles.addressSheetContent}>
					{savedAddresses.map((item) => {
						const isSelected = selectedAddress?.id === item.id
						return (
							<TouchableOpacity
								key={item.id}
								style={[styles.addressItemRow, isSelected && styles.addressItemRowActive]}
								onPress={() => {
									setSelectedAddress(item)
									setAddressSheetVisible(false)
								}}
								activeOpacity={0.8}
							>
								<View style={styles.addressRadioCircle}>
									{isSelected && <View style={styles.addressRadioDot} />}
								</View>
								<View style={styles.addressMetaWrap}>
									<Text style={styles.addressItemLabel}>{item.label}</Text>
									<Text style={styles.addressItemText} numberOfLines={2}>
										{item.address}
									</Text>
								</View>
							</TouchableOpacity>
						)
					})}
				</View>
			</AppBottomSheet>

			{/* PATIENT PROFILE SELECTOR BOTTOM SHEET */}
			<PatientProfileSelectorBottomSheet
				visible={switchProfileVisible}
				onClose={() => setSwitchProfileVisible(false)}
				selectedProfileId={selectedProfileId}
				onSelectProfile={(profile) => {
					setSelectedProfileId(profile.id)
					setPatient({
						publicId: profile.id,
						name: profile.name,
						age: profile.age ? String(profile.age) : 'Adult',
						gender: profile.gender,
						relationship: profile.relationship || (profile as any).relation || 'Self',
						avatar: profile.avatar || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80',
					})
					setSwitchProfileVisible(false)
				}}
			/>

			{/* ERROR / VALIDATION MODAL */}
			<StatusModal
				visible={errorModalVisible}
				status="error"
				title={errorModalTitle}
				description={errorModalMessage}
				submitText="OK"
				onSubmit={() => setErrorModalVisible(false)}
			/>
		</View>
	)
}

const styles = StyleSheet.create({
	configuredSummaryCard: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#F0FDFA',
		borderRadius: 12,
		borderWidth: 1,
		borderColor: '#CCFBF1',
		padding: 12,
		marginBottom: 10,
	},
	configuredIconWrap: {
		width: 38,
		height: 38,
		borderRadius: 19,
		backgroundColor: '#CCFBF1',
		alignItems: 'center',
		justifyContent: 'center',
		marginRight: 10,
	},
	configuredBadgeText: {
		fontSize: 11,
		fontWeight: '700',
		color: '#0F766E',
	},
	configuredDateText: {
		fontSize: 14,
		fontWeight: '700',
		color: '#0F172A',
		marginTop: 1,
	},
	configuredWindowText: {
		fontSize: 12,
		color: '#526062',
		marginTop: 1,
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

	/* FULL-WIDTH SECTION BLOCKS */
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

	/* MODE BANNER */
	modeBanner: {
		backgroundColor: '#F0F9F9',
		borderWidth: 1,
		borderColor: '#CCFBF1',
		borderRadius: 12,
		padding: 12,
	},
	modeBannerLeft: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		gap: 10,
	},
	modeBannerTitle: {
		fontSize: 13.5,
		fontWeight: '700',
		color: '#2B6F71',
	},
	modeBannerSub: {
		fontSize: 11.5,
		color: '#475569',
		marginTop: 2,
		lineHeight: 16,
	},

	/* ACTIVITIES LIST */
	servicesList: {
		gap: 10,
	},
	activityCard: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#FFFFFF',
		borderRadius: 14,
		borderWidth: 1,
		borderColor: '#E2E8F0',
		padding: 10,
		gap: 10,
	},
	activityThumb: {
		width: 60,
		height: 60,
		borderRadius: 10,
		backgroundColor: '#F1F5F9',
	},
	activityTextCol: {
		flex: 1,
		gap: 3,
	},
	activityTitle: {
		fontSize: 14,
		fontWeight: '700',
		color: '#0F172A',
	},
	activityDesc: {
		fontSize: 11.5,
		color: '#64748B',
		lineHeight: 15,
	},
	activityRightCol: {
		alignItems: 'flex-end',
		justifyContent: 'center',
	},
	trashBtn: {
		padding: 6,
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

	/* DURATION & SCHEDULE */
	durationSectionWrap: {
		gap: 6,
	},
	inputSubheading: {
		fontSize: 12,
		fontWeight: '700',
		color: '#475569',
		marginBottom: 4,
	},
	durationPillsRow: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 8,
	},
	durationPill: {
		paddingHorizontal: 12,
		paddingVertical: 8,
		borderRadius: 8,
		backgroundColor: '#F8FAFC',
		borderWidth: 1,
		borderColor: '#E2E8F0',
		alignItems: 'center',
		minWidth: 64,
	},
	durationPillActive: {
		backgroundColor: '#2B6F71',
		borderColor: '#2B6F71',
	},
	durationLabel: {
		fontSize: 13,
		fontWeight: '700',
		color: '#334155',
	},
	durationLabelActive: {
		color: '#FFFFFF',
	},
	durationSub: {
		fontSize: 10,
		color: '#64748B',
		marginTop: 2,
	},
	durationSubActive: {
		color: '#CCFBF1',
	},
	assessmentNoticeCard: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		gap: 10,
		backgroundColor: '#F0F9F9',
		borderRadius: 12,
		padding: 12,
		borderWidth: 1,
		borderColor: '#CCFBF1',
	},
	assessmentNoticeTitle: {
		fontSize: 13,
		fontWeight: '700',
		color: '#2B6F71',
	},
	assessmentNoticeBody: {
		fontSize: 11.5,
		color: '#475569',
		lineHeight: 16,
		marginTop: 2,
	},
	modeToggleRow: {
		flexDirection: 'row',
		backgroundColor: '#F1F5F9',
		borderRadius: 12,
		padding: 4,
		gap: 4,
		marginBottom: 4,
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
		fontSize: 13,
		fontWeight: '600',
		color: '#2B6F71',
	},
	modeTabTextActive: {
		color: '#FFFFFF',
		fontWeight: '700',
	},
	discountChip: {
		backgroundColor: '#DCFCE7',
		paddingHorizontal: 6,
		paddingVertical: 2,
		borderRadius: 4,
	},
	discountChipText: {
		fontSize: 9.5,
		fontWeight: '700',
		color: '#15803D',
	},
	recurringPresetsWrap: {
		marginTop: 4,
		gap: 8,
	},
	presetsRow: {
		flexDirection: 'row',
		gap: 6,
	},
	presetChip: {
		flex: 1,
		alignItems: 'center',
		paddingVertical: 8,
		backgroundColor: '#F8FAFC',
		borderRadius: 8,
		borderWidth: 1,
		borderColor: '#E2E8F0',
	},
	presetChipActive: {
		backgroundColor: '#2B6F71',
		borderColor: '#2B6F71',
	},
	presetChipText: {
		fontSize: 12,
		fontWeight: '600',
		color: '#334155',
	},
	presetChipTextActive: {
		color: '#FFFFFF',
		fontWeight: '700',
	},
	presetDiscountText: {
		fontSize: 9.5,
		fontWeight: '700',
		color: '#059669',
		marginTop: 2,
	},
	presetDiscountTextActive: {
		color: '#DCFCE7',
	},
	stepperRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		backgroundColor: '#F8FAFC',
		padding: 10,
		borderRadius: 8,
	},
	stepperLabel: {
		fontSize: 12,
		color: '#475569',
		fontWeight: '600',
	},
	stepperControls: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
	},
	stepperBtn: {
		width: 28,
		height: 28,
		borderRadius: 14,
		backgroundColor: '#E2E8F0',
		alignItems: 'center',
		justifyContent: 'center',
	},
	stepperValue: {
		fontSize: 14,
		fontWeight: '700',
		color: '#0F172A',
		minWidth: 20,
		textAlign: 'center',
	},
	quickDayRow: {
		flexDirection: 'row',
		gap: 8,
	},
	quickDayPill: {
		flex: 1,
		alignItems: 'center',
		paddingVertical: 8,
		backgroundColor: '#F8FAFC',
		borderRadius: 8,
		borderWidth: 1,
		borderColor: '#E2E8F0',
	},
	quickDayPillActive: {
		backgroundColor: '#2B6F71',
		borderColor: '#2B6F71',
	},
	quickDayText: {
		fontSize: 12.5,
		fontWeight: '600',
		color: '#334155',
	},
	quickDayTextActive: {
		color: '#FFFFFF',
		fontWeight: '700',
	},
	timeSlotScroll: {
		marginBottom: 4,
	},
	timeSlotPill: {
		paddingHorizontal: 12,
		paddingVertical: 8,
		backgroundColor: '#F8FAFC',
		borderRadius: 8,
		borderWidth: 1,
		borderColor: '#E2E8F0',
		marginRight: 8,
	},
	timeSlotPillActive: {
		backgroundColor: '#2B6F71',
		borderColor: '#2B6F71',
	},
	timeSlotText: {
		fontSize: 12,
		fontWeight: '600',
		color: '#475569',
	},
	timeSlotTextActive: {
		color: '#FFFFFF',
		fontWeight: '700',
	},
	scheduleSummaryBox: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		backgroundColor: '#F0F9F9',
		padding: 10,
		borderRadius: 8,
		marginTop: 4,
	},
	scheduleSummaryText: {
		fontSize: 12.5,
		fontWeight: '600',
		color: '#2B6F71',
	},

	/* SAFETY & INSTRUCTIONS */
	flagRow: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#F8FAFC',
		borderRadius: 10,
		padding: 10,
		borderWidth: 1,
		borderColor: '#E2E8F0',
		gap: 10,
	},
	flagRowActive: {
		backgroundColor: '#F0F9F9',
		borderColor: '#2B6F71',
	},
	checkbox: {
		width: 20,
		height: 20,
		borderRadius: 4,
		borderWidth: 2,
		borderColor: '#94A3B8',
		alignItems: 'center',
		justifyContent: 'center',
	},
	checkboxActive: {
		backgroundColor: '#2B6F71',
		borderColor: '#2B6F71',
	},
	flagMeta: {
		flex: 1,
	},
	flagTitle: {
		fontSize: 13,
		fontWeight: '700',
		color: '#0F172A',
	},
	flagSub: {
		fontSize: 11,
		color: '#64748B',
		marginTop: 1,
	},
	singleLineInput: {
		backgroundColor: '#F8FAFC',
		borderRadius: 8,
		borderWidth: 1,
		borderColor: '#E2E8F0',
		paddingHorizontal: 12,
		paddingVertical: 8,
		fontSize: 12.5,
		color: '#0F172A',
	},
	textInputWrap: {
		backgroundColor: '#F8FAFC',
		borderRadius: 8,
		borderWidth: 1,
		borderColor: '#E2E8F0',
		padding: 8,
	},
	textInput: {
		fontSize: 12.5,
		color: '#0F172A',
		textAlignVertical: 'top',
		minHeight: 60,
	},
	charCounter: {
		fontSize: 11,
		color: '#94A3B8',
		alignSelf: 'flex-end',
		marginTop: 4,
	},

	/* BILLING / SUMMARY */
	authoritativeNote: {
		fontSize: 11,
		fontWeight: '700',
		color: '#2B6F71',
		backgroundColor: '#E6F4F4',
		paddingHorizontal: 6,
		paddingVertical: 2,
		borderRadius: 4,
	},
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
	priceNoteSub: {
		fontSize: 11.5,
		color: '#64748B',
		marginTop: 4,
		lineHeight: 16,
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

	/* ADDRESS BOTTOM SHEET */
	addressSheetContent: {
		padding: 16,
		gap: 10,
	},
	addressItemRow: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#F8FAFC',
		borderRadius: 10,
		padding: 12,
		borderWidth: 1,
		borderColor: '#E2E8F0',
		gap: 10,
	},
	addressItemRowActive: {
		backgroundColor: '#F0F9F9',
		borderColor: '#2B6F71',
	},
	addressRadioCircle: {
		width: 18,
		height: 18,
		borderRadius: 9,
		borderWidth: 2,
		borderColor: '#94A3B8',
		alignItems: 'center',
		justifyContent: 'center',
	},
	addressRadioDot: {
		width: 8,
		height: 8,
		borderRadius: 4,
		backgroundColor: '#2B6F71',
	},
	addressMetaWrap: {
		flex: 1,
	},
	addressItemLabel: {
		fontSize: 13,
		fontWeight: '700',
		color: '#0F172A',
	},
	addressItemText: {
		fontSize: 12,
		color: '#64748B',
		marginTop: 2,
	},
	/* CONFIGURED REVIEW CARD */
	configuredReviewCard: {
		backgroundColor: '#FFFFFF',
		borderRadius: 12,
		borderWidth: 1,
		borderColor: '#E2E8F0',
		padding: 14,
		shadowColor: '#0F172A',
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.04,
		shadowRadius: 2,
		elevation: 1,
	},
	reviewFieldRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		gap: 12,
	},
	reviewCol: {
		flex: 1,
	},
	reviewLabel: {
		fontSize: 10.5,
		fontWeight: '700',
		color: '#64748B',
		letterSpacing: 0.5,
		marginBottom: 3,
	},
	reviewValueBold: {
		fontSize: 14.5,
		fontWeight: '700',
		color: '#0F172A',
	},
	reviewValue: {
		fontSize: 13.5,
		fontWeight: '600',
		color: '#334155',
	},
	reviewDivider: {
		height: 1,
		backgroundColor: '#F1F5F9',
		marginVertical: 10,
	},
})