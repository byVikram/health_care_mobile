// src/features/radiology/RadiologyBookingPage.tsx
import React, { useEffect, useState } from 'react'
import { ActivityIndicator, Image, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import Toast from 'react-native-toast-message'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useAuth } from '../../context/AuthContext'
import { ROUTES } from '../../navigation/routes'
import type { AppStackParamList } from '../../navigation/types'
import { AppButton, AppCalendar, AppInput, AppSelect, AppTypography, ProviderDetailsCard, StatusModal } from '../../components/common'
import { createRadiologyBooking, fetchRadiologyScans, RadiologyBookingPayload } from './RadiologyService'
import { getPatientTreatmentHistory} from '../profile/pharmacy/pharmacyService'
import {TreatmentRecord } from '../pharmacy/pharmacyService'

type RouteProps = RouteProp<AppStackParamList, typeof ROUTES.STACK.PLACE_RADIOLOGY_ORDER>

// ─────────────────────────────────────────────
// Types — match the real /api/radiology/bookings contract
// ─────────────────────────────────────────────

export interface RadiologyScanOption {
	id: number
	scan_type: {
		id: number
		name: string
		description?: string
	}
	pricing_model: 'fixed' | 'starting_from' | 'quote_required'
	base_price: number | null
	price_details?: string
	is_available: boolean
}

const S3_BASE_URL =
	process.env.EXPO_PUBLIC_S3_BASE_URL ||
	process.env.REACT_APP_S3_BASE_URL ||
	'https://healthcare-s3-bucket.s3.amazonaws.com'

const buildS3Url = (key?: string | null): string | null => {
	if (!key) return null
	if (key.startsWith('http://') || key.startsWith('https://')) return key
	return `${S3_BASE_URL.replace(/\/$/, '')}/${key.replace(/^\//, '')}`
}

const formatScanPrice = (scan: RadiologyScanOption): string => {
	if (scan.pricing_model === 'quote_required' || scan.base_price === null) {
		return 'Quote on request'
	}
	const formatted = new Intl.NumberFormat('en-IN', {
		style: 'currency',
		currency: 'INR',
		maximumFractionDigits: 0,
	}).format(scan.base_price)
	return scan.pricing_model === 'starting_from' ? `From ${formatted}` : formatted
}

const TIME_SLOTS = [
	{ label: 'Morning', value: 'Morning' },
	{ label: 'Afternoon', value: 'Afternoon' },
	{ label: 'Evening', value: 'Evening' },
]

const isValidIsoDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value)

const apiToCalendarDate = (dateStr: string): string => {
	if (!dateStr) return ''
	const [year, month, day] = dateStr.split('-')
	return `${day}-${month}-${year}`
}

const calendarToApiDate = (dateStr: string): string => {
	if (!dateStr) return ''
	const [day, month, year] = dateStr.split('-')
	return `${year}-${month}-${day}`
}

const getErrorMessage = (err: any, fallback: string): string => {
	// Covers both raw fetch (RadiologyServiceError) and axios-style errors
	return err?.response?.data?.detail || err?.message || fallback
}

// ─────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────

export default function RadiologyBookingPage() {
	const navigation = useNavigation<any>()
	const route = useRoute<RouteProps>()
	const insets = useSafeAreaInsets()
	const { user, accessToken } = useAuth()

	const { radiologyId, centerName, centerAddress, centerCity, centerPhone } = route.params

	// STEP 1: Consultation / treatment — carries the referral prescription
	const [treatments, setTreatments] = useState<TreatmentRecord[]>([])
	const [selectedTreatmentId, setSelectedTreatmentId] = useState<string | null>(null)
	const [loadingTreatments, setLoadingTreatments] = useState(true)

	// STEP 2: Scans
	const [scans, setScans] = useState<RadiologyScanOption[]>([])
	const [selectedScanIds, setSelectedScanIds] = useState<number[]>([])
	const [loadingScans, setLoadingScans] = useState(true)

	// STEP 3: Schedule
	const [calendarDate, setCalendarDate] = useState('')
	const [bookingTime, setBookingTime] = useState('')
	const [notes, setNotes] = useState('')

	const [submitting, setSubmitting] = useState(false)
	const [isImageViewerOpen, setIsImageViewerOpen] = useState(false)

	const [statusModal, setStatusModal] = useState<{
		visible: boolean
		status: 'success' | 'error'
		title: string
		description: string
	} | null>(null)

	// ── Fetch consultations / treatments ──
	useEffect(() => {
		const fetchTreatments = async () => {
			if (!user?.id) {
				setLoadingTreatments(false)
				return
			}
			try {
				setLoadingTreatments(true)
				const data = await getPatientTreatmentHistory(user.id)
				setTreatments(data)
				if (data.length > 0) {
					setSelectedTreatmentId(data[0].id)
				}
			} catch (err: any) {
				const detail = getErrorMessage(err, 'Failed to load consultations')
				console.error('[RadiologyBookingPage] fetchTreatments error:', detail)
				Toast.show({ type: 'error', text1: 'Error', text2: detail })
			} finally {
				setLoadingTreatments(false)
			}
		}
		fetchTreatments()
	}, [user?.id])

	// ── Fetch scans available at this center ──
	useEffect(() => {
		const fetchScans = async () => {
			if (!radiologyId) {
				setLoadingScans(false)
				return
			}
			try {
				setLoadingScans(true)
				const data = await fetchRadiologyScans(radiologyId)
				setScans(data)
			} catch (err: any) {
				const detail = getErrorMessage(err, 'Failed to load available scans')
				console.error('[RadiologyBookingPage] fetchScans error:', detail)
				Toast.show({ type: 'error', text1: 'Error', text2: detail })
			} finally {
				setLoadingScans(false)
			}
		}
		fetchScans()
	}, [radiologyId, accessToken])

	const toggleScan = (scanId: number) => {
		setSelectedScanIds((prev) => (prev.includes(scanId) ? prev.filter((id) => id !== scanId) : [...prev, scanId]))
	}

	const selectedTreatment = treatments.find((t) => t.id === selectedTreatmentId)

	const treatmentOptions = treatments.map((t) => {
		const dateStr = new Date(t.created_at).toLocaleDateString('en-IN', {
			day: 'numeric',
			month: 'short',
			year: 'numeric',
		})
		const docStr = t.doctor_name ? ` - ${t.doctor_name}` : ''
		const hospStr = t.hospital_name ? ` (${t.hospital_name})` : ''
		return { label: `${dateStr}${docStr}${hospStr}`, value: t.id }
	})

	const selectedScans = scans.filter((s) => selectedScanIds.includes(s.id))
	const estimatedTotal = selectedScans.reduce((sum, s) => sum + (s.base_price ?? 0), 0)
	const hasQuoteRequired = selectedScans.some((s) => s.pricing_model === 'quote_required')

	// ── Submit ──
	const handlePlaceOrder = async () => {
		if (!selectedTreatmentId) {
			Toast.show({ type: 'error', text1: 'Required', text2: 'Please select a consultation with a diagnosis.' })
			return
		}
		if (selectedScanIds.length === 0) {
			Toast.show({ type: 'error', text1: 'Required', text2: 'Please select at least one scan.' })
			return
		}
		if (!calendarDate) {
			Toast.show({ type: 'error', text1: 'Required', text2: 'Please select a preferred booking date.' })
			return
		}
		const apiDate = calendarToApiDate(calendarDate)
		if (!isValidIsoDate(apiDate)) {
			Toast.show({ type: 'error', text1: 'Required', text2: 'Please select a valid booking date.' })
			return
		}
		if (!bookingTime) {
			Toast.show({ type: 'error', text1: 'Required', text2: 'Please select a preferred time slot.' })
			return
		}

		setSubmitting(true)
		try {
			const payload: RadiologyBookingPayload = {
				radiology_id: radiologyId,
				scan_ids: selectedScanIds,
				booking_date: apiDate,
				booking_time: bookingTime,
				treatment_id: selectedTreatmentId,
				external_prescription_s3_key: null,
				notes: notes.trim() || null,
			}

			await createRadiologyBooking(payload)

			setStatusModal({
				visible: true,
				status: 'success',
				title: 'Booking Confirmed!',
				description: `Your radiology scan booking has been successfully submitted to ${centerName || 'the center'}.`,
			})
		} catch (err: any) {
			const detail = getErrorMessage(err, 'An error occurred while booking the scan. Please try again.')
			console.error('[RadiologyBookingPage] handlePlaceOrder error:', detail)
			setStatusModal({
				visible: true,
				status: 'error',
				title: 'Booking Failed',
				description: detail,
			})
		} finally {
			setSubmitting(false)
		}
	}

	// ── Render ──
	return (
		<View style={styles.safe}>
			<ScrollView
				contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom + 100, 120) }]}
				showsVerticalScrollIndicator={false}
			>
				<ProviderDetailsCard
					name={centerName || 'Selected Radiology Center'}
					subtitle="Selected Radiology Center"
					icon="radiology-box-outline"
					address={centerAddress}
					city={centerCity}
					phone={centerPhone}
					accentColor="#1f5f68"
				/>

				{/* STEP 1: Select Consultation */}
				<View style={styles.sectionCard}>
					<View style={styles.sectionHeader}>
						<View style={styles.stepBadge}>
							<Text style={styles.stepText}>1</Text>
						</View>
						<AppTypography variant="h4" style={styles.sectionTitle}>
							Select Doctor Consultation
						</AppTypography>
					</View>

					{loadingTreatments ? (
						<View style={styles.spinnerContainer}>
							<ActivityIndicator size="small" color="#1f5f68" />
							<Text style={styles.loadingText}>Fetching consultations...</Text>
						</View>
					) : treatments.length === 0 ? (
						<View style={styles.emptyContainer}>
							<MaterialCommunityIcons name="note-text-outline" size={36} color="#90a4ae" />
							<AppTypography variant="body" style={styles.emptyMessage}>
								No consultation history found. A valid referral diagnosis is required to book a scan.
							</AppTypography>
						</View>
					) : (
						<View style={styles.dropdownContainer}>
							<AppSelect
								label="Select Consultation"
								placeholder="Choose consultation"
								options={treatmentOptions}
								value={selectedTreatmentId || undefined}
								onSelect={(val) => setSelectedTreatmentId(val)}
								size="form"
								noMargin
							/>

							{selectedTreatment && (
								<View style={styles.detailCard}>
									<View style={styles.detailRow}>
										<AppTypography variant="caption" style={styles.detailLabel}>
											Consultation Date:
										</AppTypography>
										<AppTypography variant="body" style={styles.detailValue}>
											{new Date(selectedTreatment.created_at).toLocaleDateString('en-IN', {
												weekday: 'long',
												day: 'numeric',
												month: 'long',
												year: 'numeric',
											})}
										</AppTypography>
									</View>

									{selectedTreatment.notes ? (
										<View style={styles.detailRow}>
											<AppTypography variant="caption" style={styles.detailLabel}>
												Diagnosis / Notes:
											</AppTypography>
											<AppTypography variant="body" style={styles.detailNotes}>
												{selectedTreatment.notes}
											</AppTypography>
										</View>
									) : null}

									{selectedTreatment.doctor_name ? (
										<View style={styles.detailRow}>
											<AppTypography variant="caption" style={styles.detailLabel}>
												Referring Doctor:
											</AppTypography>
											<AppTypography variant="body" style={styles.detailValue}>
												 {selectedTreatment.doctor_name}
											</AppTypography>
										</View>
									) : null}

									{selectedTreatment.prescription_s3_key ? (
										<View style={styles.detailRow}>
											<AppTypography variant="caption" style={styles.detailLabel}>
												Diagnosis Document (Tap to view full screen):
											</AppTypography>
											<TouchableOpacity
												style={styles.imageCard}
												onPress={() => setIsImageViewerOpen(true)}
												activeOpacity={0.9}
											>
												<Image
													source={{
														uri:
															buildS3Url(selectedTreatment.prescription_s3_key) ||
															undefined,
													}}
													style={styles.prescriptionImage}
													resizeMode="contain"
												/>
												<View style={styles.imageKeyInfo}>
													<MaterialCommunityIcons
														name="fullscreen"
														size={16}
														color="#1f5f68"
													/>
													<Text style={styles.imageKeyText} numberOfLines={1}>
														Tap to expand Diagnosis document
													</Text>
												</View>
											</TouchableOpacity>
										</View>
									) : null}
								</View>
							)}
						</View>
					)}
				</View>

				{/* STEP 2: Select Scans */}
				<View style={styles.sectionCard}>
					<View style={styles.sectionHeader}>
						<View style={styles.stepBadge}>
							<Text style={styles.stepText}>2</Text>
						</View>
						<AppTypography variant="h4" style={styles.sectionTitle}>
							Select Scans
						</AppTypography>
					</View>

					{loadingScans ? (
						<View style={styles.spinnerContainer}>
							<ActivityIndicator size="small" color="#1f5f68" />
							<Text style={styles.loadingText}>Loading available scans...</Text>
						</View>
					) : scans.length === 0 ? (
						<View style={styles.emptyContainer}>
							<MaterialCommunityIcons name="radiology-box-outline" size={36} color="#90a4ae" />
							<AppTypography variant="body" style={styles.emptyMessage}>
								No scans available at this center right now.
							</AppTypography>
						</View>
					) : (
						<View style={{ gap: 10 }}>
							{scans.map((scan) => {
								const checked = selectedScanIds.includes(scan.id)
								return (
									<TouchableOpacity
										key={scan.id}
										style={[styles.scanRow, checked && styles.scanRowActive]}
										onPress={() => toggleScan(scan.id)}
										activeOpacity={0.8}
									>
										<MaterialCommunityIcons
											name={checked ? 'checkbox-marked' : 'checkbox-blank-outline'}
											size={22}
											color={checked ? '#1f5f68' : '#98a2b3'}
										/>
										<View style={{ flex: 1 }}>
											<Text style={styles.scanName}>{scan.scan_type?.name}</Text>
											{scan.scan_type?.description ? (
												<Text style={styles.scanDescription}>{scan.scan_type.description}</Text>
											) : null}
										</View>
										<Text style={styles.scanPrice}>{formatScanPrice(scan)}</Text>
									</TouchableOpacity>
								)
							})}

							{selectedScans.length > 0 && (
								<View style={styles.totalRow}>
									<AppTypography variant="body" style={styles.totalLabel}>
										{hasQuoteRequired
											? 'Estimated Total (excl. quoted items):'
											: 'Estimated Total:'}
									</AppTypography>
									<AppTypography variant="h4" style={styles.totalValue}>
										₹{estimatedTotal.toLocaleString('en-IN')}
									</AppTypography>
								</View>
							)}
						</View>
					)}
				</View>

				{/* STEP 3: Schedule & Notes */}
				<View style={styles.sectionCard}>
					<View style={styles.sectionHeader}>
						<View style={styles.stepBadge}>
							<Text style={styles.stepText}>3</Text>
						</View>
						<AppTypography variant="h4" style={styles.sectionTitle}>
							Schedule & Notes
						</AppTypography>
					</View>

					<View style={styles.bookingFields}>
						<AppCalendar
							label="Preferred Date"
							value={calendarDate}
							onChange={setCalendarDate}
							placeholder="Select Date"
							required
							isMobile
							modalTitle="Select Appointment Date"
							minimumDate={new Date()}
						/>

						<AppSelect
							label="Preferred Time"
							placeholder="Choose a time slot"
							options={TIME_SLOTS}
							value={bookingTime || undefined}
							onSelect={(val) => setBookingTime(val)}
							size="form"
						/>

						<AppInput
							label="Additional Notes / Instructions"
							placeholder="Any special instructions or requirements"
							value={notes}
							onChangeText={setNotes}
							multiline
							numberOfLines={4}
							fieldSize="form"
							noMargin
							style={styles.remarksInput}
						/>
					</View>
				</View>
			</ScrollView>

			{/* Fixed Bottom Action Button */}
			<View style={[styles.bottomActionContainer, { paddingBottom: Math.max(insets.bottom + 12, 16) }]}>
				<AppButton
					variant="primary"
					onPress={handlePlaceOrder}
					loading={submitting}
					disabled={submitting || loadingScans || loadingTreatments}
					style={styles.submitBtn}
				>
					Confirm & Book Scan
				</AppButton>
			</View>

			{/* Image Viewer Lightbox Modal */}
			<Modal
				visible={isImageViewerOpen}
				transparent
				animationType="fade"
				onRequestClose={() => setIsImageViewerOpen(false)}
			>
				<View style={styles.viewerOverlay}>
					<TouchableOpacity
						style={styles.viewerBackdrop}
						onPress={() => setIsImageViewerOpen(false)}
						activeOpacity={1}
					/>
					<TouchableOpacity
						style={[styles.viewerCloseBtn, { top: Math.max(insets.top, 24) }]}
						onPress={() => setIsImageViewerOpen(false)}
						activeOpacity={0.8}
					>
						<MaterialCommunityIcons name="close" size={24} color="#fff" />
					</TouchableOpacity>

					{selectedTreatment?.prescription_s3_key && (
						<Image
							source={{ uri: buildS3Url(selectedTreatment.prescription_s3_key) || undefined }}
							style={styles.fullScreenImage}
							resizeMode="contain"
						/>
					)}
				</View>
			</Modal>

			{/* Status Feedback Modal */}
			{statusModal && (
				<StatusModal
					visible={statusModal.visible}
					status={statusModal.status}
					title={statusModal.title}
					description={statusModal.description}
					submitText="Okay"
					onSubmit={() => {
						setStatusModal(null)
						if (statusModal.status === 'success') {
							navigation.navigate(ROUTES.MAIN.TABS, { screen: ROUTES.MAIN.HOME })
						}
					}}
					onCancel={() => setStatusModal(null)}
				/>
			)}
		</View>
	)
}

// ─────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────

const styles = StyleSheet.create({
	safe: { flex: 1, backgroundColor: '#F5F7FA' },
	scrollContent: { paddingHorizontal: 16, paddingTop: 16 },
	centerBanner: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#E8F5F5',
		borderRadius: 12,
		borderWidth: 1,
		borderColor: '#c6e0e0',
		padding: 16,
		marginBottom: 16,
		gap: 12,
	},
	centerDetails: { flex: 1 },
	centerLabel: { fontSize: 12, color: '#1f5f68', fontWeight: '600', marginBottom: 2 },
	centerTitle: { fontSize: 18, fontWeight: '700', color: '#101828' },
	centerAddress: { fontSize: 12, color: '#667085', marginTop: 2 },
	sectionCard: {
		backgroundColor: '#fff',
		borderRadius: 16,
		borderWidth: 1,
		borderColor: '#EAECF0',
		padding: 16,
		marginBottom: 16,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.04,
		shadowRadius: 8,
		elevation: 1,
	},
	sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 10 },
	stepBadge: {
		width: 24,
		height: 24,
		borderRadius: 12,
		backgroundColor: '#1f5f68',
		alignItems: 'center',
		justifyContent: 'center',
	},
	stepText: { color: '#fff', fontSize: 12, fontWeight: '700' },
	sectionTitle: { fontSize: 16, fontWeight: '700', color: '#101828' },
	spinnerContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 24, gap: 10 },
	loadingText: { fontSize: 13, color: '#667085' },
	emptyContainer: {
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 24,
		paddingHorizontal: 16,
		gap: 10,
	},
	emptyMessage: { fontSize: 13, color: '#667085', textAlign: 'center', lineHeight: 18 },
	dropdownContainer: { marginTop: 4 },
	detailCard: {
		marginTop: 14,
		backgroundColor: '#F8F9FA',
		borderRadius: 12,
		borderWidth: 1,
		borderColor: '#EAECEF',
		padding: 14,
	},
	detailRow: { paddingBottom: 10, marginBottom: 10, borderBottomWidth: 1, borderBottomColor: '#EAECEF' },
	detailLabel: { fontSize: 12, color: '#667085', fontWeight: '500', marginBottom: 3 },
	detailValue: { fontSize: 14, color: '#101828', fontWeight: '600' },
	detailNotes: { fontSize: 14, color: '#475467', lineHeight: 20 },
	imageCard: {
		backgroundColor: '#fff',
		borderRadius: 10,
		borderWidth: 1,
		borderColor: '#EAECF0',
		padding: 8,
		marginTop: 4,
	},
	prescriptionImage: { width: '100%', height: 200, backgroundColor: '#f2f4f7', borderRadius: 8, marginTop: 4 },
	imageKeyInfo: {
		flexDirection: 'row',
		alignItems: 'center',
		marginTop: 6,
		gap: 4,
		backgroundColor: '#F8F9FA',
		padding: 6,
		borderRadius: 6,
	},
	imageKeyText: { fontSize: 11, color: '#475467', flex: 1 },
	scanRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
		backgroundColor: '#F8F9FA',
		borderRadius: 12,
		borderWidth: 1,
		borderColor: '#EAECEF',
		padding: 12,
	},
	scanRowActive: { backgroundColor: '#E8F5F5', borderColor: '#1f5f68' },
	scanName: { fontSize: 14, fontWeight: '700', color: '#101828' },
	scanDescription: { fontSize: 12, color: '#667085', marginTop: 2 },
	scanPrice: { fontSize: 13, fontWeight: '700', color: '#1f5f68' },
	totalRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginTop: 4,
		paddingTop: 12,
		borderTopWidth: 1,
		borderTopColor: '#EAECF0',
	},
	totalLabel: { fontSize: 13, color: '#475467' },
	totalValue: { fontSize: 18, fontWeight: '700', color: '#1f5f68' },
	bookingFields: { gap: 12 },
	remarksInput: { fontSize: 13, textAlignVertical: 'top', minHeight: 100 },
	submitBtn: { width: '100%' },
	bottomActionContainer: {
		position: 'absolute',
		bottom: 0,
		left: 0,
		right: 0,
		backgroundColor: '#ffffff',
		borderTopWidth: 1,
		borderTopColor: '#EAECF0',
		paddingHorizontal: 16,
		paddingTop: 12,
		shadowColor: '#101828',
		shadowOffset: { width: 0, height: -4 },
		shadowOpacity: 0.05,
		shadowRadius: 8,
		elevation: 8,
	},
	viewerOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.95)', justifyContent: 'center', alignItems: 'center' },
	viewerBackdrop: { ...StyleSheet.absoluteFillObject },
	viewerCloseBtn: {
		position: 'absolute',
		right: 24,
		backgroundColor: 'rgba(255, 255, 255, 0.25)',
		width: 40,
		height: 40,
		borderRadius: 20,
		alignItems: 'center',
		justifyContent: 'center',
		zIndex: 10,
	},
	fullScreenImage: { width: '90%', height: '80%' },
})
