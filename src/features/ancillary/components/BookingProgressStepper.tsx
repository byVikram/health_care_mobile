import React from 'react'
import { StyleSheet, View, useWindowDimensions } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { AppTypography } from '../../../components/common/AppTypography'

export interface BookingProgressStepperProps {
	currentStep: 1 | 2 | 3
	style?: any
}

const STEPS = [
	{ id: 1, label: 'Services' },
	{ id: 2, label: 'Booking Details' },
	{ id: 3, label: 'Payment' },
]

export const BookingProgressStepper: React.FC<BookingProgressStepperProps> = ({
	currentStep,
	style,
}) => {
	const { width } = useWindowDimensions()
	const isTablet = width >= 768

	return (
		<View style={[styles.container, isTablet && styles.containerTablet, style]}>
			<View style={styles.stepperWrapper}>
				{STEPS.map((step, index) => {
					const isCompleted = step.id < currentStep
					const isActive = step.id === currentStep
					const isPending = step.id > currentStep
					const isLast = index === STEPS.length - 1

					return (
						<React.Fragment key={step.id}>
							{/* Step Node */}
							<View style={styles.stepNodeContainer}>
								{/* Circle Indicator */}
								<View
									style={[
										styles.circle,
										isCompleted && styles.circleCompleted,
										isActive && styles.circleActive,
										isPending && styles.circlePending,
									]}
								>
									{isCompleted ? (
										<Ionicons name="checkmark" size={12} color="#FFFFFF" />
									) : (
										<AppTypography
											variant="caption"
											style={[styles.numText, isActive && styles.numTextActive, isPending && styles.numTextPending]}
										>
											{step.id}
										</AppTypography>
									)}
								</View>

								{/* Label Below Circle */}
								<AppTypography
									variant="caption"
									style={[
										styles.labelText,
										isCompleted && styles.labelTextCompleted,
										isActive && styles.labelTextActive,
										isPending && styles.labelTextPending,
									]}
									numberOfLines={1}
								>
									{step.label}
								</AppTypography>
							</View>

							{/* Connecting Line between steps */}
							{!isLast && (
								<View style={styles.lineSegmentContainer}>
									<View
										style={[
											styles.connectingLine,
											step.id < currentStep ? styles.lineCompleted : styles.linePending,
										]}
									/>
								</View>
							)}
						</React.Fragment>
					)
				})}
			</View>
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		backgroundColor: '#FFFFFF',
		borderRadius: 14,
		paddingHorizontal: 16,
		paddingVertical: 10,
		marginBottom: 14,
		borderWidth: 1,
		borderColor: '#E8ECEC',
		elevation: 1,
		shadowColor: '#000000',
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.04,
		shadowRadius: 3,
	},
	containerTablet: {
		paddingHorizontal: 32,
		paddingVertical: 14,
		borderRadius: 16,
	},
	stepperWrapper: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		justifyContent: 'space-between',
		width: '100%',
	},
	stepNodeContainer: {
		alignItems: 'center',
		minWidth: 70,
	},
	circle: {
		width: 22,
		height: 22,
		borderRadius: 11,
		alignItems: 'center',
		justifyContent: 'center',
		marginBottom: 4,
	},
	circleCompleted: {
		backgroundColor: '#1F5F68',
	},
	circleActive: {
		backgroundColor: '#1F5F68',
		elevation: 2,
		shadowColor: '#1F5F68',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.3,
		shadowRadius: 3,
	},
	circlePending: {
		backgroundColor: '#F8FAFC',
		borderWidth: 1.5,
		borderColor: '#CBD5E1',
	},
	numText: {
		fontSize: 11,
		fontWeight: '700',
	},
	numTextActive: {
		color: '#FFFFFF',
	},
	numTextPending: {
		color: '#94A3B8',
	},
	labelText: {
		fontSize: 11,
		textAlign: 'center',
	},
	labelTextCompleted: {
		color: '#1F5F68',
		fontWeight: '600',
	},
	labelTextActive: {
		color: '#1F5F68',
		fontWeight: '700',
	},
	labelTextPending: {
		color: '#94A3B8',
		fontWeight: '500',
	},
	lineSegmentContainer: {
		flex: 1,
		paddingTop: 10,
		paddingHorizontal: 6,
	},
	connectingLine: {
		height: 2,
		borderRadius: 1,
	},
	lineCompleted: {
		backgroundColor: '#1F5F68',
	},
	linePending: {
		backgroundColor: '#E2E8F0',
	},
})
