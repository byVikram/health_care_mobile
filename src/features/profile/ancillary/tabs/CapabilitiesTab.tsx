import React, { useEffect, useMemo, useState } from 'react'
import {
	ActivityIndicator,
	Alert,
	ScrollView,
	StyleSheet,
	TouchableOpacity,
	View,
	useWindowDimensions,
} from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { AppButton, AppTypography } from '../../../../components/common'
import {
	fetchAncillaryServicesBackend,
	updateAncillaryCapabilitiesBackend,
	fetchAncillaryProfileBackend,
	AncillaryServiceItem,
} from '../../../ancillary/ancillaryService'

interface ProcedureItem {
	id: string
	label: string
	subtitle?: string
	rate: string
	price: number
	specialtyKey: string
}

type ProcedureCardProps = {
	item: ProcedureItem
	selected: boolean
	onPress: () => void
}

const SPECIALTY_META: Record<
	string,
	{
		label: string
		icon: keyof typeof MaterialCommunityIcons.glyphMap
		subtitle: string
		fallbackProcedures: ProcedureItem[]
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
		label: 'Physiotherapy',
		icon: 'run',
		subtitle: 'Select the physiotherapy and rehabilitation therapies you provide.',
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
		subtitle: 'Select the home care, daily assistance, and vital monitoring services you provide.',
		fallbackProcedures: [
			{ id: 'proc-home-001', label: 'Home Care Visit & Vitals Check', subtitle: 'Comprehensive wellness check (60 mins)', rate: '₹599', price: 599, specialtyKey: 'home-care' },
			{ id: 'proc-home-002', label: 'Assisted Living & Mobility Support', subtitle: 'Personal assistance & safe movement support (90 mins)', rate: '₹799', price: 799, specialtyKey: 'home-care' },
			{ id: 'proc-home-003', label: 'Home Safety & Routine Check', subtitle: 'Environment hazard check & lifestyle care (45 mins)', rate: '₹499', price: 499, specialtyKey: 'home-care' },
			{ id: 'proc-home-004', label: 'Senior Companionship & Meal Support', subtitle: 'Attentive companionship and nutrition check (60 mins)', rate: '₹549', price: 549, specialtyKey: 'home-care' },
		],
	},
}

function normalizeSpecialtyKey(key?: string | null): string {
	if (!key) return 'nursing-care'
	const lower = key.toLowerCase().trim()
	if (lower.includes('physio')) return 'physiotherapy'
	if (lower.includes('rehab')) return 'rehab-care'
	if (lower.includes('home')) return 'home-care'
	return 'nursing-care'
}

function ProcedureCard({ item, selected, onPress }: ProcedureCardProps) {
	return (
		<TouchableOpacity
			activeOpacity={0.8}
			onPress={onPress}
			style={[styles.procedureCard, selected && styles.procedureCardSelected]}
		>
			<View style={[styles.checkbox, selected && styles.checkboxSelected]}>
				{selected && <MaterialCommunityIcons name="check" size={13} color="#FFFFFF" />}
			</View>

			<View style={styles.textContainer}>
				<AppTypography
					variant="h4"
					style={[styles.itemLabel, selected && styles.itemLabelSelected]}
					numberOfLines={1}
				>
					{item.label}
				</AppTypography>
				{item.subtitle ? (
					<AppTypography
						variant="caption"
						style={[styles.itemSubtitle, selected && styles.itemSubtitleSelected]}
						numberOfLines={2}
					>
						{item.subtitle}
					</AppTypography>
				) : null}
			</View>

			{/* Clinic-Defined Read-Only Price Tag */}
			<View style={styles.priceTag}>
				<AppTypography variant="caption" style={styles.priceText}>
					{item.rate}
				</AppTypography>
			</View>
		</TouchableOpacity>
	)
}

export default function CapabilitiesTab({
	isActive = true,
	onNextTab,
}: {
	isActive?: boolean
	onNextTab?: () => void
}) {
	const { width } = useWindowDimensions()
	const isTablet = width >= 768
	const contentWidth = isTablet ? 600 : '100%'

	const [activeSpecialtyKey, setActiveSpecialtyKey] = useState<string>('nursing-care')
	const [procedures, setProcedures] = useState<ProcedureItem[]>([])
	const [selected, setSelected] = useState<string[]>([])
	const [loading, setLoading] = useState(false)
	const [saving, setSaving] = useState(false)

	const specialtyMeta = useMemo(
		() => SPECIALTY_META[activeSpecialtyKey] || SPECIALTY_META['nursing-care'],
		[activeSpecialtyKey]
	)

	useEffect(() => {
		let isMounted = true
		const loadData = async () => {
			try {
				setLoading(true)

				// 1. Determine active specialty
				const storedSpecialty = await AsyncStorage.getItem('user_specialty')
				let resolvedSpecialty = normalizeSpecialtyKey(storedSpecialty)

				// 2. Fetch live profile and capabilities
				const profile = await fetchAncillaryProfileBackend()
				if (profile?.specialty?.id || profile?.specialty?.label) {
					resolvedSpecialty = normalizeSpecialtyKey(profile.specialty.id || profile.specialty.label)
				}

				if (isMounted) {
					setActiveSpecialtyKey(resolvedSpecialty)
				}

				// 3. Fetch all services from backend API
				const allServices = await fetchAncillaryServicesBackend()

				let matchedProcedures: ProcedureItem[] = []

				if (allServices && allServices.length > 0) {
					// Filter procedures strictly by the selected specialty
					const filtered = allServices.filter((s) => {
						const cat = (s.categoryName || '').toLowerCase()
						const specId = (s.specialtyId || '').toLowerCase()
						const title = (s.title || '').toLowerCase()

						if (resolvedSpecialty === 'nursing-care') {
							return (
								cat.includes('nurs') ||
								specId.includes('nurs') ||
								title.includes('wound') ||
								title.includes('iv') ||
								title.includes('injection') ||
								title.includes('dressing') ||
								title.includes('catheter') ||
								title.includes('vitals') ||
								title.includes('tracheostomy') ||
								title.includes('ryle')
							)
						}
						if (resolvedSpecialty === 'physiotherapy') {
							return (
								cat.includes('physio') ||
								specId.includes('physio') ||
								title.includes('physio') ||
								title.includes('pain') ||
								title.includes('sports') ||
								title.includes('joint') ||
								title.includes('mobilization') ||
								title.includes('exercise')
							)
						}
						if (resolvedSpecialty === 'rehab-care') {
							return (
								cat.includes('rehab') ||
								specId.includes('rehab') ||
								title.includes('stroke') ||
								title.includes('cognitive') ||
								title.includes('gait') ||
								title.includes('occupational')
							)
						}
						if (resolvedSpecialty === 'home-care') {
							return (
								cat.includes('home') ||
								specId.includes('home') ||
								cat.includes('elder') ||
								specId.includes('elder') ||
								cat.includes('senior') ||
								title.includes('elder') ||
								title.includes('senior') ||
								title.includes('assisted') ||
								title.includes('safety') ||
								title.includes('companionship')
							)
						}
						return false
					})

					if (filtered.length > 0) {
						matchedProcedures = filtered.map((s) => ({
							id: s.id,
							label: s.title,
							subtitle: s.description || ((s as any).duration ? `Duration: ${(s as any).duration}` : undefined),
							rate: s.price > 0 ? `₹${Math.round(s.price)}` : 'Custom Pricing',
							price: s.price,
							specialtyKey: resolvedSpecialty,
						}))
					}
				}

				// If no backend procedures matched for this specialty, use the specialty fallback procedures
				if (matchedProcedures.length === 0) {
					matchedProcedures = SPECIALTY_META[resolvedSpecialty]?.fallbackProcedures || SPECIALTY_META['nursing-care'].fallbackProcedures
				}

				if (isMounted) {
					setProcedures(matchedProcedures)
				}

				// 4. Load saved capabilities (Source of truth: Backend Profile)
				let savedList: string[] = []
				if (profile) {
					if (Array.isArray(profile.checked_procedures)) {
						savedList = profile.checked_procedures
					} else if (Array.isArray((profile as any).capabilities)) {
						savedList = (profile as any).capabilities.map((c: any) => c.public_id || c.procedure_id || c.id || c.name || c)
					}
				} else {
					// Fallback to local storage only if backend profile couldn't be loaded (e.g. offline)
					const stored = await AsyncStorage.getItem('ancillary_capabilities')
					if (stored) {
						try {
							const parsed = JSON.parse(stored)
							if (Array.isArray(parsed)) {
								savedList = parsed
							}
						} catch (_) {}
					}
				}

				if (isMounted) {
					if (savedList.length > 0) {
						// Filter savedList to keep only those relevant to current specialty procedures
						const matchedIds = matchedProcedures.map((p) => p.id)
						const matchedLabels = matchedProcedures.map((p) => p.label)
						const filteredSaved = savedList.filter((item) => matchedIds.includes(item) || matchedLabels.includes(item))
						setSelected(filteredSaved)
					} else {
						// New provider or no capabilities saved: NONE selected by default
						setSelected([])
					}
				}
			} catch (e) {
				console.log('[CapabilitiesTab] Error loading data:', e)
			} finally {
				if (isMounted) setLoading(false)
			}
		}

		loadData()

		return () => {
			isMounted = false
		}
	}, [isActive])

	const handleSave = async () => {
		try {
			setSaving(true)

			// 1. Call Backend PUT capabilities API
			await updateAncillaryCapabilitiesBackend(selected)

			// 2. Persist in AsyncStorage
			await AsyncStorage.setItem('ancillary_capabilities', JSON.stringify(selected))

			Alert.alert('Saved', 'Clinical capabilities saved successfully.')

			if (onNextTab) {
				onNextTab()
			}
		} catch (e) {
			console.log('[CapabilitiesTab] Failed to save capabilities:', e)
			Alert.alert('Error', 'Failed to save capabilities.')
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

	if (loading) {
		return (
			<View style={styles.center}>
				<ActivityIndicator size="small" color="#2B6F71" />
			</View>
		)
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

					{/* Procedures List for ONLY this specialty */}
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
				</View>
			</ScrollView>

			{/* Sticky Bottom Action Bar */}
			<View style={styles.stickyFooterContainer}>
				<View style={[styles.stickyFooterContent, { maxWidth: isTablet ? 600 : '100%' }]}>
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

					<AppButton
						variant="primary"
						formAction
						style={styles.saveButton}
						onPress={handleSave}
						loading={saving}
					>
						{'Save Preferences ->'}
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
	center: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: '#F8FAFA',
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

