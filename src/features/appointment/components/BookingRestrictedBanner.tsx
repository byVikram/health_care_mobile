// src/features/appointment/components/BookingRestrictedBanner.tsx
//
// Warning shown on the booking screens while online booking is paused (patient no-show policy).

import React from 'react'
import { StyleSheet } from 'react-native'
import { AppInfoBanner } from '../../../components/common'

export default function BookingRestrictedBanner({ message }: { message?: string | null }) {
	return (
		<AppInfoBanner
			tone="warning"
			icon="alert-circle-outline"
			title="Online booking is paused"
			subtitle={message || 'Online booking is paused because of missed appointments.'}
			style={styles.banner}
		/>
	)
}

const styles = StyleSheet.create({
	banner: { marginHorizontal: 16, marginTop: 12 },
})
