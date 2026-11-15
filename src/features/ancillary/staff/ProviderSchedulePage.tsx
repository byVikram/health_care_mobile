// src/features/ancillary/staff/ProviderSchedulePage.tsx
//
// Provider "Schedule" tab = "My visits": the visits the provider has taken (GET /api/ancillary/provider/me/orders), read-only, with
// a way into each one. A provider keeps no weekly hours and no days off: the only availability is the online switch on Today, and a
// request is offered to every eligible provider of the speciality nearby (the first to accept gets it).
import React from 'react'
import { ScrollView, StyleSheet, View } from 'react-native'
import { AppScreenHeader } from '../../../components/common'
import { APP_COLORS } from '../../../config/theme'
import { useTabBarClearance } from '../../../navigation/tabBar'
import { ProviderScheduledOrdersSection } from './components/ProviderScheduledOrdersSection'

export default function ProviderSchedulePage() {
	const tabBarClearance = useTabBarClearance()

	return (
		<View style={styles.page}>
			<AppScreenHeader variant="bar" title="My visits" subtitle="Visits you have taken" showBack={false} />
			<ScrollView
				contentContainerStyle={[styles.content, { paddingBottom: tabBarClearance + 8 }]}
				showsVerticalScrollIndicator={false}
			>
				<ProviderScheduledOrdersSection />
			</ScrollView>
		</View>
	)
}

const styles = StyleSheet.create({
	page: {
		flex: 1,
		backgroundColor: APP_COLORS.pageBg,
	},
	content: {
		padding: 16,
	},
})
