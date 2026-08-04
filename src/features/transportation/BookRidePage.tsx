import React, { useState, useEffect } from 'react'
import {
	View,
	Text,
	ScrollView,
	StyleSheet,
	TouchableOpacity,
	ActivityIndicator,
	TextInput,
	useWindowDimensions,
} from 'react-native'
import { useTheme, Button } from 'react-native-paper'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'

import { AppStackParamList } from '../../navigation/types'
import { ROUTES } from '../../navigation/routes'
import ApiService from '../../services/apiService'
import { API_ENDPOINTS } from '../../constants/apiUrls'
import { Appointment } from '../../types/appointment'
import { RideEstimate, RideBooking } from '../../types/transportation'
import { saveRide } from './transportationService'
import AppScreenHeader from '../../components/common/AppScreenHeader'
import StatusModal from '../../components/common/StatusModal'
import { AppToggle, AppSelect } from '../../components/common'
import RideMapTracker from './components/RideMapTracker'

type RouteProps = RouteProp<AppStackParamList, typeof ROUTES.STACK.BOOK_RIDE>
type NavigationProp = NativeStackNavigationProp<AppStackParamList>

export interface PatientAddressOut {
	id: string
	label?: string
	address_line: string
	city: string
	state: string
	pincode: string
	is_default: boolean
}

// Curated list of major Bengaluru hubs for custom address dropdown autocomplete search
const BENGALURU_LOCATIONS = [
	'123 Indiranagar, Bengaluru',
	'Koramangala 4th Block, Bengaluru',
	'Whitefield IT Park, Bengaluru',
	'MG Road Metro Station, Bengaluru',
	'Jayanagar 4th Block, Bengaluru',
	'HSR Layout Sector 2, Bengaluru',
	'Electronic City Phase 1, Bengaluru',
]

const PAYMENT_OPTIONS = [
	{ label: '💳 Pay Now (Card/UPI Online)', value: 'pay_now' },
	{ label: '📄 Charge to Hospital Bill (Pay at Discharge)', value: 'hospital_bill' },
	{ label: '🏥 Claim under Health Insurance (Cashless NEMT)', value: 'insurance' },
]

export default function BookRidePage() {
	const theme = useTheme()
	const route = useRoute<RouteProps>()
	const navigation = useNavigation<NavigationProp>()

	const { width, height } = useWindowDimensions()
	const isLandscape = width > height
	const isTabletOrDesktop = width >= 768
	const isTwoColumnLayout = isTabletOrDesktop && isLandscape

	const { appointmentId, type = 'onward' } = route.params
	const bookingType = type === 'return' ? 'return' : 'onward'

	const [appt, setAppt] = useState<Appointment | null>(null)
	const [apptLoading, setApptLoading] = useState(true)
	const [apptError, setApptError] = useState<string | null>(null)

	const [savedAddresses, setSavedAddresses] = useState<PatientAddressOut[]>([])
	const [selectedAddressId, setSelectedAddressId] = useState<string>('')

	// Custom Address Autocomplete states
	const [customAddress, setCustomAddress] = useState(BENGALURU_LOCATIONS[0])
	const [customSearchQuery, setCustomSearchQuery] = useState('')
	const [showSuggestions, setShowSuggestions] = useState(false)
	const [useCustomAddress, setUseCustomAddress] = useState(false)

	const [selectedRideOption, setSelectedRideOption] = useState<'economy' | 'comfort' | 'medical'>('economy')
	const [estimatesLoading, setEstimatesLoading] = useState(false)
	const [rideEstimates, setRideEstimates] = useState<RideEstimate[]>([])

	const [wheelchair, setWheelchair] = useState(false)
	const [assistance, setAssistance] = useState(false)
	const [companion, setCompanion] = useState(false)
	const [paymentMethod, setPaymentMethod] = useState<'pay_now' | 'hospital_bill' | 'insurance'>('pay_now')

	const [booking, setBooking] = useState(false)
	const [showSuccessModal, setShowSuccessModal] = useState(false)

	const getSuggestedPickupTime = (startTimeStr?: string) => {
		if (!startTimeStr) return ''
		const parts = startTimeStr.split(':')
		if (parts.length < 2) return startTimeStr
		const [h, m] = parts
		let hour = parseInt(h, 10) - 1
		if (hour < 0) hour += 24
		const ampm = hour >= 12 ? 'PM' : 'AM'
		const displayHour = hour % 12 || 12
		return `${displayHour}:${m || '00'} ${ampm}`
	}

	const clinicAddress = appt?.hospital?.address || appt?.hospital?.name || 'Apollo Hospital, Bengaluru'

	// Fetch appointment details
	useEffect(() => {
		if (!appointmentId) return
		setApptLoading(true)
		ApiService.get<{ data?: Appointment } | Appointment>(API_ENDPOINTS.APPOINTMENTS.GET_BY_ID(appointmentId))
			.then((res) => {
				const apptData = (res.data as any)?.data || res.data
				setAppt(apptData)
			})
			.catch((err) => {
				console.error('[BookRidePage] Error fetching appointment:', err)
				setApptError('Failed to load appointment details.')
			})
			.finally(() => setApptLoading(false))
	}, [appointmentId])

	// Fetch patient saved addresses
	useEffect(() => {
		ApiService.get<{ success: boolean; data?: PatientAddressOut[] }>(API_ENDPOINTS.PATIENT.ADDRESSES)
			.then((res) => {
				if (res.data?.data) {
					const addrs = res.data.data
					setSavedAddresses(addrs)
					const def = addrs.find((a) => a.is_default)
					if (def) setSelectedAddressId(def.id)
					else if (addrs.length > 0) setSelectedAddressId(addrs[0].id)
				}
			})
			.catch((err) => console.error('[BookRidePage] Error loading addresses:', err))
	}, [])

	// Estimate fares
	useEffect(() => {
		if (!apptLoading && appt) {
			setEstimatesLoading(true)
			const timer = setTimeout(() => {
				const activeAddr = useCustomAddress ? customAddress : selectedAddressId
				const basePrice = activeAddr
					? 180 + (parseInt(activeAddr.slice(-1), 16) || 5) * 15
					: 220
				setRideEstimates([
					{ type: 'economy', label: 'Budget Sedan', price: basePrice, eta: 5 },
					{ type: 'comfort', label: 'Comfort SUV', price: basePrice + 120, eta: 7 },
					{ type: 'medical', label: 'Accessible Medical Cab', price: basePrice + 220, eta: 11 },
				])
				setEstimatesLoading(false)
			}, 300)
			return () => clearTimeout(timer)
		}
	}, [apptLoading, appt, selectedAddressId, useCustomAddress, customAddress])

	const selectedRideDetails = rideEstimates.find((e) => e.type === selectedRideOption) || rideEstimates[0]

	const activeUserAddrLabel = useCustomAddress
		? (customAddress ? customAddress.split(',')[0] : 'Custom Pickup')
		: (savedAddresses.find(a => a.id === selectedAddressId)?.label || 'Home')

	const pickupLabel = bookingType === 'onward' ? activeUserAddrLabel : clinicAddress
	const dropoffLabel = bookingType === 'onward' ? clinicAddress : activeUserAddrLabel

	const filteredSuggestions = BENGALURU_LOCATIONS.filter((loc) =>
		loc.toLowerCase().includes(customSearchQuery.toLowerCase())
	)

	const handleBookRide = async () => {
		if (!selectedRideDetails || !appointmentId) return
		setBooking(true)

		try {
			const activeUserAddr = useCustomAddress
				? customAddress || 'Custom Location'
				: savedAddresses.find((a) => a.id === selectedAddressId)?.address_line || 'Home Address'

			const mockRide: RideBooking = {
				appointment_id: appointmentId,
				pickup_address: bookingType === 'onward' ? activeUserAddr : clinicAddress,
				dropoff_address: bookingType === 'onward' ? clinicAddress : activeUserAddr,
				ride_provider: 'CareTransit Uber',
				vehicle_type: selectedRideDetails.label,
				estimated_fare: selectedRideDetails.price,
				is_return_ride: bookingType === 'return',
				status: 'scheduled',
				wheelchair,
				assistance,
				companion,
				payment_method: paymentMethod,
				created_at: new Date().toISOString(),
			}

			await saveRide(appointmentId, bookingType, mockRide)
			setBooking(false)
			setShowSuccessModal(true)
		} catch (err) {
			console.error('[BookRidePage] Error booking ride:', err)
			setBooking(false)
		}
	}

	if (apptLoading) {
		return (
			<View style={styles.loadingContainer}>
				<ActivityIndicator size="large" color="#0c7c7c" />
			</View>
		)
	}

	if (apptError || !appt) {
		return (
			<View style={styles.container}>
				<AppScreenHeader title="Book a Cab" />
				<View style={styles.errorCard}>
					<Text style={styles.errorText}>{apptError || 'Appointment details not found.'}</Text>
					<Button mode="contained" buttonColor="#0c7c7c" onPress={() => navigation.goBack()} style={{ marginTop: 12 }}>
						Go Back
					</Button>
				</View>
			</View>
		)
	}

	// Map Section View Component
	const renderMapSection = () => (
		<View style={styles.mapSectionCard}>
			<View style={styles.mapHeaderRow}>
				<MaterialCommunityIcons name="routes" size={20} color="#0c7c7c" />
				<Text style={styles.mapHeaderTitle}>Live Cab Route & Pin Drops</Text>
			</View>

			<RideMapTracker
				status="scheduled"
				pickupLabel={pickupLabel}
				dropoffLabel={dropoffLabel}
			/>

			<View style={styles.mapFooterBanner}>
				<MaterialCommunityIcons name="shield-check" size={16} color="#0f766e" />
				<Text style={styles.mapFooterText}>NEMT Driver Verified & Live Disinfected Transit</Text>
			</View>
		</View>
	)

	// Primary Booking Form Content
	const renderBookingForm = () => (
		<View style={{ flex: 1 }}>
			{/* Appointment Overview Card */}
			<View style={styles.briefCard}>
				<View style={styles.briefHeaderRow}>
					<View style={styles.briefAvatar}>
						<MaterialCommunityIcons
							name={bookingType === 'return' ? 'flag-checkered' : 'car-side'}
							size={24}
							color="#ffffff"
						/>
					</View>
					<View style={{ flex: 1, marginLeft: 12 }}>
						<Text style={styles.briefTitle}>
							{bookingType === 'return' ? 'Ride Back Home (Post-Consultation)' : 'Ride to Health Clinic'}
						</Text>
						<Text style={styles.briefSubtitle}>
							With {(appt.doctor as any)?.name || 'your Doctor'} on {appt.appointment_date}
						</Text>
					</View>
				</View>

				{bookingType !== 'return' && appt.start_time && (
					<View style={styles.pickupTimeBox}>
						<MaterialCommunityIcons name="clock-outline" size={15} color="#0c7c7c" />
						<Text style={styles.pickupTimeText}>
							Suggested Pickup: {getSuggestedPickupTime(appt.start_time)}
						</Text>
					</View>
				)}
			</View>

			{/* Trip Route & Location Section */}
			<View style={styles.sectionCard}>
				<Text style={styles.sectionTitle}>Trip Route & Location</Text>

				<View style={styles.routeTimeline}>
					{/* Pickup Row */}
					<View style={styles.routeRow}>
						<View style={styles.dotContainer}>
							<View style={[styles.routeDot, { backgroundColor: '#00796b' }]} />
							<View style={styles.routeLine} />
						</View>
						<View style={styles.routeTextContent}>
							<Text style={styles.routeTypeLabel}>PICKUP LOCATION</Text>
							<Text style={styles.routeAddressText}>{pickupLabel}</Text>
						</View>
					</View>

					{/* Destination Row */}
					<View style={styles.routeRow}>
						<View style={styles.dotContainer}>
							<View style={[styles.routeDot, { backgroundColor: '#d32f2f' }]} />
						</View>
						<View style={styles.routeTextContent}>
							<Text style={styles.routeTypeLabel}>DROPOFF DESTINATION</Text>
							<Text style={styles.routeAddressText}>{dropoffLabel}</Text>
						</View>
					</View>
				</View>

				{/* Location Address Selection */}
				<Text style={styles.subSectionTitle}>Select Patient Address</Text>
				{!useCustomAddress ? (
					<View>
						{savedAddresses.map((addr) => {
							const isSelected = selectedAddressId === addr.id
							return (
								<TouchableOpacity
									key={addr.id}
									style={[styles.addressCard, isSelected && styles.addressCardSelected]}
									onPress={() => setSelectedAddressId(addr.id)}
									activeOpacity={0.8}
								>
									<View style={[styles.radioCircle, isSelected && styles.radioCircleSelected]}>
										{isSelected && <View style={styles.radioDot} />}
									</View>
									<View style={{ flex: 1, marginLeft: 12 }}>
										<View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
											<Text style={styles.addressTag}>{addr.label || 'Home Address'}</Text>
											{addr.is_default && (
												<View style={styles.defaultBadge}>
													<Text style={styles.defaultBadgeText}>Default</Text>
												</View>
											)}
										</View>
										<Text style={styles.addressLineText}>{addr.address_line}</Text>
										<Text style={styles.addressSubText}>
											{addr.city}, {addr.state} - {addr.pincode}
										</Text>
									</View>
								</TouchableOpacity>
							)
						})}

						<TouchableOpacity
							style={styles.customToggleLink}
							onPress={() => {
								setUseCustomAddress(true)
								setCustomSearchQuery('')
							}}
						>
							<Text style={styles.customToggleLinkText}>+ Type custom address (autocomplete search)</Text>
						</TouchableOpacity>
					</View>
				) : (
					<View style={{ position: 'relative', zIndex: 10 }}>
						<View style={styles.customInputContainer}>
							<TextInput
								style={styles.customInput}
								placeholder="Type custom pickup/dropoff location..."
								placeholderTextColor="#94a3b8"
								value={customSearchQuery || customAddress}
								onChangeText={(text) => {
									setCustomSearchQuery(text)
									setShowSuggestions(true)
								}}
								onFocus={() => setShowSuggestions(true)}
							/>
						</View>

						{/* Autocomplete Dropdown List */}
						{showSuggestions && customSearchQuery.length > 0 && (
							<View style={styles.suggestionsDropdown}>
								{filteredSuggestions.length > 0 ? (
									filteredSuggestions.map((suggestion) => (
										<TouchableOpacity
											key={suggestion}
											style={styles.suggestionItem}
											onPress={() => {
												setCustomAddress(suggestion)
												setCustomSearchQuery(suggestion)
												setShowSuggestions(false)
											}}
										>
											<MaterialCommunityIcons name="map-marker" size={16} color="#0c7c7c" style={{ marginRight: 6 }} />
											<Text style={styles.suggestionText}>{suggestion}</Text>
										</TouchableOpacity>
									))
								) : (
									<View style={styles.suggestionEmptyItem}>
										<Text style={styles.suggestionEmptyText}>No matching Bengaluru locations</Text>
									</View>
								)}
							</View>
						)}

						{savedAddresses.length > 0 && (
							<TouchableOpacity
								style={styles.customToggleLink}
								onPress={() => setUseCustomAddress(false)}
							>
								<Text style={styles.customToggleLinkText}>Back to saved addresses</Text>
							</TouchableOpacity>
						)}
					</View>
				)}
			</View>

			{/* In Mobile/Portrait view: Map Section is displayed right below booking details */}
			{!isTwoColumnLayout && renderMapSection()}

			{/* Vehicle Options Card */}
			<View style={styles.sectionCard}>
				<Text style={styles.sectionTitle}>Choose Ride Option</Text>
				{estimatesLoading ? (
					<ActivityIndicator color="#0c7c7c" style={{ marginVertical: 16 }} />
				) : (
					rideEstimates.map((opt) => {
						const isSelected = selectedRideOption === opt.type
						return (
							<TouchableOpacity
								key={opt.type}
								style={[styles.vehicleCard, isSelected && styles.vehicleCardSelected]}
								onPress={() => setSelectedRideOption(opt.type as any)}
								activeOpacity={0.8}
							>
								<View
									style={[
										styles.vehicleIconCircle,
										isSelected && { backgroundColor: '#0c7c7c' },
									]}
								>
									<MaterialCommunityIcons
										name={
											opt.type === 'medical' ? 'ambulance' : opt.type === 'comfort' ? 'car-estate' : 'car'
										}
										size={22}
										color={isSelected ? '#ffffff' : '#64748b'}
									/>
								</View>
								<View style={{ flex: 1, marginLeft: 12 }}>
									<Text style={styles.vehicleTitle}>{opt.label}</Text>
									<Text style={styles.vehicleSubtitle}>
										ETA: {opt.eta} mins • Clean & disinfected NEMT
									</Text>
								</View>
								<Text style={styles.vehiclePriceText}>₹{opt.price}</Text>
							</TouchableOpacity>
						)
					})
				)}
			</View>

			{/* Accessibility & Boarding Support with AppToggle */}
			<View style={styles.sectionCard}>
				<Text style={styles.sectionTitle}>Accessibility & Boarding Support</Text>

				<View style={styles.toggleRow}>
					<View style={{ flex: 1, marginRight: 12 }}>
						<Text style={styles.toggleTitle}>♿ Wheelchair Access Space</Text>
						<Text style={styles.toggleDesc}>Vehicle equipped with entry ramp or lift</Text>
					</View>
					<AppToggle
						value={wheelchair}
						onValueChange={setWheelchair}
						activeColor="#0c7c7c"
						showStatusText={false}
						size="small"
					/>
				</View>

				<View style={styles.toggleRow}>
					<View style={{ flex: 1, marginRight: 12 }}>
						<Text style={styles.toggleTitle}>🤝 Support Helper Assistance</Text>
						<Text style={styles.toggleDesc}>Personal help for walking and boarding</Text>
					</View>
					<AppToggle
						value={assistance}
						onValueChange={setAssistance}
						activeColor="#0c7c7c"
						showStatusText={false}
						size="small"
					/>
				</View>

				<View style={styles.toggleRow}>
					<View style={{ flex: 1, marginRight: 12 }}>
						<Text style={styles.toggleTitle}>👥 Family Caregiver Accompanying</Text>
						<Text style={styles.toggleDesc}>Real-time location sharing with emergency contact</Text>
					</View>
					<AppToggle
						value={companion}
						onValueChange={setCompanion}
						activeColor="#0c7c7c"
						showStatusText={false}
						size="small"
					/>
				</View>
			</View>

			{/* Payment Coverage Dropdown Select Section */}
			<View style={styles.sectionCard}>
				<Text style={styles.sectionTitle}>Payment Coverage</Text>
				<AppSelect
					options={PAYMENT_OPTIONS}
					value={paymentMethod}
					onSelect={(val) => setPaymentMethod(val as any)}
					placeholder="Select Payment Method"
					size="form"
				/>
			</View>

			{/* Fare Summary Checkout Card */}
			<View style={styles.totalCard}>
				<View style={styles.totalRow}>
					<Text style={styles.totalLabel}>Total Estimated Fare</Text>
					<Text style={styles.totalVal}>₹{selectedRideDetails?.price || 220}</Text>
				</View>

				<TouchableOpacity
					style={[styles.confirmTouchBtn, booking && styles.confirmTouchBtnDisabled]}
					disabled={booking}
					onPress={handleBookRide}
					activeOpacity={0.8}
				>
					{booking ? (
						<ActivityIndicator size="small" color="#ffffff" />
					) : (
						<Text style={styles.confirmTouchBtnText}>Confirm Cab Booking</Text>
					)}
				</TouchableOpacity>
			</View>
		</View>
	)

	return (
		<View style={styles.container}>
			<AppScreenHeader
				title={bookingType === 'return' ? 'Book Return Cab' : 'Book a Cab'}
			/>

			<ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
				{isTwoColumnLayout ? (
					/* Tablet Landscape mode: Balanced 45:55 side-by-side layout */
					<View style={styles.tabletRow}>
						{/* Left Section: Booking Form – 45% width */}
						<View style={styles.tabletLeftPanel}>{renderBookingForm()}</View>

						{/* Right Section: Map Preview – 55% width, sticky to top */}
						<View style={styles.tabletRightPanel}>{renderMapSection()}</View>
					</View>
				) : (
					/* Mobile/Portrait mode: Single-column vertical layout */
					renderBookingForm()
				)}
			</ScrollView>

			{/* Success Confirmation Modal */}
			<StatusModal
				visible={showSuccessModal}
				status="success"
				title="Cab Booked Successfully!"
				description={
					bookingType === 'return'
						? 'Your return ride is confirmed. Driver details will be visible 15 mins post consultation.'
						: 'Your onward ride is confirmed. Driver details will be updated shortly before pickup time.'
				}
				submitText="View Ride Status"
				onSubmit={() => {
					setShowSuccessModal(false)
					navigation.replace(ROUTES.STACK.RIDE_TRACKING, {
						appointmentId,
						type: bookingType,
					})
				}}
				onCancel={() => {
					setShowSuccessModal(false)
					navigation.replace(ROUTES.STACK.RIDE_TRACKING, {
						appointmentId,
						type: bookingType,
					})
				}}
			/>
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#f8fafc',
	},
	loadingContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: '#f8fafc',
	},
	scrollContent: {
		padding: 16,
		paddingBottom: 90,
	},
	tabletRow: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		gap: 16,
	},
	tabletLeftPanel: {
		flex: 9,
		minWidth: 0,
	},
	tabletRightPanel: {
		flex: 11,
		minWidth: 0,
		position: 'relative' as const,
	},
	errorCard: {
		margin: 16,
		padding: 20,
		backgroundColor: '#ffffff',
		borderRadius: 16,
		alignItems: 'center',
	},
	errorText: {
		color: '#d32f2f',
		fontSize: 14,
	},
	briefCard: {
		backgroundColor: '#0c7c7c',
		borderRadius: 16,
		padding: 16,
		marginBottom: 16,
		elevation: 3,
		shadowColor: '#0c7c7c',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.15,
		shadowRadius: 6,
	},
	briefHeaderRow: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	briefAvatar: {
		width: 44,
		height: 44,
		borderRadius: 12,
		backgroundColor: 'rgba(255, 255, 255, 0.2)',
		justifyContent: 'center',
		alignItems: 'center',
	},
	briefTitle: {
		fontSize: 16,
		fontWeight: '800',
		color: '#ffffff',
	},
	briefSubtitle: {
		fontSize: 12,
		color: 'rgba(255, 255, 255, 0.85)',
		marginTop: 2,
	},
	pickupTimeBox: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#ffffff',
		paddingHorizontal: 10,
		paddingVertical: 6,
		borderRadius: 8,
		marginTop: 12,
		alignSelf: 'flex-start',
		gap: 6,
	},
	pickupTimeText: {
		fontSize: 12,
		fontWeight: '700',
		color: '#0c7c7c',
	},
	sectionCard: {
		backgroundColor: '#ffffff',
		borderRadius: 16,
		padding: 16,
		marginBottom: 16,
		borderWidth: 1,
		borderColor: '#eaecf0',
		elevation: 1,
	},
	sectionTitle: {
		fontSize: 13,
		fontWeight: '800',
		color: '#101828',
		marginBottom: 14,
		textTransform: 'uppercase',
		letterSpacing: 0.5,
	},
	subSectionTitle: {
		fontSize: 13,
		fontWeight: '700',
		color: '#344054',
		marginTop: 14,
		marginBottom: 10,
	},
	routeTimeline: {
		backgroundColor: '#f8fafc',
		borderRadius: 12,
		padding: 12,
		borderWidth: 1,
		borderColor: '#f1f5f9',
	},
	routeRow: {
		flexDirection: 'row',
		alignItems: 'flex-start',
	},
	dotContainer: {
		alignItems: 'center',
		width: 20,
		marginRight: 8,
		marginTop: 2,
	},
	routeDot: {
		width: 10,
		height: 10,
		borderRadius: 5,
	},
	routeLine: {
		width: 2,
		height: 24,
		backgroundColor: '#cbd5e1',
		marginVertical: 2,
	},
	routeTextContent: {
		flex: 1,
	},
	routeTypeLabel: {
		fontSize: 9.5,
		fontWeight: '700',
		color: '#64748b',
		letterSpacing: 0.5,
	},
	routeAddressText: {
		fontSize: 13,
		fontWeight: '600',
		color: '#0f172a',
		marginTop: 1,
	},
	addressCard: {
		flexDirection: 'row',
		alignItems: 'center',
		padding: 12,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: '#eaecf0',
		marginBottom: 8,
		backgroundColor: '#ffffff',
	},
	addressCardSelected: {
		borderColor: '#0c7c7c',
		backgroundColor: 'rgba(12, 124, 124, 0.04)',
	},
	radioCircle: {
		width: 20,
		height: 20,
		borderRadius: 10,
		borderWidth: 2,
		borderColor: '#cbd5e1',
		justifyContent: 'center',
		alignItems: 'center',
	},
	radioCircleSelected: {
		borderColor: '#0c7c7c',
	},
	radioDot: {
		width: 10,
		height: 10,
		borderRadius: 5,
		backgroundColor: '#0c7c7c',
	},
	addressTag: {
		fontSize: 13,
		fontWeight: '700',
		color: '#0f172a',
	},
	defaultBadge: {
		backgroundColor: '#e0f2f1',
		paddingHorizontal: 6,
		paddingVertical: 2,
		borderRadius: 4,
	},
	defaultBadgeText: {
		fontSize: 10,
		fontWeight: '700',
		color: '#0c7c7c',
	},
	addressLineText: {
		fontSize: 12.5,
		color: '#334155',
		marginTop: 2,
	},
	addressSubText: {
		fontSize: 11,
		color: '#64748b',
		marginTop: 1,
	},
	customToggleLink: {
		marginTop: 6,
		marginBottom: 8,
	},
	customToggleLinkText: {
		fontSize: 12,
		fontWeight: '700',
		color: '#0c7c7c',
	},
	customInputContainer: {
		marginBottom: 6,
	},
	customInput: {
		borderWidth: 1,
		borderColor: '#cbd5e1',
		borderRadius: 8,
		paddingHorizontal: 12,
		paddingVertical: 8,
		fontSize: 13,
		color: '#0f172a',
		backgroundColor: '#ffffff',
	},
	suggestionsDropdown: {
		backgroundColor: '#ffffff',
		borderRadius: 8,
		borderWidth: 1,
		borderColor: '#cbd5e1',
		maxHeight: 180,
		marginBottom: 8,
		elevation: 4,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 4,
	},
	suggestionItem: {
		flexDirection: 'row',
		alignItems: 'center',
		padding: 10,
		borderBottomWidth: 1,
		borderBottomColor: '#f1f5f9',
	},
	suggestionText: {
		fontSize: 12.5,
		color: '#0f172a',
	},
	suggestionEmptyItem: {
		padding: 12,
		alignItems: 'center',
	},
	suggestionEmptyText: {
		fontSize: 12,
		color: '#94a3b8',
	},
	vehicleCard: {
		flexDirection: 'row',
		alignItems: 'center',
		padding: 12,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: '#eaecf0',
		marginBottom: 8,
		backgroundColor: '#ffffff',
	},
	vehicleCardSelected: {
		borderColor: '#0c7c7c',
		backgroundColor: 'rgba(12, 124, 124, 0.04)',
	},
	vehicleIconCircle: {
		width: 40,
		height: 40,
		borderRadius: 10,
		backgroundColor: '#f1f5f9',
		justifyContent: 'center',
		alignItems: 'center',
	},
	vehicleTitle: {
		fontSize: 13.5,
		fontWeight: '700',
		color: '#0f172a',
	},
	vehicleSubtitle: {
		fontSize: 11,
		color: '#64748b',
		marginTop: 1,
	},
	vehiclePriceText: {
		fontSize: 15,
		fontWeight: '800',
		color: '#0f172a',
	},
	toggleRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingVertical: 10,
		borderBottomWidth: 1,
		borderBottomColor: '#f1f5f9',
	},
	toggleTitle: {
		fontSize: 13,
		fontWeight: '700',
		color: '#0f172a',
	},
	toggleDesc: {
		fontSize: 11,
		color: '#64748b',
		marginTop: 2,
	},
	totalCard: {
		backgroundColor: '#ffffff',
		borderRadius: 16,
		padding: 16,
		borderWidth: 1,
		borderColor: '#eaecf0',
		elevation: 2,
	},
	totalRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 14,
	},
	totalLabel: {
		fontSize: 13,
		fontWeight: '700',
		color: '#64748b',
	},
	totalVal: {
		fontSize: 22,
		fontWeight: '900',
		color: '#0f172a',
	},
	confirmTouchBtn: {
		backgroundColor: '#0c7c7c',
		borderRadius: 12,
		paddingVertical: 14,
		alignItems: 'center',
		justifyContent: 'center',
	},
	confirmTouchBtnDisabled: {
		backgroundColor: '#94a3b8',
	},
	confirmTouchBtnText: {
		color: '#ffffff',
		fontSize: 15,
		fontWeight: '700',
	},
	mapSectionCard: {
		backgroundColor: '#ffffff',
		borderRadius: 16,
		padding: 16,
		marginBottom: 16,
		borderWidth: 1,
		borderColor: '#eaecf0',
		elevation: 2,
	},
	mapHeaderRow: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 14,
		gap: 8,
	},
	mapHeaderTitle: {
		fontSize: 15,
		fontWeight: '800',
		color: '#0f172a',
	},
	mapFooterBanner: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#ccfbf1',
		paddingHorizontal: 10,
		paddingVertical: 8,
		borderRadius: 8,
		gap: 6,
		marginTop: 10,
	},
	mapFooterText: {
		fontSize: 11,
		fontWeight: '700',
		color: '#0f766e',
	},
})
