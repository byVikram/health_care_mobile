import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

interface AppointmentSummaryProps {
	serviceName: string
	serviceDescription: string
	appointmentDate: string
	appointmentTime: string
}

export default function AppointmentSummary({
	serviceName,
	serviceDescription,
	appointmentDate,
	appointmentTime,
}: AppointmentSummaryProps) {
	return (
		<View style={styles.card}>
			<Text style={styles.serviceName}>{serviceName}</Text>
			<Text style={styles.serviceDesc}>{serviceDescription}</Text>

			<View style={styles.metaContainer}>
				<View style={styles.metaRow}>
					<Ionicons name="calendar-outline" size={16} color="#667B8F" />
					<Text style={styles.metaText}>{appointmentDate}</Text>
				</View>
				<View style={styles.metaRow}>
					<Ionicons name="time-outline" size={16} color="#667B8F" />
					<Text style={styles.metaText}>{appointmentTime}</Text>
				</View>
			</View>
		</View>
	)
}

const styles = StyleSheet.create({
	card: {
		backgroundColor: '#FFFFFF',
		borderRadius: 16,
		padding: 16,
		borderWidth: 1,
		borderColor: '#E6EDF2',
		shadowColor: '#12373E',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.04,
		shadowRadius: 8,
		elevation: 2,
		marginBottom: 16,
	},
	serviceName: {
		fontSize: 16,
		fontWeight: '700',
		color: '#16324A',
		marginBottom: 6,
	},
	serviceDesc: {
		fontSize: 13,
		color: '#587087',
		lineHeight: 18,
		marginBottom: 14,
	},
	metaContainer: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 16,
		paddingTop: 12,
		borderTopWidth: 1,
		borderTopColor: '#F0F4F8',
	},
	metaRow: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	metaText: {
		fontSize: 13,
		color: '#16324A',
		fontWeight: '600',
		marginLeft: 6,
	},
})
