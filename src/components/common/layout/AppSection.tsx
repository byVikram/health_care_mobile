// src/components/common/layout/AppSection.tsx
//
// Full-width white page section from the KarolaHealth designs (sections stack on APP_COLORS.pageBg with an
// 8px gap): padding 16, marginTop 8, optional title row with a right-hand node.
//   titleSize 'md' (default) = 18/26 700 (Book slot / Doctor profile)
//   titleSize 'sm'           = 16/22 800 (Appointment details)

import React from 'react'
import { StyleSheet, Text, View, type StyleProp, type ViewProps, type ViewStyle } from 'react-native'
import { APP_COLORS } from '../../../config/theme'

/** Any other View prop (onLayout, testID, accessibility*, nativeID, ...) is passed to the section View. */
export type AppSectionProps = Omit<ViewProps, 'style' | 'children'> & {
	title?: string
	titleSize?: 'md' | 'sm'
	/** Node on the right of the title row (e.g. a month label or "See all" link). Baseline-aligned. */
	right?: React.ReactNode
	/** Vertical gap between children (and the title). Defaults to 10. */
	gap?: number
	/** Top margin. Defaults to 8; pass 0 inside a container that already spaces sections with `gap`. */
	marginTop?: number
	/** Remove horizontal padding (e.g. edge-to-edge grids); the title row keeps its 16px inset. */
	flush?: boolean
	children?: React.ReactNode
	style?: StyleProp<ViewStyle>
}

export function AppSection({
	title,
	titleSize = 'md',
	right,
	gap = 10,
	marginTop = 8,
	flush = false,
	children,
	style,
	...viewProps
}: AppSectionProps) {
	const hasHeader = !!title || !!right
	return (
		<View {...viewProps} style={[styles.section, { gap, marginTop }, flush && styles.flush, style]}>
			{hasHeader && (
				<View style={[styles.headerRow, flush && styles.headerFlush]}>
					{!!title && (
						<Text style={titleSize === 'sm' ? styles.titleSm : styles.titleMd} accessibilityRole="header">
							{title}
						</Text>
					)}
					{right}
				</View>
			)}
			{children}
		</View>
	)
}

const styles = StyleSheet.create({
	section: {
		backgroundColor: APP_COLORS.surface,
		padding: 16,
	},
	flush: {
		paddingHorizontal: 0,
	},
	headerRow: {
		flexDirection: 'row',
		alignItems: 'baseline',
		justifyContent: 'space-between',
		gap: 8,
	},
	headerFlush: {
		paddingHorizontal: 16,
	},
	titleMd: {
		flexShrink: 1,
		fontSize: 18,
		lineHeight: 26,
		fontWeight: '700',
		color: APP_COLORS.ink,
	},
	titleSm: {
		flexShrink: 1,
		fontSize: 16,
		lineHeight: 22,
		fontWeight: '800',
		color: APP_COLORS.ink,
	},
})

export default AppSection
