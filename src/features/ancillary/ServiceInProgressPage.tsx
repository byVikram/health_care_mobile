import React, { useEffect, useState } from 'react'
import {
	ActivityIndicator,
	Alert,
	KeyboardAvoidingView,
	Linking,
	Platform,
	ScrollView,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation, useRoute } from '@react-navigation/native'
import { MOCK_NURSE_BOOKINGS, NurseBooking, NurseBookingState, getBookingState, saveBookingState } from './ancillaryService'
import { ROUTES } from '../../navigation/routes'
import ServiceTimeline from './components/ServiceTimeline'
import PatientInformationCard from './components/PatientInformationCard'
import CareChecklist from './components/CareChecklist'
import NotesInput from './components/NotesInput'
import UploadSection from './components/UploadSection'
import ConfirmationModal from './components/ConfirmationModal'

export default function ServiceInProgressPage() {
	const navigation = useNavigation<any>()
	const route = useRoute<any>()
	const { bookingId } = route.params || {}

	const [booking, setBooking] = useState<NurseBooking | null>(null)
	const [sessionState, setSessionState] = useState<NurseBookingState | null>(null)
	const [loading, setLoading] = useState(true)

	// Timer state
	const [elapsedSeconds, setElapsedSeconds] = useState(0)

	// Confirmation overlays
	const [cancelModalVisible, setCancelModalVisible] = useState(false)

	useEffect(() => {
		const loadSession = async () => {
			const found = MOCK_NURSE_BOOKINGS.find((b) => b.id === bookingId)
			if (found) {
				setBooking(found)
				const state = await getBookingState(found.id)
				if (state) {
					setSessionState(state)
					// Calculate initial elapsed time
					if (state.startServiceTime) {
						const start = new Date(state.startServiceTime).getTime()
						const now = Date.now()
						setElapsedSeconds(Math.max(0, Math.floor((now - start) / 1000)))
					}
				}
			}
			setLoading(false)
		}
		void loadSession()
	}, [bookingId])

	// Tick timer effect
	useEffect(() => {
		let timer: NodeJS.Timeout
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

	const handleCancelVisit = () => {
		setCancelModalVisible(true)
	}

	const confirmCancelVisit = async () => {
		setCancelModalVisible(false)
		if (!booking) return
		// Revert to assigned status
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
			<View style={styles.errorContainer}>
				<Text style={styles.errorText}>No active service session found.</Text>
			</View>
		)
	}

	return (
		<KeyboardAvoidingView
			style={styles.keyboardView}
			behavior={Platform.OS === 'ios' ? 'padding' : undefined}
		>
			<ScrollView style={styles.container} contentContainerStyle={styles.content}>
				<ServiceTimeline currentStatus="in_progress" />

				{/* Timer Card */}
				<View style={styles.timerCard}>
					<Text style={styles.timerLabel}>Visit Duration</Text>
					<Text style={styles.timerDisplay}>{formatTimerDisplay(elapsedSeconds)}</Text>
					<View style={styles.pulseContainer}>
						<View style={styles.pulseDot} />
						<Text style={styles.pulseText}>Live active care timer running</Text>
					</View>
				</View>

				{/* Patient Info */}
				<Text style={styles.sectionHeader}>Patient details</Text>
				<PatientInformationCard
					name={booking.patientName}
					age={booking.patientAge}
					gender={booking.patientGender}
					phone={booking.patientPhone}
					avatarUrl={booking.patientAvatar}
					onCallPress={() => {
						Linking.openURL(`tel:${booking.patientPhone}`).catch(() => {
							Alert.alert('Error', 'Unable to place call.')
						})
					}}
				/>

				{/* Care Checklist */}
				<CareChecklist
					items={checklistItems}
					checkedState={sessionState.checklist}
					onToggleItem={handleToggleChecklistItem}
				/>

				{/* Observation Notes */}
				<NotesInput value={sessionState.notes} onChangeValue={handleNotesChange} />

				{/* Attachments Section */}
				<UploadSection
					files={sessionState.uploadedImages}
					onAddFile={handleAddFile}
					onRemoveFile={handleRemoveFile}
				/>

				{/* Support Contact block */}
				<View style={styles.supportBox}>
					<Text style={styles.supportTitle}>Need Immediate Operations Support?</Text>
					<TouchableOpacity
						style={styles.supportLink}
						onPress={() => Linking.openURL('tel:+15550190000')}
					>
						<Ionicons name="help-buoy" size={18} color="#2B6F71" />
						<Text style={styles.supportLinkText}>Contact Clinic Coordinators</Text>
					</TouchableOpacity>
				</View>

				{/* Action button rows */}
				<View style={styles.actionRow}>
					<TouchableOpacity
						style={styles.cancelBtn}
						onPress={handleCancelVisit}
						activeOpacity={0.8}
					>
						<Text style={styles.cancelBtnText}>Abort Visit</Text>
					</TouchableOpacity>

					<TouchableOpacity
						style={[styles.completeBtn, !allChecked && styles.completeBtnDisabled]}
						onPress={handleCompleteService}
						disabled={!allChecked}
						activeOpacity={0.85}
					>
						<Text style={styles.completeBtnText}>Complete Care</Text>
						<Ionicons name="checkmark-done" size={18} color="#FFFFFF" style={styles.completeIcon} />
					</TouchableOpacity>
				</View>

				{/* Confirm Abort overlay */}
				<ConfirmationModal
					visible={cancelModalVisible}
					title="Abort active visit?"
					description="This action will reset checklist checkboxes, wipe clinical observations notes, stop the timer, and return the booking to Assigned status. Are you sure?"
					confirmText="Yes, Abort"
					cancelText="Keep Session"
					iconName="warning"
					iconColor="#EF4444"
					onConfirm={confirmCancelVisit}
					onCancel={() => setCancelModalVisible(false)}
				/>
			</ScrollView>
		</KeyboardAvoidingView>
	)
}

const styles = StyleSheet.create({
	keyboardView: {
		flex: 1,
		backgroundColor: '#F8FAFC',
	},
	container: {
		flex: 1,
	},
	content: {
		padding: 16,
		paddingBottom: 40,
	},
	loadingContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: '#F8FAFC',
	},
	errorContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: '#F8FAFC',
		padding: 24,
	},
	errorText: {
		fontSize: 15,
		color: '#EF4444',
		fontWeight: '600',
		textAlign: 'center',
	},
	sectionHeader: {
		fontSize: 14,
		fontWeight: '800',
		color: '#64748B',
		textTransform: 'uppercase',
		letterSpacing: 0.8,
		marginBottom: 8,
		marginTop: 6,
	},
	timerCard: {
		backgroundColor: '#12373E',
		borderRadius: 16,
		padding: 20,
		alignItems: 'center',
		marginBottom: 20,
		shadowColor: '#12373E',
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.15,
		shadowRadius: 12,
		elevation: 4,
	},
	timerLabel: {
		fontSize: 12,
		fontWeight: '700',
		color: '#8CAEBA',
		textTransform: 'uppercase',
		letterSpacing: 0.6,
		marginBottom: 4,
	},
	timerDisplay: {
		fontSize: 34,
		fontWeight: '800',
		color: '#FFFFFF',
		letterSpacing: 1,
		marginBottom: 8,
	},
	pulseContainer: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	pulseDot: {
		width: 8,
		height: 8,
		borderRadius: 4,
		backgroundColor: '#10B981',
		marginRight: 6,
	},
	pulseText: {
		fontSize: 11,
		color: '#8CAEBA',
		fontWeight: '600',
	},
	supportBox: {
		backgroundColor: '#F1F5F9',
		borderRadius: 12,
		padding: 14,
		alignItems: 'center',
		marginBottom: 24,
		borderWidth: 1,
		borderColor: '#E2E8F0',
	},
	supportTitle: {
		fontSize: 13,
		fontWeight: '700',
		color: '#475569',
		marginBottom: 6,
	},
	supportLink: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
	},
	supportLinkText: {
		fontSize: 13,
		fontWeight: '700',
		color: '#2B6F71',
	},
	actionRow: {
		flexDirection: 'row',
		gap: 12,
	},
	cancelBtn: {
		flex: 0.4,
		height: 52,
		borderRadius: 14,
		borderWidth: 1.5,
		borderColor: '#EF4444',
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: '#FFFFFF',
	},
	cancelBtnText: {
		fontSize: 14,
		fontWeight: '700',
		color: '#EF4444',
	},
	completeBtn: {
		flex: 0.6,
		flexDirection: 'row',
		height: 52,
		borderRadius: 14,
		backgroundColor: '#2B6F71',
		justifyContent: 'center',
		alignItems: 'center',
		shadowColor: '#2B6F71',
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.15,
		shadowRadius: 8,
		elevation: 3,
	},
	completeBtnDisabled: {
		backgroundColor: '#CBD5E1',
		shadowOpacity: 0,
		elevation: 0,
	},
	completeBtnText: {
		fontSize: 14,
		fontWeight: '700',
		color: '#FFFFFF',
	},
	completeIcon: {
		marginLeft: 6,
	},
})
