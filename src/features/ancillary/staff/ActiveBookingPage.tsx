import React, { useEffect, useState } from 'react'
import {
	ActivityIndicator,
	Alert,
	Image,
	Linking,
	Platform,
	ScrollView,
	StyleSheet,
	TouchableOpacity,
	View,
} from 'react-native'
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { useNavigation, useRoute } from '@react-navigation/native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Toast from 'react-native-toast-message'
import {
	MOCK_NURSE_BOOKINGS,
	NurseBooking,
	extractApiErrorMessage,
	getBookingState,
	updateNurseStatus,
} from '../ancillaryService'
import { ROUTES } from '../../../navigation/routes'
import ServiceTimeline from '../components/ServiceTimeline'
import AppScreenHeader from '../../../components/common/layout/AppScreenHeader'
import CancelVisitModal from '../components/CancelVisitModal'
import { AppTypography } from '../../../components/common/display/AppTypography'
import { AppButton } from '../../../components/common/buttons/AppButton'

import ApiService from '../../../services/apiService'
import { API_ENDPOINTS } from '../../../constants/apiUrls'

export default function ActiveBookingPage() {
	const navigation = useNavigation<any>()
	const route = useRoute<any>()
	const insets = useSafeAreaInsets()
	const { bookingId, initialBooking } = route.params || {}

	const [booking, setBooking] = useState<NurseBooking | null>(() => {
		if (
			initialBooking &&
			initialBooking.patientName &&
			typeof initialBooking.patientName === 'string' &&
			initialBooking.patientName.trim() !== '' &&
			!['Eleanor Vance', 'Patient Account Holder', 'John Doe', 'Patient Recipient', 'Patient'].includes(initialBooking.patientName.trim())
		) {
			return initialBooking
		}
		return null
	})
	const [loading, setLoading] = useState(() => !initialBooking)
	const [cancelModalVisible, setCancelModalVisible] = useState(false)

	const loadData = async () => {
		if (!booking) setLoading(true)
		try {
			if (bookingId) {
				const res = await ApiService.get<any>(API_ENDPOINTS.ANCILLARY.REQUEST_STATUS(bookingId))
				const apiData = res.data?.data || res.data
				if (apiData) {
					const pName =
						apiData.patientFullName ||
						apiData.patientName ||
						apiData.patient_name ||
						apiData.patientUser?.name ||
						apiData.patient?.name
					// Strictly validate that patient name is valid and not a fallback
					if (pName && typeof pName === 'string' && pName.trim() !== '' && !['Eleanor Vance', 'Patient Account Holder', 'John Doe', 'Patient Recipient', 'Patient'].includes(pName.trim())) {
						const pAge = apiData.patientAge || apiData.patient_age || apiData.age || 0
						const pGender = apiData.patientGender || apiData.patient_gender || apiData.gender || 'Not Specified'
						const pPhone = apiData.patientPhone || apiData.patient_phone || apiData.phone || ''
						const pAvatar = apiData.patientAvatar || apiData.patient_avatar || apiData.patient?.avatar || undefined
						const pAddress = apiData.streetAddress || apiData.street_address || apiData.patientAddress || apiData.patient_address || apiData.address || 'Address on file'
						const sName = apiData.serviceName || apiData.service_name || apiData.procedure?.label || 'General Nursing Care'
						const sDesc = apiData.procedureDetails || apiData.procedure_details || apiData.serviceDescription || 'Doorstep clinical care'

						setBooking({
							id: apiData.requestId || apiData.id || bookingId,
							patientName: pName,
							patientAge: pAge,
							patientGender: pGender,
							patientPhone: pPhone,
							patientAvatar: pAvatar,
							serviceName: sName,
							serviceDescription: sDesc,
							appointmentDate: apiData.appointmentDate || 'Today',
							appointmentTime: apiData.appointmentTime || 'Immediate Dispatch',
							patientAddress: pAddress,
							status: apiData.status || 'assigned',
							otpCode: apiData.verificationOtp || apiData.otp || '',
							completePin: apiData.completionPin || apiData.pin || '',
						})
						setLoading(false)
						return
					}
				}
			}
		} catch (e) {
			console.log('[ActiveBookingPage] Error fetching booking status', e)
		}

		// If API data is unavailable and no initial booking was passed, show error
		if (!initialBooking || !initialBooking.patientName) {
			setBooking(null)
		}
		setLoading(false)
	}

	useEffect(() => {
		void loadData()
	}, [bookingId])

	const handleNavigateOnMap = () => {
		if (!booking) return
		const query = encodeURIComponent(booking.patientAddress)
		const url = Platform.select({
			ios: `maps:0,0?q=${query}`,
			android: `geo:0,0?q=${query}`,
			default: `https://www.google.com/maps/search/?api=1&query=${query}`,
		})

		Linking.openURL(url).catch(() => {
			Alert.alert('Error', 'Unable to open maps application.')
		})
	}

	const handleStartTraveling = async () => {
		if (!booking) return
		try {
			await updateNurseStatus(booking.id, 'EN_ROUTE', 12)
			setBooking((prev) => (prev ? { ...prev, status: 'EN_ROUTE' } : null))
			Alert.alert('Status Updated', 'You are now marked as En-Route. Patient has been notified of your estimated arrival in 12 mins.')
		} catch (e) {
			Toast.show({
				type: 'error',
				text1: 'Could not update status',
				text2: extractApiErrorMessage(e, 'The patient was not notified. Please try again.'),
			})
		}
	}

	const handleArrived = async () => {
		if (!booking) return
		try {
			await updateNurseStatus(booking.id, 'ARRIVED', 0)
			setBooking((prev) => (prev ? { ...prev, status: 'ARRIVED' } : null))
		} catch (e) {
			// OTP verification doesn't depend on ARRIVED, so still continue to it.
			Toast.show({
				type: 'error',
				text1: 'Arrival not recorded',
				text2: extractApiErrorMessage(e, 'Continue with the start code; the status will update after verification.'),
			})
		}
		navigation.navigate(ROUTES.STACK.NURSE_PATIENT_VERIFICATION, { bookingId: booking.id, initialBooking: booking })
	}

	if (loading) {
		return (
			<View style={styles.loadingContainer}>
				<ActivityIndicator size="large" color="#2B6F71" />
			</View>
		)
	}

	if (!booking) {
		return (
			<View style={styles.container}>
				<AppScreenHeader title="Active Visit Dispatch" />
				<View style={styles.errorContainer}>
					<MaterialCommunityIcons name="account-alert-outline" size={54} color="#D9534F" style={{ marginBottom: 14 }} />
					<AppTypography variant="h3" style={{ color: '#1B2A32', fontWeight: '700', marginBottom: 8, textAlign: 'center' }}>
						Unable to Load Patient Information
					</AppTypography>
					<AppTypography variant="body" style={styles.errorText}>
						We couldn't retrieve the patient details for this booking. Please try again.
					</AppTypography>
					<View style={{ flexDirection: 'row', gap: 12, marginTop: 24, width: '100%', justifyContent: 'center' }}>
						<AppButton variant="primary" onPress={() => loadData()} style={{ minWidth: 120 }}>Try Again</AppButton>
						<AppButton variant="outline" onPress={() => navigation.goBack()} style={{ minWidth: 120 }}>Go Back</AppButton>
					</View>
				</View>
			</View>
		)
	}

	const statusText = (booking.status || 'assigned').toUpperCase()
	const isEnRoute = statusText === 'EN_ROUTE' || statusText === 'EN-ROUTE'

	return (
		<View style={styles.container}>
			<AppScreenHeader title="Active Visit Dispatch" />

			<ScrollView
				contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
				showsVerticalScrollIndicator={false}
			>
				{/* 1. DISPATCH TIMELINE BLOCK */}
				<View style={styles.sectionBlock}>
					<View style={styles.statusHeaderRow}>
						<View style={[styles.statusBadge, isEnRoute ? styles.enRouteBadge : styles.assignedBadge]}>
							<View style={[styles.statusDot, isEnRoute ? styles.enRouteDot : styles.assignedDot]} />
							<AppTypography variant="caption" style={[styles.statusBadgeText, isEnRoute ? styles.enRouteBadgeText : styles.assignedBadgeText]}>
								{statusText}
							</AppTypography>
						</View>

						<AppTypography variant="caption" style={styles.bookingRefText}>
							Ref ID: {booking.id}
						</AppTypography>
					</View>

					<ServiceTimeline currentStatus={booking.status} />
				</View>

				{/* 8px GREY SECTION DIVIDER BAR */}
				<View style={styles.sectionDividerBar} />

				{/* 2. PATIENT RECIPIENT INFORMATION BLOCK (CARD-FREE) */}
				<View style={styles.sectionBlock}>
					<AppTypography variant="h3" style={styles.sectionHeading}>
						Patient Information
					</AppTypography>

					<View style={styles.patientProfileRow}>
						<Image
							source={{
								uri:
									booking.patientAvatar ||
									'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=200',
							}}
							style={styles.patientAvatar}
							resizeMode="cover"
						/>

						<View style={styles.patientInfoCol}>
							<AppTypography variant="h4" style={styles.patientName}>
								{booking.patientName}
							</AppTypography>
							<AppTypography variant="caption" style={styles.patientDetailsText}>
								{booking.patientGender} • {booking.patientAge} Years Old
							</AppTypography>
							<AppTypography variant="caption" style={styles.patientPhoneText}>
								📞 {booking.patientPhone}
							</AppTypography>
						</View>

						<TouchableOpacity
							style={styles.callPatientBtn}
							onPress={() => {
								Linking.openURL(`tel:${booking.patientPhone}`).catch(() => {
									Alert.alert('Error', 'Unable to place call.')
								})
							}}
							activeOpacity={0.8}
						>
							<Ionicons name="call" size={18} color="#FFFFFF" />
						</TouchableOpacity>
					</View>
				</View>

				{/* 8px GREY SECTION DIVIDER BAR */}
				<View style={styles.sectionDividerBar} />

				{/* 3. SERVICE & PROCEDURE DETAILS BLOCK (CARD-FREE) */}
				<View style={styles.sectionBlock}>
					<AppTypography variant="h3" style={styles.sectionHeading}>
						Procedure Details
					</AppTypography>

					<View style={styles.procedureDetailsCol}>
						<AppTypography variant="h4" style={styles.procedureTitle}>
							{booking.serviceName}
						</AppTypography>
						<AppTypography variant="caption" style={styles.procedureDesc}>
							{booking.serviceDescription}
						</AppTypography>

						<View style={styles.metaPillsRow}>
							<View style={styles.metaPill}>
								<Ionicons name="calendar-outline" size={13} color="#475569" />
								<AppTypography variant="caption" style={styles.metaPillText}>
									{booking.appointmentDate}
								</AppTypography>
							</View>
							<View style={styles.metaPill}>
								<Ionicons name="time-outline" size={13} color="#475569" />
								<AppTypography variant="caption" style={styles.metaPillText}>
									{booking.appointmentTime}
								</AppTypography>
							</View>
						</View>
					</View>
				</View>

				{/* 8px GREY SECTION DIVIDER BAR */}
				<View style={styles.sectionDividerBar} />

				{/* 4. PATIENT ADDRESS & GPS NAVIGATION BLOCK (CARD-FREE) */}
				<View style={styles.sectionBlock}>
					<AppTypography variant="h3" style={styles.sectionHeading}>
						Patient Address & GPS Navigation
					</AppTypography>

					<View style={styles.addressCol}>
						<View style={styles.addressHeaderRow}>
							<Ionicons name="location" size={18} color="#2B6F71" />
							<AppTypography variant="h4" style={styles.addressTitle}>
								Doorstep Location
							</AppTypography>
						</View>

						<AppTypography variant="body" style={styles.addressText}>
							{booking.patientAddress}
						</AppTypography>

						<TouchableOpacity style={styles.navigateGpsBtn} onPress={handleNavigateOnMap} activeOpacity={0.85}>
							<Ionicons name="navigate-circle" size={20} color="#FFFFFF" />
							<AppTypography variant="caption" style={styles.navigateGpsText}>
								Open Turn-by-Turn Map Navigation
							</AppTypography>
						</TouchableOpacity>
					</View>
				</View>

				{/* 8px GREY SECTION DIVIDER BAR */}
				<View style={styles.sectionDividerBar} />

				{/* 5. DISPATCH ACTION CONTROLS */}
				<View style={styles.sectionBlock}>
					<AppTypography variant="h3" style={styles.sectionHeading}>
						Dispatch Actions
					</AppTypography>

					<View style={styles.actionControlsGroup}>
						{booking.status === 'assigned' && (
							<AppButton
								variant="primary"
								onPress={handleStartTraveling}
								style={styles.travelBtn}
							>
								Start Transit & Notify Patient
							</AppButton>
						)}

						<AppButton
							variant="primary"
							onPress={handleArrived}
							style={styles.arrivedBtn}
						>
							Confirm Doorstep Arrival & Verify OTP
						</AppButton>

						<AppButton
							variant="outline"
							onPress={() => setCancelModalVisible(true)}
							style={styles.cancelBtn}
						>
							Cancel Visit
						</AppButton>
					</View>
				</View>
			</ScrollView>
			{booking && (
				<CancelVisitModal
					visible={cancelModalVisible}
					bookingId={booking.id}
					patientName={booking.patientName}
					onClose={() => setCancelModalVisible(false)}
					onCancelled={() => {
						setCancelModalVisible(false)
						navigation.reset({
							index: 0,
							routes: [{ name: ROUTES.MAIN.TABS }],
						})
					}}
				/>
			)}
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
	loadingContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: '#FFFFFF',
	},
	errorContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: '#FFFFFF',
		padding: 24,
	},
	errorText: {
		fontSize: 15,
		color: '#EF4444',
		fontWeight: '600',
		textAlign: 'center',
	},

	/* SECTION BLOCK & DIVIDERS */
	sectionBlock: {
		backgroundColor: '#FFFFFF',
		paddingHorizontal: 16,
		paddingVertical: 16,
		gap: 12,
	},
	sectionDividerBar: {
		height: 8,
		backgroundColor: '#F4F6F9',
		borderTopWidth: 1,
		borderBottomWidth: 1,
		borderColor: '#E2E8F0',
	},
	sectionHeading: {
		fontSize: 16.5,
		fontWeight: '700',
		color: '#0F172A',
		letterSpacing: -0.2,
	},

	/* STATUS HEADER */
	statusHeaderRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	statusBadge: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 8,
		paddingVertical: 3,
		borderRadius: 6,
		gap: 6,
	},
	assignedBadge: {
		backgroundColor: 'rgba(2, 132, 199, 0.12)',
	},
	enRouteBadge: {
		backgroundColor: 'rgba(43, 111, 113, 0.12)',
	},
	statusDot: {
		width: 6,
		height: 6,
		borderRadius: 3,
	},
	assignedDot: {
		backgroundColor: '#0284C7',
	},
	enRouteDot: {
		backgroundColor: '#2B6F71',
	},
	statusBadgeText: {
		fontSize: 11,
		fontWeight: '700',
		letterSpacing: 0.3,
	},
	assignedBadgeText: {
		color: '#0284C7',
	},
	enRouteBadgeText: {
		color: '#2B6F71',
	},
	bookingRefText: {
		fontSize: 12,
		color: '#64748B',
		fontWeight: '500',
	},

	/* PATIENT RECIPIENT ROW (CARD-FREE) */
	patientProfileRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		paddingVertical: 4,
	},
	patientAvatar: {
		width: 52,
		height: 52,
		borderRadius: 26,
		backgroundColor: '#E2E8F0',
	},
	patientInfoCol: {
		flex: 1,
		gap: 2,
	},
	patientName: {
		fontSize: 15.5,
		fontWeight: '700',
		color: '#0F172A',
	},
	patientDetailsText: {
		fontSize: 12.5,
		color: '#64748B',
	},
	patientPhoneText: {
		fontSize: 12,
		color: '#334155',
		fontWeight: '600',
		marginTop: 1,
	},
	callPatientBtn: {
		width: 40,
		height: 40,
		borderRadius: 20,
		backgroundColor: '#2B6F71',
		alignItems: 'center',
		justifyContent: 'center',
	},

	/* PROCEDURE DETAILS COL (CARD-FREE) */
	procedureDetailsCol: {
		gap: 6,
		paddingVertical: 2,
	},
	procedureTitle: {
		fontSize: 15,
		fontWeight: '700',
		color: '#0F172A',
	},
	procedureDesc: {
		fontSize: 12.5,
		color: '#64748B',
		lineHeight: 17,
	},
	metaPillsRow: {
		flexDirection: 'row',
		gap: 8,
		marginTop: 4,
	},
	metaPill: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#F8FAFC',
		paddingHorizontal: 8,
		paddingVertical: 3,
		borderRadius: 6,
		borderWidth: 1,
		borderColor: '#E2E8F0',
		gap: 4,
	},
	metaPillText: {
		fontSize: 11.5,
		fontWeight: '600',
		color: '#475569',
	},

	/* ADDRESS COL (CARD-FREE) */
	addressCol: {
		gap: 8,
		paddingVertical: 2,
	},
	addressHeaderRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
	},
	addressTitle: {
		fontSize: 14,
		fontWeight: '700',
		color: '#0F172A',
	},
	addressText: {
		fontSize: 13,
		color: '#475569',
		lineHeight: 18,
	},
	navigateGpsBtn: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#2B6F71',
		borderRadius: 12,
		height: 44,
		gap: 8,
		marginTop: 6,
	},
	navigateGpsText: {
		fontSize: 13,
		fontWeight: '700',
		color: '#FFFFFF',
	},

	/* ACTION CONTROLS */
	actionControlsGroup: {
		gap: 10,
	},
	travelBtn: {
		backgroundColor: '#0284C7',
		borderRadius: 12,
	},
	cancelBtn: {
		borderColor: '#EF4444',
		borderRadius: 12,
	},
	arrivedBtn: {
		backgroundColor: '#2B6F71',
		borderRadius: 12,
	},
})
