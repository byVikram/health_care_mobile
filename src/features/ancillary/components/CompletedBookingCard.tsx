import React from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { AncillaryBooking } from '../ancillaryService'
import BookingStatusBadge from './BookingStatusBadge'
import RatingStars from './RatingStars'
import AppAvatar from '../../../components/common/AppAvatar'

interface CompletedBookingCardProps {
	booking: AncillaryBooking
	onViewInvoice: (booking: AncillaryBooking) => void
	onBookAgain: (booking: AncillaryBooking) => void
}

export default function CompletedBookingCard({ booking, onViewInvoice, onBookAgain }: CompletedBookingCardProps) {
	return (
		<View style={styles.card}>
			<View style={styles.headerRow}>
				<View style={styles.headerLeft}>
					<Text style={styles.serviceName}>{booking.serviceName}</Text>
					<BookingStatusBadge status="completed" />
				</View>
				<View style={styles.dateCol}>
					<Text style={styles.dateText}>{booking.date}</Text>
					{booking.amount != null ? <Text style={styles.amountText}>₹{booking.amount}</Text> : null}
				</View>
			</View>

			<View style={styles.providerRow}>
				<AppAvatar uri={booking.provider.avatar} name={booking.provider.name} size={36} style={styles.avatar} />
				<Text style={styles.providerName} numberOfLines={1}>{booking.provider.name}</Text>
				{booking.rating != null && (
					<View style={styles.ratingWrap}>
						<RatingStars rating={booking.rating} />
					</View>
				)}
			</View>

			<View style={styles.actionsRow}>
				<TouchableOpacity style={styles.textBtn} onPress={() => onViewInvoice(booking)} activeOpacity={0.8}>
					<Text style={styles.textBtnText}>View Invoice</Text>
				</TouchableOpacity>
				<TouchableOpacity style={styles.filledBtn} onPress={() => onBookAgain(booking)} activeOpacity={0.85}>
					<Text style={styles.filledBtnText}>Book Again</Text>
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
		marginBottom: 14,
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
		fontSize: 12,
		color: '#3f4849',
	},
	amountText: {
		fontSize: 16,
		fontWeight: '800',
		color: '#2B6F71',
		marginTop: 2,
	},
	providerRow: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 14,
		borderTopWidth: 1,
		borderTopColor: '#eceeee',
		paddingTop: 14,
	},
	avatar: {
		width: 36,
		height: 36,
		borderRadius: 18,
		marginRight: 10,
		backgroundColor: '#eceeee',
	},
	providerName: {
		flex: 1,
		fontSize: 13,
		fontWeight: '700',
		color: '#191c1d',
	},
	ratingWrap: {
		flexDirection: 'row',
	},
	actionsRow: {
		flexDirection: 'row',
		gap: 12,
		borderTopWidth: 1,
		borderTopColor: '#eceeee',
		paddingTop: 14,
	},
	textBtn: {
		flex: 1,
		paddingVertical: 12,
		alignItems: 'center',
	},
	textBtnText: {
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
