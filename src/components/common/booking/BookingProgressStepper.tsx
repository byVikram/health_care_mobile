import React from 'react'
import { StyleProp, StyleSheet, Text, TouchableOpacity, View, ViewStyle, useWindowDimensions } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

export interface BookingStepperTheme {
	circleSize?: number
	numberFontSize?: number
	labelFontSize?: number
	/** Fill color for a completed or current-step circle, and (when
	 *  `highlightCompletedLabel` is set) the label color for completed steps. */
	activeColor?: string
	/** Extra ring drawn only around the CURRENT step's circle. Omit for no
	 *  ring (completed and current circles then look identical, matching
	 *  Laboratory's original design). */
	activeRingColor?: string
	activeRingWidth?: number
	pendingBackgroundColor?: string
	pendingBorderColor?: string
	pendingBorderWidth?: number
	pendingTextColor?: string
	/** When true, a step that's already been passed keeps the highlighted
	 *  `activeColor` label (Ancillary's behavior). When false (default), only
	 *  the current step's label is highlighted and completed labels fall
	 *  back to `pendingTextColor` (Laboratory's original behavior). */
	highlightCompletedLabel?: boolean
	cardWrapper?: boolean
	cardBackgroundColor?: string
	cardBorderColor?: string
	cardBorderRadius?: number
	cardPaddingHorizontal?: number
	cardPaddingVertical?: number
}

const DEFAULT_THEME: Required<Omit<BookingStepperTheme, 'activeRingColor'>> & Pick<BookingStepperTheme, 'activeRingColor'> = {
	circleSize: 22,
	numberFontSize: 11,
	labelFontSize: 10.5,
	activeColor: '#0C7C7C',
	activeRingColor: undefined,
	activeRingWidth: 2,
	pendingBackgroundColor: '#F1F5F9',
	pendingBorderColor: '#E2E8F0',
	pendingBorderWidth: 1.5,
	pendingTextColor: '#64748B',
	highlightCompletedLabel: false,
	cardWrapper: false,
	cardBackgroundColor: '#FFFFFF',
	cardBorderColor: '#E8ECEC',
	cardBorderRadius: 14,
	cardPaddingHorizontal: 16,
	cardPaddingVertical: 10,
}

export interface BookingProgressStepperProps {
	steps: { label: string }[]
	/** 0-based index of the step the patient is currently on. */
	currentIndex: number
	onStepPress?: (index: number) => void
	theme?: BookingStepperTheme
	style?: StyleProp<ViewStyle>
}

export const BookingProgressStepper: React.FC<BookingProgressStepperProps> = ({
	steps,
	currentIndex,
	onStepPress,
	theme,
	style,
}) => {
	const t = { ...DEFAULT_THEME, ...theme }
	const { width } = useWindowDimensions()
	const isTablet = width >= 768

	const content = (
		<View style={styles.row}>
			{steps.map((step, index) => {
				const isCompleted = index < currentIndex
				const isCurrent = index === currentIndex
				const isPending = index > currentIndex
				const isLast = index === steps.length - 1
				const isFilled = isCompleted || isCurrent

				return (
					<React.Fragment key={index}>
						<TouchableOpacity
							style={[styles.stepGroup, { minWidth: t.circleSize + 46 }]}
							onPress={() => onStepPress?.(index)}
							activeOpacity={0.7}
							disabled={isCurrent}
						>
							<View
								style={[
									styles.circle,
									{
										width: t.circleSize,
										height: t.circleSize,
										borderRadius: t.circleSize / 2,
									},
									isFilled
										? { backgroundColor: t.activeColor }
										: {
												backgroundColor: t.pendingBackgroundColor,
												borderWidth: t.pendingBorderWidth,
												borderColor: t.pendingBorderColor,
											},
									isCurrent && t.activeRingColor
										? { borderWidth: t.activeRingWidth, borderColor: t.activeRingColor }
										: null,
								]}
							>
								{isCompleted ? (
									<Ionicons name="checkmark" size={Math.round(t.circleSize * 0.5)} color="#FFFFFF" />
								) : (
									<Text
										style={[
											styles.numText,
											{ fontSize: t.numberFontSize },
											{ color: isCurrent ? '#FFFFFF' : t.pendingTextColor },
										]}
									>
										{index + 1}
									</Text>
								)}
							</View>

							<Text
								style={[
									styles.labelText,
									{ fontSize: t.labelFontSize },
									isCurrent
										? { color: t.activeColor, fontWeight: '700' }
										: isCompleted && t.highlightCompletedLabel
											? { color: t.activeColor }
											: { color: t.pendingTextColor },
								]}
								numberOfLines={1}
							>
								{step.label}
							</Text>
						</TouchableOpacity>

						{!isLast && (
							<View style={[styles.connectorWrap, { height: t.circleSize }]}>
								<View
									style={[
										styles.connector,
										{ backgroundColor: isCompleted ? t.activeColor : t.pendingBorderColor },
									]}
								/>
							</View>
						)}
					</React.Fragment>
				)
			})}
		</View>
	)

	if (!t.cardWrapper) {
		return <View style={[styles.bareWrapper, style]}>{content}</View>
	}

	return (
		<View
			style={[
				styles.card,
				{
					backgroundColor: t.cardBackgroundColor,
					borderColor: t.cardBorderColor,
					borderRadius: t.cardBorderRadius,
					paddingHorizontal: isTablet ? t.cardPaddingHorizontal + 8 : t.cardPaddingHorizontal,
					paddingVertical: isTablet ? t.cardPaddingVertical + 4 : t.cardPaddingVertical,
				},
				style,
			]}
		>
			{content}
		</View>
	)
}

const styles = StyleSheet.create({
	card: {
		borderWidth: 1,
	},
	bareWrapper: {
		paddingHorizontal: 16,
		paddingTop: 14,
		paddingBottom: 18,
	},
	row: {
		flexDirection: 'row',
		alignItems: 'flex-start',
	},
	stepGroup: {
		alignItems: 'center',
		justifyContent: 'center',
	},
	circle: {
		justifyContent: 'center',
		alignItems: 'center',
		marginBottom: 5,
	},
	numText: {
		fontWeight: '700',
	},
	labelText: {
		fontWeight: '600',
		textAlign: 'center',
	},
	connectorWrap: {
		flex: 1,
		justifyContent: 'center',
		paddingHorizontal: 4,
	},
	connector: {
		height: 2,
		borderRadius: 1,
	},
})

export default BookingProgressStepper
