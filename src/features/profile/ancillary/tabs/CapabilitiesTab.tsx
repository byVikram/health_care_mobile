import React, { useEffect, useRef, useState } from 'react'
import {
	ActivityIndicator,
	Alert,
	ScrollView,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
	useWindowDimensions,
} from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { AppTypography, AppStickyFooter } from '../../../../components/common'

type CapabilityItem = {
	label: string
	rate: string
	description?: string
}

type CapabilityCategory = {
	key: string
	title: string
	icon: React.ComponentProps<typeof MaterialCommunityIcons>['name']
	items: CapabilityItem[]
}

const PROCEDURES_LOOKUP: Record<string, CapabilityCategory[]> = {
	'nursing-care': [
		{
			key: 'general-nursing',
			title: 'General Nursing',
			icon: 'stethoscope',
			items: [
				{ label: 'Vital Signs Monitoring', rate: '₹299', description: 'Standard vitals check' },
				{ label: 'Elderly Care', rate: '₹899', description: 'Assisted living support' },
				{ label: 'Catheter Care', rate: '₹599', description: 'Maintenance & changing' },
			],
		},
		{
			key: 'medication-iv-care',
			title: 'Medication & IV Care',
			icon: 'needle',
			items: [
				{ label: 'Injection Administration', rate: '₹299', description: 'IM, SC, IV Push' },
				{ label: 'IV Drip Setup', rate: '₹799', description: 'Continuous infusion management' },
				{ label: 'IV Cannulation', rate: '₹399', description: 'Peripheral line insertion' },
				{ label: 'Medication Administration', rate: '₹299', description: 'Oral, topical, inhaled' },
			],
		},
		{
			key: 'wound-specialized-care',
			title: 'Wound & Specialized Care',
			icon: 'bandage',
			items: [
				{ label: 'Wound Dressing', rate: '₹499', description: 'Basic & advanced care' },
				{ label: 'Bandage Dressing', rate: '₹499' },
				{ label: 'Post-Operative Care', rate: '₹899', description: 'Surgical site monitoring' },
				{ label: 'Diabetes Care', rate: '₹599', description: 'Insulin management' },
				{ label: "Ryle's Tube Care", rate: '₹499', description: 'Nasogastric feeding' },
			],
		},
		{
			key: 'critical-care',
			title: 'Critical Care',
			icon: 'heart-pulse',
			items: [
				{ label: 'ICU Care at Home', rate: '₹2,499', description: 'Advanced life support' },
				{ label: 'Tracheostomy Care', rate: '₹1,499', description: 'Airway management' },
				{ label: 'Bedridden Patient Care', rate: '₹999', description: 'Immobility support' },
			],
		},
	],
	'physiotherapy': [
		{
			key: 'services',
			title: 'Services',
			icon: 'run',
			items: [
				{ label: 'Manual Therapy Session', rate: '₹799' },
				{ label: 'Therapeutic Exercise Guidance', rate: '₹599' },
				{ label: 'Post-Op Knee Rehab', rate: '₹899' },
			],
		},
	],
	'rehab-care': [
		{
			key: 'services',
			title: 'Services',
			icon: 'brain',
			items: [
				{ label: 'Cognitive Rehabilitation', rate: '₹699' },
				{ label: 'Cardiac Rehabilitation', rate: '₹899' },
			],
		},
	],
	'elder-day-care': [
		{
			key: 'services',
			title: 'Services',
			icon: 'account-heart',
			items: [
				{ label: 'Daily Activity Monitoring', rate: '₹599' },
				{ label: 'Safety Assessment Check', rate: '₹499' },
			],
		},
	],
}

export default function CapabilitiesTab({ isActive = true }: { isActive?: boolean }) {
	const { width } = useWindowDimensions()
	const contentWidth = width >= 768 ? 560 : '100%'

	const [specialty, setSpecialty] = useState('nursing-care')
	// "selected" is the in-progress draft the user is editing.
	// "savedSelectionRef" mirrors whatever is actually persisted in AsyncStorage.
	// Nothing should count as saved until handleSave runs.
	const [selected, setSelected] = useState<string[]>([])
	const savedSelectionRef = useRef<string[]>([])
	const [loading, setLoading] = useState(false)
	const [saving, setSaving] = useState(false)

	useEffect(() => {
		const loadCapabilities = async () => {
			try {
				setLoading(true)
				const spec = await AsyncStorage.getItem('user_specialty')
				const caps = await AsyncStorage.getItem('ancillary_capabilities')

				if (spec) setSpecialty(spec)
				const initial = caps ? JSON.parse(caps) : []
				setSelected(initial)
				savedSelectionRef.current = initial
			} catch (e) {
				console.log(e)
			} finally {
				setLoading(false)
			}
		}
		loadCapabilities()
	}, [])

	// This tab stays mounted (it lives inside a pager alongside the other
	// profile tabs), so switching to Details/Sessions and back does NOT
	// unmount/remount it. Without this, unsaved toggles would silently
	// stick around and look saved even though Save was never pressed.
	// Discard any unsaved draft the moment the tab loses focus.
	const wasActiveRef = useRef(isActive)
	useEffect(() => {
		const wasActive = wasActiveRef.current
		wasActiveRef.current = isActive
		if (wasActive && !isActive) {
			setSelected(savedSelectionRef.current)
		}
	}, [isActive])

	const handleSave = async () => {
		if (selected.length === 0) {
			Alert.alert('Error', 'Please select at least one capability service')
			return
		}
		try {
			setSaving(true)
			await AsyncStorage.setItem('ancillary_capabilities', JSON.stringify(selected))
			savedSelectionRef.current = selected
			Alert.alert('Saved', 'Service capabilities saved successfully')
		} catch (e) {
			console.log(e)
			Alert.alert('Error', 'Failed to save capabilities')
		} finally {
			setSaving(false)
		}
	}

	const toggleItem = (label: string) => {
		if (selected.includes(label)) {
			setSelected(selected.filter((item) => item !== label))
		} else {
			setSelected([...selected, label])
		}
	}

	const clearAll = () => setSelected([])

	if (loading) {
		return (
			<View style={styles.center}>
				<ActivityIndicator size="small" color="#2B6F71" />
			</View>
		)
	}

	const categories = PROCEDURES_LOOKUP[specialty] || PROCEDURES_LOOKUP['nursing-care']

	return (
		<View style={styles.root}>
			<ScrollView
				style={styles.scroll}
				contentContainerStyle={styles.scrollContent}
				showsVerticalScrollIndicator
				persistentScrollbar
			>
				<View style={[styles.contentShell, { width: contentWidth }]}>
					<AppTypography variant="h3" style={styles.title}>
						Clinical Capabilities
					</AppTypography>
					<AppTypography variant="body" style={styles.subtitle}>
						Select the services you are certified and qualified to provide. Patients are matched to you based on these capabilities.
					</AppTypography>

					{categories.map((category) => (
						<View key={category.key} style={styles.categoryBlock}>
							<View style={styles.categoryHeader}>
								<MaterialCommunityIcons name={category.icon} size={16} color="#546e7a" />
								<Text style={styles.categoryLabel}>{category.title}</Text>
							</View>

							<View style={styles.list}>
								{category.items.map((item) => {
									const isChecked = selected.includes(item.label)
									return (
										<TouchableOpacity
											key={item.label}
											activeOpacity={0.8}
											onPress={() => toggleItem(item.label)}
											style={[styles.row, isChecked && styles.rowActive]}
										>
											<View style={[styles.checkbox, isChecked && styles.checkboxActive]}>
												{isChecked && (
													<MaterialCommunityIcons name="check" size={14} color="#ffffff" />
												)}
											</View>
											<View style={styles.textCol}>
												<View style={styles.textRow}>
													<Text style={[styles.label, isChecked && styles.labelActive]} numberOfLines={1}>
														{item.label}
													</Text>
													<Text style={styles.rate}>{item.rate}</Text>
												</View>
												{item.description ? (
													<Text style={styles.description} numberOfLines={1}>
														{item.description}
													</Text>
												) : null}
											</View>
										</TouchableOpacity>
									)
								})}
							</View>
						</View>
					))}
				</View>
			</ScrollView>

			<View style={styles.summaryBar}>
				<View style={[styles.summaryContentShell, { width: contentWidth }]}>
					<View style={styles.summaryLeft}>
						<View style={styles.summaryDot} />
						<Text style={styles.summaryText}>
							{selected.length} {selected.length === 1 ? 'capability' : 'capabilities'} selected
						</Text>
					</View>
					{selected.length > 0 && (
						<TouchableOpacity onPress={clearAll}>
							<Text style={styles.clearText}>Clear all</Text>
						</TouchableOpacity>
					)}
				</View>
			</View>

			<AppStickyFooter onPress={handleSave} loading={saving}>
				Save Preferences  
			</AppStickyFooter>
		</View>
	)
}

const styles = StyleSheet.create({
	root: {
		flex: 1,
		backgroundColor: '#f8fafc',
	},
	scroll: {
		flex: 1,
	},
	scrollContent: {
		paddingHorizontal: 16,
		paddingTop: 16,
		paddingBottom: 24,
		alignItems: 'center',
	},
	contentShell: {
		alignSelf: 'center',
	},
	center: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: '#f8fafc',
	},
	title: {
		color: '#191c1d',
		marginBottom: 6,
		fontWeight: '700',
	},
	subtitle: {
		fontSize: 13,
		color: '#62707a',
		lineHeight: 18,
		marginBottom: 20,
	},

	// Category
	categoryBlock: { marginBottom: 18 },
	categoryHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		marginBottom: 8,
	},
	categoryLabel: {
		fontSize: 12,
		fontWeight: '700',
		color: '#546e7a',
		textTransform: 'uppercase',
		letterSpacing: 0.4,
	},

	// Capability card
	list: {
		gap: 8,
	},
	row: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#ffffff',
		borderWidth: 1,
		borderColor: '#eceeee',
		borderRadius: 12,
		padding: 12,
		gap: 10,
	},
	rowActive: {
		borderColor: '#2B6F71',
		backgroundColor: 'rgba(43, 111, 113, 0.06)',
	},
	checkbox: {
		width: 22,
		height: 22,
		borderRadius: 6,
		borderWidth: 2,
		borderColor: '#D0D5DD',
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#ffffff',
		flexShrink: 0,
	},
	checkboxActive: {
		backgroundColor: '#2B6F71',
		borderColor: '#2B6F71',
	},
	textCol: {
		flex: 1,
	},
	textRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		gap: 8,
	},
	label: {
		flex: 1,
		fontSize: 14,
		fontWeight: '600',
		color: '#3f4849',
	},
	labelActive: {
		color: '#12373E',
	},
	rate: {
		fontSize: 12,
		fontWeight: '700',
		color: '#546e7a',
	},
	description: {
		fontSize: 12,
		color: '#94A3B8',
		marginTop: 2,
	},

	// Selection summary bar (sits above the sticky Save footer)
	summaryBar: {
		paddingHorizontal: 16,
		paddingTop: 10,
		paddingBottom: 8,
		backgroundColor: '#ffffff',
		borderTopWidth: 1,
		borderTopColor: '#eceeee',
		alignItems: 'center',
	},
	summaryContentShell: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	summaryLeft: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
	},
	summaryDot: {
		width: 8,
		height: 8,
		borderRadius: 4,
		backgroundColor: '#2B6F71',
	},
	summaryText: {
		fontSize: 12,
		fontWeight: '600',
		color: '#546e7a',
	},
	clearText: {
		fontSize: 12,
		fontWeight: '600',
		color: '#2B6F71',
	},
})
