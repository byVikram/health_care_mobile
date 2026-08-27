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
import { useNavigation } from '@react-navigation/native'
import { AppTypography } from '../../../components/common'
import PersonalDetailsTab from './tabs/PersonalDetailsTab'
import ProfessionalDetailsTab from './tabs/ProfessionalDetailsTab'
import CapabilitiesTab from './tabs/CapabilitiesTab'
import AvailabilityTab from './tabs/AvailabilityTab'
import { fetchAncillaryProfileBackend } from '../../ancillary/ancillaryService'

type TabDefinition = {
	key: string
	label: string
	Component: React.ComponentType<{ isActive?: boolean; onNextTab?: () => void }>
}

const TABS: TabDefinition[] = [
	{ key: 'personal', label: 'Personal details', Component: PersonalDetailsTab },
	{ key: 'professional', label: 'Professional details', Component: ProfessionalDetailsTab },
	{ key: 'capabilities', label: 'Capabilities', Component: CapabilitiesTab },
	{ key: 'availability', label: 'Availability', Component: AvailabilityTab },
]

export default function AncillaryProfileLayout() {
	const navigation = useNavigation<any>()
	const { width } = useWindowDimensions()
	const pagerRef = useRef<ScrollView>(null)
	const tabScrollRef = useRef<ScrollView>(null)
	const [activeTab, setActiveTab] = useState('personal')
	const [isSetupCompleted, setIsSetupCompleted] = useState<boolean>(false)
	const [unlockedTabIndex, setUnlockedTabIndex] = useState<number>(0)

	// Check if the provider has already completed initial profile setup
	useEffect(() => {
		let isMounted = true
		const checkCompletion = async () => {
			try {
				const local = await AsyncStorage.getItem('ancillary_setup_completed')
				if (local === 'true' && isMounted) {
					setIsSetupCompleted(true)
					setUnlockedTabIndex(TABS.length - 1)
					return
				}

				const profile = await fetchAncillaryProfileBackend()
				if (profile && isMounted) {
					const hasCaps = Array.isArray(profile.checked_procedures) && profile.checked_procedures.length > 0
					const hasProf = Boolean(profile.license_number || profile.qualifications)
					if (hasCaps && hasProf) {
						setIsSetupCompleted(true)
						setUnlockedTabIndex(TABS.length - 1)
						await AsyncStorage.setItem('ancillary_setup_completed', 'true')
					}
				}
			} catch (e) {
				console.log('[AncillaryProfileLayout] error checking setup status:', e)
			}
		}
		checkCompletion()
		return () => {
			isMounted = false
		}
	}, [])

	const activeTabIndex = useMemo(() => {
		const index = TABS.findIndex((tab) => tab.key === activeTab)
		return index >= 0 ? index : 0
	}, [activeTab])

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
			const nextIndex = TABS.findIndex((tab) => tab.key === tabKey)
			if (nextIndex < 0) return

			setActiveTab(tabKey)
			pagerRef.current?.scrollTo({ x: nextIndex * width, animated })
		},
		[width]
	)

	const handlePagerMomentumEnd = useCallback(
		(event: NativeSyntheticEvent<NativeScrollEvent>) => {
			const nextIndex = Math.round(event.nativeEvent.contentOffset.x / width)
			const clampedIndex = Math.max(0, Math.min(TABS.length - 1, nextIndex))
			setActiveTab(TABS[clampedIndex].key)
		},
		[width]
	)

	const handleTabProgress = useCallback(
		async (currentIndex: number) => {
			const nextIndex = currentIndex + 1
			if (nextIndex < TABS.length) {
				setUnlockedTabIndex((prev) => Math.max(prev, nextIndex))
				goToTab(TABS[nextIndex].key)
			} else {
				// Final tab (Availability) completed
				setIsSetupCompleted(true)
				setUnlockedTabIndex(TABS.length - 1)
				await AsyncStorage.setItem('ancillary_setup_completed', 'true')
			}
		},
		[goToTab]
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
					{TABS.map((tab, index) => {
						const isActive = activeTab === tab.key
						const isUnlocked = isSetupCompleted || index <= unlockedTabIndex
						return (
							<TouchableOpacity
								key={tab.key}
								disabled={!isUnlocked}
								style={[
									styles.tabButton,
									isActive && styles.tabButtonActive,
									!isUnlocked && styles.tabButtonDisabled,
								]}
								onPress={() => isUnlocked && goToTab(tab.key)}
							>
								<AppTypography
									variant="subtitle"
									style={[
										styles.tabLabel,
										isActive && styles.tabLabelActive,
										!isUnlocked && styles.tabLabelDisabled,
									]}
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
					scrollEnabled={isSetupCompleted}
					bounces={false}
					alwaysBounceHorizontal={false}
					overScrollMode="never"
					directionalLockEnabled
					showsHorizontalScrollIndicator={false}
					scrollEventThrottle={16}
					onMomentumScrollEnd={handlePagerMomentumEnd}
					keyboardShouldPersistTaps="handled"
				>
					{TABS.map((tab, index) => {
						const TabComponent = tab.Component
						return (
							<View key={tab.key} style={[styles.pagerPage, { width }]}>
								<TabComponent
									isActive={activeTab === tab.key}
									onNextTab={() => handleTabProgress(index)}
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
	tabButtonDisabled: {
		opacity: 0.35,
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
	tabLabelDisabled: {
		color: '#a0aab0',
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
