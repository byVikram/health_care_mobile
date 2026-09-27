// src/components/common/booking/AppCartFooter.tsx
//
// Nursing service-catalogue cart footer, built on AppFooterBar (+ a soft upward APP_COLORS.shadow):
//   with items — left column: count 12/16 500 muted ("2 services added"), total 18/26 600 ink,
//                savings 12/16 600 APP_COLORS.success ("You save ₹120"); right: AppButton size="lg" CTA with a
//                trailing chevron ("Book visit").
//   empty      — centred 14/20 muted hint ("Add a service to book a nurse visit"), padding 12 0.
// Pure UI — the parent owns the cart and passes the labels.

import React from 'react'
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native'
import { APP_COLORS } from '../../../config/theme'
import { AppFooterBar } from '../layout/AppFooterBar'
import { AppButton } from '../buttons/AppButton'

export type AppCartFooterProps = {
	/** Shows the empty hint instead of the summary + CTA. */
	empty?: boolean
	/** e.g. "2 services added". */
	countLabel?: string
	/** e.g. "₹398". */
	totalLabel?: string
	/** e.g. "You save ₹120". */
	savingsLabel?: string
	/** Defaults to "Book visit". */
	ctaLabel?: string
	onCtaPress: () => void
	ctaDisabled?: boolean
	ctaLoading?: boolean
	/** Defaults to "Add a service to book a nurse visit". */
	emptyHint?: string
	style?: StyleProp<ViewStyle>
}

export function AppCartFooter({
	empty = false,
	countLabel,
	totalLabel,
	savingsLabel,
	ctaLabel = 'Book visit',
	onCtaPress,
	ctaDisabled = false,
	ctaLoading = false,
	emptyHint = 'Add a service to book a nurse visit',
	style,
}: AppCartFooterProps) {
	if (empty) {
		return (
			<AppFooterBar bottomPadding={24} style={[styles.shadow, style]}>
				<Text style={styles.hint} accessibilityRole="text">
					{emptyHint}
				</Text>
			</AppFooterBar>
		)
	}

	const summary = [countLabel, totalLabel ? `Total ${totalLabel}` : '', savingsLabel].filter(Boolean).join(', ')

	return (
		<AppFooterBar bottomPadding={24} gap={12} style={[styles.shadow, style]}>
			<View style={styles.summary} accessible accessibilityLabel={summary}>
				{!!countLabel && (
					<Text style={styles.count} numberOfLines={1}>
						{countLabel}
					</Text>
				)}
				{!!totalLabel && (
					<Text style={styles.total} numberOfLines={1}>
						{totalLabel}
					</Text>
				)}
				{!!savingsLabel && (
					<Text style={styles.savings} numberOfLines={1}>
						{savingsLabel}
					</Text>
				)}
			</View>
			<AppButton
				size="lg"
				trailingIcon="chevron-right"
				onPress={onCtaPress}
				disabled={ctaDisabled}
				loading={ctaLoading}
				softDisabled
				accessibilityLabel={ctaLabel}
				contentStyle={styles.ctaContent}
			>
				{ctaLabel}
			</AppButton>
		</AppFooterBar>
	)
}

const styles = StyleSheet.create({
	shadow: {
		shadowColor: APP_COLORS.shadow,
		shadowOffset: { width: 0, height: -4 },
		shadowOpacity: 0.08,
		shadowRadius: 16,
		elevation: 8,
	},
	summary: {
		flex: 1,
		minWidth: 0,
	},
	count: {
		fontSize: 12,
		lineHeight: 16,
		fontWeight: '500',
		color: APP_COLORS.inkMuted,
	},
	total: {
		fontSize: 18,
		lineHeight: 26,
		fontWeight: '600',
		color: APP_COLORS.ink,
	},
	savings: {
		fontSize: 12,
		lineHeight: 16,
		fontWeight: '600',
		color: APP_COLORS.success,
	},
	ctaContent: {
		paddingHorizontal: 10,
	},
	hint: {
		flex: 1,
		paddingVertical: 12,
		textAlign: 'center',
		fontSize: 14,
		lineHeight: 20,
		color: APP_COLORS.inkMuted,
	},
})

export default AppCartFooter
