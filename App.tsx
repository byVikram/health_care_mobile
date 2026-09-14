import React from 'react'
import { PaperProvider } from 'react-native-paper'
import { theme } from './src/config/theme'
import { AuthProvider } from './src/context/AuthContext'
import AppNavigator from './src/navigation/AppNavigator'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import Toast from 'react-native-toast-message'
import { toastConfig } from './src/config/toastConfig'
import ErrorBoundary from './src/components/common/ErrorBoundary'

export default function App() {
	return (
		<SafeAreaProvider>
			<PaperProvider theme={theme}>
				<ErrorBoundary>
					<AuthProvider>
						<AppNavigator />
						<Toast config={toastConfig} />
					</AuthProvider>
				</ErrorBoundary>
			</PaperProvider>
		</SafeAreaProvider>
	)
}