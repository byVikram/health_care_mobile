// src/features/care-ai/components/ConsultCard.tsx
//
// "Consult a Diabetologist online" / "Top Cardiologists near Koramangala": a tinted band with the doctors'
// faces, what is available, and the button that opens the doctor search with those filters.

import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { AppAvatarStack, AppButton } from '../../../components/common'
import { APP_COLORS, TONES } from '../../../config/theme'
import { CARE_AI } from '../careAiTheme'
import type { CareAiConsult } from '../careAiTypes'
import { ReplyCard } from './ReplyCard'

/** Faces shown in the band. */
const MAX_FACES = 4

type Props = {
	consult: CareAiConsult
	onPress: () => void
}

export function ConsultCard({ consult, onPress }: Props) {
	const ctaColor = consult.ctaTone === 'lilac' ? TONES.lilac.ink : APP_COLORS.primary
	return (
		<ReplyCard>
			<View style={[styles.band, { backgroundColor: TONES[consult.tone].bg }]}>
				<AppAvatarStack
					items={consult.doctors.map((d) => ({ name: d.name, label: d.name }))}
					size={44}
					overlap={16}
					max={MAX_FACES}
				/>
				<View style={styles.text}>
					<Text style={styles.title}>{consult.title}</Text>
					<Text style={styles.sub}>{consult.sub}</Text>
				</View>
			</View>
			<View style={styles.footer}>
				<AppButton size="md" radius={10} style={{ backgroundColor: ctaColor }} onPress={onPress}>
					{consult.cta}
				</AppButton>
			</View>
		</ReplyCard>
	)
}

const styles = StyleSheet.create({
	band: { padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
	text: { flex: 1, minWidth: 0, gap: 2 },
	title: { fontSize: 16, lineHeight: 21, fontWeight: '800', color: APP_COLORS.ink },
	sub: { fontSize: 12, lineHeight: 16, color: CARE_AI.body },
	footer: { paddingVertical: 12, paddingHorizontal: 14 },
})
