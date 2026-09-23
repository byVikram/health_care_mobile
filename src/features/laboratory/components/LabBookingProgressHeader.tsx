import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'

interface LabBookingProgressHeaderProps {
	steps: string[]
	/** 0-based index of the step the patient is currently on. */
	currentIndex: number
}

/**
 * Slim step indicator shown at the top of each screen in the booking
 * journey (Patient Details → Lab & Slot → Booking Summary).
 */
export const LabBookingProgressHeader: React.FC<LabBookingProgressHeaderProps> = ({ steps, currentIndex }) => {
	return (
		<View style={styles.row}>
			{steps.map((label, index) => {
				const isDone = index < currentIndex
				const isCurrent = index === currentIndex
				const isLast = index === steps.length - 1
				return (
					<React.Fragment key={label}>
						<View style={styles.stepGroup}>
							<View style={[styles.dot, (isDone || isCurrent) && styles.dotActive]}>
								{isDone ? (
									<MaterialCommunityIcons name="check" size={11} color="#FFFFFF" />
								) : (
									<Text style={[styles.dotText, isCurrent && styles.dotTextCurrent]}>{index + 1}</Text>
								)}
							</View>
							<Text style={[styles.label, isCurrent && styles.labelCurrent]} numberOfLines={1}>
								{label}
							</Text>
						</View>
						{!isLast && <View style={[styles.connector, isDone && styles.connectorDone]} />}
					</React.Fragment>
				)
			})}
		</View>
	)
}

const styles = StyleSheet.create({
	row: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		paddingHorizontal: 16,
		paddingTop: 14,
		paddingBottom: 18,
	},
	stepGroup: {
		alignItems: 'center',
		width: 68,
	},
	dot: {
		width: 22,
		height: 22,
		borderRadius: 11,
		backgroundColor: '#F1F5F9',
		borderWidth: 1.5,
		borderColor: '#E2E8F0',
		alignItems: 'center',
		justifyContent: 'center',
		marginBottom: 5,
	},
	dotActive: {
		backgroundColor: '#0C7C7C',
		borderColor: '#0C7C7C',
	},
	dotText: {
		fontSize: 11,
		fontWeight: '700',
		color: '#64748B',
	},
	dotTextCurrent: {
		color: '#FFFFFF',
	},
	label: {
		fontSize: 10.5,
		fontWeight: '600',
		color: '#64748B',
		textAlign: 'center',
	},
	labelCurrent: {
		color: '#0C7C7C',
		fontWeight: '700',
	},
	connector: {
		flex: 1,
		height: 1.5,
		backgroundColor: '#E2E8F0',
		marginTop: 10,
		marginHorizontal: -6,
	},
	connectorDone: {
		backgroundColor: '#0C7C7C',
	},
})

export default LabBookingProgressHeader
