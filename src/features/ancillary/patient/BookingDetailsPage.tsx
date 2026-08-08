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
} from '../../../components/common'
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

const DATE_OPTIONS = [
	{ id: 'd1', label: 'Today', date: '10 Aug 2025' },
	{ id: 'd2', label: 'Tomorrow', date: '11 Aug 2025' },
	{ id: 'd3', label: 'Wed', date: '12 Aug 2025' },
	{ id: 'd4', label: 'Thu', date: '13 Aug 2025' },
]

const TIME_SLOTS = [
	'09:00 AM - 10:00 AM',
	'11:00 AM - 12:00 PM',
	'02:00 PM - 03:00 PM',
	'05:00 PM - 06:00 PM',
	'07:00 PM - 08:00 PM',
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
		routeParams.services && routeParams.services.length > 0
			? routeParams.services
			: DEFAULT_MOCK_SERVICES

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

	// 3. Visit Details State
	const [visit, setVisit] = useState({
		addressId: 'addr1',
		addressLabel: 'Home',
		address: '42 Healthcare Avenue, Flat 3B, Sector 18, New Delhi - 110001',
		dateId: 'd1',
		date: 'Today, 10 Aug 2025',
		timeSlot: '09:00 AM - 10:00 AM',
		timeBadge: 'In 2 hours',
	})

	// Edit Modal Visibility States
	const [editPatientVisible, setEditPatientVisible] = useState(false)
	const [editVisitVisible, setEditVisitVisible] = useState(false)

	// Temporary Form States for Patient Edit Sheet
	const [tempPatientName, setTempPatientName] = useState(patient.name)
	const [tempPatientAge, setTempPatientAge] = useState(patient.age)
	const [tempPatientGender, setTempPatientGender] = useState(patient.gender)
	const [tempPatientRel, setTempPatientRel] = useState(patient.relationship)

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

	const handleSaveVisitDetails = (addressId: string, dateId: string, timeSlot: string) => {
		const selectedAddrObj = SAVED_ADDRESSES.find((a) => a.id === addressId)
		const selectedDateObj = DATE_OPTIONS.find((d) => d.id === dateId)

		setVisit({
			addressId,
			addressLabel: selectedAddrObj?.label || 'Home',
			address: selectedAddrObj?.address || visit.address,
			dateId,
			date: selectedDateObj ? `${selectedDateObj.label}, ${selectedDateObj.date}` : visit.date,
			timeSlot,
			timeBadge: timeSlot.includes('09:00') ? 'In 2 hours' : 'Confirmed',
		})
		setEditVisitVisible(false)
	}

	const handleContinueToPayment = () => {
		const bookingPayload = {
			services,
			patient,
			visit,
			charges,
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
				{/* Progress Stepper */}
				<BookingProgressStepper currentStep={2} style={styles.progressStepper} />

				{/* 1. SECTION: SELECTED SERVICES */}
				<View style={styles.sectionHeaderRow}>
					<AppTypography variant="h3" style={styles.sectionHeading}>
						Selected Services
					</AppTypography>
					<TouchableOpacity style={styles.headerActionBtn} onPress={handleEditServices} activeOpacity={0.7}>
						<MaterialCommunityIcons name="plus-circle-outline" size={16} color="#1F5F68" />
						<AppTypography variant="caption" style={styles.actionBtnText}>
							Add / Edit
						</AppTypography>
					</TouchableOpacity>
				</View>

				{services.length > 0 ? (
					<View style={styles.servicesListContainer}>
						{services.map((serviceItem, index) => (
							<View key={serviceItem.id} style={styles.serviceItemFlat}>
								{index > 0 && <View style={styles.itemDivider} />}
								<View style={styles.serviceItemRow}>
									<Image source={{ uri: serviceItem.image }} style={styles.serviceImage} resizeMode="cover" />

									<View style={styles.serviceTextCol}>
										<View style={styles.serviceTitleRow}>
											<AppTypography variant="h4" style={styles.serviceTitle} numberOfLines={1}>
												{serviceItem.title}
											</AppTypography>
											<TouchableOpacity
												style={styles.removeBtn}
												onPress={() => handleRemoveService(serviceItem.id)}
												activeOpacity={0.7}
											>
												<Ionicons name="trash-outline" size={17} color="#D32F2F" />
											</TouchableOpacity>
										</View>
										<AppTypography variant="caption" style={styles.serviceDesc} numberOfLines={2}>
											{serviceItem.description}
										</AppTypography>

										<View style={styles.metaBadgeRow}>
											<View style={styles.metaItem}>
												<Ionicons name="time-outline" size={12} color="#526062" />
												<AppTypography variant="caption" style={styles.metaText}>
													{serviceItem.duration || '30 - 45 mins'}
												</AppTypography>
											</View>
											<View style={styles.metaItem}>
												<Ionicons name="home-outline" size={12} color="#526062" />
												<AppTypography variant="caption" style={styles.metaText}>
													At Home
												</AppTypography>
											</View>
										</View>
									</View>
								</View>

								<View style={styles.serviceFooterRow}>
									<View style={styles.councilBadge}>
										<Ionicons name="shield-checkmark" size={12} color="#1F5F68" />
										<AppTypography variant="caption" style={styles.councilText}>
											Recommended by Nursing Council
										</AppTypography>
									</View>
									<AppTypography variant="h3" style={styles.priceVal}>
										{serviceItem.price}
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
					<TouchableOpacity style={styles.headerActionBtn} onPress={handleOpenPatientEdit} activeOpacity={0.7}>
						<MaterialCommunityIcons name="pencil-outline" size={15} color="#1F5F68" />
						<AppTypography variant="caption" style={styles.actionBtnText}>
							Edit Details
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

				{/* 3. SECTION: VISIT SCHEDULE & LOCATION */}
				<View style={styles.sectionHeaderRow}>
					<AppTypography variant="h3" style={styles.sectionHeading}>
						Schedule & Location
					</AppTypography>
					<TouchableOpacity style={styles.headerActionBtn} onPress={() => setEditVisitVisible(true)} activeOpacity={0.7}>
						<MaterialCommunityIcons name="pencil-outline" size={15} color="#1F5F68" />
						<AppTypography variant="caption" style={styles.actionBtnText}>
							Modify
						</AppTypography>
					</TouchableOpacity>
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
									Visit Address
								</AppTypography>
								<View style={styles.addressTypeBadge}>
									<AppTypography variant="caption" style={styles.addressTypeText}>
										{visit.addressLabel}
									</AppTypography>
								</View>
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
							<MaterialCommunityIcons name="calendar-clock" size={18} color="#1F5F68" />
						</View>
						<View style={styles.visitDetailsCol}>
							<AppTypography variant="h4" style={styles.visitDetailsHeading}>
								Preferred Date & Time Slot
							</AppTypography>
							<View style={styles.visitTimeValRow}>
								<AppTypography variant="body" style={styles.visitTimeValText}>
									{visit.date}  •  {visit.timeSlot}
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
				<AppTypography variant="h3" style={[styles.sectionHeading, { marginBottom: 12 }]}>
					Billing Breakdown
				</AppTypography>
				
				<View style={styles.receiptContainer}>
					<View style={styles.receiptItem}>
						<AppTypography variant="body" style={styles.receiptItemLabel}>
							Base Treatment Price
						</AppTypography>
						<AppTypography variant="body" style={styles.receiptItemVal}>
							{charges.basePrice}
						</AppTypography>
					</View>
					
					<View style={styles.receiptItem}>
						<AppTypography variant="body" style={styles.receiptItemLabel}>
							Home Visit & Disinfection Charge
						</AppTypography>
						<AppTypography variant="body" style={styles.receiptItemVal}>
							{charges.visitFee}
						</AppTypography>
					</View>

					<View style={styles.receiptItem}>
						<AppTypography variant="body" style={styles.receiptItemLabel}>
							Taxes & Medical Admin Fee
						</AppTypography>
						<AppTypography variant="body" style={styles.receiptItemVal}>
							{charges.taxes}
						</AppTypography>
					</View>

					<View style={styles.receiptDivider} />

					<View style={styles.receiptTotalRow}>
						<AppTypography variant="h3" style={styles.receiptTotalLabel}>
							Amount Payable
						</AppTypography>
						<AppTypography variant="h2" style={styles.receiptTotalVal}>
							{charges.totalAmount}
						</AppTypography>
					</View>
				</View>

				{/* Elegant Integrated Reassurance Banner */}
				<View style={styles.reassuranceBanner}>
					<MaterialCommunityIcons name="shield-check-outline" size={20} color="#1F5F68" />
					<AppTypography variant="caption" style={styles.reassuranceText}>
						Includes fully certified clinical specialists, 100% sanitized single-use medical equipment, and active safety protocols.
					</AppTypography>
				</View>
			</ScrollView>

			{/* Sticky Bottom Footer */}
			<View style={[styles.stickyFooter, { paddingBottom: Math.max(insets.bottom, 12) }]}>
				<View style={styles.stickyLeft}>
					<AppTypography variant="caption" style={styles.stickyPayLabel}>
						Total Amount
					</AppTypography>
					<AppTypography variant="h2" style={styles.stickyPayVal}>
						{charges.totalAmount}
					</AppTypography>
					<AppTypography variant="caption" style={styles.stickyPaySub}>
						No immediate charge
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
				currentAddressId={visit.addressId}
				currentDateId={visit.dateId}
				currentTimeSlot={visit.timeSlot}
				onClose={() => setEditVisitVisible(false)}
				onSave={handleSaveVisitDetails}
				onOpenMap={() => {
					setEditVisitVisible(false)
					navigation.navigate(ROUTES.STACK.LOCATION_SELECT)
				}}
			/>
		</View>
	)
}

// Sub-Component: Edit Visit Details Bottom Sheet
interface EditVisitModalProps {
	visible: boolean
	currentAddressId: string
	currentDateId: string
	currentTimeSlot: string
	onClose: () => void
	onSave: (addressId: string, dateId: string, timeSlot: string) => void
	onOpenMap: () => void
}

const EditVisitModal: React.FC<EditVisitModalProps> = ({
	visible,
	currentAddressId,
	currentDateId,
	currentTimeSlot,
	onClose,
	onSave,
	onOpenMap,
}) => {
	const [selectedAddrId, setSelectedAddrId] = useState(currentAddressId)
	const [selectedDateId, setSelectedDateId] = useState(currentDateId)
	const [selectedSlot, setSelectedSlot] = useState(currentTimeSlot)

	return (
		<AppBottomSheet visible={visible} title="Edit Visit Details" onClose={onClose}>
			<View style={styles.sheetFormContainer}>
				{/* Address Section */}
				<View style={styles.sheetSectionHeaderRow}>
					<AppTypography variant="h4" style={styles.sheetSectionTitle}>
						Select Visit Address
					</AppTypography>
					<TouchableOpacity style={styles.mapLinkBtn} onPress={onOpenMap} activeOpacity={0.7}>
						<Ionicons name="map-outline" size={14} color="#1F5F68" />
						<AppTypography variant="caption" style={styles.mapLinkText}>
							Choose on Map
						</AppTypography>
					</TouchableOpacity>
				</View>

				{SAVED_ADDRESSES.map((addr) => {
					const isSel = selectedAddrId === addr.id
					return (
						<TouchableOpacity
							key={addr.id}
							style={[styles.sheetAddrItem, isSel && styles.sheetAddrItemSelected]}
							onPress={() => setSelectedAddrId(addr.id)}
							activeOpacity={0.8}
						>
							<View style={styles.radioCircle}>
								{isSel && <View style={styles.radioDot} />}
							</View>
							<View style={styles.sheetAddrTextCol}>
								<AppTypography variant="h4" style={styles.sheetAddrLabel}>
									{addr.label}
								</AppTypography>
								<AppTypography variant="caption" style={styles.sheetAddrSub}>
									{addr.address}
								</AppTypography>
							</View>
						</TouchableOpacity>
					)
				})}

				{/* Date Picker Section */}
				<AppTypography variant="h4" style={styles.sheetSectionTitleMargin}>
					Select Preferred Date
				</AppTypography>
				<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateRowScroll}>
					{DATE_OPTIONS.map((d) => {
						const isSel = selectedDateId === d.id
						return (
							<TouchableOpacity
								key={d.id}
								style={[styles.dateChip, isSel && styles.dateChipSelected]}
								onPress={() => setSelectedDateId(d.id)}
								activeOpacity={0.8}
							>
								<AppTypography variant="caption" style={[styles.dateChipText, isSel && styles.dateChipTextSelected]}>
									{d.label}
								</AppTypography>
								<AppTypography variant="h4" style={[styles.dateChipDate, isSel && styles.dateChipDateSelected]}>
									{d.date}
								</AppTypography>
							</TouchableOpacity>
						)
					})}
				</ScrollView>

				{/* Time Slot Section */}
				<AppTypography variant="h4" style={styles.sheetSectionTitleMargin}>
					Select Time Slot
				</AppTypography>
				<View style={styles.slotGrid}>
					{TIME_SLOTS.map((slot) => {
						const isSel = selectedSlot === slot
						return (
							<TouchableOpacity
								key={slot}
								style={[styles.slotItem, isSel && styles.slotItemSelected]}
								onPress={() => setSelectedSlot(slot)}
								activeOpacity={0.8}
							>
								<AppTypography variant="caption" style={[styles.slotItemText, isSel && styles.slotItemTextSelected]}>
									{slot}
								</AppTypography>
							</TouchableOpacity>
						)
					})}
				</View>

				<AppButton
					variant="primary"
					formAction
					style={styles.saveSheetBtn}
					onPress={() => onSave(selectedAddrId, selectedDateId, selectedSlot)}
				>
					Save Visit Details
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
})
