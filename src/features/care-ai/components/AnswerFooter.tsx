// src/features/care-ai/components/AnswerFooter.tsx
//
// What sits under an answer that has a source: "Why this answer?" (the records it drew on), thumbs up / down,
// share, and "save to health records".

import React, { useState } from 'react'
import { Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { AppIconButton, AppPathIcon } from '../../../components/common'
import { APP_COLORS } from '../../../config/theme'
import { CARE_AI_ICONS } from '../careAiIcons'
import { CARE_AI } from '../careAiTheme'

type Feedback = 'up' | 'down' | null

type Props = {
	source: string
	/** The records the answer used. Falls back to the source line alone. */
	why?: string[]
	/** Text handed to the share sheet. */
	shareText?: string
	/** Whose health records "Save" files the answer under. */
	savedFor: string
}

const MUTED = CARE_AI.caption

export function AnswerFooter({ source, why, shareText, savedFor }: Props) {
	const [whyOpen, setWhyOpen] = useState(false)
	const [feedback, setFeedback] = useState<Feedback>(null)
	// Who the answer was filed under when it was saved; later switching "Asking for" must not rename it.
	const [savedUnder, setSavedUnder] = useState<string | null>(null)
	const saved = savedUnder !== null
	const reasons = why?.length ? why : [source]

	const toggleFeedback = (value: 'up' | 'down') => setFeedback((prev) => (prev === value ? null : value))

	return (
		<View style={styles.wrap}>
			<View style={styles.row}>
				<TouchableOpacity
					onPress={() => setWhyOpen((open) => !open)}
					accessibilityRole="button"
					accessibilityState={{ expanded: whyOpen }}
					style={styles.why}
				>
					<Text style={styles.whyText} numberOfLines={1}>
						Why this answer?
					</Text>
					<View style={{ transform: [{ rotate: whyOpen ? '180deg' : '0deg' }] }}>
						<AppPathIcon
							d={CARE_AI_ICONS.chevronDown}
							size={14}
							strokeWidth={2.4}
							color={APP_COLORS.inkMuted}
						/>
					</View>
				</TouchableOpacity>
				<AppIconButton
					circle
					size={36}
					variant="ghost"
					accessibilityLabel="Helpful"
					backgroundColor={feedback === 'up' ? APP_COLORS.mint : 'transparent'}
					onPress={() => toggleFeedback('up')}
				>
					<AppPathIcon
						d={CARE_AI_ICONS.thumbUp}
						size={16}
						strokeWidth={2}
						color={feedback === 'up' ? APP_COLORS.primary : MUTED}
					/>
				</AppIconButton>
				<AppIconButton
					circle
					size={36}
					variant="ghost"
					accessibilityLabel="Not helpful"
					backgroundColor={feedback === 'down' ? APP_COLORS.dangerBg : 'transparent'}
					onPress={() => toggleFeedback('down')}
				>
					<AppPathIcon
						d={CARE_AI_ICONS.thumbDown}
						size={16}
						strokeWidth={2}
						color={feedback === 'down' ? APP_COLORS.danger : MUTED}
					/>
				</AppIconButton>
				<AppIconButton
					circle
					size={36}
					variant="ghost"
					accessibilityLabel="Share with family"
					onPress={shareText ? () => void Share.share({ message: shareText }) : undefined}
				>
					<AppPathIcon d={CARE_AI_ICONS.share} size={16} strokeWidth={2} color={MUTED} />
				</AppIconButton>
				<AppIconButton
					circle
					size={36}
					variant="ghost"
					accessibilityLabel="Save to my health records"
					backgroundColor={saved ? APP_COLORS.successBg : 'transparent'}
					onPress={() => setSavedUnder((current) => (current === null ? savedFor : null))}
				>
					<AppPathIcon
						d={CARE_AI_ICONS.bookmark}
						size={16}
						strokeWidth={2}
						color={saved ? APP_COLORS.success : MUTED}
					/>
				</AppIconButton>
			</View>

			{whyOpen ? (
				<View style={styles.panel}>
					<Text style={styles.source}>{source}</Text>
					{reasons.map((reason) => (
						<View key={reason} style={styles.reasonRow}>
							<AppPathIcon d={CARE_AI_ICONS.file} size={14} strokeWidth={2} color={APP_COLORS.primary} />
							<Text style={styles.reason}>{reason}</Text>
						</View>
					))}
					<Text style={styles.disclaimer}>Care AI doesn’t diagnose or change prescriptions.</Text>
				</View>
			) : null}

			{saved ? (
				<Text style={styles.saved} accessibilityRole="text" accessibilityLiveRegion="polite">
					Saved to {savedUnder}’s health records
				</Text>
			) : null}
		</View>
	)
}

const styles = StyleSheet.create({
	wrap: { gap: 6, marginTop: -2 },
	row: { flexDirection: 'row', alignItems: 'center', gap: 2 },
	why: { flex: 1, minWidth: 0, height: 36, flexDirection: 'row', alignItems: 'center', gap: 4 },
	whyText: { fontSize: 12, lineHeight: 16, fontWeight: '700', color: APP_COLORS.inkMuted },
	panel: {
		gap: 6,
		paddingVertical: 10,
		paddingHorizontal: 12,
		borderRadius: 12,
		backgroundColor: CARE_AI.softSurface,
	},
	source: { fontSize: 12, lineHeight: 16, fontWeight: '800', color: APP_COLORS.ink },
	reasonRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
	reason: { flex: 1, fontSize: 12, lineHeight: 17, color: CARE_AI.body },
	disclaimer: { fontSize: 11, lineHeight: 15, color: APP_COLORS.inkMuted },
	saved: { fontSize: 12, lineHeight: 16, fontWeight: '700', color: APP_COLORS.success },
})
