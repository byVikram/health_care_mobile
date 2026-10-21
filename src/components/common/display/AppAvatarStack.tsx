// src/components/common/display/AppAvatarStack.tsx
//
// Overlapping avatar row from the drawer's FAMILY strip: 36px circles, 2px white border, each one
// overlapping the previous by 8px. Beyond `max`, a "+N" circle (mint bg, primary 12/16 800 text) is shown.
// Pass `onPressItem` to make each avatar a button (e.g. open that family member).

import React from 'react'
import { StyleSheet, Text, TouchableOpacity, View, type StyleProp, type ViewStyle } from 'react-native'
import AppAvatar from './AppAvatar'
import { APP_COLORS, toneAt } from '../../../config/theme'

export type AppAvatarStackItem = {
	uri?: string | null
	name?: string
	/** Placeholder background. Defaults to toneAt(index).bg, as in the design. */
	backgroundColor?: string
	/** Accessibility label, e.g. "Priya, Wife". Defaults to name. */
	label?: string
}

export type AppAvatarStackProps = {
	items: AppAvatarStackItem[]
	/** Avatar diameter. Defaults to 36. */
	size?: number
	/** Horizontal overlap between neighbours. Defaults to 8. */
	overlap?: number
	/** Max avatars before collapsing into "+N". Defaults to 4. */
	max?: number
	/** Border (ring) colour. Defaults to white. */
	borderColor?: string
	onPressItem?: (item: AppAvatarStackItem, index: number) => void
	accessibilityLabel?: string
	style?: StyleProp<ViewStyle>
}

export function AppAvatarStack({
	items,
	size = 36,
	overlap = 8,
	max = 4,
	borderColor = APP_COLORS.surface,
	onPressItem,
	accessibilityLabel,
	style,
}: AppAvatarStackProps) {
	const shown = items.slice(0, max)
	const extra = items.length - shown.length

	return (
		<View
			style={[styles.row, style]}
			accessible={!onPressItem}
			accessibilityLabel={
				onPressItem
					? undefined
					: (accessibilityLabel ?? items.map((it) => it.label ?? it.name ?? '').filter(Boolean).join(', '))
			}
		>
			{shown.map((item, i) => {
				const avatar = (
					<AppAvatar
						uri={item.uri}
						name={item.name}
						size={size}
						borderWidth={2}
						borderColor={borderColor}
						backgroundColor={item.backgroundColor ?? toneAt(i).bg}
						initialsColor={item.backgroundColor ? undefined : toneAt(i).ink}
					/>
				)
				const offset = { marginLeft: i === 0 ? 0 : -overlap }
				return onPressItem ? (
					<TouchableOpacity
						key={`${item.name ?? ''}-${i}`}
						onPress={() => onPressItem(item, i)}
						activeOpacity={0.8}
						hitSlop={size < 44 ? Math.ceil((44 - size) / 2) : undefined}
						accessibilityRole="button"
						accessibilityLabel={item.label ?? item.name}
						style={[offset, { borderRadius: size / 2 }]}
					>
						{avatar}
					</TouchableOpacity>
				) : (
					<View key={`${item.name ?? ''}-${i}`} style={offset}>
						{avatar}
					</View>
				)
			})}
			{extra > 0 && (
				<View
					style={[
						styles.more,
						{ width: size, height: size, borderRadius: size / 2, marginLeft: -overlap, borderColor },
					]}
					accessibilityLabel={`${extra} more`}
				>
					<Text style={styles.moreText}>+{extra}</Text>
				</View>
			)}
		</View>
	)
}

const styles = StyleSheet.create({
	row: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	more: {
		borderWidth: 2,
		backgroundColor: APP_COLORS.mint,
		alignItems: 'center',
		justifyContent: 'center',
	},
	moreText: {
		fontSize: 12,
		lineHeight: 16,
		fontWeight: '800',
		color: APP_COLORS.primary,
	},
})

export default AppAvatarStack
