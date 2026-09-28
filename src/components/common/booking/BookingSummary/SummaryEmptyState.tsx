import React from 'react'
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native'
import { AppTypography } from '../../display/AppTypography'
import { AppButton } from '../../buttons/AppButton'

export interface SummaryEmptyStateProps {
	/** Pre-rendered icon element. */
	icon: React.ReactNode
	iconCircleSize?: number
	iconCircleBackgroundColor?: string
	title: string
	subtitle: string
	ctaLabel: string
	onPress: () => void
	/** Passed straight through to the underlying `AppButton` — it changes
	 *  the button's size/margin/label weight, not just a color, so there is
	 *  deliberately no default: every caller must choose explicitly. */
	ctaFormAction: boolean
	/** Caller-supplied container chrome (background/border/radius/margin) —
	 *  each screen's empty-state box differs slightly, so this is passed in
	 *  rather than assumed. */
	style?: StyleProp<ViewStyle>
}

export function SummaryEmptyState({
	icon,
	iconCircleSize = 80,
	iconCircleBackgroundColor = '#F0F9F9',
	title,
	subtitle,
	ctaLabel,
	onPress,
	ctaFormAction,
	style,
}: SummaryEmptyStateProps) {
	return (
		<View style={[styles.container, style]}>
			<View
				style={[
					styles.iconCircle,
					{
						width: iconCircleSize,
						height: iconCircleSize,
						borderRadius: iconCircleSize / 2,
						backgroundColor: iconCircleBackgroundColor,
					},
				]}
			>
				{icon}
			</View>

			<AppTypography variant="h2" style={styles.title} align="center">
				{title}
			</AppTypography>

			<AppTypography variant="body" style={styles.subtitle} align="center">
				{subtitle}
			</AppTypography>

			<AppButton variant="primary" formAction={ctaFormAction} style={styles.cta} onPress={onPress}>
				{ctaLabel}
			</AppButton>
		</View>
	)
}

export default SummaryEmptyState

const styles = StyleSheet.create({
	container: {
		backgroundColor: '#FFFFFF',
		alignItems: 'center',
	},
	iconCircle: {
		alignItems: 'center',
		justifyContent: 'center',
		marginBottom: 16,
	},
	title: {
		fontSize: 18,
		fontWeight: '700',
		color: '#191C1D',
		marginBottom: 8,
	},
	subtitle: {
		fontSize: 13,
		color: '#526062',
		lineHeight: 18,
		marginBottom: 24,
	},
	cta: {
		minWidth: 180,
		borderRadius: 14,
	},
})
