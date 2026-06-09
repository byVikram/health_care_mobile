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
	Image,
	FlatList,
	useWindowDimensions,
} from 'react-native'
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native'
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'
// import AppHeader from '../../components/common/AppHeader'
import { getPharmacyOrderById, updatePharmacyOrderStatus } from '../profile/pharmacy/pharmacyService'
import { ROUTES } from '../../navigation/routes'

import prescriptionImage from '../../assets/Pharmacy/Prescription.svg'

const S3_BASE_URL = process.env.REACT_APP_S3_BASE_URL || 'https://your-s3-bucket.s3.amazonaws.com'

const buildS3Url = (key?: string | null): string | null => {
	if (!key || !S3_BASE_URL) return null
	return `${S3_BASE_URL.replace(/\/$/, '')}/${key.replace(/^\//, '')}`
}

// ============================================================
// TYPES
// ============================================================
interface OrderData {
	id: string
	status: string
	bill_amount?: number
	created_at?: string
	delivery_type?: string
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

// ============================================================
// STATUS CONFIGURATION (for dropdown)
// ============================================================
const STATUS_CONFIG: Record<string, { bg: string; text: string; dot: string; label: string; border: string }> = {
	pending: { bg: '#FFF8EC', text: '#D97706', dot: '#D97706', label: 'Pending', border: '#FDE68A' },
	processing: { bg: '#EFF6FF', text: '#2563EB', dot: '#2563EB', label: 'Processing', border: '#BFDBFE' },
	verified: { bg: '#F0FDF4', text: '#16A34A', dot: '#16A34A', label: 'Verified', border: '#BBF7D0' },
	packed: { bg: '#F0FDF4', text: '#16A34A', dot: '#16A34A', label: 'Packed', border: '#BBF7D0' },
	collected: { bg: '#F0FDF4', text: '#16A34A', dot: '#16A34A', label: 'Collected', border: '#BBF7D0' },
	rejected: { bg: '#FFF1F2', text: '#E11D48', dot: '#E11D48', label: 'Rejected', border: '#FECDD3' },
}

const STATUS_OPTIONS = [
	{ value: 'pending', label: 'Pending', icon: 'clock-outline' },
	{ value: 'processing', label: 'Processing', icon: 'cog-outline' },
	{ value: 'verified', label: 'Verified', icon: 'check-circle-outline' },
	{ value: 'packed', label: 'Packed', icon: 'package-variant-closed' },
	{ value: 'collected', label: 'Collected', icon: 'check-all' },
	{ value: 'rejected', label: 'Rejected', icon: 'close-circle-outline' },
]

// ============================================================
// TIMELINE CONFIGURATION
// ============================================================
interface TimelineStep {
	key: string
	label: string
	icon: string
}

const TIMELINE_STEPS: TimelineStep[] = [
	{ key: 'order_created', label: 'Order Created', icon: 'clipboard-text-outline' },
	{ key: 'prescription_verified', label: 'Prescription Verified', icon: 'file-check-outline' },
	{ key: 'packed', label: 'Packed', icon: 'package-variant-closed' },
	{ key: 'collected', label: 'Collected', icon: 'check-all' },
]

const getCompletedSteps = (status: string): string[] => {
	switch (status) {
		case 'pending':
			return ['order_created']
		case 'processing':
			return ['order_created']
		case 'verified':
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

// ============================================================
// PRESCRIPTION CAROUSEL (Web‑style: single image with arrows + counter)
// ============================================================
const PrescriptionCarousel = ({ images }: { images: string[] }) => {
	const [activeIndex, setActiveIndex] = useState(0)
	const [imageErrors, setImageErrors] = useState<Record<number, boolean>>({})

	useEffect(() => {
		setActiveIndex(0)
		setImageErrors({})
	}, [images])

	const goPrevious = () => {
		setActiveIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1))
	}

	const goNext = () => {
		setActiveIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1))
	}

	const handleImageError = () => {
		setImageErrors((prev) => ({ ...prev, [activeIndex]: true }))
	}

	if (!images.length) {
		return (
			<View style={carouselStyles.emptyContainer}>
				<View style={carouselStyles.emptyIcon}>
					<MaterialCommunityIcons name="file-image-outline" size={32} color="#9CA3AF" />
				</View>
				<Text style={carouselStyles.emptyText}>No prescription images</Text>
			</View>
		)
	}

	const currentImageUrl = images[activeIndex]
	const hasError = imageErrors[activeIndex]

	return (
		<View style={carouselStyles.container}>
			<TouchableOpacity
				activeOpacity={0.9}
				onPress={() => Alert.alert('Preview', 'Full screen image viewer would open here')}
			>
				{hasError ? (
					<View style={carouselStyles.errorContainer}>
						<MaterialCommunityIcons name="image-broken-variant" size={48} color="#CBD5E1" />
						<Text style={carouselStyles.errorText}>Failed to load image</Text>
					</View>
				) : (
					<Image
						source={{ uri: currentImageUrl }}
						style={carouselStyles.image}
						resizeMode="contain"
						onError={handleImageError}
					/>
				)}
			</TouchableOpacity>

			{images.length > 1 && (
				<>
					<TouchableOpacity style={[carouselStyles.arrow, carouselStyles.arrowLeft]} onPress={goPrevious}>
						<MaterialCommunityIcons name="chevron-left" size={24} color="#1F2937" />
					</TouchableOpacity>
					<TouchableOpacity style={[carouselStyles.arrow, carouselStyles.arrowRight]} onPress={goNext}>
						<MaterialCommunityIcons name="chevron-right" size={24} color="#1F2937" />
					</TouchableOpacity>
					<View style={carouselStyles.counterChip}>
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
		minHeight: 240,
		justifyContent: 'center',
		alignItems: 'center',
		padding: 8,
	},
	image: {
		width: '100%',
		maxHeight: 260,
		aspectRatio: 16 / 9,
	},
	emptyContainer: {
		height: 200,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#F8FCFC',
		borderRadius: 12,
		borderWidth: 1,
		borderColor: '#E2E8F0',
		borderStyle: 'dashed',
		gap: 8,
		padding: 16,
	},
	emptyIcon: {
		width: 56,
		height: 56,
		borderRadius: 28,
		backgroundColor: '#F3F4F6',
		alignItems: 'center',
		justifyContent: 'center',
	},
	emptyText: { fontSize: 13, color: '#9CA3AF', fontWeight: '500' },
	arrow: {
		position: 'absolute',
		top: '50%',
		marginTop: -20,
		backgroundColor: '#FFFFFF',
		borderRadius: 20,
		width: 40,
		height: 40,
		alignItems: 'center',
		justifyContent: 'center',
		shadowColor: '#0F172A',
		shadowOffset: { width: 0, height: 3 },
		shadowOpacity: 0.12,
		shadowRadius: 10,
		elevation: 3,
		zIndex: 2,
	},
	arrowLeft: { left: 8 },
	arrowRight: { right: 8 },
	counterChip: {
		position: 'absolute',
		bottom: 12,
		right: 12,
		backgroundColor: 'rgba(0,0,0,0.6)',
		borderRadius: 20,
		paddingHorizontal: 10,
		paddingVertical: 4,
	},
	counterText: { fontSize: 12, fontWeight: '600', color: '#FFFFFF' },
	errorContainer: {
		width: '100%',
		height: 200,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: '#F8FAFC',
	},
	errorText: { fontSize: 12, color: '#94A3B8', marginTop: 8 },
})


const ContactCard = ({
	iconName,
	iconBg,
	iconColor,
	title,
	subtitle,
	onCall,
	callColor,
}: {
	iconName: string
	iconBg: string
	iconColor: string
	title: string
	subtitle: string
	onCall: () => void
	callColor: string
}) => (
	<View style={contactCardStyles.card}>
		<View style={[contactCardStyles.iconWrap, { backgroundColor: iconBg }]}>
			<MaterialCommunityIcons name={iconName} size={20} color={iconColor} />
		</View>
		<View style={contactCardStyles.textWrap}>
			<Text style={contactCardStyles.title} numberOfLines={1}>
				{title}
			</Text>
			<Text style={contactCardStyles.subtitle} numberOfLines={1}>
				{subtitle}
			</Text>
		</View>
		<TouchableOpacity
			style={[contactCardStyles.callBtn, { backgroundColor: callColor + '18', borderColor: callColor + '40' }]}
			onPress={onCall}
			activeOpacity={0.75}
		>
			<MaterialCommunityIcons name="phone" size={18} color={callColor} />
		</TouchableOpacity>
	</View>
)

const contactCardStyles = StyleSheet.create({
	card: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#fff',
		borderRadius: 14,
		padding: 14,
		marginBottom: 10,
		gap: 12,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.05,
		shadowRadius: 6,
		elevation: 2,
		borderWidth: 1,
		borderColor: '#F3F4F6',
	},
	iconWrap: {
		width: 44,
		height: 44,
		borderRadius: 12,
		alignItems: 'center',
		justifyContent: 'center',
		flexShrink: 0,
	},
	textWrap: { flex: 1 },
	title: { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 2 },
	subtitle: { fontSize: 12, color: '#6B7280', fontWeight: '400' },
	callBtn: {
		width: 40,
		height: 40,
		borderRadius: 20,
		alignItems: 'center',
		justifyContent: 'center',
		borderWidth: 1.5,
		flexShrink: 0,
	},
})

// ============================================================
// PATIENT HEADER CARD (Detailed Customer Card)
// ============================================================
const PatientHeaderCard = ({ patient, orderDate, orderId }: { patient: any; orderDate: string; orderId: string }) => (
	<View style={patientCardStyles.container}>
		<View style={patientCardStyles.headerRow}>
			<View style={patientCardStyles.avatarWrap}>
				{patient.avatarUrl ? (
					<Image source={{ uri: patient.avatarUrl }} style={patientCardStyles.avatarImage} />
				) : (
					<Text style={patientCardStyles.avatarText}>{patient.name.charAt(0).toUpperCase()}</Text>
				)}
				<View style={patientCardStyles.onlineDot} />
			</View>
			<View style={{ flex: 1 }}>
				<Text style={patientCardStyles.name}>{patient.name}</Text>
				<Text style={patientCardStyles.meta}>
					Patient ID: P·{orderId?.slice(-6) || '000001'} · {patient.age} Years
				</Text>
				{patient.allergies !== 'NKA' && (
					<View style={patientCardStyles.allergyBadge}>
						<MaterialCommunityIcons name="alert-circle" size={11} color="#DC2626" />
						<Text style={patientCardStyles.allergyText}>{patient.allergies}</Text>
					</View>
				)}
			</View>
			<View style={patientCardStyles.statusPill}>
				<Text style={patientCardStyles.statusPillText}>Active</Text>
			</View>
		</View>

		<View style={patientCardStyles.divider} />

		<View style={patientCardStyles.statsRow}>
			{[
				{ label: 'Blood', value: patient.bloodGroup },
				{ label: 'Weight', value: patient.weight },
				{ label: 'Gender', value: patient.gender },
				{ label: 'Date', value: orderDate },
			].map((item) => (
				<View key={item.label} style={patientCardStyles.statItem}>
					<Text style={patientCardStyles.statLabel}>{item.label}</Text>
					<Text style={patientCardStyles.statValue} numberOfLines={1} adjustsFontSizeToFit>
						{item.value}
					</Text>
				</View>
			))}
		</View>
	</View>
)

const patientCardStyles = StyleSheet.create({
	container: {
		backgroundColor: '#fff',
		borderRadius: 16,
		marginBottom: 14,
		overflow: 'hidden',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.06,
		shadowRadius: 10,
		elevation: 3,
	},
	headerRow: {
		flexDirection: 'row',
		alignItems: 'center',
		padding: 16,
		gap: 12,
	},
	avatarWrap: {
		width: 56,
		height: 56,
		borderRadius: 28,
		backgroundColor: '#2E7C86',
		alignItems: 'center',
		justifyContent: 'center',
		borderWidth: 3,
		borderColor: '#E0F2F1',
		overflow: 'visible',
		flexShrink: 0,
		position: 'relative',
	},
	avatarText: { color: '#fff', fontSize: 22, fontWeight: '700' },
	avatarImage: { width: 56, height: 56, borderRadius: 28 },
	onlineDot: {
		position: 'absolute',
		bottom: 2,
		right: 2,
		width: 12,
		height: 12,
		borderRadius: 6,
		backgroundColor: '#22C55E',
		borderWidth: 2,
		borderColor: '#fff',
	},
	name: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 2 },
	meta: { fontSize: 12, color: '#6B7280', marginBottom: 4 },
	allergyBadge: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
		backgroundColor: '#FEF2F2',
		paddingHorizontal: 8,
		paddingVertical: 3,
		borderRadius: 20,
		alignSelf: 'flex-start',
	},
	allergyText: { fontSize: 11, color: '#DC2626', fontWeight: '600' },
	statusPill: {
		backgroundColor: '#F0FDF4',
		paddingHorizontal: 10,
		paddingVertical: 5,
		borderRadius: 20,
		borderWidth: 1,
		borderColor: '#BBF7D0',
	},
	statusPillText: { fontSize: 11, color: '#16A34A', fontWeight: '700' },
	divider: { height: 1, backgroundColor: '#F3F4F6' },
	statsRow: {
		flexDirection: 'row',
		paddingVertical: 12,
		paddingHorizontal: 8,
	},
	statItem: {
		flex: 1,
		alignItems: 'center',
		minWidth: 0,
	},
	statLabel: {
		fontSize: 9,
		color: '#9CA3AF',
		fontWeight: '600',
		textTransform: 'uppercase',
		letterSpacing: 0.3,
		marginBottom: 2,
	},
	statValue: {
		fontSize: 12,
		fontWeight: '700',
		color: '#1F2937',
		textAlign: 'center',
	},
})


const SectionCard = ({
	title,
	icon,
	children,
	accent = '#2E7C86',
	action,
}: {
	title: string
	icon?: string
	children: React.ReactNode
	accent?: string
	action?: React.ReactNode
}) => (
	<View style={sectionStyles.card}>
		<View style={sectionStyles.titleRow}>
			<View style={[sectionStyles.iconBg, { backgroundColor: accent + '18' }]}>
				{icon && <MaterialCommunityIcons name={icon} size={16} color={accent} />}
			</View>
			<Text style={sectionStyles.title}>{title}</Text>
			{action}
		</View>
		{children}
	</View>
)

const sectionStyles = StyleSheet.create({
	card: {
		backgroundColor: '#fff',
		borderRadius: 16,
		padding: 16,
		marginBottom: 14,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.05,
		shadowRadius: 8,
		elevation: 2,
	},
	titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
	iconBg: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
	title: { fontSize: 14, fontWeight: '700', color: '#111827', flex: 1 },
})

// ============================================================
// STATUS DROPDOWN
// ============================================================
const StatusDropdown = ({
	currentStatus,
	onSelectStatus,
	disabled,
}: {
	currentStatus: string
	onSelectStatus: (status: string) => void
	disabled: boolean
}) => {
	const [dropdownOpen, setDropdownOpen] = useState(false)
	const [selectedValue, setSelectedValue] = useState(currentStatus)

	useEffect(() => {
		setSelectedValue(currentStatus)
	}, [currentStatus])

	const currentConfig = STATUS_CONFIG[selectedValue] || STATUS_CONFIG.pending
	const selectedOption = STATUS_OPTIONS.find((o) => o.value === selectedValue)

	const handleSelect = (value: string) => {
		setSelectedValue(value)
		setDropdownOpen(false)
	}

	const handleConfirm = () => {
		onSelectStatus(selectedValue)
	}

	return (
		<View>
			<Text style={dropdownStyles.label}>Current Status</Text>
			<View
				style={[
					dropdownStyles.currentBadge,
					{ backgroundColor: currentConfig.bg, borderColor: currentConfig.border },
				]}
			>
				<View style={[dropdownStyles.dot, { backgroundColor: currentConfig.dot }]} />
				<Text style={[dropdownStyles.currentBadgeText, { color: currentConfig.text }]}>
					{currentConfig.label}
				</Text>
			</View>

			<View style={dropdownStyles.divider} />

			<Text style={dropdownStyles.label}>Update To</Text>
			<TouchableOpacity
				style={[dropdownStyles.trigger, disabled && { opacity: 0.5 }]}
				onPress={() => !disabled && setDropdownOpen(true)}
				activeOpacity={0.8}
			>
				<View style={dropdownStyles.triggerLeft}>
					{selectedOption && (
						<View style={dropdownStyles.triggerIconWrap}>
							<MaterialCommunityIcons name={selectedOption.icon} size={16} color="#2E7C86" />
						</View>
					)}
					<Text style={dropdownStyles.triggerText}>{selectedOption?.label || 'Select status'}</Text>
				</View>
				<MaterialCommunityIcons name={dropdownOpen ? 'chevron-up' : 'chevron-down'} size={20} color="#6B7280" />
			</TouchableOpacity>

			{dropdownOpen && (
				<View style={dropdownStyles.optionsList}>
					{STATUS_OPTIONS.map((option, idx) => {
						const cfg = STATUS_CONFIG[option.value]
						const isSelected = option.value === selectedValue
						const isLast = idx === STATUS_OPTIONS.length - 1
						return (
							<TouchableOpacity
								key={option.value}
								style={[
									dropdownStyles.optionItem,
									isSelected && dropdownStyles.optionItemSelected,
									!isLast && dropdownStyles.optionItemBorder,
								]}
								onPress={() => handleSelect(option.value)}
								activeOpacity={0.7}
							>
								<View
									style={[
										dropdownStyles.optionIconWrap,
										{ backgroundColor: (cfg?.dot || '#9CA3AF') + '18' },
									]}
								>
									<MaterialCommunityIcons
										name={option.icon}
										size={15}
										color={cfg?.dot || '#9CA3AF'}
									/>
								</View>
								<Text
									style={[
										dropdownStyles.optionText,
										isSelected && { color: '#2E7C86', fontWeight: '700' },
									]}
								>
									{option.label}
								</Text>
								{isSelected && <MaterialCommunityIcons name="check" size={16} color="#2E7C86" />}
							</TouchableOpacity>
						)
					})}
				</View>
			)}

			<TouchableOpacity
				style={[dropdownStyles.confirmBtn, disabled && { opacity: 0.6 }]}
				onPress={handleConfirm}
				disabled={disabled}
				activeOpacity={0.85}
			>
				{disabled ? (
					<ActivityIndicator size="small" color="#fff" />
				) : (
					<>
						<MaterialCommunityIcons name="check-circle-outline" size={18} color="#fff" />
						<Text style={dropdownStyles.confirmBtnText}>Confirm Status Change</Text>
					</>
				)}
			</TouchableOpacity>
		</View>
	)
}

const dropdownStyles = StyleSheet.create({
	label: {
		fontSize: 11,
		fontWeight: '700',
		color: '#9CA3AF',
		textTransform: 'uppercase',
		letterSpacing: 0.5,
		marginBottom: 8,
	},
	currentBadge: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 7,
		alignSelf: 'flex-start',
		paddingHorizontal: 12,
		paddingVertical: 7,
		borderRadius: 22,
		borderWidth: 1,
		marginBottom: 16,
	},
	dot: { width: 8, height: 8, borderRadius: 4 },
	currentBadgeText: { fontSize: 13, fontWeight: '700' },
	divider: { height: 1, backgroundColor: '#F3F4F6', marginBottom: 16 },
	trigger: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		backgroundColor: '#F9FAFB',
		borderRadius: 12,
		borderWidth: 1.5,
		borderColor: '#E5E7EB',
		paddingHorizontal: 14,
		paddingVertical: 12,
		marginBottom: 4,
	},
	triggerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
	triggerIconWrap: {
		width: 30,
		height: 30,
		borderRadius: 8,
		backgroundColor: '#E0F2F1',
		alignItems: 'center',
		justifyContent: 'center',
	},
	triggerText: { fontSize: 14, color: '#1F2937', fontWeight: '600' },
	optionsList: {
		backgroundColor: '#fff',
		borderRadius: 12,
		borderWidth: 1.5,
		borderColor: '#E5E7EB',
		overflow: 'hidden',
		marginBottom: 14,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.08,
		shadowRadius: 12,
		elevation: 4,
	},
	optionItem: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		paddingHorizontal: 14,
		paddingVertical: 12,
	},
	optionItemSelected: { backgroundColor: '#F0FAFA' },
	optionItemBorder: { borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
	optionIconWrap: {
		width: 30,
		height: 30,
		borderRadius: 8,
		alignItems: 'center',
		justifyContent: 'center',
	},
	optionText: { flex: 1, fontSize: 13, color: '#374151', fontWeight: '500' },
	confirmBtn: {
		backgroundColor: '#1A2C33',
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 14,
		borderRadius: 12,
		gap: 8,
		marginTop: 4,
	},
	confirmBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
})

// ============================================================
// ORDER JOURNEY TIMELINE
// ============================================================
const OrderJourneyTimeline = ({ status }: { status: string }) => {
	const completedSteps = getCompletedSteps(status)
	const isRejected = status === 'rejected'

	return (
		<View style={timelineStyles.container}>
			{TIMELINE_STEPS.map((step, idx) => {
				const isCompleted = completedSteps.includes(step.key)
				const isLast = idx === TIMELINE_STEPS.length - 1
				return (
					<View key={step.key} style={timelineStyles.step}>
						<View style={timelineStyles.iconColumn}>
							<View
								style={[
									timelineStyles.iconCircle,
									isCompleted ? timelineStyles.iconCompleted : timelineStyles.iconPending,
								]}
							>
								<MaterialCommunityIcons
									name={step.icon}
									size={16}
									color={isCompleted ? '#FFFFFF' : '#94A3B8'}
								/>
							</View>
							{!isLast && (
								<View
									style={[timelineStyles.verticalLine, isCompleted && timelineStyles.lineCompleted]}
								/>
							)}
						</View>
						<View style={timelineStyles.contentColumn}>
							<Text style={[timelineStyles.stepLabel, isCompleted && timelineStyles.labelCompleted]}>
								{step.label}
							</Text>
							<Text style={timelineStyles.stepStatus}>{isCompleted ? 'Completed' : 'Pending'}</Text>
						</View>
					</View>
				)
			})}
			{isRejected && (
				<View style={timelineStyles.rejectedRow}>
					<View style={timelineStyles.rejectedIcon}>
						<MaterialCommunityIcons name="close-circle" size={16} color="#DC2626" />
					</View>
					<Text style={timelineStyles.rejectedText}>Order Rejected</Text>
				</View>
			)}
		</View>
	)
}

const timelineStyles = StyleSheet.create({
	container: { paddingTop: 4 },
	step: { flexDirection: 'row', marginBottom: 16 },
	iconColumn: { width: 32, alignItems: 'center', marginRight: 8 },
	iconCircle: {
		width: 28,
		height: 28,
		borderRadius: 14,
		alignItems: 'center',
		justifyContent: 'center',
		zIndex: 1,
	},
	iconCompleted: { backgroundColor: '#2E7C86' },
	iconPending: { backgroundColor: '#F1F5F9', borderWidth: 1.5, borderColor: '#E2E8F0' },
	verticalLine: {
		width: 2,
		flex: 1,
		backgroundColor: '#E2E8F0',
		marginVertical: 4,
		marginTop: 4,
	},
	lineCompleted: { backgroundColor: '#2E7C86' },
	contentColumn: { flex: 1, paddingTop: 4 },
	stepLabel: { fontSize: 13, fontWeight: '600', color: '#94A3B8', marginBottom: 2 },
	labelCompleted: { color: '#1E2A2A' },
	stepStatus: { fontSize: 11, color: '#94A3B8' },
	rejectedRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8 },
	rejectedIcon: {
		width: 28,
		height: 28,
		borderRadius: 14,
		backgroundColor: '#FEE2E2',
		alignItems: 'center',
		justifyContent: 'center',
	},
	rejectedText: { fontSize: 13, fontWeight: '600', color: '#DC2626' },
})

// ============================================================
// MAIN SCREEN
// ============================================================
const OrderDetailsScreen = () => {
	const navigation = useNavigation()
	const route = useRoute<RouteProp<RootStackParamList, 'OrderDetails'>>()
	const orderId = (route.params as any)?.orderId || (route.params as any)?.order?.id

	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const [orderData, setOrderData] = useState<OrderData | null>(null)
	const [status, setStatus] = useState('pending')
	const [updatingStatus, setUpdatingStatus] = useState(false)

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
		} catch (err: any) {
			setError(err?.message || 'Failed to load order details')
		} finally {
			setLoading(false)
		}
	}, [orderId])

	useEffect(() => {
		fetchOrder()
	}, [fetchOrder])

	const patient = useMemo(() => {
		const p = orderData?.patient
		return {
			name: p?.name || 'Sarah Jenkins',
			age: p?.age ?? 42,
			gender: p?.gender || 'Female',
			bloodGroup: p?.blood_group || 'O+',
			weight: p?.weight ? `${p.weight} kg` : '65 kg',
			allergies: p?.allergies || 'NKA',
			phone: p?.mobile || p?.phone || '—',
			emergency: p?.emergency_contact || '—',
			avatarUrl: p?.avatar_s3_key ? buildS3Url(p.avatar_s3_key) : null,
		}
	}, [orderData])

	const clinic = useMemo(
		() => ({
			name: orderData?.clinic?.name || orderData?.pharmacy?.name || 'City Health Clinic',
			doctor: orderData?.clinic?.doctor_name || 'Dr. Aris Thorne',
			phone: orderData?.clinic?.phone || orderData?.pharmacy?.alternate_mobile || '—',
		}),
		[orderData]
	)

	const orderDate = useMemo(() => {
		if (!orderData?.created_at) return 'Today'
		return new Date(orderData.created_at).toLocaleDateString('en-IN', {
			day: '2-digit',
			month: 'short',
			year: 'numeric',
		})
	}, [orderData])

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

	const handleMarkStatus = async (newStatus: string) => {
		if (!orderData) return
		setUpdatingStatus(true)
		try {
			await updatePharmacyOrderStatus(orderData.id, newStatus)
			setStatus(newStatus)
			setOrderData((prev) => (prev ? { ...prev, status: newStatus } : prev))
			Alert.alert('Success', `Order status updated to "${STATUS_CONFIG[newStatus]?.label || newStatus}"`)
		} catch (err: any) {
			Alert.alert('Error', err?.message || 'Failed to update status')
		} finally {
			setUpdatingStatus(false)
		}
	}

	const handleCall = (phone: string, label: string) => {
		const cleaned = phone.replace(/\s/g, '')
		if (!cleaned || cleaned === '—') {
			Alert.alert('Unavailable', `No phone number for ${label}.`)
			return
		}
		Linking.openURL(`tel:${cleaned}`).catch(() => Alert.alert('Error', 'Unable to open dialer.'))
	}

	const handleAddPrescription = () => {
		Alert.alert('Add Prescription', 'File picker would open here')
	}

	if (loading) {
		return (
			<SafeAreaView style={mainStyles.safeArea}>
				<View style={mainStyles.centered}>
					<ActivityIndicator size="large" color="#2E7C86" />
					<Text style={mainStyles.loadingText}>Loading order details…</Text>
				</View>
			</SafeAreaView>
		)
	}

	if (error) {
		return (
			<SafeAreaView style={mainStyles.safeArea}>
				<View style={mainStyles.centered}>
					<View style={mainStyles.errorIcon}>
						<MaterialCommunityIcons name="alert-circle-outline" size={36} color="#EF4444" />
					</View>
					<Text style={mainStyles.errorTitle}>Something went wrong</Text>
					<Text style={mainStyles.errorText}>{error}</Text>
					<TouchableOpacity style={mainStyles.retryButton} onPress={fetchOrder}>
						<MaterialCommunityIcons name="refresh" size={16} color="#fff" />
						<Text style={mainStyles.retryText}>Try Again</Text>
					</TouchableOpacity>
				</View>
			</SafeAreaView>
		)
	}

	return (
		<SafeAreaView style={mainStyles.safeArea}>
			<ScrollView
				style={mainStyles.scroll}
				showsVerticalScrollIndicator={false}
				contentContainerStyle={mainStyles.content}
			>
				{/* Patient Header Card - Detailed Customer Information */}
				<PatientHeaderCard patient={patient} orderDate={orderDate} orderId={orderData?.id || orderId || ''} />

				{/* Contact Cards - Customer Communication */}
				<ContactCard
					iconName="account-circle-outline"
					iconBg="#E0F2F1"
					iconColor="#2E7C86"
					title={patient.name}
					subtitle={patient.phone !== '—' ? patient.phone : 'No phone number'}
					onCall={() => handleCall(patient.phone, 'patient')}
					callColor="#2E7C86"
				/>
				<ContactCard
					iconName="hospital-building"
					iconBg="#EEF2FF"
					iconColor="#6366F1"
					title={clinic.name}
					subtitle={clinic.doctor}
					onCall={() => handleCall(clinic.phone, 'clinic')}
					callColor="#6366F1"
				/>

				{/* Prescription Files – Web‑style carousel with prescription images */}
				<SectionCard title="Prescription Files" icon="file-image-outline" accent="#6366F1">
					<PrescriptionCarousel images={prescriptionImages} />
				</SectionCard>

				{/* Order Status Management Card */}
				<SectionCard title="Order Status & Journey" icon="information-outline" accent="#2E7C86">
					<StatusDropdown
						currentStatus={status}
						onSelectStatus={handleMarkStatus}
						disabled={updatingStatus}
					/>
					<View style={mainStyles.timelineDivider} />
					<OrderJourneyTimeline status={status} />
				</SectionCard>

				{/* Navigation Button */}
				<TouchableOpacity
					style={mainStyles.searchPharmacyBtn}
					onPress={() => navigation.navigate(ROUTES.STACK.PHARMACY_SEARCH_PAGE as never)}
					activeOpacity={0.85}
				>
					<View style={mainStyles.searchPharmacyIconWrap}>
						<MaterialCommunityIcons name="store-search" size={20} color="#2E7C86" />
					</View>
					<Text style={mainStyles.searchPharmacyText}>Go To Pharmacy Search</Text>
					<MaterialCommunityIcons name="arrow-right" size={18} color="#2E7C86" />
				</TouchableOpacity>
			</ScrollView>
		</SafeAreaView>
	)
}

const mainStyles = StyleSheet.create({
	safeArea: { flex: 1, backgroundColor: '#F3F4F6' },
	scroll: { flex: 1 },
	content: { padding: 16, paddingBottom: 48 },
	centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
	loadingText: { marginTop: 12, color: '#6B7280', fontSize: 14, fontWeight: '500' },
	errorIcon: {
		width: 72,
		height: 72,
		borderRadius: 36,
		backgroundColor: '#FFF1F2',
		alignItems: 'center',
		justifyContent: 'center',
		marginBottom: 12,
	},
	errorTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 6 },
	errorText: { fontSize: 13, color: '#6B7280', textAlign: 'center', marginBottom: 20, lineHeight: 20 },
	retryButton: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		backgroundColor: '#2E7C86',
		paddingHorizontal: 20,
		paddingVertical: 10,
		borderRadius: 22,
	},
	retryText: { color: '#fff', fontWeight: '700', fontSize: 14 },
	timelineDivider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 16 },
	searchPharmacyBtn: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
		backgroundColor: '#fff',
		borderRadius: 14,
		padding: 16,
		marginBottom: 14,
		borderWidth: 1.5,
		borderColor: '#2E7C86',
		shadowColor: '#2E7C86',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.08,
		shadowRadius: 6,
		elevation: 2,
	},
	searchPharmacyIconWrap: {
		width: 36,
		height: 36,
		borderRadius: 10,
		backgroundColor: '#E0F2F1',
		alignItems: 'center',
		justifyContent: 'center',
	},
	searchPharmacyText: { flex: 1, fontSize: 14, fontWeight: '700', color: '#2E7C86' },
})

export default OrderDetailsScreen
