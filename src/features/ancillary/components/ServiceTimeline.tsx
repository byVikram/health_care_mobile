import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

type StepStatus = 'assigned' | 'verification_pending' | 'in_progress' | 'completed' | 'ASSIGNED' | 'EN_ROUTE' | 'ARRIVED' | 'IN_PROGRESS' | 'COMPLETED'

interface ServiceTimelineProps {
	currentStatus: StepStatus
}

export default function ServiceTimeline({ currentStatus }: ServiceTimelineProps) {
	const steps: { key: StepStatus; label: string }[] = [
		{ key: 'assigned', label: 'Assigned' },
		{ key: 'verification_pending', label: 'Verify' },
		{ key: 'in_progress', label: 'In Progress' },
		{ key: 'completed', label: 'Completed' },
	]

	const getStepIndex = (status: StepStatus) => {
		return steps.findIndex((step) => step.key === status)
	}

	const activeIndex = getStepIndex(currentStatus)

	return (
		<View style={styles.container}>
			{steps.map((step, index) => {
				const isCompleted = index < activeIndex
				const isActive = index === activeIndex
				const isLast = index === steps.length - 1

				return (
					<React.Fragment key={step.key}>
						{/* Step Item */}
						<View style={styles.stepItem}>
							<View
								style={[
									styles.circle,
									isCompleted && styles.circleCompleted,
									isActive && styles.circleActive,
								]}
							>
								{isCompleted ? (
									<Ionicons name="checkmark" size={14} color="#FFFFFF" />
								) : (
									<Text style={[styles.stepNumber, isActive && styles.stepNumberActive]}>
										{index + 1}
									</Text>
								)}
							</View>
							<Text
								style={[
									styles.label,
									isCompleted && styles.labelCompleted,
									isActive && styles.labelActive,
								]}
							>
								{step.label}
							</Text>
						</View>

						{/* Connector Line */}
						{!isLast && (
							<View
								style={[
									styles.connector,
									index < activeIndex && styles.connectorCompleted,
								]}
							/>
						)}
					</React.Fragment>
				)
			})}
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 8,
		marginVertical: 18,
		backgroundColor: '#FFFFFF',
		borderRadius: 16,
		paddingVertical: 16,
		borderWidth: 1,
		borderColor: '#E6EDF2',
	},
	stepItem: {
		alignItems: 'center',
		flex: 1,
	},
	circle: {
		width: 28,
		height: 28,
		borderRadius: 14,
		backgroundColor: '#F1F5F9',
		justifyContent: 'center',
		alignItems: 'center',
		borderWidth: 1,
		borderColor: '#CBD5E1',
		marginBottom: 6,
	},
	circleActive: {
		backgroundColor: '#2B6F71',
		borderColor: '#2B6F71',
	},
	circleCompleted: {
		backgroundColor: '#10B981',
		borderColor: '#10B981',
	},
	stepNumber: {
		fontSize: 12,
		fontWeight: '700',
		color: '#64748B',
	},
	stepNumberActive: {
		color: '#FFFFFF',
	},
	label: {
		fontSize: 11,
		fontWeight: '600',
		color: '#64748B',
		textAlign: 'center',
	},
	labelActive: {
		color: '#2B6F71',
		fontWeight: '700',
	},
	labelCompleted: {
		color: '#10B981',
	},
	connector: {
		height: 2,
		flex: 0.5,
		backgroundColor: '#E2E8F0',
		alignSelf: 'center',
		marginBottom: 20, // aligns line center with circles
	},
	connectorCompleted: {
		backgroundColor: '#10B981',
	},
})
