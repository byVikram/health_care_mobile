// src/features/ancillary/staff/today/ProviderTodayScreen.tsx
//
// The ancillary provider's Home ("Nursing · Today" of the Ancillary Home design). It brings its own header (photo, name, bell, the
// online switch), so MainTabNavigator mounts it inside SidebarLayout without the shared app bar; the header's photo opens the same
// drawer (useSidebarDrawer). Pull-to-refresh lives in ProviderTodayContent.

import React from 'react'

import ProviderTodayContent from './ProviderTodayContent'

export default function ProviderTodayScreen() {
	return <ProviderTodayContent />
}
