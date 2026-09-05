import React, { useState, useEffect, useCallback } from 'react'
import {
	View,
	Text,
	ScrollView,
	StyleSheet,
	TouchableOpacity,
	Linking,
	ActivityIndicator,
} from 'react-native'
import { Card, useTheme, Button, Chip, Portal, Dialog } from 'react-native-paper'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useRoute, useNavigation, RouteProp, useFocusEffect } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { AppStackParamList } from '../../navigation/types'
import { ROUTES } from '../../navigation/routes'
import { RideBooking, RideStatus, RideState } from '../../types/transportation'
import { getRideState, cancelRide, advanceRideStatus, clearRideStorage } from './transportationService'
import AppScreenHeader from '../../components/common/AppScreenHeader'
import RideMapTracker from './components/RideMapTracker'
import StatusModal from '../../components/common/StatusModal'

type RouteProps = RouteProp<AppStackParamList, typeof ROUTES.STACK.RIDE_TRACKING>
type NavigationProp = NativeStackNavigationProp<AppStackParamList>

export default function RideTrackingPage() {
	const theme = useTheme()
	const route = useRoute<RouteProps>()
	const navigation = useNavigation<NavigationProp>()

	const { appointmentId } = route.params

	const [rideState, setRideState] = useState<RideState>({
		hasOnward: false,
		hasReturn: false,
		onwardStatus: null,
		returnStatus: null,
		onwardRide: null,
		returnRide: null,
	})
	const [loading, setLoading] = useState(true)

	const [sosVisible, setSosVisible] = useState(false)
	const [cancelTarget, setCancelTarget] = useState<'onward' | 'return' | null>(null)
	const [advancingType, setAdvancingType] = useState<'onward' | 'return' | null>(null)

	const fetchRides = useCallback(async () => {
		if (!appointmentId) return
		setLoading(true)
		const state = await getRideState(appointmentId)
		setRideState(state)
		setLoading(false)
	}, [appointmentId])

	useFocusEffect(
		useCallback(() => {
			fetchRides()
		}, [fetchRides])
	)

	const handleAdvanceStatus = async (type: 'onward' | 'return') => {
		setAdvancingType(type)
		await advanceRideStatus(appointmentId, type)
		await fetchRides()
		setAdvancingType(null)
	}

	const handleDevRemoveRide = async (type: 'onward' | 'return') => {
		await clearRideStorage(appointmentId, type)
		await fetchRides()
	}

	const handleConfirmCancel = async () => {
		if (!cancelTarget) return
		await cancelRide(appointmentId, cancelTarget)
		setCancelTarget(null)
		await fetchRides()
	}

	const getStatusColor = (st: RideStatus) => {
		switch (st) {
			case 'scheduled':
				return '#ed6c02'
			case 'requesting':
				return '#0288d1'
			case 'dispatched':
				return '#2e7d32'
			case 'in_transit':
				return '#0c7c7c'
			case 'completed':
				return '#2e7d32'
			default:
				return '#64748b'
		}
	}

	const getStatusLabel = (st: RideStatus) => {
		switch (st) {
			case 'scheduled':
				return 'Scheduled'
			case 'requesting':
				return 'Matching Driver'
			case 'dispatched':
				return 'Driver En Route'
			case 'in_transit':
				return 'In Transit'
			case 'completed':
				return 'Completed'
			default:
				return st
		}
	}

	const getSimulateBtnLabel = (st: RideStatus) => {
		switch (st) {
			case 'scheduled':
				return 'Simulate Driver Dispatch'
			case 'requesting':
				return 'Simulate Driver Assignment'
			case 'dispatched':
				return 'Simulate Trip Start'
			case 'in_transit':
				return 'Simulate Trip Completed'
			case 'completed':
				return 'Reset Simulation State'
			default:
				return 'Advance Status'
		}
	}

	const renderRideCard = (ride: RideBooking, type: 'onward' | 'return') => {
		const status = ride.status
		const isAdvancing = advancingType === type

		return (
			<Card key={type} style={styles.rideCard}>
				<Card.Content>
					{/* Top Header */}
					<View style={styles.cardHeaderRow}>
						<Text style={styles.overTitle}>
							{type === 'onward' ? 'ONWARD RIDE (TO CLINIC)' : 'RETURN RIDE (BACK HOME)'}
						</Text>
						<Chip
							style={{ backgroundColor: getStatusColor(status) }}
							textStyle={styles.statusChipText}
						>
							{getStatusLabel(status)}
						</Chip>
					</View>

					{/* Route Map Tracker */}
					<RideMapTracker
						status={status}
						pickupLabel={type === 'onward' ? 'Pickup' : 'Clinic'}
						dropoffLabel={type === 'onward' ? 'Clinic' : 'Home'}
					/>

					{/* Location Details */}
					<View style={styles.locationSection}>
						<View style={styles.locationBlock}>
							<Text style={styles.locationCap}>
								{type === 'onward' ? '📍 PICKUP ADDRESS' : '📍 PICKUP ADDRESS (CLINIC)'}
							</Text>
							<Text style={styles.locationVal}>{ride.pickup_address}</Text>
						</View>

						<View style={styles.divider} />

						<View style={styles.locationBlock}>
							<Text style={styles.locationCap}>
								{type === 'onward' ? '🏁 DESTINATION (CLINIC)' : '🏁 DESTINATION (HOME)'}
							</Text>
							<Text style={styles.locationVal}>{ride.dropoff_address}</Text>
						</View>
					</View>

					{/* Healthcare Logistics Details */}
					{status !== 'completed' && (
						<View style={styles.alertsContainer}>
							{(ride.wheelchair || ride.assistance) && (
								<View style={styles.hospitalAlertBox}>
									<MaterialCommunityIcons name="hospital-building" size={18} color="#0c7c7c" />
									<Text style={styles.hospitalAlertText}>
										Hospital Porch Sync: Wheelchair & boarding assistance requested at reception desk.
									</Text>
								</View>
							)}

							{ride.companion && (
								<View style={styles.caregiverAlertBox}>
									<MaterialCommunityIcons name="account-group" size={18} color="#0288d1" />
									<Text style={styles.caregiverAlertText}>
										Caregiver Tracking: Live location automatically shared with Emergency Contact.
									</Text>
								</View>
							)}

							{ride.payment_method === 'insurance' && (
								<View style={styles.insuranceAlertBox}>
									<MaterialCommunityIcons name="shield-check" size={18} color="#2e7d32" />
									<View style={{ flex: 1 }}>
										<Text style={styles.insuranceAlertTitle}>
											Covered under Cashless Medical Transportation (NEMT)
										</Text>
										<Text style={styles.insuranceAlertSub}>
											Pre-Auth Claim ID: NEMT-CLAIM-{appointmentId.slice(-4).toUpperCase()}-OK.
										</Text>
									</View>
								</View>
							)}

							{ride.payment_method === 'hospital_bill' && (
								<View style={styles.billAlertBox}>
									<MaterialCommunityIcons name="file-document" size={18} color="#ed6c02" />
									<Text style={styles.billAlertText}>
										Invoicing: Ride fare is bundled with your hospital discharge bill.
									</Text>
								</View>
							)}
						</View>
					)}

					{/* Status Views */}
					{status === 'scheduled' && (
						<View style={styles.statusNoticeContainer}>
							<View style={styles.scheduledNoticeBox}>
								<Text style={styles.scheduledNoticeText}>
									{type === 'onward'
										? 'ℹ️ Your onward ride is scheduled. Driver details will be visible here 30 minutes before pickup.'
										: 'ℹ️ Your return ride is scheduled. Cabs are matched automatically after consultation.'}
								</Text>
							</View>

							{type === 'return' && (
								<View style={styles.delayAlertBox}>
									<Text style={styles.delayAlertTitle}>
										🕒 Doctor Delay Alert: Schedule is running 15 minutes late.
									</Text>
									<Text style={styles.delayAlertSub}>
										Your return cab matching window has been adjusted dynamically by 15 mins to prevent driver waiting fees.
									</Text>
								</View>
							)}
						</View>
					)}

					{status === 'requesting' && (
						<View style={styles.requestingBox}>
							<ActivityIndicator size="small" color="#0288d1" />
							<Text style={styles.requestingText}>
								{type === 'onward'
									? 'Connecting with nearby drivers...'
									: 'Connecting with nearby return drivers...'}
							</Text>
						</View>
					)}

					{/* Assigned Driver Card */}
					{(status === 'dispatched' || status === 'in_transit') && (
						<View style={styles.driverBox}>
							<View style={styles.driverRow}>
								<View style={styles.driverAvatar}>
									<Text style={styles.driverInitials}>{type === 'onward' ? 'RK' : 'AM'}</Text>
								</View>
								<View style={{ flex: 1, marginLeft: 10 }}>
									<View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
										<Text style={styles.driverName}>
											{type === 'onward' ? 'Rajesh Kumar' : 'Amit Mishra'}
										</Text>
										<View style={styles.certBadge}>
											<Text style={styles.certBadgeText}>Care-Certified</Text>
										</View>
									</View>
									<View style={styles.ratingRow}>
										<MaterialCommunityIcons name="star" size={14} color="#ffb300" />
										<Text style={styles.ratingText}>
											{type === 'onward'
												? '4.9 • Maruti Suzuki Dzire (KA-01-MJ-1234)'
												: '4.8 • Hyundai Xcent (KA-03-PL-5678)'}
										</Text>
									</View>
									<Text style={styles.medCertText}>
										🛡️ Certified in basic medical transfer support, CPR, & elder assistance.
									</Text>
								</View>

								{status === 'dispatched' && (
									<View style={styles.pinContainer}>
										<Text style={styles.pinLabel}>TRIP PIN</Text>
										<Text style={styles.pinVal}>{type === 'onward' ? '4829' : '8372'}</Text>
									</View>
								)}

								<TouchableOpacity
									style={styles.callBtn}
									onPress={() =>
										Linking.openURL(type === 'onward' ? 'tel:+919876543210' : 'tel:+919876543211')
									}
								>
									<MaterialCommunityIcons name="phone" size={18} color="#0c7c7c" />
								</TouchableOpacity>
							</View>

							<View style={styles.progressRow}>
								<View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
									<Text style={styles.progressCap}>
										{status === 'dispatched' ? 'ARRIVING IN' : 'TRIP PROGRESS'}
									</Text>
									<Text style={styles.progressVal}>
										{status === 'dispatched'
											? type === 'onward' ? '5 Mins' : '8 Mins'
											: type === 'onward' ? 'On the Way (1.2 km left)' : 'On the Way Home'}
									</Text>
								</View>
								<View style={styles.progressBg}>
									<View style={[styles.progressFill, { width: status === 'dispatched' ? '40%' : '80%' }]} />
								</View>
							</View>

							<Button
								mode="contained"
								buttonColor="#d32f2f"
								icon={() => <MaterialCommunityIcons name="shield-alert" size={16} color="#ffffff" />}
								style={styles.sosButton}
								labelStyle={{ fontSize: 12, fontWeight: '700' }}
								onPress={() => setSosVisible(true)}
							>
								⚠️ MEDICAL SOS
							</Button>
						</View>
					)}

					{/* Trip Completed Banner */}
					{status === 'completed' && (
						<View style={styles.completedNoticeContainer}>
							<View style={styles.completedBannerBox}>
								<MaterialCommunityIcons name="check-circle" size={20} color="#2e7d32" />
								<Text style={styles.completedBannerText}>
									{type === 'onward'
										? 'Arrived safely at the clinic.'
										: 'Returned safely to your home address. Thank you!'}
								</Text>
							</View>
							<View style={styles.sanitizedBadge}>
								<Text style={styles.sanitizedBadgeText}>🧼 Vehicle Sanitized & Disinfected</Text>
							</View>
						</View>
					)}

					{/* Simulation & Dev Controls */}
					<View style={styles.demoBox}>
						<Text style={styles.demoBoxTitle}>Dev Simulation Helper</Text>
						<View style={{ gap: 8 }}>
							<Button
								mode="contained"
								buttonColor="#0c7c7c"
								loading={isAdvancing}
								disabled={isAdvancing}
								onPress={() => handleAdvanceStatus(type)}
								style={{ borderRadius: 8, width: '100%' }}
								contentStyle={{ height: 40, justifyContent: 'center' }}
								labelStyle={{ fontSize: 12, fontWeight: '700' }}
							>
								{getSimulateBtnLabel(status)}
							</Button>
							<Button
								mode="outlined"
								textColor="#d32f2f"
								onPress={() => handleDevRemoveRide(type)}
								style={{ borderColor: '#d32f2f', borderRadius: 8, width: '100%' }}
								contentStyle={{ height: 40, justifyContent: 'center' }}
								labelStyle={{ fontSize: 12, fontWeight: '700' }}
							>
								Remove Storage
							</Button>
						</View>
					</View>

					{/* Cancel Ride Action */}
					{status !== 'completed' && (
						<Button
							mode="text"
							textColor="#d32f2f"
							onPress={() => setCancelTarget(type)}
							style={{ marginTop: 4 }}
							labelStyle={{ fontSize: 12, fontWeight: '600' }}
						>
							Cancel {type === 'onward' ? 'Onward' : 'Return'} Ride
						</Button>
					)}
				</Card.Content>
			</Card>
		)
	}

	if (loading) {
		return (
			<View style={styles.container}>
				<AppScreenHeader title="Track Cabs" />
				<View style={styles.centerContainer}>
					<ActivityIndicator size="large" color="#0c7c7c" />
				</View>
			</View>
		)
	}

	const { onwardRide, returnRide } = rideState
	const isReturnCompletedTop = returnRide && onwardRide?.status === 'completed'

	return (
		<View style={styles.container}>
			<AppScreenHeader title="Track Cabs" />

			<ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
				{/* If NEITHER ride exists: Promo box to book onward ride */}
				{!onwardRide && !returnRide && (
					<View style={styles.promoCard}>
						<MaterialCommunityIcons name="car-side" size={40} color="#0c7c7c" />
						<Text style={styles.promoTitle}>Need a ride to the clinic?</Text>
						<Text style={styles.promoSubtitle}>
							Book a safe, reliable cab to get you to your appointment on time.
						</Text>
						<Button
							mode="contained"
							buttonColor="#0c7c7c"
							onPress={() =>
								navigation.navigate(ROUTES.STACK.BOOK_RIDE, { appointmentId, type: 'onward' })
							}
							style={{ marginTop: 12, borderRadius: 10 }}
						>
							Book Ride
						</Button>
					</View>
				)}

				{/* Priority Top Placement: Return Ride (If onward is completed) */}
				{isReturnCompletedTop && renderRideCard(returnRide, 'return')}

				{/* Onward Ride Card */}
				{onwardRide && renderRideCard(onwardRide, 'onward')}

				{/* Promo box to book Return Ride if onward exists but return ride not booked yet */}
				{onwardRide && !returnRide && (
					<View style={styles.promoCard}>
						<MaterialCommunityIcons name="car-side" size={36} color="#0c7c7c" />
						<Text style={styles.promoTitle}>Need a ride back home?</Text>
						<Text style={styles.promoSubtitle}>
							Schedule a return cab post-consultation to get back home safely.
						</Text>
						<Button
							mode="contained"
							buttonColor="#0c7c7c"
							onPress={() =>
								navigation.navigate(ROUTES.STACK.BOOK_RIDE, { appointmentId, type: 'return' })
							}
							style={{ marginTop: 12, borderRadius: 10 }}
						>
							Book Return Ride
						</Button>
					</View>
				)}

				{/* Standard Placement: Return Ride Card (If onward is NOT completed yet) */}
				{returnRide && !isReturnCompletedTop && renderRideCard(returnRide, 'return')}
			</ScrollView>

			{/* SOS Confirmation Dialog */}
			<Portal>
				<Dialog visible={sosVisible} onDismiss={() => setSosVisible(false)}>
					<Dialog.Title style={{ color: '#dc2626', fontWeight: 'bold' }}>
						Emergency SOS Alert
					</Dialog.Title>
					<Dialog.Content>
						<Text style={{ fontSize: 14, color: '#334155', lineHeight: 20 }}>
							Pressing confirm will immediately alert the driver, dispatch medical support, and notify your saved emergency contact.
						</Text>
					</Dialog.Content>
					<Dialog.Actions>
						<Button onPress={() => setSosVisible(false)}>Dismiss</Button>
						<Button
							mode="contained"
							buttonColor="#dc2626"
							onPress={() => {
								setSosVisible(false)
								Linking.openURL('tel:108')
							}}
						>
							Call 108 Emergency
						</Button>
					</Dialog.Actions>
				</Dialog>
			</Portal>

			{/* Cancel Confirmation Modal */}
			<StatusModal
				visible={!!cancelTarget}
				status="error"
				title="Cancel Cab Booking?"
				description={`Are you sure you want to cancel your ${cancelTarget === 'return' ? 'return' : 'onward'} ride booking?`}
				submitText="Yes, Cancel"
				onSubmit={handleConfirmCancel}
				cancelText="Keep Booking"
				onCancel={() => setCancelTarget(null)}
			/>
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#f8fafc',
	},
	centerContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
	},
	scrollContent: {
		padding: 16,
		paddingBottom: 32,
	},
	rideCard: {
		backgroundColor: '#ffffff',
		borderRadius: 16,
		marginBottom: 16,
		borderWidth: 1.5,
		borderColor: '#eaecf0',
		elevation: 2,
	},
	cardHeaderRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 12,
	},
	overTitle: {
		fontSize: 10.5,
		fontWeight: '800',
		color: '#64748b',
		letterSpacing: 0.5,
	},
	statusChipText: {
		color: '#ffffff',
		fontSize: 10.5,
		fontWeight: '700',
	},
	locationSection: {
		marginVertical: 4,
	},
	locationBlock: {
		marginVertical: 4,
	},
	locationCap: {
		fontSize: 9.5,
		fontWeight: '700',
		color: '#64748b',
		letterSpacing: 0.5,
		marginBottom: 2,
	},
	locationVal: {
		fontSize: 13,
		fontWeight: '600',
		color: '#0f172a',
	},
	divider: {
		height: 1,
		backgroundColor: '#f1f5f9',
		marginVertical: 8,
	},
	alertsContainer: {
		gap: 8,
		marginVertical: 10,
	},
	hospitalAlertBox: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: 'rgba(12, 124, 124, 0.05)',
		padding: 10,
		borderRadius: 10,
		borderWidth: 1,
		borderColor: 'rgba(12, 124, 124, 0.2)',
		gap: 8,
	},
	hospitalAlertText: {
		flex: 1,
		fontSize: 11.5,
		color: '#0c7c7c',
		fontWeight: '600',
	},
	caregiverAlertBox: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: 'rgba(2, 136, 209, 0.05)',
		padding: 10,
		borderRadius: 10,
		borderWidth: 1,
		borderColor: 'rgba(2, 136, 209, 0.2)',
		gap: 8,
	},
	caregiverAlertText: {
		flex: 1,
		fontSize: 11.5,
		color: '#0288d1',
		fontWeight: '600',
	},
	insuranceAlertBox: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: 'rgba(46, 125, 50, 0.05)',
		padding: 10,
		borderRadius: 10,
		borderWidth: 1,
		borderColor: 'rgba(46, 125, 50, 0.2)',
		gap: 8,
	},
	insuranceAlertTitle: {
		fontSize: 11.5,
		color: '#2e7d32',
		fontWeight: '700',
	},
	insuranceAlertSub: {
		fontSize: 10.5,
		color: '#475569',
		marginTop: 1,
	},
	billAlertBox: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: 'rgba(237, 108, 2, 0.05)',
		padding: 10,
		borderRadius: 10,
		borderWidth: 1,
		borderColor: 'rgba(237, 108, 2, 0.2)',
		gap: 8,
	},
	billAlertText: {
		flex: 1,
		fontSize: 11.5,
		color: '#ed6c02',
		fontWeight: '600',
	},
	statusNoticeContainer: {
		marginVertical: 8,
		gap: 8,
	},
	scheduledNoticeBox: {
		backgroundColor: 'rgba(237, 108, 2, 0.08)',
		padding: 10,
		borderRadius: 8,
		borderWidth: 1,
		borderColor: 'rgba(237, 108, 2, 0.3)',
		borderStyle: 'dashed',
	},
	scheduledNoticeText: {
		fontSize: 11.5,
		color: '#ed6c02',
		fontWeight: '600',
		lineHeight: 16,
	},
	delayAlertBox: {
		backgroundColor: 'rgba(2, 136, 209, 0.08)',
		padding: 10,
		borderRadius: 8,
		borderWidth: 1,
		borderColor: 'rgba(2, 136, 209, 0.3)',
		borderStyle: 'dashed',
	},
	delayAlertTitle: {
		fontSize: 11.5,
		color: '#0288d1',
		fontWeight: '700',
	},
	delayAlertSub: {
		fontSize: 10.5,
		color: '#475569',
		marginTop: 2,
	},
	requestingBox: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: 'rgba(2, 136, 209, 0.08)',
		padding: 10,
		borderRadius: 8,
		marginVertical: 8,
		gap: 10,
	},
	requestingText: {
		fontSize: 12,
		color: '#0288d1',
		fontWeight: '600',
	},
	driverBox: {
		backgroundColor: '#f8fafc',
		borderWidth: 1,
		borderColor: '#e2e8f0',
		borderRadius: 12,
		padding: 12,
		marginVertical: 8,
	},
	driverRow: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	driverAvatar: {
		width: 40,
		height: 40,
		borderRadius: 20,
		backgroundColor: '#0c7c7c',
		justifyContent: 'center',
		alignItems: 'center',
	},
	driverInitials: {
		color: '#ffffff',
		fontSize: 15,
		fontWeight: 'bold',
	},
	driverName: {
		fontSize: 13.5,
		fontWeight: '700',
		color: '#0f172a',
	},
	certBadge: {
		backgroundColor: '#e8f5e9',
		borderWidth: 1,
		borderColor: '#4caf50',
		paddingHorizontal: 4,
		paddingVertical: 1,
		borderRadius: 4,
	},
	certBadgeText: {
		fontSize: 8.5,
		fontWeight: '700',
		color: '#2e7d32',
	},
	ratingRow: {
		flexDirection: 'row',
		alignItems: 'center',
		marginTop: 1,
		gap: 4,
	},
	ratingText: {
		fontSize: 11,
		fontWeight: '600',
		color: '#475569',
	},
	medCertText: {
		fontSize: 10.5,
		color: '#2e7d32',
		fontWeight: '500',
		marginTop: 3,
	},
	pinContainer: {
		alignItems: 'center',
		marginRight: 10,
	},
	pinLabel: {
		fontSize: 8.5,
		fontWeight: '700',
		color: '#64748b',
	},
	pinVal: {
		fontSize: 13,
		fontWeight: '800',
		color: '#0c7c7c',
		letterSpacing: 1,
	},
	callBtn: {
		width: 36,
		height: 36,
		borderRadius: 18,
		borderWidth: 1.5,
		borderColor: '#0c7c7c',
		justifyContent: 'center',
		alignItems: 'center',
	},
	progressRow: {
		marginTop: 10,
	},
	progressCap: {
		fontSize: 10.5,
		fontWeight: '600',
		color: '#64748b',
	},
	progressVal: {
		fontSize: 11,
		fontWeight: '700',
		color: '#0c7c7c',
	},
	progressBg: {
		height: 6,
		backgroundColor: '#e2e8f0',
		borderRadius: 3,
		overflow: 'hidden',
		marginVertical: 6,
	},
	progressFill: {
		height: '100%',
		backgroundColor: '#0c7c7c',
		borderRadius: 3,
	},
	sosButton: {
		borderRadius: 8,
		marginTop: 4,
	},
	completedNoticeContainer: {
		marginVertical: 8,
		gap: 6,
	},
	completedBannerBox: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: 'rgba(46, 125, 50, 0.08)',
		padding: 10,
		borderRadius: 8,
		borderWidth: 1,
		borderColor: 'rgba(46, 125, 50, 0.2)',
		gap: 8,
	},
	completedBannerText: {
		flex: 1,
		fontSize: 12,
		color: '#2e7d32',
		fontWeight: '700',
	},
	sanitizedBadge: {
		backgroundColor: 'rgba(46, 125, 50, 0.08)',
		paddingHorizontal: 8,
		paddingVertical: 3,
		borderRadius: 4,
		borderWidth: 1,
		borderColor: 'rgba(46, 125, 50, 0.2)',
		alignSelf: 'flex-start',
	},
	sanitizedBadgeText: {
		fontSize: 10,
		fontWeight: '700',
		color: '#2e7d32',
	},
	demoBox: {
		backgroundColor: '#f8fafc',
		padding: 10,
		borderRadius: 10,
		borderWidth: 1,
		borderColor: '#cbd5e1',
		borderStyle: 'dashed',
		marginTop: 8,
	},
	demoBoxTitle: {
		fontSize: 10,
		fontWeight: '700',
		color: '#64748b',
		marginBottom: 6,
		textTransform: 'uppercase',
	},
	promoCard: {
		backgroundColor: 'rgba(12, 124, 124, 0.03)',
		borderWidth: 1,
		borderColor: '#0c7c7c',
		borderStyle: 'dashed',
		borderRadius: 16,
		padding: 20,
		alignItems: 'center',
		marginBottom: 16,
	},
	promoTitle: {
		fontSize: 15,
		fontWeight: '700',
		color: '#101828',
		marginTop: 8,
	},
	promoSubtitle: {
		fontSize: 12,
		color: '#667085',
		textAlign: 'center',
		marginTop: 4,
	},
})
