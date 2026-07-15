import React from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'

import { AppTypography } from '../../../components/common'
import type { AppNotification } from '../../referrals/referralService'

type NotificationCardProps = {
	notification: AppNotification
	onPress: (notification: AppNotification) => void
}

function timeAgo(iso: string): string {
	const diff = Date.now() - new Date(iso).getTime()
	const mins = Math.floor(diff / 60000)
	if (mins < 1) return 'Just now'
	if (mins < 60) return `${mins}m ago`
	const hours = Math.floor(mins / 60)
	if (hours < 24) return `${hours}h ago`
	const days = Math.floor(hours / 24)
	return `${days}d ago`
}

export default function NotificationCard({ notification, onPress }: NotificationCardProps) {
	const isReferral = notification.type?.includes('referral')

	return (
		<Pressable
			style={[styles.card, !notification.is_read && styles.cardUnread]}
			onPress={() => onPress(notification)}
		>
			<View style={styles.contentRow}>
				<View style={[styles.imageWrap, { backgroundColor: isReferral ? '#e8f4f8' : '#f3e5f5' }]}>
					<MaterialCommunityIcons
						name={isReferral ? 'call-made' : 'bell-outline'}
						size={20}
						color={isReferral ? '#0c7c7c' : '#8e24aa'}
					/>
				</View>

				<View style={styles.textContent}>
					<AppTypography
						variant="h4"
						style={[styles.title, !notification.is_read && styles.titleUnread]}
						numberOfLines={1}
					>
						{notification.title}
					</AppTypography>
					<AppTypography variant="caption" style={styles.description} numberOfLines={2}>
						{notification.message}
					</AppTypography>
					<AppTypography variant="caption" style={styles.time}>
						{timeAgo(notification.created_at)}
					</AppTypography>
				</View>

				{!notification.is_read && <View style={styles.unreadDot} />}
			</View>
		</Pressable>
	)
}

const styles = StyleSheet.create({
	card: {
		backgroundColor: '#ffffff',
		borderRadius: 10,
		borderWidth: 1,
		borderColor: '#d9e6eb',
		paddingVertical: 10,
		paddingHorizontal: 10,
		marginBottom: 12,
	},
	cardUnread: {
		backgroundColor: '#f0f9f9',
		borderColor: 'rgba(12,124,124,0.2)',
	},
	contentRow: {
		flexDirection: 'row',
		alignItems: 'flex-start',
	},
	imageWrap: {
		width: 40,
		height: 40,
		borderRadius: 10,
		alignItems: 'center',
		justifyContent: 'center',
		marginRight: 12,
		flexShrink: 0,
	},
	textContent: {
		flex: 1,
		paddingRight: 10,
	},
	title: {
		color: '#2a2f33',
		fontSize: 14,
		lineHeight: 19,
		marginBottom: 2,
		fontWeight: '500',
	},
	titleUnread: {
		fontWeight: '700',
	},
	description: {
		color: '#8b959a',
		fontSize: 12,
		lineHeight: 16,
	},
	time: {
		color: '#b3bcc2',
		fontSize: 10,
		marginTop: 4,
	},
	unreadDot: {
		width: 8,
		height: 8,
		borderRadius: 4,
		backgroundColor: '#0c7c7c',
		marginTop: 4,
		flexShrink: 0,
	},
})