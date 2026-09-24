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

	const handleSelectActivitiesAndTasks = () => {
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
				{/* Concise Page Intro */}
				<AppTypography variant="body" style={styles.pageIntro}>
					Choose the type of caregiver support you need.
				</AppTypography>

				{/* SECTION 1: TIME-BASED CARE */}
				<View style={styles.sectionContainer}>
					<View style={styles.sectionHeaderWrap}>
						<AppTypography variant="h4" style={styles.sectionTitle}>
							TIME-BASED CARE
						</AppTypography>
						<AppTypography variant="caption" style={styles.sectionSubtext}>
							Choose care based on the duration of support you need.
						</AppTypography>
					</View>

					<View style={styles.gridRow}>
						<CaregiverServiceCard
							title="Day Care"
							description="Daytime caregiver support"
							iconName="white-balance-sunny"
							onPress={handleSelectDayCare}
						/>

						<CaregiverServiceCard
							title="Night Care"
							description="Overnight caregiver support"
							iconName="weather-night"
							onPress={handleSelectNightCare}
						/>

						<CaregiverServiceCard
							title="24-Hour Care"
							description="Continuous caregiver support"
							iconName="clock-time-four-outline"
							onPress={handleSelect24HourCare}
						/>

						<CaregiverServiceCard
							title="Hourly Care"
							description="Flexible caregiver hours"
							iconName="calendar-clock-outline"
							onPress={handleSelectHourlyCare}
						/>
					</View>
				</View>

				{/* SECTION 2: ACTIVITIES & TASK-BASED CARE */}
				<View style={[styles.sectionContainer, styles.secondSectionSpacing]}>
					<View style={styles.sectionHeaderWrap}>
						<AppTypography variant="h4" style={styles.sectionTitle}>
							ACTIVITIES & TASK-BASED CARE
						</AppTypography>
						<AppTypography variant="caption" style={styles.sectionSubtext}>
							Choose specific activities where caregiver assistance is required.
						</AppTypography>
					</View>

					<CaregiverServiceCard
						variant="fullWidth"
						title="Activities & Tasks"
						description="Select specific caregiver-assisted activities based on your needs."
						iconName="hand-heart-outline"
						onPress={handleSelectActivitiesAndTasks}
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
		paddingTop: 16,
	},
	scrollContentTablet: {
		maxWidth: 800,
		alignSelf: 'center',
		width: '100%',
	},
	pageIntro: {
		fontSize: 14,
		color: '#475569',
		marginBottom: 20,
		lineHeight: 20,
	},
	sectionContainer: {
		marginBottom: 8,
	},
	secondSectionSpacing: {
		marginTop: 20,
	},
	sectionHeaderWrap: {
		marginBottom: 12,
	},
	sectionTitle: {
		fontSize: 14,
		fontWeight: '700',
		color: '#0F172A',
		letterSpacing: 0.5,
		textTransform: 'uppercase',
	},
	sectionSubtext: {
		fontSize: 13,
		color: '#64748B',
		marginTop: 3,
		lineHeight: 18,
	},
	gridRow: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		justifyContent: 'space-between',
	},
})
