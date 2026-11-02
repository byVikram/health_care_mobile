// src/features/health-feed/FeedHeader.tsx
//
// The dark ink header used by "Health reads" and "Health questions" in the Health feeds design: a soft
// teal circle in the corner, back button, title + mint subtitle, an optional square action button, and
// a white 48px search field. Rounded 24px at the bottom.

import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { AppHeaderBackdrop, AppPathIcon, AppSearchBar } from '../../components/common'
import { APP_COLORS } from '../../config/theme'
import type { SearchContextKey } from '../../config/searchContexts'
import { FEED_ICONS } from './feedTheme'

type Props = {
	title: string
	subtitle: string
	onBack: () => void
	/** Square translucent button on the right (e.g. saved reads). */
	action?: { icon: string; label: string; onPress: () => void; active?: boolean }
	search: { value: string; onChange: (v: string) => void; context: SearchContextKey }
	/** Extra bottom padding (the questions header uses 14, reads 16). */
	paddingBottom?: number
}

export function FeedHeader({ title, subtitle, onBack, action, search, paddingBottom = 16 }: Props) {
	const insets = useSafeAreaInsets()
	return (
		<View style={[styles.header, { paddingTop: insets.top + 8, paddingBottom }]}>
			<AppHeaderBackdrop />
			<View style={styles.topRow}>
				<Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel="Back" style={styles.backBtn}>
					<AppPathIcon d={FEED_ICONS.back} size={22} strokeWidth={2.2} color="#FFFFFF" />
				</Pressable>
				<View style={styles.titleCol}>
					<Text style={styles.title} numberOfLines={1}>
						{title}
					</Text>
					<Text style={styles.subtitle} numberOfLines={1}>
						{subtitle}
					</Text>
				</View>
				{!!action && (
					<Pressable
						onPress={action.onPress}
						accessibilityRole="button"
						accessibilityLabel={action.label}
						style={[styles.actionBtn, action.active && styles.actionBtnActive]}
					>
						<AppPathIcon d={action.icon} size={20} strokeWidth={2} color="#FFFFFF" />
					</Pressable>
				)}
			</View>
			<AppSearchBar context={search.context} tone="onDark" value={search.value} onChangeText={search.onChange} />
		</View>
	)
}

const styles = StyleSheet.create({
	header: {
		zIndex: 2,
		overflow: 'hidden',
		backgroundColor: APP_COLORS.ink,
		paddingHorizontal: 16,
		gap: 12,
		borderBottomLeftRadius: 24,
		borderBottomRightRadius: 24,
	},	topRow: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44 },
	backBtn: {
		width: 44,
		height: 44,
		marginLeft: -8,
		borderRadius: 12,
		alignItems: 'center',
		justifyContent: 'center',
	},
	titleCol: { flex: 1, minWidth: 0 },
	title: { fontSize: 20, lineHeight: 26, fontWeight: '800', color: '#FFFFFF' },
	subtitle: { fontSize: 12, lineHeight: 16, color: APP_COLORS.mintAccent },
	actionBtn: {
		width: 44,
		height: 44,
		borderRadius: 12,
		backgroundColor: '#FFFFFF1F',
		alignItems: 'center',
		justifyContent: 'center',
	},
	actionBtnActive: { backgroundColor: '#FFFFFF47' },
})

export default FeedHeader
