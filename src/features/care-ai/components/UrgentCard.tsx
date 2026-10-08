// src/features/care-ai/components/UrgentCard.tsx
//
// "This needs urgent care": the red card shown for an emergency symptom, with a one-tap Call 108 and a map
// search for the nearest hospital.

import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { AppButton, AppIconTile, AppPathIcon } from '../../../components/common'
import { APP_COLORS } from '../../../config/theme'
import { callPhone, openOnMap } from '../../../utils/maps'
import { CARE_AI_ICONS } from '../careAiIcons'
import { CARE_AI } from '../careAiTheme'

const EMERGENCY_NUMBER = '108'

type Props = {
	title: string
	body: string
}

export function UrgentCard({ title, body }: Props) {
	return (
		<View style={styles.card} accessibilityRole="alert">
			<View style={styles.top}>
				<AppIconTile size={36} radius={10} backgroundColor={APP_COLORS.danger}>
					<AppPathIcon d={CARE_AI_ICONS.warning} size={20} strokeWidth={2.2} color="#FFFFFF" />
				</AppIconTile>
				<View style={styles.text}>
					<Text style={styles.title}>{title}</Text>
					<Text style={styles.body}>{body}</Text>
				</View>
			</View>
			<View style={styles.buttons}>
				<AppButton
					variant="danger"
					size="md"
					radius={10}
					icon="phone"
					style={styles.button}
					onPress={() => callPhone(EMERGENCY_NUMBER)}
				>
					{`Call ${EMERGENCY_NUMBER}`}
				</AppButton>
				<AppButton
					variant="outline"
					size="md"
					radius={10}
					style={[styles.button, styles.outline]}
					labelStyle={styles.outlineLabel}
					onPress={() => openOnMap('hospital', 'Nearest hospital')}
				>
					Nearest hospital
				</AppButton>
			</View>
		</View>
	)
}

const styles = StyleSheet.create({
	card: {
		gap: 12,
		padding: 14,
		borderRadius: 14,
		backgroundColor: APP_COLORS.dangerBg,
		borderWidth: 1,
		borderColor: CARE_AI.urgentBorder,
	},
	top: { flexDirection: 'row', gap: 10 },
	text: { flex: 1, minWidth: 0, gap: 2 },
	title: { fontSize: 15, lineHeight: 20, fontWeight: '800', color: APP_COLORS.danger },
	body: { fontSize: 13, lineHeight: 19, color: CARE_AI.urgentBody },
	buttons: { flexDirection: 'row', gap: 8 },
	button: { flex: 1 },
	outline: { borderColor: CARE_AI.urgentButtonBorder, backgroundColor: '#FFFFFF' },
	outlineLabel: { color: APP_COLORS.danger },
})
