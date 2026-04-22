import React, { useState } from 'react'
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import { AppTypography } from '../../../components/common'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import PersonalDetailsTab from './tabs/PersonalDetailsTab'
import ProfessionalDetailsTab from './tabs/ProfessionalDetailsTab'
import MyHospitalsTab from './tabs/MyHospitalsTab'
import AvailabilityTab from './tabs/AvailabilityTab'
import FavouriteDoctorsTab from './tabs/FavouriteDoctorsTab'
import SettingsTab from './tabs/SettingsTab'

const TABS = [
	{ key: 'personal', label: 'Personal details', Component: PersonalDetailsTab },
	{ key: 'professional', label: 'Professional details', Component: ProfessionalDetailsTab },
	{ key: 'hospitals', label: 'My hospitals', Component: MyHospitalsTab },
	{ key: 'availability', label: 'Availability', Component: AvailabilityTab },
	{ key: 'favourites', label: 'Favourite doctors', Component: FavouriteDoctorsTab },
	{ key: 'settings', label: 'Settings', Component: SettingsTab },
]

export default function DoctorProfileLayout() {
	const insets = useSafeAreaInsets()
	const navigation = useNavigation<any>()
	const [activeTab, setActiveTab] = useState('personal')

	const ActiveComponent = TABS.find((t) => t.key === activeTab)?.Component || PersonalDetailsTab

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
								onPress={() => setActiveTab(tab.key)}
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
				<ActiveComponent />
			</View>
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#fff',
	},
	header: {
		paddingHorizontal: 16,
		paddingBottom: 16,
		flexDirection: 'row',
		alignItems: 'center',
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
		backgroundColor: '#f8fafc',
	},
})
