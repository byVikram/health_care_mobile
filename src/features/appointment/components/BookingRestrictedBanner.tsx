// src/features/appointment/components/BookingRestrictedBanner.tsx
//
// Warning shown on the booking screens while booking is paused (patient no-show policy): doctor appointments by default,
// home care with its own title and fallback text.

import React from 'react'
import { StyleSheet } from 'react-native'
import { AppInfoBanner } from '../../../components/common'

type Props = { message?: string | null; title?: string; fallback?: string }

export default function BookingRestrictedBanner({
	message,
	title = 'Online booking is paused',
	fallback = 'Online booking is paused because of missed appointments.',
}: Props) {
	return (
		<AppInfoBanner
			tone="warning"
			icon="alert-circle-outline"
			title={title}
			subtitle={message || fallback}
			style={styles.banner}
		/>
	)
}

const styles = StyleSheet.create({
	banner: { marginHorizontal: 16, marginTop: 12 },
})
