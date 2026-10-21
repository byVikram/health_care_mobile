// src/features/care-ai/components/ReplyBlocks.tsx
//
// The small, text-only blocks of a Care AI reply: the "from your prescription" medicine card, the bullet list
// and the yellow caution callout. (The bigger interactive ones -- urgent, consult, summary, booking, results --
// have their own files.)

import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { AppIconTile, AppPathIcon } from '../../../components/common'
import { APP_COLORS, TONES } from '../../../config/theme'
import { CARE_AI_ICONS } from '../careAiIcons'
import { CARE_AI } from '../careAiTheme'
import { ReplyCard } from './ReplyCard'

/** The medicine a medicines answer is about, tagged with where it came from. */
export function MedCard({ name, sub }: { name: string; sub: string }) {
	return (
		<ReplyCard style={styles.med}>
			<AppIconTile size={40} radius={12} tone="lilac">
				<AppPathIcon d={CARE_AI_ICONS.pill} size={20} strokeWidth={2} color={TONES.lilac.ink} />
			</AppIconTile>
			<View style={styles.medText}>
				<Text style={styles.medEyebrow}>FROM YOUR PRESCRIPTION</Text>
				<Text style={styles.medName}>{name}</Text>
				<Text style={styles.medSub}>{sub}</Text>
			</View>
		</ReplyCard>
	)
}

export function BulletsCard({ title, bullets }: { title: string; bullets: string[] }) {
	return (
		<ReplyCard style={styles.bullets}>
			<Text style={styles.bulletsTitle}>{title}</Text>
			{bullets.map((bullet) => (
				<View key={bullet} style={styles.bulletRow}>
					<View style={styles.bulletDot} />
					<Text style={styles.bulletText}>{bullet}</Text>
				</View>
			))}
		</ReplyCard>
	)
}

/** "Check with your doctor first if ..." -- the caution under an answer. */
export function NoteCallout({ text }: { text: string }) {
	return (
		<View style={styles.note} accessibilityRole="alert">
			<View style={styles.noteIcon}>
				<AppPathIcon d={CARE_AI_ICONS.info} size={16} strokeWidth={2.2} color={APP_COLORS.warning} />
			</View>
			<Text style={styles.noteText}>{text}</Text>
		</View>
	)
}

const styles = StyleSheet.create({
	med: { paddingVertical: 12, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
	medText: { flex: 1, minWidth: 0 },
	medEyebrow: { fontSize: 11, lineHeight: 14, fontWeight: '800', letterSpacing: 0.66, color: TONES.lilac.ink },
	medName: { fontSize: 15, lineHeight: 20, fontWeight: '800', color: APP_COLORS.ink },
	medSub: { fontSize: 12, lineHeight: 16, color: APP_COLORS.inkMuted },
	bullets: { paddingVertical: 12, paddingHorizontal: 14, gap: 8 },
	bulletsTitle: { fontSize: 14, lineHeight: 20, fontWeight: '800', color: APP_COLORS.ink },
	bulletRow: { flexDirection: 'row', gap: 10 },
	bulletDot: {
		flexShrink: 0,
		marginTop: 7,
		width: 6,
		height: 6,
		borderRadius: 3,
		backgroundColor: APP_COLORS.primary,
	},
	bulletText: { flex: 1, fontSize: 14, lineHeight: 20, color: CARE_AI.bullet },
	note: {
		paddingVertical: 10,
		paddingHorizontal: 12,
		borderRadius: 12,
		flexDirection: 'row',
		gap: 8,
		backgroundColor: TONES.sand.bg,
	},
	noteIcon: { marginTop: 1 },
	noteText: { flex: 1, fontSize: 13, lineHeight: 19, color: CARE_AI.noteText },
})
