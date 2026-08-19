import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { getStatusStyle } from '../../../constants/statusColors'

interface ServiceStatusIndicatorProps {
	status: 'assigned' | 'verification_pending' | 'in_progress' | 'completed' | 'ASSIGNED' | 'EN_ROUTE' | 'ARRIVED' | 'IN_PROGRESS' | 'COMPLETED'
}

export default function ServiceStatusIndicator({ status }: ServiceStatusIndicatorProps) {
	let query = 'pending'
	let label = 'Assigned'

	switch (status) {
		case 'assigned':
		case 'ASSIGNED':
			query = 'pending'
			label = 'Assigned'
			break
		case 'EN_ROUTE':
			query = 'processing'
			label = 'En Route'
			break
		case 'ARRIVED':
		case 'verification_pending':
			query = 'pending_quote'
			label = 'Verification Pending'
			break
		case 'in_progress':
		case 'IN_PROGRESS':
			query = 'processing'
			label = 'Service In Progress'
			break
		case 'completed':
		case 'COMPLETED':
			query = 'completed'
			label = 'Completed'
			break
	}

	const style = getStatusStyle(query)

	return (
		<View style={[styles.badge, { backgroundColor: style.bgColor }]}>
			<Text style={[styles.text, { color: style.color }]}>{label}</Text>
		</View>
	)
}

const styles = StyleSheet.create({
	badge: {
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 12,
		alignSelf: 'flex-start',
	},
	text: {
		fontSize: 12,
		fontWeight: '700',
		letterSpacing: 0.3,
	},
})
