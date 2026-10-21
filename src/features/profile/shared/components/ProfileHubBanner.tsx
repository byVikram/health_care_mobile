// Hub banner ("Complete Anika's details", "Licence under review"): 12px-radius warning (warningBg /
// warning ink) or info (mint / primary) card with a leading icon, 14/20 800 title, 12/16 ink subtitle and a
// chevron when it leads somewhere. Used for profileHubConfig banners and on the family list.

import React from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { APP_COLORS } from '../../../../config/theme'

type IconName = keyof typeof MaterialCommunityIcons.glyphMap

export type ProfileHubBannerProps = {
	tone: 'warning' | 'info'
	/** Leading icon; omit for a text-only banner. */
	icon?: IconName
	title: string
	subtitle: string
	onPress?: () => void
}

export function ProfileHubBanner({ tone, icon, title, subtitle, onPress }: ProfileHubBannerProps) {
	const warning = tone === 'warning'
	const ink = warning ? APP_COLORS.warning : APP_COLORS.primary
	return (
		<TouchableOpacity
			style={[styles.banner, { backgroundColor: warning ? APP_COLORS.warningBg : APP_COLORS.mint }]}
			onPress={onPress}
			disabled={!onPress}
			activeOpacity={0.8}
			accessibilityRole={onPress ? 'button' : undefined}
			accessibilityLabel={`${title}. ${subtitle}`}
		>
			{icon ? <MaterialCommunityIcons name={icon} size={20} color={ink} /> : null}
			<View style={styles.text}>
				<Text style={[styles.title, { color: ink }]}>{title}</Text>
				<Text style={styles.subtitle}>{subtitle}</Text>
			</View>
			{onPress ? <MaterialCommunityIcons name="chevron-right" size={20} color={ink} /> : null}
		</TouchableOpacity>
	)
}

const styles = StyleSheet.create({
	banner: {
		marginTop: 12,
		marginHorizontal: 16,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
		padding: 12,
		borderRadius: 12,
	},
	text: {
		flex: 1,
	},
	title: {
		fontSize: 14,
		lineHeight: 20,
		fontWeight: '800',
	},
	subtitle: {
		fontSize: 12,
		lineHeight: 16,
		color: APP_COLORS.ink,
	},
})

export default ProfileHubBanner
