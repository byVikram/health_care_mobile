// src/features/care-ai/components/QuickReplies.tsx
//
// The pill chips under a question Care AI asked ("Online" / "In person", the symptoms, the concerns). Tapping
// one answers the question, after which the chips go away.

import React from 'react'
import { StyleSheet, View } from 'react-native'
import { AppChip } from '../../../components/common'
import { APP_COLORS } from '../../../config/theme'
import { CARE_AI } from '../careAiTheme'

type Props = {
	chips: string[]
	onPick: (chip: string) => void
}

export function QuickReplies({ chips, onPick }: Props) {
	return (
		<View style={styles.row} accessibilityRole="radiogroup" accessibilityLabel="Quick replies">
			{chips.map((chip) => (
				<AppChip
					key={chip}
					label={chip}
					onPress={() => onPick(chip)}
					borderColor={CARE_AI.chipBorder}
					borderWidth={1.5}
					textStyle={styles.text}
				/>
			))}
		</View>
	)
}

const styles = StyleSheet.create({
	row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
	text: { fontWeight: '700', color: APP_COLORS.primary },
})
