import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
	View,
	ScrollView,
	TouchableOpacity,
	StyleSheet,
	useWindowDimensions,
	NativeScrollEvent,
	NativeSyntheticEvent,
	ActivityIndicator,
	Alert,
} from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'

import { AppTypography } from '../../../components/common'
import {
	getPatientDetails,
	updatePatientProfile,
	mapApiToLocalState,
	INITIAL_PATIENT_STATE,
} from './PatientProfileService'
import type { PatientProfileState } from './PatientProfileService'

import PersonalTab from './tabs/PersonalTab'
import MedicalTab from './tabs/MedicalTab'
import LifestyleTab from './tabs/LifestyleTab'
import AddressTab from './tabs/AddressTab'
import SessionsTab from '../SessionsTab'

type Tab = 'Personal' | 'Medical' | 'Lifestyle' | 'Address' | 'Sessions'

const TABS: { tab: Tab }[] = [
	{ tab: 'Personal' },
	{ tab: 'Medical' },
	{ tab: 'Lifestyle' },
	{ tab: 'Address' },
	{ tab: 'Sessions' },
]

export default function PatientProfileLayout() {
	const navigation = useNavigation<any>()
	const { width } = useWindowDimensions()

	const pagerRef = useRef<ScrollView>(null)
	const tabScrollRef = useRef<ScrollView>(null)

	const [activeTab, setActiveTab] = useState<Tab>('Personal')
	const [data, setData] = useState<PatientProfileState>(INITIAL_PATIENT_STATE)
	const [loading, setLoading] = useState(true)
	const [saving, setSaving] = useState(false)

	const activeTabIndex = useMemo(() => {
		const index = TABS.findIndex((tab) => tab.tab === activeTab)
		return index >= 0 ? index : 0
	}, [activeTab])

	const fetchProfile = async () => {
		try {
			setLoading(true)
			const res = await getPatientDetails()

			if (res.success && res.data) {
				setData(mapApiToLocalState(res.data))
			} else {
				Alert.alert('Error', res.message ?? 'Could not load profile.')
			}
		} catch {
			Alert.alert('Error', 'Something went wrong.')
		} finally {
			setLoading(false)
		}
	}

	useEffect(() => {
		fetchProfile()
	}, [])

	useEffect(() => {
		pagerRef.current?.scrollTo({ x: activeTabIndex * width, animated: false })
	}, [width])

	useEffect(() => {
		tabScrollRef.current?.scrollTo({
			x: Math.max(0, activeTabIndex * 120 - 24),
			animated: true,
		})
	}, [activeTabIndex])

	const goToTab = useCallback(
		(tabKey: Tab, animated = true) => {
			const nextIndex = TABS.findIndex((tab) => tab.tab === tabKey)
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
			setActiveTab(TABS[clampedIndex].tab)
		},
		[width]
	)

	const handleChange = (key: keyof PatientProfileState, value: any) => setData((prev) => ({ ...prev, [key]: value }))

	const handleSave = async () => {
		try {
			setSaving(true)
			const res = await updatePatientProfile(data)

			if (res.success) {
				await fetchProfile()
				Alert.alert('Saved', 'Profile updated successfully.')
			} else {
				Alert.alert('Error', res.message ?? 'Failed to save.')
			}
		} catch {
			Alert.alert('Error', 'Something went wrong.')
		} finally {
			setSaving(false)
		}
	}

	const renderTabContent = (tabKey: Tab) => {
		if (tabKey === 'Medical') {
			return <MedicalTab data={data} onChange={handleChange} onSave={handleSave} saving={saving} />
		}
		if (tabKey === 'Lifestyle') {
			return <LifestyleTab data={data} onChange={handleChange} onSave={handleSave} saving={saving} />
		}
		if (tabKey === 'Address') {
			return <AddressTab />
		}
		if (tabKey === 'Sessions') {
			return <SessionsTab />
		}
		return <PersonalTab data={data} onChange={handleChange} onSave={handleSave} saving={saving} />
	}

	if (loading) {
		return (
			<View style={styles.loadingContainer}>
				<ActivityIndicator size="small" color="#0c7c7c" />
			</View>
		)
	}

	return (
		<View style={styles.container}>
			{/* Tabs */}
			<View style={styles.tabContainer}>
				<ScrollView
					ref={tabScrollRef}
					horizontal
					showsHorizontalScrollIndicator={false}
					contentContainerStyle={styles.tabScrollContainer}
				>
					{TABS.map(({ tab }) => {
						const isActive = activeTab === tab
						return (
							<TouchableOpacity
								key={tab}
								style={[styles.tabButton, isActive && styles.tabButtonActive]}
								onPress={() => goToTab(tab)}
							>
								<AppTypography
									variant="subtitle"
									style={[styles.tabLabel, isActive && styles.tabLabelActive]}
								>
									{tab}
								</AppTypography>
							</TouchableOpacity>
						)
					})}
				</ScrollView>
			</View>

			{/* Content/Pager */}
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
					{TABS.map(({ tab }) => (
						<View key={tab} style={[styles.pagerPage, { width }]}>
							{renderTabContent(tab)}
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
		backgroundColor: '#fff',
	},
})
