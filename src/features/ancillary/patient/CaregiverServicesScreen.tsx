import React from 'react'
import {
	ScrollView,
	StyleSheet,
	View,
	useWindowDimensions,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { ROUTES } from '../../../navigation/routes'
import { AppTypography, AppScreenHeader } from '../../../components/common'
import CaregiverSectionHeader from '../components/CaregiverSectionHeader'
import CaregiverServiceCard from '../components/CaregiverServiceCard'

export default function CaregiverServicesScreen() {
	const navigation = useNavigation<any>()
	const insets = useSafeAreaInsets()
	const { width } = useWindowDimensions()
	const isTablet = width >= 768

	const handleBack = () => {
		if (navigation.canGoBack()) {
			navigation.goBack()
		} else {
			navigation.navigate('MainTabs', { screen: 'Portal' })
		}
	}

	const handleSelectDayCare = () => {
		navigation.navigate(ROUTES.STACK.CAREGIVER_TIME_CONFIG, {
			careType: 'DAY_CARE',
		})
	}

	const handleSelectNightCare = () => {
		navigation.navigate(ROUTES.STACK.CAREGIVER_TIME_CONFIG, {
			careType: 'NIGHT_CARE',
		})
	}

	const handleSelect24HourCare = () => {
		navigation.navigate(ROUTES.STACK.CAREGIVER_TIME_CONFIG, {
			careType: 'FULL_DAY_CARE',
		})
	}

	const handleSelectHourlyCare = () => {
		navigation.navigate(ROUTES.STACK.CAREGIVER_TIME_CONFIG, {
			careType: 'HOURLY_CARE',
		})
	}

	const handleSelectTravelAttendant = () => {
		navigation.navigate(ROUTES.STACK.CAREGIVER_TIME_CONFIG, {
			careType: 'TRAVEL_ATTENDANT',
		})
	}

	const handleSelectServiceBasedCare = () => {
		navigation.navigate(ROUTES.STACK.HOME_CARE_CATALOG, {
			careBookingMode: 'FIXED_DURATION',
		})
	}

	return (
		<View style={styles.screen}>
			<AppScreenHeader
				title="Caregiver & Attendant Services"
				onBack={handleBack}
			/>

			<ScrollView
				style={styles.scrollView}
				contentContainerStyle={[
					styles.scrollContent,
					{ paddingBottom: Math.max(insets.bottom, 20) + 32 },
					isTablet && styles.scrollContentTablet,
				]}
				showsVerticalScrollIndicator={false}
			>
				{/* Section 1: Time-Based Care */}
				<View style={styles.sectionContainer}>
					<CaregiverSectionHeader
						title="TIME-BASED CARE"
						supportingText="Book a caregiver for a specific period of time or hourly duration."
					/>

					<View style={styles.gridRow}>
						<CaregiverServiceCard
							title="Day Care"
							description="Daytime caregiver support (09:00 AM — 06:00 PM)"
							iconName="white-balance-sunny"
							onPress={handleSelectDayCare}
						/>

						<CaregiverServiceCard
							title="Night Care"
							description="Overnight caregiver support (08:00 PM — 08:00 AM)"
							iconName="weather-night"
							onPress={handleSelectNightCare}
						/>

						<CaregiverServiceCard
							title="24-Hour Care"
							description="Continuous care for a full 24-hour period"
							iconName="clock-time-four-outline"
							onPress={handleSelect24HourCare}
						/>

						<CaregiverServiceCard
							title="Hourly Care"
							description="Choose your start and end time according to your needs"
							iconName="calendar-clock-outline"
							onPress={handleSelectHourlyCare}
						/>

						<CaregiverServiceCard
							title="Travel Attendant"
							description="Companion care during transit, appointments or hospital visits"
							iconName="car-side"
							onPress={handleSelectTravelAttendant}
						/>
					</View>
				</View>

				{/* Section 2: Service-Based Care */}
				<View style={[styles.sectionContainer, styles.sectionSpacing]}>
					<CaregiverSectionHeader
						title="ACTIVITIES & TASK-BASED CARE"
						supportingText="Choose specific caregiver-assisted activities based on patient needs."
					/>

					<CaregiverServiceCard
						variant="fullWidth"
						title="Browse Care Activities Catalog"
						description="Explore individual activities, meal support, hygiene, and daily care tasks"
						iconName="hand-heart-outline"
						onPress={handleSelectServiceBasedCare}
					/>
				</View>
			</ScrollView>
		</View>
	)
}

const styles = StyleSheet.create({
	screen: {
		flex: 1,
		backgroundColor: '#F8FAFC',
	},
	scrollView: {
		flex: 1,
	},
	scrollContent: {
		paddingHorizontal: 16,
		paddingTop: 18,
	},
	scrollContentTablet: {
		maxWidth: 800,
		alignSelf: 'center',
		width: '100%',
	},
	sectionContainer: {
		marginBottom: 6,
	},
	sectionSpacing: {
		marginTop: 18,
	},
	gridRow: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		justifyContent: 'space-between',
	},
})