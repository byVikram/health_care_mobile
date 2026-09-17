import React, { useEffect, useState } from 'react'
import {
	ActivityIndicator,
	Alert,
	Image,
	KeyboardAvoidingView,
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
import { MOCK_NURSE_BOOKINGS, NurseBooking, NurseBookingState, getBookingState, saveBookingState } from '../ancillaryService'
import { ROUTES } from '../../../navigation/routes'
import ServiceTimeline from '../components/ServiceTimeline'
import CareChecklist from '../components/CareChecklist'
import NotesInput from '../components/NotesInput'
import UploadSection from '../components/UploadSection'
import CancelVisitModal from '../components/CancelVisitModal'
import AppScreenHeader from '../../../components/common/AppScreenHeader'
import { AppTypography } from '../../../components/common/AppTypography'
import { AppButton } from '../../../components/common/AppButton'

import ApiService from '../../../services/apiService'
import { API_ENDPOINTS } from '../../../constants/apiUrls'

export default function ServiceInProgressPage() {
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
	const [sessionState, setSessionState] = useState<NurseBookingState | null>(null)
	const [loading, setLoading] = useState(true)

	// Timer state
	const [elapsedSeconds, setElapsedSeconds] = useState(0)

	// Confirmation overlay
	const [cancelModalVisible, setCancelModalVisible] = useState(false)

	const loadSession = async () => {
		setLoading(true)
		let liveClinicalNotes = ''
		let apiPatientData: any = null
		try {
			if (bookingId) {
				const statusRes = await ApiService.get<any>(API_ENDPOINTS.ANCILLARY.REQUEST_STATUS(bookingId))
				apiPatientData = statusRes.data?.data || statusRes.data
				const res = await ApiService.get<any>(API_ENDPOINTS.ANCILLARY.CLINICAL_DETAILS(bookingId))
				const details = res.data?.data || res.data
				if (details) {
					liveClinicalNotes = details.clinicalNotes || details.procedureDetails || ''
				}
			}
		} catch (e) {
			console.log('[ServiceInProgressPage] Loaded clinical details notice', e)
		}

		const pName =
			apiPatientData?.patientFullName ||
			apiPatientData?.patientName ||
			apiPatientData?.patient_name ||
			apiPatientData?.patientUser?.name ||
			apiPatientData?.patient?.name ||
			initialBooking?.patientName

		if (pName && typeof pName === 'string' && pName.trim() !== '' && !['Eleanor Vance', 'Patient Account Holder', 'John Doe', 'Patient Recipient', 'Patient'].includes(pName.trim())) {
			const activeBooking: NurseBooking = {
				id: apiPatientData?.requestId || apiPatientData?.id || initialBooking?.id || bookingId,
				patientName: pName,
				patientAge: apiPatientData?.patientAge || apiPatientData?.patient_age || apiPatientData?.age || initialBooking?.patientAge || 0,
				patientGender: apiPatientData?.patientGender || apiPatientData?.patient_gender || apiPatientData?.gender || initialBooking?.patientGender || 'Not Specified',
				patientPhone: apiPatientData?.patientPhone || apiPatientData?.patient_phone || apiPatientData?.phone || initialBooking?.patientPhone || '',
				patientAvatar: apiPatientData?.patientAvatar || apiPatientData?.patient_avatar || apiPatientData?.patient?.avatar || initialBooking?.patientAvatar || undefined,
				serviceName: apiPatientData?.serviceName || apiPatientData?.service_name || apiPatientData?.procedure?.label || initialBooking?.serviceName || 'General Nursing Care',
				serviceDescription: apiPatientData?.procedureDetails || apiPatientData?.procedure_details || apiPatientData?.serviceDescription || initialBooking?.serviceDescription || 'Doorstep clinical care',
				appointmentDate: apiPatientData?.appointmentDate || initialBooking?.appointmentDate || 'Today',
				appointmentTime: apiPatientData?.appointmentTime || initialBooking?.appointmentTime || 'In Progress',
				patientAddress: apiPatientData?.streetAddress || apiPatientData?.street_address || apiPatientData?.patientAddress || initialBooking?.patientAddress || 'Address on file',
				status: 'in_progress',
				otpCode: apiPatientData?.verificationOtp || apiPatientData?.otp || initialBooking?.otpCode || '',
				completePin: apiPatientData?.completionPin || apiPatientData?.pin || initialBooking?.completePin || '',
			}

			setBooking(activeBooking)
			const state = await getBookingState(activeBooking.id)
			const now = new Date().toISOString()

			const resolvedState: NurseBookingState = state || {
				status: 'in_progress',
				startServiceTime: now,
				checklist: {
					'Patient assessment & vitals check': true,
					'Sterile kit preparation': true,
					'Aseptic procedure execution': false,
					'Post-procedure care guidance': false,
				},
				notes: liveClinicalNotes || '',
				uploadedImages: [],
			}

			setSessionState(resolvedState)
			if (resolvedState.startServiceTime) {
				const start = new Date(resolvedState.startServiceTime).getTime()
				setElapsedSeconds(Math.max(0, Math.floor((Date.now() - start) / 1000)))
			}
			setLoading(false)
			return
		}

		setBooking(null)
		setSessionState(null)
		setLoading(false)
	}

	useEffect(() => {
		void loadSession()
	}, [bookingId])

	// Tick timer effect
	useEffect(() => {
		let timer: ReturnType<typeof setInterval> | null = null
		if (sessionState?.startServiceTime) {
			timer = setInterval(() => {
				const start = new Date(sessionState.startServiceTime!).getTime()
				const now = Date.now()
				setElapsedSeconds(Math.max(0, Math.floor((now - start) / 1000)))
			}, 1000)
		}
		return () => {
			if (timer) clearInterval(timer)
		}
	}, [sessionState?.startServiceTime])

	const formatTimerDisplay = (totalSeconds: number) => {
		const hrs = Math.floor(totalSeconds / 3600)
		const mins = Math.floor((totalSeconds % 3600) / 60)
		const secs = totalSeconds % 60

		const pad = (num: number) => String(num).padStart(2, '0')
		if (hrs > 0) {
			return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`
		}
		return `${pad(mins)}:${pad(secs)}`
	}

	const handleToggleChecklistItem = async (item: string) => {
		if (!booking || !sessionState) return
		const nextChecklist = {
			...sessionState.checklist,
			[item]: !sessionState.checklist[item],
		}
		const nextState = {
			...sessionState,
			checklist: nextChecklist,
		}
		setSessionState(nextState)
		await saveBookingState(booking.id, nextState)
	}

	const handleNotesChange = async (text: string) => {
		if (!booking || !sessionState) return
		const nextState = {
			...sessionState,
			notes: text,
		}
		setSessionState(nextState)
		await saveBookingState(booking.id, nextState)
	}

	const handleAddFile = async (fileName: string) => {
		if (!booking || !sessionState) return
		const nextState = {
			...sessionState,
			uploadedImages: [...sessionState.uploadedImages, fileName],
		}
		setSessionState(nextState)
		await saveBookingState(booking.id, nextState)
	}

	const handleRemoveFile = async (index: number) => {
		if (!booking || !sessionState) return
		const list = [...sessionState.uploadedImages]
		list.splice(index, 1)
		const nextState = {
			...sessionState,
			uploadedImages: list,
		}
		setSessionState(nextState)
		await saveBookingState(booking.id, nextState)
	}

	const confirmCancelVisit = async () => {
		setCancelModalVisible(false)
		if (!booking) return
		const nextState = {
			status: 'assigned' as const,
			startServiceTime: null,
			checklist: {},
			notes: '',
			uploadedImages: [],
		}
		await saveBookingState(booking.id, nextState)
		navigation.reset({
			index: 0,
			routes: [{ name: ROUTES.MAIN.TABS }],
		})
	}

	const handleCompleteService = () => {
		if (!booking) return
		navigation.navigate(ROUTES.STACK.NURSE_COMPLETE_SERVICE, {
			bookingId: booking.id,
			initialBooking: booking,
			elapsedSeconds,
		})
	}

	const checklistItems = sessionState ? Object.keys(sessionState.checklist) : []
	const allChecked =
		checklistItems.length > 0 &&
		checklistItems.every((item) => !!sessionState?.checklist[item])

	if (loading) {
		return (
			<View style={styles.loadingContainer}>
				<ActivityIndicator size="large" color="#2B6F71" />
			</View>
		)
	}

	if (!booking || !sessionState) {
		return (
			<View style={styles.container}>
				<AppScreenHeader title="Care Session In Progress" />
				<View style={styles.errorContainer}>
					<MaterialCommunityIcons name="account-alert-outline" size={54} color="#D9534F" style={{ marginBottom: 14 }} />
					<AppTypography variant="h3" style={{ color: '#1B2A32', fontWeight: '700', marginBottom: 8, textAlign: 'center' }}>
						Unable to Load Patient Information
					</AppTypography>
					<AppTypography variant="body" style={styles.errorText}>
						We couldn't retrieve the patient details for this booking. Please try again.
					</AppTypography>
					<View style={{ flexDirection: 'row', gap: 12, marginTop: 24, width: '100%', justifyContent: 'center' }}>
						<AppButton variant="primary" onPress={() => loadSession()} style={{ minWidth: 120 }}>Try Again</AppButton>
						<AppButton variant="outline" onPress={() => navigation.goBack()} style={{ minWidth: 120 }}>Go Back</AppButton>
					</View>
				</View>
			</View>
		)
	}

	return (
		<KeyboardAvoidingView
			style={styles.container}
			behavior={Platform.OS === 'ios' ? 'padding' : undefined}
		>
			<AppScreenHeader title="Care Session In Progress" />

			<ScrollView
				contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
				showsVerticalScrollIndicator={false}
			>
				{/* 1. TIMELINE & LIVE TIMER BLOCK */}
				<View style={styles.sectionBlock}>
					<ServiceTimeline currentStatus="in_progress" />

					<View style={styles.liveTimerBar}>
						<View style={styles.liveTimerCol}>
							<AppTypography variant="caption" style={styles.timerLabel}>
								LIVE CARE TIMER
							</AppTypography>
							<AppTypography variant="h2" style={styles.timerDigits}>
								{formatTimerDisplay(elapsedSeconds)}
							</AppTypography>
						</View>

						<View style={styles.livePulseTag}>
							<View style={styles.pulseDot} />
							<AppTypography variant="caption" style={styles.pulseTagText}>
								IN PROGRESS
							</AppTypography>
						</View>
					</View>
				</View>

				{/* 8px GREY SECTION DIVIDER BAR */}
				<View style={styles.sectionDividerBar} />

				{/* 2. PATIENT RECIPIENT INFORMATION (CARD-FREE) */}
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

				{/* 3. CARE CHECKLIST (CARD-FREE) */}
				<View style={styles.sectionBlock}>
					<AppTypography variant="h3" style={styles.sectionHeading}>
						Clinical Task Checklist
					</AppTypography>

					<CareChecklist
						items={checklistItems}
						checkedState={sessionState.checklist}
						onToggleItem={handleToggleChecklistItem}
					/>
				</View>

				{/* 8px GREY SECTION DIVIDER BAR */}
				<View style={styles.sectionDividerBar} />

				{/* 4. OBSERVATION NOTES & ATTACHMENTS (CARD-FREE) */}
				<View style={styles.sectionBlock}>
					<AppTypography variant="h3" style={styles.sectionHeading}>
						Clinical Observations & Attachments
					</AppTypography>

					<NotesInput value={sessionState.notes} onChangeValue={handleNotesChange} />

					<UploadSection
						files={sessionState.uploadedImages}
						onAddFile={handleAddFile}
						onRemoveFile={handleRemoveFile}
					/>
				</View>

				{/* 8px GREY SECTION DIVIDER BAR */}
				<View style={styles.sectionDividerBar} />

				{/* 5. ACTION BUTTON CONTROLS */}
				<View style={styles.sectionBlock}>
					<AppButton
						variant="primary"
						onPress={handleCompleteService}
						disabled={!allChecked}
						style={styles.completeBtn}
					>
						Complete Care Procedure
					</AppButton>

					<AppButton
						variant="outline"
						onPress={() => setCancelModalVisible(true)}
						style={styles.abortBtn}
					>
						Cancel Visit
					</AppButton>
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
		</KeyboardAvoidingView>
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
	},

	/* SECTION BLOCK & DIVIDERS */
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
	sectionHeading: {
		fontSize: 16.5,
		fontWeight: '700',
		color: '#0F172A',
		letterSpacing: -0.2,
	},

	/* TIMER BAR */
	liveTimerBar: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		backgroundColor: '#F8FAFC',
		padding: 14,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: '#E2E8F0',
	},
	liveTimerCol: {
		gap: 2,
	},
	timerLabel: {
		fontSize: 10.5,
		fontWeight: '800',
		color: '#64748B',
		letterSpacing: 0.5,
	},
	timerDigits: {
		fontSize: 24,
		fontWeight: '800',
		color: '#2B6F71',
		letterSpacing: 1,
	},
	livePulseTag: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: 'rgba(43, 111, 113, 0.12)',
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 6,
		gap: 6,
	},
	pulseDot: {
		width: 6,
		height: 6,
		borderRadius: 3,
		backgroundColor: '#2B6F71',
	},
	pulseTagText: {
		fontSize: 10.5,
		fontWeight: '800',
		color: '#2B6F71',
		letterSpacing: 0.3,
	},

	/* PATIENT ROW */
	patientProfileRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		paddingVertical: 2,
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

	/* BUTTONS */
	completeBtn: {
		backgroundColor: '#2B6F71',
		borderRadius: 12,
	},
	abortBtn: {
		borderColor: '#EF4444',
		borderRadius: 12,
	},
})
