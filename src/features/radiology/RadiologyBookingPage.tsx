// RadiologyBookingPage.tsx
import React, { useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView } from 'react-native'
import { useRoute, useNavigation } from '@react-navigation/native'
import { createRadiologyBooking } from './RadiologyService'

export default function RadiologyBookingPage() {
	const route = useRoute()
	const navigation = useNavigation()
	const { radiologyId, scanId, scanName, centerName } = route.params as any

	const [date, setDate] = useState('')
	const [time, setTime] = useState('')
	const [notes, setNotes] = useState('')
	const [loading, setLoading] = useState(false)

	const handleBooking = async () => {
		setLoading(true)
		try {
			await createRadiologyBooking({
				radiology_id: radiologyId,
				scan_ids: [scanId],

				booking_date: date,
				booking_time: time,
				notes,
				treatment_id: '',
				external_prescription_s3_key: null,
			})
			// Show success and navigate back
			navigation.goBack()
		} catch (error) {
			console.error('Booking failed:', error)
		} finally {
			setLoading(false)
		}
	}

	return (
		<ScrollView style={styles.container}>
			<Text style={styles.title}>Book {scanName}</Text>
			<Text style={styles.subtitle}>at {centerName}</Text>

			<View style={styles.form}>
				<Text style={styles.label}>Preferred Date</Text>
				<TextInput style={styles.input} placeholder="YYYY-MM-DD" value={date} onChangeText={setDate} />

				<Text style={styles.label}>Preferred Time</Text>
				<TextInput style={styles.input} placeholder="HH:MM" value={time} onChangeText={setTime} />

				<Text style={styles.label}>Additional Notes</Text>
				<TextInput
					style={[styles.input, styles.textArea]}
					placeholder="Any special requirements..."
					value={notes}
					onChangeText={setNotes}
					multiline
					numberOfLines={4}
				/>

				<TouchableOpacity style={styles.bookButton} onPress={handleBooking} disabled={loading}>
					<Text style={styles.bookButtonText}>{loading ? 'Booking...' : 'Confirm Booking'}</Text>
				</TouchableOpacity>
			</View>
		</ScrollView>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#F5F7FA',
		padding: 16,
	},
	title: {
		fontSize: 24,
		fontWeight: '700',
		color: '#101828',
	},
	subtitle: {
		fontSize: 16,
		color: '#667085',
		marginTop: 4,
		marginBottom: 24,
	},
	form: {
		backgroundColor: '#fff',
		borderRadius: 12,
		padding: 16,
	},
	label: {
		fontSize: 14,
		fontWeight: '600',
		color: '#344054',
		marginBottom: 4,
		marginTop: 12,
	},
	input: {
		borderWidth: 1,
		borderColor: '#D0D5DD',
		borderRadius: 8,
		padding: 12,
		fontSize: 14,
		backgroundColor: '#F9FAFB',
	},
	textArea: {
		height: 100,
		textAlignVertical: 'top',
	},
	bookButton: {
		backgroundColor: '#2B6F71',
		borderRadius: 12,
		paddingVertical: 14,
		alignItems: 'center',
		marginTop: 24,
	},
	bookButtonText: {
		color: '#fff',
		fontSize: 16,
		fontWeight: '700',
	},
})
