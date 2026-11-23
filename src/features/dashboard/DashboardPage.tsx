// src/features/dashboard/DashboardPage.tsx
//
// The Home of the staff roles that have no screen of their own (radiology): quick services and promotions,
// then the shared community / content sections. The doctor, patient and ancillary-provider Homes are separate screens
// (DoctorHomeScreen, PatientHomeScreen, ProviderTodayScreen), picked by role in MainTabNavigator.

import React from 'react'
import { StyleSheet, View, useWindowDimensions } from 'react-native'

import { useAuth } from '../../context/AuthContext'
import ArticleSection from './components/ArticleSection'
import BlogsSection from './components/BlogsSection'
import CommunitySection from './components/CommunitySection'
import HomeScrollView from './components/HomeScrollView'
import MediaPromotionsSection from './components/MediaPromotionsSection'
import UpcomingEventsSection from './components/EventSection'
import PatientHealthQuestionsList from './components/PatientHealthQuestionsList'
import PodcastsSection from './components/PodcastsSection'
import QuickServicesSection from './components/QuickServicesSection'

export default function DashboardPage() {
	const { width } = useWindowDimensions()
	const { role } = useAuth()
	const isTablet = width >= 768
	const isLandscape = width > 1024

	const hero = (
		<>
			<QuickServicesSection role={role} />
			<MediaPromotionsSection role={role} />
		</>
	)

	return (
		<HomeScrollView headerOffset={146}>
			{isTablet ? (
				<View style={styles.tabletRow}>
					<View style={[styles.column, isLandscape && styles.columnHalf]}>{hero}</View>
					{/* Nothing sits beside the hero for these roles; the empty column keeps it at half width. */}
					<View style={[styles.column, isLandscape && styles.columnHalf]} />
				</View>
			) : (
				hero
			)}

			<ArticleSection />
			<UpcomingEventsSection marginTop={16} />

			<CommunitySection />
			<BlogsSection />
			<PodcastsSection />

			<PatientHealthQuestionsList showViewAll={true} />
		</HomeScrollView>
	)
}

const styles = StyleSheet.create({
	tabletRow: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		gap: 16,
		paddingHorizontal: 12,
		marginTop: 8,
	},
	column: {
		flex: 1,
	},
	columnHalf: {
		flex: 0.5,
	},
})
