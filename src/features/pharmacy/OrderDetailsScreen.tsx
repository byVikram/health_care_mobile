// screens/pharmacy/OrderDetailsScreen.tsx
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import {
	View,
	Text,
	StyleSheet,
	ScrollView,
	TouchableOpacity,
	Linking,
	Alert,
	SafeAreaView,
	ActivityIndicator,
	TextInput,
	Image,
	FlatList,
	useWindowDimensions,
	Modal,
} from 'react-native'
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native'
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'
import AppHeader from '../../components/common/AppHeader'
import { getPharmacyOrderById, updatePharmacyOrderStatus } from '../profile/pharmacy/pharmacyService'
import { ROUTES } from '../../navigation/routes'

// ─── S3 Config (optional – replace with your actual base URL if needed) ──────
const S3_BASE_URL = process.env.REACT_APP_S3_BASE_URL || ''

const buildS3Url = (key?: string | null): string | null => {
	if (!key || !S3_BASE_URL) return null
	return `${S3_BASE_URL.replace(/\/$/, '')}/${key.replace(/^\//, '')}`
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
	}
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

const STATUS_ACTIONS = ['packed', 'collected', 'rejected'] as const

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

// ─── Mock API for medicines (prevents unauthorized errors) ───────────────────
const updatePharmacyOrderMedicines = async (orderId: string, medicines: MedicineRow[]) => {
	console.log('[MOCK] Saving medicines for order', orderId, medicines)
	await new Promise((resolve) => setTimeout(resolve, 500))
	return { success: true }
}

// ─── Prescription Carousel ────────────────────────────────────────────────────
const PrescriptionCarousel = ({ images }: { images: string[] }) => {
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
				renderItem={({ item }) => (
					<Image source={{ uri: item }} style={{ width: imageWidth, height: '100%' }} resizeMode="contain" />
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
		height: 240,
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

// ─── Status Dropdown Component (Modal based, anchored) ────────────────────────
interface StatusDropdownProps {
	currentStatus: string
	onSelectStatus: (status: string) => void
	disabled: boolean
}

const StatusDropdown: React.FC<StatusDropdownProps> = ({ currentStatus, onSelectStatus, disabled }) => {
	const [modalVisible, setModalVisible] = useState(false)
	const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0, width: 0 })
	const buttonRef = useRef<View>(null)
	const currentConfig = STATUS_CONFIG[currentStatus] || STATUS_CONFIG.pending

	const openMenu = () => {
		if (disabled) return
		buttonRef.current?.measureInWindow((x, y, width, height) => {
			setMenuPosition({
				top: y + height + 4,
				left: x,
				width: width,
			})
			setModalVisible(true)
		})
	}

	const handleSelect = (status: string) => {
		setModalVisible(false)
		onSelectStatus(status)
	}

	return (
		<>
			<View ref={buttonRef} collapsable={false}>
				<TouchableOpacity
					style={styles.dropdownButton}
					onPress={openMenu}
					disabled={disabled}
					activeOpacity={0.7}
				>
					<View style={styles.dropdownButtonContent}>
						<View style={[styles.statusDotSmall, { backgroundColor: currentConfig.dot }]} />
						<Text style={styles.dropdownButtonText}>Status: {currentConfig.label}</Text>
						<MaterialCommunityIcons name="chevron-down" size={20} color="#4A5B62" />
					</View>
				</TouchableOpacity>
			</View>

			<Modal
				visible={modalVisible}
				transparent
				animationType="fade"
				onRequestClose={() => setModalVisible(false)}
			>
				<TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setModalVisible(false)}>
					<View
						style={[
							styles.dropdownMenu,
							{
								top: menuPosition.top,
								left: menuPosition.left,
								width: menuPosition.width,
							},
						]}
					>
						{STATUS_ACTIONS.map((status) => {
							const config = STATUS_CONFIG[status]
							const isActive = currentStatus === status
							return (
								<TouchableOpacity
									key={status}
									style={[styles.dropdownItem, isActive && styles.dropdownItemActive]}
									onPress={() => handleSelect(status)}
								>
									<View style={[styles.statusDotSmall, { backgroundColor: config.dot }]} />
									<Text style={[styles.dropdownItemText, isActive && styles.dropdownItemTextActive]}>
										{config.label}
									</Text>
									{isActive && <MaterialCommunityIcons name="check" size={18} color={config.dot} />}
								</TouchableOpacity>
							)
						})}
					</View>
				</TouchableOpacity>
			</Modal>
		</>
	)
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
const OrderDetailsScreen = () => {
	const navigation = useNavigation()
	const route = useRoute<RouteProp<RootStackParamList, 'OrderDetails'>>()
	const { width: screenWidth, height: screenHeight } = useWindowDimensions()

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

	// Fetch order
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
		} catch (err: any) {
			setError(err?.message || 'Failed to load order details')
		} finally {
			setLoading(false)
		}
	}, [orderId])

	useEffect(() => {
		fetchOrder()
	}, [fetchOrder])

	// Save medicines (mock)
	const saveMedicines = useCallback(
		async (rows: MedicineRow[]) => {
			if (!orderData) return
			setSavingMedicines(true)
			try {
				await updatePharmacyOrderMedicines(orderData.id, rows)
			} catch (err: any) {
				Alert.alert('Error', err?.message || 'Failed to save medicines')
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

	// Derived data
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

	// Status update
	const handleMarkStatus = async (newStatus: string) => {
		if (!orderData) return
		setUpdatingStatus(true)
		try {
			await updatePharmacyOrderStatus(orderData.id, newStatus)
			setStatus(newStatus)
			setOrderData((prev) => (prev ? { ...prev, status: newStatus } : prev))
			Alert.alert('Status Updated', `Order marked as ${STATUS_CONFIG[newStatus]?.label || newStatus}`)
		} catch (err: any) {
			Alert.alert('Error', err?.message || 'Failed to update status')
		} finally {
			setUpdatingStatus(false)
		}
	}

	const handleCall = (phone: string, label: string) => {
		const cleaned = phone.replace(/\s/g, '')
		if (!cleaned || cleaned === '—') {
			Alert.alert('Unavailable', `No phone number on file for ${label}.`)
			return
		}
		Linking.openURL(`tel:${cleaned}`).catch(() => Alert.alert('Error', 'Unable to open phone dialer.'))
	}

	// Responsive Pharmacy Entry Form (kept as in original, but useResponsiveFlex logic)
	const renderPharmacyEntryForm = () => {
		const useResponsiveFlex = isTablet || isLandscape
		if (useResponsiveFlex) {
			return (
				<View style={styles.card}>
					<View style={styles.cardTitleRow}>
						<Text style={styles.cardTitle}>Pharmacy Entry Form</Text>
						<TouchableOpacity style={styles.addBtn} onPress={addMedicineRow}>
							<MaterialCommunityIcons name="plus" size={14} color="#fff" />
							<Text style={styles.addBtnText}>Add Medicine</Text>
						</TouchableOpacity>
					</View>
					<View style={flexTableStyles.tableContainer}>
						<View style={flexTableStyles.headerRow}>
							<Text style={[flexTableStyles.headerCell, flexTableStyles.medicationCell]}>Medication</Text>
							<Text style={[flexTableStyles.headerCell, flexTableStyles.frequencyCell]}>Frequency</Text>
							<Text style={[flexTableStyles.headerCell, flexTableStyles.totalCell]}>Total Tabs</Text>
							<Text style={[flexTableStyles.headerCell, flexTableStyles.purchasedCell]}>Purchased</Text>
							<Text style={[flexTableStyles.headerCell, flexTableStyles.instructionsCell]}>
								Instructions
							</Text>
							<Text style={[flexTableStyles.headerCell, flexTableStyles.deleteCell]}> </Text>
						</View>
						{medicineRows.map((row) => (
							<View key={row.id} style={flexTableStyles.row}>
								<TextInput
									style={[flexTableStyles.cellInput, flexTableStyles.medicationCell]}
									value={row.medication}
									placeholder="e.g., Augmentin 625mg"
									placeholderTextColor="#94A3B8"
									onChangeText={(v) => updateMedicineField(row.id, 'medication', v)}
									onBlur={handleMedicineBlur}
								/>
								<TextInput
									style={[flexTableStyles.cellInput, flexTableStyles.frequencyCell]}
									value={row.frequency}
									placeholder="e.g., 1-0-1"
									placeholderTextColor="#94A3B8"
									onChangeText={(v) => updateMedicineField(row.id, 'frequency', v)}
									onBlur={handleMedicineBlur}
								/>
								<TextInput
									style={[flexTableStyles.cellInput, flexTableStyles.totalCell]}
									value={String(row.totalTablets)}
									keyboardType="numeric"
									placeholder="0"
									placeholderTextColor="#94A3B8"
									onChangeText={(v) => updateMedicineField(row.id, 'totalTablets', parseInt(v) || 0)}
									onBlur={handleMedicineBlur}
								/>
								<TextInput
									style={[flexTableStyles.cellInput, flexTableStyles.purchasedCell]}
									value={String(row.purchasedTablets)}
									keyboardType="numeric"
									placeholder="0"
									placeholderTextColor="#94A3B8"
									onChangeText={(v) =>
										updateMedicineField(row.id, 'purchasedTablets', parseInt(v) || 0)
									}
									onBlur={handleMedicineBlur}
								/>
								<TextInput
									style={[flexTableStyles.cellInput, flexTableStyles.instructionsCell]}
									value={row.instructions}
									placeholder="e.g., After food"
									placeholderTextColor="#94A3B8"
									onChangeText={(v) => updateMedicineField(row.id, 'instructions', v)}
									onBlur={handleMedicineBlur}
								/>
								<TouchableOpacity
									style={flexTableStyles.deleteButton}
									onPress={() => removeMedicineRow(row.id)}
								>
									<MaterialCommunityIcons name="trash-can-outline" size={20} color="#E74B5B" />
								</TouchableOpacity>
							</View>
						))}
					</View>
					{medicineRows.length === 0 && (
						<Text style={styles.emptyText}>No medicines added. Click "Add Medicine" to start.</Text>
					)}
					{savingMedicines && (
						<View style={styles.savingRow}>
							<ActivityIndicator size="small" color="#2E7C86" />
							<Text style={styles.savingText}>Saving…</Text>
						</View>
					)}
				</View>
			)
		} else {
			const colWidths = {
				medication: 150,
				frequency: 95,
				total: 85,
				purchased: 95,
				instructions: 130,
				delete: 50,
			}
			return (
				<View style={styles.card}>
					<View style={styles.cardTitleRow}>
						<Text style={styles.cardTitle}>Pharmacy Entry Form</Text>
						<TouchableOpacity style={styles.addBtn} onPress={addMedicineRow}>
							<MaterialCommunityIcons name="plus" size={14} color="#fff" />
							<Text style={styles.addBtnText}>Add Medicine</Text>
						</TouchableOpacity>
					</View>
					<ScrollView horizontal showsHorizontalScrollIndicator={true}>
						<View style={scrollTableStyles.tableContainer}>
							<View style={scrollTableStyles.headerRow}>
								<Text style={[scrollTableStyles.headerCell, { width: colWidths.medication }]}>
									Medication
								</Text>
								<Text style={[scrollTableStyles.headerCell, { width: colWidths.frequency }]}>
									Frequency
								</Text>
								<Text style={[scrollTableStyles.headerCell, { width: colWidths.total }]}>
									Total Tabs
								</Text>
								<Text style={[scrollTableStyles.headerCell, { width: colWidths.purchased }]}>
									Purchased
								</Text>
								<Text style={[scrollTableStyles.headerCell, { width: colWidths.instructions }]}>
									Instructions
								</Text>
								<Text style={[scrollTableStyles.headerCell, { width: colWidths.delete }]}> </Text>
							</View>
							{medicineRows.map((row) => (
								<View key={row.id} style={scrollTableStyles.row}>
									<TextInput
										style={[scrollTableStyles.cellInput, { width: colWidths.medication }]}
										value={row.medication}
										placeholder="e.g., Augmentin 625mg"
										placeholderTextColor="#94A3B8"
										onChangeText={(v) => updateMedicineField(row.id, 'medication', v)}
										onBlur={handleMedicineBlur}
									/>
									<TextInput
										style={[scrollTableStyles.cellInput, { width: colWidths.frequency }]}
										value={row.frequency}
										placeholder="e.g., 1-0-1"
										placeholderTextColor="#94A3B8"
										onChangeText={(v) => updateMedicineField(row.id, 'frequency', v)}
										onBlur={handleMedicineBlur}
									/>
									<TextInput
										style={[scrollTableStyles.cellInput, { width: colWidths.total }]}
										value={String(row.totalTablets)}
										keyboardType="numeric"
										placeholder="0"
										placeholderTextColor="#94A3B8"
										onChangeText={(v) =>
											updateMedicineField(row.id, 'totalTablets', parseInt(v) || 0)
										}
										onBlur={handleMedicineBlur}
									/>
									<TextInput
										style={[scrollTableStyles.cellInput, { width: colWidths.purchased }]}
										value={String(row.purchasedTablets)}
										keyboardType="numeric"
										placeholder="0"
										placeholderTextColor="#94A3B8"
										onChangeText={(v) =>
											updateMedicineField(row.id, 'purchasedTablets', parseInt(v) || 0)
										}
										onBlur={handleMedicineBlur}
									/>
									<TextInput
										style={[scrollTableStyles.cellInput, { width: colWidths.instructions }]}
										value={row.instructions}
										placeholder="e.g., After food"
										placeholderTextColor="#94A3B8"
										onChangeText={(v) => updateMedicineField(row.id, 'instructions', v)}
										onBlur={handleMedicineBlur}
									/>
									<TouchableOpacity
										style={scrollTableStyles.deleteButton}
										onPress={() => removeMedicineRow(row.id)}
									>
										<MaterialCommunityIcons name="trash-can-outline" size={20} color="#E74B5B" />
									</TouchableOpacity>
								</View>
							))}
						</View>
					</ScrollView>
					{medicineRows.length === 0 && (
						<Text style={styles.emptyText}>No medicines added. Click "Add Medicine" to start.</Text>
					)}
					{savingMedicines && (
						<View style={styles.savingRow}>
							<ActivityIndicator size="small" color="#2E7C86" />
							<Text style={styles.savingText}>Saving…</Text>
						</View>
					)}
				</View>
			)
		}
	}

	if (loading) {
		return (
			<SafeAreaView style={styles.safeArea}>
				<AppHeader variant="home" onAvatarPress={() => navigation.goBack()} />
				<View style={styles.centered}>
					<ActivityIndicator size="large" color="#2E7C86" />
					<Text style={styles.loadingText}>Loading order details…</Text>
				</View>
			</SafeAreaView>
		)
	}

	if (error) {
		return (
			<SafeAreaView style={styles.safeArea}>
				<AppHeader variant="home" onAvatarPress={() => navigation.goBack()} />
				<View style={styles.centered}>
					<MaterialCommunityIcons name="alert-circle-outline" size={48} color="#E74B5B" />
					<Text style={styles.errorText}>{error}</Text>
					<TouchableOpacity style={styles.retryButton} onPress={fetchOrder}>
						<Text style={styles.retryText}>Retry</Text>
					</TouchableOpacity>
				</View>
			</SafeAreaView>
		)
	}

	return (
		<SafeAreaView style={styles.safeArea}>
			<AppHeader variant="home" onAvatarPress={() => navigation.goBack()} />
			<ScrollView
				style={styles.container}
				showsVerticalScrollIndicator={false}
				contentContainerStyle={styles.content}
			>
				{/* Patient Details */}
				<SectionCard title="Patient Details">
					<View style={styles.patientHeader}>
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
							<View style={styles.statsGrid}>
								{[
									['Age / Gender', `${patient.age} / ${patient.gender}`],
									['Blood Group', patient.bloodGroup],
									['Weight', patient.weight],
									['Order Date', orderDate],
								].map(([label, val]) => (
									<View key={label} style={styles.statItem}>
										<Text style={styles.statLabel}>{label}</Text>
										<Text style={styles.statValue}>{val}</Text>
									</View>
								))}
							</View>
						</View>
					</View>
				</SectionCard>

				{/* Contact Cards */}
				<View style={[styles.twoCol, !isLandscape && !isTablet && styles.twoColStacked]}>
					<View style={[styles.card, styles.halfCard, !isLandscape && !isTablet && styles.fullWidthCard]}>
						<Text style={styles.cardTitle}>Patient Contact</Text>
						<InfoRow icon="phone-outline" value={patient.phone} />
						{patient.emergency !== '—' && (
							<View style={[styles.infoRow, { marginBottom: 8 }]}>
								<MaterialCommunityIcons name="alert-outline" size={14} color="#E57373" />
								<Text style={[styles.infoValue, { color: '#E57373', fontSize: 11 }]}>
									{' '}
									Emergency: {patient.emergency}
								</Text>
							</View>
						)}
						<TouchableOpacity
							style={styles.callButton}
							onPress={() => handleCall(patient.phone, 'patient')}
						>
							<MaterialCommunityIcons name="phone" size={14} color="#fff" />
							<Text style={styles.callButtonText}>Call Patient</Text>
						</TouchableOpacity>
					</View>
					<View style={[styles.card, styles.halfCard, !isLandscape && !isTablet && styles.fullWidthCard]}>
						<Text style={styles.cardTitle}>Clinic Info</Text>
						<InfoRow icon="hospital-building" value={clinic.name} />
						<InfoRow icon="doctor" value={clinic.doctor} />
						<InfoRow icon="phone-outline" value={clinic.phone} />
						<TouchableOpacity
							style={[styles.callButton, { backgroundColor: '#5C6BC0' }]}
							onPress={() => handleCall(clinic.phone, 'clinic')}
						>
							<MaterialCommunityIcons name="phone" size={14} color="#fff" />
							<Text style={styles.callButtonText}>Call Clinic</Text>
						</TouchableOpacity>
					</View>
				</View>

				{/* Prescription Notes */}
				<SectionCard title="Prescription Notes">
					<PrescriptionCarousel images={prescriptionImages} />
				</SectionCard>

				{/* Pharmacy Entry Form */}
				{renderPharmacyEntryForm()}

				{/* Order Status with anchored dropdown */}
				<SectionCard title="Order Status">
					<View style={styles.currentStatusRow}>
						<View style={[styles.statusDot, { backgroundColor: currentStatusCfg.dot }]} />
						<Text style={styles.statusLabel}>Current:</Text>
						<View style={[styles.statusBadge, { backgroundColor: currentStatusCfg.bg }]}>
							<Text style={[styles.statusBadgeText, { color: currentStatusCfg.text }]}>
								{currentStatusCfg.label}
							</Text>
						</View>
					</View>

					<StatusDropdown
						currentStatus={status}
						onSelectStatus={handleMarkStatus}
						disabled={updatingStatus}
					/>

					<View style={styles.timeline}>
						{TIMELINE_STEPS.map((step, idx) => {
							const completedKeys = getCompletedSteps(status)
							const done = completedKeys.includes(step.key)
							const isLast = idx === TIMELINE_STEPS.length - 1
							const isRejectedStep = status === 'rejected' && step.key === 'order_created'
							return (
								<View key={step.key} style={styles.timelineStep}>
									{!isLast && (
										<View
											style={[
												styles.timelineLine,
												{ backgroundColor: done ? '#2E7C86' : '#E2E8F0' },
											]}
										/>
									)}
									<View
										style={[styles.timelineDot, { backgroundColor: done ? '#E0F2F1' : '#F1F5F9' }]}
									>
										<MaterialCommunityIcons
											name={isRejectedStep ? 'close' : step.icon}
											size={14}
											color={done ? '#2E7C86' : '#94A3B8'}
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

				<TouchableOpacity
					style={styles.searchPharmacyButton}
					onPress={() => navigation.navigate(ROUTES.STACK.PHARMACY_SEARCH_PAGE as never)}
				>
					<MaterialCommunityIcons name="store-search" size={20} color="#fff" />
					<Text style={styles.searchPharmacyButtonText}>Go To Pharmacy Search</Text>
				</TouchableOpacity>
			</ScrollView>
		</SafeAreaView>
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
	patientHeader: { flexDirection: 'row', gap: 12 },
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
	statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
	statItem: { width: '45%' },
	statLabel: { fontSize: 11, color: '#6B7A82' },
	statValue: { fontSize: 13, fontWeight: '600', color: '#1A2C33' },
	twoCol: { flexDirection: 'row', marginBottom: 14 },
	twoColStacked: { flexDirection: 'column' },
	halfCard: { flex: 1, marginHorizontal: 6 },
	fullWidthCard: { width: '100%', marginHorizontal: 0, marginBottom: 8 },
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
	dropdownButton: {
		backgroundColor: '#F1F5F9',
		borderWidth: 1,
		borderColor: '#E2E8F0',
		borderRadius: 10,
		paddingVertical: 12,
		paddingHorizontal: 16,
		marginBottom: 20,
	},
	dropdownButtonContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
	dropdownButtonText: { fontSize: 14, fontWeight: '600', color: '#1A2C33', flex: 1, marginLeft: 8 },
	statusDotSmall: { width: 8, height: 8, borderRadius: 4 },
	modalOverlay: { flex: 1, backgroundColor: 'transparent' },
	dropdownMenu: {
		position: 'absolute',
		backgroundColor: '#fff',
		borderRadius: 12,
		borderWidth: 1,
		borderColor: '#E2E8F0',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.1,
		shadowRadius: 8,
		elevation: 5,
		paddingVertical: 4,
	},
	dropdownItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, gap: 12 },
	dropdownItemActive: { backgroundColor: '#F0F9F9' },
	dropdownItemText: { fontSize: 14, color: '#1A2C33', flex: 1 },
	dropdownItemTextActive: { fontWeight: '600' },
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
	searchPharmacyButton: {
		backgroundColor: '#2E7C86',
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 14,
		borderRadius: 12,
		marginBottom: 14,
		gap: 8,
	},
	searchPharmacyButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
})

const flexTableStyles = StyleSheet.create({
	tableContainer: {
		backgroundColor: '#F8FCFC',
		borderRadius: 12,
		borderWidth: 1,
		borderColor: '#E2E8F0',
		paddingVertical: 8,
	},
	headerRow: {
		flexDirection: 'row',
		borderBottomWidth: 1,
		borderBottomColor: '#E2E8F0',
		paddingBottom: 8,
		marginBottom: 8,
		paddingHorizontal: 12,
	},
	headerCell: { fontSize: 12, fontWeight: '700', color: '#2E7C86' },
	medicationCell: { flex: 2.5 },
	frequencyCell: { flex: 1.2 },
	totalCell: { flex: 0.8 },
	purchasedCell: { flex: 0.9 },
	instructionsCell: { flex: 1.8 },
	deleteCell: { flex: 0.4, alignItems: 'center' },
	row: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: 6,
		paddingHorizontal: 12,
		borderBottomWidth: 1,
		borderBottomColor: '#F1F5F9',
	},
	cellInput: {
		fontSize: 13,
		color: '#1A2C33',
		paddingVertical: 8,
		paddingHorizontal: 6,
		backgroundColor: '#FFFFFF',
		borderRadius: 6,
		borderWidth: 1,
		borderColor: '#E2E8F0',
		marginRight: 8,
	},
	deleteButton: { flex: 0.4, alignItems: 'center', justifyContent: 'center' },
})

const scrollTableStyles = StyleSheet.create({
	tableContainer: {
		backgroundColor: '#F8FCFC',
		borderRadius: 12,
		borderWidth: 1,
		borderColor: '#E2E8F0',
		paddingVertical: 8,
	},
	headerRow: {
		flexDirection: 'row',
		borderBottomWidth: 1,
		borderBottomColor: '#E2E8F0',
		paddingBottom: 8,
		marginBottom: 8,
		paddingHorizontal: 12,
	},
	headerCell: { fontSize: 12, fontWeight: '700', color: '#2E7C86', marginRight: 8 },
	row: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: 6,
		paddingHorizontal: 12,
		borderBottomWidth: 1,
		borderBottomColor: '#F1F5F9',
	},
	cellInput: {
		fontSize: 13,
		color: '#1A2C33',
		paddingVertical: 8,
		paddingHorizontal: 6,
		backgroundColor: '#FFFFFF',
		borderRadius: 6,
		borderWidth: 1,
		borderColor: '#E2E8F0',
		marginRight: 8,
	},
	deleteButton: { width: 50, alignItems: 'center', justifyContent: 'center' },
})

export default OrderDetailsScreen
