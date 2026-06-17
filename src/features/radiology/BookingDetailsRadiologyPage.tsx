// src/features/radiology/BookingDetailsRadiologyPage.tsx
import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import {
	ScrollView,
	StyleSheet,
	Text,
	View,
	TouchableOpacity,
	Alert,
	RefreshControl,
	TextInput,
	Image,
	FlatList,
	Modal,
	StatusBar,
	SafeAreaView,
	useWindowDimensions,
	Linking,
} from 'react-native'
import { useNavigation, useRoute } from '@react-navigation/native'
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'
import Toast from 'react-native-toast-message'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { AppSkeleton, AppSelect, StatusModal } from '../../components/common'
import { fetchRadiologyBookingDetail, updateRadiologyBookingStatus, type RadiologyBooking } from './RadiologyService'
import { useAuth } from '../../context/AuthContext'

// ─────────────────────────────────────────────
// Types & Helpers
// ─────────────────────────────────────────────

type RouteParams = {
	publicId: string
	booking?: RadiologyBooking
}

const normalizeStatus = (status: string): string => {
	switch (status?.toLowerCase()) {
		case 'pending_quote':
			return 'Pending Quote'
		case 'pending_payment':
			return 'Pending Payment'
		case 'confirmed':
			return 'Confirmed'
		case 'completed':
			return 'Completed'
		case 'cancelled':
		case 'rejected':
			return 'Cancelled'
		default:
			return status || 'Unknown'
	}
}

const STATUS_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
	'Pending Quote': { bg: '#FFF1D9', text: '#F0A018', dot: '#F0A018' },
	'Pending Payment': { bg: '#FDE7D8', text: '#D9711B', dot: '#D9711B' },
	Confirmed: { bg: '#DEE9FF', text: '#3F7EE8', dot: '#3F7EE8' },
	Completed: { bg: '#DFF5E4', text: '#43A047', dot: '#43A047' },
	Cancelled: { bg: '#FFE3E7', text: '#E74B5B', dot: '#E74B5B' },
}

const formatDisplayDate = (isoDate: string) =>
	new Date(isoDate).toLocaleDateString('en-IN', {
		day: '2-digit',
		month: 'short',
		year: 'numeric',
	})

const formatDisplayTime = (time: string) => {
	if (!time) return ''
	const parts = time.split(':')
	const hours = parseInt(parts[0], 10)
	const minutes = parts[1] || '00'
	const ampm = hours >= 12 ? 'PM' : 'AM'
	const h12 = hours % 12 || 12
	return `${h12}:${minutes} ${ampm}`
}

const formatDateTime = (date: string, time: string) => `${formatDisplayDate(date)} • ${formatDisplayTime(time)}`

// ─── S3 URL builder ──────────────────────────────────────────────────────────
const S3_BASE_URL = process.env.REACT_APP_S3_BASE_URL || ''
const buildS3Url = (key?: string | null): string | null => (key ? `${S3_BASE_URL}/${key}` : null)

// ─── Full‑screen image viewer ────────────────────────────────────────────────
const ImageViewerModal = ({
	visible,
	images,
	initialIndex,
	onClose,
}: {
	visible: boolean
	images: string[]
	initialIndex: number
	onClose: () => void
}) => {
	const { width: screenWidth, height: screenHeight } = useWindowDimensions()
	const flatListRef = useRef<FlatList>(null)
	const [activeIndex, setActiveIndex] = useState(initialIndex)

	useEffect(() => {
		if (visible) {
			setActiveIndex(initialIndex)
			setTimeout(() => {
				flatListRef.current?.scrollToIndex({ index: initialIndex, animated: false })
			}, 50)
		}
	}, [visible, initialIndex])

	const goTo = (index: number) => {
		const clamped = Math.max(0, Math.min(index, images.length - 1))
		flatListRef.current?.scrollToIndex({ index: clamped, animated: true })
		setActiveIndex(clamped)
	}

	return (
		<Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
			<StatusBar backgroundColor="rgba(0,0,0,0.95)" barStyle="light-content" />
			<View style={viewerStyles.overlay}>
				<SafeAreaView style={viewerStyles.header}>
					<Text style={viewerStyles.headerTitle}>
						Document {images.length > 1 ? `${activeIndex + 1} / ${images.length}` : ''}
					</Text>
					<TouchableOpacity
						style={viewerStyles.closeBtn}
						onPress={onClose}
						hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
					>
						<MaterialCommunityIcons name="close" size={24} color="#fff" />
					</TouchableOpacity>
				</SafeAreaView>

				<FlatList
					ref={flatListRef}
					data={images}
					horizontal
					pagingEnabled
					showsHorizontalScrollIndicator={false}
					keyExtractor={(_, i) => String(i)}
					onMomentumScrollEnd={(e) => {
						const idx = Math.round(e.nativeEvent.contentOffset.x / screenWidth)
						setActiveIndex(idx)
					}}
					getItemLayout={(_, index) => ({ length: screenWidth, offset: screenWidth * index, index })}
					renderItem={({ item }) => (
						<View
							style={{
								width: screenWidth,
								height: screenHeight - 120,
								justifyContent: 'center',
								alignItems: 'center',
							}}
						>
							<Image
								source={{ uri: item }}
								style={{ width: screenWidth, height: screenHeight - 120 }}
								resizeMode="contain"
							/>
						</View>
					)}
				/>

				{images.length > 1 && (
					<>
						<TouchableOpacity
							style={[viewerStyles.arrow, viewerStyles.arrowLeft]}
							onPress={() => goTo(activeIndex - 1)}
							disabled={activeIndex === 0}
						>
							<MaterialCommunityIcons name="chevron-left" size={28} color="#fff" />
						</TouchableOpacity>
						<TouchableOpacity
							style={[viewerStyles.arrow, viewerStyles.arrowRight]}
							onPress={() => goTo(activeIndex + 1)}
							disabled={activeIndex === images.length - 1}
						>
							<MaterialCommunityIcons name="chevron-right" size={28} color="#fff" />
						</TouchableOpacity>

						<View style={viewerStyles.dotRow}>
							{images.map((_, i) => (
								<View key={i} style={[viewerStyles.dot, i === activeIndex && viewerStyles.dotActive]} />
							))}
						</View>
					</>
				)}
			</View>
		</Modal>
	)
}

const viewerStyles = StyleSheet.create({
	overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)' },
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 16,
		paddingVertical: 12,
	},
	headerTitle: { color: '#fff', fontSize: 15, fontWeight: '600' },
	closeBtn: {
		width: 36,
		height: 36,
		borderRadius: 18,
		backgroundColor: 'rgba(255,255,255,0.15)',
		alignItems: 'center',
		justifyContent: 'center',
	},
	arrow: {
		position: 'absolute',
		top: '50%',
		marginTop: -24,
		backgroundColor: 'rgba(255,255,255,0.15)',
		borderRadius: 24,
		width: 48,
		height: 48,
		alignItems: 'center',
		justifyContent: 'center',
	},
	arrowLeft: { left: 12 },
	arrowRight: { right: 12 },
	dotRow: {
		position: 'absolute',
		bottom: 32,
		left: 0,
		right: 0,
		flexDirection: 'row',
		justifyContent: 'center',
		gap: 6,
	},
	dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.4)' },
	dotActive: { backgroundColor: '#fff', width: 18 },
})

// ─── Document carousel ────────────────────────────────────────────────────────
const DocumentCarousel = ({
	documents,
	onImagePress,
}: {
	documents: string[]
	onImagePress: (index: number) => void
}) => {
	const { width: screenWidth } = useWindowDimensions()
	const flatListRef = useRef<FlatList>(null)
	const [activeIndex, setActiveIndex] = useState(0)
	const imageWidth = screenWidth - 64

	useEffect(() => {
		flatListRef.current?.scrollToIndex({ index: 0, animated: false })
		setActiveIndex(0)
	}, [screenWidth])

	const goTo = (index: number) => {
		const clamped = Math.max(0, Math.min(index, documents.length - 1))
		flatListRef.current?.scrollToIndex({ index: clamped, animated: true })
		setActiveIndex(clamped)
	}

	if (!documents.length) {
		return (
			<View style={carouselStyles.empty}>
				<MaterialCommunityIcons name="file-image-outline" size={48} color="#CBD5E1" />
				<Text style={carouselStyles.emptyText}>No documents uploaded</Text>
			</View>
		)
	}

	return (
		<View style={carouselStyles.container}>
			<FlatList
				ref={flatListRef}
				data={documents}
				horizontal
				pagingEnabled
				showsHorizontalScrollIndicator={false}
				onMomentumScrollEnd={(e) => {
					const idx = Math.round(e.nativeEvent.contentOffset.x / imageWidth)
					setActiveIndex(idx)
				}}
				keyExtractor={(_, i) => String(i)}
				getItemLayout={(_, index) => ({ length: imageWidth, offset: imageWidth * index, index })}
				renderItem={({ item, index }) => (
					<TouchableOpacity
						activeOpacity={0.9}
						onPress={() => onImagePress(index)}
						style={{ width: imageWidth }}
					>
						<Image source={{ uri: item }} style={{ width: imageWidth, height: 220 }} resizeMode="contain" />
						<View style={carouselStyles.imageKeyInfo}>
							<MaterialCommunityIcons name="fullscreen" size={16} color="#1f5f68" />
							<Text style={carouselStyles.imageKeyText}>Tap to expand document</Text>
						</View>
					</TouchableOpacity>
				)}
			/>

			{documents.length > 1 && (
				<>
					<TouchableOpacity
						style={[carouselStyles.arrow, carouselStyles.arrowLeft]}
						onPress={() => goTo(activeIndex - 1)}
					>
						<MaterialCommunityIcons name="chevron-left" size={22} color="#1A2C33" />
					</TouchableOpacity>
					<TouchableOpacity
						style={[carouselStyles.arrow, carouselStyles.arrowRight]}
						onPress={() => goTo(activeIndex + 1)}
					>
						<MaterialCommunityIcons name="chevron-right" size={22} color="#1A2C33" />
					</TouchableOpacity>
					<View style={carouselStyles.dotRow}>
						{documents.map((_, i) => (
							<View key={i} style={[carouselStyles.dot, i === activeIndex && carouselStyles.dotActive]} />
						))}
					</View>
					<View style={carouselStyles.counter}>
						<Text style={carouselStyles.counterText}>
							{activeIndex + 1} / {documents.length}
						</Text>
					</View>
				</>
			)}
		</View>
	)
}

const carouselStyles = StyleSheet.create({
	container: {
		position: 'relative',
		backgroundColor: '#F8FCFC',
		borderRadius: 12,
		borderWidth: 1,
		borderColor: '#E2E8F0',
		overflow: 'hidden',
		height: 260,
	},
	empty: {
		height: 200,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#F8FAFC',
		borderRadius: 12,
		borderWidth: 1,
		borderColor: '#E2E8F0',
		gap: 8,
	},
	emptyText: { fontSize: 13, color: '#94A3B8' },
	arrow: {
		position: 'absolute',
		top: '50%',
		marginTop: -18,
		backgroundColor: 'rgba(255,255,255,0.95)',
		borderRadius: 20,
		width: 36,
		height: 36,
		alignItems: 'center',
		justifyContent: 'center',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 4,
		elevation: 3,
		zIndex: 2,
	},
	arrowLeft: { left: 8 },
	arrowRight: { right: 8 },
	dotRow: {
		position: 'absolute',
		bottom: 8,
		alignSelf: 'center',
		flexDirection: 'row',
		gap: 5,
		left: 0,
		right: 0,
		justifyContent: 'center',
	},
	dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#CBD5E1' },
	dotActive: { backgroundColor: '#2E7C86', width: 18, borderRadius: 3 },
	counter: {
		position: 'absolute',
		bottom: 8,
		right: 12,
		backgroundColor: 'rgba(255,255,255,0.9)',
		borderRadius: 10,
		paddingHorizontal: 8,
		paddingVertical: 2,
	},
	counterText: { fontSize: 11, fontWeight: '700', color: '#2E7C86' },
	imageKeyInfo: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 10,
		gap: 6,
	},
	imageKeyText: { fontSize: 13, color: '#1f5f68', fontWeight: '500' },
})

// ─── Section Card ─────────────────────────────────────────────────────────────
const SectionCard = ({ title, children }: { title: string; children: React.ReactNode }) => (
	<View style={styles.card}>
		<Text style={styles.cardTitle}>{title}</Text>
		{children}
	</View>
)

// ─── Main Component ──────────────────────────────────────────────────────────
export default function RadiologyBookingDetailsPage() {
	const navigation = useNavigation<any>()
	const route = useRoute()
	const insets = useSafeAreaInsets()
	const { accessToken, role } = useAuth()

	const params = route.params as RouteParams | undefined
	const publicId = params?.publicId
	const initialBooking = params?.booking

	const [booking, setBooking] = useState<RadiologyBooking | null>(initialBooking || null)
	const [loading, setLoading] = useState(!initialBooking)
	const [refreshing, setRefreshing] = useState(false)

	// ── UI state ──
	const [finalFee, setFinalFee] = useState('0.00')
	const [selectedAction, setSelectedAction] = useState<string>('')
	const [updating, setUpdating] = useState(false)
	const [statusModal, setStatusModal] = useState<{
		visible: boolean
		status: 'success' | 'error'
		title: string
		description: string
	} | null>(null)

	// ── Document viewer state ──
	const [viewerVisible, setViewerVisible] = useState(false)
	const [viewerIndex, setViewerIndex] = useState(0)

	// ── Uploaded documents (from booking.external_prescription_s3_key) ──
	const docUrls = useMemo(() => {
		const urls: string[] = []
		const key = booking?.external_prescription_s3_key
		if (key) {
			const url = buildS3Url(key)
			if (url) urls.push(url)
		}
		return urls
	}, [booking])

	// ── Fetch booking ──
	const fetchBooking = useCallback(
		async (isRefresh = false) => {
			if (!publicId) {
				Toast.show({ type: 'error', text1: 'Error', text2: 'No booking ID provided' })
				return
			}
			try {
				isRefresh ? setRefreshing(true) : setLoading(true)
				const data = await fetchRadiologyBookingDetail(accessToken, publicId)
				setBooking(data)
				if (data?.total_price != null) {
					setFinalFee(data.total_price.toFixed(2))
				}
			} catch (error: any) {
				console.error('[RadiologyBookingDetails] fetch error:', error)
				Toast.show({
					type: 'error',
					text1: 'Error',
					text2: error?.message || 'Failed to load booking details',
				})
			} finally {
				isRefresh ? setRefreshing(false) : setLoading(false)
			}
		},
		[accessToken, publicId]
	)

	useEffect(() => {
		if (!initialBooking && publicId) {
			fetchBooking()
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [publicId])

	useEffect(() => {
		navigation.setOptions({
			title: 'Booking Details',
			headerBackTitle: 'Back',
		})
	}, [navigation])

	// ── Helpers for calling ──
	const handleCall = (phone: string, label: string) => {
		const cleaned = phone.replace(/\s/g, '')
		if (!cleaned || cleaned === '—') {
			setStatusModal({
				visible: true,
				status: 'error',
				title: 'Unavailable',
				description: `No phone number on file for ${label}.`,
			})
			return
		}
		Linking.openURL(`tel:${cleaned}`).catch(() =>
			setStatusModal({
				visible: true,
				status: 'error',
				title: 'Error',
				description: 'Unable to open phone dialer.',
			})
		)
	}

	// ── Action: Verify Radiology Report ──
	const handleVerifyReport = async () => {
		if (!booking) return
		setUpdating(true)
		try {
			await updateRadiologyBookingStatus(accessToken, booking.public_id, {
				status: 'confirmed',
				total_price: parseFloat(finalFee) || 0,
			})
			setStatusModal({
				visible: true,
				status: 'success',
				title: 'Report Verified',
				description: 'Radiology report has been verified and confirmed.',
			})
			await fetchBooking()
		} catch (error: any) {
			setStatusModal({
				visible: true,
				status: 'error',
				title: 'Error',
				description: error?.message || 'Failed to verify report.',
			})
		} finally {
			setUpdating(false)
		}
	}

	const handleConfirmBill = async () => {
		if (!booking) return
		const fee = parseFloat(finalFee)
		if (isNaN(fee) || fee < 0) {
			setStatusModal({
				visible: true,
				status: 'error',
				title: 'Invalid Amount',
				description: 'Please enter a valid non‑negative amount.',
			})
			return
		}
		setUpdating(true)
		try {
			await updateRadiologyBookingStatus(accessToken, booking.public_id, {
				total_price: fee,
			})
			setStatusModal({
				visible: true,
				status: 'success',
				title: 'Bill Saved',
				description: `Final radiology fee set to ₹${fee.toFixed(2)}`,
			})
			await fetchBooking()
		} catch (error: any) {
			setStatusModal({
				visible: true,
				status: 'error',
				title: 'Error',
				description: error?.message || 'Failed to save bill.',
			})
		} finally {
			setUpdating(false)
		}
	}

	// ── Upload handler ──
	const handleUpload = () => {
		Alert.alert(
			'Upload Medical Report',
			'This would open a file picker. After selecting, upload to S3 and update the booking.',
			[{ text: 'OK' }]
		)
	}

	// ── Loading ──
	if (loading) {
		return (
			<View style={[styles.container, { paddingTop: insets.top }]}>
				<ScrollView contentContainerStyle={styles.scrollContent}>
					<AppSkeleton width="100%" height={180} borderRadius={16} style={{ marginBottom: 16 }} />
					<AppSkeleton width="100%" height={120} borderRadius={16} style={{ marginBottom: 16 }} />
					<AppSkeleton width="100%" height={100} borderRadius={16} style={{ marginBottom: 16 }} />
				</ScrollView>
			</View>
		)
	}

	if (!booking) {
		return (
			<View style={[styles.container, styles.centerContent]}>
				<MaterialCommunityIcons name="alert-circle-outline" size={48} color="#b0bec5" />
				<Text style={styles.errorTitle}>Booking not found</Text>
				<TouchableOpacity onPress={() => navigation.goBack()} style={styles.goBackButton}>
					<Text style={styles.goBackText}>Go Back</Text>
				</TouchableOpacity>
			</View>
		)
	}

	// ── Derived data ──
	const statusDisplay = normalizeStatus(booking.status)
	const statusStyle = STATUS_STYLES[statusDisplay] || { bg: '#f0f0f0', text: '#555', dot: '#999' }

	// Placeholder patient details – replace with real data from patient profile
	const patientName = booking.patient_name || 'N/A'
	const patientAge = '45'
	const patientGender = 'Male'
	const patientId = booking.public_id ? `#${booking.public_id.slice(0, 8).toUpperCase()}` : 'N/A'

	// Billing status – can be derived from booking status or a dedicated field
	const billingStatus = statusDisplay === 'Confirmed' || statusDisplay === 'Completed' ? 'Billed' : 'Pending Review'

	// ── Role‑based view ──
	const isPatient = role === 'patient'

	if (isPatient) {
		// Patient view – no edit actions
		return (
			<View style={[styles.container, { paddingTop: insets.top }]}>
				<ScrollView
					contentContainerStyle={styles.scrollContent}
					showsVerticalScrollIndicator={false}
					refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchBooking(true)} />}
				>
					{/* Header with patient info */}
					<View style={styles.headerCard}>
						<View style={styles.patientHeaderRow}>
							<View style={styles.patientInfo}>
								<Text style={styles.patientNameText}>{patientName}</Text>
								<Text style={styles.patientMeta}>
									Age: {patientAge} • {patientGender} • ID: {patientId}
								</Text>
							</View>
							<View style={styles.actionButtonsRow}>
								<TouchableOpacity
									style={[styles.callBtn, { backgroundColor: '#2E7C86' }]}
									onPress={() => handleCall(booking.patient_phone || '', 'patient')}
								>
									<MaterialCommunityIcons name="phone" size={14} color="#fff" />
									<Text style={styles.callBtnText}>Call Patient</Text>
								</TouchableOpacity>
								<TouchableOpacity
									style={[styles.callBtn, { backgroundColor: '#5C6BC0' }]}
									onPress={() => handleCall(booking.doctor_phone || '', 'clinic')}
								>
									<MaterialCommunityIcons name="phone" size={14} color="#fff" />
									<Text style={styles.callBtnText}>Call Clinic</Text>
								</TouchableOpacity>
							</View>
						</View>
					</View>

					{/* Billing Status */}
					<SectionCard title="Billing Status">
						<View style={styles.billingStatusRow}>
							<View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
								<Text style={[styles.statusText, { color: statusStyle.text }]}>{billingStatus}</Text>
							</View>
							<TouchableOpacity
								style={[styles.actionSelectBtn, { backgroundColor: '#1f5f68' }]}
								onPress={() => Alert.alert('Action', 'Select Action: Verify Radiology Report')}
							>
								<Text style={styles.actionSelectText}>Select Action</Text>
								<MaterialCommunityIcons name="chevron-down" size={18} color="#fff" />
							</TouchableOpacity>
						</View>

						{/* Final Radiology Fee */}
						<View style={styles.feeRow}>
							<Text style={styles.feeLabel}>Final Radiology Fee</Text>
							<Text style={styles.feeValue}>₹ {finalFee}</Text>
						</View>
						<TouchableOpacity
							style={styles.confirmBillBtn}
							onPress={() => Alert.alert('Confirm Bill', 'Bill would be confirmed.')}
						>
							<Text style={styles.confirmBillText}>Confirm & Save Bill</Text>
						</TouchableOpacity>
					</SectionCard>

					{/* Document Control */}
					<SectionCard title="Document Control">
						<TouchableOpacity style={styles.uploadBtn} onPress={handleUpload}>
							<MaterialCommunityIcons name="cloud-upload" size={20} color="#1f5f68" />
							<Text style={styles.uploadBtnText}>Upload Medical Report</Text>
							<Text style={styles.uploadSubText}>PDF, JPG, PNG (Max 10MB)</Text>
						</TouchableOpacity>

						<View style={styles.digitalPrescriptionRow}>
							<Text style={styles.digitalLabel}>Digital Prescription & Records</Text>
							<TouchableOpacity>
								<Text style={styles.viewAllText}>View All</Text>
							</TouchableOpacity>
						</View>

						{/* File list */}
						{docUrls.length > 0 ? (
							<View style={styles.fileList}>
								{docUrls.map((url, idx) => (
									<View key={idx} style={styles.fileItem}>
										<MaterialCommunityIcons name="file-pdf-box" size={20} color="#E74B5B" />
										<Text style={styles.fileName}>CT_Scan_Report.pdf</Text>
										<Text style={styles.fileDate}>Uploaded 24 Oct, 2023</Text>
									</View>
								))}
							</View>
						) : (
							<Text style={styles.noDocsText}>No uploaded documents</Text>
						)}
					</SectionCard>

					{/* Booking details (read‑only) */}
					<SectionCard title="Booking Details">
						<InfoRow label="Radiology Center" value={booking.radiology_name || 'N/A'} />
						<InfoRow
							label="Booking Date"
							value={formatDateTime(booking.booking_date, booking.booking_time)}
						/>
						<InfoRow label="Status" value={statusDisplay} />
						<InfoRow label="Payment Status" value={booking.payment_status || 'N/A'} />
						<InfoRow
							label="Total Amount"
							value={booking.total_price != null ? `₹${booking.total_price.toFixed(2)}` : 'Not quoted'}
						/>
					</SectionCard>
				</ScrollView>
			</View>
		)
	}

	// ─── STAFF / ADMIN VIEW ──────────────────────────────────────────────────────
	return (
		<View style={[styles.container, { paddingTop: insets.top }]}>
			<ScrollView
				contentContainerStyle={styles.scrollContent}
				showsVerticalScrollIndicator={false}
				refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchBooking(true)} />}
			>
				{/* Header with patient info */}
				<View style={styles.headerCard}>
					<View style={styles.patientHeaderRow}>
						<View style={styles.patientInfo}>
							<Text style={styles.patientNameText}>{patientName}</Text>
							<Text style={styles.patientMeta}>
								Age: {patientAge} • {patientGender} • ID: {patientId}
							</Text>
						</View>
						<View style={styles.actionButtonsRow}>
							<TouchableOpacity
								style={[styles.callBtn, { backgroundColor: '#2E7C86' }]}
								onPress={() => handleCall(booking.patient_phone || '', 'patient')}
							>
								<MaterialCommunityIcons name="phone" size={14} color="#fff" />
								<Text style={styles.callBtnText}>Call Patient</Text>
							</TouchableOpacity>
							<TouchableOpacity
								style={[styles.callBtn, { backgroundColor: '#5C6BC0' }]}
								onPress={() => handleCall(booking.radiology_phone || '', 'clinic')}
							>
								<MaterialCommunityIcons name="phone" size={14} color="#fff" />
								<Text style={styles.callBtnText}>Call Clinic</Text>
							</TouchableOpacity>
						</View>
					</View>
				</View>

				{/* Billing Status with actions */}
				<SectionCard title="Billing Status">
					<View style={styles.billingStatusRow}>
						<View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
							<Text style={[styles.statusText, { color: statusStyle.text }]}>{billingStatus}</Text>
						</View>
						<View style={styles.selectActionWrapper}>
							<AppSelect
								placeholder="Select Action"
								options={[{ label: 'Verify Radiology Report', value: 'verify' }]}
								value={selectedAction}
								onSelect={(val) => {
									setSelectedAction(val)
									if (val === 'verify') handleVerifyReport()
								}}
								size="form"
								noMargin
								customCardStyle={{ minWidth: 180, borderColor: '#CBD5E1' }}
							/>
						</View>
					</View>

					{/* Final Radiology Fee */}
					<View style={styles.feeRow}>
						<Text style={styles.feeLabel}>Final Radiology Fee</Text>
						<View style={styles.feeInputWrapper}>
							<Text style={styles.feeCurrency}>₹</Text>
							<TextInput
								style={styles.feeInput}
								keyboardType="numeric"
								value={finalFee}
								onChangeText={setFinalFee}
								placeholder="0.00"
								placeholderTextColor="#94A3B8"
							/>
						</View>
						<TouchableOpacity
							style={[styles.confirmBillBtn, updating && { opacity: 0.7 }]}
							onPress={handleConfirmBill}
							disabled={updating}
						>
							<Text style={styles.confirmBillText}>Confirm & Save Bill</Text>
						</TouchableOpacity>
					</View>
				</SectionCard>

				{/* Document Control */}
				<SectionCard title="Document Control">
					<TouchableOpacity style={styles.uploadBtn} onPress={handleUpload}>
						<MaterialCommunityIcons name="cloud-upload" size={20} color="#1f5f68" />
						<Text style={styles.uploadBtnText}>Upload Medical Report</Text>
						<Text style={styles.uploadSubText}>PDF, JPG, PNG (Max 10MB)</Text>
					</TouchableOpacity>

					<View style={styles.digitalPrescriptionRow}>
						<Text style={styles.digitalLabel}>Digital Prescription & Records</Text>
						<TouchableOpacity>
							<Text style={styles.viewAllText}>View All</Text>
						</TouchableOpacity>
					</View>

					{/* File list with carousel */}
					<DocumentCarousel
						documents={docUrls}
						onImagePress={(idx) => {
							setViewerIndex(idx)
							setViewerVisible(true)
						}}
					/>
				</SectionCard>

				{/* Booking details */}
				<SectionCard title="Booking Details">
					<InfoRow label="Radiology Center" value={booking.radiology_name || 'N/A'} />
					<InfoRow label="Booking Date" value={formatDateTime(booking.booking_date, booking.booking_time)} />
					<InfoRow label="Status" value={statusDisplay} />
					<InfoRow label="Payment Status" value={booking.payment_status || 'N/A'} />
					<InfoRow
						label="Total Amount"
						value={booking.total_price != null ? `₹${booking.total_price.toFixed(2)}` : 'Not quoted'}
					/>
					{booking.notes && <InfoRow label="Notes" value={booking.notes} />}
				</SectionCard>

				{/* Prescription Verification */}
				<SectionCard title="Prescription">
					<View style={styles.verificationRow}>
						<MaterialCommunityIcons
							name={booking.prescription_verified ? 'check-circle' : 'clock-alert'}
							size={20}
							color={booking.prescription_verified ? '#43A047' : '#D9711B'}
						/>
						<Text style={styles.verificationText}>
							{booking.prescription_verified ? 'Verified' : 'Pending Verification'}
						</Text>
					</View>
				</SectionCard>
			</ScrollView>

			{/* Full‑screen viewer */}
			<ImageViewerModal
				visible={viewerVisible}
				images={docUrls}
				initialIndex={viewerIndex}
				onClose={() => setViewerVisible(false)}
			/>

			{/* Status Modal */}
			{statusModal && (
				<StatusModal
					visible={statusModal.visible}
					status={statusModal.status}
					title={statusModal.title}
					description={statusModal.description}
					submitText="Okay"
					onSubmit={() => setStatusModal(null)}
					onCancel={() => setStatusModal(null)}
				/>
			)}
		</View>
	)
}

// ─── InfoRow helper ──────────────────────────────────────────────────────────
const InfoRow = ({ label, value }: { label: string; value: string | React.ReactNode }) => (
	<View style={styles.infoRow}>
		<Text style={styles.infoLabel}>{label}</Text>
		{typeof value === 'string' ? <Text style={styles.infoValue}>{value}</Text> : value}
	</View>
)

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: '#f4f6f8' },
	centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
	scrollContent: { paddingHorizontal: 16, paddingBottom: 40 },
	headerCard: {
		backgroundColor: '#ffffff',
		borderRadius: 16,
		padding: 16,
		marginBottom: 16,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.04,
		shadowRadius: 8,
		elevation: 2,
	},
	patientHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' },
	patientInfo: { flex: 1, marginRight: 8 },
	patientNameText: { fontSize: 16, fontWeight: '700', color: '#1A2C33' },
	patientMeta: { fontSize: 12, color: '#64707d', marginTop: 2 },
	actionButtonsRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
	callBtn: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
		paddingHorizontal: 10,
		paddingVertical: 6,
		borderRadius: 20,
	},
	callBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
	card: {
		backgroundColor: '#fff',
		borderRadius: 14,
		padding: 16,
		marginBottom: 14,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.04,
		shadowRadius: 8,
		elevation: 2,
	},
	cardTitle: { fontSize: 14, fontWeight: '700', color: '#1A2C33', marginBottom: 12 },
	billingStatusRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		flexWrap: 'wrap',
		gap: 8,
		marginBottom: 16,
	},
	statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
	statusText: { fontSize: 13, fontWeight: '700' },
	selectActionWrapper: { minWidth: 180 },
	actionSelectBtn: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 20,
	},
	actionSelectText: { color: '#fff', fontSize: 13, fontWeight: '600' },
	feeRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginTop: 8 },
	feeLabel: { fontSize: 14, fontWeight: '600', color: '#4A5B62' },
	feeValue: { fontSize: 16, fontWeight: '700', color: '#1f5f68' },
	feeInputWrapper: {
		flexDirection: 'row',
		alignItems: 'center',
		borderWidth: 1,
		borderColor: '#E2E8F0',
		borderRadius: 8,
		paddingHorizontal: 8,
		backgroundColor: '#F8FAFC',
	},
	feeCurrency: { fontSize: 14, fontWeight: '600', color: '#64707d', marginRight: 4 },
	feeInput: { flex: 1, height: 36, fontSize: 14, color: '#1A2C33', paddingVertical: 0 },
	confirmBillBtn: {
		backgroundColor: '#1f5f68',
		paddingHorizontal: 16,
		paddingVertical: 10,
		borderRadius: 8,
		alignSelf: 'flex-start',
		marginTop: 8,
	},
	confirmBillText: { color: '#fff', fontWeight: '700', fontSize: 13 },
	uploadBtn: {
		borderWidth: 1,
		borderColor: '#CBD5E1',
		borderRadius: 12,
		padding: 14,
		alignItems: 'center',
		backgroundColor: '#F8FAFC',
		marginBottom: 12,
	},
	uploadBtnText: { fontSize: 14, fontWeight: '600', color: '#1f5f68', marginTop: 4 },
	uploadSubText: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
	digitalPrescriptionRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginTop: 4,
		marginBottom: 10,
	},
	digitalLabel: { fontSize: 13, fontWeight: '600', color: '#1A2C33' },
	viewAllText: { fontSize: 13, fontWeight: '600', color: '#1f5f68' },
	fileList: { marginTop: 6 },
	fileItem: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		paddingVertical: 8,
		borderBottomWidth: 1,
		borderBottomColor: '#F1F5F9',
	},
	fileName: { fontSize: 13, color: '#1A2C33', flex: 1 },
	fileDate: { fontSize: 11, color: '#94A3B8' },
	noDocsText: { fontSize: 13, color: '#94A3B8', textAlign: 'center', paddingVertical: 12 },
	infoRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		paddingVertical: 6,
		borderBottomWidth: 1,
		borderBottomColor: '#f0f4f8',
	},
	infoLabel: { fontSize: 13, color: '#64707d', fontWeight: '500', flexShrink: 0, marginRight: 12 },
	infoValue: { fontSize: 13, color: '#1D2939', fontWeight: '500', textAlign: 'right', flex: 1 },
	verificationRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
	verificationText: { fontSize: 13, fontWeight: '600', color: '#1A2C33' },
	errorTitle: { fontSize: 18, fontWeight: '600', color: '#1D2939', marginTop: 12 },
	goBackButton: {
		marginTop: 20,
		backgroundColor: '#1f5f68',
		paddingHorizontal: 24,
		paddingVertical: 12,
		borderRadius: 24,
	},
	goBackText: { color: '#fff', fontWeight: '600', fontSize: 16 },
})
