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
import AppScreenHeader from '../../components/common/AppScreenHeader'
import { AppTypography } from '../../components/common/AppTypography'
import { AppButton } from '../../components/common/AppButton'
import { AppInput } from '../../components/common/AppInput'
import { AppSelect, AppSelectOption } from '../../components/common/AppSelect'
import { AppBottomSheet } from '../../components/common/AppBottomSheet'
import { ServiceProcedureItem } from './components/AllServiceCard'
import { BookingProgressStepper } from './components/BookingProgressStepper'

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
			<AppScreenHeader title="Book Nursing Care" />

			<ScrollView
				contentContainerStyle={[
					styles.scrollContent,
					isTablet && styles.scrollContentTablet,
					{ paddingBottom: insets.bottom + 110 },
				]}
				showsVerticalScrollIndicator={false}
			>
				{/* 1. Progress Stepper */}
				<BookingProgressStepper currentStep={2} />

				{/* 2. Card 1: Selected Services (Supports Multiple Services) */}
				<View style={styles.card}>
					<View style={styles.cardHeaderRow}>
						<View style={styles.titleWithIcon}>
							<MaterialCommunityIcons name="medical-bag" size={20} color="#1F5F68" />
							<AppTypography variant="h3" style={styles.cardTitle}>
								Selected Services ({services.length})
							</AppTypography>
						</View>
						<TouchableOpacity onPress={handleEditServices} activeOpacity={0.7}>
							<AppTypography variant="caption" style={styles.editLink}>
								Edit / Add
							</AppTypography>
						</TouchableOpacity>
					</View>

					{services.length > 0 ? (
						<View style={styles.servicesListContainer}>
							{services.map((serviceItem) => (
								<View key={serviceItem.id} style={styles.serviceItemCard}>
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
														At Home Service
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
							<AppTypography variant="caption" style={styles.emptyText}>
								No services selected. Tap Edit / Add to select healthcare services.
							</AppTypography>
						</View>
					)}
				</View>

				{/* 3. Card 2: Patient Details (With Edit Modal Trigger) */}
				<View style={styles.card}>
					<View style={styles.cardHeaderRow}>
						<View style={styles.titleWithIcon}>
							<MaterialCommunityIcons name="account-outline" size={20} color="#1F5F68" />
							<AppTypography variant="h3" style={styles.cardTitle}>
								Patient Details
							</AppTypography>
						</View>
						<TouchableOpacity onPress={handleOpenPatientEdit} activeOpacity={0.7}>
							<AppTypography variant="caption" style={styles.editLink}>
								Edit
							</AppTypography>
						</TouchableOpacity>
					</View>

					<View style={styles.patientRow}>
						<Image source={{ uri: patient.avatar }} style={styles.patientAvatar} resizeMode="cover" />

						<View style={styles.patientInfoCol}>
							<AppTypography variant="h3" style={styles.patientName}>
								{patient.name}
							</AppTypography>
							<AppTypography variant="caption" style={styles.patientMeta}>
								{patient.age} Years • {patient.gender} • {patient.bloodGroup}
							</AppTypography>
							<AppTypography variant="caption" style={styles.patientRel}>
								Relationship: {patient.relationship}
							</AppTypography>
						</View>
					</View>
				</View>

				{/* 4. Card 3: Visit Details (With Edit Modal Trigger) */}
				<View style={styles.card}>
					<View style={styles.cardHeaderRow}>
						<View style={styles.titleWithIcon}>
							<MaterialCommunityIcons name="map-marker-outline" size={20} color="#1F5F68" />
							<AppTypography variant="h3" style={styles.cardTitle}>
								Visit Details
							</AppTypography>
						</View>
						<TouchableOpacity onPress={() => setEditVisitVisible(true)} activeOpacity={0.7}>
							<AppTypography variant="caption" style={styles.editLink}>
								Edit
							</AppTypography>
						</TouchableOpacity>
					</View>

					{/* Address Row */}
					<TouchableOpacity
						style={styles.visitRowItem}
						onPress={() => setEditVisitVisible(true)}
						activeOpacity={0.8}
					>
						<MaterialCommunityIcons name="home-map-marker" size={20} color="#1F5F68" style={styles.visitRowIcon} />
						<View style={styles.visitTextCol}>
							<View style={styles.addressTagRow}>
								<AppTypography variant="h4" style={styles.visitLabel}>
									Address
								</AppTypography>
								<View style={styles.tagChip}>
									<AppTypography variant="caption" style={styles.tagText}>
										{visit.addressLabel}
									</AppTypography>
								</View>
							</View>
							<AppTypography variant="caption" style={styles.visitValText}>
								{visit.address}
							</AppTypography>
						</View>
						<Ionicons name="chevron-forward" size={18} color="#94A3B8" />
					</TouchableOpacity>

					<View style={styles.dividerLight} />

					{/* Date Row */}
					<TouchableOpacity
						style={styles.visitRowItem}
						onPress={() => setEditVisitVisible(true)}
						activeOpacity={0.8}
					>
						<MaterialCommunityIcons name="calendar-outline" size={20} color="#1F5F68" style={styles.visitRowIcon} />
						<View style={styles.visitTextCol}>
							<AppTypography variant="caption" style={styles.visitLabel}>
								Date
							</AppTypography>
							<AppTypography variant="body" style={styles.visitValBold}>
								{visit.date}
							</AppTypography>
						</View>
						<Ionicons name="chevron-forward" size={18} color="#94A3B8" />
					</TouchableOpacity>

					<View style={styles.dividerLight} />

					{/* Time Slot Row */}
					<TouchableOpacity
						style={styles.visitRowItem}
						onPress={() => setEditVisitVisible(true)}
						activeOpacity={0.8}
					>
						<MaterialCommunityIcons name="clock-outline" size={20} color="#1F5F68" style={styles.visitRowIcon} />
						<View style={styles.visitTextCol}>
							<AppTypography variant="caption" style={styles.visitLabel}>
								Time Slot
							</AppTypography>
							<View style={styles.timeValRow}>
								<AppTypography variant="body" style={styles.visitValBold}>
									{visit.timeSlot}
								</AppTypography>
								<View style={styles.timeBadge}>
									<AppTypography variant="caption" style={styles.timeBadgeText}>
										{visit.timeBadge}
									</AppTypography>
								</View>
							</View>
						</View>
						<Ionicons name="chevron-forward" size={18} color="#94A3B8" />
					</TouchableOpacity>
				</View>

				{/* 5. Card 4: Charges Summary */}
				<View style={styles.card}>
					<View style={styles.cardHeaderRow}>
						<View style={styles.titleWithIcon}>
							<MaterialCommunityIcons name="file-document-outline" size={20} color="#1F5F68" />
							<AppTypography variant="h3" style={styles.cardTitle}>
								Charges Summary
							</AppTypography>
						</View>
						<AppTypography variant="caption" style={styles.editLink}>
							{services.length} Item(s)
						</AppTypography>
					</View>

					<View style={styles.lineItem}>
						<AppTypography variant="body" style={styles.lineLabel}>
							Base Service Price ({services.length} service{services.length > 1 ? 's' : ''})
						</AppTypography>
						<AppTypography variant="body" style={styles.lineVal}>
							{charges.basePrice}
						</AppTypography>
					</View>

					<View style={styles.lineItem}>
						<AppTypography variant="body" style={styles.lineLabel}>
							Home Visit & Equipment Sanitization
						</AppTypography>
						<AppTypography variant="body" style={styles.lineVal}>
							{charges.visitFee}
						</AppTypography>
					</View>

					<View style={styles.lineItem}>
						<AppTypography variant="body" style={styles.lineLabel}>
							Taxes & Admin Fee
						</AppTypography>
						<AppTypography variant="body" style={styles.lineVal}>
							{charges.taxes}
						</AppTypography>
					</View>

					<View style={styles.divider} />

					<View style={styles.totalLine}>
						<AppTypography variant="h3" style={styles.totalLabel}>
							Total Amount
						</AppTypography>
						<AppTypography variant="h2" style={styles.totalValText}>
							{charges.totalAmount}
						</AppTypography>
					</View>
				</View>

				{/* 6. Trust Badges Row */}
				<View style={styles.trustBadgesRow}>
					<View style={styles.trustItem}>
						<Ionicons name="checkmark-circle-outline" size={16} color="#1F5F68" />
						<AppTypography variant="caption" style={styles.trustText}>
							Verified Nurses
						</AppTypography>
					</View>
					<View style={styles.trustItem}>
						<MaterialCommunityIcons name="spray-bottle" size={16} color="#1F5F68" />
						<AppTypography variant="caption" style={styles.trustText}>
							Sanitized Equipment
						</AppTypography>
					</View>
					<View style={styles.trustItem}>
						<Ionicons name="time-outline" size={16} color="#1F5F68" />
						<AppTypography variant="caption" style={styles.trustText}>
							On-time Service
						</AppTypography>
					</View>
					<View style={styles.trustItem}>
						<MaterialCommunityIcons name="shield-lock-outline" size={16} color="#1F5F68" />
						<AppTypography variant="caption" style={styles.trustText}>
							Safe & Secure
						</AppTypography>
					</View>
				</View>
			</ScrollView>

			{/* 7. Sticky Bottom CTA Footer */}
			<View style={[styles.stickyFooter, { paddingBottom: Math.max(insets.bottom, 12) }]}>
				<View style={styles.stickyLeftCol}>
					<AppTypography variant="caption" style={styles.stickyLabel}>
						Total Amount
					</AppTypography>
					<AppTypography variant="h2" style={styles.stickyPrice}>
						{charges.totalAmount}
					</AppTypography>
					<TouchableOpacity style={styles.priceDetailsLinkRow} activeOpacity={0.7}>
						<AppTypography variant="caption" style={styles.priceDetailsText}>
							View price details
						</AppTypography>
						<Ionicons name="chevron-down" size={12} color="#1F5F68" />
					</TouchableOpacity>
					<AppTypography variant="caption" style={styles.stickySubtext}>
						You won't be charged now
					</AppTypography>
				</View>

				<AppButton
					variant="primary"
					style={styles.continueBtn}
					labelStyle={styles.continueBtnLabel}
					contentStyle={styles.continueBtnContent}
					disabled={services.length === 0}
					onPress={handleContinueToPayment}
				>
					Continue to Payment →
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
		backgroundColor: '#F4F7F8',
	},
	scrollContent: {
		paddingHorizontal: 16,
		paddingTop: 12,
	},
	scrollContentTablet: {
		maxWidth: 720,
		width: '100%',
		alignSelf: 'center',
		paddingHorizontal: 24,
		paddingTop: 20,
	},
	topHeaderBanner: {
		marginBottom: 16,
	},
	secureBadge: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#E6F3F4',
		borderRadius: 12,
		paddingHorizontal: 12,
		paddingVertical: 8,
		alignSelf: 'flex-end',
		marginBottom: 14,
		gap: 6,
	},
	secureTextCol: {
		flexDirection: 'column',
	},
	secureTitle: {
		fontSize: 11,
		fontWeight: '700',
		color: '#1F5F68',
	},
	secureSub: {
		fontSize: 9,
		color: '#526062',
	},
	stepperRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: 20,
	},
	stepItemActive: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
	},
	stepCircleActive: {
		width: 24,
		height: 24,
		borderRadius: 12,
		backgroundColor: '#1F5F68',
		alignItems: 'center',
		justifyContent: 'center',
	},
	stepNumActive: {
		color: '#FFFFFF',
		fontSize: 12,
		fontWeight: '700',
	},
	stepLabelActive: {
		fontSize: 13,
		fontWeight: '700',
		color: '#1F5F68',
	},
	stepLine: {
		flex: 1,
		height: 2,
		backgroundColor: '#CBD5E1',
		marginHorizontal: 12,
	},
	stepItemInactive: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
	},
	stepCircleInactive: {
		width: 24,
		height: 24,
		borderRadius: 12,
		borderWidth: 1.5,
		borderColor: '#94A3B8',
		alignItems: 'center',
		justifyContent: 'center',
	},
	stepNumInactive: {
		color: '#94A3B8',
		fontSize: 12,
		fontWeight: '700',
	},
	stepLabelInactive: {
		fontSize: 13,
		fontWeight: '500',
		color: '#94A3B8',
	},
	card: {
		backgroundColor: '#FFFFFF',
		borderRadius: 16,
		padding: 16,
		marginBottom: 14,
		borderWidth: 1,
		borderColor: '#E8ECEC',
		elevation: 1,
		shadowColor: '#000000',
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.04,
		shadowRadius: 3,
	},
	cardHeaderRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginBottom: 14,
	},
	titleWithIcon: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
	},
	cardTitle: {
		fontSize: 16,
		fontWeight: '700',
		color: '#191C1D',
	},
	editLink: {
		fontSize: 13,
		fontWeight: '600',
		color: '#1F5F68',
	},
	servicesListContainer: {
		gap: 12,
	},
	serviceItemCard: {
		backgroundColor: '#F8FAFC',
		borderRadius: 12,
		padding: 10,
		borderWidth: 1,
		borderColor: '#E2E8F0',
	},
	serviceItemRow: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		marginBottom: 8,
	},
	serviceImage: {
		width: 64,
		height: 64,
		borderRadius: 10,
		backgroundColor: '#F1F5F9',
	},
	serviceTextCol: {
		flex: 1,
		marginLeft: 10,
	},
	serviceTitleRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	serviceTitle: {
		fontSize: 14,
		fontWeight: '700',
		color: '#191C1D',
		flex: 1,
	},
	removeBtn: {
		padding: 4,
		marginLeft: 6,
	},
	serviceDesc: {
		fontSize: 11,
		color: '#526062',
		marginTop: 2,
		lineHeight: 15,
	},
	metaBadgeRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
		marginTop: 4,
	},
	metaItem: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
	},
	metaText: {
		fontSize: 10,
		color: '#526062',
	},
	serviceFooterRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingTop: 8,
		borderTopWidth: 1,
		borderTopColor: '#E2E8F0',
	},
	councilBadge: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#E6F3F4',
		paddingHorizontal: 6,
		paddingVertical: 3,
		borderRadius: 8,
		gap: 4,
	},
	councilText: {
		fontSize: 10,
		fontWeight: '600',
		color: '#1F5F68',
	},
	priceVal: {
		fontSize: 15,
		fontWeight: '700',
		color: '#1F5F68',
	},
	emptyBox: {
		padding: 16,
		alignItems: 'center',
	},
	emptyText: {
		fontSize: 12,
		color: '#64748B',
		textAlign: 'center',
	},
	patientRow: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	patientAvatar: {
		width: 56,
		height: 56,
		borderRadius: 28,
		backgroundColor: '#E2E8F0',
	},
	patientInfoCol: {
		flex: 1,
		marginLeft: 14,
	},
	patientName: {
		fontSize: 16,
		fontWeight: '700',
		color: '#191C1D',
	},
	patientMeta: {
		fontSize: 12,
		color: '#526062',
		marginTop: 2,
	},
	patientRel: {
		fontSize: 12,
		color: '#64748B',
		marginTop: 2,
	},
	visitRowItem: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: 8,
	},
	visitRowIcon: {
		marginRight: 12,
	},
	visitTextCol: {
		flex: 1,
	},
	addressTagRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
	},
	visitLabel: {
		fontSize: 13,
		fontWeight: '600',
		color: '#64748B',
	},
	tagChip: {
		backgroundColor: '#E6F3F4',
		paddingHorizontal: 6,
		paddingVertical: 1,
		borderRadius: 6,
	},
	tagText: {
		fontSize: 10,
		fontWeight: '700',
		color: '#1F5F68',
	},
	visitValText: {
		fontSize: 12,
		color: '#191C1D',
		marginTop: 2,
		lineHeight: 16,
	},
	visitValBold: {
		fontSize: 13,
		fontWeight: '700',
		color: '#191C1D',
		marginTop: 2,
	},
	timeValRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
	},
	timeBadge: {
		backgroundColor: '#E6F3F4',
		paddingHorizontal: 6,
		paddingVertical: 2,
		borderRadius: 8,
	},
	timeBadgeText: {
		fontSize: 10,
		fontWeight: '600',
		color: '#1F5F68',
	},
	dividerLight: {
		height: 1,
		backgroundColor: '#F1F5F9',
		marginVertical: 4,
	},
	lineItem: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 8,
	},
	lineLabel: {
		fontSize: 13,
		color: '#526062',
	},
	lineVal: {
		fontSize: 13,
		fontWeight: '600',
		color: '#191C1D',
	},
	divider: {
		height: 1,
		backgroundColor: '#E8ECEC',
		marginVertical: 10,
	},
	totalLine: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
	},
	totalLabel: {
		fontSize: 15,
		fontWeight: '700',
		color: '#191C1D',
	},
	totalValText: {
		fontSize: 20,
		fontWeight: '700',
		color: '#1F5F68',
	},
	trustBadgesRow: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		justifyContent: 'space-between',
		backgroundColor: '#FFFFFF',
		borderRadius: 14,
		padding: 12,
		marginBottom: 16,
		borderWidth: 1,
		borderColor: '#E8ECEC',
		gap: 8,
	},
	trustItem: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
	},
	trustText: {
		fontSize: 11,
		fontWeight: '600',
		color: '#1F5F68',
	},
	stickyFooter: {
		position: 'absolute',
		bottom: 0,
		left: 0,
		right: 0,
		backgroundColor: '#FFFFFF',
		borderTopWidth: 1,
		borderTopColor: '#E2E8F0',
		paddingHorizontal: 16,
		paddingTop: 12,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		elevation: 8,
		shadowColor: '#000000',
		shadowOffset: { width: 0, height: -2 },
		shadowOpacity: 0.1,
		shadowRadius: 6,
	},
	stickyLeftCol: {
		flex: 1,
		marginRight: 12,
	},
	stickyLabel: {
		fontSize: 10,
		color: '#64748B',
		fontWeight: '600',
	},
	stickyPrice: {
		fontSize: 18,
		fontWeight: '700',
		color: '#1F5F68',
		lineHeight: 22,
	},
	priceDetailsLinkRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 2,
		marginTop: 1,
	},
	priceDetailsText: {
		fontSize: 10,
		fontWeight: '600',
		color: '#1F5F68',
	},
	stickySubtext: {
		fontSize: 9,
		color: '#94A3B8',
		marginTop: 1,
	},
	continueBtn: {
		backgroundColor: '#1F5F68',
		borderRadius: 12,
		minWidth: 160,
	},
	continueBtnLabel: {
		color: '#FFFFFF',
		fontSize: 13,
		fontWeight: '700',
	},
	continueBtnContent: {
		height: 44,
		paddingHorizontal: 16,
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
