// src/features/health-feed/QuestionCard.tsx
//
// THE question card of the Q&A screens, one look in three variants (the "Patient questions" / "My questions" / "My answers" designs),
// built on the shared AppSoftCard (the flat outline card of the doctor dashboards) and AppTag (the chips):
//   feed      the public Health questions list: topic pill, who asked and when, the title, a 2-line preview, answered / waiting status
//   mine      a patient's "My questions": the same, an "N new" chip when answers arrived since they last looked, a divider over the
//             status line ("Waiting for an answer · usually within 24 hrs"), a chevron
//   answered  a doctor's "My answers": "You: first line of my answer" as the preview, an "N new answers" chip when other doctors
//             answered since the doctor last looked, and a footer of helpful votes, who else answered and when they answered
// `QuestionArticle` is the same question as the big card at the top of the detail screens.

import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { AppPathIcon, AppSoftCard, AppTag } from '../../components/common'
import { APP_COLORS } from '../../config/theme'
import type { PatientQuestion } from '../../services/qaService'
import { FEED_ICONS, FEED_TONES, askerLine, relativeTime, splitTags, toneForTopic } from './feedTheme'

export type QuestionCardVariant = 'feed' | 'mine' | 'answered'

type Props = {
	q: PatientQuestion
	onPress: () => void
	variant?: QuestionCardVariant
	/** Answers (the patient's list) or other doctors' answers (the doctor's list) since the user last opened the question. */
	newCount?: number
}

/** The amber "N new" chip. */
export function NewChip({ text }: { text: string }) {
	return (
		<AppTag
			label={text}
			shape="pill"
			bg={FEED_TONES.amber.bg}
			ink={FEED_TONES.amber.ink}
			textStyle={styles.chipText}
		/>
	)
}

export function QuestionCard({ q, onPress, variant = 'feed', newCount = 0 }: Props) {
	const first = splitTags(q.tag)[0]
	const tone = toneForTopic(first ?? '')
	const answers = q.answers.length
	const own = variant === 'answered' ? q.answers.find((a) => a.is_mine) : undefined
	const others = variant === 'answered' ? q.answers.filter((a) => !a.is_mine).length : 0
	// A doctor's card says when they answered in its footer, so the top line is only who asked.
	const meta = (variant === 'answered' ? [askerLine(q)] : [askerLine(q), relativeTime(q.created_at)])
		.filter(Boolean)
		.join(' · ')
	const news = newCount > 0 && variant !== 'feed'
	const newText =
		variant === 'answered' ? `${newCount} new ${newCount === 1 ? 'answer' : 'answers'}` : `${newCount} new`

	return (
		<AppSoftCard
			onPress={onPress}
			radius={variant === 'feed' ? 12 : 14}
			borderColor={news ? APP_COLORS.mintAccent : undefined}
			style={styles.card}
		>
			<View style={styles.top}>
				{!!first && <AppTag label={first} bg={tone.bg} ink={tone.ink} />}
				<Text style={styles.meta} numberOfLines={1}>
					{meta}
				</Text>
				{news && <NewChip text={newText} />}
			</View>
			<Text style={styles.title}>{q.question}</Text>
			{variant === 'answered' ? (
				<Text style={styles.body} numberOfLines={2}>
					<Text style={styles.you}>You: </Text>
					{(own?.answer ?? '').split('\n')[0]}
				</Text>
			) : (
				<Text style={styles.body} numberOfLines={2}>
					{q.short_description || q.full_description}
				</Text>
			)}

			{variant === 'answered' ? (
				<View style={[styles.footer, styles.footerRule]}>
					<View style={styles.helpful}>
						<AppPathIcon d={FEED_ICONS.thumb} size={13} strokeWidth={2} color={APP_COLORS.inkMuted} />
						<Text style={styles.footerText}>{own?.likes ?? 0} helpful</Text>
					</View>
					<Text style={styles.footerText}>
						{others > 0
							? `+${others} ${others === 1 ? 'doctor' : 'doctors'} answered`
							: 'Only you answered'}
					</Text>
					<Text style={[styles.footerText, styles.when]}>{relativeTime(own?.created_at)}</Text>
				</View>
			) : (
				<View style={[styles.footer, variant === 'mine' && styles.footerRule]}>
					{answers > 0 && (
						<AppPathIcon d={FEED_ICONS.check} size={14} strokeWidth={2.4} color={APP_COLORS.success} />
					)}
					<Text style={[styles.status, { color: answers ? APP_COLORS.success : APP_COLORS.warning }]}>
						{answers
							? `${answers} ${answers === 1 ? 'doctor' : 'doctors'} answered`
							: variant === 'mine'
								? 'Waiting for an answer · usually within 24 hrs'
								: 'Waiting for an answer'}
					</Text>
					{variant === 'mine' && (
						<AppPathIcon
							d={FEED_ICONS.chevronRight}
							size={16}
							strokeWidth={2.2}
							color={APP_COLORS.inkMuted}
						/>
					)}
				</View>
			)}
		</AppSoftCard>
	)
}

/** The question as the big card at the top of a detail screen: topic pill(s), who asked, the title and the full text. */
export function QuestionArticle({ q, when }: { q: PatientQuestion; when?: string }) {
	return (
		<AppSoftCard style={styles.article}>
			<View style={styles.articleTop}>
				{splitTags(q.tag).map((t) => (
					<AppTag key={t} label={t} bg={toneForTopic(t).bg} ink={toneForTopic(t).ink} />
				))}
				<Text style={styles.meta}>{askerLine(q)}</Text>
			</View>
			<Text style={styles.articleTitle}>{q.question}</Text>
			<Text style={styles.articleBody}>{q.full_description || q.short_description}</Text>
			{!!when && <Text style={styles.meta}>{when}</Text>}
		</AppSoftCard>
	)
}

/** The round verified tick next to a doctor's name. */
export function VerifiedBadge() {
	return (
		<View style={styles.verified} accessibilityLabel="Verified doctor">
			<AppPathIcon d={FEED_ICONS.check} size={10} strokeWidth={3.4} color="#FFFFFF" />
		</View>
	)
}

const styles = StyleSheet.create({
	card: { marginHorizontal: 16, gap: 6 },
	top: { flexDirection: 'row', alignItems: 'center', gap: 8 },
	chipText: { fontSize: 11, lineHeight: 16, fontWeight: '800' },
	meta: { flex: 1, minWidth: 0, fontSize: 12, lineHeight: 16, color: APP_COLORS.inkMuted },
	title: { fontSize: 15, lineHeight: 21, fontWeight: '800', color: APP_COLORS.ink },
	body: { fontSize: 13, lineHeight: 19, color: APP_COLORS.inkMuted },
	you: { fontWeight: '800', color: APP_COLORS.ink },
	footer: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
	footerRule: { gap: 12, marginTop: 4, paddingTop: 8, borderTopWidth: 1, borderTopColor: APP_COLORS.divider },
	status: { flex: 1, fontSize: 12, lineHeight: 16, fontWeight: '700' },
	helpful: { flexDirection: 'row', alignItems: 'center', gap: 4 },
	footerText: { fontSize: 12, lineHeight: 16, color: APP_COLORS.inkMuted },
	when: { flex: 1, textAlign: 'right' },
	article: { gap: 8 },
	articleTop: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
	articleTitle: { fontSize: 18, lineHeight: 24, fontWeight: '800', color: APP_COLORS.ink },
	articleBody: { fontSize: 14, lineHeight: 21, color: APP_COLORS.ink },
	verified: {
		width: 16,
		height: 16,
		borderRadius: 9999,
		backgroundColor: APP_COLORS.primary,
		alignItems: 'center',
		justifyContent: 'center',
	},
})
