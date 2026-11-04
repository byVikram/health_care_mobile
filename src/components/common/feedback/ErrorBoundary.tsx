import React, { Component, ErrorInfo, ReactNode } from 'react'
import { StyleSheet, View, Text, TouchableOpacity, SafeAreaView } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import * as ExpoSplashScreen from 'expo-splash-screen'
import { reportError } from '../../../services/crashReporting'

interface Props {
	children: ReactNode
	fallback?: ReactNode
}

interface State {
	hasError: boolean
	error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
	public state: State = {
		hasError: false,
		error: null,
	}

	public static getDerivedStateFromError(error: Error): State {
		return { hasError: true, error }
	}

	public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
		// App.tsx holds the native splash until SplashScreen mounts; a crash before that would hide this fallback.
		ExpoSplashScreen.hideAsync().catch(() => {})
		// The first line of the component stack names the component that threw.
		const where = errorInfo.componentStack?.trim().split('\n')[0]?.trim() || 'unknown component'
		reportError(error, `ErrorBoundary: ${where}`)
		if (__DEV__) {
			console.error('[ErrorBoundary caught error]', error, errorInfo)
		}
	}

	private handleReset = () => {
		this.setState({ hasError: false, error: null })
	}

	public render() {
		if (this.state.hasError) {
			if (this.props.fallback) {
				return this.props.fallback
			}

			return (
				<SafeAreaView style={styles.container}>
					<View style={styles.content}>
						<View style={styles.iconBadge}>
							<Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
						</View>

						<Text style={styles.title}>Something went wrong</Text>
						<Text style={styles.description}>
							An unexpected application error occurred. Please try reloading the screen.
						</Text>

						{__DEV__ && this.state.error?.message ? (
							<View style={styles.debugBox}>
								<Text style={styles.debugText} numberOfLines={4}>
									{this.state.error.message}
								</Text>
							</View>
						) : null}

						<TouchableOpacity style={styles.retryButton} onPress={this.handleReset} activeOpacity={0.85}>
							<Ionicons name="refresh-outline" size={18} color="#FFFFFF" style={styles.buttonIcon} />
							<Text style={styles.retryButtonText}>Reload Screen</Text>
						</TouchableOpacity>
					</View>
				</SafeAreaView>
			)
		}

		return this.props.children
	}
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#F8FAFC',
	},
	content: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: 24,
	},
	iconBadge: {
		width: 80,
		height: 80,
		borderRadius: 40,
		backgroundColor: '#FEF2F2',
		alignItems: 'center',
		justifyContent: 'center',
		marginBottom: 20,
		borderWidth: 1,
		borderColor: '#FEE2E2',
	},
	title: {
		fontSize: 20,
		fontWeight: '700',
		color: '#0F172A',
		marginBottom: 8,
		textAlign: 'center',
	},
	description: {
		fontSize: 14,
		color: '#64748B',
		textAlign: 'center',
		lineHeight: 20,
		marginBottom: 20,
	},
	debugBox: {
		backgroundColor: '#F1F5F9',
		padding: 12,
		borderRadius: 8,
		width: '100%',
		marginBottom: 20,
		borderWidth: 1,
		borderColor: '#E2E8F0',
	},
	debugText: {
		fontSize: 12,
		fontFamily: 'monospace',
		color: '#DC2626',
	},
	retryButton: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#0C7C7C',
		paddingHorizontal: 24,
		paddingVertical: 14,
		borderRadius: 12,
		width: '100%',
		maxWidth: 280,
	},
	buttonIcon: {
		marginRight: 8,
	},
	retryButtonText: {
		fontSize: 15,
		fontWeight: '700',
		color: '#FFFFFF',
	},
})

export default ErrorBoundary
