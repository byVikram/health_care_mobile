import React, { useCallback, useEffect, useState } from 'react'
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'
import { useNavigation } from '@react-navigation/native'
import type { NavigationProp } from '@react-navigation/native'

import { AppTypography } from '../../components/common'
import NotificationCard from './components/NotificationCard'
import {
	getNotifications,
	markNotificationRead,
	type AppNotification,
} from '../referrals/referralService'
import { ROUTES } from '../../navigation/routes'
import type { AppStackParamList } from '../../navigation/types'

export default function NotificationPage({ navigation: navProp }: any) {
	const navigation = useNavigation<NavigationProp<AppStackParamList>>()
	const [notifications, setNotifications] = useState<AppNotification[]>([])
	const [loading, setLoading] = useState(true)
	const [refreshing, setRefreshing] = useState(false)

	const load = useCallback(async () => {
		try {
			const data = await getNotifications()
			setNotifications(data)
		} catch (error) {
			console.log('[NotificationPage] failed to load notifications', error)
		} finally {
			setLoading(false)
			setRefreshing(false)
		}
	}, [])

	useEffect(() => {
		load()
	}, [load])

	const handleRefresh = () => {
		setRefreshing(true)
		load()
	}

	const handlePress = async (notification: AppNotification) => {
		// Optimistically mark as read
		setNotifications((prev) =>
			prev.map((n) => (n.id === notification.id ? { ...n, is_read: true } : n))
		)
		try {
			await markNotificationRead(notification.id)
		} catch (error) {
			console.log('[NotificationPage] failed to mark notification read', error)
		}

		// Navigate based on redirect_type/redirect_id set by the backend
		if (notification.redirect_type === 'doctor_availability' && notification.redirect_id) {
			const referralId =
				notification.reference_type === 'referral' ? notification.reference_id ?? undefined : undefined
			navigation.navigate(ROUTES.STACK.DOCTOR_DETAIL, {
				id: notification.redirect_id,
				referralId,
			})
		} else if ((notification.redirect_type === 'appointment' || notification.redirect_type === 'appointment_detail') && notification.redirect_id) {
			navigation.navigate(ROUTES.STACK.APPOINTMENTS, {
				appointmentId: notification.redirect_id,
			})
		}
	}

	return (
		<SafeAreaView edges={['top']} style={styles.safeArea}>
			<View style={styles.header}>
				<View style={styles.waveOne} />
				<View style={styles.waveTwo} />

				<View style={styles.headerRow}>
					<Pressable
						onPress={() => (navProp ?? navigation)?.goBack?.()}
						hitSlop={10}
						style={styles.backButton}
					>
						<MaterialCommunityIcons name="chevron-left" size={24} color="#ffffff" />
					</Pressable>

					<AppTypography variant="h4" style={styles.headerTitle}>
						Notification
					</AppTypography>
				</View>
			</View>

			<FlatList
				data={notifications}
				keyExtractor={(item) => item.id}
				contentContainerStyle={styles.listContent}
				showsVerticalScrollIndicator={false}
				refreshControl={
					<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#0c7c7c']} />
				}
				renderItem={({ item }) => <NotificationCard notification={item} onPress={handlePress} />}
				ListEmptyComponent={
					!loading ? (
						<View style={styles.emptyState}>
							<MaterialCommunityIcons name="bell-outline" size={40} color="#b3bcc2" />
							<AppTypography variant="caption" style={styles.emptyText}>
								No notifications yet
							</AppTypography>
						</View>
					) : null
				}
			/>
		</SafeAreaView>
	)
}

const styles = StyleSheet.create({
	safeArea: {
		flex: 1,
		backgroundColor: '#f5f7f8',
	},
	header: {
		backgroundColor: '#346d74',
		paddingHorizontal: 16,
		paddingTop: 10,
		paddingBottom: 18,
		overflow: 'hidden',
	},
	waveOne: {
		position: 'absolute',
		width: 320,
		height: 150,
		borderRadius: 110,
		backgroundColor: 'rgba(255,255,255,0.06)',
		top: -58,
		left: -90,
		transform: [{ rotate: '-5deg' }],
	},
	waveTwo: {
		position: 'absolute',
		width: 320,
		height: 150,
		borderRadius: 110,
		backgroundColor: 'rgba(255,255,255,0.05)',
		top: -30,
		left: -45,
		transform: [{ rotate: '-5deg' }],
	},
	headerRow: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	backButton: {
		width: 28,
		height: 28,
		alignItems: 'center',
		justifyContent: 'center',
		marginRight: 4,
	},
	headerTitle: {
		color: '#ffffff',
		fontSize: 20,
		fontWeight: '500',
	},
	listContent: {
		paddingHorizontal: 16,
		paddingTop: 16,
		paddingBottom: 28,
		flexGrow: 1,
	},
	emptyState: {
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 80,
	},
	emptyText: {
		color: '#8b959a',
		fontSize: 13,
		marginTop: 10,
	},
})