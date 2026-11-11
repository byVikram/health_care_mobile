import React, { useEffect, useMemo, useState } from 'react'
import {
	ActivityIndicator,
	ScrollView,
	StyleSheet,
	TouchableOpacity,
	View,
	useWindowDimensions,
} from 'react-native'
import Toast from 'react-native-toast-message'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { safeJsonParse } from '../../../../utils/jsonUtils'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { AppButton, AppTypography } from '../../../../components/common'
import {
	fetchAncillaryCategoriesBackend,
	fetchAncillaryServicesBackend,
	updateAncillaryCapabilitiesBackend,
	fetchProviderProfile,
	AncillaryServiceItem,
} from '../../../ancillary/ancillaryService'
import { normalizeSpecialtyKey } from '../specialtyConfig'
import ServicesAndProceduresView from './ServicesAndProceduresView'

export interface ProcedureItem {
	id: string
	label: string
	subtitle?: string
	rate: string
	price: number
	specialtyKey: string
	categoryId?: string
	categoryName?: string
}

type ProcedureCardProps = {
	item: ProcedureItem
	selected: boolean
	onPress: () => void
}

const HOME_CARE_ALL_PROCEDURE_IDS = [
	'proc-home-001',
	'proc-home-002',
	'proc-home-003',
	'proc-home-004',
	'proc-home-005',
	'proc-home-006',
	'proc-home-007',
	'proc-home-008',
	'proc-home-009',
	'proc-home-010',
	'proc-home-011',
	'proc-home-012',
	'proc-home-013',
	'proc-home-014',
	'proc-home-015',
	'proc-home-016',
	'proc-home-017',
	'proc-home-018',
]

const HOME_CARE_CATEGORIES = [
	{ id: 'cat-home-personal', label: 'Personal Care' },
	{ id: 'cat-home-mobility', label: 'Mobility & Physical Assistance' },
	{ id: 'cat-home-daily', label: 'Daily Care Assistance' },
	{ id: 'cat-home-companionship', label: 'Companionship & Support' },
]

const SPECIALTY_META: Record<
	string,
	{
		label: string
		icon: keyof typeof MaterialCommunityIcons.glyphMap
		subtitle: string
		fallbackProcedures: ProcedureItem[]
		fallbackCategories?: { id: string; label: string }[]
	}
> = {
	'nursing-care': {
		label: 'Nursing Care',
		icon: 'medical-bag',
		subtitle: 'Select the clinical nursing procedures you are certified to provide.',
		fallbackProcedures: [
			{ id: 'proc-nurs-001', label: 'Injection Administration', subtitle: 'IM, SC, IV Push (20 mins)', rate: '₹299', price: 299, specialtyKey: 'nursing-care' },
			{ id: 'proc-nurs-002', label: 'IV Drip Setup', subtitle: 'Continuous infusion management (45 mins)', rate: '₹799', price: 799, specialtyKey: 'nursing-care' },
			{ id: 'proc-nurs-003', label: 'Bandage Dressing', subtitle: 'Basic & advanced wound care (30 mins)', rate: '₹499', price: 499, specialtyKey: 'nursing-care' },
			{ id: 'proc-nurs-004', label: 'ICU Care at Home', subtitle: 'Advanced critical care support', rate: 'Custom Pricing', price: 0, specialtyKey: 'nursing-care' },
			{ id: 'proc-nurs-005', label: 'Vitals & Sugar Check', subtitle: 'Standard vitals monitoring (20 mins)', rate: '₹199', price: 199, specialtyKey: 'nursing-care' },
			{ id: 'proc-nurs-006', label: 'Catheterization Care', subtitle: 'Maintenance & catheter changing (45 mins)', rate: '₹599', price: 599, specialtyKey: 'nursing-care' },
			{ id: 'proc-nurs-007', label: 'Tracheostomy Care', subtitle: 'Airway hygiene and suctioning (60 mins)', rate: '₹999', price: 999, specialtyKey: 'nursing-care' },
			{ id: 'proc-nurs-008', label: "Ryle's Tube Feeding & Care", subtitle: 'Nasogastric feeding & tube maintenance (45 mins)', rate: '₹699', price: 699, specialtyKey: 'nursing-care' },
		],
	},
	'physiotherapy': {
		label: 'Services & Procedures',
		icon: 'arm-flex',
		subtitle: 'Categories and clinical procedures configured for your specialization.',
		fallbackProcedures: [
			{ id: 'proc-phys-001', label: 'Post-Op Physiotherapy', subtitle: 'Surgical recovery & mobility restoration (60 mins)', rate: '₹799', price: 799, specialtyKey: 'physiotherapy' },
			{ id: 'proc-phys-002', label: 'Back & Neck Pain Therapy', subtitle: 'Spinal decompression & pain management (45 mins)', rate: '₹699', price: 699, specialtyKey: 'physiotherapy' },
			{ id: 'proc-phys-003', label: 'Sports Injury Rehabilitation', subtitle: 'Joint mobilization & muscle conditioning (50 mins)', rate: '₹899', price: 899, specialtyKey: 'physiotherapy' },
			{ id: 'proc-phys-004', label: 'Joint Mobilization Therapy', subtitle: 'Passive & active range-of-motion therapy (45 mins)', rate: '₹749', price: 749, specialtyKey: 'physiotherapy' },
			{ id: 'proc-phys-005', label: 'Therapeutic Exercise Regimen', subtitle: 'Custom strengthening sequences (40 mins)', rate: '₹649', price: 649, specialtyKey: 'physiotherapy' },
		],
	},
	'rehab-care': {
		label: 'Rehabilitation Care',
		icon: 'wheelchair-accessibility',
		subtitle: 'Select the rehabilitation procedures and specialized therapies you deliver.',
		fallbackProcedures: [
			{ id: 'proc-rehab-001', label: 'Post-Stroke Movement Therapy', subtitle: 'Motor recovery & neuro-rehab session (60 mins)', rate: '₹999', price: 999, specialtyKey: 'rehab-care' },
			{ id: 'proc-rehab-002', label: 'Cognitive & Functional Rehab', subtitle: 'Daily task re-training & independence support (45 mins)', rate: '₹849', price: 849, specialtyKey: 'rehab-care' },
			{ id: 'proc-rehab-003', label: 'Gait Training & Balance Therapy', subtitle: 'Assisted walking & fall prevention (50 mins)', rate: '₹799', price: 799, specialtyKey: 'rehab-care' },
			{ id: 'proc-rehab-004', label: 'Occupational Therapy Session', subtitle: 'Adaptive motor skills for daily living (60 mins)', rate: '₹899', price: 899, specialtyKey: 'rehab-care' },
		],
	},
	'home-care': {
		label: 'Home Care',
		icon: 'home-heart',
		subtitle: 'Review the complete 18-service Home Care package provided by General Caregivers.',
		fallbackCategories: HOME_CARE_CATEGORIES,
		fallbackProcedures: [
			{ id: 'proc-home-001', label: 'Bathing & Hygiene Assistance', subtitle: 'Personal Care', rate: 'Included in package', price: 0, specialtyKey: 'home-care', categoryId: 'cat-home-personal', categoryName: 'Personal Care' },
			{ id: 'proc-home-002', label: 'Toileting Assistance', subtitle: 'Personal Care', rate: 'Included in package', price: 0, specialtyKey: 'home-care', categoryId: 'cat-home-personal', categoryName: 'Personal Care' },
			{ id: 'proc-home-003', label: 'Dressing & Undressing', subtitle: 'Personal Care', rate: 'Included in package', price: 0, specialtyKey: 'home-care', categoryId: 'cat-home-personal', categoryName: 'Personal Care' },
			{ id: 'proc-home-004', label: 'Grooming Assistance', subtitle: 'Personal Care', rate: 'Included in package', price: 0, specialtyKey: 'home-care', categoryId: 'cat-home-personal', categoryName: 'Personal Care' },
			{ id: 'proc-home-005', label: 'Feeding Assistance', subtitle: 'Personal Care', rate: 'Included in package', price: 0, specialtyKey: 'home-care', categoryId: 'cat-home-personal', categoryName: 'Personal Care' },
			{ id: 'proc-home-006', label: 'Diaper / Incontinence Care', subtitle: 'Personal Care', rate: 'Included in package', price: 0, specialtyKey: 'home-care', categoryId: 'cat-home-personal', categoryName: 'Personal Care' },
			{ id: 'proc-home-007', label: 'Bed Bath', subtitle: 'Personal Care', rate: 'Included in package', price: 0, specialtyKey: 'home-care', categoryId: 'cat-home-personal', categoryName: 'Personal Care' },
			{ id: 'proc-home-008', label: 'Walking Assistance', subtitle: 'Mobility & Physical Assistance', rate: 'Included in package', price: 0, specialtyKey: 'home-care', categoryId: 'cat-home-mobility', categoryName: 'Mobility & Physical Assistance' },
			{ id: 'proc-home-009', label: 'Wheelchair Assistance', subtitle: 'Mobility & Physical Assistance', rate: 'Included in package', price: 0, specialtyKey: 'home-care', categoryId: 'cat-home-mobility', categoryName: 'Mobility & Physical Assistance' },
			{ id: 'proc-home-010', label: 'Bed-to-Chair Transfer', subtitle: 'Mobility & Physical Assistance', rate: 'Included in package', price: 0, specialtyKey: 'home-care', categoryId: 'cat-home-mobility', categoryName: 'Mobility & Physical Assistance' },
			{ id: 'proc-home-011', label: 'Positioning / Repositioning', subtitle: 'Mobility & Physical Assistance', rate: 'Included in package', price: 0, specialtyKey: 'home-care', categoryId: 'cat-home-mobility', categoryName: 'Mobility & Physical Assistance' },
			{ id: 'proc-home-012', label: 'Bedridden Patient Care', subtitle: 'Mobility & Physical Assistance', rate: 'Included in package', price: 0, specialtyKey: 'home-care', categoryId: 'cat-home-mobility', categoryName: 'Mobility & Physical Assistance' },
			{ id: 'proc-home-013', label: 'Medication Reminders', subtitle: 'Daily Care Assistance', rate: 'Included in package', price: 0, specialtyKey: 'home-care', categoryId: 'cat-home-daily', categoryName: 'Daily Care Assistance' },
			{ id: 'proc-home-014', label: 'Assistance with Daily Activities', subtitle: 'Daily Care Assistance', rate: 'Included in package', price: 0, specialtyKey: 'home-care', categoryId: 'cat-home-daily', categoryName: 'Daily Care Assistance' },
			{ id: 'proc-home-015', label: 'Patient Escort / Accompaniment', subtitle: 'Daily Care Assistance', rate: 'Included in package', price: 0, specialtyKey: 'home-care', categoryId: 'cat-home-daily', categoryName: 'Daily Care Assistance' },
			{ id: 'proc-home-016', label: 'Companionship', subtitle: 'Companionship & Support', rate: 'Included in package', price: 0, specialtyKey: 'home-care', categoryId: 'cat-home-companionship', categoryName: 'Companionship & Support' },
			{ id: 'proc-home-017', label: 'Patient Exercise / Mobility Assistance', subtitle: 'Companionship & Support', rate: 'Included in package', price: 0, specialtyKey: 'home-care', categoryId: 'cat-home-companionship', categoryName: 'Companionship & Support' },
			{ id: 'proc-home-018', label: 'Basic Patient Observation & Reporting', subtitle: 'Companionship & Support', rate: 'Included in package', price: 0, specialtyKey: 'home-care', categoryId: 'cat-home-companionship', categoryName: 'Companionship & Support' },
		],
	},
}

// Interactive card for clinical specialties
function ProcedureCard({ item, selected, onPress }: ProcedureCardProps) {
	return (
		<TouchableOpacity
			activeOpacity={0.75}
			onPress={onPress}
			style={[styles.procedureCard, selected && styles.procedureCardSelected]}
		>
			<View style={[styles.checkbox, selected && styles.checkboxSelected]}>
				{selected && <MaterialCommunityIcons name="check" size={14} color="#FFFFFF" />}
			</View>
			<View style={styles.textContainer}>
				<AppTypography variant="body" style={[styles.itemLabel, selected && styles.itemLabelSelected]}>
					{item.label}
				</AppTypography>
				{item.subtitle ? (
					<AppTypography
						variant="caption"
						style={[styles.itemSubtitle, selected && styles.itemSubtitleSelected]}
					>
						{item.subtitle}
					</AppTypography>
				) : null}
			</View>
			<View style={styles.priceTag}>
				<AppTypography variant="caption" style={styles.priceText}>
					{item.rate}
				</AppTypography>
			</View>
		</TouchableOpacity>
	)
}

// Display row for Home Care package services
function HomeCareServiceRow({ item }: { item: ProcedureItem }) {
	return (
		<View style={styles.homeCareServiceRow}>
			<View style={styles.homeCareIconBadge}>
				<MaterialCommunityIcons name="check-circle" size={18} color="#2B6F71" />
			</View>
			<View style={styles.textContainer}>
				<AppTypography variant="body" style={styles.homeCareServiceLabel}>
					{item.label}
				</AppTypography>
			</View>
			<View style={styles.homeCareIncludedBadge}>
				<AppTypography variant="caption" style={styles.homeCareIncludedText}>
					Included
				</AppTypography>
			</View>
		</View>
	)
}

export default function CapabilitiesTab({
	isActive = true,
	onNextTab,
	specialtyKey: propSpecialtyKey,
}: {
	isActive?: boolean
	onNextTab?: () => void
	specialtyKey?: string
}) {
	const { width } = useWindowDimensions()
	const isTablet = width >= 768 && width < 1024

	const contentWidth = useMemo(() => {
		if (width >= 1024) return 680
		if (isTablet) return 600
		return '100%'
	}, [width, isTablet])

	const [specialtyKey, setSpecialtyKey] = useState<string>(normalizeSpecialtyKey(propSpecialtyKey))
	const [subspecialtyId, setSubspecialtyId] = useState<string>('')
	const [procedures, setProcedures] = useState<ProcedureItem[]>(() => {
		const initKey = normalizeSpecialtyKey(propSpecialtyKey)
		return (SPECIALTY_META[initKey] || SPECIALTY_META['home-care']).fallbackProcedures
	})
	const [categories, setCategories] = useState<{ id: string; label: string }[]>([])
	const [selected, setSelected] = useState<string[]>([])
	const [isPackageConfirmed, setIsPackageConfirmed] = useState<boolean>(false)
	const [saving, setSaving] = useState(false)

	const specialtyMeta = useMemo(() => {
		return SPECIALTY_META[specialtyKey] || SPECIALTY_META['home-care']
	}, [specialtyKey])

	const isHomeCare = specialtyKey === 'home-care'
	const isReadOnlyHierarchy = specialtyKey === 'physiotherapy'

	useEffect(() => {
		if (propSpecialtyKey) {
			const key = normalizeSpecialtyKey(propSpecialtyKey)
			if (key) {
				setSpecialtyKey(key)
				const meta = SPECIALTY_META[key]
				if (meta) {
					setProcedures(meta.fallbackProcedures)
					if (meta.fallbackCategories) setCategories(meta.fallbackCategories)
				}
			}
		}
	}, [propSpecialtyKey])

	// Load specialty, procedures, categories, and saved capabilities concurrently on mount
	useEffect(() => {
		let isMounted = true

		const loadData = async () => {
			try {
				// 1. Get stored specialty first for fast local render
				const stored = await AsyncStorage.getItem('user_specialty')
				let resolvedSpecialty = normalizeSpecialtyKey(stored) || normalizeSpecialtyKey(propSpecialtyKey)

				const storedSubspecialtyId = await AsyncStorage.getItem('ancillary_subspecialty_id')
				if (storedSubspecialtyId && isMounted) {
					setSubspecialtyId(storedSubspecialtyId)
				}

				if (resolvedSpecialty && isMounted) {
					setSpecialtyKey(resolvedSpecialty)
					const initialMeta = SPECIALTY_META[resolvedSpecialty] || SPECIALTY_META['home-care']
					setProcedures(initialMeta.fallbackProcedures)
					if (initialMeta.fallbackCategories) {
						setCategories(initialMeta.fallbackCategories)
					}
				}

				// 2. Fetch backend profile to get definitive specialty and saved capabilities
				const profResult = await fetchProviderProfile()
				let savedList: string[] = []
				let backendSubspecialtyId = ''

				if (profResult && isMounted) {
					backendSubspecialtyId = profResult.sub_specialty_id ?? ''

					const backendSpec =
						profResult.specialty_id ||
						profResult.specialty?.id ||
						profResult.specialty_name ||
						profResult.specialty?.label
					const backendSpecKey = normalizeSpecialtyKey(backendSpec)

					if (backendSpecKey) {
						resolvedSpecialty = backendSpecKey
						setSpecialtyKey(resolvedSpecialty)
						await AsyncStorage.setItem('user_specialty', resolvedSpecialty)

						if (backendSubspecialtyId && isMounted) {
							setSubspecialtyId(backendSubspecialtyId)
							await AsyncStorage.setItem('ancillary_subspecialty_id', backendSubspecialtyId)
						}
					}

					if (Array.isArray(profResult.checked_procedures)) {
						savedList = profResult.checked_procedures
					} else if (Array.isArray((profResult as any).capabilities)) {
						savedList = (profResult as any).capabilities.map(
							(c: any) => c.public_id || c.procedure_id || c.id || c.name || c
						)
					}
				} else {
					const storedCaps = await AsyncStorage.getItem('ancillary_capabilities')
					if (storedCaps) {
						const parsed = safeJsonParse<any>(storedCaps)
						if (Array.isArray(parsed)) savedList = parsed
					}
				}

				if (!resolvedSpecialty) {
					resolvedSpecialty = 'home-care'
					if (isMounted) setSpecialtyKey('home-care')
				}

				const activeSubId = storedSubspecialtyId || backendSubspecialtyId

				// 3. Concurrently fetch categories and services for resolved specialty & subspecialty
				const [catResult, srvResult] = await Promise.allSettled([
					fetchAncillaryCategoriesBackend(resolvedSpecialty, activeSubId),
					fetchAncillaryServicesBackend({ specialtyId: resolvedSpecialty, subspecialtyId: activeSubId }),
				])

				if (!isMounted) return

				// Update categories if available
				if (catResult.status === 'fulfilled' && Array.isArray(catResult.value) && catResult.value.length > 0) {
					setCategories(catResult.value)
				}

				// Update procedures if backend returned items
				let activeProcedures = (SPECIALTY_META[resolvedSpecialty] || SPECIALTY_META['home-care']).fallbackProcedures
				if (srvResult.status === 'fulfilled' && Array.isArray(srvResult.value) && srvResult.value.length > 0) {
					activeProcedures = srvResult.value.map((item: AncillaryServiceItem) => ({
						id: item.id,
						label: item.title || item.label || '',
						subtitle: item.description,
						rate: item.price ? `₹${item.price}` : (resolvedSpecialty === 'home-care' ? 'Included in package' : 'Custom Pricing'),
						price: item.price || 0,
						specialtyKey: resolvedSpecialty,
						categoryId: item.categoryId || undefined,
						categoryName: item.categoryName,
					}))
					setProcedures(activeProcedures)
				}

				if (resolvedSpecialty === 'home-care') {
					// For Home Care, if all 18 Home Care procedures are associated with the provider, show package as confirmed
					const all18Confirmed =
						HOME_CARE_ALL_PROCEDURE_IDS.length > 0 &&
						HOME_CARE_ALL_PROCEDURE_IDS.every((id) => savedList.includes(id))
					setIsPackageConfirmed(all18Confirmed)
					setSelected(all18Confirmed ? HOME_CARE_ALL_PROCEDURE_IDS : [])
				} else {
					if (savedList.length > 0) {
						const matchedIds = activeProcedures.map((p) => p.id)
						const matchedLabels = activeProcedures.map((p) => p.label)
						const filteredSaved = savedList.filter(
							(item) => matchedIds.includes(item) || matchedLabels.includes(item)
						)
						setSelected(filteredSaved)
					} else {
						setSelected([])
					}
				}
			} catch (e) {
				console.log('[CapabilitiesTab] Error loading data:', e)
			}
		}

		loadData()

		return () => {
			isMounted = false
		}
	}, [])


	// Physiotherapy's Services screen is read-only and purely a display of the
	// existing Specialty -> Sub-specialty -> Category -> Procedure hierarchy, so
	// it must reflect the *current* specialization every time the tab becomes
	// visible -- not just once on first mount -- in case the provider just
	// changed their specialization on the Professional Details tab.
	useEffect(() => {
		if (!isActive || !isReadOnlyHierarchy) return
		let cancelled = false

		const refreshSpecialization = async () => {
			try {
				const profResult = await fetchProviderProfile()
				if (!profResult || cancelled) return

				const backendSpec =
					profResult.specialty_id ||
					profResult.specialty?.id ||
					profResult.specialty_name ||
					profResult.specialty?.label
				const backendSpecKey = normalizeSpecialtyKey(backendSpec)
				if (backendSpecKey) {
					setSpecialtyKey(backendSpecKey)
					await AsyncStorage.setItem('user_specialty', backendSpecKey)
				}

				const backendSubspecialtyId = profResult.sub_specialty_id ?? ''
				if (backendSubspecialtyId) {
					setSubspecialtyId(backendSubspecialtyId)
					await AsyncStorage.setItem('ancillary_subspecialty_id', backendSubspecialtyId)
				}
			} catch (e) {
				console.log('[CapabilitiesTab] Error refreshing specialization on activate:', e)
			}
		}

		refreshSpecialization()

		return () => {
			cancelled = true
		}
	}, [isActive, isReadOnlyHierarchy])

	// Group procedures by category if categories exist
	const categoryGroups = useMemo(() => {
		if (!categories || categories.length === 0) return []
		return categories
			.map((cat) => {
				const groupProcs = procedures.filter(
					(p) => p.categoryId === cat.id || p.categoryName?.toLowerCase() === cat.label.toLowerCase()
				)
				return {
					id: cat.id,
					label: cat.label,
					procedures: groupProcs,
				}
			})
			.filter((group) => group.procedures.length > 0)
	}, [categories, procedures])

	// Physiotherapy's Services screen is display-only -- there is nothing to
	// select or persist here, so Continue simply advances to the next tab
	// without writing anything to the backend.
	const handleContinue = () => {
		if (onNextTab) {
			onNextTab()
		}
	}

	const handleSave = async () => {
		try {
			setSaving(true)

			if (isHomeCare) {
				if (!isPackageConfirmed) {
					Toast.show({
						type: 'error',
						text1: 'Please confirm that you can provide all Home Care services listed in the package.',
					})
					return
				}

				// 1. Call Backend PUT capabilities API with all 18 procedure IDs
				await updateAncillaryCapabilitiesBackend(HOME_CARE_ALL_PROCEDURE_IDS)

				// 2. Persist in AsyncStorage
				await AsyncStorage.setItem('ancillary_capabilities', JSON.stringify(HOME_CARE_ALL_PROCEDURE_IDS))
				setSelected(HOME_CARE_ALL_PROCEDURE_IDS)

				Toast.show({ type: 'success', text1: 'Home Care complete package confirmed successfully.' })
			} else {
				// 1. Call Backend PUT capabilities API for clinical specialty
				await updateAncillaryCapabilitiesBackend(selected)

				// 2. Persist in AsyncStorage
				await AsyncStorage.setItem('ancillary_capabilities', JSON.stringify(selected))

				Toast.show({ type: 'success', text1: 'Clinical capabilities saved successfully.' })
			}

			if (onNextTab) {
				onNextTab()
			}
		} catch (e) {
			console.log('[CapabilitiesTab] Failed to save capabilities:', e)
			Toast.show({ type: 'error', text1: 'Failed to save capabilities.' })
		} finally {
			setSaving(false)
		}
	}

	const toggleItem = (id: string, label: string) => {
		setSelected((prev) => {
			const hasId = prev.includes(id)
			const hasLabel = prev.includes(label)
			if (hasId || hasLabel) {
				return prev.filter((item) => item !== id && item !== label)
			}
			return [...prev, id]
		})
	}

	const handleClearAll = () => {
		setSelected([])
	}

	return (
		<View style={styles.root}>
			<ScrollView
				style={styles.scroll}
				contentContainerStyle={styles.scrollContent}
				showsVerticalScrollIndicator={true}
			>
				<View style={[styles.contentShell, { width: contentWidth }]}>
					{/* Specialty Header Card */}
					<View style={styles.headerBlock}>
						<View style={styles.specialtyBadgeRow}>
							<View style={styles.specialtyIconWrap}>
								<MaterialCommunityIcons name={specialtyMeta.icon} size={20} color="#2B6F71" />
							</View>
							<AppTypography variant="h3" style={styles.specialtyTitle}>
								{specialtyMeta.label}
							</AppTypography>
						</View>
						<AppTypography variant="body" style={styles.subtitle}>
							{specialtyMeta.subtitle}
						</AppTypography>
					</View>

					{isReadOnlyHierarchy ? (
						<ServicesAndProceduresView
							specialtyKey={specialtyKey}
							subspecialtyId={subspecialtyId}
							refreshToken={isActive}
						/>
					) : isHomeCare ? (
						<View style={styles.packageContainer}>
							<View style={styles.packageIntroBanner}>
								<MaterialCommunityIcons name="shield-check" size={22} color="#0c7c7c" />
								<View style={{ flex: 1 }}>
									<AppTypography variant="subtitle" style={styles.packageBannerTitle}>
										Complete Home Caregiver Package
									</AppTypography>
									<AppTypography variant="caption" style={styles.packageBannerText}>
										As a Home Care Caregiver / Home Attendant, you will provide all 18 care services
										listed below across 4 categories.
									</AppTypography>
								</View>
							</View>

							{/* 4 Categories with 18 Services */}
							<View style={styles.categorySections}>
								{categoryGroups.length > 0
									? categoryGroups.map((group) => (
											<View key={group.id} style={styles.categoryBlock}>
												<View style={styles.categoryTitleRow}>
													<AppTypography variant="h4" style={styles.categoryHeaderTitle}>
														{group.label}
													</AppTypography>
													<AppTypography variant="caption" style={styles.categoryCountBadge}>
														{group.procedures.length} services
													</AppTypography>
												</View>
												<View style={styles.homeCareServicesList}>
													{group.procedures.map((proc) => (
														<HomeCareServiceRow key={proc.id} item={proc} />
													))}
												</View>
											</View>
										))
									: procedures.map((proc) => (
											<HomeCareServiceRow key={proc.id} item={proc} />
										))}
							</View>

							{/* Package Confirmation Card */}
							<TouchableOpacity
								style={[
									styles.packageConfirmCard,
									isPackageConfirmed && styles.packageConfirmCardActive,
								]}
								onPress={() => setIsPackageConfirmed((prev) => !prev)}
								activeOpacity={0.8}
							>
								<View
									style={[
										styles.packageCheckbox,
										isPackageConfirmed && styles.packageCheckboxActive,
									]}
								>
									{isPackageConfirmed && (
										<MaterialCommunityIcons name="check" size={16} color="#FFFFFF" />
									)}
								</View>
								<View style={{ flex: 1 }}>
									<AppTypography variant="body" style={styles.packageConfirmTitle}>
										I confirm that I can provide all Home Care services listed above.
									</AppTypography>
									<AppTypography variant="caption" style={styles.packageConfirmSubtitle}>
										By confirming, you agree to provide the complete 18-service caregiver package.
									</AppTypography>
								</View>
							</TouchableOpacity>
						</View>
					) : (
						/* CLINICAL SPECIALTIES (NURSING, PHYSIO, REHAB) UI */
						<View style={styles.cardsList}>
							{procedures.map((proc) => {
								const isSelected = selected.includes(proc.id) || selected.includes(proc.label)
								return (
									<ProcedureCard
										key={proc.id}
										item={proc}
										selected={isSelected}
										onPress={() => toggleItem(proc.id, proc.label)}
									/>
								)
							})}
						</View>
					)}
				</View>
			</ScrollView>

			{/* Sticky Bottom Action Bar */}
			<View style={styles.stickyFooterContainer}>
				<View style={[styles.stickyFooterContent, { maxWidth: isTablet ? 600 : '100%' }]}>
					{isReadOnlyHierarchy ? null : isHomeCare ? (
						<View style={styles.selectionInfoRow}>
							<View style={styles.counterBadge}>
								<View style={[styles.activeDot, isPackageConfirmed && styles.activeDotConfirmed]} />
								<AppTypography variant="caption" style={styles.selectionCountText}>
									{isPackageConfirmed ? 'Complete package confirmed (18 services)' : 'Confirmation required'}
								</AppTypography>
							</View>
						</View>
					) : (
						<View style={styles.selectionInfoRow}>
							<View style={styles.counterBadge}>
								<View style={styles.activeDot} />
								<AppTypography variant="caption" style={styles.selectionCountText}>
									{selected.length} procedure{selected.length === 1 ? '' : 's'} selected
								</AppTypography>
							</View>
							<TouchableOpacity onPress={handleClearAll} activeOpacity={0.7}>
								<AppTypography variant="caption" style={styles.clearAllText}>
									Clear all
								</AppTypography>
							</TouchableOpacity>
						</View>
					)}

					<AppButton
						variant="primary"
						formAction 
						style={styles.saveButton}
						onPress={isReadOnlyHierarchy ? handleContinue : handleSave}
						loading={isReadOnlyHierarchy ? false : saving}
					>
					{isReadOnlyHierarchy ? 'Continue ->' : isHomeCare ? 'Confirm & Save Package ->' : 'Save Preferences'}
					</AppButton>
				</View>
			</View>
		</View>
	)
}

const styles = StyleSheet.create({
	root: {
		flex: 1,
		backgroundColor: '#F7FAFA',
	},
	scroll: {
		flex: 1,
	},
	scrollContent: {
		paddingHorizontal: 16,
		paddingTop: 16,
		paddingBottom: 132,
		alignItems: 'center',
	},
	contentShell: {
		alignSelf: 'center',
	},
	headerBlock: {
		marginBottom: 18,
		backgroundColor: '#FFFFFF',
		padding: 16,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: '#E2E8F0',
	},
	specialtyBadgeRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
		marginBottom: 6,
	},
	specialtyIconWrap: {
		width: 36,
		height: 36,
		borderRadius: 18,
		backgroundColor: 'rgba(43, 111, 113, 0.1)',
		alignItems: 'center',
		justifyContent: 'center',
	},
	specialtyTitle: {
		color: '#111827',
		fontSize: 18,
		fontWeight: '700',
	},
	subtitle: {
		fontSize: 13,
		color: '#4B5563',
		lineHeight: 18,
		marginTop: 4,
	},
	packageContainer: {
		gap: 18,
	},
	packageIntroBanner: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		backgroundColor: '#E6F4F2',
		borderRadius: 12,
		padding: 14,
		gap: 12,
		borderWidth: 1,
		borderColor: '#B2DFDB',
	},
	packageBannerTitle: {
		fontSize: 14,
		fontWeight: '700',
		color: '#00695C',
	},
	packageBannerText: {
		fontSize: 12,
		color: '#34495E',
		marginTop: 2,
		lineHeight: 16,
	},
	categorySections: {
		gap: 20,
	},
	categoryBlock: {
		backgroundColor: '#FFFFFF',
		borderRadius: 12,
		padding: 16,
		borderWidth: 1,
		borderColor: '#E2E8F0',
		gap: 10,
	},
	categoryTitleRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingBottom: 8,
		borderBottomWidth: 1,
		borderBottomColor: '#F0F4F8',
	},
	categoryHeaderTitle: {
		color: '#1F2933',
		fontSize: 15,
		fontWeight: '700',
	},
	categoryCountBadge: {
		fontSize: 12,
		fontWeight: '600',
		color: '#0c7c7c',
		backgroundColor: 'rgba(12, 124, 124, 0.08)',
		paddingHorizontal: 8,
		paddingVertical: 2,
		borderRadius: 10,
	},
	homeCareServicesList: {
		gap: 8,
	},
	homeCareServiceRow: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: 8,
		paddingHorizontal: 10,
		backgroundColor: '#F8FAFB',
		borderRadius: 8,
		gap: 10,
	},
	homeCareIconBadge: {
		alignItems: 'center',
		justifyContent: 'center',
	},
	homeCareServiceLabel: {
		fontSize: 14,
		color: '#1F2933',
		fontWeight: '600',
	},
	homeCareIncludedBadge: {
		backgroundColor: '#E8F5E9',
		paddingHorizontal: 8,
		paddingVertical: 3,
		borderRadius: 6,
	},
	homeCareIncludedText: {
		fontSize: 11,
		fontWeight: '600',
		color: '#2E7D32',
	},
	packageConfirmCard: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#FFFFFF',
		borderWidth: 2,
		borderColor: '#CBD5E1',
		borderRadius: 12,
		padding: 16,
		gap: 14,
		marginTop: 8,
	},
	packageConfirmCardActive: {
		borderColor: '#0c7c7c',
		backgroundColor: '#F0FDF4',
	},
	packageCheckbox: {
		width: 24,
		height: 24,
		borderRadius: 6,
		borderWidth: 2,
		borderColor: '#94A3B8',
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#FFFFFF',
	},
	packageCheckboxActive: {
		backgroundColor: '#0c7c7c',
		borderColor: '#0c7c7c',
	},
	packageConfirmTitle: {
		fontSize: 14,
		fontWeight: '700',
		color: '#0F172A',
		lineHeight: 20,
	},
	packageConfirmSubtitle: {
		fontSize: 12,
		color: '#64748B',
		marginTop: 2,
	},
	cardsList: {
		gap: 12,
	},
	procedureCard: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#FFFFFF',
		borderWidth: 1,
		borderColor: '#D9E1E2',
		borderRadius: 12,
		paddingHorizontal: 16,
		paddingVertical: 14,
		gap: 12,
		elevation: 1,
		shadowColor: '#000000',
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.03,
		shadowRadius: 3,
	},
	procedureCardSelected: {
		borderColor: '#2B6F71',
		backgroundColor: '#F0FDF4',
		shadowOpacity: 0.04,
		elevation: 1,
	},
	checkbox: {
		width: 22,
		height: 22,
		borderRadius: 6,
		borderWidth: 1.5,
		borderColor: '#B9C4C6',
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: '#FFFFFF',
	},
	checkboxSelected: {
		backgroundColor: '#2B6F71',
		borderColor: '#2B6F71',
	},
	textContainer: {
		flex: 1,
	},
	itemLabel: {
		fontSize: 14,
		lineHeight: 19,
		fontWeight: '700',
		color: '#1F2933',
	},
	itemLabelSelected: {
		color: '#1F2933',
		fontWeight: '700',
	},
	itemSubtitle: {
		fontSize: 12,
		lineHeight: 16,
		color: '#4B5F66',
		marginTop: 2,
	},
	itemSubtitleSelected: {
		color: '#334E55',
	},
	priceTag: {
		backgroundColor: '#E6F4F2',
		paddingHorizontal: 10,
		paddingVertical: 5,
		borderRadius: 8,
		borderWidth: 1,
		borderColor: '#B2DFDB',
	},
	priceText: {
		fontSize: 13,
		fontWeight: '700',
		color: '#00695C',
	},
	stickyFooterContainer: {
		backgroundColor: '#FFFFFF',
		borderTopWidth: 1,
		borderTopColor: '#F1F5F9',
		paddingHorizontal: 16,
		paddingTop: 12,
		paddingBottom: 16,
		alignItems: 'center',
		elevation: 8,
		shadowColor: '#000000',
		shadowOffset: { width: 0, height: -3 },
		shadowOpacity: 0.06,
		shadowRadius: 6,
	},
	stickyFooterContent: {
		width: '100%',
	},
	selectionInfoRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginBottom: 10,
	},
	counterBadge: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
	},
	activeDot: {
		width: 8,
		height: 8,
		borderRadius: 4,
		backgroundColor: '#2B6F71',
	},
	activeDotConfirmed: {
		backgroundColor: '#0c7c7c',
	},
	selectionCountText: {
		fontSize: 12,
		fontWeight: '600',
		color: '#3F4945',
	},
	clearAllText: {
		fontSize: 12,
		fontWeight: '600',
		color: '#006A62',
	},
	saveButton: {
		width: '100%',
		borderRadius: 12,
		marginTop: 0,
	},
})
