import React from 'react'
import { StyleSheet, View, TouchableOpacity, useWindowDimensions } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import { AppTypography } from '../../../components/common/AppTypography'
import { ROUTES } from '../../../navigation/routes'

export interface BookingProgressStepperProps {
	currentStep: 1 | 2 | 3
	style?: any
	onStepPress?: (step: 1 | 2 | 3) => void
}

const STEPS: { id: 1 | 2 | 3; label: string }[] = [
	{ id: 1, label: 'Services' },
	{ id: 2, label: 'Booking Details' },
	{ id: 3, label: 'Payment' },
]

export const BookingProgressStepper: React.FC<BookingProgressStepperProps> = ({
	currentStep,
	style,
	onStepPress,
}) => {
	const navigation = useNavigation<any>()
	const { width } = useWindowDimensions()
	const isTablet = width >= 768

	const handleStepClick = (stepId: 1 | 2 | 3) => {
		if (stepId === currentStep) return

		if (onStepPress) {
			onStepPress(stepId)
			return
		}

		if (stepId === 1) {
			if (navigation.canGoBack()) {
				navigation.goBack()
			} else {
				navigation.navigate(ROUTES.STACK.ANCILLARY_SERVICES)
			}
		} else if (stepId === 2) {
			if (currentStep === 3) {
				navigation.goBack()
			} else {
				navigation.navigate(ROUTES.STACK.ANCILLARY_BOOKING_DETAILS)
			}
		} else if (stepId === 3) {
			if (currentStep === 2) {
				navigation.navigate(ROUTES.STACK.ANCILLARY_PAYMENT)
			}
		}
	}

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
							{/* Interactive Step Node */}
							<TouchableOpacity
								style={styles.stepNodeContainer}
								onPress={() => handleStepClick(step.id)}
								activeOpacity={0.7}
								disabled={isActive}
							>
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
							</TouchableOpacity>

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
		borderWidth: 1,
		borderColor: '#E8ECEC',
	},
	containerTablet: {
		paddingHorizontal: 24,
		paddingVertical: 14,
	},
	stepperWrapper: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	stepNodeContainer: {
		alignItems: 'center',
		justifyContent: 'center',
		minWidth: 70,
	},
	circle: {
		width: 26,
		height: 26,
		borderRadius: 13,
		justifyContent: 'center',
		alignItems: 'center',
		marginBottom: 4,
	},
	circleCompleted: {
		backgroundColor: '#2B6F71',
	},
	circleActive: {
		backgroundColor: '#2B6F71',
		borderWidth: 2,
		borderColor: 'rgba(43, 111, 113, 0.3)',
	},
	circlePending: {
		backgroundColor: '#F1F4F4',
		borderWidth: 1,
		borderColor: '#E0E7EF',
	},
	numText: {
		fontSize: 12,
		fontWeight: '700',
	},
	numTextActive: {
		color: '#FFFFFF',
	},
	numTextPending: {
		color: '#64748B',
	},
	labelText: {
		fontSize: 11.5,
		fontWeight: '600',
	},
	labelTextCompleted: {
		color: '#2B6F71',
	},
	labelTextActive: {
		color: '#2B6F71',
		fontWeight: '700',
	},
	labelTextPending: {
		color: '#94A3B8',
	},
	lineSegmentContainer: {
		flex: 1,
		paddingHorizontal: 4,
		marginTop: -16,
	},
	connectingLine: {
		height: 2,
		borderRadius: 1,
	},
	lineCompleted: {
		backgroundColor: '#2B6F71',
	},
	linePending: {
		backgroundColor: '#E0E7EF',
	},
})
