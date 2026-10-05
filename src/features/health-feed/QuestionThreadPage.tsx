// src/features/health-feed/QuestionThreadPage.tsx
//
// "Ask a doctor" thread from the Health feeds design: the question, "N doctors answered" with the most
// helpful answer first (Helpful vote + Consult), a disclaimer, similar questions, and a sticky
// "Ask your own question, free" bar that opens the ask sheet. Data: GET /api/qa/questions/{id}.

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Share, StyleSheet, Text, View } from 'react-native'
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Toast from 'react-native-toast-message'
import { AppAvatar, AppPathIcon } from '../../components/common'
import { APP_COLORS } from '../../config/theme'
import { ROUTES } from '../../navigation/routes'
import type { AppStackParamList } from '../../navigation/types'
import {
	getQuestionDetail,
	likeDoctorAnswer,
	listHealthQuestions,
	type DoctorAnswer,
	type PatientQuestion,
} from '../../services/qaService'
import { buildS3Url } from '../../utils/s3Utils'
import { AskQuestionSheet } from './AskQuestionSheet'
import { askerLine } from './HealthQuestionsPage'
import { FEED_ICONS, initialsOf, relativeTime, splitTags, toneForTopic } from './feedTheme'

type Nav = NativeStackNavigationProp<AppStackParamList>
const GREEN = '#1E7A4E'
const AMBER = '#8A5300'

export default function QuestionThreadPage() {
	const navigation = useNavigation<Nav>()
	const route = useRoute<RouteProp<AppStackParamList, typeof ROUTES.STACK.PATIENT_QUESTION_DETAIL>>()
	const insets = useSafeAreaInsets()
	const questionId = route.params?.questionId ?? route.params?.question?.id

	const [q, setQ] = useState<PatientQuestion | null>((route.params?.question as PatientQuestion | undefined) ?? null)
	const [loading, setLoading] = useState(!q)
	const [refreshing, setRefreshing] = useState(false)
	const [similar, setSimilar] = useState<PatientQuestion[]>([])
	const [liked, setLiked] = useState<Record<string, number>>({})
	const [askOpen, setAskOpen] = useState(false)

	const load = useCallback(async () => {
		if (!questionId) return
		try {
			const res = await getQuestionDetail(String(questionId))
			if (res.success) setQ(res.data)
		} catch {
			Toast.show({ type: 'error', text1: 'Couldn’t load this question' })
		}
	}, [questionId])

	useEffect(() => {
		load().finally(() => setLoading(false))
	}, [load])

	// "Similar questions": other questions sharing a topic.
	useEffect(() => {
		if (!q) return
		const mine = splitTags(q.tag)
		listHealthQuestions(undefined, 1, 50)
			.then((res) => {
				const rows = res.success ? res.data : []
				setSimilar(
					rows.filter((r) => r.id !== q.id && splitTags(r.tag).some((t) => mine.includes(t))).slice(0, 3)
				)
			})
			.catch(() => setSimilar([]))
	}, [q?.id, q?.tag])

	const answers = useMemo(() => {
		const rows = (q?.answers ?? []).map((a) => ({ ...a, likes: liked[a.id] ?? a.likes }))
		return rows.sort((a, b) => b.likes - a.likes || a.created_at.localeCompare(b.created_at))
	}, [q, liked])

	const onHelpful = async (a: DoctorAnswer & { likes: number }) => {
		if (liked[a.id] !== undefined) return
		setLiked((prev) => ({ ...prev, [a.id]: a.likes + 1 }))
		try {
			const res = await likeDoctorAnswer(a.id)
			if (res.success) setLiked((prev) => ({ ...prev, [a.id]: res.likes }))
		} catch {
			setLiked((prev) => {
				const { [a.id]: _undone, ...rest } = prev
				return rest
			})
			Toast.show({ type: 'error', text1: 'Couldn’t save your vote' })
		}
	}

	const onShare = () => {
		if (q) void Share.share({ message: q.question })
	}

	const onRefresh = async () => {
		setRefreshing(true)
		await load()
		setRefreshing(false)
	}

	const tags = splitTags(q?.tag)

	return (
		<View style={styles.page}>
			<View style={[styles.top, { paddingTop: insets.top, height: 60 + insets.top }]}>
				<Pressable
					onPress={() => navigation.goBack()}
					accessibilityRole="button"
					accessibilityLabel="Back"
					style={styles.topBtn}
				>
					<AppPathIcon d={FEED_ICONS.back} size={22} strokeWidth={2.2} color={APP_COLORS.ink} />
				</Pressable>
				<Text style={styles.topTitle} numberOfLines={1}>
					Ask a doctor
				</Text>
				<Pressable
					onPress={onShare}
					accessibilityRole="button"
					accessibilityLabel="Share question"
					style={styles.topBtn}
				>
					<AppPathIcon d={FEED_ICONS.share} size={20} strokeWidth={2} color={APP_COLORS.ink} />
				</Pressable>
			</View>

			{loading ? (
				<ActivityIndicator style={{ marginTop: 40 }} color={APP_COLORS.primary} />
			) : !q ? (
				<View style={styles.missing}>
					<Text style={styles.missingTitle}>Question not found</Text>
					<Text style={styles.missingText}>It may have been removed.</Text>
				</View>
			) : (
				<ScrollView
					refreshControl={
						<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={APP_COLORS.primary} />
					}
					contentContainerStyle={{ paddingBottom: 96 + insets.bottom }}
					showsVerticalScrollIndicator={false}
				>
					<View style={styles.question}>
						<View style={styles.pillRow}>
							{tags.map((t) => (
								<View key={t} style={[styles.pill, { backgroundColor: toneForTopic(t).bg }]}>
									<Text style={[styles.pillText, { color: toneForTopic(t).ink }]}>{t}</Text>
								</View>
							))}
							<Text style={styles.meta}>
								{['Asked for ' + askerLine(q), relativeTime(q.created_at)].filter(Boolean).join(' · ')}
							</Text>
						</View>
						<Text style={styles.qTitle}>{q.question}</Text>
						<Text style={styles.qBody}>{q.full_description || q.short_description}</Text>
					</View>

					<View style={styles.answersHead}>
						<Text style={styles.answersTitle}>
							{answers.length
								? `${answers.length} ${answers.length === 1 ? 'doctor' : 'doctors'} answered`
								: 'No answers yet'}
						</Text>
						{answers.length > 1 && <Text style={styles.answersSort}>Most helpful first</Text>}
					</View>

					{answers.length === 0 ? (
						<View style={styles.waiting}>
							<AppPathIcon d={FEED_ICONS.clock} size={20} strokeWidth={2} color={AMBER} />
							<Text style={styles.waitingText}>
								Waiting for a doctor’s answer. We’ll notify you as soon as one replies.
							</Text>
						</View>
					) : (
						answers.map((a, i) => (
							<AnswerCard
								key={a.id}
								a={a}
								top={i === 0 && answers.length > 1 && a.likes > 0}
								voted={liked[a.id] !== undefined}
								onHelpful={() => void onHelpful(a)}
								onConsult={() => navigation.navigate(ROUTES.STACK.DOCTOR_DETAIL, { id: a.doctor_id })}
							/>
						))
					)}

					<View style={styles.note}>
						<AppPathIcon d={FEED_ICONS.info} size={16} strokeWidth={2} color={APP_COLORS.inkMuted} />
						<Text style={styles.noteText}>
							Answers are general advice, not a diagnosis. For anything urgent, see a doctor or call 108.
						</Text>
					</View>

					{similar.length > 0 && (
						<View style={styles.similar}>
							<Text style={styles.similarTitle}>Similar questions</Text>
							{similar.map((s) => (
								<Pressable
									key={s.id}
									onPress={() =>
										navigation.push(ROUTES.STACK.PATIENT_QUESTION_DETAIL, {
											questionId: s.id,
											question: s,
										})
									}
									accessibilityRole="button"
									style={styles.similarRow}
								>
									<View style={{ flex: 1, minWidth: 0 }}>
										<Text style={styles.similarQ} numberOfLines={2}>
											{s.question}
										</Text>
										<Text style={styles.similarMeta}>
											{s.answers.length
												? `${s.answers.length} ${s.answers.length === 1 ? 'doctor' : 'doctors'} answered`
												: 'Waiting for an answer'}
										</Text>
									</View>
									<AppPathIcon
										d={FEED_ICONS.chevronRight}
										size={18}
										strokeWidth={2.2}
										color={APP_COLORS.inkMuted}
									/>
								</Pressable>
							))}
						</View>
					)}
				</ScrollView>
			)}

			<View style={[styles.bar, { paddingBottom: Math.max(12, insets.bottom + 4) }]}>
				<Pressable onPress={() => setAskOpen(true)} accessibilityRole="button" style={styles.barBtn}>
					<AppPathIcon d={FEED_ICONS.plus} size={20} strokeWidth={2.4} color="#FFFFFF" />
					<Text style={styles.barText}>Ask your own question, free</Text>
				</Pressable>
			</View>

			<AskQuestionSheet
				visible={askOpen}
				onClose={() => setAskOpen(false)}
				onViewQuestion={(id) => navigation.push(ROUTES.STACK.PATIENT_QUESTION_DETAIL, { questionId: id })}
			/>
		</View>
	)
}

function AnswerCard({
	a,
	top,
	voted,
	onHelpful,
	onConsult,
}: {
	a: DoctorAnswer & { likes: number }
	top: boolean
	voted: boolean
	onHelpful: () => void
	onConsult: () => void
}) {
	return (
		<View style={[styles.answer, { borderColor: top ? APP_COLORS.mintAccent : APP_COLORS.divider }]}>
			{top && (
				<View style={styles.badge}>
					<AppPathIcon d={FEED_ICONS.check} size={12} strokeWidth={3} color={APP_COLORS.primary} />
					<Text style={styles.badgeText}>MOST HELPFUL</Text>
				</View>
			)}
			<View style={styles.docRow}>
				<AppAvatar
					uri={buildS3Url(a.doctor_avatar ?? null)}
					name={initialsOf(a.doctor_name)}
					size={44}
					borderWidth={0}
					backgroundColor={APP_COLORS.mint}
					initialsColor={APP_COLORS.ink}
				/>
				<View style={{ flex: 1, minWidth: 0 }}>
					<View style={styles.nameRow}>
						<Text style={styles.docName} numberOfLines={1}>
							{a.doctor_name}
						</Text>
						<View style={styles.verified}>
							<AppPathIcon d={FEED_ICONS.check} size={10} strokeWidth={3.4} color="#FFFFFF" />
						</View>
					</View>
					<Text style={styles.docRole} numberOfLines={1}>
						{[a.doctor_specialty, a.doctor_hospital].filter(Boolean).join(' · ')}
					</Text>
				</View>
			</View>
			<Text style={styles.answerText}>{a.answer}</Text>
			<Text style={styles.when}>{relativeTime(a.created_at)}</Text>
			<View style={styles.actions}>
				<Pressable
					onPress={onHelpful}
					accessibilityRole="button"
					accessibilityState={{ selected: voted }}
					style={[styles.helpful, voted && styles.helpfulOn]}
				>
					<AppPathIcon
						d={FEED_ICONS.thumb}
						size={16}
						strokeWidth={2}
						color={voted ? APP_COLORS.primary : APP_COLORS.ink}
						fill={voted ? APP_COLORS.mint : 'none'}
					/>
					<Text style={[styles.helpfulText, { color: voted ? APP_COLORS.primary : APP_COLORS.ink }]}>
						Helpful · {a.likes}
					</Text>
				</Pressable>
				<Pressable onPress={onConsult} accessibilityRole="button" style={styles.consult}>
					<Text style={styles.consultText}>Consult</Text>
				</Pressable>
			</View>
		</View>
	)
}

const styles = StyleSheet.create({
	page: { flex: 1, backgroundColor: APP_COLORS.pageBg },
	top: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 8,
		backgroundColor: '#FFFFFF',
		borderBottomWidth: 1,
		borderBottomColor: APP_COLORS.divider,
	},
	topBtn: { width: 44, height: 44, borderRadius: 9999, alignItems: 'center', justifyContent: 'center' },
	topTitle: { flex: 1, textAlign: 'center', fontSize: 17, lineHeight: 22, fontWeight: '800', color: APP_COLORS.ink },
	question: {
		backgroundColor: '#FFFFFF',
		paddingHorizontal: 16,
		paddingTop: 16,
		paddingBottom: 18,
		gap: 8,
		borderBottomWidth: 1,
		borderBottomColor: APP_COLORS.divider,
	},
	pillRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
	pill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
	pillText: { fontSize: 11, lineHeight: 16, fontWeight: '700' },
	meta: { fontSize: 12, lineHeight: 16, color: APP_COLORS.inkMuted },
	qTitle: { fontSize: 21, lineHeight: 28, fontWeight: '800', color: APP_COLORS.ink },
	qBody: { fontSize: 15, lineHeight: 23, color: APP_COLORS.ink },
	answersHead: {
		flexDirection: 'row',
		alignItems: 'baseline',
		justifyContent: 'space-between',
		paddingHorizontal: 16,
		paddingTop: 20,
		paddingBottom: 10,
	},
	answersTitle: { fontSize: 17, lineHeight: 22, fontWeight: '800', color: APP_COLORS.ink },
	answersSort: { fontSize: 12, lineHeight: 16, color: APP_COLORS.inkMuted },
	waiting: {
		marginHorizontal: 16,
		padding: 14,
		borderRadius: 12,
		backgroundColor: '#FFF4DF',
		flexDirection: 'row',
		gap: 10,
		alignItems: 'center',
	},
	waitingText: { flex: 1, fontSize: 13, lineHeight: 19, color: AMBER },
	answer: {
		marginHorizontal: 16,
		marginBottom: 12,
		padding: 14,
		borderRadius: 12,
		borderWidth: 1,
		backgroundColor: '#FFFFFF',
		gap: 10,
	},
	badge: {
		alignSelf: 'flex-start',
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
		paddingHorizontal: 8,
		height: 22,
		borderRadius: 6,
		backgroundColor: APP_COLORS.mint,
	},
	badgeText: { fontSize: 10.5, fontWeight: '800', letterSpacing: 0.5, color: APP_COLORS.primary },
	docRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
	nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
	docName: { flexShrink: 1, fontSize: 15, lineHeight: 20, fontWeight: '800', color: APP_COLORS.ink },
	verified: {
		width: 16,
		height: 16,
		borderRadius: 9999,
		backgroundColor: GREEN,
		alignItems: 'center',
		justifyContent: 'center',
	},
	docRole: { fontSize: 12, lineHeight: 16, color: APP_COLORS.inkMuted },
	answerText: { fontSize: 15, lineHeight: 23, color: APP_COLORS.ink },
	when: { fontSize: 12, lineHeight: 16, color: APP_COLORS.inkMuted },
	actions: { flexDirection: 'row', gap: 10, alignItems: 'center' },
	helpful: {
		height: 40,
		paddingHorizontal: 14,
		borderRadius: 10,
		borderWidth: 1,
		borderColor: APP_COLORS.divider,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		backgroundColor: '#FFFFFF',
	},
	helpfulOn: { borderColor: APP_COLORS.primary, backgroundColor: APP_COLORS.mint },
	helpfulText: { fontSize: 13, fontWeight: '700' },
	consult: {
		height: 40,
		paddingHorizontal: 20,
		borderRadius: 10,
		backgroundColor: APP_COLORS.primary,
		alignItems: 'center',
		justifyContent: 'center',
	},
	consultText: { fontSize: 14, fontWeight: '800', color: '#FFFFFF' },
	note: {
		marginHorizontal: 16,
		marginTop: 4,
		padding: 12,
		borderRadius: 10,
		backgroundColor: APP_COLORS.mint,
		flexDirection: 'row',
		gap: 8,
	},
	noteText: { flex: 1, fontSize: 12, lineHeight: 17, color: APP_COLORS.ink },
	similar: { paddingHorizontal: 16, paddingTop: 22 },
	similarTitle: { fontSize: 17, lineHeight: 22, fontWeight: '800', color: APP_COLORS.ink, marginBottom: 8 },
	similarRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
		paddingVertical: 12,
		borderBottomWidth: 1,
		borderBottomColor: APP_COLORS.divider,
	},
	similarQ: { fontSize: 14, lineHeight: 20, fontWeight: '700', color: APP_COLORS.ink },
	similarMeta: { fontSize: 12, lineHeight: 16, color: APP_COLORS.inkMuted, marginTop: 2 },
	missing: { alignItems: 'center', paddingTop: 80, gap: 4 },
	missingTitle: { fontSize: 16, fontWeight: '800', color: APP_COLORS.ink },
	missingText: { fontSize: 13, color: APP_COLORS.inkMuted },
	bar: {
		position: 'absolute',
		left: 0,
		right: 0,
		bottom: 0,
		paddingHorizontal: 16,
		paddingTop: 12,
		backgroundColor: '#FFFFFF',
		borderTopWidth: 1,
		borderTopColor: APP_COLORS.divider,
	},
	barBtn: {
		height: 52,
		borderRadius: 12,
		backgroundColor: APP_COLORS.primary,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 8,
	},
	barText: { fontSize: 16, fontWeight: '800', color: '#FFFFFF' },
})
