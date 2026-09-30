// src/features/ancillary/staff/ProviderSchedulePage.tsx
//
// Provider "Schedule" tab (floating tab bar): every scheduled booking sent to the provider -- awaiting a
// reply, confirmed, completed, cancelled -- with accept / decline (ProviderScheduledOrdersSection). The
// weekly availability screens of the design are out of scope here.
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
			<AppScreenHeader variant="bar" title="Schedule" subtitle="Your home-visit bookings" showBack={false} />
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
