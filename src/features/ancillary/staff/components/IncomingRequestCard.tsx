import React, { useEffect, useRef, useState } from 'react'
import {
	Animated,
	Modal,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
	useWindowDimensions,
	Linking,
	Platform,
	Alert,
	ScrollView,
	ActivityIndicator,
	LayoutAnimation,
	UIManager,
	Vibration,
} from 'react-native'
import { useAudioPlayer, setAudioModeAsync } from 'expo-audio'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { AppModal } from '../../../../components/common'
import { SoftReviewRequestData, AuthorizedDetailedPatientInfo } from '../../ancillaryService'

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
	UIManager.setLayoutAnimationEnabledExperimental(true)
}

export const MOCK_SOFT_REQUEST: SoftReviewRequestData = {
	id: 'REQ-NURSE-991',
	serviceName: 'Wound Care',
	requestedDate: '18 Aug 2026',
	requestedTime: '10:00 AM',
	generalLocation: 'Whitefield, Bengaluru',
	distanceKm: '4.2 km',
	travelTime: '~18 min',
	serviceRequirement: 'Post-surgical wound dressing',
	requiredSkills: ['Wound Care', 'Sterile Dressing'],
	urgency: 'Routine',
	specialRequirements: 'Sterile dressing required',
	earning: '₹850',
	expiresAt: Date.now() + 30 * 1000,
}

// ----------------------------------------------------------------------
// 1. IN-PLACE EXPANDABLE REQUEST CARD (30S COUNTDOWN, PROMINENT ACCEPT)
// -------------------------------------------------------------------------------
interface IncomingRequestOverlayProps {
	visible: boolean
	request: SoftReviewRequestData | null
	onAccept: () => void
	onDecline: () => void
}

export function IncomingRequestNotificationOverlay({
	visible,
	request,
	onAccept,
	onDecline,
}: IncomingRequestOverlayProps) {
	const insets = useSafeAreaInsets()
	const { width, height } = useWindowDimensions()
	const isTablet = width >= 768

	const [isExpanded, setIsExpanded] = useState(false)
	const [secondsLeft, setSecondsLeft] = useState<number>(30)

	const translateY = useRef(new Animated.Value(-400)).current
	const opacity = useRef(new Animated.Value(0)).current
	const lastPlayedIdRef = useRef<string | null>(null)
	const audioPlayer = useAudioPlayer('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3')

	// Incoming audio & haptic alert on new request arrival
	useEffect(() => {
		if (!visible || !request) {
			lastPlayedIdRef.current = null
			return
		}

		if (lastPlayedIdRef.current === request.id) return
		lastPlayedIdRef.current = request.id

		// Trigger Haptic Alert
		try {
			Vibration.vibrate([0, 180, 100, 180])
		} catch (e) {
			// haptic fallback
		}

		// Trigger Audio Chime Alert
		const playAudioChime = async () => {
			try {
				await setAudioModeAsync({
					playsInSilentMode: true,
					interruptionMode: 'duckOthers',
					shouldPlayInBackground: false,
				})

				audioPlayer.volume = 0.8
				await audioPlayer.seekTo(0)
				audioPlayer.play()
			} catch (error) {
				console.warn('[IncomingRequestCard] Audio playback notice:', error)
			}
		}

		void playAudioChime()
	}, [visible, request?.id])

	// 30-Second Countdown calculation from request.expiresAt
	useEffect(() => {
		if (!visible || !request) return

		setIsExpanded(false)
		translateY.setValue(-400)
		opacity.setValue(0)

		Animated.parallel([
			Animated.timing(translateY, {
				toValue: 0,
				duration: 350,
				useNativeDriver: true,
			}),
			Animated.timing(opacity, {
				toValue: 1,
				duration: 300,
				useNativeDriver: true,
			}),
		]).start()

		const updateTimer = () => {
			const diffMs = request.expiresAt - Date.now()
			const secs = Math.max(0, Math.ceil(diffMs / 1000))
			setSecondsLeft(secs)

			if (secs <= 0) {
				setTimeout(() => {
					onDecline()
				}, 1500)
			}
		}

		updateTimer()
		const interval = setInterval(updateTimer, 1000)

		return () => clearInterval(interval)
	}, [visible, request?.expiresAt])

	if (!visible || !request) return null

	const handleDismiss = (callback?: () => void) => {
		Animated.parallel([
			Animated.timing(translateY, {
				toValue: -400,
				duration: 250,
				useNativeDriver: true,
			}),
			Animated.timing(opacity, {
				toValue: 0,
				duration: 250,
				useNativeDriver: true,
			}),
		]).start(() => {
			if (callback) callback()
		})
	}

	const handleToggleExpand = () => {
		LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
		setIsExpanded((prev) => !prev)
	}

	const handleDeclineTap = () => {
		handleDismiss(onDecline)
	}

	const handleAcceptTap = () => {
		onAccept()
	}

	const isExpired = secondsLeft <= 0
	const maxScrollHeight = Math.min(height * 0.52, 400)

	return (
		<Modal
			transparent
			visible={visible}
			animationType="none"
			onRequestClose={handleDeclineTap}
		>
			<View style={styles.modalRootContainer}>
				<Animated.View
					style={[
						styles.topOverlayCard,
						{
							paddingTop: Math.max(insets.top + 6, 14),
							transform: [{ translateY }],
							opacity,
						},
					]}
				>
					{/* Header Notification Badge, Timer & Close Button */}
					<View style={styles.topNotifHeaderRow}>
						<View style={styles.topNotifBadge}>
							<Ionicons name="notifications" size={13} color="#0C7C7C" />
							<Text style={styles.topNotifBadgeText} numberOfLines={1}>
								{isExpanded ? 'Soft Review' : 'New Request'}
							</Text>
						</View>

						{/* 30s Response Timer Badge */}
						<View style={[styles.timerBadge, isExpired && styles.timerBadgeExpired]}>
							<Ionicons name="time-outline" size={13} color={isExpired ? '#DC2626' : '#D97706'} />
							<Text style={[styles.timerText, isExpired && styles.timerTextExpired]}>
								{isExpired ? 'Expired' : `Respond within ${secondsLeft}s`}
							</Text>
						</View>

						<TouchableOpacity style={styles.topNotifDismissBtn} onPress={handleDeclineTap} activeOpacity={0.75}>
							<Ionicons name="close" size={16} color="#64748B" />
						</TouchableOpacity>
					</View>

					{/* Service Info & Prominent Payout Badge Box on Right */}
					<View style={styles.serviceAndPayoutRow}>
						<View style={styles.serviceInfoCol}>
							<Text style={styles.topNotifServiceTitle} numberOfLines={1}>
								{request.serviceName}
							</Text>

							{/* Date & Requested Time */}
							<View style={styles.compactDetailRow}>
								<Ionicons name="calendar-outline" size={13} color="#0C7C7C" style={styles.compactDetailIcon} />
								<Text style={styles.compactDetailText}>Today • {request.requestedTime}</Text>
							</View>

							{/* Location, Distance & Travel Time (wraps naturally) */}
							<View style={styles.compactDetailRow}>
								<Ionicons name="location-outline" size={13} color="#0C7C7C" style={styles.compactDetailIcon} />
								<Text style={styles.compactDetailText}>
									{request.generalLocation} • {request.distanceKm} away • {request.travelTime}
								</Text>
							</View>
						</View>

						{/* Visually Prominent Payout Box on Right */}
						<View style={styles.payoutProminentBox}>
							{request.patientAmount ? (
								<Text style={styles.patientPaysLabel}>Patient pays {request.patientAmount}</Text>
							) : null}
							<Text style={styles.payoutBoxLabel}>YOUR PAYOUT</Text>
							<Text style={styles.payoutBoxValue}>{request.earning}</Text>
						</View>
					</View>

					{/* COMPACT MODE ACTIONS */}
					{!isExpanded && (
						<View>
							{/* Actions: [ Review ] [ Decline ] [ ACCEPT ] */}
							<View style={styles.compact3ActionsRow}>
								<TouchableOpacity
									style={[styles.reviewCompactBtn, isExpired && styles.disabledBtn]}
									onPress={handleToggleExpand}
									activeOpacity={0.85}
									disabled={isExpired}
								>
									<Ionicons name="document-text-outline" size={14} color="#0C7C7C" />
									<Text style={styles.reviewCompactBtnText}>Review</Text>
								</TouchableOpacity>

								<TouchableOpacity
									style={[styles.declineCompactBtn, isExpired && styles.disabledBtn]}
									onPress={handleDeclineTap}
									activeOpacity={0.8}
									disabled={isExpired}
								>
									<Text style={styles.declineCompactBtnText}>Decline</Text>
								</TouchableOpacity>

								<TouchableOpacity
									style={[styles.acceptProminentBtn, isExpired && styles.disabledBtn]}
									onPress={handleAcceptTap}
									activeOpacity={0.88}
									disabled={isExpired}
								>
									<Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />
									<Text style={styles.acceptProminentBtnText}>Accept</Text>
								</TouchableOpacity>
							</View>
						</View>
					)}

					{/* IN-PLACE EXPANDED MODE VIEW */}
					{isExpanded && (
						<View style={{ marginTop: 4 }}>
							<ScrollView
								nestedScrollEnabled
								style={{ maxHeight: maxScrollHeight }}
								showsVerticalScrollIndicator={true}
								contentContainerStyle={{ paddingBottom: 4 }}
							>
								{/* Privacy Banner */}
								<View style={styles.phiNoticeBanner}>
									<Ionicons name="shield-checkmark" size={13} color="#047857" style={{ marginTop: 1 }} />
									<Text style={styles.phiNoticeText}>
										Patient identity & exact address remain locked until acceptance.
									</Text>
								</View>

								{/* Expanded Specs Card */}
								<View style={styles.expandedInfoCard}>
									<View style={styles.expandedInfoRow}>
										<Text style={styles.expandedInfoLabel}>Service</Text>
										<Text style={styles.expandedInfoValBold}>{request.serviceName}</Text>
									</View>

									<View style={styles.expandedInfoRowDual}>
										<View style={{ flex: 1, minWidth: 0 }}>
											<Text style={styles.expandedInfoLabel}>Requested Date</Text>
											<Text style={styles.expandedInfoVal}>{request.requestedDate}</Text>
										</View>
										<View style={{ flex: 1, minWidth: 0 }}>
											<Text style={styles.expandedInfoLabel}>Requested Time</Text>
											<Text style={styles.expandedInfoVal}>{request.requestedTime}</Text>
										</View>
									</View>

									<View style={styles.expandedInfoRowDual}>
										<View style={{ flex: 1.1, minWidth: 0 }}>
											<Text style={styles.expandedInfoLabel}>General Location</Text>
											<Text style={styles.expandedInfoVal}>{request.generalLocation}</Text>
										</View>
										<View style={{ flex: 0.9, minWidth: 0 }}>
											<Text style={styles.expandedInfoLabel}>Distance & Travel</Text>
											<Text style={styles.expandedInfoVal}>{request.distanceKm} ({request.travelTime})</Text>
										</View>
									</View>

									<View style={styles.expandedInfoRow}>
										<Text style={styles.expandedInfoLabel}>Service Requirement</Text>
										<Text style={styles.expandedInfoVal}>{request.serviceRequirement}</Text>
									</View>

									<View style={styles.expandedInfoRow}>
										<Text style={styles.expandedInfoLabel}>Required Skills</Text>
										<View style={styles.skillsTagWrap}>
											{request.requiredSkills.map((skill, idx) => (
												<View key={idx} style={styles.skillChip}>
													<Ionicons name="checkmark-circle" size={12} color="#0C7C7C" />
													<Text style={styles.skillChipText}>{skill}</Text>
												</View>
											))}
										</View>
									</View>

									<View style={styles.expandedInfoRowDual}>
										<View style={{ flex: 1, minWidth: 0 }}>
											<Text style={styles.expandedInfoLabel}>Urgency</Text>
											<View style={styles.urgencyBadge}>
												<Text style={styles.urgencyText}>{request.urgency}</Text>
											</View>
										</View>
										<View style={{ flex: 1, minWidth: 0 }}>
											<Text style={styles.expandedInfoLabel}>Remaining Response Time</Text>
											<Text style={[styles.timerInlineText, isExpired && styles.timerTextExpired]}>
												Respond within {secondsLeft}s
											</Text>
										</View>
									</View>

									<View style={styles.expandedInfoRow}>
										<Text style={styles.expandedInfoLabel}>Special Requirements</Text>
										<Text style={styles.expandedInfoVal}>{request.specialRequirements}</Text>
									</View>

									<View style={styles.expandedInfoRow}>
										<Text style={styles.expandedInfoLabel}>Patient Pays</Text>
										<Text style={styles.expandedInfoValBold}>{request.patientAmount || '—'}</Text>
									</View>

									<View style={[styles.expandedInfoRow, { borderBottomWidth: 0, paddingBottom: 0 }]}>
										<Text style={styles.expandedInfoLabel}>Your Payout</Text>
										<Text style={styles.payoutBigValue}>{request.earning}</Text>
									</View>
								</View>
							</ScrollView>

							{/* Actions at bottom of expanded card: [ Collapse ]  [ Decline ]  [ ACCEPT ] */}
							<View style={styles.expandedActionsRow}>
								<TouchableOpacity
									style={styles.collapseToggleBtn}
									onPress={handleToggleExpand}
									activeOpacity={0.8}
								>
									<Ionicons name="chevron-up" size={18} color="#64748B" />
								</TouchableOpacity>

								<TouchableOpacity
									style={[styles.declineCompactBtn, isExpired && styles.disabledBtn, { flex: 1 }]}
									onPress={handleDeclineTap}
									activeOpacity={0.8}
									disabled={isExpired}
								>
									<Text style={styles.declineCompactBtnText}>Decline</Text>
								</TouchableOpacity>

								<TouchableOpacity
									style={[styles.acceptProminentBtn, isExpired && styles.disabledBtn, { flex: 1.8 }]}
									onPress={handleAcceptTap}
									activeOpacity={0.88}
									disabled={isExpired}
								>
									<Ionicons name="checkmark-circle" size={17} color="#FFFFFF" />
									<Text style={styles.acceptProminentBtnText}>Accept Request</Text>
								</TouchableOpacity>
							</View>
						</View>
					)}
				</Animated.View>
			</View>
		</Modal>
	)
}

export default IncomingRequestNotificationOverlay

// ----------------------------------------------------------------------
// 2. ACCEPT CONFIRMATION DIALOG (SUMMARY & CONFIRM)
// ----------------------------------------------------------------------
interface AcceptConfirmationModalProps {
	visible: boolean
	request: SoftReviewRequestData | null
	onConfirmAccept: () => void
	onCancel: () => void
	loading?: boolean
}

export function AcceptConfirmationModal({
	visible,
	request,
	onConfirmAccept,
	onCancel,
	loading = false,
}: AcceptConfirmationModalProps) {
	if (!request) return null

	return (
		<AppModal visible={visible} onDismiss={onCancel} title="Accept this care request?">
			<View style={styles.confirmPromptContainer}>
				<Text style={styles.confirmSubText}>
					Confirm your assignment for this care visit. Detailed patient information will be unlocked upon confirmation.
				</Text>

				<View style={styles.summaryCard}>
					<View style={styles.summaryRow}>
						<Text style={styles.summaryLabel}>Service:</Text>
						<Text style={styles.summaryValue}>{request.serviceName}</Text>
					</View>
					<View style={styles.summaryRow}>
						<Text style={styles.summaryLabel}>Date:</Text>
						<Text style={styles.summaryValue}>Today • {request.requestedTime}</Text>
					</View>
					<View style={styles.summaryRow}>
						<Text style={styles.summaryLabel}>Location:</Text>
						<Text style={styles.summaryValue}>{request.generalLocation}</Text>
					</View>
					<View style={styles.summaryRow}>
						<Text style={styles.summaryLabel}>Distance:</Text>
						<Text style={styles.summaryValue}>{request.distanceKm}</Text>
					</View>
					<View style={styles.summaryRow}>
						<Text style={styles.summaryLabel}>Patient Pays:</Text>
						<Text style={styles.summaryValue}>{request.patientAmount || '—'}</Text>
					</View>
					<View style={[styles.summaryRow, { borderBottomWidth: 0 }]}>
						<Text style={styles.summaryLabel}>Your Payout:</Text>
						<Text style={styles.summaryValuePayout}>{request.earning}</Text>
					</View>
				</View>

				{/* Action Buttons: [ Confirm Accept ] & [ Cancel ] */}
				<View style={styles.modalActionsRow}>
					<TouchableOpacity style={styles.declineModalBtn} onPress={onCancel} activeOpacity={0.8} disabled={loading}>
						<Text style={styles.declineModalBtnText}>Cancel</Text>
					</TouchableOpacity>

					<TouchableOpacity style={styles.acceptPrimaryBtn} onPress={onConfirmAccept} activeOpacity={0.88} disabled={loading}>
						{loading ? (
							<ActivityIndicator size="small" color="#FFFFFF" />
						) : (
							<>
								<Ionicons name="checkmark-done-circle" size={18} color="#FFFFFF" />
								<Text style={styles.acceptPrimaryBtnText}>Confirm Accept</Text>
							</>
						)}
					</TouchableOpacity>
				</View>
			</View>
		</AppModal>
	)
}

// ----------------------------------------------------------------------
// 3. DETAILED REVIEW MODAL (UNLOCKED AUTHORIZED PATIENT PHI POST-ACCEPTANCE)
// ----------------------------------------------------------------------
interface DetailedReviewModalProps {
	visible: boolean
	detailedInfo: AuthorizedDetailedPatientInfo | null
	onProceedToVerification: () => void
	onClose: () => void
}

export function DetailedReviewModal({
	visible,
	detailedInfo,
	onProceedToVerification,
	onClose,
}: DetailedReviewModalProps) {
	if (!detailedInfo) return null

	const handleOpenMaps = () => {
		const query = encodeURIComponent(detailedInfo.exactAddress)
		const url = Platform.select({
			ios: `maps:0,0?q=${query}`,
			android: `geo:0,0?q=${query}`,
			default: `https://www.google.com/maps/search/?api=1&query=${query}`,
		})
		Linking.openURL(url).catch(() => {
			Alert.alert('Error', 'Unable to open maps application.')
		})
	}

	const handleCallPatient = () => {
		Linking.openURL(`tel:${detailedInfo.patientPhone}`).catch(() => {
			Alert.alert('Error', 'Unable to place call.')
		})
	}

	return (
		<AppModal visible={visible} onDismiss={onClose} title="Care Visit — Detailed Review">
			<ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 540 }}>
				{/* Acceptance Confirmation Banner */}
				<View style={styles.confirmedBanner}>
					<Ionicons name="checkmark-circle" size={20} color="#059669" />
					<View style={{ flex: 1, marginLeft: 8 }}>
						<Text style={styles.confirmedTitle}>ACCEPTED • Care Visit Confirmed & Assigned</Text>
						<Text style={styles.confirmedSub}>Booking ID: {detailedInfo.id}</Text>
					</View>
				</View>

				{/* Unlocked Authorized Patient Info */}
				<View style={styles.detailedCard}>
					<Text style={styles.detailedSectionHeader}>Authorized Patient Information</Text>
					<View style={styles.detailedHeaderRow}>
						<View style={{ flex: 1 }}>
							<Text style={styles.detailedPatientName}>{detailedInfo.patientName}</Text>
							<Text style={styles.detailedPatientMeta}>
								{detailedInfo.patientGender} • {detailedInfo.patientAge} years old
							</Text>
						</View>
						<TouchableOpacity style={styles.callBtn} onPress={handleCallPatient} activeOpacity={0.8}>
							<Ionicons name="call" size={15} color="#FFFFFF" />
							<Text style={styles.callBtnText}>Call Patient</Text>
						</TouchableOpacity>
					</View>

					<View style={styles.detailedDivider} />

					{/* Contact & Exact Address */}
					<Text style={styles.detailedLabel}>Exact Care Location & Contact</Text>
					<Text style={styles.detailedAddress}>{detailedInfo.exactAddress}</Text>
					<Text style={styles.phoneText}>Phone: {detailedInfo.patientPhone}</Text>

					<TouchableOpacity style={styles.mapNavBtn} onPress={handleOpenMaps} activeOpacity={0.85}>
						<Ionicons name="navigate-circle" size={18} color="#0C7C7C" />
						<Text style={styles.mapNavBtnText}>Open Navigation in Maps</Text>
					</TouchableOpacity>

					<View style={styles.detailedDivider} />

					{/* Service & Procedure Details */}
					<Text style={styles.detailedLabel}>Service / Procedure Details</Text>
					<Text style={styles.detailedValue}>{detailedInfo.serviceName}</Text>
					<Text style={styles.detailedNote}>{detailedInfo.procedureDetails}</Text>

					<View style={styles.detailedDivider} />

					{/* Clinical Notes & Instructions */}
					<Text style={styles.detailedLabel}>Relevant Clinical Information</Text>
					<Text style={styles.detailedNote}>"{detailedInfo.clinicalNotes}"</Text>

					<Text style={[styles.detailedLabel, { marginTop: 10 }]}>Care Instructions</Text>
					<Text style={styles.detailedNote}>{detailedInfo.careInstructions}</Text>

					<View style={styles.detailedDivider} />

					{/* Required Documents */}
					<Text style={styles.detailedLabel}>Required Documents</Text>
					<View style={styles.skillsTagWrap}>
						{detailedInfo.requiredDocuments.map((doc: string, i: number) => (
							<View key={i} style={styles.docChip}>
								<Ionicons name="document-attach" size={13} color="#2563EB" />
								<Text style={styles.docChipText}>{doc}</Text>
							</View>
						))}
					</View>

					<View style={styles.detailedDivider} />

					{/* Verification OTP Code */}
					<View style={styles.otpCardRow}>
						<View>
							<Text style={styles.otpLabel}>Patient Check-in OTP</Text>
							<Text style={styles.otpValue}>{detailedInfo.verificationOtp}</Text>
						</View>
						<Ionicons name="keypad" size={24} color="#0C7C7C" />
					</View>
				</View>

				{/* Action Buttons */}
				<View style={styles.modalActionsRow}>
					<TouchableOpacity style={styles.acceptPrimaryBtn} onPress={onProceedToVerification} activeOpacity={0.88}>
						<Text style={styles.acceptPrimaryBtnText}>Start Care Visit</Text>
						<Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
					</TouchableOpacity>
				</View>
			</ScrollView>
		</AppModal>
	)
}

// ----------------------------------------------------------------------
// STYLESHEET
// ----------------------------------------------------------------------
const styles = StyleSheet.create({
	modalRootContainer: {
		flex: 1,
		backgroundColor: 'transparent',
		justifyContent: 'flex-start',
		alignItems: 'center',
		paddingHorizontal: 12,
	},
	topOverlayCard: {
		width: '100%',
		maxWidth: 540,
		backgroundColor: '#FFFFFF',
		borderBottomLeftRadius: 20,
		borderBottomRightRadius: 20,
		paddingHorizontal: 14,
		paddingBottom: 14,
		borderWidth: 1.5,
		borderColor: '#0C7C7C',
		borderTopWidth: 0,
		shadowColor: '#0F172A',
		shadowOffset: { width: 0, height: 8 },
		shadowOpacity: 0.25,
		shadowRadius: 16,
		elevation: 20,
	},
	topNotifHeaderRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		gap: 6,
		marginBottom: 8,
	},
	topNotifBadge: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#E6F4F4',
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 12,
		gap: 4,
		flexShrink: 1,
	},
	topNotifBadgeText: {
		fontSize: 11,
		fontWeight: '800',
		color: '#0C7C7C',
		letterSpacing: 0.3,
	},
	topNotifDismissBtn: {
		width: 28,
		height: 28,
		borderRadius: 14,
		backgroundColor: '#F1F5F9',
		alignItems: 'center',
		justifyContent: 'center',
		flexShrink: 0,
	},
	topNotifServiceTitle: {
		fontSize: 17,
		fontWeight: '800',
		color: '#0F172A',
		marginBottom: 2,
	},
	serviceAndPayoutRow: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		justifyContent: 'space-between',
		gap: 8,
		marginTop: 2,
		marginBottom: 8,
	},
	serviceInfoCol: {
		flex: 1,
		minWidth: 0,
		marginRight: 4,
	},
	payoutProminentBox: {
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#E6F4F4',
		borderColor: '#BCE3E3',
		borderWidth: 1.5,
		paddingHorizontal: 10,
		paddingVertical: 6,
		borderRadius: 12,
		minWidth: 92,
		flexShrink: 0,
	},
	patientPaysLabel: {
		fontSize: 9.5,
		fontWeight: '600',
		color: '#5B7B7C',
		marginBottom: 3,
		textAlign: 'center',
	},
	payoutBoxLabel: {
		fontSize: 8.5,
		fontWeight: '800',
		color: '#2B6F71',
		letterSpacing: 0.4,
		textTransform: 'uppercase',
		marginBottom: 1,
	},
	payoutBoxValue: {
		fontSize: 19,
		fontWeight: '900',
		color: '#0C7C7C',
	},
	locationMainText: {
		fontSize: 13.5,
		fontWeight: '700',
		color: '#1E293B',
		marginTop: 2,
		marginBottom: 3,
	},
	compactDetailRow: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		gap: 5,
		marginTop: 2,
	},
	compactDetailIcon: {
		marginTop: 2,
		flexShrink: 0,
	},
	compactDetailText: {
		fontSize: 12,
		fontWeight: '600',
		color: '#475569',
		lineHeight: 16,
		flex: 1,
		flexWrap: 'wrap',
	},
	payoutHighlightRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		backgroundColor: '#F8FAFC',
		borderColor: '#E2E8F0',
		borderWidth: 1,
		paddingHorizontal: 10,
		paddingVertical: 8,
		borderRadius: 10,
		marginVertical: 8,
	},
	payoutValue: {
		fontSize: 18,
		fontWeight: '800',
		color: '#0C7C7C',
	},
	timerBadge: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#FEF3C7',
		borderColor: '#FDE68A',
		borderWidth: 1,
		paddingHorizontal: 7,
		paddingVertical: 3.5,
		borderRadius: 10,
		gap: 4,
		flexShrink: 0,
	},
	timerBadgeExpired: {
		backgroundColor: '#FEE2E2',
		borderColor: '#FCA5A5',
	},
	timerText: {
		fontSize: 11.5,
		fontWeight: '800',
		color: '#B45309',
	},
	timerTextExpired: {
		color: '#DC2626',
	},
	timerInlineText: {
		fontSize: 12,
		fontWeight: '800',
		color: '#D97706',
		marginTop: 2,
	},

	// Actions: [ Review ]  [ Decline ]  [ ACCEPT ]
	compact3ActionsRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		marginTop: 4,
	},
	reviewCompactBtn: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#E6F4F4',
		borderColor: '#BCE3E3',
		borderWidth: 1,
		paddingVertical: 9,
		borderRadius: 10,
		gap: 4,
	},
	reviewCompactBtnText: {
		fontSize: 12.5,
		fontWeight: '700',
		color: '#0C7C7C',
	},
	declineCompactBtn: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#F1F5F9',
		paddingVertical: 9,
		borderRadius: 10,
		borderWidth: 1,
		borderColor: '#CBD5E1',
	},
	declineCompactBtnText: {
		fontSize: 12.5,
		fontWeight: '600',
		color: '#64748B',
	},
	acceptProminentBtn: {
		flex: 1.6,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#0C7C7C',
		paddingVertical: 9,
		borderRadius: 10,
		gap: 5,
		shadowColor: '#0C7C7C',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.2,
		shadowRadius: 4,
		elevation: 3,
	},
	acceptProminentBtnText: {
		fontSize: 13.5,
		fontWeight: '800',
		color: '#FFFFFF',
		letterSpacing: 0.3,
	},
	disabledBtn: {
		opacity: 0.5,
	},

	// In-Place Expanded Card Styles
	phiNoticeBanner: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		backgroundColor: '#ECFDF5',
		borderColor: '#A7F3D0',
		borderWidth: 1,
		padding: 8,
		borderRadius: 8,
		gap: 6,
		marginBottom: 8,
	},
	phiNoticeText: {
		fontSize: 11,
		fontWeight: '600',
		color: '#047857',
		flex: 1,
		lineHeight: 15,
	},
	expandedInfoCard: {
		backgroundColor: '#F8FAFC',
		borderWidth: 1,
		borderColor: '#E2E8F0',
		borderRadius: 12,
		padding: 10,
	},
	expandedInfoRow: {
		borderBottomWidth: 1,
		borderBottomColor: '#E2E8F0',
		paddingBottom: 6,
		marginBottom: 6,
	},
	expandedInfoRowDual: {
		flexDirection: 'row',
		borderBottomWidth: 1,
		borderBottomColor: '#E2E8F0',
		paddingBottom: 6,
		marginBottom: 6,
		gap: 8,
	},
	expandedInfoLabel: {
		fontSize: 10,
		fontWeight: '800',
		color: '#94A3B8',
		textTransform: 'uppercase',
		letterSpacing: 0.4,
		marginBottom: 1,
	},
	expandedInfoValBold: {
		fontSize: 14,
		fontWeight: '800',
		color: '#0F172A',
	},
	expandedInfoVal: {
		fontSize: 12,
		fontWeight: '600',
		color: '#334155',
		lineHeight: 16,
		flexWrap: 'wrap',
	},
	skillsTagWrap: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 5,
		marginTop: 3,
	},
	skillChip: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#E6F4F4',
		borderColor: '#BCE3E3',
		borderWidth: 1,
		paddingHorizontal: 7,
		paddingVertical: 3,
		borderRadius: 10,
		gap: 3,
	},
	skillChipText: {
		fontSize: 11,
		fontWeight: '700',
		color: '#0C7C7C',
	},
	urgencyBadge: {
		alignSelf: 'flex-start',
		backgroundColor: '#EFF6FF',
		borderColor: '#BFDBFE',
		borderWidth: 1,
		paddingHorizontal: 8,
		paddingVertical: 2.5,
		borderRadius: 10,
		marginTop: 2,
	},
	urgencyText: {
		fontSize: 11.5,
		fontWeight: '700',
		color: '#1D4ED8',
	},
	payoutBigValue: {
		fontSize: 16,
		fontWeight: '800',
		color: '#0C7C7C',
		marginTop: 1,
	},
	expandedActionsRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		marginTop: 8,
	},
	collapseToggleBtn: {
		width: 36,
		height: 38,
		borderRadius: 10,
		backgroundColor: '#F1F5F9',
		borderWidth: 1,
		borderColor: '#CBD5E1',
		alignItems: 'center',
		justifyContent: 'center',
		flexShrink: 0,
	},

	// Confirmation Modal Styles
	confirmPromptContainer: {
		paddingVertical: 4,
	},
	confirmSubText: {
		fontSize: 13,
		color: '#475569',
		marginBottom: 14,
		lineHeight: 18,
	},
	summaryCard: {
		backgroundColor: '#F8FAFC',
		borderRadius: 12,
		borderWidth: 1,
		borderColor: '#E2E8F0',
		padding: 12,
		marginBottom: 16,
	},
	summaryRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		borderBottomWidth: 1,
		borderBottomColor: '#E2E8F0',
		paddingVertical: 8,
	},
	summaryLabel: {
		fontSize: 12.5,
		fontWeight: '600',
		color: '#64748B',
	},
	summaryValue: {
		fontSize: 12.5,
		fontWeight: '700',
		color: '#0F172A',
	},
	summaryValuePayout: {
		fontSize: 14,
		fontWeight: '800',
		color: '#0C7C7C',
	},

	// Detailed Modal Styles
	confirmedBanner: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#ECFDF5',
		borderColor: '#A7F3D0',
		borderWidth: 1,
		borderRadius: 12,
		padding: 10,
		marginBottom: 14,
	},
	confirmedTitle: {
		fontSize: 12.5,
		fontWeight: '800',
		color: '#047857',
	},
	confirmedSub: {
		fontSize: 11.5,
		color: '#059669',
		fontWeight: '600',
	},
	detailedCard: {
		backgroundColor: '#FFFFFF',
		borderRadius: 14,
		padding: 14,
		borderWidth: 1,
		borderColor: '#E2E8F0',
		marginBottom: 16,
	},
	detailedSectionHeader: {
		fontSize: 11,
		fontWeight: '800',
		color: '#0C7C7C',
		textTransform: 'uppercase',
		letterSpacing: 0.8,
		marginBottom: 8,
	},
	detailedHeaderRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	detailedPatientName: {
		fontSize: 17,
		fontWeight: '800',
		color: '#0F172A',
	},
	detailedPatientMeta: {
		fontSize: 12.5,
		color: '#64748B',
		marginTop: 2,
	},
	callBtn: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#10B981',
		paddingHorizontal: 12,
		paddingVertical: 7,
		borderRadius: 18,
		gap: 6,
	},
	callBtnText: {
		fontSize: 12,
		fontWeight: '700',
		color: '#FFFFFF',
	},
	detailedDivider: {
		height: 1,
		backgroundColor: '#F1F5F9',
		marginVertical: 12,
	},
	detailedLabel: {
		fontSize: 11,
		fontWeight: '800',
		color: '#94A3B8',
		textTransform: 'uppercase',
		letterSpacing: 0.6,
		marginBottom: 4,
	},
	detailedValue: {
		fontSize: 14,
		fontWeight: '700',
		color: '#0F172A',
	},
	detailedNote: {
		fontSize: 12.5,
		color: '#475569',
		lineHeight: 18,
		marginTop: 2,
	},
	detailedAddress: {
		fontSize: 13,
		fontWeight: '600',
		color: '#1E293B',
		marginBottom: 4,
	},
	phoneText: {
		fontSize: 12,
		fontWeight: '600',
		color: '#64748B',
		marginBottom: 8,
	},
	mapNavBtn: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#E6F4F4',
		borderColor: '#BCE3E3',
		borderWidth: 1,
		paddingHorizontal: 12,
		paddingVertical: 8,
		borderRadius: 10,
		gap: 6,
	},
	mapNavBtnText: {
		fontSize: 12.5,
		fontWeight: '700',
		color: '#0C7C7C',
	},
	docChip: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#EFF6FF',
		borderColor: '#BFDBFE',
		borderWidth: 1,
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 10,
		gap: 4,
	},
	docChipText: {
		fontSize: 12,
		fontWeight: '600',
		color: '#1D4ED8',
	},
	otpCardRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		backgroundColor: '#F8FAFC',
		borderColor: '#E2E8F0',
		borderWidth: 1,
		padding: 10,
		borderRadius: 10,
	},
	otpLabel: {
		fontSize: 11,
		fontWeight: '800',
		color: '#64748B',
		textTransform: 'uppercase',
	},
	otpValue: {
		fontSize: 18,
		fontWeight: '800',
		color: '#0C7C7C',
		letterSpacing: 2,
	},

	// Modal Actions
	modalActionsRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'flex-end',
		gap: 10,
		marginTop: 8,
	},
	declineModalBtn: {
		paddingHorizontal: 16,
		paddingVertical: 11,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: '#CBD5E1',
		backgroundColor: '#F8FAFC',
	},
	declineModalBtnText: {
		fontSize: 13.5,
		fontWeight: '600',
		color: '#64748B',
	},
	acceptPrimaryBtn: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#0C7C7C',
		paddingVertical: 11,
		borderRadius: 12,
		gap: 6,
	},
	acceptPrimaryBtnText: {
		fontSize: 13.5,
		fontWeight: '700',
		color: '#FFFFFF',
	},
})
