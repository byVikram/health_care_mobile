// src/features/care-ai/components/ReplyActions.tsx
//
// The buttons under a reply ("Talk to a doctor", "Remind me at 8:30 PM"). A button with a link navigates; a
// one-shot button (no link) turns green and shows its `doneLabel` once tapped.

import React, { useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { AppButton } from '../../../components/common'
import { APP_COLORS } from '../../../config/theme'
import { CARE_AI } from '../careAiTheme'
import type { CareAiAction, CareAiLink } from '../careAiTypes'

type Props = {
	actions: CareAiAction[]
	onLink: (link: CareAiLink) => void
}

export function ReplyActions({ actions, onLink }: Props) {
	const [done, setDone] = useState<Record<string, boolean>>({})

	return (
		<View style={styles.row}>
			{actions.map((action) => {
				const finished = !!done[action.label] && !!action.doneLabel
				const onPress = () => {
					if (action.link) onLink(action.link)
					else if (action.doneLabel) setDone((prev) => ({ ...prev, [action.label]: true }))
				}
				if (finished) {
					return (
						<AppButton
							key={action.label}
							variant="secondary"
							size="sm"
							style={styles.done}
							labelStyle={styles.doneLabel}
							disabled
						>
							{`✓ ${action.doneLabel}`}
						</AppButton>
					)
				}
				return (
					<AppButton
						key={action.label}
						variant={action.primary ? 'primary' : 'outline'}
						size="sm"
						style={action.primary ? undefined : styles.secondary}
						onPress={onPress}
					>
						{action.label}
					</AppButton>
				)
			})}
		</View>
	)
}

const styles = StyleSheet.create({
	row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
	secondary: { borderWidth: 1, borderColor: CARE_AI.chipBorder, backgroundColor: '#FFFFFF' },
	done: { backgroundColor: APP_COLORS.successBg, borderWidth: 0 },
	doneLabel: { color: APP_COLORS.success },
})
