// src/components/common/layout/AppFooterBar.tsx
//
// Pinned white footer from the KarolaHealth designs: APP_COLORS.divider top border, 12px top / 16px side
// padding and 20 + safe-area bottom padding. Children laid out in a row (gap 8, e.g. two
// equal-width buttons — give each `style={{ flex: 1 }}`) or a column (e.g. summary line + CTA).

import React from 'react'
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { APP_COLORS } from '../../../config/theme'

export type AppFooterBarProps = {
	children: React.ReactNode
	direction?: 'row' | 'column'
	/** Gap between children. Defaults to 8. */
	gap?: number
	/** Extra bottom padding added to the safe-area inset. Defaults to 20. */
	bottomPadding?: number
	style?: StyleProp<ViewStyle>
}

export function AppFooterBar({ children, direction = 'row', gap = 8, bottomPadding = 20, style }: AppFooterBarProps) {
	const insets = useSafeAreaInsets()
	return (
		<View
			style={[
				styles.footer,
				{ flexDirection: direction, gap, paddingBottom: bottomPadding + insets.bottom },
				direction === 'row' && styles.row,
				style,
			]}
		>
			{children}
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
})

export default AppFooterBar
