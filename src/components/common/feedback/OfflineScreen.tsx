// src/components/common/feedback/OfflineScreen.tsx
//
// Full-screen "You're offline" state — "1.1 · Offline page" in Offline & Models.html.
// Shown by App.tsx only when the app cold-starts without a connection; mid-session drops keep using
// OfflineBanner so the user keeps their place. Connectivity comes from useNetwork(), and App.tsx swaps
// this screen out as soon as the device is back online, so "reconnect automatically" needs no logic here.
//
// The design's "Still available offline" card (health QR, saved bookings, downloaded reports) is
// intentionally left out until those features keep data on the device.

import React, { useEffect, useRef, useState } from 'react'
import { Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNetwork } from '../../../context/NetworkContext'
import { APP_COLORS } from '../../../config/theme'
import { AppButton } from '../buttons/AppButton'
import { AppIcon } from '../display/AppIcon'

/** Keep "Checking…" up at least this long so a fast NetInfo answer doesn't just flicker. */
const MIN_CHECK_MS = 800
const EMERGENCY_NUMBER = '108'

export default function OfflineScreen() {
	const { refresh } = useNetwork()
	const [checking, setChecking] = useState(false)
	const [tries, setTries] = useState(0)
	const mounted = useRef(true)

	useEffect(() => {
		mounted.current = true
		return () => {
			mounted.current = false
		}
	}, [])

	const handleRetry = async () => {
		if (checking) return
		setChecking(true)
		await Promise.all([refresh().catch(() => {}), new Promise((resolve) => setTimeout(resolve, MIN_CHECK_MS))])
		// Still mounted means still offline — App.tsx unmounts this screen the moment we reconnect.
		if (!mounted.current) return
		setChecking(false)
		setTries((n) => n + 1)
	}

	const callEmergency = () => {
		Linking.openURL(`tel:${EMERGENCY_NUMBER}`).catch(() => {})
	}

	return (
		<SafeAreaView style={styles.root} edges={['top', 'bottom']}>
			<ScrollView contentContainerStyle={styles.content} bounces={false} showsVerticalScrollIndicator={false}>
				<View style={styles.hero} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
					<View style={styles.heroInner}>
						<AppIcon name="wifiOff" size={52} color={APP_COLORS.primary} />
					</View>
				</View>

				<Text style={styles.title} accessibilityRole="header">
					You’re offline
				</Text>
				<Text style={styles.body}>
					Check your mobile data or Wi-Fi. We’ll reconnect automatically when you’re back online.
				</Text>

				{tries > 0 && !checking && (
					<View style={styles.notice} accessibilityLiveRegion="polite">
						<Text style={styles.noticeText}>
							Still no connection · tried {tries} {tries === 1 ? 'time' : 'times'}
						</Text>
					</View>
				)}

				<AppButton
					size="lg"
					onPress={handleRetry}
					loading={checking}
					icon={
						checking
							? undefined
							: ({ color }) => <AppIcon name="refresh" size={18} color={color} strokeWidth={2.2} />
					}
					style={styles.retry}
				>
					{checking ? 'Checking…' : 'Try again'}
				</AppButton>

				<TouchableOpacity style={styles.emergency} onPress={callEmergency} accessibilityRole="link" hitSlop={8}>
					<AppIcon name="call" size={16} color={APP_COLORS.danger} strokeWidth={2.4} />
					<Text style={styles.emergencyText}>Medical emergency? Call {EMERGENCY_NUMBER}</Text>
				</TouchableOpacity>
			</ScrollView>
		</SafeAreaView>
	)
}

const styles = StyleSheet.create({
	root: {
		flex: 1,
		backgroundColor: APP_COLORS.pageBg,
	},
	content: {
		flexGrow: 1,
		alignItems: 'center',
		justifyContent: 'center',
		gap: 12,
		paddingVertical: 32,
		paddingHorizontal: 28,
	},
	hero: {
		width: 148,
		height: 148,
		borderRadius: 74,
		marginBottom: 8,
		backgroundColor: APP_COLORS.mint,
		alignItems: 'center',
		justifyContent: 'center',
	},
	heroInner: {
		width: 104,
		height: 104,
		borderRadius: 52,
		backgroundColor: APP_COLORS.surface,
		alignItems: 'center',
		justifyContent: 'center',
		shadowColor: APP_COLORS.shadow,
		shadowOffset: { width: 0, height: 6 },
		shadowOpacity: 0.08,
		shadowRadius: 9,
		elevation: 3,
	},
	title: {
		fontSize: 24,
		lineHeight: 30,
		fontWeight: '800',
		color: APP_COLORS.ink,
		textAlign: 'center',
	},
	body: {
		fontSize: 15,
		lineHeight: 22,
		color: APP_COLORS.inkMuted,
		textAlign: 'center',
	},
	notice: {
		paddingVertical: 6,
		paddingHorizontal: 12,
		borderRadius: 8,
		backgroundColor: APP_COLORS.warningBg,
	},
	noticeText: {
		fontSize: 13,
		lineHeight: 18,
		fontWeight: '700',
		color: APP_COLORS.warning,
	},
	retry: {
		alignSelf: 'stretch',
		marginTop: 12,
	},
	emergency: {
		marginTop: 8,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
	},
	emergencyText: {
		fontSize: 14,
		fontWeight: '800',
		color: APP_COLORS.danger,
	},
})
