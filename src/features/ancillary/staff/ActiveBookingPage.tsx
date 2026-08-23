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
import { MOCK_NURSE_BOOKINGS, NurseBooking, getBookingState, updateNurseStatusBackend } from '../ancillaryService'
import { ROUTES } from '../../../navigation/routes'
import ServiceTimeline from '../components/ServiceTimeline'
import AppScreenHeader from '../../../components/common/AppScreenHeader'
import { AppTypography } from '../../../components/common/AppTypography'
import { AppButton } from '../../../components/common/AppButton'

import ApiService from '../../../services/apiService'
import { API_ENDPOINTS } from '../../../constants/apiUrls'

export default function ActiveBookingPage() {
	const navigation = useNavigation<any>()
	const route = useRoute<any>()
	const insets = useSafeAreaInsets()
	const { bookingId } = route.params || {}

	const [booking, setBooking] = useState<NurseBooking | null>(null)
	const [loading, setLoading] = useState(true)

	useEffect(() => {
		const loadData = async () => {
			try {
				if (bookingId) {
					const res = await ApiService.get<any>(API_ENDPOINTS.ANCILLARY.REQUEST_STATUS(bookingId))
					const apiData = res.data?.data || res.data
					if (apiData) {
						const found = MOCK_NURSE_BOOKINGS.find((b) => b.id === bookingId)
						const pName = apiData.patientName || apiData.patient_name || apiData.patientUser?.name || apiData.patient?.name || (found ? found.patientName : 'Eleanor Vance')
						const pAge = apiData.patientAge || apiData.patient_age || apiData.age || (found ? found.patientAge : 68)
						const pGender = apiData.patientGender || apiData.patient_gender || apiData.gender || (found ? found.patientGender : 'Female')
						const pPhone = apiData.patientPhone || apiData.patient_phone || apiData.phone || (found ? found.patientPhone : '+91 98765 43210')
						const pAvatar = apiData.patientAvatar || apiData.patient_avatar || apiData.patient?.avatar || (found ? found.patientAvatar : undefined)
						const pAddress = apiData.streetAddress || apiData.street_address || apiData.patientAddress || apiData.patient_address || apiData.address || (found ? found.patientAddress : '42 Healthcare Avenue, Flat 3B, Sector 18, New Delhi')
						const sName = apiData.serviceName || apiData.service_name || apiData.procedure?.label || (found ? found.serviceName : 'Wound Dressing & Sterile Care')
						const sDesc = apiData.procedureDetails || apiData.procedure_details || apiData.serviceDescription || (found ? found.serviceDescription : 'Sterile dressing, cleansing & vitals monitoring')

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
							otpCode: apiData.verificationOtp || apiData.otp || '4829',
							completePin: apiData.completionPin || apiData.pin || '9182',
						})
						setLoading(false)
						return
					}
				}
			} catch (e) {
				console.log('[ActiveBookingPage] Fetching live status notice')
			}

			const found = MOCK_NURSE_BOOKINGS.find((b) => b.id === bookingId)
			if (found) {
				const state = await getBookingState(found.id)
				setBooking({
					...found,
					status: state ? state.status : found.status,
				})
			} else {
				const state = bookingId ? await getBookingState(bookingId) : null
				setBooking({
					id: bookingId || 'BK-LIVE-101',
					patientName: 'Eleanor Vance',
					patientAge: 68,
					patientGender: 'Female',
					patientPhone: '+91 98765 43210',
					serviceName: 'Wound Dressing & Sterile Care',
					serviceDescription: 'Sterile dressing, cleansing & vitals monitoring',
					appointmentDate: 'Today',
					appointmentTime: 'Immediate Dispatch',
					patientAddress: '42 Healthcare Avenue, Flat 3B, Sector 18, New Delhi',
					status: state ? state.status : 'assigned',
					otpCode: '4829',
					completePin: '9182',
				})
			}
			setLoading(false)
		}
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
			await updateNurseStatusBackend(booking.id, 'EN_ROUTE', 12)
			setBooking((prev) => (prev ? { ...prev, status: 'EN_ROUTE' } : null))
			Alert.alert('Status Updated', 'You are now marked as En-Route. Patient has been notified of your estimated arrival in 12 mins.')
		} catch (e) {
			console.log('Error updating travel status')
		}
	}

	const handleArrived = async () => {
		if (!booking) return
		try {
			await updateNurseStatusBackend(booking.id, 'ARRIVED', 0)
			setBooking((prev) => (prev ? { ...prev, status: 'ARRIVED' } : null))
			navigation.navigate(ROUTES.STACK.NURSE_PATIENT_VERIFICATION, { bookingId: booking.id })
		} catch (e) {
			navigation.navigate(ROUTES.STACK.NURSE_PATIENT_VERIFICATION, { bookingId: booking.id })
		}
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
			<View style={styles.errorContainer}>
				<AppTypography variant="body" style={styles.errorText}>
					Active booking details not found.
				</AppTypography>
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
					</View>
				</View>
			</ScrollView>
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
	arrivedBtn: {
		backgroundColor: '#2B6F71',
		borderRadius: 12,
	},
})
