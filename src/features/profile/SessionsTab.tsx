import React, { useCallback, useEffect, useState } from 'react'
import { StyleSheet, View, ScrollView, RefreshControl, Animated, Easing } from 'react-native'
import {
	Card,
	useTheme,
	Dialog,
	Portal,
	ActivityIndicator,
	IconButton,
	Surface,
} from 'react-native-paper'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { getSessions, logoutSession, Session } from '../auth/authService'
import StatusModal from '../../components/common/StatusModal'
import { AppTypography, AppButton } from '../../components/common'

// --- Small helper: shimmer placeholder ----------------------------------------
const ShimmerPlaceholder = () => {
	const animatedValue = new Animated.Value(0)

	useEffect(() => {
		const loop = Animated.loop(
			Animated.sequence([
				Animated.timing(animatedValue, {
					toValue: 1,
					duration: 800,
					easing: Easing.ease,
					useNativeDriver: true,
				}),
				Animated.timing(animatedValue, {
					toValue: 0,
					duration: 800,
					easing: Easing.ease,
					useNativeDriver: true,
				}),
			])
		)
		loop.start()
		return () => loop.stop()
	}, [])

	const opacity = animatedValue.interpolate({
		inputRange: [0, 1],
		outputRange: [0.3, 0.7],
	})

	return (
		<Card style={styles.card}>
			<Card.Content style={styles.cardContent}>
				<View style={styles.deviceInfo}>
					{/* Icon placeholder */}
					<Animated.View style={[styles.shimmerIconPlaceholder, { opacity }]} />
					<View style={styles.detailsContainer}>
						{/* Device name placeholder */}
						<Animated.View
							style={[styles.shimmerLine, { width: '60%', height: 16, marginBottom: 8 }, { opacity }]}
						/>
						{/* IP / location placeholder */}
						<Animated.View
							style={[styles.shimmerLine, { width: '40%', height: 12, marginBottom: 6 }, { opacity }]}
						/>
						{/* Time placeholder */}
						<Animated.View style={[styles.shimmerLine, { width: '50%', height: 12 }, { opacity }]} />
					</View>
				</View>
			</Card.Content>
		</Card>
	)
}

// --- Main component -----------------------------------------------------------
export default function SessionsTab() {
	const theme = useTheme()
	const [sessions, setSessions] = useState<Session[]>([])
	const [isLoading, setIsLoading] = useState(true)
	const [isLoggingOut, setIsLoggingOut] = useState(false)
	const [refreshing, setRefreshing] = useState(false)
	const [modalType, setModalType] = useState<'success' | 'error' | null>(null)
	const [modalMessage, setModalMessage] = useState('')
	const [logoutConfirmVisible, setLogoutConfirmVisible] = useState(false)
	const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null)
	const [fetchError, setFetchError] = useState<string | null>(null)

	// --- Data fetching ----------------------------------------------------------
	const fetchSessions = useCallback(async (isRefresh = false) => {
		try {
			if (isRefresh) setRefreshing(true)
			else setIsLoading(true)
			setFetchError(null)

			const response = await getSessions()
			if (response.success && response.data) {
				setSessions(response.data)
			} else {
				setFetchError(response.message || 'Failed to load sessions.')
			}
		} catch (error) {
			setFetchError('Unable to connect. Please check your network.')
		} finally {
			setIsLoading(false)
			setRefreshing(false)
		}
	}, [])

	useEffect(() => {
		fetchSessions()
	}, [fetchSessions])

	// --- Logout flow ------------------------------------------------------------
	const openLogoutConfirmation = (sessionId: string) => {
		setSelectedSessionId(sessionId)
		setLogoutConfirmVisible(true)
	}

	const handleLogout = async () => {
		if (!selectedSessionId) return
		try {
			setIsLoggingOut(true)
			const response = await logoutSession(selectedSessionId)
			if (response.success) {
				setModalMessage('Session logged out successfully.')
				setModalType('success')
				fetchSessions() // refresh list
			} else {
				setModalMessage(response.message || 'Failed to logout session.')
				setModalType('error')
			}
		} catch (error) {
			setModalMessage('An unexpected error occurred.')
			setModalType('error')
		} finally {
			setIsLoggingOut(false)
			setLogoutConfirmVisible(false)
			setSelectedSessionId(null)
		}
	}

	// --- Formatting helpers -----------------------------------------------------
	const renderDeviceIcon = (deviceType: string): keyof typeof MaterialCommunityIcons.glyphMap => {
		const type = (deviceType || '').toLowerCase()
		if (type.includes('mobile') || type.includes('ios') || type.includes('android')) return 'cellphone'
		if (type.includes('tablet') || type.includes('ipad')) return 'tablet'
		if (type.includes('desktop') || type.includes('monitor')) return 'monitor'
		return 'laptop'
	}

	// Returns a relative time string (e.g. "2 hours ago") plus the full date in a tooltip‑like display.
	const getRelativeTime = (dateString: string): string => {
		if (!dateString) return 'Unknown'
		const now = Date.now()
		const then = new Date(dateString).getTime()
		const seconds = Math.floor((now - then) / 1000)
		if (seconds < 60) return 'Just now'
		const minutes = Math.floor(seconds / 60)
		if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`
		const hours = Math.floor(minutes / 60)
		if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`
		const days = Math.floor(hours / 24)
		if (days < 7) return `${days} day${days !== 1 ? 's' : ''} ago`
		return new Date(dateString).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric',
		})
	}

	const formatFullDate = (dateString: string): string => {
		if (!dateString) return ''
		return new Date(dateString).toLocaleString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric',
			hour: 'numeric',
			minute: '2-digit',
			hour12: true,
		})
	}

	// --- Render: loading state (shimmer) ----------------------------------------
	if (isLoading && !refreshing) {
		return (
			<View style={styles.container}>
				<View style={styles.header}>
					<AppTypography style={[styles.title, { color: theme.colors.onSurface }]}>Active Sessions</AppTypography>
					<AppTypography style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
						Manage the devices where your account is currently logged in.
					</AppTypography>
				</View>
				{/* Show three shimmer cards */}
				<ShimmerPlaceholder />
				<ShimmerPlaceholder />
				<ShimmerPlaceholder />
			</View>
		)
	}

	// --- Render: error state ----------------------------------------------------
	if (fetchError && sessions.length === 0) {
		return (
			<View style={styles.centeredContainer}>
				<MaterialCommunityIcons name="cloud-alert" size={48} color={theme.colors.error} />
				<AppTypography style={[styles.errorText, { color: theme.colors.error }]}>{fetchError}</AppTypography>
				<AppButton variant="primary" onPress={() => fetchSessions()} style={styles.retryButton}>
					Retry
				</AppButton>
			</View>
		)
	}

	// --- Main UI ----------------------------------------------------------------
	return (
		<View style={styles.container}>
			<ScrollView
				contentContainerStyle={styles.content}
				refreshControl={
					<RefreshControl
						refreshing={refreshing}
						onRefresh={() => fetchSessions(true)}
						colors={[theme.colors.primary]}
						tintColor={theme.colors.primary}
					/>
				}
			>
				{/* Header */}
				<View style={styles.header}>
					<AppTypography style={[styles.title, { color: theme.colors.onSurface }]}>Active Sessions</AppTypography>
					<AppTypography style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
						Manage the devices where your account is currently logged in.
					</AppTypography>
				</View>

				{/* Empty state */}
				{sessions.length === 0 ? (
					<Surface style={styles.emptyState}>
						<MaterialCommunityIcons
							name="shield-check-outline"
							size={48}
							color={theme.colors.onSurfaceVariant}
						/>
						<AppTypography style={[styles.emptyStateText, { color: theme.colors.onSurfaceVariant }]}>
							No active sessions found.
						</AppTypography>
					</Surface>
				) : (
					sessions.map((session) => (
						<Card
							key={session.id}
							style={[
								styles.card,
								session.is_current && {
									borderColor: theme.colors.primary,
									// backgroundColor: theme.colors.primaryContainer + '1A', // 10% opacity
								},
							]}
						>
							<Card.Content style={styles.cardContent}>
								{/* Device info row */}
								<View style={styles.deviceInfo}>
									<View
										style={[styles.iconContainer, { backgroundColor: theme.colors.surfaceVariant }]}
									>
										<MaterialCommunityIcons
											name={renderDeviceIcon(session.device_type)}
											size={24}
											color={
												session.is_current
													? theme.colors.primary
													: theme.colors.onSurfaceVariant
											}
										/>
									</View>

									<View style={styles.detailsContainer}>
										{/* Device name + current badge */}
										<View style={styles.deviceHeader}>
											<AppTypography
												style={[styles.deviceName, { color: theme.colors.onSurface }]}
												numberOfLines={1}
												ellipsizeMode="tail"
											>
												{session.device_name || 'Unknown Device'}
											</AppTypography>
											{session.is_current && (
												<View
													style={[
														styles.badge,
														{ borderColor: theme.colors.primary, borderWidth: 1 },
													]}
												>
													<AppTypography style={[styles.badgeText, { color: theme.colors.primary }]}>
														Current
													</AppTypography>
												</View>
											)}
										</View>

										{/* IP / location */}
										<AppTypography style={[styles.ipAddress, { color: theme.colors.onSurfaceVariant }]}>
											{session.ip_address || 'Unknown IP'}
											{session.location ? ` – ${session.location}` : ''}
										</AppTypography>

										{/* Last active with relative time */}
										<View style={styles.timeInfo}>
											<MaterialCommunityIcons
												name="clock-outline"
												size={14}
												color={theme.colors.onSurfaceVariant}
											/>
											<AppTypography style={[styles.timeText, { color: theme.colors.onSurfaceVariant }]}>
												Last active: {getRelativeTime(session.last_active_at)}
											</AppTypography>
										</View>
										{session.last_active_at && (
											<AppTypography
												style={[styles.fullDateText, { color: theme.colors.onSurfaceVariant }]}
											>
												{formatFullDate(session.last_active_at)}
											</AppTypography>
										)}
									</View>
								</View>

								{/* Logout button (only for non‑current sessions) */}
								{!session.is_current && (
									<AppButton
										variant="outline"
										textColor={theme.colors.error}
										style={[styles.logoutButton, { borderColor: theme.colors.error }]}
										labelStyle={styles.logoutButtonLabel}
										onPress={() => openLogoutConfirmation(session.id)}
										disabled={isLoggingOut}
										icon="logout"
									>
										Logout
									</AppButton>
								)}
							</Card.Content>
						</Card>
					))
				)}
			</ScrollView>

			{/* Logout confirmation dialog */}
			<Portal>
				<Dialog visible={logoutConfirmVisible} onDismiss={() => setLogoutConfirmVisible(false)}>
					<Dialog.Icon icon="logout" color={theme.colors.error} />
					<Dialog.Title style={styles.dialogTitle}>Logout Session</Dialog.Title>
					<Dialog.Content>
						<AppTypography>
							Are you sure you want to logout from this device? You will need to sign in again on that
							device.
						</AppTypography>
					</Dialog.Content>
					<Dialog.Actions>
						<AppButton variant="text" onPress={() => setLogoutConfirmVisible(false)}>Cancel</AppButton>
						<AppButton variant="text" onPress={handleLogout} loading={isLoggingOut} textColor={theme.colors.error}>
							Logout
						</AppButton>
					</Dialog.Actions>
				</Dialog>
			</Portal>

			{/* Status modal (success / error feedback) */}
			<StatusModal
				visible={modalType !== null}
				status={modalType === 'success' ? 'success' : 'error'}
				title={modalType === 'success' ? 'Success' : 'Error'}
				description={modalMessage}
				submitText="Okay"
				onSubmit={() => setModalType(null)}
				onCancel={() => setModalType(null)}
			/>
		</View>
	)
}

// --- Styles -------------------------------------------------------------------
const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#f8fafc', // subtle cool gray – you can also use theme.colors.background
	},
	content: {
		padding: 16,
		paddingBottom: 40,
	},
	centeredContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		padding: 32,
	},
	header: {
		marginBottom: 20,
		paddingHorizontal: 4,
	},
	title: {
		fontSize: 24,
		fontWeight: '700',
		letterSpacing: 0.15,
		marginBottom: 4,
	},
	subtitle: {
		fontSize: 15,
		lineHeight: 20,
		opacity: 0.8,
	},
	card: {
		marginBottom: 12,
		borderRadius: 14,
		elevation: 1,
		backgroundColor: '#ffffff',
		borderWidth: 1,
		borderColor: 'transparent',
	},
	cardContent: {
		padding: 16,
	},
	deviceInfo: {
		flexDirection: 'row',
		alignItems: 'flex-start',
	},
	iconContainer: {
		width: 50,
		height: 50,
		borderRadius: 16,
		justifyContent: 'center',
		alignItems: 'center',
		marginRight: 14,
	},
	detailsContainer: {
		flex: 1,
	},
	deviceHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 4,
	},
	deviceName: {
		fontSize: 17,
		fontWeight: '600',
		flexShrink: 1,
		marginRight: 8,
	},
	badge: {
		paddingHorizontal: 10,
		paddingVertical: 3,
		borderRadius: 12,
	},
	badgeText: {
		fontSize: 12,
		fontWeight: '700',
		textTransform: 'uppercase',
		letterSpacing: 0.3,
	},
	ipAddress: {
		fontSize: 14,
		marginBottom: 6,
		fontWeight: '500',
	},
	timeInfo: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 2,
	},
	timeText: {
		fontSize: 13,
		marginLeft: 5,
		fontWeight: '500',
	},
	fullDateText: {
		fontSize: 12,
		opacity: 0.7,
		marginLeft: 19, // aligns with text after icon
	},
	logoutButton: {
		marginTop: 14,
		alignSelf: 'flex-start',
		borderWidth: 1.5,
	},
	logoutButtonLabel: {
		fontSize: 14,
		fontWeight: '700',
		letterSpacing: 0.3,
	},
	emptyState: {
		marginTop: 20,
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 48,
		borderRadius: 14,
		backgroundColor: '#ffffff',
		elevation: 1,
	},
	emptyStateText: {
		marginTop: 14,
		fontSize: 16,
		fontWeight: '500',
	},
	errorText: {
		fontSize: 16,
		textAlign: 'center',
		marginVertical: 16,
	},
	retryButton: {
		marginTop: 8,
	},
	dialogTitle: {
		textAlign: 'center',
	},
	// Shimmer styles
	shimmerIconPlaceholder: {
		width: 50,
		height: 50,
		borderRadius: 16,
		marginRight: 14,
		backgroundColor: '#E1E9EE',
	},
	shimmerLine: {
		borderRadius: 4,
		backgroundColor: '#E1E9EE',
	},
})
