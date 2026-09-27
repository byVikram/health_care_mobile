// src/components/common/layout/AppFooterBar.tsx
//
// Pinned white footer from the KarolaHealth designs: APP_COLORS.divider top border, 12px top / 16px side
// padding and 20 + safe-area bottom padding. Children laid out in a row (gap 8, e.g. two
// equal-width buttons — give each `style={{ flex: 1 }}`) or a column (e.g. summary line + CTA).
// Optional `summary` = a 12/16 500 inkMuted line (design footer caption) (with a 16px primary icon) above the children.

import React from 'react'
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { APP_COLORS } from '../../../config/theme'

type IconName = keyof typeof MaterialCommunityIcons.glyphMap

export type AppFooterBarSummary = {
	icon?: IconName
	text: string
}

export type AppFooterBarProps = {
	children: React.ReactNode
	direction?: 'row' | 'column'
	/** Gap between children. Defaults to 8. */
	gap?: number
	/** Extra bottom padding added to the safe-area inset. Defaults to 20. */
	bottomPadding?: number
	/** Line shown above the children (e.g. "Nursing visit · Today, 5:30 PM"). */
	summary?: AppFooterBarSummary
	style?: StyleProp<ViewStyle>
}

export function AppFooterBar({
	children,
	direction = 'row',
	gap = 8,
	bottomPadding = 20,
	summary,
	style,
}: AppFooterBarProps) {
	const insets = useSafeAreaInsets()
	const body = (
		<View
			style={[
				styles.footer,
				{ flexDirection: direction, gap, paddingBottom: bottomPadding + insets.bottom },
				direction === 'row' && styles.row,
				summary && styles.inner,
				!summary && style,
			]}
		>
			{children}
		</View>
	)
	if (!summary) return body

	return (
		<View style={[styles.footer, styles.withSummary, style]}>
			<View style={styles.summary}>
				{!!summary.icon && (
					<MaterialCommunityIcons name={summary.icon} size={16} color={APP_COLORS.primary} />
				)}
				<Text style={styles.summaryText} numberOfLines={2}>
					{summary.text}
				</Text>
			</View>
			{body}
		</View>
	)
}

const styles = StyleSheet.create({
	footer: {
		backgroundColor: APP_COLORS.surface,
		borderTopWidth: 1,
		borderTopColor: APP_COLORS.divider,
		paddingTop: 12,
		paddingHorizontal: 16,
	},
	row: {
		alignItems: 'center',
	},
	withSummary: {
		gap: 10,
	},
	inner: {
		borderTopWidth: 0,
		paddingTop: 0,
		paddingHorizontal: 0,
	},
	summary: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
	},
	summaryText: {
		flex: 1,
		fontSize: 12,
		lineHeight: 16,
		fontWeight: '500',
		color: APP_COLORS.inkMuted,
	},
})

export default AppFooterBar
