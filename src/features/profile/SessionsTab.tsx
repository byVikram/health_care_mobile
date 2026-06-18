import React, { useCallback, useEffect, useState } from 'react'
import { StyleSheet, View, ScrollView, RefreshControl, Animated, Easing } from 'react-native'
import { Card, useTheme, Surface } from 'react-native-paper'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { getSessions, logoutSession, Session } from '../auth/authService'
import StatusModal from '../../components/common/StatusModal'
import { AppTypography, AppButton, AppModal } from '../../components/common'

// --- Shimmer placeholder ------------------------------------------------------
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
					<Animated.View style={[styles.shimmerIcon, { opacity }]} />
					<View style={styles.detailsContainer}>
						<Animated.View style={[styles.shimmerLine, { width: '55%', height: 14, marginBottom: 6 }, { opacity }]} />
						<Animated.View style={[styles.shimmerLine, { width: '40%', height: 12, marginBottom: 4 }, { opacity }]} />
						<Animated.View style={[styles.shimmerLine, { width: '60%', height: 12 }, { opacity }]} />
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
		} catch {
			setFetchError('Unable to connect. Please check your network.')
		} finally {
			setIsLoading(false)
			setRefreshing(false)
		}
	}, [])

	useEffect(() => {
		fetchSessions()
	}, [fetchSessions])

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
				fetchSessions()
			} else {
				setModalMessage(response.message || 'Failed to logout session.')
				setModalType('error')
			}
		} catch {
			setModalMessage('An unexpected error occurred.')
			setModalType('error')
		} finally {
			setIsLoggingOut(false)
			setLogoutConfirmVisible(false)
			setSelectedSessionId(null)
		}
	}

	const renderDeviceIcon = (deviceType: string): keyof typeof MaterialCommunityIcons.glyphMap => {
		const type = (deviceType || '').toLowerCase()
		if (type.includes('mobile') || type.includes('ios') || type.includes('android')) return 'cellphone'
		if (type.includes('tablet') || type.includes('ipad')) return 'tablet'
		if (type.includes('desktop') || type.includes('monitor')) return 'monitor'
		return 'laptop'
	}

	const getRelativeTime = (dateString: string): string => {
		if (!dateString) return 'Unknown'
		const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000)
		if (seconds < 60) return 'Just now'
		const minutes = Math.floor(seconds / 60)
		if (minutes < 60) return `${minutes}m ago`
		const hours = Math.floor(minutes / 60)
		if (hours < 24) return `${hours}h ago`
		const days = Math.floor(hours / 24)
		if (days < 7) return `${days}d ago`
		return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
	}

	// --- Loading state ----------------------------------------------------------
	if (isLoading && !refreshing) {
		return (
			<View style={styles.container}>
				<View style={styles.header}>
					<AppTypography variant="h3" style={{ color: theme.colors.onSurface }}>
						Active Sessions
					</AppTypography>
					<AppTypography variant="caption" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
						Manage devices where you're currently signed in.
					</AppTypography>
				</View>
				<ShimmerPlaceholder />
				<ShimmerPlaceholder />
				<ShimmerPlaceholder />
			</View>
		)
	}

	// --- Error state ------------------------------------------------------------
	if (fetchError && sessions.length === 0) {
		return (
			<View style={styles.centeredContainer}>
				<MaterialCommunityIcons name="cloud-alert" size={40} color={theme.colors.error} />
				<AppTypography
					variant="body"
					align="center"
					style={{ color: theme.colors.error, marginVertical: 12 }}
				>
					{fetchError}
				</AppTypography>
				<AppButton variant="primary" onPress={() => fetchSessions()}>
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
					<AppTypography variant="h3" style={{ color: theme.colors.onSurface }}>
						Active Sessions
					</AppTypography>
					<AppTypography variant="caption" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
						Manage devices where you're currently signed in.
					</AppTypography>
				</View>

				{/* Empty state */}
				{sessions.length === 0 ? (
					<Surface style={styles.emptyState}>
						<MaterialCommunityIcons name="shield-check-outline" size={40} color={theme.colors.onSurfaceVariant} />
						<AppTypography variant="body" style={{ color: theme.colors.onSurfaceVariant, marginTop: 10 }}>
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
									borderWidth: 1.5,
								},
							]}
						>
							<Card.Content style={styles.cardContent}>
								<View style={styles.row}>
									{/* Icon */}
									<View style={[styles.iconContainer, { backgroundColor: theme.colors.surfaceVariant }]}>
										<MaterialCommunityIcons
											name={renderDeviceIcon(session.device_type)}
											size={20}
											color={session.is_current ? theme.colors.primary : theme.colors.onSurfaceVariant}
										/>
									</View>

									{/* Details */}
									<View style={styles.detailsContainer}>
										{/* Device name */}
										<AppTypography
											variant="body"
											numberOfLines={1}
											style={{ color: theme.colors.onSurface, fontWeight: '600' }}
										>
											{session.device_name || 'Unknown Device'}
										</AppTypography>

										{/* Current badge */}
										{session.is_current && (
											<View style={[styles.badge, { borderColor: theme.colors.primary }]}>
												<AppTypography
													variant="caption"
													style={[styles.badgeText, { color: theme.colors.primary }]}
												>
													Current Device
												</AppTypography>
											</View>
										)}

										{/* IP address — own line */}
										<View style={styles.metaRow}>
											<MaterialCommunityIcons
												name="web"
												size={12}
												color={theme.colors.onSurfaceVariant}
											/>
											<AppTypography
												variant="caption"
												style={{ color: theme.colors.onSurfaceVariant, marginLeft: 4 }}
											>
												{session.ip_address || 'Unknown IP'}
											</AppTypography>
										</View>

										{/* Last active — own line */}
										<View style={[styles.metaRow, { marginTop: 2 }]}>
											<MaterialCommunityIcons
												name="clock-outline"
												size={12}
												color={theme.colors.onSurfaceVariant}
											/>
											<AppTypography
												variant="caption"
												style={{ color: theme.colors.onSurfaceVariant, marginLeft: 4 }}
											>
												Last active {getRelativeTime(session.last_active_at)}
											</AppTypography>
										</View>
									</View>

									{/* Logout button — trailing, vertically centered */}
									{!session.is_current && (
										<AppButton
											variant="outline"
											textColor={theme.colors.error}
											style={[styles.logoutButton, { borderColor: theme.colors.error }]}
											labelStyle={styles.logoutButtonLabel}
											onPress={() => openLogoutConfirmation(session.id)}
											disabled={isLoggingOut}
											icon="logout"
											compact
										>
											Logout
										</AppButton>
									)}
								</View>
							</Card.Content>
						</Card>
					))
				)}
			</ScrollView>

			{/* Logout confirmation modal */}
			<AppModal
				visible={logoutConfirmVisible}
				onDismiss={() => setLogoutConfirmVisible(false)}
				title="Logout Session"
			>
				<View style={styles.modalIconContainer}>
					<MaterialCommunityIcons name="logout" size={28} color={theme.colors.error} />
				</View>
				<AppTypography
					variant="body"
					align="center"
					style={{ color: theme.colors.onSurfaceVariant, lineHeight: 20 }}
				>
					Are you sure you want to logout from this device? You will need to sign in again on that device.
				</AppTypography>
				<View style={styles.modalActions}>
					<AppButton variant="text" onPress={() => setLogoutConfirmVisible(false)}>
						Cancel
					</AppButton>
					<AppButton
						variant="text"
						onPress={handleLogout}
						loading={isLoggingOut}
						textColor={theme.colors.error}
						style={{ marginLeft: 8 }}
					>
						Logout
					</AppButton>
				</View>
			</AppModal>

			{/* Status modal */}
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
		backgroundColor: '#f8fafc',
	},
	content: {
		padding: 14,
		paddingBottom: 32,
	},
	centeredContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		padding: 32,
	},
	header: {
		marginBottom: 14,
		paddingHorizontal: 2,
	},
	card: {
		marginBottom: 8,
		borderRadius: 12,
		elevation: 1,
		backgroundColor: '#ffffff',
		borderWidth: 1,
		borderColor: 'transparent',
	},
	cardContent: {
		paddingVertical: 12,
		paddingHorizontal: 14,
	},
	row: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	iconContainer: {
		width: 40,
		height: 40,
		borderRadius: 12,
		justifyContent: 'center',
		alignItems: 'center',
		marginRight: 12,
		flexShrink: 0,
	},
	detailsContainer: {
		flex: 1,
		marginRight: 8,
	},
	badge: {
		alignSelf: 'flex-start',
		borderWidth: 1,
		borderRadius: 6,
		paddingHorizontal: 6,
		paddingVertical: 1,
		marginTop: 3,
		marginBottom: 4,
	},
	badgeText: {
		fontSize: 10,
		fontWeight: '700',
		textTransform: 'uppercase',
		letterSpacing: 0.4,
	},
	metaRow: {
		flexDirection: 'row',
		alignItems: 'center',
		marginTop: 4,
	},
	logoutButton: {
		borderWidth: 1.5,
		flexShrink: 0,
		minWidth: 0,
		paddingHorizontal: 0,
	},
	logoutButtonLabel: {
		fontSize: 12,
		fontWeight: '700',
		letterSpacing: 0.2,
	},
	emptyState: {
		marginTop: 16,
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 40,
		borderRadius: 12,
		backgroundColor: '#ffffff',
		elevation: 1,
	},
	modalIconContainer: {
		alignItems: 'center',
		marginBottom: 10,
	},
	modalActions: {
		flexDirection: 'row',
		justifyContent: 'flex-end',
		alignItems: 'center',
		marginTop: 16,
	},
	shimmerIcon: {
		width: 40,
		height: 40,
		borderRadius: 12,
		marginRight: 12,
		backgroundColor: '#E1E9EE',
	},
	shimmerLine: {
		borderRadius: 4,
		backgroundColor: '#E1E9EE',
	},
	deviceInfo: {
		flexDirection: 'row',
		alignItems: 'flex-start',
	},
})