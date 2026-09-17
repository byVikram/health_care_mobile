import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
	NativeScrollEvent,
	NativeSyntheticEvent,
	View,
	StyleSheet,
	ScrollView,
	TouchableOpacity,
	useWindowDimensions,
} from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { AppTypography } from '../../../components/common'
import PersonalDetailsTab from './tabs/PersonalDetailsTab'
import ProfessionalDetailsTab from './tabs/ProfessionalDetailsTab'
import CapabilitiesTab from './tabs/CapabilitiesTab'
import AvailabilityTab from './tabs/AvailabilityTab'
import SessionsTab from '../SessionsTab'
import { fetchProviderProfileBackend } from '../../ancillary/ancillaryService'
import { normalizeSpecialtyKey, normalizeSpecialtyToLabel } from './specialtyConfig'

type TabDefinition = {
	key: string
	label: string
	Component: React.ComponentType<{
		isActive?: boolean
		onNextTab?: () => void
		specialtyKey?: string
		specialtyLabel?: string
	}>
}

const getTabsForSpecialty = (specialtyKey: string): TabDefinition[] => {
	const isPhysio = specialtyKey === 'physiotherapy'
	return [
		{ key: 'personal', label: 'Personal Details', Component: PersonalDetailsTab },
		{ key: 'professional', label: 'Professional Details', Component: ProfessionalDetailsTab },
		{
			key: 'capabilities',
			label: isPhysio ? 'Services & Procedures' : 'Capabilities',
			Component: CapabilitiesTab,
		},
		{ key: 'availability', label: 'Availability', Component: AvailabilityTab },
		{ key: 'sessions', label: 'Sessions', Component: SessionsTab },
	]
}

// Onboarding (profile-setup) completion is tied to finishing this specific tab,
// not to reaching the end of the tabs array -- this lets tabs such as Sessions be
// appended after Availability without re-triggering or blocking the existing
// 'ancillary_setup_completed' flow.
const LAST_ONBOARDING_TAB_KEY = 'availability'

export default function AncillaryProfileLayout() {
	const { width } = useWindowDimensions()
	const pagerRef = useRef<ScrollView>(null)
	const tabScrollRef = useRef<ScrollView>(null)
	const [activeTab, setActiveTab] = useState('personal')
	const [specialtyKey, setSpecialtyKey] = useState<string>('')
	const [specialtyLabel, setSpecialtyLabel] = useState<string>('')

	const tabs = useMemo(() => getTabsForSpecialty(specialtyKey), [specialtyKey])

	// Load authenticated provider specialty on layout mount and when tab changes
	useEffect(() => {
		let isMounted = true

		const resolveSpecialty = async () => {
			try {
				// 1. Check local storage first
				const stored = await AsyncStorage.getItem('user_specialty')
				if (stored && isMounted) {
					const resolved = normalizeSpecialtyKey(stored)
					if (resolved) {
						setSpecialtyKey(resolved)
						setSpecialtyLabel(normalizeSpecialtyToLabel(resolved))
					}
				}

				// 2. Fetch authoritative backend profile
				const profile = await fetchProviderProfileBackend()
				if (profile && isMounted) {
					const spec = profile.specialty_id || profile.specialty?.id || profile.specialty_name || profile.specialty?.label
					const resolved = normalizeSpecialtyKey(spec)
					if (resolved) {
						setSpecialtyKey(resolved)
						const label = profile.specialty_name || profile.specialty?.label || normalizeSpecialtyToLabel(resolved)
						setSpecialtyLabel(label)
						await AsyncStorage.setItem('user_specialty', resolved)
					}
				}
			} catch (e) {
				console.log('[AncillaryProfileLayout] error resolving specialty:', e)
			}
		}

		resolveSpecialty()

		return () => {
			isMounted = false
		}
	}, [activeTab])

	const activeTabIndex = useMemo(() => {
		const index = tabs.findIndex((tab) => tab.key === activeTab)
		return index >= 0 ? index : 0
	}, [activeTab, tabs])

	useEffect(() => {
		pagerRef.current?.scrollTo({ x: activeTabIndex * width, animated: false })
	}, [width])

	useEffect(() => {
		tabScrollRef.current?.scrollTo({
			x: Math.max(0, activeTabIndex * 132 - 24),
			animated: true,
		})
	}, [activeTabIndex])

	const goToTab = useCallback(
		(tabKey: string, animated = true) => {
			const nextIndex = tabs.findIndex((tab) => tab.key === tabKey)
			if (nextIndex < 0) return

			setActiveTab(tabKey)
			pagerRef.current?.scrollTo({ x: nextIndex * width, animated })
		},
		[width, tabs]
	)

	const handlePagerMomentumEnd = useCallback(
		(event: NativeSyntheticEvent<NativeScrollEvent>) => {
			const nextIndex = Math.round(event.nativeEvent.contentOffset.x / width)
			const clampedIndex = Math.max(0, Math.min(tabs.length - 1, nextIndex))
			setActiveTab(tabs[clampedIndex].key)
		},
		[width, tabs]
	)

	const handleTabProgress = useCallback(
		async (currentIndex: number) => {
			const nextIndex = currentIndex + 1
			if (nextIndex < tabs.length) {
				goToTab(tabs[nextIndex].key)
			} else {
				await AsyncStorage.setItem('ancillary_setup_completed', 'true')
			}
		},
		[goToTab, tabs]
	)

	return (
		<View style={styles.container}>
			{/* Tabs scroll selector */}
			<View style={styles.tabContainer}>
				<ScrollView
					ref={tabScrollRef}
					horizontal
					showsHorizontalScrollIndicator={false}
					contentContainerStyle={styles.tabScrollContainer}
				>
					{tabs.map((tab) => {
						const isActive = activeTab === tab.key
						return (
							<TouchableOpacity
								key={tab.key}
								style={[styles.tabButton, isActive && styles.tabButtonActive]}
								onPress={() => goToTab(tab.key)}
								activeOpacity={0.7}
							>
								<AppTypography
									variant="subtitle"
									style={[styles.tabLabel, isActive && styles.tabLabelActive]}
								>
									{tab.label}
								</AppTypography>
							</TouchableOpacity>
						)
					})}
				</ScrollView>
			</View>

			{/* Pager view */}
			<View style={styles.contentContainer}>
				<ScrollView
					ref={pagerRef}
					style={styles.pager}
					horizontal
					pagingEnabled
					scrollEnabled={true}
					bounces={false}
					alwaysBounceHorizontal={false}
					overScrollMode="never"
					directionalLockEnabled
					showsHorizontalScrollIndicator={false}
					scrollEventThrottle={16}
					onMomentumScrollEnd={handlePagerMomentumEnd}
					keyboardShouldPersistTaps="handled"
				>
					{tabs.map((tab, index) => {
						const TabComponent = tab.Component
						return (
							<View key={tab.key} style={[styles.pagerPage, { width }]}>
								<TabComponent
									isActive={activeTab === tab.key}
									onNextTab={() => handleTabProgress(index)}
									specialtyKey={specialtyKey}
									specialtyLabel={specialtyLabel}
								/>
							</View>
						)
					})}
				</ScrollView>
			</View>
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		minHeight: 0,
		backgroundColor: '#fff',
	},
	tabContainer: {
		borderBottomWidth: 1,
		borderBottomColor: '#f0f4f7',
		backgroundColor: '#fff',
		flexShrink: 0,
	},
	tabScrollContainer: {
		paddingHorizontal: 8,
	},
	tabButton: {
		paddingVertical: 12,
		paddingHorizontal: 16,
		marginHorizontal: 4,
		borderBottomWidth: 2,
		borderBottomColor: 'transparent',
	},
	tabButtonActive: {
		borderBottomColor: '#0c7c7c',
	},
	tabLabel: {
		color: '#62707a',
		fontWeight: '500',
		fontSize: 14,
	},
	tabLabelActive: {
		color: '#0c7c7c',
		fontWeight: 'bold',
	},
	contentContainer: {
		flex: 1,
		minHeight: 0,
		backgroundColor: '#f8fafc',
	},
	pager: {
		flex: 1,
	},
	pagerPage: {
		flex: 1,
		minHeight: 0,
		backgroundColor: '#f8fafc',
	},
})
