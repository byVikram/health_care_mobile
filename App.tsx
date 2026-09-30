import React, { useCallback, useEffect, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { PaperProvider } from 'react-native-paper'
import * as ExpoSplashScreen from 'expo-splash-screen'
import { theme } from './src/config/theme'
import { AuthProvider, useAuth } from './src/context/AuthContext'
import { NetworkProvider, useNetwork } from './src/context/NetworkContext'
import AppNavigator from './src/navigation/AppNavigator'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import Toast from 'react-native-toast-message'
import { toastConfig } from './src/config/toastConfig'
import ErrorBoundary from './src/components/common/feedback/ErrorBoundary'
import OfflineBanner from './src/components/common/feedback/OfflineBanner'
import OfflineScreen from './src/components/common/feedback/OfflineScreen'
import SplashScreen from './src/components/common/layout/SplashScreen'

// Keep the native splash up until the animated SplashScreen lays out its first (identical) frame.
ExpoSplashScreen.preventAutoHideAsync().catch(() => {})

function AppContent() {
	const { isLoading } = useAuth()
	const { isConnected } = useNetwork()
	const [showSplash, setShowSplash] = useState(true)
	// The full-screen offline page is only for a cold start that has never reached the network this
	// session; later drops are handled by OfflineBanner so the user keeps their place in the app.
	const [hasBeenOnline, setHasBeenOnline] = useState(false)

	useEffect(() => {
		if (isConnected === true) setHasBeenOnline(true)
	}, [isConnected])

	const networkKnown = isConnected !== null
	const coldStartOffline = isConnected === false && !hasBeenOnline
	// Behind the splash, wait for NetInfo before mounting screens so they don't fire requests only to be
	// swapped for the offline page. Once the splash is gone, never hold the navigator back.
	const showNavigator = !coldStartOffline && (networkKnown || !showSplash)

	const handleSplashFinish = useCallback(() => setShowSplash(false), [])

	return (
		<>
			{showNavigator && <AppNavigator />}
			<OfflineBanner />
			{coldStartOffline && (
				<View style={styles.offlineLayer}>
					<OfflineScreen />
				</View>
			)}
			<Toast config={toastConfig} />
			{showSplash && <SplashScreen ready={!isLoading && networkKnown} onFinish={handleSplashFinish} />}
		</>
	)
}

export default function App() {
	return (
		<SafeAreaProvider>
			<PaperProvider theme={theme}>
				<ErrorBoundary>
					<NetworkProvider>
						<AuthProvider>
							<AppContent />
						</AuthProvider>
					</NetworkProvider>
				</ErrorBoundary>
			</PaperProvider>
		</SafeAreaProvider>
	)
}

const styles = StyleSheet.create({
	// Above OfflineBanner (zIndex/elevation 1000), whose pill would repeat what this page already says.
	offlineLayer: {
		position: 'absolute',
		top: 0,
		right: 0,
		bottom: 0,
		left: 0,
		zIndex: 1001,
		elevation: 1001,
	},
})
