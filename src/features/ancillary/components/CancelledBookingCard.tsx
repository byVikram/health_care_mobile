import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { AncillaryBooking } from '../ancillaryService'
import BookingStatusBadge from './BookingStatusBadge'
import { CommonCard } from '../../../components/common'

interface CancelledBookingCardProps {
	booking: AncillaryBooking
}

export default function CancelledBookingCard({ booking }: CancelledBookingCardProps) {
	// The provider reached the address and the patient was not available (not a cancellation).
	const missed = String(booking.rawStatus ?? '').toUpperCase() === 'NO_SHOW'
	return (
		<CommonCard style={styles.card}>
			<View style={styles.headerRow}>
				<View style={styles.headerLeft}>
					<Text style={styles.serviceName}>{booking.serviceName}</Text>
					{missed ? (
						<Text style={styles.missedBadge}>Visit missed</Text>
					) : (
						<BookingStatusBadge status="cancelled" />
					)}
				</View>
				<View style={styles.dateCol}>
					<Text style={styles.dateText}>{booking.date}</Text>
				</View>
			</View>

			{booking.cancellationReason ? (
				<View style={styles.reasonBox}>
					<Text style={styles.reasonLabel}>Reason</Text>
					<Text style={styles.reasonText}>{booking.cancellationReason}</Text>
				</View>
			) : null}

			{(booking.refundStatus || booking.refundReferenceId) && (
				<View style={styles.footerRow}>
					{booking.refundStatus ? (
						<View style={styles.refundRow}>
							<Ionicons name="checkmark-circle" size={16} color="#2D8A5E" />
							<Text style={styles.refundText}>{booking.refundStatus}</Text>
						</View>
					) : <View />}
					{booking.refundReferenceId ? (
						<Text style={styles.refIdText}>Ref ID: {booking.refundReferenceId}</Text>
					) : null}
				</View>
			)}
		</CommonCard>
	)
}

const styles = StyleSheet.create({
	missedBadge: {
		alignSelf: 'flex-start',
		paddingHorizontal: 8,
		paddingVertical: 3,
		borderRadius: 6,
		overflow: 'hidden',
		fontSize: 11,
		fontWeight: '700',
		color: '#B3261E',
		backgroundColor: '#FDECEA',
	},
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
		opacity: 0.9,
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
	reasonBox: {
		backgroundColor: '#f8fafa',
		borderRadius: 12,
		padding: 10,
		marginBottom: 14,
	},
	reasonLabel: {
		fontSize: 11,
		fontWeight: '700',
		color: '#3f4849',
		textTransform: 'uppercase',
		letterSpacing: 0.4,
		marginBottom: 4,
	},
	reasonText: {
		fontSize: 13,
		color: '#191c1d',
	},
	footerRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		borderTopWidth: 1,
		borderTopColor: '#eceeee',
		paddingTop: 12,
	},
	refundRow: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	refundText: {
		fontSize: 13,
		fontWeight: '700',
		color: '#2D8A5E',
		marginLeft: 6,
	},
	refIdText: {
		fontSize: 12,
		color: '#3f4849',
	},
})
