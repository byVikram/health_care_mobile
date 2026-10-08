// src/features/care-ai/components/FollowUps.tsx
//
// "YOU COULD ASK": suggested next questions under the latest answer. Tapping one asks it.

import React from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { AppPathIcon } from '../../../components/common'
import { APP_COLORS } from '../../../config/theme'
import { CARE_AI_ICONS } from '../careAiIcons'
import { CARE_AI } from '../careAiTheme'
import type { CareAiFollowUp } from '../careAiTypes'

type Props = {
	suggestions: CareAiFollowUp[]
	onAsk: (suggestion: CareAiFollowUp) => void
}

export function FollowUps({ suggestions, onAsk }: Props) {
	return (
		<View style={styles.wrap} accessibilityRole="menu" accessibilityLabel="Suggested questions">
			<View style={styles.label}>
				<AppPathIcon d={CARE_AI_ICONS.sparkle} size={14} strokeWidth={2} color={APP_COLORS.inkMuted} />
				<Text style={styles.labelText}>YOU COULD ASK</Text>
			</View>
			{suggestions.map((suggestion) => (
				<TouchableOpacity
					key={suggestion.label}
					onPress={() => onAsk(suggestion)}
					activeOpacity={0.8}
					accessibilityRole="button"
					style={styles.button}
				>
					<Text style={styles.buttonText}>{suggestion.label}</Text>
				</TouchableOpacity>
			))}
		</View>
	)
}

const styles = StyleSheet.create({
	wrap: { gap: 8, paddingLeft: 30 },
	label: { flexDirection: 'row', alignItems: 'center', gap: 6 },
	labelText: { fontSize: 12, lineHeight: 16, fontWeight: '800', letterSpacing: 0.48, color: APP_COLORS.inkMuted },
	button: {
		alignSelf: 'flex-start',
		minHeight: 40,
		paddingVertical: 8,
		paddingHorizontal: 14,
		justifyContent: 'center',
		borderRadius: 12,
		backgroundColor: CARE_AI.softSurface,
	},
	buttonText: { fontSize: 14, lineHeight: 20, fontWeight: '600', color: APP_COLORS.ink },
})
