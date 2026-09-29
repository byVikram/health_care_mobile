// src/components/common/booking/AppPersonRow.tsx
//
// Person row with contact buttons from the provider visit designs ("Patient" section): 52px round avatar
// (initials fallback), 16/22 800 name over a 12/16 muted line ("Male · 70 yrs · Father of Vikram K."),
// then 44px outline Message / Call buttons. A button is hidden when its handler is missing; Call is
// disabled without a phone number.

import React from 'react'
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native'
import { APP_COLORS, TONES } from '../../../config/theme'
import AppAvatar from '../display/AppAvatar'
import { AppIconButton } from '../buttons/AppIconButton'

export type AppPersonRowProps = {
	name: string
	subtitle?: string
	avatarUri?: string | null
	onMessage?: () => void
	onCall?: () => void
	/** Enables the Call button (defaults to !!onCall). */
	canCall?: boolean
	style?: StyleProp<ViewStyle>
}

export function AppPersonRow({ name, subtitle, avatarUri, onMessage, onCall, canCall, style }: AppPersonRowProps) {
	return (
		<View style={[styles.row, style]}>
			<AppAvatar
				uri={avatarUri ?? undefined}
				name={name}
				size={52}
				radius={26}
				backgroundColor={TONES.sand.bg}
				initialsColor={TONES.sand.ink}
			/>
			<View style={styles.text}>
				<Text style={styles.name} numberOfLines={1}>
					{name}
				</Text>
				{subtitle ? (
					<Text style={styles.sub} numberOfLines={2}>
						{subtitle}
					</Text>
				) : null}
			</View>
			{onMessage ? (
				<AppIconButton
					icon="message-text-outline"
					variant="outline"
					size={44}
					radius={12}
					accessibilityLabel={`Message ${name}`}
					onPress={onMessage}
				/>
			) : null}
			{onCall ? (
				<AppIconButton
					icon="phone-outline"
					variant="outline"
					size={44}
					radius={12}
					disabled={canCall === false}
					accessibilityLabel={`Call ${name}`}
					onPress={onCall}
				/>
			) : null}
		</View>
	)
}

const styles = StyleSheet.create({
	row: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
	},
	text: {
		flex: 1,
		minWidth: 0,
	},
	name: {
		fontSize: 16,
		lineHeight: 22,
		fontWeight: '800',
		color: APP_COLORS.ink,
	},
	sub: {
		fontSize: 12,
		lineHeight: 16,
		color: APP_COLORS.inkMuted,
	},
})

export default AppPersonRow
