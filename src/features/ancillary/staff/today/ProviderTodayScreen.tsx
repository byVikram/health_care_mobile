// src/features/ancillary/staff/today/ProviderTodayScreen.tsx
//
// The ancillary provider's Home: the "Today" content in the shared Home scroll view. Pulling down bumps
// `refreshToken`, which ProviderTodayContent reloads on and then reports back through `onRefreshComplete`.

import React, { useCallback, useState } from 'react'

import HomeScrollView from '../../../dashboard/components/HomeScrollView'
import ProviderTodayContent from './ProviderTodayContent'

export default function ProviderTodayScreen() {
	const [refreshing, setRefreshing] = useState(false)
	const [refreshToken, setRefreshToken] = useState(0)

	// Stable reference: ProviderTodayContent has this in its fetch effect's dependency array.
	const handleRefreshComplete = useCallback(() => setRefreshing(false), [])

	const handleRefresh = () => {
		setRefreshing(true)
		setRefreshToken((token) => token + 1)
	}

	return (
		// Header: 8 + 60 + 16. Clears the floating tab bar.
		<HomeScrollView
			headerOffset={84}
			floatingTabBar
			paleBackground
			refreshing={refreshing}
			onRefresh={handleRefresh}
		>
			<ProviderTodayContent refreshToken={refreshToken} onRefreshComplete={handleRefreshComplete} />
		</HomeScrollView>
	)
}
