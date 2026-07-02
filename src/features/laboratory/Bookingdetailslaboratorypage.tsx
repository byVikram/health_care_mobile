// src/features/laboratory/BookingDetailsLaboratoryPage.tsx
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
import { AppSkeleton, AppSelect, StatusModal, AppBottomSheet } from '../../components/common'
import { useAuth } from '../../context/AuthContext'
import { buildS3Url } from '../../utils/s3Utils'
import {
	getLabBookingDetail,
	submitLabBookingQuote,
	confirmLabPayment,
	markLabSampleCollected,
	markLabReportReady,
	uploadLabReport,
	verifyLabPrescription,
	updateLabBookingStatus,
	getLabTestTypes,
} from './laboratoryService'
import type { LabBooking, LabBookingItem, LabTestType } from './laboratory'

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

type RouteParams = {
	publicId: string
	booking?: LabBooking
}

// ─────────────────────────────────────────────
// Status helpers — values match actual API responses
// pending_quote | pending_payment | confirmed | sample_collected | report_ready | completed | cancelled
// Manual overrides via the Booking Status card use: pending | awaiting_sample | processing | completed | cancelled
// ─────────────────────────────────────────────

const normalizeStatus = (status: string): string => {
	switch (status?.toLowerCase()) {
		case 'pending_quote':
			return 'Pending Quote'
		case 'pending_payment':
			return 'Pending Payment'
		case 'confirmed':
			return 'Confirmed'
		case 'sample_collected':
			return 'Sample Collected'
		case 'report_ready':
			return 'Report Ready'
		case 'completed':
			return 'Completed'
		case 'cancelled':
		case 'rejected':
			return 'Cancelled'
		case 'pending':
			return 'Pending'
		case 'awaiting_sample':
			return 'Awaiting Sample'
		case 'processing':
			return 'Processing'
		default:
			return status || 'Unknown'
	}
}

const STATUS_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
	'Pending Quote': { bg: '#FFF1D9', text: '#F0A018', dot: '#F0A018' },
	'Pending Payment': { bg: '#FDE7D8', text: '#D9711B', dot: '#D9711B' },
	Confirmed: { bg: '#DEE9FF', text: '#3F7EE8', dot: '#3F7EE8' },
	'Sample Collected': { bg: '#EDE7F6', text: '#673AB7', dot: '#673AB7' },
	'Report Ready': { bg: '#E0F7FA', text: '#0097A7', dot: '#0097A7' },
	Completed: { bg: '#DFF5E4', text: '#43A047', dot: '#43A047' },
	Cancelled: { bg: '#FFE3E7', text: '#E74B5B', dot: '#E74B5B' },
	Pending: { bg: '#F1F5F9', text: '#64748B', dot: '#64748B' },
	'Awaiting Sample': { bg: '#FDF2E9', text: '#C2660B', dot: '#C2660B' },
	Processing: { bg: '#E8F0FE', text: '#3457D5', dot: '#3457D5' },
}

// Options surfaced in the "Update Status" bottom sheet.
// Kept in sync with the values accepted by PATCH /api/laboratory/bookings/{id}/status
const STATUS_OPTIONS: { value: string; label: string }[] = [
	{ value: 'pending', label: 'Pending' },
	{ value: 'awaiting_sample', label: 'Awaiting Sample' },
	{ value: 'processing', label: 'Processing' },
	{ value: 'completed', label: 'Completed' },
	{ value: 'cancelled', label: 'Cancelled' },
]

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
	if (isNaN(hours)) return time
	const minutes = parts[1] || '00'
	const ampm = hours >= 12 ? 'PM' : 'AM'
	const h12 = hours % 12 || 12
	return `${h12}:${minutes} ${ampm}`
}

// ─────────────────────────────────────────────
// Full-screen image viewer
// ─────────────────────────────────────────────

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

// ─────────────────────────────────────────────
// Document carousel
// ─────────────────────────────────────────────

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
							<MaterialCommunityIcons name="fullscreen" size={16} color="#2B6F71" />
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
		height: 160,
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
	dotActive: { backgroundColor: '#2B6F71', width: 18, borderRadius: 3 },
	counter: {
		position: 'absolute',
		bottom: 8,
		right: 12,
		backgroundColor: 'rgba(255,255,255,0.9)',
		borderRadius: 10,
		paddingHorizontal: 8,
		paddingVertical: 2,
	},
	counterText: { fontSize: 11, fontWeight: '700', color: '#2B6F71' },
	imageKeyInfo: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 10,
		gap: 6,
	},
	imageKeyText: { fontSize: 13, color: '#2B6F71', fontWeight: '500' },
})

// ─────────────────────────────────────────────
// Section / InfoRow helpers
// ─────────────────────────────────────────────

const SectionCard = ({ title, children }: { title: string; children: React.ReactNode }) => (
	<View style={styles.card}>
		<Text style={styles.cardTitle}>{title}</Text>
		{children}
	</View>
)

const InfoRow = ({ label, value }: { label: string; value: string | React.ReactNode }) => (
	<View style={styles.infoRow}>
		<Text style={styles.infoLabel}>{label}</Text>
		{typeof value === 'string' ? <Text style={styles.infoValue}>{value}</Text> : value}
	</View>
)

// ─────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────

export default function BookingDetailsLaboratoryPage() {
	const navigation = useNavigation<any>()
	const route = useRoute()
	const insets = useSafeAreaInsets()
	const { role } = useAuth()

	const params = route.params as RouteParams | undefined
	const publicId = params?.publicId
	const initialBooking = params?.booking

	const [booking, setBooking] = useState<LabBooking | null>(initialBooking ?? null)
	const bookingRef = useRef<LabBooking | null>(initialBooking ?? null)
	const [loading, setLoading] = useState(!initialBooking)
	const [refreshing, setRefreshing] = useState(false)
	const [updating, setUpdating] = useState(false)
	const [selectedAction, setSelectedAction] = useState<string>('')

	const [statusModal, setStatusModal] = useState<{
		visible: boolean
		status: 'success' | 'error'
		title: string
		description: string
	} | null>(null)

	// ── Booking Status card (manual status override) ──────────────────

	const [statusUpdating, setStatusUpdating] = useState(false)

	// ── Editable quote items ───────────────────────────────────────────

	interface EditedTestItem {
		id?: number
		laboratory_test_id?: number
		test_name: string
		quoted_price: string
		base_price?: string
		category?: string
		turnaround?: string
	}

	const [editedItems, setEditedItems] = useState<EditedTestItem[]>([])
	const [labTests, setLabTests] = useState<LabTestType[]>([])
	const [loadingLabTests, setLoadingLabTests] = useState(false)

	useEffect(() => {
		if (booking?.booking_items) {
			setEditedItems(
				booking.booking_items.map((item) => ({
					id: item.id,
					laboratory_test_id: item.laboratory_test_id,
					test_name: item.custom_test_name || item.test_name || 'Test',
					quoted_price:
						item.quoted_price != null
							? item.quoted_price.toString()
							: item.base_price != null
								? item.base_price.toString()
								: '0',
					base_price: item.base_price != null ? item.base_price.toString() : undefined,
					category: item.category,
					turnaround: item.turnaround,
				}))
			)
		}
	}, [booking])

	// Fetch laboratory available tests list for quoting
	useEffect(() => {
		const labId = booking?.laboratory_public_id
		if (
			role === 'laboratory' &&
			(booking?.status === 'pending_quote' || booking?.status === 'pending_payment') &&
			labId
		) {
			const loadTests = async () => {
				try {
					setLoadingLabTests(true)
					const tests = await getLabTestTypes(labId)
					setLabTests(tests)
				} catch (err) {
					console.error('[BookingDetailsLaboratoryPage] failed to load lab tests:', err)
				} finally {
					setLoadingLabTests(false)
				}
			}
			loadTests()
		}
	}, [role, booking?.status, booking?.laboratory_public_id])

	const availableTestOptions = useMemo(() => {
		const selectedIds = new Set(
			editedItems
				.map((item) => item.laboratory_test_id)
				.filter(Boolean)
		)
		return labTests
			.filter((test) => !selectedIds.has(Number(test.id)))
			.map((test) => ({
				label: `${test.name} (₹${test.base_price || 0})`,
				value: test.id,
			}))
	}, [labTests, editedItems])

	const handleAddTest = (testIdStr: string) => {
		const test = labTests.find((t) => t.id === testIdStr)
		if (test) {
			setEditedItems((prev) => [
				...prev,
				{
					laboratory_test_id: Number(test.id),
					test_name: test.name,
					quoted_price: test.base_price ? test.base_price.toString() : '0',
					base_price: test.base_price ? test.base_price.toString() : '0',
					category: test.category,
					turnaround: test.turnaround,
				},
			])
		}
	}

	useEffect(() => {
		bookingRef.current = booking
	}, [booking])

	const computedTotalFee = useMemo(() => {
		let total = 0
		editedItems.forEach((item) => {
			const val = parseFloat(item.quoted_price || '0')
			if (!isNaN(val)) total += val
		})
		return total.toFixed(2)
	}, [editedItems])

	// ── Document viewer ────────────────────────────────────────────────

	const [viewerVisible, setViewerVisible] = useState(false)
	const [viewerIndex, setViewerIndex] = useState(0)

	const reportDocUrls = useMemo(() => {
		const urls: string[] = []
		if (booking?.report?.report_pdf_s3_key) {
			const url = buildS3Url(booking.report.report_pdf_s3_key)
			if (url) urls.push(url)
		}
		if (booking?.report?.result_images_s3_keys) {
			booking.report.result_images_s3_keys.forEach((key) => {
				const url = buildS3Url(key)
				if (url) urls.push(url)
			})
		}
		return urls
	}, [booking])

	const prescriptionUrls = useMemo(() => {
		const urls: string[] = []
		if (booking?.external_prescription_s3_key) {
			const url = buildS3Url(booking.external_prescription_s3_key)
			if (url) urls.push(url)
		}
		return urls
	}, [booking])

	// ── Fetch ──────────────────────────────────────────────────────────

	const fetchBooking = useCallback(
		async (isRefresh = false) => {
			if (!publicId) {
				Toast.show({ type: 'error', text1: 'Error', text2: 'Missing booking ID' })
				return
			}
			try {
				if (isRefresh) setRefreshing(true)
				else if (!bookingRef.current) setLoading(true)
				const data = await getLabBookingDetail(publicId)
				setBooking(data)
			} catch (error: any) {
				if (!bookingRef.current) {
					Toast.show({
						type: 'error',
						text1: 'Error',
						text2: error?.message || 'Failed to load booking details',
					})
				}
			} finally {
				if (isRefresh) setRefreshing(false)
				else setLoading(false)
			}
		},
		[publicId]
	)

	useEffect(() => {
		if (publicId) void fetchBooking()
	}, [publicId, fetchBooking])

	useEffect(() => {
		navigation.setOptions({ title: 'Lab Booking Details', headerBackTitle: 'Back' })
	}, [navigation])

	// ── Handlers ───────────────────────────────────────────────────────

	const handleCall = (phone: string, label: string) => {
		const cleaned = (phone || '').replace(/\s/g, '')
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

	const handleSubmitQuote = async () => {
		if (!booking?.public_id) return
		if (editedItems.length === 0) {
			setStatusModal({
				visible: true,
				status: 'error',
				title: 'No Tests',
				description: 'Please add at least one test item.',
			})
			return
		}
		const items = editedItems.map((item) => {
			const normalizedPrice = item.quoted_price.replace(/,/g, '').trim()

			return {
				booking_item_id: item.id || null,
				laboratory_test_id: item.id ? null : item.laboratory_test_id,
				custom_test_name: item.test_name,
				quoted_price: Number(normalizedPrice || '0'),
			}
		})
		if (items.some((it) => !it.booking_item_id && !it.laboratory_test_id)) {
			setStatusModal({
				visible: true,
				status: 'error',
				title: 'Missing Test Details',
				description: 'Please select a valid test from the catalog.',
			})
			return
		}
		if (items.some((it) => isNaN(it.quoted_price) || it.quoted_price <= 0)) {
			setStatusModal({
				visible: true,
				status: 'error',
				title: 'Invalid Quote',
				description: 'Please enter a valid positive price for all items.',
			})
			return
		}
		setUpdating(true)
		try {
			await submitLabBookingQuote(booking.public_id, { items, notes: booking.notes })
			setStatusModal({
				visible: true,
				status: 'success',
				title: 'Quote Submitted',
				description: `Quote of ₹${parseFloat(computedTotalFee).toFixed(2)} submitted successfully.`,
			})
			await fetchBooking()
		} catch (error: any) {
			const message =
				error?.response?.data?.message ||
				error?.response?.data?.detail ||
				error?.message ||
				'Failed to submit quote.'

			setStatusModal({
				visible: true,
				status: 'error',
				title: 'Error',
				description: message,
			})
		} finally {
			setUpdating(false)
		}
	}

	const handleMarkSampleCollected = async () => {
		if (!booking?.public_id) return
		setUpdating(true)
		try {
			await markLabSampleCollected(booking.public_id)
			setStatusModal({
				visible: true,
				status: 'success',
				title: 'Sample Collected',
				description: 'Sample collection has been marked successfully.',
			})
			await fetchBooking()
		} catch (error: any) {
			setStatusModal({
				visible: true,
				status: 'error',
				title: 'Error',
				description: error?.message || 'Failed to update status.',
			})
		} finally {
			setUpdating(false)
			setSelectedAction('')
		}
	}

	const handleMarkReportReady = async () => {
		if (!booking?.public_id) return
		setUpdating(true)
		try {
			await markLabReportReady(booking.public_id)
			setStatusModal({
				visible: true,
				status: 'success',
				title: 'Report Ready',
				description: 'Report has been marked as ready for the patient.',
			})
			await fetchBooking()
		} catch (error: any) {
			setStatusModal({
				visible: true,
				status: 'error',
				title: 'Error',
				description: error?.message || 'Failed to update status.',
			})
		} finally {
			setUpdating(false)
			setSelectedAction('')
		}
	}

	const handleVerifyPrescription = async () => {
		if (!booking?.public_id) return
		setUpdating(true)
		try {
			await verifyLabPrescription(booking.public_id)
			setStatusModal({
				visible: true,
				status: 'success',
				title: 'Prescription Verified',
				description: 'Prescription has been verified successfully.',
			})
			await fetchBooking()
		} catch (error: any) {
			setStatusModal({
				visible: true,
				status: 'error',
				title: 'Error',
				description: error?.message || 'Failed to verify prescription.',
			})
		} finally {
			setUpdating(false)
			setSelectedAction('')
		}
	}

	const handlePayment = async () => {
		if (!booking?.public_id) return
		setUpdating(true)
		try {
			await confirmLabPayment(booking.public_id)
			setStatusModal({
				visible: true,
				status: 'success',
				title: 'Payment Confirmed',
				description: 'Your payment was successfully confirmed.',
			})
			await fetchBooking()
		} catch (error: any) {
			setStatusModal({
				visible: true,
				status: 'error',
				title: 'Error',
				description: error?.message || 'Failed to complete payment.',
			})
		} finally {
			setUpdating(false)
		}
	}

	const handleUploadReport = () => {
		Alert.alert('Upload Lab Report', 'This would open a file picker to upload the lab report.', [{ text: 'OK' }])
	}


	// ── Loading ────────────────────────────────────────────────────────

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

	// ── Derived data ───────────────────────────────────────────────────

	const statusDisplay = normalizeStatus(booking.status)
	const statusStyle = STATUS_STYLES[statusDisplay] ?? { bg: '#f0f0f0', text: '#555', dot: '#999' }

	const patientName = booking.patient?.name || booking.patient_name || 'N/A'
	const patientAge = booking.patient?.age != null ? String(booking.patient.age) : '—'
	const patientGender = booking.patient?.gender || '—'
	const patientId = booking.public_id ? `#${booking.public_id.slice(0, 8).toUpperCase()}` : 'N/A'
	const patientPhone = booking.patient?.phone || booking.patient_phone || ''
	const laboratoryPhone = booking.laboratory?.phone || booking.laboratory_phone || ''

	const isPatient = role === 'patient'
	const isLabStaff = role === 'laboratory'

	// Quote is editable when status is pending_quote or pending_payment (before payment is paid)
	const isQuoteEditable =
		booking.status === 'pending_quote' ||
		(booking.status === 'pending_payment' && booking.payment_status !== 'paid')
	// Patient pays when status is pending_payment
	const isPendingPayment = booking.status === 'pending_payment' && booking.payment_status === 'pending'
	const isConfirmed = booking.status === 'confirmed'
	const isSampleCollected = booking.status === 'sample_collected'

	const labActionOptions = [
		!booking.prescription_verified && booking.external_prescription_s3_key
			? { label: 'Verify Prescription', value: 'verify_prescription' }
			: null,
		isConfirmed ? { label: 'Mark Sample Collected', value: 'sample_collected' } : null,
		isSampleCollected ? { label: 'Mark Report Ready', value: 'report_ready' } : null,
	].filter(Boolean) as { label: string; value: string }[]

	// ════════════════════════════════════════
	// PATIENT VIEW
	// ════════════════════════════════════════

	if (isPatient) {
		return (
			<View style={[styles.container, { paddingTop: insets.top }]}>
				<ScrollView
					contentContainerStyle={styles.scrollContent}
					showsVerticalScrollIndicator={false}
					refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchBooking(true)} />}
				>
					<SectionCard title="Billing Status">
						<View style={styles.billingStatusRow}>
							<View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
								<Text style={[styles.statusText, { color: statusStyle.text }]}>{statusDisplay}</Text>
							</View>
							<View style={styles.feeRow}>
								<Text style={styles.feeLabel}>Total Amount: </Text>
								<Text style={styles.feeValue}>
									{booking.total_price != null
										? `₹ ${booking.total_price.toFixed(2)}`
										: 'Awaiting Quote'}
								</Text>
							</View>
						</View>
					</SectionCard>

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
									style={[styles.callBtn, { backgroundColor: '#2B6F71' }]}
									onPress={() => handleCall(laboratoryPhone, 'laboratory')}
								>
									<MaterialCommunityIcons name="phone" size={14} color="#fff" />
									<Text style={styles.callBtnText}>Call Lab</Text>
								</TouchableOpacity>
							</View>
						</View>
					</View>

					<SectionCard title="diagnosis & Referral Document">
						<DocumentCarousel
							documents={prescriptionUrls}
							onImagePress={(idx) => {
								setViewerIndex(idx)
								setViewerVisible(true)
							}}
						/>
					</SectionCard>

					<SectionCard title="Test Items">
						<View style={styles.fileList}>
							{booking.booking_items.map((item, idx) => (
								<View key={idx} style={styles.fileItem}>
									<MaterialCommunityIcons name="flask-outline" size={20} color="#2B6F71" />
									<View style={{ flex: 1 }}>
										<Text style={styles.fileName}>{item.custom_test_name || item.test_name}</Text>
										{item.category ? (
											<Text style={styles.fileCategory}>
												{item.category}
												{item.turnaround ? ` • Result in ${item.turnaround}` : ''}
											</Text>
										) : null}
									</View>
									<Text style={[styles.filePrice, { color: '#2B6F71' }]}>
										{item.quoted_price != null
											? `₹${item.quoted_price.toFixed(2)}`
											: item.base_price != null
												? `₹${item.base_price.toFixed(2)}`
												: 'TBD'}
									</Text>
								</View>
							))}
						</View>
					</SectionCard>

					<SectionCard title="Collection Details">
						<InfoRow
							label="Collection Type"
							value={booking.collection_type === 'home_collection' ? 'Home Collection' : 'Walk-in'}
						/>
						{booking.collection_type === 'home_collection' && booking.collection_address && (
							<InfoRow label="Address" value={booking.collection_address} />
						)}
					</SectionCard>

					{reportDocUrls.length > 0 && (
						<SectionCard title="Lab Report">
							<DocumentCarousel
								documents={reportDocUrls}
								onImagePress={(idx) => {
									setViewerIndex(idx)
									setViewerVisible(true)
								}}
							/>
						</SectionCard>
					)}

					<SectionCard title="Booking Details">
						<InfoRow label="Booking Date" value={formatDisplayDate(booking.booking_date)} />
						<InfoRow label="Booking Time" value={formatDisplayTime(booking.booking_time)} />
						<InfoRow label="Status" value={statusDisplay} />
						<InfoRow label="Payment Status" value={booking.payment_status || 'N/A'} />
						{booking.notes ? <InfoRow label="Notes" value={booking.notes} /> : null}
					</SectionCard>

					{isPendingPayment && (
						<TouchableOpacity
							style={[styles.primaryActionBtn, { backgroundColor: '#2B6F71' }]}
							onPress={handlePayment}
							disabled={updating}
						>
							<Text style={styles.primaryActionBtnText}>{updating ? 'Processing...' : 'Pay Now'}</Text>
						</TouchableOpacity>
					)}
				</ScrollView>

				<ImageViewerModal
					visible={viewerVisible}
					images={[...prescriptionUrls, ...reportDocUrls]}
					initialIndex={viewerIndex}
					onClose={() => setViewerVisible(false)}
				/>

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

	// ════════════════════════════════════════
	// LAB STAFF VIEW
	// ════════════════════════════════════════

	return (
		<View style={[styles.container, { paddingTop: insets.top }]}>
			<ScrollView
				contentContainerStyle={styles.scrollContent}
				showsVerticalScrollIndicator={false}
				refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchBooking(true)} />}
			>
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
								style={[styles.callBtn, { backgroundColor: '#2B6F71' }]}
								onPress={() => handleCall(patientPhone, 'patient')}
							>
								<MaterialCommunityIcons name="phone" size={14} color="#fff" />
								<Text style={styles.callBtnText}>Call Patient</Text>
							</TouchableOpacity>
						</View>
					</View>
				</View>

				<SectionCard title="Booking Status">
					<View style={styles.bookingStatusRow}>
						<View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
							<Text style={[styles.statusText, { color: statusStyle.text }]}>{statusDisplay}</Text>
						</View>
						{labActionOptions.length > 0 && (
							<View style={styles.selectActionWrapper}>
								<AppSelect
									placeholder="Select Action"
									options={labActionOptions}
									value={selectedAction}
									onSelect={(val) => {
										setSelectedAction(val)
										if (val === 'verify_prescription') handleVerifyPrescription()
										else if (val === 'sample_collected') handleMarkSampleCollected()
										else if (val === 'report_ready') handleMarkReportReady()
									}}
									size="form"
									noMargin
									customCardStyle={{ minWidth: 180, borderColor: '#CBD5E1' }}
								/>
							</View>
						)}
						<View style={styles.selectActionWrapper}>
							<AppSelect
								placeholder="Update Status"
								options={STATUS_OPTIONS}
								value={booking.status}
								onSelect={async (val) => {
									if (val === booking.status) return
									setStatusUpdating(true)
									try {
										await updateLabBookingStatus(booking.public_id, val)
										await fetchBooking()
										const label = STATUS_OPTIONS.find((o) => o.value === val)?.label || val
										setStatusModal({
											visible: true,
											status: 'success',
											title: 'Status Updated',
											description: `Booking status changed to ${label}.`,
										})
									} catch (error: any) {
										setStatusModal({
											visible: true,
											status: 'error',
											title: 'Error',
											description: error?.message || 'Failed to update status.',
										})
									} finally {
										setStatusUpdating(false)
									}
								}}
								size="form"
								noMargin
								customCardStyle={{ minWidth: 180, borderColor: '#CBD5E1' }}
							/>
						</View>
					</View>
				</SectionCard>

				<SectionCard title="diagnosis & Referral Document">
					<DocumentCarousel
						documents={prescriptionUrls}
						onImagePress={(idx) => {
							setViewerIndex(idx)
							setViewerVisible(true)
						}}
					/>
				</SectionCard>

				<SectionCard title="Collection Details">
					<InfoRow
						label="Collection Type"
						value={
							booking.collection_type === 'home_collection' ? '🏠 Home Collection' : '🚶 Walk-in'
						}
					/>
					{booking.collection_type === 'home_collection' && booking.collection_address && (
						<InfoRow label="Address" value={booking.collection_address} />
					)}
				</SectionCard>

				<SectionCard title="Billing Status">

					{isQuoteEditable ? (
						<View style={styles.quoteFormContainer}>
							<Text style={styles.quoteInstruction}>Review and set prices for each test item:</Text>

							{editedItems.map((item, index) => (
								<View key={index} style={styles.quoteItemRow}>
									<View style={styles.quoteItemLeft}>
										<Text style={styles.quoteItemName} numberOfLines={2}>
											{item.test_name}
										</Text>
										{item.category && (
											<Text style={styles.quoteItemMeta}>
												{item.category}
												{item.turnaround ? ` • ${item.turnaround}` : ''}
											</Text>
										)}
										{item.base_price !== undefined && (
											<Text style={styles.quoteItemBasePrice}>
												Base: ₹{parseFloat(item.base_price || '0').toFixed(2)}
											</Text>
										)}
									</View>
									<View style={styles.quoteItemRight}>
										<View style={styles.feeInputWrapper}>
											<Text style={styles.feeCurrency}>₹</Text>
											<TextInput
												style={styles.feeInput}
												keyboardType="numeric"
												value={item.quoted_price}
												onChangeText={(val) => {
													setEditedItems((prev) => {
														const next = [...prev]
														next[index] = { ...next[index], quoted_price: val }
														return next
													})
												}}
												placeholder="0.00"
												placeholderTextColor="#94A3B8"
											/>
										</View>
										<TouchableOpacity
											onPress={() =>
												setEditedItems((prev) => prev.filter((_, i) => i !== index))
											}
											style={styles.deleteScanBtn}
											hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
										>
											<MaterialCommunityIcons
												name="trash-can-outline"
												size={20}
												color="#E74B5B"
											/>
										</TouchableOpacity>
									</View>
								</View>
							))}

							{/* Add Test dropdown */}
							{availableTestOptions.length > 0 && (
								<View style={{ marginTop: 12, marginBottom: 16 }}>
									<AppSelect
										placeholder="+ Add Test Item"
										options={availableTestOptions}
										value={undefined}
										onSelect={handleAddTest}
										size="form"
										noMargin
										customCardStyle={{ borderColor: '#2B6F71' }}
									/>
								</View>
							)}

							<View style={styles.feeTotalRow}>
								<Text style={styles.feeLabel}>Total Quoted Price:</Text>
								<Text style={styles.feeValue}>₹ {computedTotalFee}</Text>
							</View>

							<TouchableOpacity
								style={[styles.confirmBillBtn, updating && { opacity: 0.7 }]}
								onPress={handleSubmitQuote}
								disabled={updating}
							>
								<Text style={styles.confirmBillText}>
									{updating ? 'Submitting...' : 'Submit Quote'}
								</Text>
							</TouchableOpacity>
						</View>
					) : (
						<View style={styles.readOnlyFeeRow}>
							<Text style={styles.feeLabel}>Final Lab Fee:</Text>
							<Text style={styles.feeValue}>
								₹ {booking.total_price != null ? booking.total_price.toFixed(2) : '0.00'}
							</Text>
						</View>
					)}
				</SectionCard>

				<SectionCard title="Document Control">
					<TouchableOpacity style={styles.uploadBtn} onPress={handleUploadReport}>
						<MaterialCommunityIcons name="cloud-upload" size={20} color="#2B6F71" />
						<Text style={styles.uploadBtnText}>Upload Lab Report</Text>
						<Text style={styles.uploadSubText}>PDF, JPG, PNG (Max 10MB)</Text>
					</TouchableOpacity>
				</SectionCard>

				{reportDocUrls.length > 0 && (
					<SectionCard title="Uploaded Lab Reports">
						<DocumentCarousel
							documents={reportDocUrls}
							onImagePress={(idx) => {
								setViewerIndex(idx)
								setViewerVisible(true)
							}}
						/>
					</SectionCard>
				)}

				<SectionCard title="Booking Details">
					<InfoRow label="Booking Date" value={formatDisplayDate(booking.booking_date)} />
					<InfoRow label="Booking Time" value={formatDisplayTime(booking.booking_time)} />
					<InfoRow label="Status" value={statusDisplay} />
					<InfoRow label="Payment Status" value={booking.payment_status || 'N/A'} />
					<InfoRow
						label="Total Amount"
						value={booking.total_price != null ? `₹${booking.total_price.toFixed(2)}` : 'Not quoted'}
					/>
					{booking.notes ? <InfoRow label="Notes" value={booking.notes} /> : null}
				</SectionCard>

			</ScrollView>

			<ImageViewerModal
				visible={viewerVisible}
				images={[...prescriptionUrls, ...reportDocUrls]}
				initialIndex={viewerIndex}
				onClose={() => setViewerVisible(false)}
			/>



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

// ─────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────

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
	patientHeaderRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		flexWrap: 'wrap',
	},
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
	bookingStatusRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		flexWrap: 'wrap',
		gap: 8,
	},
	updateStatusBtn: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		borderWidth: 1,
		borderColor: '#2B6F71',
		borderRadius: 20,
		paddingHorizontal: 12,
		paddingVertical: 7,
	},
	updateStatusBtnText: { color: '#2B6F71', fontSize: 12, fontWeight: '700' },
	statusOptionList: { marginBottom: 4 },
	statusOptionRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		paddingVertical: 12,
		paddingHorizontal: 14,
		borderRadius: 10,
		borderWidth: 1,
		borderColor: '#E2E8F0',
		backgroundColor: '#F8FAFC',
		marginBottom: 10,
	},
	statusOptionRowActive: {
		borderColor: '#2B6F71',
		backgroundColor: '#EAF4F4',
	},
	radioOuter: {
		width: 20,
		height: 20,
		borderRadius: 10,
		borderWidth: 2,
		borderColor: '#CBD5E1',
		alignItems: 'center',
		justifyContent: 'center',
	},
	radioOuterActive: { borderColor: '#2B6F71' },
	radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#2B6F71' },
	statusOptionText: { fontSize: 14, fontWeight: '600', color: '#1A2C33' },
	statusOptionTextActive: { color: '#2B6F71' },
	confirmStatusBtn: {
		backgroundColor: '#2B6F71',
		borderRadius: 8,
		paddingVertical: 12,
		alignItems: 'center',
		marginTop: 4,
	},
	confirmStatusBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
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
	selectActionWrapper: { minWidth: 200 },
	feeRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginTop: 8 },
	feeLabel: { fontSize: 14, fontWeight: '600', color: '#4A5B62' },
	feeValue: { fontSize: 16, fontWeight: '700', color: '#2B6F71' },
	feeInputWrapper: {
		flexDirection: 'row',
		alignItems: 'center',
		borderWidth: 1,
		borderColor: '#E2E8F0',
		borderRadius: 8,
		paddingHorizontal: 8,
		backgroundColor: '#F8FAFC',
		width: 100,
	},
	feeCurrency: { fontSize: 14, fontWeight: '600', color: '#64707d', marginRight: 4 },
	feeInput: { flex: 1, height: 36, fontSize: 14, color: '#1A2C33', paddingVertical: 0 },
	quoteFormContainer: { marginTop: 10 },
	quoteInstruction: { fontSize: 13, fontWeight: '600', color: '#4A5B62', marginBottom: 10 },
	quoteItemRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		backgroundColor: '#F8FAFC',
		borderRadius: 10,
		borderWidth: 1,
		borderColor: '#E2E8F0',
		padding: 12,
		marginBottom: 10,
		gap: 12,
	},
	quoteItemLeft: { flex: 1, flexDirection: 'column', gap: 2 },
	quoteItemName: { fontSize: 14, fontWeight: '600', color: '#1A2C33' },
	quoteItemMeta: { fontSize: 11, color: '#667085' },
	quoteItemBasePrice: { fontSize: 12, color: '#64707D', fontWeight: '500' },
	quoteItemRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
	deleteScanBtn: {
		width: 36,
		height: 36,
		borderRadius: 8,
		backgroundColor: '#FFF5F5',
		borderWidth: 1,
		borderColor: '#FFE3E3',
		alignItems: 'center',
		justifyContent: 'center',
	},
	feeTotalRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		marginTop: 12,
		borderTopWidth: 1,
		borderTopColor: '#E2E8F0',
		paddingTop: 10,
	},
	readOnlyFeeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
	confirmBillBtn: {
		backgroundColor: '#2B6F71',
		paddingHorizontal: 16,
		paddingVertical: 10,
		borderRadius: 8,
		alignSelf: 'flex-start',
		marginTop: 12,
	},
	confirmBillText: { color: '#fff', fontWeight: '700', fontSize: 13 },
	uploadBtn: {
		borderWidth: 1,
		borderColor: '#CBD5E1',
		borderRadius: 12,
		padding: 14,
		alignItems: 'center',
		backgroundColor: '#F8FAFC',
	},
	uploadBtnText: { fontSize: 14, fontWeight: '600', color: '#2B6F71', marginTop: 4 },
	uploadSubText: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
	fileList: { marginTop: 6 },
	fileItem: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
		paddingVertical: 10,
		borderBottomWidth: 1,
		borderBottomColor: '#F1F5F9',
	},
	fileName: { fontSize: 13, color: '#1A2C33', fontWeight: '600' },
	fileCategory: { fontSize: 11, color: '#667085', marginTop: 1 },
	filePrice: { fontSize: 13, fontWeight: '700' },
	infoRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		paddingVertical: 6,
		borderBottomWidth: 1,
		borderBottomColor: '#f0f4f8',
	},
	infoLabel: { fontSize: 13, color: '#64707d', fontWeight: '500', flexShrink: 0, marginRight: 12 },
	infoValue: { fontSize: 13, color: '#1D2939', fontWeight: '500', textAlign: 'right', flex: 1 },
	primaryActionBtn: {
		borderRadius: 12,
		paddingVertical: 14,
		alignItems: 'center',
		marginTop: 8,
		marginBottom: 16,
	},
	primaryActionBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
	errorTitle: { fontSize: 18, fontWeight: '600', color: '#1D2939', marginTop: 12 },
	goBackButton: {
		marginTop: 20,
		backgroundColor: '#2B6F71',
		paddingHorizontal: 24,
		paddingVertical: 12,
		borderRadius: 24,
	},
	goBackText: { color: '#fff', fontWeight: '600', fontSize: 16 },
})
