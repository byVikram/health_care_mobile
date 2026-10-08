// src/features/care-ai/components/ReplyCard.tsx
//
// The card every rich Care AI reply (consult, summary, booking, lab results, medicine, bullet list) sits in:
// the shared AppSoftCard with no inner padding (each reply lays out its own) and the design's hairline border.

import React from 'react'
import type { StyleProp, ViewStyle } from 'react-native'
import { AppSoftCard } from '../../../components/common'
import { CARE_AI } from '../careAiTheme'

type Props = {
	children: React.ReactNode
	style?: StyleProp<ViewStyle>
}

export function ReplyCard({ children, style }: Props) {
	return (
		<AppSoftCard padding={0} borderColor={CARE_AI.cardBorder} style={style}>
			{children}
		</AppSoftCard>
	)
}
