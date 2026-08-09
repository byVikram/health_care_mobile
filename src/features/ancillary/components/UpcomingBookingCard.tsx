import React from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { AncillaryBooking } from '../ancillaryService'
import BookingStatusBadge from './BookingStatusBadge'
import AppAvatar from '../../../components/common/AppAvatar'

interface UpcomingBookingCardProps {
	booking: AncillaryBooking
	onChat: (booking: AncillaryBooking) => void
	onReschedule: (booking: AncillaryBooking) => void
	onTrack: (booking: AncillaryBooking) => void
}

export default function UpcomingBookingCard({ booking, onChat, onReschedule, onTrack }: UpcomingBookingCardProps) {
	return (
		<View style={styles.card}>
			<View style={styles.headerRow}>
				<View style={styles.headerLeft}>
					<Text style={styles.serviceName}>{booking.serviceName}</Text>
					<BookingStatusBadge status="upcoming" />
				</View>
				<View style={styles.dateCol}>
					<Text style={styles.dateText}>{booking.date}</Text>
					{booking.timeRange ? <Text style={styles.timeText}>{booking.timeRange}</Text> : null}
				</View>
			</View>

			<View style={styles.providerRow}>
				<AppAvatar uri={booking.provider.avatar} name={booking.provider.name} size={44} style={styles.avatar} />
				<View style={styles.providerInfo}>
					<Text style={styles.providerName} numberOfLines={1}>{booking.provider.name}</Text>
					<Text style={styles.providerRole} numberOfLines={1}>{booking.provider.designation}</Text>
				</View>
				<TouchableOpacity style={styles.chatBtn} onPress={() => onChat(booking)} activeOpacity={0.8}>
					<Ionicons name="chatbubble-ellipses-outline" size={18} color="#2B6F71" />
				</TouchableOpacity>
			</View>

			<View style={styles.actionsRow}>
				<TouchableOpacity style={styles.outlineBtn} onPress={() => onReschedule(booking)} activeOpacity={0.8}>
					<Text style={styles.outlineBtnText}>Reschedule</Text>
				</TouchableOpacity>
				<TouchableOpacity style={styles.filledBtn} onPress={() => onTrack(booking)} activeOpacity={0.85}>
					<Text style={styles.filledBtnText}>Track Order</Text>
				</TouchableOpacity>
			</View>
		</View>
	)
}

const styles = StyleSheet.create({
	card: {
		backgroundColor: '#ffffff',
		borderRadius: 16,
		borderWidth: 1,
		borderColor: '#eceeee',
		padding: 16,
		elevation: 2,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.05,
		shadowRadius: 6,
	},
	headerRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'flex-start',
		marginBottom: 16,
	},
	headerLeft: {
		flexShrink: 1,
		marginRight: 12,
	},
	serviceName: {
		fontSize: 16,
		fontWeight: '800',
		color: '#191c1d',
		marginBottom: 6,
	},
	dateCol: {
		alignItems: 'flex-end',
	},
	dateText: {
		fontSize: 13,
		fontWeight: '700',
		color: '#191c1d',
	},
	timeText: {
		fontSize: 12,
		color: '#3f4849',
		marginTop: 2,
	},
	providerRow: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#f8fafa',
		borderRadius: 12,
		padding: 10,
		marginBottom: 16,
	},
	avatar: {
		width: 44,
		height: 44,
		borderRadius: 22,
		marginRight: 10,
		backgroundColor: '#eceeee',
	},
	providerInfo: {
		flex: 1,
	},
	providerName: {
		fontSize: 13,
		fontWeight: '700',
		color: '#191c1d',
	},
	providerRole: {
		fontSize: 12,
		color: '#3f4849',
		marginTop: 2,
	},
	chatBtn: {
		width: 36,
		height: 36,
		borderRadius: 18,
		backgroundColor: '#ffffff',
		alignItems: 'center',
		justifyContent: 'center',
		elevation: 1,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.08,
		shadowRadius: 2,
	},
	actionsRow: {
		flexDirection: 'row',
		gap: 12,
	},
	outlineBtn: {
		flex: 1,
		borderWidth: 2,
		borderColor: '#2B6F71',
		borderRadius: 12,
		paddingVertical: 12,
		alignItems: 'center',
	},
	outlineBtnText: {
		fontSize: 13,
		fontWeight: '800',
		color: '#2B6F71',
	},
	filledBtn: {
		flex: 1,
		backgroundColor: '#2B6F71',
		borderRadius: 12,
		paddingVertical: 12,
		alignItems: 'center',
	},
	filledBtnText: {
		fontSize: 13,
		fontWeight: '800',
		color: '#ffffff',
	},
})
