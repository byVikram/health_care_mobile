import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
	ActivityIndicator,
	NativeScrollEvent,
	NativeSyntheticEvent,
	View,
	StyleSheet,
	ScrollView,
	TouchableOpacity,
	useWindowDimensions,
} from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import { AppTypography } from '../../../components/common'
import { ROUTES } from '../../../navigation/routes'
import PersonalDetailsTab from './tabs/PersonalDetailsTab'
import PharmacyDetailsTab from './tabs/PharmacyDetailsTab'
import ServicesTab from './tabs/ServicesTab'
import SettingsTab from './tabs/SettingTab'
import { getPharmacyProfile } from './pharmacyService'
import { PharmacyProfileData } from '../../../types/pharmacy-profile-api'
import SessionsTab from '../SessionsTab'

const TABS = [
	{ key: 'pharmacy', label: 'Pharmacy details', Component: PharmacyDetailsTab },
	{ key: 'personal', label: 'Personal details', Component: PersonalDetailsTab },
	{ key: 'services', label: 'Services', Component: ServicesTab },
	{ key: 'sessions', label: 'Sessions', Component: SessionsTab },
	{ key: 'settings', label: 'Settings', Component: SettingsTab },
]

export default function PharmacyProfileLayout() {
	const navigation = useNavigation<any>()
	const { width } = useWindowDimensions()
	const pagerRef = useRef<ScrollView>(null)
	const tabScrollRef = useRef<ScrollView>(null)
	const [activeTab, setActiveTab] = useState('pharmacy')
	const [profileLoading, setProfileLoading] = useState(false)
	const [profileData, setProfileData] = useState<PharmacyProfileData | null>(null)

	const activeTabIndex = useMemo(() => {
		const index = TABS.findIndex((tab) => tab.key === activeTab)
		return index >= 0 ? index : 0
	}, [activeTab])

	useEffect(() => {
		const fetchPharmacyProfile = async () => {
			try {
				setProfileLoading(true)
				const response = await getPharmacyProfile()

				if (response?.success === false) {
					console.log('[PharmacyProfileLayout] pharmacy profile API returned no usable data:', {
						success: response?.success,
						message: response?.message,
					})
					return
				}

				setProfileData(response.data ?? null)
			} catch (error) {
				console.log('[PharmacyProfileLayout] failed to fetch pharmacy profile:', error)
			} finally {
				setProfileLoading(false)
			}
		}

		fetchPharmacyProfile()
	}, [])

	useEffect(() => {
		pagerRef.current?.scrollTo({ x: activeTabIndex * width, animated: false })
	}, [activeTabIndex, width])

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

	const handleHeaderBack = useCallback(() => {
		if (navigation.canGoBack()) {
			navigation.goBack()
			return
		}

		navigation.navigate(ROUTES.MAIN.HOME)
	}, [navigation])

	const handlePagerMomentumEnd = useCallback(
		(event: NativeSyntheticEvent<NativeScrollEvent>) => {
			const nextIndex = Math.round(event.nativeEvent.contentOffset.x / width)
			const clampedIndex = Math.max(0, Math.min(TABS.length - 1, nextIndex))
			setActiveTab(TABS[clampedIndex].key)
		},
		[width]
	)

	const renderTabContent = (tabKey: string) => {
		if (profileLoading && tabKey !== 'settings') {
			return (
				<View style={styles.loadingContainer}>
					<ActivityIndicator color="#0c7c7c" />
				</View>
			)
		}

		if (tabKey === 'personal') {
			return <PersonalDetailsTab profileData={profileData} onProfileChange={setProfileData} />
		}

		if (tabKey === 'pharmacy') {
			return <PharmacyDetailsTab profileData={profileData} onProfileChange={setProfileData} />
		}

		if (tabKey === 'services') {
			return <ServicesTab profileData={profileData} onProfileChange={setProfileData} />
		}

		const TabComponent = TABS.find((tab) => tab.key === tabKey)?.Component || PersonalDetailsTab
		return <TabComponent />
	}

	return (
		<View style={styles.container}>
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
					{TABS.map((tab) => (
						<View key={tab.key} style={[styles.pagerPage, { width }]}>
							{renderTabContent(tab.key)}
						</View>
					))}
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
	header: {
		paddingHorizontal: 16,
		paddingBottom: 16,
		flexDirection: 'row',
		alignItems: 'center',
		flexShrink: 0,
	},
	backBtn: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	headerTitle: {
		marginLeft: 4,
		color: '#1a1a1a',
		fontWeight: 'bold',
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
	loadingContainer: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#f8fafc',
	},
})
