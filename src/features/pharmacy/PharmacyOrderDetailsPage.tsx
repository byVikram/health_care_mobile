// screens/pharmacy/OrderDetailsScreen.tsx
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import {
	View,
	Text,
	StyleSheet,
	ScrollView,
	TouchableOpacity,
	Linking,
	ActivityIndicator,
	TextInput,
	Image,
	FlatList,
	useWindowDimensions,
	Modal,
	StatusBar,
	SafeAreaView,
} from 'react-native'
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native'
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'
import { getPharmacyOrderById, updatePharmacyOrderStatus } from '../profile/pharmacy/pharmacyService'
import { ROUTES } from '../../navigation/routes'
import { useAuth } from '../../context/AuthContext'
import { AppSelect, StatusModal, AppSkeleton } from '../../components/common'

// ─── S3 Config ────────────────────────────────────────────────────────────────
const S3_BASE_URL = process.env.REACT_APP_S3_BASE_URL || ''

const buildS3Url = (key?: string | null): string | null => {
	return key ?? null
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface MedicineRow {
	id: string
	medication: string
	frequency: string
	totalTablets: number
	purchasedTablets: number
	instructions: string
}

interface OrderData {
	id: string
	status: string
	bill_amount?: number
	created_at?: string
	delivery_type?: string
	medicines?: Partial<MedicineRow>[]
	prescriptions?: { id?: string; url?: string; image_url?: string; s3_key?: string }[]
	prescription_urls?: string[]
	prescription_s3_keys?: string[]
	prescription_s3_key?: string | null
	patient?: {
		id?: string
		name?: string
		avatar_s3_key?: string | null
		gender?: string | null
		age?: number | null
		blood_group?: string | null
		weight?: string | number | null
		allergies?: string | null
		mobile?: string | null
		phone?: string | null
		emergency_contact?: string | null
	}
	clinic?: {
		name?: string
		doctor_name?: string
		phone?: string
	}
	pharmacy?: {
		id?: string
		name?: string
		alternate_mobile?: string | null
		address?: string | null
		city?: string | null
	}
	delivery_address?: {
		id: string
		label: string
		address_line: string
		city: string
		state: string
		pincode: string
	} | null
	rejection_reason?: string | null
	notes?: string | null
}

type RootStackParamList = {
	OrderDetails: { orderId: string }
}

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { bg: string; text: string; dot: string; label: string }> = {
	pending: { bg: '#FFF1D9', text: '#F0A018', dot: '#F0A018', label: 'Pending' },
	packed: { bg: '#DEE9FF', text: '#3F7EE8', dot: '#3F7EE8', label: 'Packed' },
	collected: { bg: '#DFF5E4', text: '#43A047', dot: '#43A047', label: 'Collected' },
	rejected: { bg: '#FFE3E7', text: '#E74B5B', dot: '#E74B5B', label: 'Rejected' },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const normalizeMedicines = (medicines?: Partial<MedicineRow>[]): MedicineRow[] => {
	if (!medicines?.length) return []
	return medicines.map((m) => ({
		id: m.id || Math.random().toString(36).slice(2),
		medication: m.medication || '',
		frequency: m.frequency || '',
		totalTablets: Number(m.totalTablets || 0),
		purchasedTablets: Number(m.purchasedTablets || 0),
		instructions: m.instructions || '',
	}))
}

const createEmptyRow = (): MedicineRow => ({
	id: Math.random().toString(36).slice(2),
	medication: '',
	frequency: '',
	totalTablets: 0,
	purchasedTablets: 0,
	instructions: '',
})

// ─── Mock API for medicines ───────────────────────────────────────────────────
const updatePharmacyOrderMedicines = async (orderId: string, medicines: MedicineRow[]) => {
	await new Promise((resolve) => setTimeout(resolve, 500))
	return { success: true }
}

// ─── Fullscreen Image Viewer Modal ────────────────────────────────────────────
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
				{/* Header */}
				<SafeAreaView style={viewerStyles.header}>
					<Text style={viewerStyles.headerTitle}>
						Prescription {images.length > 1 ? `${activeIndex + 1} / ${images.length}` : ''}
					</Text>
					<TouchableOpacity
						style={viewerStyles.closeBtn}
						onPress={onClose}
						hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
					>
						<MaterialCommunityIcons name="close" size={24} color="#fff" />
					</TouchableOpacity>
				</SafeAreaView>

				{/* Images */}
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

				{/* Arrows */}
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

						{/* Dots */}
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
	overlay: {
		flex: 1,
		backgroundColor: 'rgba(0,0,0,0.95)',
	},
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 16,
		paddingVertical: 12,
	},
	headerTitle: {
		color: '#fff',
		fontSize: 15,
		fontWeight: '600',
	},
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
	dot: {
		width: 6,
		height: 6,
		borderRadius: 3,
		backgroundColor: 'rgba(255,255,255,0.4)',
	},
	dotActive: {
		backgroundColor: '#fff',
		width: 18,
	},
})

// ─── Prescription Carousel ────────────────────────────────────────────────────
const PrescriptionCarousel = ({
	images,
	onImagePress,
}: {
	images: string[]
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
		const clamped = Math.max(0, Math.min(index, images.length - 1))
		flatListRef.current?.scrollToIndex({ index: clamped, animated: true })
		setActiveIndex(clamped)
	}

	if (!images.length) {
		return (
			<View style={carouselStyles.empty}>
				<MaterialCommunityIcons name="file-image-outline" size={48} color="#CBD5E1" />
				<Text style={carouselStyles.emptyText}>No prescription images available</Text>
			</View>
		)
	}

	return (
		<View style={carouselStyles.container}>
			<FlatList
				ref={flatListRef}
				data={images}
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
						<View style={scrollTableStyles.imageKeyInfo}>
							<MaterialCommunityIcons name="fullscreen" size={16} color="#1f5f68" />
							<Text style={scrollTableStyles.imageKeyText}>Tap to expand prescription document</Text>
						</View>
					</TouchableOpacity>
				)}
			/>

			{images.length > 1 && (
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
						{images.map((_, i) => (
							<View key={i} style={[carouselStyles.dot, i === activeIndex && carouselStyles.dotActive]} />
						))}
					</View>
					<View style={carouselStyles.counter}>
						<Text style={carouselStyles.counterText}>
							{activeIndex + 1} / {images.length}
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
	emptyText: {
		fontSize: 13,
		color: '#94A3B8',
	},
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
	dot: {
		width: 6,
		height: 6,
		borderRadius: 3,
		backgroundColor: '#CBD5E1',
	},
	dotActive: {
		backgroundColor: '#2E7C86',
		width: 18,
		borderRadius: 3,
	},
	counter: {
		position: 'absolute',
		bottom: 8,
		right: 12,
		backgroundColor: 'rgba(255,255,255,0.9)',
		borderRadius: 10,
		paddingHorizontal: 8,
		paddingVertical: 2,
	},
	counterText: {
		fontSize: 11,
		fontWeight: '700',
		color: '#2E7C86',
	},
})

// ─── Sub-components ───────────────────────────────────────────────────────────
const SectionCard = ({ title, children }: { title: string; children: React.ReactNode }) => (
	<View style={styles.card}>
		<Text style={styles.cardTitle}>{title}</Text>
		{children}
	</View>
)

const InfoRow = ({ icon, label, value }: { icon: string; label?: string; value: string }) => (
	<View style={styles.infoRow}>
		<MaterialCommunityIcons name={icon} size={16} color="#5F7F7F" />
		{label ? <Text style={styles.infoLabel}>{label}:</Text> : null}
		<Text style={styles.infoValue}>{value}</Text>
	</View>
)

// ─── Timeline step keys ───────────────────────────────────────────────────────
const TIMELINE_STEPS = [
	{ key: 'order_created', label: 'Order Created', icon: 'clipboard-check-outline' },
	{ key: 'prescription_verified', label: 'Prescription Verified', icon: 'shield-check-outline' },
	{ key: 'packed', label: 'Packed', icon: 'package-variant-closed' },
	{ key: 'collected', label: 'Collected', icon: 'truck-delivery-outline' },
]

const getCompletedSteps = (status: string): string[] => {
	switch (status) {
		case 'pending':
			return ['order_created', 'prescription_verified']
		case 'packed':
			return ['order_created', 'prescription_verified', 'packed']
		case 'collected':
			return ['order_created', 'prescription_verified', 'packed', 'collected']
		case 'rejected':
			return ['order_created']
		default:
			return ['order_created']
	}
}

// ─── Status Options ───────────────────────────────────────────────────────────
const STATUS_OPTIONS = [
	{ label: 'Packed', value: 'packed' },
	{ label: 'Collected', value: 'collected' },
	{ label: 'Rejected', value: 'rejected' },
]

// ─── Main Screen ──────────────────────────────────────────────────────────────
const PharmacyOrderDetailsPage = () => {
	const navigation = useNavigation<any>()
	const route = useRoute<RouteProp<RootStackParamList, 'OrderDetails'>>()
	const { width: screenWidth, height: screenHeight } = useWindowDimensions()
	const { role } = useAuth()

	const isTablet = screenWidth >= 768
	const isLandscape = screenWidth > screenHeight

	const orderId = (route.params as any)?.orderId || (route.params as any)?.order?.id

	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const [orderData, setOrderData] = useState<OrderData | null>(null)
	const [status, setStatus] = useState('pending')
	const [updatingStatus, setUpdatingStatus] = useState(false)
	const [savingMedicines, setSavingMedicines] = useState(false)
	const [medicineRows, setMedicineRows] = useState<MedicineRow[]>([])
	const [billAmountInput, setBillAmountInput] = useState('')
	const [rejectionReasonInput, setRejectionReasonInput] = useState('')
	const [statusModal, setStatusModal] = useState<{
		visible: boolean
		status: 'success' | 'error'
		title: string
		description: string
	} | null>(null)

	// ─── Image viewer state ───────────────────────────────────────────────────
	const [imageViewerVisible, setImageViewerVisible] = useState(false)
	const [imageViewerIndex, setImageViewerIndex] = useState(0)

	const openImageViewer = (index: number) => {
		setImageViewerIndex(index)
		setImageViewerVisible(true)
	}

	// ─── Fetch order ──────────────────────────────────────────────────────────
	const fetchOrder = useCallback(async () => {
		if (!orderId) {
			setError('Order ID is missing.')
			setLoading(false)
			return
		}
		setLoading(true)
		setError(null)
		try {
			const result = (await getPharmacyOrderById(orderId)) as any
			const order: OrderData = result?.data ?? result
			if (!order?.id) throw new Error(result?.message || 'Failed to load order')
			setOrderData(order)
			setStatus((order.status || 'pending').toLowerCase())
			setMedicineRows(normalizeMedicines(order.medicines))
			setBillAmountInput(order.bill_amount ? String(order.bill_amount) : '')
			setRejectionReasonInput(order.rejection_reason || '')
		} catch (err: any) {
			setError(err?.message || 'Failed to load order details')
		} finally {
			setLoading(false)
		}
	}, [orderId])

	useEffect(() => {
		fetchOrder()
	}, [fetchOrder])

	// ─── Save medicines (mock) ────────────────────────────────────────────────
	const saveMedicines = useCallback(
		async (rows: MedicineRow[]) => {
			if (!orderData) return
			setSavingMedicines(true)
			try {
				await updatePharmacyOrderMedicines(orderData.id, rows)
			} catch (err: any) {
				setStatusModal({
					visible: true,
					status: 'error',
					title: 'Error',
					description: err?.message || 'Failed to save medicines',
				})
			} finally {
				setSavingMedicines(false)
			}
		},
		[orderData]
	)

	const addMedicineRow = () => {
		const newRow = createEmptyRow()
		const updated = [...medicineRows, newRow]
		setMedicineRows(updated)
		saveMedicines(updated)
	}

	const removeMedicineRow = async (id: string) => {
		const updated = medicineRows.filter((r) => r.id !== id)
		setMedicineRows(updated)
		await saveMedicines(updated)
	}

	const updateMedicineField = (id: string, field: keyof MedicineRow, value: string | number) => {
		const updatedRows = medicineRows.map((r) => (r.id === id ? { ...r, [field]: value } : r))
		setMedicineRows(updatedRows)
	}

	const handleMedicineBlur = async () => {
		await saveMedicines(medicineRows)
	}

	// ─── Derived data ─────────────────────────────────────────────────────────
	const patient = useMemo(() => {
		const p = orderData?.patient
		const avatarUrl = p?.avatar_s3_key ? buildS3Url(p.avatar_s3_key) : null
		return {
			name: p?.name || 'Patient',
			age: p?.age ?? '—',
			gender: p?.gender || '—',
			bloodGroup: p?.blood_group || '—',
			weight: p?.weight ? `${p.weight} kg` : '—',
			allergies: p?.allergies || 'NKA',
			phone: p?.mobile || p?.phone || '—',
			emergency: p?.emergency_contact || '—',
			avatarUrl,
		}
	}, [orderData])

	const clinic = useMemo(
		() => ({
			name: orderData?.clinic?.name || orderData?.pharmacy?.name || '—',
			doctor: orderData?.clinic?.doctor_name || '—',
			phone: orderData?.clinic?.phone || orderData?.pharmacy?.alternate_mobile || '—',
		}),
		[orderData]
	)

	const pharmacy = useMemo(
		() => ({
			name: orderData?.pharmacy?.name || 'Care & Cure Pharmacy',
			alternate_phone: orderData?.pharmacy?.alternate_mobile || '—',
			address: orderData?.pharmacy?.address || '—',
			city: orderData?.pharmacy?.city || '—',
		}),
		[orderData]
	)

	const orderDate = useMemo(() => {
		if (!orderData?.created_at) return '—'
		return new Date(orderData.created_at).toLocaleDateString('en-IN', {
			day: '2-digit',
			month: 'short',
			year: 'numeric',
		})
	}, [orderData])

	const currentStatusCfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending

	const prescriptionImages = useMemo(() => {
		const urls: string[] = []
		orderData?.prescriptions?.forEach((item) => {
			const url = item.url || item.image_url || buildS3Url(item.s3_key)
			if (url) urls.push(url)
		})
		orderData?.prescription_urls?.forEach((url) => {
			if (url) urls.push(url)
		})
		orderData?.prescription_s3_keys?.forEach((key) => {
			const url = buildS3Url(key)
			if (url) urls.push(url)
		})
		const single = buildS3Url(orderData?.prescription_s3_key)
		if (single) urls.push(single)
		return Array.from(new Set(urls))
	}, [orderData])

	// ─── Status update ────────────────────────────────────────────────────────
	const handleMarkStatus = async (newStatus: string, billVal?: number | null, reason?: string | null) => {
		if (!orderData) return
		setUpdatingStatus(true)
		try {
			const payload: { status: string; bill_amount?: number | null; rejection_reason?: string | null } = {
				status: newStatus,
			}
			if (billVal !== undefined) {
				payload.bill_amount = billVal
			} else {
				const num = parseFloat(billAmountInput)
				payload.bill_amount = isNaN(num) ? null : num
			}
			if (reason !== undefined) {
				payload.rejection_reason = reason
			} else {
				payload.rejection_reason = rejectionReasonInput || null
			}
			const res = await updatePharmacyOrderStatus(orderData.id, payload)
			setStatus(newStatus)
			setOrderData((prev) =>
				prev
					? {
							...prev,
							status: newStatus,
							bill_amount:
								payload.bill_amount !== undefined
									? (payload.bill_amount ?? undefined)
									: prev.bill_amount,
							rejection_reason:
								payload.rejection_reason !== undefined
									? (payload.rejection_reason ?? undefined)
									: prev.rejection_reason,
						}
					: prev
			)
			setStatusModal({
				visible: true,
				status: 'success',
				title: 'Success',
				description: res?.message || 'Order updated successfully',
			})
		} catch (err: any) {
			setStatusModal({
				visible: true,
				status: 'error',
				title: 'Error',
				description: err?.message || 'Failed to update status',
			})
		} finally {
			setUpdatingStatus(false)
		}
	}

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

	// ─── Loading state ────────────────────────────────────────────────────────
	if (loading) {
		return (
			<View style={styles.safeArea}>
				<ScrollView
					style={styles.container}
					contentContainerStyle={styles.content}
					showsVerticalScrollIndicator={false}
				>
					<AppSkeleton height={180} borderRadius={14} style={{ marginBottom: 14 }} />
					<AppSkeleton height={220} borderRadius={14} style={{ marginBottom: 14 }} />
					<AppSkeleton height={320} borderRadius={14} style={{ marginBottom: 14 }} />
					<AppSkeleton height={200} borderRadius={14} />
				</ScrollView>
			</View>
		)
	}

	if (error) {
		return (
			<View style={styles.safeArea}>
				<View style={styles.centered}>
					<MaterialCommunityIcons name="alert-circle-outline" size={48} color="#E74B5B" />
					<Text style={styles.errorText}>{error}</Text>
					<TouchableOpacity style={styles.retryButton} onPress={fetchOrder}>
						<Text style={styles.retryText}>Retry</Text>
					</TouchableOpacity>
				</View>
			</View>
		)
	}

	// ─── Role-based rendering ─────────────────────────────────────────────────
	const isPatient = role === 'patient'

	if (isPatient) {
		const isHomeDelivery = orderData?.delivery_type === 'home_delivery'
		const deliveryAddress = orderData?.delivery_address

		return (
			<View style={styles.safeArea}>
				<ScrollView
					style={styles.container}
					showsVerticalScrollIndicator={false}
					contentContainerStyle={styles.content}
				>
					{/* Rejection Alert Banner */}
					{status === 'rejected' && (
						<View style={styles.rejectionBanner}>
							<MaterialCommunityIcons name="alert-decagram" size={24} color="#D32F2F" />
							<View style={{ flex: 1 }}>
								<Text style={styles.rejectionBannerTitle}>Order Rejected</Text>
								<Text style={styles.rejectionBannerText}>
									Reason: {orderData?.rejection_reason || 'Out of stock or unavailable.'}
								</Text>
							</View>
						</View>
					)}

					{/* Order Summary Card */}
					<SectionCard title="Order Summary">
						<View style={styles.receiptHeader}>
							<View>
								<Text style={styles.receiptOrderNo}>Order #{orderId.slice(0, 8).toUpperCase()}</Text>
								<Text style={styles.receiptDate}>Ordered on {orderDate}</Text>
							</View>
							<View style={[styles.badgeStyle, { backgroundColor: currentStatusCfg.bg }]}>
								<View
									style={[
										styles.statusDotSmall,
										{ backgroundColor: currentStatusCfg.dot, marginRight: 4 },
									]}
								/>
								<Text style={[styles.badgeStyleText, { color: currentStatusCfg.text }]}>
									{currentStatusCfg.label}
								</Text>
							</View>
						</View>

						<View style={styles.receiptDivider} />

						<View style={styles.summaryGrid}>
							<View style={styles.summaryItem}>
								<Text style={styles.summaryLabel}>Delivery Type</Text>
								<View
									style={[styles.badgeStyle, isHomeDelivery ? styles.badgeHome : styles.badgePickup]}
								>
									<MaterialCommunityIcons
										name={isHomeDelivery ? 'truck-delivery' : 'storefront'}
										size={12}
										color={isHomeDelivery ? '#0D47A1' : '#1B5E20'}
									/>
									<Text
										style={[
											styles.badgeStyleText,
											{ color: isHomeDelivery ? '#0D47A1' : '#1B5E20' },
										]}
									>
										{isHomeDelivery ? 'Home Delivery' : 'Store Pickup'}
									</Text>
								</View>
							</View>
							<View style={styles.summaryItem}>
								<Text style={styles.summaryLabel}>Total Amount</Text>
								<Text style={[styles.summaryValue, styles.billEmphasis]}>
									{orderData?.bill_amount && orderData.bill_amount > 0
										? `₹${orderData.bill_amount.toFixed(2)}`
										: 'Pending Verification'}
								</Text>
							</View>
						</View>

						{isHomeDelivery && deliveryAddress && (
							<View style={styles.addressSummaryBox}>
								<View style={styles.addressBadgeHeader}>
									<MaterialCommunityIcons name="map-marker-outline" size={14} color="#667085" />
									<Text style={styles.addressBadgeText}>{deliveryAddress.label}</Text>
								</View>
								<Text style={styles.addressDetailsText}>
									{deliveryAddress.address_line}, {deliveryAddress.city}, {deliveryAddress.state} -{' '}
									{deliveryAddress.pincode}
								</Text>
							</View>
						)}
					</SectionCard>

					{/* Pharmacy Details */}
					<SectionCard title="Pharmacy Details">
						<View style={styles.pharmacyHeader}>
							<MaterialCommunityIcons
								name="storefront-outline"
								size={24}
								color="#1f5f68"
								style={{ marginRight: 10 }}
							/>
							<View style={{ flex: 1 }}>
								<Text style={styles.pharmacyName}>{pharmacy.name}</Text>
								<Text style={styles.pharmacyAddress}>
									{pharmacy.address}, {pharmacy.city}
								</Text>
							</View>
						</View>
						<TouchableOpacity
							style={styles.callButton}
							onPress={() => handleCall(pharmacy.alternate_phone, 'pharmacy')}
						>
							<MaterialCommunityIcons name="phone" size={14} color="#fff" />
							<Text style={styles.callButtonText}>Call Pharmacy</Text>
						</TouchableOpacity>
					</SectionCard>

					{/* Consultation Info */}
					<SectionCard title="Consultation Info">
						<InfoRow icon="hospital-building" label="Clinic/Hospital" value={clinic.name} />
						<InfoRow icon="doctor" label="Doctor Name" value={clinic.doctor} />
						<InfoRow icon="phone-outline" label="Contact" value={clinic.phone} />
					</SectionCard>

					{/* Prescription Document */}
					<SectionCard title="Prescription Document">
						{orderData?.notes ? (
							<View style={styles.notesBox}>
								<Text style={styles.notesLabel}>Doctor Notes:</Text>
								<Text style={styles.notesText}>{orderData.notes}</Text>
							</View>
						) : null}
						<PrescriptionCarousel images={prescriptionImages} onImagePress={openImageViewer} />
					</SectionCard>

					{/* Medicine Details */}
					<SectionCard title="Medicine Details">
						{medicineRows.length === 0 ? (
							<Text style={styles.emptyText}>
								The pharmacy is preparing your medicine list. Once packed, details will be listed here.
							</Text>
						) : (
							<View style={styles.readOnlyMedList}>
								{medicineRows.map((med, index) => (
									<View
										key={med.id}
										style={[styles.readOnlyMedCard, index > 0 && styles.medCardBorder]}
									>
										<View style={styles.medCardHeader}>
											<MaterialCommunityIcons
												name="pill"
												size={16}
												color="#1f5f68"
												style={{ marginRight: 6 }}
											/>
											<Text style={styles.medCardName}>{med.medication || 'Medication'}</Text>
										</View>
										<View style={styles.medCardDetails}>
											<Text style={styles.medCardDetailText}>
												<Text style={styles.boldLabel}>Frequency:</Text> {med.frequency || '—'}
											</Text>
											<Text style={styles.medCardDetailText}>
												<Text style={styles.boldLabel}>Total Tablets:</Text>{' '}
												{med.totalTablets || 0}
											</Text>
											<Text style={styles.medCardDetailText}>
												<Text style={styles.boldLabel}>Purchased:</Text>{' '}
												{med.purchasedTablets || 0}
											</Text>
										</View>
										{med.instructions ? (
											<Text style={styles.medCardInstructions}>Note: {med.instructions}</Text>
										) : null}
									</View>
								))}
							</View>
						)}
					</SectionCard>

					{/* Order Progress */}
					<SectionCard title="Order Progress">
						<View style={styles.timeline}>
							{TIMELINE_STEPS.map((step, idx) => {
								const completedKeys = getCompletedSteps(status)
								const done = completedKeys.includes(step.key)
								const isLast = idx === TIMELINE_STEPS.length - 1
								const isRejectedStep = status === 'rejected' && step.key === 'order_created'

								const stepColor = isRejectedStep ? '#E74B5B' : done ? '#1f5f68' : '#94A3B8'
								const stepBg = isRejectedStep ? '#FFE3E7' : done ? '#E8F5F5' : '#F1F5F9'
								const lineColor = done ? (status === 'rejected' ? '#E2E8F0' : '#1f5f68') : '#E2E8F0'

								return (
									<View key={step.key} style={styles.timelineStep}>
										{!isLast && (
											<View style={[styles.timelineLine, { backgroundColor: lineColor }]} />
										)}
										<View style={[styles.timelineDot, { backgroundColor: stepBg }]}>
											<MaterialCommunityIcons
												name={isRejectedStep ? 'close' : step.icon}
												size={14}
												color={stepColor}
											/>
										</View>
										<View style={{ flex: 1 }}>
											<Text
												style={[
													styles.timelineLabel,
													{
														color: done ? '#1A2C33' : '#94A3B8',
														fontWeight: done ? '600' : '400',
													},
												]}
											>
												{step.label}
											</Text>
											<Text style={styles.timelineStatus}>
												{done ? (isRejectedStep ? 'Rejected' : 'Completed') : 'Pending'}
											</Text>
										</View>
									</View>
								)
							})}
						</View>
					</SectionCard>
				</ScrollView>

				{/* Fullscreen Image Viewer */}
				<ImageViewerModal
					visible={imageViewerVisible}
					images={prescriptionImages}
					initialIndex={imageViewerIndex}
					onClose={() => setImageViewerVisible(false)}
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

	// ─── PHARMACIST PERSPECTIVE ───────────────────────────────────────────────
	return (
		<View style={styles.safeArea}>
			<ScrollView
				style={styles.container}
				showsVerticalScrollIndicator={false}
				contentContainerStyle={styles.content}
			>
				{/* Order Management */}
				<SectionCard title="Order Management">
					<View style={styles.currentStatusRow}>
						<View style={[styles.statusDot, { backgroundColor: currentStatusCfg.dot }]} />
						<Text style={styles.statusLabel}>Current Status:</Text>
						<View style={[styles.statusBadge, { backgroundColor: currentStatusCfg.bg }]}>
							<Text style={[styles.statusBadgeText, { color: currentStatusCfg.text }]}>
								{currentStatusCfg.label}
							</Text>
						</View>
					</View>

					<View pointerEvents={updatingStatus ? 'none' : 'auto'} style={{ marginBottom: 20 }}>
						<AppSelect
							placeholder="Choose status"
							options={STATUS_OPTIONS}
							value={status}
							onSelect={(val) => handleMarkStatus(val)}
							size="form"
							noMargin
							customCardStyle={{
								borderColor: currentStatusCfg.dot + '60',
								backgroundColor: currentStatusCfg.bg,
							}}
						/>
					</View>

					{/* Billing Input */}
					<View style={styles.billInputRow}>
						<Text style={styles.billInputLabel}>Final Bill Amount (₹):</Text>
						<View style={styles.billInputWrapper}>
							<View style={styles.billInputContainer}>
								<MaterialCommunityIcons
									name="currency-inr"
									size={18}
									color="#6B7A82"
									style={{ marginLeft: 10 }}
								/>
								<TextInput
									style={styles.billTextInput}
									keyboardType="numeric"
									value={billAmountInput}
									onChangeText={setBillAmountInput}
									placeholder="0.00"
									placeholderTextColor="#94A3B8"
								/>
							</View>
							<TouchableOpacity
								style={[styles.saveBillButton, updatingStatus && styles.saveBillButtonDisabled]}
								onPress={() => {
									const val = parseFloat(billAmountInput)
									if (isNaN(val) || val < 0) {
										setStatusModal({
											visible: true,
											status: 'error',
											title: 'Invalid Amount',
											description: 'Please enter a valid numeric bill amount.',
										})
										return
									}
									handleMarkStatus(status, val)
								}}
								disabled={updatingStatus}
								activeOpacity={0.8}
							>
								<Text style={styles.saveBillButtonText}>Save Bill</Text>
							</TouchableOpacity>
						</View>
					</View>

					{/* Rejection Reason */}
					{status === 'rejected' && (
						<View style={styles.rejectionReasonBox}>
							<Text style={styles.rejectionReasonLabel}>Rejection Reason:</Text>
							<TextInput
								style={styles.rejectionReasonInput}
								value={rejectionReasonInput}
								onChangeText={setRejectionReasonInput}
								placeholder="Provide rejection feedback"
								placeholderTextColor="#94A3B8"
								onBlur={() => {
									handleMarkStatus('rejected', null, rejectionReasonInput)
								}}
							/>
						</View>
					)}
				</SectionCard>

				{/* Patient & Prescriber Profile */}
				<View style={styles.card}>
					<View style={styles.cardTitleRow}>
						<Text style={styles.cardTitle}>Patient & Prescriber Profile</Text>
					</View>

					<View style={styles.patientProfileHeader}>
						<View style={styles.avatarWrap}>
							{patient.avatarUrl ? (
								<Image source={{ uri: patient.avatarUrl }} style={styles.avatarImage} />
							) : (
								<Text style={styles.avatarText}>{patient.name.charAt(0).toUpperCase()}</Text>
							)}
						</View>
						<View style={{ flex: 1 }}>
							<View style={styles.nameRow}>
								<Text style={styles.patientName}>{patient.name}</Text>
								<View
									style={[
										styles.allergyBadge,
										{ backgroundColor: patient.allergies !== 'NKA' ? '#FFE4E2' : '#E8F5E9' },
									]}
								>
									<Text
										style={[
											styles.allergyText,
											{ color: patient.allergies !== 'NKA' ? '#D32F2F' : '#2E7D32' },
										]}
									>
										{patient.allergies !== 'NKA' ? patient.allergies : 'No Allergies'}
									</Text>
								</View>
							</View>
							<Text style={styles.patientSubText}>
								{patient.gender} • {patient.age} years • {patient.weight} • {patient.bloodGroup}
							</Text>
						</View>
					</View>

					<View style={styles.profileDivider} />

					<View
						style={[isTablet || isLandscape ? styles.profileDetailsGrid : styles.profileDetailsGridStacked]}
					>
						<View style={styles.profileDetailsColumn}>
							<Text style={styles.profileSectionTitle}>Patient Contact</Text>
							<InfoRow icon="phone-outline" value={patient.phone} />
						</View>
						<View
							style={[
								styles.profileDetailsColumn,
								isTablet || isLandscape ? styles.borderLeft : styles.borderTop,
							]}
						>
							<Text style={styles.profileSectionTitle}>Prescribing Clinic</Text>
							<InfoRow icon="hospital-building" value={clinic.name} />
							<InfoRow icon="doctor" value={`Dr. ${clinic.doctor}`} />
							<InfoRow icon="phone-outline" value={clinic.phone} />
						</View>
					</View>

					<View style={styles.profileActionsRow}>
						<TouchableOpacity
							style={[styles.profileCallBtn, { backgroundColor: '#2E7C86' }]}
							onPress={() => handleCall(patient.phone, 'patient')}
						>
							<MaterialCommunityIcons name="phone" size={14} color="#fff" />
							<Text style={styles.profileCallBtnText}>Call Patient</Text>
						</TouchableOpacity>
						<TouchableOpacity
							style={[styles.profileCallBtn, { backgroundColor: '#5C6BC0' }]}
							onPress={() => handleCall(clinic.phone, 'clinic')}
						>
							<MaterialCommunityIcons name="phone" size={14} color="#fff" />
							<Text style={styles.profileCallBtnText}>Call Clinic</Text>
						</TouchableOpacity>
					</View>
				</View>

				{/* Prescription Document */}
				<SectionCard title="Prescription Document">
					{orderData?.notes ? (
						<View style={styles.notesBox}>
							<Text style={styles.notesLabel}>Notes / Request:</Text>
							<Text style={styles.notesText}>{orderData.notes}</Text>
						</View>
					) : null}
					<PrescriptionCarousel images={prescriptionImages} onImagePress={openImageViewer} />
				</SectionCard>

				{/* Status History Timeline */}
				<SectionCard title="Status History">
					<View style={styles.timeline}>
						{TIMELINE_STEPS.map((step, idx) => {
							const completedKeys = getCompletedSteps(status)
							const done = completedKeys.includes(step.key)
							const isLast = idx === TIMELINE_STEPS.length - 1
							const isRejectedStep = status === 'rejected' && step.key === 'order_created'

							const stepColor = isRejectedStep ? '#E74B5B' : done ? '#2E7C86' : '#94A3B8'
							const stepBg = isRejectedStep ? '#FFE3E7' : done ? '#E0F2F1' : '#F1F5F9'
							const lineColor = done ? (status === 'rejected' ? '#E2E8F0' : '#2E7C86') : '#E2E8F0'

							return (
								<View key={step.key} style={styles.timelineStep}>
									{!isLast && <View style={[styles.timelineLine, { backgroundColor: lineColor }]} />}
									<View style={[styles.timelineDot, { backgroundColor: stepBg }]}>
										<MaterialCommunityIcons
											name={isRejectedStep ? 'close' : step.icon}
											size={14}
											color={stepColor}
										/>
									</View>
									<View style={{ flex: 1 }}>
										<Text
											style={[
												styles.timelineLabel,
												{
													color: done ? '#1A2C33' : '#94A3B8',
													fontWeight: done ? '600' : '400',
												},
											]}
										>
											{step.label}
										</Text>
										<Text style={styles.timelineStatus}>
											{done ? (isRejectedStep ? 'Rejected' : 'Completed') : 'Pending'}
										</Text>
									</View>
								</View>
							)
						})}
					</View>
				</SectionCard>
			</ScrollView>

			{/* Fullscreen Image Viewer */}
			<ImageViewerModal
				visible={imageViewerVisible}
				images={prescriptionImages}
				initialIndex={imageViewerIndex}
				onClose={() => setImageViewerVisible(false)}
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

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
	safeArea: { flex: 1, backgroundColor: '#F4F6F8' },
	container: { flex: 1 },
	content: { padding: 16, paddingBottom: 48 },
	centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
	loadingText: { marginTop: 12, color: '#6B7A82', fontSize: 14 },
	errorText: { marginTop: 12, color: '#1A2C33', fontSize: 14, textAlign: 'center' },
	retryButton: {
		marginTop: 16,
		backgroundColor: '#2E7C86',
		paddingHorizontal: 24,
		paddingVertical: 10,
		borderRadius: 8,
	},
	retryText: { color: '#fff', fontWeight: '600' },
	card: {
		backgroundColor: '#fff',
		borderRadius: 14,
		padding: 16,
		marginBottom: 14,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.06,
		shadowRadius: 8,
		elevation: 2,
	},
	cardTitle: { fontSize: 14, fontWeight: '700', color: '#1A2C33', marginBottom: 12 },
	cardTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
	avatarWrap: {
		width: 64,
		height: 64,
		borderRadius: 14,
		backgroundColor: '#2E7C86',
		alignItems: 'center',
		justifyContent: 'center',
		borderWidth: 2,
		borderColor: '#E0F2F1',
		overflow: 'hidden',
		flexShrink: 0,
	},
	avatarText: { color: '#fff', fontSize: 26, fontWeight: '700' },
	avatarImage: { width: 64, height: 64 },
	nameRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginBottom: 8 },
	patientName: { fontSize: 16, fontWeight: '700', color: '#1A2C33' },
	allergyBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
	allergyText: { fontSize: 11, fontWeight: '600' },
	infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
	infoLabel: { fontSize: 12, color: '#6B7A82', marginLeft: 6 },
	infoValue: { fontSize: 13, color: '#1A2C33', fontWeight: '500', marginLeft: 4, flex: 1 },
	callButton: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		backgroundColor: '#2E7C86',
		paddingHorizontal: 14,
		paddingVertical: 8,
		borderRadius: 22,
		alignSelf: 'flex-start',
		marginTop: 8,
	},
	callButtonText: { color: '#fff', fontSize: 12, fontWeight: '700' },
	currentStatusRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 8 },
	statusDot: { width: 10, height: 10, borderRadius: 5 },
	statusLabel: { fontSize: 13, color: '#6B7A82' },
	statusBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 6 },
	statusBadgeText: { fontSize: 12, fontWeight: '700' },
	statusDotSmall: { width: 8, height: 8, borderRadius: 4 },
	timeline: { paddingLeft: 4 },
	timelineStep: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14, position: 'relative' },
	timelineLine: { position: 'absolute', left: 13, top: 28, width: 2, height: 20, zIndex: 0 },
	timelineDot: {
		width: 28,
		height: 28,
		borderRadius: 14,
		alignItems: 'center',
		justifyContent: 'center',
		marginRight: 10,
		zIndex: 1,
	},
	timelineLabel: { fontSize: 13 },
	timelineStatus: { fontSize: 11, color: '#94A3B8' },
	emptyText: { color: '#94A3B8', fontSize: 13, textAlign: 'center', paddingVertical: 16 },
	addBtn: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
		backgroundColor: '#2E7C86',
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 8,
	},
	addBtnText: { color: '#fff', fontSize: 12, fontWeight: '600' },
	savingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
	savingText: { fontSize: 12, color: '#6B7A82' },
	rejectionBanner: {
		flexDirection: 'row',
		backgroundColor: '#FFEAEA',
		borderRadius: 12,
		padding: 16,
		marginBottom: 16,
		alignItems: 'center',
		gap: 12,
		borderWidth: 1,
		borderColor: '#FFCDD2',
	},
	rejectionBannerTitle: { fontSize: 14, fontWeight: '700', color: '#C62828', marginBottom: 2 },
	rejectionBannerText: { fontSize: 13, color: '#D32F2F' },
	summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 16 },
	summaryItem: { width: '45%', marginBottom: 12 },
	summaryLabel: { fontSize: 11, color: '#6B7A82', marginBottom: 4 },
	summaryValue: { fontSize: 14, fontWeight: '600', color: '#1A2C33' },
	billEmphasis: { color: '#2E7C86', fontSize: 16, fontWeight: '700' },
	badgeStyle: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 6,
		alignSelf: 'flex-start',
	},
	badgeHome: { backgroundColor: '#E8EFFF' },
	badgePickup: { backgroundColor: '#E8F5E9' },
	badgeStyleText: { fontSize: 11, fontWeight: '700' },
	addressSummaryBox: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
	addressBadgeHeader: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
	addressBadgeText: { fontSize: 12, fontWeight: '700', color: '#4A5B62' },
	addressDetailsText: { fontSize: 12, color: '#6B7A82', lineHeight: 18 },
	pharmacyHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
	pharmacyName: { fontSize: 14, fontWeight: '700', color: '#1A2C33', marginBottom: 4 },
	pharmacyAddress: { fontSize: 12, color: '#6B7A82', lineHeight: 18 },
	notesBox: {
		backgroundColor: '#F8FCFC',
		borderWidth: 1,
		borderColor: '#E2E8F0',
		borderRadius: 12,
		padding: 12,
		marginBottom: 12,
	},
	notesLabel: { fontSize: 12, fontWeight: '700', color: '#2E7C86', marginBottom: 4 },
	notesText: { fontSize: 13, color: '#4A5B62', lineHeight: 18 },
	readOnlyMedList: { gap: 12 },
	readOnlyMedCard: { paddingVertical: 8 },
	medCardBorder: { borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 12 },
	medCardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
	medCardName: { fontSize: 14, fontWeight: '700', color: '#1A2C33' },
	medCardDetails: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
	medCardDetailText: { fontSize: 12, color: '#6B7A82' },
	boldLabel: { fontWeight: '600', color: '#4A5B62' },
	medCardInstructions: {
		fontSize: 12,
		fontStyle: 'italic',
		color: '#2E7C86',
		marginTop: 6,
		backgroundColor: '#F0F9F9',
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 4,
		alignSelf: 'flex-start',
	},
	billInputRow: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
	billInputLabel: { fontSize: 13, fontWeight: '600', color: '#4A5B62', marginBottom: 8 },
	billInputWrapper: { flexDirection: 'row', gap: 10 },
	billTextInput: {
		flex: 1,
		height: 40,
		paddingHorizontal: 12,
		fontSize: 14,
		color: '#1A2C33',
	},
	saveBillButton: {
		backgroundColor: '#2E7C86',
		paddingHorizontal: 16,
		justifyContent: 'center',
		borderRadius: 8,
	},
	saveBillButtonDisabled: { backgroundColor: '#A3D1D5' },
	saveBillButtonText: { color: '#FFF', fontSize: 13, fontWeight: '700' },
	rejectionReasonBox: { marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
	rejectionReasonLabel: { fontSize: 13, fontWeight: '600', color: '#C62828', marginBottom: 6 },
	rejectionReasonInput: {
		backgroundColor: '#FFF',
		borderWidth: 1,
		borderColor: '#FFCDD2',
		borderRadius: 8,
		paddingHorizontal: 12,
		paddingVertical: 8,
		fontSize: 13,
		color: '#1A2C33',
		minHeight: 40,
	},
	billInputContainer: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#FFF',
		borderWidth: 1,
		borderColor: '#E2E8F0',
		borderRadius: 8,
		height: 40,
	},
	receiptHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
	receiptOrderNo: { fontSize: 16, fontWeight: '700', color: '#1A2C33' },
	receiptDate: { fontSize: 12, color: '#6B7A82', marginTop: 2 },
	receiptDivider: {
		borderWidth: 0.5,
		borderColor: '#CBD5E1',
		borderStyle: 'dashed',
		marginVertical: 12,
		height: 0,
	},
	patientProfileHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
	patientSubText: { fontSize: 12, color: '#6B7A82', marginTop: 2 },
	profileDivider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 12 },
	profileDetailsGrid: { flexDirection: 'row', justifyContent: 'space-between', gap: 16, marginBottom: 14 },
	profileDetailsGridStacked: { flexDirection: 'column', gap: 12, marginBottom: 14 },
	profileDetailsColumn: { flex: 1 },
	borderLeft: { borderLeftWidth: 1, borderLeftColor: '#F1F5F9', paddingLeft: 16 },
	borderTop: { borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 12 },
	profileSectionTitle: {
		fontSize: 12,
		fontWeight: '700',
		color: '#2E7C86',
		marginBottom: 8,
		textTransform: 'uppercase',
		letterSpacing: 0.5,
	},
	profileActionsRow: { flexDirection: 'row', gap: 10, marginTop: 6 },
	profileCallBtn: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 6,
		paddingVertical: 10,
		borderRadius: 20,
	},
	profileCallBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
})

const scrollTableStyles = StyleSheet.create({
	imageKeyInfo: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 10,
		gap: 6,
	},
	imageKeyText: {
		fontSize: 13,
		color: '#1f5f68',
		fontWeight: '500',
	},
})

export default PharmacyOrderDetailsPage
