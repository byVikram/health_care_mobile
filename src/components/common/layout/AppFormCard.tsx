// src/components/common/layout/AppFormCard.tsx
//
// Full-width white form section from the profile designs ("Basic details", "Contact", "Documents"...):
// 14/16/16 padding, 16/22 800 ink title with an optional right node (e.g. a "Verified" AppTag),
// optional muted helper line with an info icon, then the content with a 14px gap. Stack cards in a
// column with gap 8 on APP_COLORS.pageBg to get the design's separated sections.

import React from 'react'
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { APP_COLORS } from '../../../config/theme'

export type AppFormCardProps = {
	title?: string
	/** Node on the title row's right, e.g. <AppTag label="Verified" tone="confirmed" />. */
	right?: React.ReactNode
	/** Muted 12/17 line under the title, with a leading info icon. */
	helper?: string
	/** Gap between children. Defaults to 14. */
	gap?: number
	children?: React.ReactNode
	style?: StyleProp<ViewStyle>
}

export function AppFormCard({ title, right, helper, gap = 14, children, style }: AppFormCardProps) {
	return (
		<View style={[styles.card, style]}>
			{(!!title || !!right) && (
				<View style={styles.titleRow}>
					{!!title && (
						<Text style={styles.title} accessibilityRole="header">
							{title}
						</Text>
					)}
					{right}
				</View>
			)}
			{!!helper && (
				<View style={styles.helperRow}>
					<MaterialCommunityIcons name="information-outline" size={14} color={APP_COLORS.inkMuted} />
					<Text style={styles.helper}>{helper}</Text>
				</View>
			)}
			{children != null && <View style={{ gap }}>{children}</View>}
		</View>
	)
}

const styles = StyleSheet.create({
	card: {
		backgroundColor: APP_COLORS.surface,
		paddingTop: 14,
		paddingHorizontal: 16,
		paddingBottom: 16,
		gap: 10,
	},
	titleRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		gap: 8,
	},
	title: {
		flexShrink: 1,
		fontSize: 16,
		lineHeight: 22,
		fontWeight: '800',
		color: APP_COLORS.ink,
	},
	helperRow: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		gap: 6,
	},
	helper: {
		flex: 1,
		fontSize: 12,
		lineHeight: 17,
		color: APP_COLORS.inkMuted,
	},
})

export default AppFormCard
