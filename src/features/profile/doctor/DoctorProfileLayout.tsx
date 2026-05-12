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
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { getDoctorProfile, mapDoctorProfileApi } from '../../doctor/doctorService'
import { BASE_URL } from '../../../constants/apiUrls'
import { DoctorAvailability, DoctorHospital } from '../../../types/doctor-profile'
import PersonalDetailsTab from './tabs/PersonalDetailsTab'
import ProfessionalDetailsTab from './tabs/ProfessionalDetailsTab'
import MyHospitalsTab from './tabs/MyHospitalsTab'
import AvailabilityTab from './tabs/AvailabilityTab'
import AchievementsTab from './tabs/AchievementsTab'
import FavouriteDoctorsTab from './tabs/FavouriteDoctorsTab'
import SettingsTab from './tabs/SettingsTab'

const TABS = [
	{ key: 'personal', label: 'Personal details', Component: PersonalDetailsTab },
	{ key: 'professional', label: 'Professional details', Component: ProfessionalDetailsTab },
	{ key: 'hospitals', label: 'My hospitals', Component: MyHospitalsTab },
	{ key: 'availability', label: 'Availability', Component: AvailabilityTab },
	{ key: 'achievements', label: 'Achievements', Component: AchievementsTab },
	{ key: 'favourites', label: 'Favourite doctors', Component: FavouriteDoctorsTab },
	{ key: 'settings', label: 'Settings', Component: SettingsTab },
]

export default function DoctorProfileLayout() {
	const insets = useSafeAreaInsets()
	const navigation = useNavigation<any>()
	const { width } = useWindowDimensions()
	const pagerRef = useRef<ScrollView>(null)
	const tabScrollRef = useRef<ScrollView>(null)
	const [activeTab, setActiveTab] = useState('personal')
	const [profileLoading, setProfileLoading] = useState(false)
	const [hospitals, setHospitals] = useState<DoctorHospital[]>([])
	const [availability, setAvailability] = useState<DoctorAvailability>({
		monday: [],
		tuesday: [],
		wednesday: [],
		thursday: [],
		friday: [],
		saturday: [],
		sunday: [],
	})

	const activeTabIndex = useMemo(() => {
		const index = TABS.findIndex((tab) => tab.key === activeTab)
		return index >= 0 ? index : 0
	}, [activeTab])

	useEffect(() => {
		const fetchDoctorProfile = async () => {
			try {
				setProfileLoading(true)
				console.log('[DoctorProfileLayout] fetching doctor profile:', {
					url: `${BASE_URL}/api/doctors/details`,
				})
				const response = await getDoctorProfile()
				console.log('[DoctorProfileLayout] getDoctorProfile response:', response)

				if (response.success && response.data) {
					const profile = mapDoctorProfileApi(response.data)
					const normalizedHospitals = profile.hospitals.map((hospital) => ({
						id: String(hospital.id),
						name: hospital.name ?? '',
						fullAddress: hospital.fullAddress ?? hospital.location ?? '',
						location: hospital.location ?? hospital.fullAddress ?? '',
						isPrimary: Boolean(hospital.isPrimary),
						phone_number: hospital.phone_number ?? '',
						video_consultation_fee: hospital.video_consultation_fee ?? '',
						offline_consultation_fee: hospital.offline_consultation_fee ?? '',
					}))

					console.log('[DoctorProfileLayout] mapped availability props:', {
						hospitals: normalizedHospitals.map((hospital) => ({
							id: hospital.id,
							name: hospital.name,
							fullAddress: hospital.fullAddress,
							isPrimary: hospital.isPrimary,
						})),
					})

					setHospitals(normalizedHospitals)
					setAvailability(profile.availability)
				} else {
					console.log('[DoctorProfileLayout] doctor profile API returned no usable data:', {
						success: response?.success,
						message: response?.message,
					})
				}
			} catch (error) {
				console.log('[DoctorProfileLayout] failed to fetch doctor profile:', error)
			} finally {
				setProfileLoading(false)
			}
		}

		fetchDoctorProfile()
	}, [])

	useEffect(() => {
		pagerRef.current?.scrollTo({ x: activeTabIndex * width, animated: false })
	}, [width])

	useEffect(() => {
		tabScrollRef.current?.scrollTo({
			x: Math.max(0, activeTabIndex * 132 - 24),
			animated: true,
		})
	}, [activeTabIndex])

	const goToTab = useCallback((tabKey: string, animated = true) => {
		const nextIndex = TABS.findIndex((tab) => tab.key === tabKey)
		if (nextIndex < 0) return

		setActiveTab(tabKey)
		pagerRef.current?.scrollTo({ x: nextIndex * width, animated })
	}, [width])

	const handlePagerMomentumEnd = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
		const nextIndex = Math.round(event.nativeEvent.contentOffset.x / width)
		const clampedIndex = Math.max(0, Math.min(TABS.length - 1, nextIndex))
		setActiveTab(TABS[clampedIndex].key)
	}, [width])

	const renderTabContent = (tabKey: string) => {
		if (tabKey === 'hospitals') {
			return <MyHospitalsTab hospitals={hospitals} onHospitalsChange={setHospitals} />
		}

		if (tabKey === 'availability') {
			console.log('[DoctorProfileLayout] hospitals before passing to AvailabilityTab:', hospitals)
			if (profileLoading) {
				return (
					<View style={styles.loadingContainer}>
						<ActivityIndicator color="#0c7c7c" />
					</View>
				)
			}

			return <AvailabilityTab hospitals={hospitals} availability={availability} onChange={setAvailability} />
		}

		const TabComponent = TABS.find((tab) => tab.key === tabKey)?.Component || PersonalDetailsTab
		return <TabComponent />
	}

	return (
		<View style={[styles.container, { paddingTop: insets.top + 16 }]}>
			{/* Back Button Header */}
			<View style={styles.header}>
				<TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.8}>
					<MaterialCommunityIcons name="chevron-left" size={28} color="#0c7c7c" />
					<AppTypography variant="h3" style={styles.headerTitle}>
						Profile
					</AppTypography>
				</TouchableOpacity>
			</View>

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
