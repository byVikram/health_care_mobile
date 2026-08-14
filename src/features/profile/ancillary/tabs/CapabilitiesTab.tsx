import React, { useEffect, useState } from 'react'
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

interface CapabilityItem {
	id: string
	label: string
	subtitle?: string
}

interface CapabilityCategory {
	key: string
	title: string
	icon: keyof typeof MaterialCommunityIcons.glyphMap
	items: CapabilityItem[]
}

type CapabilityCardProps = {
	item: CapabilityItem
	selected: boolean
	onPress: () => void
}

const CAPABILITIES_CATEGORIES: CapabilityCategory[] = [
	{
		key: 'general_nursing',
		title: 'General Nursing',
		icon: 'medical-bag',
		items: [
			{ id: 'vitals', label: 'Vital Signs Monitoring', subtitle: 'Standard vitals check' },
			{ id: 'elderly', label: 'Elderly Care', subtitle: 'Assisted living support' },
			{ id: 'catheter', label: 'Catheter Care', subtitle: 'Maintenance & changing' },
		],
	},
	{
		key: 'medication_iv',
		title: 'Medication & IV Care',
		icon: 'needle',
		items: [
			{ id: 'injection', label: 'Injection Administration', subtitle: 'IM, SC, IV Push' },
			{ id: 'iv_drip', label: 'IV Drip Setup', subtitle: 'Continuous infusion management' },
			{ id: 'iv_cannula', label: 'IV Cannulation', subtitle: 'Peripheral line insertion' },
			{ id: 'med_admin', label: 'Medication Administration', subtitle: 'Oral, topical, inhaled' },
		],
	},
	{
		key: 'wound_care',
		title: 'Wound & Specialized Care',
		icon: 'bandage',
		items: [
			{ id: 'wound_dress', label: 'Wound Dressing', subtitle: 'Basic & advanced care' },
			{ id: 'bandage_dress', label: 'Bandage Dressing' },
			{ id: 'post_op', label: 'Post-Operative Care', subtitle: 'Surgical site monitoring' },
			{ id: 'diabetes', label: 'Diabetes Care', subtitle: 'Insulin management' },
			{ id: 'ryles_tube', label: "Ryle's Tube Care", subtitle: 'Nasogastric feeding' },
		],
	},
	{
		key: 'critical_care',
		title: 'Critical Care',
		icon: 'heart-pulse',
		items: [
			{ id: 'icu_home', label: 'ICU Care at Home', subtitle: 'Advanced life support' },
			{ id: 'tracheostomy', label: 'Tracheostomy Care', subtitle: 'Airway management' },
			{ id: 'bedridden', label: 'Bedridden Patient Care', subtitle: 'Immobility support' },
		],
	},
]

const DEFAULT_SELECTED_LABELS = [
	'Vital Signs Monitoring',
	'Injection Administration',
	'IV Drip Setup',
	'Medication Administration',
	'Wound Dressing',
	'Diabetes Care',
]

function CategoryHeader({ category }: { category: CapabilityCategory }) {
	return (
		<View style={styles.categoryHeader}>
			<MaterialCommunityIcons name={category.icon} size={18} color="#2B6F71" />
			<AppTypography variant="h3" style={styles.categoryTitle}>
				{category.title}
			</AppTypography>
		</View>
	)
}

function CapabilityCard({ item, selected, onPress }: CapabilityCardProps) {
	return (
		<TouchableOpacity
			activeOpacity={0.8}
			onPress={onPress}
			style={[styles.capabilityCard, selected && styles.capabilityCardSelected]}
		>
			<View style={[styles.checkbox, selected && styles.checkboxSelected]}>
				{selected && <MaterialCommunityIcons name="check" size={12} color="#FFFFFF" />}
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
						numberOfLines={1}
					>
						{item.subtitle}
					</AppTypography>
				) : null}
			</View>

		</TouchableOpacity>
	)
}

function CapabilityCategorySection({
	category,
	selectedLabels,
	onToggleItem,
}: {
	category: CapabilityCategory
	selectedLabels: string[]
	onToggleItem: (label: string) => void
}) {
	return (
		<View style={styles.categorySection}>
			<CategoryHeader category={category} />

			<View style={styles.cardsList}>
				{category.items.map((item) => (
					<CapabilityCard
						key={item.id}
						item={item}
						selected={selectedLabels.includes(item.label)}
						onPress={() => onToggleItem(item.label)}
					/>
				))}
			</View>
		</View>
	)
}

export default function CapabilitiesTab() {
	const { width } = useWindowDimensions()
	const isTablet = width >= 768
	const contentWidth = isTablet ? 600 : '100%'

	const [selected, setSelected] = useState<string[]>(DEFAULT_SELECTED_LABELS)
	const [loading, setLoading] = useState(false)
	const [saving, setSaving] = useState(false)

	useEffect(() => {
		const loadCapabilities = async () => {
			try {
				setLoading(true)
				const stored = await AsyncStorage.getItem('ancillary_capabilities')
				if (stored) {
					const parsed = JSON.parse(stored)
					if (Array.isArray(parsed)) {
						setSelected(parsed)
					}
				}
			} catch (e) {
				console.log('[CapabilitiesTab] Failed to load capabilities:', e)
			} finally {
				setLoading(false)
			}
		}
		loadCapabilities()
	}, [])

	const handleSave = async () => {
		try {
			setSaving(true)
			await AsyncStorage.setItem('ancillary_capabilities', JSON.stringify(selected))
			Alert.alert('Saved', 'Service capabilities saved successfully')
		} catch (e) {
			console.log('[CapabilitiesTab] Failed to save capabilities:', e)
			Alert.alert('Error', 'Failed to save capabilities')
		} finally {
			setSaving(false)
		}
	}

	const toggleItem = (label: string) => {
		setSelected((prev) =>
			prev.includes(label) ? prev.filter((item) => item !== label) : [...prev, label]
		)
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
					{/* Section Header */}
					<View style={styles.headerBlock}>
						<AppTypography variant="h2" style={styles.mainTitle}>
							Clinical Capabilities
						</AppTypography>
						<AppTypography variant="body" style={styles.subtitle}>
							Select the services you are certified to provide for patient matching.
						</AppTypography>
					</View>

					{CAPABILITIES_CATEGORIES.map((category) => (
						<CapabilityCategorySection
							key={category.key}
							category={category}
							selectedLabels={selected}
							onToggleItem={toggleItem}
						/>
					))}
				</View>
			</ScrollView>

			{/* Sticky Bottom Action Bar */}
			<View style={styles.stickyFooterContainer}>
				<View style={[styles.stickyFooterContent, { maxWidth: isTablet ? 600 : '100%' }]}>
					<View style={styles.selectionInfoRow}>
						<View style={styles.counterBadge}>
							<View style={styles.activeDot} />
							<AppTypography variant="caption" style={styles.selectionCountText}>
								{selected.length} capability{selected.length === 1 ? '' : 'ies'} selected
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
	},
	mainTitle: {
		color: '#111827',
		fontSize: 20,
		fontWeight: '700',
		marginBottom: 2,
	},
	subtitle: {
		fontSize: 12,
		color: '#4B5563',
		lineHeight: 17,
	},
	categorySection: {
		marginBottom: 22,
	},
	categoryHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		marginBottom: 10,
	},
	categoryTitle: {
		fontSize: 14,
		fontWeight: '700',
		color: '#253136',
	},
	cardsList: {
		gap: 10,
	},
	capabilityCard: {
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
	capabilityCardSelected: {
		borderColor: '#2B6F71',
		backgroundColor: '#C6D9DA',
		shadowOpacity: 0.03,
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
		marginTop: 1,
	},
	itemSubtitleSelected: {
		color: '#334E55',
	},
	stickyFooterContainer: {
		backgroundColor: '#FFFFFF',
		borderTopWidth: 0,
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