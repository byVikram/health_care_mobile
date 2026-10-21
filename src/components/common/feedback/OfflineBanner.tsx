// src/components/common/feedback/OfflineBanner.tsx
//
// Global, application-wide offline indicator. Mounted once in App.tsx above
// AppNavigator so it renders on top of every screen without any per-screen
// wiring. Reads connectivity from useNetwork() (NetworkContext) — do not
// create a second NetInfo listener here.

import React, { useEffect, useRef, useState } from 'react'
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useNetwork } from '../../../context/NetworkContext'
import { theme } from '../../../config/theme'

const RECOVERY_MESSAGE_DURATION_MS = 2000

export default function OfflineBanner() {
	const { isConnected, refresh } = useNetwork()
	const insets = useSafeAreaInsets()

	// Distinguishes "offline" from a brief "back online" confirmation so the
	// recovery message can show for a moment before the banner disappears,
	// without keeping the banner up indefinitely once reconnected.
	const [mode, setMode] = useState<'hidden' | 'offline' | 'recovered'>('hidden')
	const wasOffline = useRef(false)
	const recoveryTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
	const opacity = useRef(new Animated.Value(0)).current

	useEffect(() => {
		// isConnected === null means NetInfo hasn't resolved yet — never treat
		// that as offline, so we don't flash an incorrect banner on startup.
		if (isConnected === false) {
			if (recoveryTimer.current) {
				clearTimeout(recoveryTimer.current)
				recoveryTimer.current = null
			}
			wasOffline.current = true
			setMode('offline')
		} else if (isConnected === true && wasOffline.current) {
			wasOffline.current = false
			setMode('recovered')
			recoveryTimer.current = setTimeout(() => {
				setMode('hidden')
			}, RECOVERY_MESSAGE_DURATION_MS)
		}

		return () => {
			if (recoveryTimer.current) {
				clearTimeout(recoveryTimer.current)
			}
		}
	}, [isConnected])

	useEffect(() => {
		Animated.timing(opacity, {
			toValue: mode === 'hidden' ? 0 : 1,
			duration: 200,
			useNativeDriver: true,
		}).start()
	}, [mode, opacity])

	if (mode === 'hidden') {
		return null
	}

	const isRecovered = mode === 'recovered'

	return (
		<Animated.View
			pointerEvents="box-none"
			style={[styles.wrapper, { paddingTop: insets.top, opacity }]}
		>
			<View style={[styles.banner, isRecovered ? styles.bannerRecovered : styles.bannerOffline]}>
				<MaterialCommunityIcons
					name={isRecovered ? 'wifi-check' : 'wifi-off'}
					size={18}
					color="#ffffff"
				/>
				<View style={styles.textContainer}>
					<Text style={styles.title}>
						{isRecovered ? 'Internet connection restored' : 'No Internet Connection'}
					</Text>
					{!isRecovered && (
						<Text style={styles.description}>Please check your connection and try again.</Text>
					)}
				</View>
				{!isRecovered && (
					<TouchableOpacity onPress={refresh} style={styles.retryButton} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
						<Text style={styles.retryText}>Retry</Text>
					</TouchableOpacity>
				)}
			</View>
		</Animated.View>
	)
}

const styles = StyleSheet.create({
	wrapper: {
		position: 'absolute',
		top: 0,
		left: 0,
		right: 0,
		zIndex: 1000,
		elevation: 1000,
	},
	banner: {
		flexDirection: 'row',
		alignItems: 'center',
		marginHorizontal: 12,
		marginTop: 8,
		paddingVertical: 10,
		paddingHorizontal: 14,
		borderRadius: 12,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.15,
		shadowRadius: 4,
	},
	bannerOffline: {
		backgroundColor: theme.colors.error,
	},
	bannerRecovered: {
		backgroundColor: theme.colors.primary,
	},
	textContainer: {
		flex: 1,
		marginLeft: 10,
	},
	title: {
		color: '#ffffff',
		fontSize: 13,
		fontWeight: '600',
	},
	description: {
		color: '#ffffff',
		fontSize: 11,
		opacity: 0.9,
		marginTop: 2,
	},
	retryButton: {
		paddingHorizontal: 10,
		paddingVertical: 4,
		borderRadius: 8,
		borderWidth: 1,
		borderColor: 'rgba(255,255,255,0.6)',
		marginLeft: 8,
	},
	retryText: {
		color: '#ffffff',
		fontSize: 12,
		fontWeight: '600',
	},
})
