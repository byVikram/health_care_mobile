// src/features/doctor/dashboard/DoctorEngageScreen.tsx
//
// Doctor dashboard "Questions" view, from the "d q" design (Engage, Questions tab): a full-width white "Patient
// questions" section with a "N to answer" pill, filter chips (All / No answers yet / a topic), one bordered card per
// question (topic tag, "Male, 61 yrs · 1h ago", title, two lines of text, a status line with Skip and Answer) and an
// outlined "Show all N questions" button past the first 3. "Answer" opens the answer composer inside the card
// (textarea, quick-insert snippets, "Offer a consultation" checkbox, char count, Cancel / Post), and a posted answer
// shows a "your answer is live" card.
//
// Left out on purpose, because the backend has no field for them and nothing is made up: the design's "Possible red flag"
// tag and "Red flags" filter, and its "94% helpful" figure. The design's Engage header with Questions / Reads / Groups
// tabs is not built either: a doctor has no Reads or Groups view yet, so this screen keeps the plain "Questions" header.
// "Skip" hides a question for this visit to the screen only; it is not stored.

import React, { useMemo, useState } from 'react'
import {
	ActivityIndicator,
	RefreshControl,
	ScrollView,
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { AppChip, AppPathIcon, AppTag } from '../../../components/common'
import { ROUTES } from '../../../navigation/routes'
import type { AppStackParamList } from '../../../navigation/types'
import { APP_COLORS, TONES, toneForString } from '../../../config/theme'
import { useTabBarClearance } from '../../../navigation/tabBar'
import { DoctorScreenHeader } from './DoctorScreenHeader'
import { MyAnswersLink } from './MyAnswersLink'
import { DoctorStatusBanner } from './DoctorStatusBanner'
import { useDoctorStatus } from './useDoctorStatus'
import { listHealthQuestions, submitDoctorAnswer, type PatientQuestion } from '../../../services/qaService'
import { extractApiErrorMessage } from '../../ancillary/ancillaryService'
import { askerLine } from '../../health-feed/HealthQuestionsPage'
import { relativeTime, splitTags } from '../../health-feed/feedTheme'
import Toast from 'react-native-toast-message'

const CHECK_ICON = 'M5 12l5 5 9-10'

const VISIBLE_AT_FIRST = 3
const MAX_TOPIC_CHIPS = 5
const OPEN_FILTER = 'open'
const ALL_FILTER = 'all'
const TOPIC_PREFIX = 'topic:'
// "No answers yet" reads in the peach ink of the design.
const OPEN_INK = TONES.peach.ink

// An answer needs some text, nothing more: the quick snippets below are only a shortcut, never required.

const QUICK_SNIPPETS = [
	{
		label: 'General guidance',
		text: 'This is general information, not a diagnosis. Please see a doctor in person for a full assessment.',
	},
	{
		label: 'When to see a doctor',
		text: "If symptoms get worse, don't improve in a few days, or you're worried, please book a visit.",
	},
	{ label: 'Book a visit', text: "It's best to get examined in person so we can look into this properly." },
]

export function DoctorEngageScreen() {
	const clearance = useTabBarClearance()
	const { status: doctorStatus, reload: reloadStatus } = useDoctorStatus()
	// Only a verified doctor can answer (the server refuses anyone else). Until the status is known the composer is
	// available, and the server still decides.
	const canAnswer = !doctorStatus || doctorStatus.is_verified

	const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>()
	const [questions, setQuestions] = useState<PatientQuestion[]>([])
	const [answeredTotal, setAnsweredTotal] = useState<number | null>(null)
	const [openTotal, setOpenTotal] = useState<number | null>(null)
	const [loading, setLoading] = useState(true)
	const [refreshing, setRefreshing] = useState(false)
	const [filter, setFilter] = useState(ALL_FILTER)
	const [skipped, setSkipped] = useState<Record<string, boolean>>({})
	const [showAll, setShowAll] = useState(false)
	const [openId, setOpenId] = useState<string | null>(null)
	const [drafts, setDrafts] = useState<Record<string, string>>({})
	const [offerFlags, setOfferFlags] = useState<Record<string, boolean>>({})
	const [justPosted, setJustPosted] = useState<Record<string, boolean>>({})
	const [posting, setPosting] = useState<string | null>(null)

	const load = React.useCallback(async (isRefresh = false) => {
		isRefresh ? setRefreshing(true) : setLoading(true)
		try {
			const res = await listHealthQuestions(undefined, 1, 50)
			setQuestions(res.data ?? [])
		} catch {
			setQuestions([])
		} finally {
			isRefresh ? setRefreshing(false) : setLoading(false)
		}
		// The header counts come from the server's totals (the list above is capped at 50). A failure just falls back to
		// counting what was loaded.
		try {
			const [answered, open] = await Promise.all([
				listHealthQuestions(undefined, 1, 1, true),
				listHealthQuestions(undefined, 1, 1, false),
			])
			setAnsweredTotal(answered.meta?.total ?? null)
			setOpenTotal(open.meta?.total ?? null)
		} catch {
			setAnsweredTotal(null)
			setOpenTotal(null)
		}
	}, [])

	React.useEffect(() => {
		void load()
	}, [load])

	const openCount = openTotal ?? questions.filter((q) => q.answers.length === 0).length
	const openCountLabel = openCount === 0 ? 'All answered' : `${openCount} to answer`
	const subtitle = answeredTotal != null ? `Free public Q&A · ${answeredTotal} answered` : 'Free public Q&A'

	// Topic chips: the most common topics among the loaded questions (a question carries up to three).
	const topics = useMemo(() => {
		const counts = new Map<string, number>()
		for (const q of questions) for (const t of splitTags(q.tag)) counts.set(t, (counts.get(t) ?? 0) + 1)
		return [...counts.entries()]
			.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
			.slice(0, MAX_TOPIC_CHIPS)
			.map(([t]) => t)
	}, [questions])

	const visible = useMemo(
		() =>
			questions.filter((q) => {
				if (skipped[q.id]) return false
				if (filter === OPEN_FILTER) return q.answers.length === 0 || !!justPosted[q.id]
				if (filter.startsWith(TOPIC_PREFIX)) return splitTags(q.tag).includes(filter.slice(TOPIC_PREFIX.length))
				return true
			}),
		[questions, skipped, filter, justPosted]
	)
	const shown = showAll ? visible : visible.slice(0, VISIBLE_AT_FIRST)

	const pickFilter = (next: string) => {
		setFilter(next)
		setShowAll(false)
	}

	const handlePost = async (q: PatientQuestion) => {
		const draft = (drafts[q.id] ?? '').trim()
		if (!draft) return
		setPosting(q.id)
		try {
			const res = await submitDoctorAnswer(q.id, draft)
			if (res.success) {
				setQuestions((prev) =>
					prev.map((x) => (x.id === q.id ? { ...x, answers: [...x.answers, res.data] } : x))
				)
				setJustPosted((prev) => ({ ...prev, [q.id]: true }))
				setOpenId(null)
			}
		} catch (error) {
			// The server refuses an unverified doctor: re-read the status so the composer closes and the banner shows.
			if ((error as { response?: { status?: number } })?.response?.status === 403) {
				setOpenId(null)
				void reloadStatus()
			}
			Toast.show({
				type: 'error',
				text1: extractApiErrorMessage(error, 'Could not post your answer. Please try again.'),
			})
		} finally {
			setPosting(null)
		}
	}

	return (
		<View style={styles.screen}>
			<DoctorScreenHeader variant="simple" title="Questions" subtitle="Free public Q&A" />
			<DoctorStatusBanner status={doctorStatus} />
			<ScrollView
				contentContainerStyle={{ paddingTop: 16, paddingBottom: clearance }}
				refreshControl={
					<RefreshControl
						refreshing={refreshing}
						onRefresh={() => {
							void load(true)
							void reloadStatus()
						}}
					/>
				}
			>
				<View style={styles.section}>
					<View style={styles.headerRow}>
						<View style={styles.headerText}>
							<Text style={styles.headerTitle} accessibilityRole="header">
								Patient questions
							</Text>
							<Text style={styles.headerSub}>{subtitle}</Text>
						</View>
						<View style={styles.countPill}>
							<Text style={styles.countPillText}>{openCountLabel}</Text>
						</View>
					</View>
					<MyAnswersLink onPress={() => navigation.navigate(ROUTES.STACK.DOCTOR_MY_ANSWERS)} />

					<ScrollView
						horizontal
						showsHorizontalScrollIndicator={false}
						style={styles.chipScroll}
						contentContainerStyle={styles.chipRow}
					>
						<FilterChip
							label="All"
							selected={filter === ALL_FILTER}
							onPress={() => pickFilter(ALL_FILTER)}
						/>
						<FilterChip
							label="No answers yet"
							selected={filter === OPEN_FILTER}
							onPress={() => pickFilter(OPEN_FILTER)}
						/>
						{topics.map((t) => (
							<FilterChip
								key={t}
								label={t}
								selected={filter === `${TOPIC_PREFIX}${t}`}
								onPress={() => pickFilter(`${TOPIC_PREFIX}${t}`)}
							/>
						))}
					</ScrollView>

					{loading ? (
						<ActivityIndicator style={{ marginVertical: 24 }} color={APP_COLORS.primary} />
					) : shown.length === 0 ? (
						<Text style={styles.emptyText}>You&apos;re all caught up here.</Text>
					) : (
						shown.map((q) => {
							const composing = openId === q.id
							const done = !!justPosted[q.id] && !composing
							const draft = drafts[q.id] ?? ''
							const chars = draft.trim().length
							const canPost = chars > 0
							const firstTag = splitTags(q.tag)[0] ?? 'General'
							const tone = toneForString(firstTag)
							const answered = q.answers.length > 0
							const offer = offerFlags[q.id] !== false
							const when = relativeTime(q.created_at)
							const who = askerLine(q)

							const statLine = done
								? 'You answered · live for the patient'
								: answered
									? `${q.answers.length} ${q.answers.length === 1 ? 'doctor' : 'doctors'} answered`
									: 'No answers yet'
							const statColor = done ? APP_COLORS.success : answered ? APP_COLORS.inkMuted : OPEN_INK

							return (
								<View key={q.id} style={styles.card}>
									<TouchableOpacity
										onPress={() => setOpenId(composing ? null : q.id)}
										accessibilityRole="button"
										accessibilityState={{ expanded: composing }}
										style={styles.cardBody}
									>
										<View style={styles.tagRow}>
											<AppTag
												label={firstTag}
												bg={tone.bg}
												ink={tone.ink}
												textStyle={styles.tagText}
											/>
											<Text style={styles.whoText} numberOfLines={1}>
												{[who, when].filter(Boolean).join(' · ')}
											</Text>
										</View>
										<Text style={styles.qTitle}>{q.question}</Text>
										<Text style={styles.qText} numberOfLines={composing ? undefined : 2}>
											{q.full_description || q.short_description}
										</Text>
									</TouchableOpacity>

									{!composing && (
										<View style={styles.actionRow}>
											<Text style={[styles.statText, { color: statColor }]} numberOfLines={1}>
												{statLine}
											</Text>
											{!done && (
												<>
													<TouchableOpacity
														style={styles.skipBtn}
														onPress={() =>
															setSkipped((prev) => ({ ...prev, [q.id]: true }))
														}
														accessibilityRole="button"
														accessibilityLabel={`Skip: ${q.question}`}
													>
														<Text style={styles.skipBtnText}>Skip</Text>
													</TouchableOpacity>
													<TouchableOpacity
														style={styles.answerBtn}
														onPress={() => setOpenId(q.id)}
														accessibilityRole="button"
														accessibilityLabel={`Answer: ${q.question}`}
													>
														<Text style={styles.answerBtnText}>Answer</Text>
													</TouchableOpacity>
												</>
											)}
										</View>
									)}

									{composing && !!q.history && (
										<View style={styles.sharedBox}>
											<Text style={styles.sharedText}>
												<Text style={styles.sharedBold}>Shared by patient · </Text>
												{q.history}
											</Text>
										</View>
									)}

									{composing && !canAnswer && (
										<View style={styles.sharedBox}>
											<Text style={styles.sharedText}>
												<Text style={styles.sharedBold}>Answering isn&apos;t open yet · </Text>
												Patients read these as expert answers, so you can answer once an admin
												has verified your profile.
											</Text>
										</View>
									)}

									{composing && canAnswer && (
										<View style={{ gap: 8, marginTop: 4 }}>
											<TextInput
												value={draft}
												onChangeText={(v) => setDrafts((prev) => ({ ...prev, [q.id]: v }))}
												placeholder="General guidance in simple words, and when to see a doctor"
												placeholderTextColor={APP_COLORS.inkMuted}
												multiline
												numberOfLines={5}
												style={styles.textArea}
												accessibilityLabel={`Answer to: ${q.question}`}
											/>
											<View style={styles.snipRow}>
												<Text style={styles.snipHint}>Quick add (optional)</Text>
												{QUICK_SNIPPETS.map((s) => (
													<TouchableOpacity
														key={s.label}
														style={styles.snipChip}
														onPress={() =>
															setDrafts((prev) => {
																const cur = (prev[q.id] ?? '').trim()
																return {
																	...prev,
																	[q.id]: (cur ? `${cur}\n\n` : '') + s.text,
																}
															})
														}
													>
														<Text style={styles.snipChipText}>+ {s.label}</Text>
													</TouchableOpacity>
												))}
											</View>
											<TouchableOpacity
												style={styles.offerRow}
												onPress={() => setOfferFlags((prev) => ({ ...prev, [q.id]: !offer }))}
												accessibilityRole="checkbox"
												accessibilityState={{ checked: offer }}
											>
												<View style={[styles.checkbox, offer && styles.checkboxOn]}>
													{offer && (
														<AppPathIcon
															d={CHECK_ICON}
															size={12}
															strokeWidth={3}
															color="#FFFFFF"
														/>
													)}
												</View>
												<Text style={styles.offerLabel}>Offer a consultation with me</Text>
											</TouchableOpacity>
											<Text style={styles.countHint}>
												Public answer · don&apos;t diagnose or give doses · {chars} characters
											</Text>
											<View style={{ flexDirection: 'row', gap: 8 }}>
												<TouchableOpacity
													style={styles.cancelBtn}
													onPress={() => setOpenId(null)}
												>
													<Text style={styles.cancelBtnText}>Cancel</Text>
												</TouchableOpacity>
												<TouchableOpacity
													style={[styles.postBtn, !canPost && styles.postBtnDisabled]}
													disabled={!canPost || posting === q.id}
													onPress={() => handlePost(q)}
												>
													{posting === q.id ? (
														<ActivityIndicator size="small" color="#FFFFFF" />
													) : (
														<Text style={styles.postBtnText}>Post answer</Text>
													)}
												</TouchableOpacity>
											</View>
										</View>
									)}

									{done && (
										<View style={styles.doneBox}>
											<View style={styles.doneHeader}>
												<AppPathIcon
													d={CHECK_ICON}
													size={14}
													strokeWidth={2.6}
													color={APP_COLORS.success}
												/>
												<Text style={styles.doneHeaderText}>
													Your answer is live · patient notified
												</Text>
											</View>
											<Text style={styles.doneText}>{draft}</Text>
											<View style={styles.doneFooter}>
												<Text style={styles.doneNote}>
													{offer ? 'Includes "Book a consultation"' : 'No booking button'}
												</Text>
												<TouchableOpacity onPress={() => setOpenId(q.id)}>
													<Text style={styles.editLink}>Edit</Text>
												</TouchableOpacity>
											</View>
										</View>
									)}
								</View>
							)
						})
					)}

					{!loading && visible.length > VISIBLE_AT_FIRST && (
						<TouchableOpacity
							style={styles.moreBtn}
							onPress={() => setShowAll((v) => !v)}
							accessibilityRole="button"
						>
							<Text style={styles.moreBtnText}>
								{showAll ? 'Show fewer' : `Show all ${visible.length} questions`}
							</Text>
						</TouchableOpacity>
					)}
				</View>
			</ScrollView>
		</View>
	)
}

/** A filter chip of the design: 36 high pill, hairline border, ink fill and white text while selected. */
function FilterChip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
	return (
		<AppChip
			label={label}
			selected={selected}
			onPress={onPress}
			size="sm"
			borderColor={APP_COLORS.divider}
			style={selected ? styles.chipOn : undefined}
			textStyle={styles.chipText}
		/>
	)
}

export default DoctorEngageScreen

const styles = StyleSheet.create({
	screen: { flex: 1, backgroundColor: APP_COLORS.pageBg },
	// The design's section is full width and white, not a bordered card.
	section: { padding: 16, gap: 12, backgroundColor: APP_COLORS.surface },
	headerRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
	headerText: { flex: 1, minWidth: 0 },
	headerTitle: { fontSize: 16, lineHeight: 22, fontWeight: '800', color: APP_COLORS.ink },
	headerSub: { fontSize: 12, lineHeight: 16, color: APP_COLORS.inkMuted },
	countPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 9999, backgroundColor: APP_COLORS.ink },
	countPillText: { fontSize: 11, lineHeight: 16, fontWeight: '800', color: '#FFFFFF' },
	// Runs edge to edge: it cancels the section's 16 padding and puts it back inside.
	chipScroll: { marginHorizontal: -16, flexGrow: 0 },
	chipRow: { paddingHorizontal: 16, gap: 6 },
	chipOn: { backgroundColor: APP_COLORS.ink, borderColor: APP_COLORS.ink },
	chipText: { fontWeight: '700' },
	emptyText: { marginTop: 4, fontSize: 14, lineHeight: 20, color: APP_COLORS.inkMuted },
	card: {
		padding: 12,
		gap: 6,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: APP_COLORS.divider,
		backgroundColor: APP_COLORS.surface,
	},
	cardBody: { gap: 6 },
	tagRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
	tagText: { fontSize: 11, lineHeight: 16 },
	whoText: { flexShrink: 1, fontSize: 12, lineHeight: 16, color: APP_COLORS.inkMuted },
	qTitle: { fontSize: 15, lineHeight: 21, fontWeight: '800', color: APP_COLORS.ink },
	qText: { fontSize: 13, lineHeight: 19, color: APP_COLORS.inkMuted },
	actionRow: { marginTop: 2, height: 36, flexDirection: 'row', alignItems: 'center', gap: 8 },
	statText: { flex: 1, fontSize: 12, lineHeight: 16, fontWeight: '700' },
	skipBtn: { height: 36, paddingHorizontal: 10, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
	skipBtnText: { fontSize: 13, lineHeight: 18, fontWeight: '700', color: APP_COLORS.inkMuted },
	answerBtn: {
		height: 36,
		paddingHorizontal: 14,
		borderRadius: 8,
		backgroundColor: APP_COLORS.primary,
		alignItems: 'center',
		justifyContent: 'center',
	},
	answerBtnText: { fontSize: 13, lineHeight: 18, fontWeight: '700', color: '#FFFFFF' },
	sharedBox: { padding: 10, borderRadius: 8, backgroundColor: APP_COLORS.mint },
	sharedText: { fontSize: 12, lineHeight: 17, color: APP_COLORS.ink },
	sharedBold: { color: APP_COLORS.primary, fontWeight: '700' },
	textArea: {
		padding: 10,
		borderWidth: 1,
		borderColor: APP_COLORS.border,
		borderRadius: 10,
		backgroundColor: APP_COLORS.surface,
		fontSize: 15,
		lineHeight: 21,
		color: APP_COLORS.ink,
		textAlignVertical: 'top',
	},
	snipRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
	snipHint: { width: '100%', fontSize: 12, lineHeight: 16, color: APP_COLORS.inkMuted },
	snipChip: {
		height: 32,
		paddingHorizontal: 10,
		borderRadius: 9999,
		borderWidth: 1.5,
		borderStyle: 'dashed',
		borderColor: APP_COLORS.primary,
		alignItems: 'center',
		justifyContent: 'center',
	},
	snipChipText: { fontSize: 12, lineHeight: 16, fontWeight: '700', color: APP_COLORS.primary },
	offerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 },
	checkbox: {
		width: 20,
		height: 20,
		borderRadius: 5,
		borderWidth: 1.5,
		borderColor: APP_COLORS.border,
		alignItems: 'center',
		justifyContent: 'center',
	},
	checkboxOn: { backgroundColor: APP_COLORS.primary, borderColor: APP_COLORS.primary },
	offerLabel: { fontSize: 13, lineHeight: 18, fontWeight: '700', color: APP_COLORS.ink },
	countHint: { fontSize: 11, lineHeight: 15, color: APP_COLORS.inkMuted },
	cancelBtn: {
		flexShrink: 0,
		height: 44,
		paddingHorizontal: 14,
		borderWidth: 1.5,
		borderColor: APP_COLORS.border,
		borderRadius: 10,
		alignItems: 'center',
		justifyContent: 'center',
	},
	cancelBtnText: { fontSize: 13, lineHeight: 18, fontWeight: '700', color: APP_COLORS.ink },
	postBtn: {
		flex: 1,
		height: 44,
		borderRadius: 10,
		backgroundColor: APP_COLORS.primary,
		alignItems: 'center',
		justifyContent: 'center',
	},
	postBtnDisabled: { backgroundColor: APP_COLORS.disabledBtn },
	postBtnText: { fontSize: 14, lineHeight: 20, fontWeight: '800', color: '#FFFFFF' },
	doneBox: {
		marginTop: 4,
		padding: 10,
		borderRadius: 10,
		backgroundColor: APP_COLORS.surface,
		borderWidth: 1,
		borderColor: APP_COLORS.mintAccent,
		gap: 6,
	},
	doneHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
	doneHeaderText: { fontSize: 12, lineHeight: 16, fontWeight: '800', color: APP_COLORS.success },
	doneText: { fontSize: 13, lineHeight: 19, color: APP_COLORS.ink },
	doneFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
	doneNote: { fontSize: 12, lineHeight: 16, color: APP_COLORS.inkMuted },
	editLink: { fontSize: 13, lineHeight: 18, fontWeight: '700', color: APP_COLORS.primary },
	// The design's "Show all N questions": outlined, 44 high, radius 10.
	moreBtn: {
		height: 44,
		borderRadius: 10,
		borderWidth: 1,
		borderColor: APP_COLORS.primary,
		backgroundColor: APP_COLORS.surface,
		alignItems: 'center',
		justifyContent: 'center',
	},
	moreBtnText: { fontSize: 14, lineHeight: 20, fontWeight: '700', color: APP_COLORS.primary },
})
