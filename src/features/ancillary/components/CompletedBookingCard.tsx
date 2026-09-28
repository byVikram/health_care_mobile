import React from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { AncillaryBooking } from '../ancillaryService'
import BookingStatusBadge from './BookingStatusBadge'
import AppRatingStars from '../../../components/common/display/AppRatingStars'
import AppAvatar from '../../../components/common/display/AppAvatar'
import { CommonCard } from '../../../components/common'

interface CompletedBookingCardProps {
	booking: AncillaryBooking
	onViewInvoice: (booking: AncillaryBooking) => void
	onBookAgain: (booking: AncillaryBooking) => void
	onRateReview: (booking: AncillaryBooking) => void
	/** Opens the existing Track Appointment page in its completed (read-only) view. */
	onViewDetails: (booking: AncillaryBooking) => void
}

export default function CompletedBookingCard({
	booking,
	onViewInvoice,
	onBookAgain,
	onRateReview,
	onViewDetails,
}: CompletedBookingCardProps) {
	const hasReview = booking.hasReview || (booking.rating != null && booking.rating > 0)
	const ratingValue = booking.rating || 5

	return (
		<CommonCard style={styles.card} onPress={() => onViewDetails(booking)}>
			{/* Top Header Row: Service Name + Status + Amount */}
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

			{/* Provider Row: Avatar, Name, Rating Tag */}
			<View style={styles.providerRow}>
				<AppAvatar
					uri={booking.provider.avatar}
					name={booking.provider.name}
					size={38}
					style={styles.avatar}
				/>
				<View style={styles.providerMetaCol}>
					<Text style={styles.providerName} numberOfLines={1}>
						{booking.provider.name}
					</Text>
					<Text style={styles.providerRole} numberOfLines={1}>
						{booking.provider.designation || 'Registered Nurse'}
					</Text>
				</View>

				{hasReview ? (
					<View style={styles.reviewedChip}>
						<AppRatingStars value={ratingValue} size={12} />
						<Text style={styles.reviewedScoreText}>{ratingValue.toFixed(1)}</Text>
					</View>
				) : (
					<View style={styles.pendingReviewChip}>
						<Text style={styles.pendingReviewText}>Awaiting Review</Text>
					</View>
				)}
			</View>

			{/* Primary Rating & Review Action Banner */}
			<View style={styles.reviewActionStrip}>
				{hasReview ? (
					<TouchableOpacity
						style={styles.viewReviewBtn}
						onPress={() => onRateReview(booking)}
						activeOpacity={0.8}
					>
						<View style={styles.reviewBtnLeft}>
							<Ionicons name="star" size={14} color="#D97706" />
							<Text style={styles.viewReviewBtnText}>View Your Review</Text>
						</View>
						<Ionicons name="chevron-forward" size={14} color="#0C7C7C" />
					</TouchableOpacity>
				) : (
					<TouchableOpacity
						style={styles.rateReviewBtn}
						onPress={() => onRateReview(booking)}
						activeOpacity={0.85}
					>
						<View style={styles.reviewBtnLeft}>
							<Ionicons name="star" size={15} color="#D97706" />
							<Text style={styles.rateReviewBtnText}>Rate & Review Service</Text>
						</View>
						<View style={styles.rateBadge}>
							<Text style={styles.rateBadgeText}>Earn Rewards</Text>
						</View>
					</TouchableOpacity>
				)}
			</View>

			{/* Secondary Actions: View Invoice + Book Again */}
			<View style={styles.actionsRow}>
				<TouchableOpacity
					style={styles.textBtn}
					onPress={() => onViewInvoice(booking)}
					activeOpacity={0.8}
				>
					<Text style={styles.textBtnText}>View Invoice</Text>
				</TouchableOpacity>
				<TouchableOpacity
					style={styles.filledBtn}
					onPress={() => onBookAgain(booking)}
					activeOpacity={0.85}
				>
					<Text style={styles.filledBtnText}>Book Again</Text>
				</TouchableOpacity>
			</View>
		</CommonCard>
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
		gap: 12,
	},
	headerRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'flex-start',
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
		borderTopWidth: 1,
		borderTopColor: '#f1f5f9',
		paddingTop: 12,
	},
	avatar: {
		width: 38,
		height: 38,
		borderRadius: 19,
		marginRight: 10,
		backgroundColor: '#eceeee',
	},
	providerMetaCol: {
		flex: 1,
		minWidth: 0,
		marginRight: 8,
	},
	providerName: {
		fontSize: 13.5,
		fontWeight: '700',
		color: '#191c1d',
	},
	providerRole: {
		fontSize: 11.5,
		color: '#64748b',
		marginTop: 1,
	},
	reviewedChip: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#FEF3C7',
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 10,
		gap: 4,
	},
	reviewedScoreText: {
		fontSize: 11,
		fontWeight: '800',
		color: '#92400E',
	},
	pendingReviewChip: {
		backgroundColor: '#F1F5F9',
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 8,
	},
	pendingReviewText: {
		fontSize: 10.5,
		fontWeight: '600',
		color: '#64748B',
	},

	/* Review Action Strip */
	reviewActionStrip: {
		borderTopWidth: 1,
		borderTopColor: '#f1f5f9',
		paddingTop: 10,
	},
	rateReviewBtn: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		backgroundColor: '#FFFBEB',
		borderColor: '#FDE68A',
		borderWidth: 1,
		paddingHorizontal: 12,
		paddingVertical: 9,
		borderRadius: 10,
	},
	reviewBtnLeft: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
	},
	rateReviewBtnText: {
		fontSize: 12.5,
		fontWeight: '700',
		color: '#92400E',
	},
	rateBadge: {
		backgroundColor: '#FEF3C7',
		paddingHorizontal: 6,
		paddingVertical: 2,
		borderRadius: 6,
	},
	rateBadgeText: {
		fontSize: 9.5,
		fontWeight: '800',
		color: '#B45309',
		textTransform: 'uppercase',
		letterSpacing: 0.3,
	},
	viewReviewBtn: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		backgroundColor: '#F0FDFA',
		borderColor: '#CCFBF1',
		borderWidth: 1,
		paddingHorizontal: 12,
		paddingVertical: 9,
		borderRadius: 10,
	},
	viewReviewBtnText: {
		fontSize: 12.5,
		fontWeight: '700',
		color: '#0C7C7C',
	},

	/* Actions Row */
	actionsRow: {
		flexDirection: 'row',
		gap: 10,
		borderTopWidth: 1,
		borderTopColor: '#eceeee',
		paddingTop: 10,
	},
	textBtn: {
		flex: 1,
		paddingVertical: 10,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#F8FAFC',
		borderColor: '#E2E8F0',
		borderWidth: 1,
		borderRadius: 10,
	},
	textBtnText: {
		fontSize: 12.5,
		fontWeight: '700',
		color: '#2B6F71',
	},
	filledBtn: {
		flex: 1,
		backgroundColor: '#2B6F71',
		borderRadius: 10,
		paddingVertical: 10,
		alignItems: 'center',
		justifyContent: 'center',
	},
	filledBtnText: {
		fontSize: 12.5,
		fontWeight: '800',
		color: '#ffffff',
	},
})

