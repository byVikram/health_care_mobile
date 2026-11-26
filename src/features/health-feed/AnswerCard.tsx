// src/features/health-feed/AnswerCard.tsx
//
// THE doctor's answer card of the patient-facing Q&A screens, on the shared AppSoftCard and AppTag: the doctor (photo or initials,
// name, the verified tick, speciality and hospital), the answer, when it was given, and a "Helpful" vote with "Consult". Used by the
// public question thread and by the patient's "Your question". Small things differ by screen and come in as props: the "Most helpful"
// ribbon (`top`), the "New" chip (`isNew`), the doctor's photo (`avatar`), a prefix for the time ("Answered 2 days ago") and where the
// buttons sit (`spread`).

import React from 'react'
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native'
import { AppActionChip, AppAvatar, AppSoftCard, AppTag } from '../../components/common'
import { APP_COLORS } from '../../config/theme'
import type { DoctorAnswer } from '../../services/qaService'
import { buildS3Url } from '../../utils/s3Utils'
import { NewChip, VerifiedBadge } from './QuestionCard'
import { initialsOf, relativeTime } from './feedTheme'

type Props = {
	a: DoctorAnswer
	/** The vote count to show (the answer's own, or the one just voted). */
	likes: number
	voted: boolean
	onHelpful: () => void
	onConsult: () => void
	/** The "Most helpful" ribbon over the answer, and a highlighted border. */
	top?: boolean
	/** The "New" chip, and a highlighted border: it arrived since the patient last looked. */
	isNew?: boolean
	/** The doctor's photo (or initials) in front of the name. */
	avatar?: boolean
	/** Said before the time: "Answered " gives "Answered 2 days ago". */
	whenPrefix?: string
	/** Helpful on the left and Consult on the right (otherwise side by side on the left). */
	spread?: boolean
	style?: StyleProp<ViewStyle>
}

export function AnswerCard({
	a,
	likes,
	voted,
	onHelpful,
	onConsult,
	top = false,
	isNew = false,
	avatar = false,
	whenPrefix = '',
	spread = false,
	style,
}: Props) {
	return (
		<AppSoftCard
			radius={12}
			borderColor={top || isNew ? APP_COLORS.mintAccent : undefined}
			style={[styles.answer, style]}
		>
			{top && <AppTag label="MOST HELPFUL" icon="check" tone="mint" size="xs" style={styles.ribbon} />}
			<View style={styles.docRow}>
				{avatar && (
					<AppAvatar
						uri={buildS3Url(a.doctor_avatar ?? null)}
						name={initialsOf(a.doctor_name)}
						size={44}
						borderWidth={0}
						backgroundColor={APP_COLORS.mint}
						initialsColor={APP_COLORS.ink}
					/>
				)}
				<View style={styles.docText}>
					<View style={styles.nameRow}>
						<Text style={styles.docName} numberOfLines={1}>
							{a.doctor_name}
						</Text>
						<VerifiedBadge />
					</View>
					<Text style={styles.docRole} numberOfLines={1}>
						{[a.doctor_specialty, a.doctor_hospital].filter(Boolean).join(' · ')}
					</Text>
				</View>
				{isNew && <NewChip text="New" />}
			</View>
			<Text style={styles.answerText}>{a.answer}</Text>
			<Text style={styles.when}>
				{whenPrefix}
				{relativeTime(a.created_at)}
			</Text>
			<View style={styles.actions}>
				<AppActionChip
					label={`Helpful · ${likes}`}
					icon={voted ? 'thumb-up' : 'thumb-up-outline'}
					size="md"
					style={voted ? styles.votedChip : undefined}
					onPress={onHelpful}
					accessibilityLabel={`Helpful, ${likes}${voted ? ', you voted' : ''}`}
				/>
				{spread && <View style={styles.spacer} />}
				<AppActionChip label="Consult" filled size="md" onPress={onConsult} />
			</View>
		</AppSoftCard>
	)
}

const styles = StyleSheet.create({
	answer: { gap: 10 },
	// The tinted chip variant is 44 high and ignores `size`: the voted state is the outline chip, tinted, so it keeps its height.
	votedChip: { backgroundColor: APP_COLORS.mint, borderColor: APP_COLORS.primary },
	ribbon: { alignSelf: 'flex-start' },
	docRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
	docText: { flex: 1, minWidth: 0 },
	nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
	docName: { flexShrink: 1, fontSize: 15, lineHeight: 20, fontWeight: '800', color: APP_COLORS.ink },
	docRole: { fontSize: 12, lineHeight: 16, color: APP_COLORS.inkMuted },
	answerText: { fontSize: 15, lineHeight: 23, color: APP_COLORS.ink },
	when: { fontSize: 12, lineHeight: 16, color: APP_COLORS.inkMuted },
	actions: { flexDirection: 'row', gap: 10, alignItems: 'center' },
	spacer: { flex: 1 },
})
