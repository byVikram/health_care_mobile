// src/features/dashboard/components/HomeSheetsHost.tsx
//
// Renders the patient Home sheets once — More services (1b), Healthcare at home (1c) and My health QR —
// driven by useHomeSheets().openSheet. Mount it inside <HomeSheetsProvider> (MainTabNavigator does).
import React from 'react'
import { useHomeSheets } from '../HomeSheetsContext'
import HealthQrSheet from './HealthQrSheet'
import HomeCareSheet from './HomeCareSheet'
import MoreServicesSheet from './MoreServicesSheet'

export default function HomeSheetsHost() {
	const { openSheet, close } = useHomeSheets()
	return (
		<>
			<MoreServicesSheet visible={openSheet === 'more'} onClose={close} />
			<HomeCareSheet visible={openSheet === 'homecare'} onClose={close} />
			<HealthQrSheet visible={openSheet === 'qr'} onClose={close} />
		</>
	)
}
