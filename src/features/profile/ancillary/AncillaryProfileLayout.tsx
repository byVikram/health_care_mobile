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
import { AppTypography } from '../../../components/common'
import PersonalDetailsTab from './tabs/PersonalDetailsTab'
import ProfessionalDetailsTab from './tabs/ProfessionalDetailsTab'
import BankDetailsTab from './tabs/BankDetailsTab'
import CapabilitiesTab from './tabs/CapabilitiesTab'
import SessionsTab from '../SessionsTab'

type TabDefinition = {
	key: string
	label: string
	// Components may ignore this, but CapabilitiesTab uses it to know when it
	// has lost focus (all tabs stay mounted inside the pager below) so it can
	// discard any unsaved edits instead of letting them look saved.
	Component: React.ComponentType<{ isActive?: boolean }>
}

const TABS: TabDefinition[] = [
	{ key: 'personal', label: 'Personal Details', Component: PersonalDetailsTab },
	{ key: 'professional', label: 'Professional Details', Component: ProfessionalDetailsTab },
	{ key: 'bank', label: 'Bank Details', Component: BankDetailsTab },
	{ key: 'categories', label: 'Capabilities', Component: CapabilitiesTab },
	{ key: 'sessions', label: 'Sessions', Component: SessionsTab },
]

export default function AncillaryProfileLayout() {
	const { width } = useWindowDimensions()
	const pagerRef = useRef<ScrollView>(null)
	const tabScrollRef = useRef<ScrollView>(null)
	const [activeTab, setActiveTab] = useState('personal')

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
					{TABS.map((tab) => {
						const isActive = activeTab === tab.key
						return (
							<TouchableOpacity
								key={tab.key}
								style={[styles.tabButton, isActive && styles.tabButtonActive]}
								onPress={() => goToTab(tab.key)}
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
					bounces={false}
					alwaysBounceHorizontal={false}
					overScrollMode="never"
					directionalLockEnabled
					showsHorizontalScrollIndicator={false}
					scrollEventThrottle={16}
					onMomentumScrollEnd={handlePagerMomentumEnd}
					keyboardShouldPersistTaps="handled"
				>
					{TABS.map((tab) => {
						const TabComponent = tab.Component
						return (
							<View key={tab.key} style={[styles.pagerPage, { width }]}>
								<TabComponent isActive={activeTab === tab.key} />
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
