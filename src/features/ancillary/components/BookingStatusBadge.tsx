import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { getStatusStyle } from '../../../constants/statusColors'

export type BookingStatus = 'upcoming' | 'completed' | 'cancelled'

interface BookingStatusBadgeProps {
	status: BookingStatus
}

const LABELS: Record<BookingStatus, string> = {
	upcoming: 'Upcoming',
	completed: 'Completed',
	cancelled: 'Cancelled',
}

export default function BookingStatusBadge({ status }: BookingStatusBadgeProps) {
	const style = getStatusStyle(status)

	return (
		<View style={[styles.badge, { backgroundColor: style.bgColor }]}>
			<Text style={[styles.text, { color: style.color }]}>{LABELS[status]}</Text>
		</View>
	)
}

const styles = StyleSheet.create({
	badge: {
		alignSelf: 'flex-start',
		paddingHorizontal: 8,
		paddingVertical: 3,
		borderRadius: 6,
	},
	text: {
		fontSize: 11,
		fontWeight: '700',
	},
})
