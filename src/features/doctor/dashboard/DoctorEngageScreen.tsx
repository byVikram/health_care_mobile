// src/features/doctor/dashboard/DoctorEngageScreen.tsx
//
// Doctor dashboard "Questions" view — ported field-for-field from the "Doctor Dashboard" design's
// Patient-questions card (id="dr-qa"): icon+title+stat-pill header, single search box, one question
// row per item (tag + "Possible red flag" + "Asked for ..." line, title, clamped text, a coloured
// status line), an inline compose panel (textarea + quick-insert snippets + "Offer a consultation"
// checkbox + char-count + Cancel/Post), a "your answer is live" card once posted, and a
// show-all/show-fewer toggle past the first 3. Two intentional gaps vs the mockup, both because the
// real backend has no field for them (never fabricated): the mock's per-question "urgent/red flag"
// data and its cumulative "94% found helpful" header stat don't exist in GET /api/qa's real schema,
// so the red-flag pill and that stat are simply omitted rather than invented. Everything else —
// layout, spacing, copy, the exact "Answered vs No reply" status-line logic — matches exactly.

import React, { useMemo, useState } from 'react'
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { AppPathIcon, AppSearchBar } from '../../../components/common'
import { APP_COLORS, toneForString } from '../../../config/theme'
import { useTabBarClearance } from '../../../navigation/tabBar'
import { DoctorScreenHeader } from './DoctorScreenHeader'
import { DoctorStatusBanner } from './DoctorStatusBanner'
import { useDoctorStatus } from './useDoctorStatus'
import { listHealthQuestions, submitDoctorAnswer, type PatientQuestion } from '../../../services/qaService'
import { extractApiErrorMessage } from '../../ancillary/ancillaryService'
import Toast from 'react-native-toast-message'

const QA_ICON =
	'M21 12a8 8 0 0 1-11.6 7.1L4 21l1.9-5.4A8 8 0 1 1 21 12zM9.5 10a2.5 2.5 0 1 1 3 2.4c-.5.1-.5.6-.5 1M12 16h.01'
const CHECK_ICON = 'M5 12l5 5 9-10'
const PLUS_ICON = 'M12 5v14M5 12h14'

const MIN_ANSWER_LENGTH = 60

const QUICK_SNIPPETS = [
	{ label: 'General guidance', text: 'This is general information, not a diagnosis. Please see a doctor in person for a full assessment.' },
	{ label: 'When to see a doctor', text: "If symptoms get worse, don't improve in a few days, or you're worried, please book a visit." },
	{ label: 'Book a visit', text: "It's best to get examined in person so we can look into this properly." },
]

export function DoctorEngageScreen() {
	const clearance = useTabBarClearance()
	const { status: doctorStatus, reload: reloadStatus } = useDoctorStatus()
	// Only a verified doctor can answer (the server refuses anyone else). Until the status is known the composer is
	// available, and the server still decides.
	const canAnswer = !doctorStatus || doctorStatus.is_verified

	const [questions, setQuestions] = useState<PatientQuestion[]>([])
	const [loading, setLoading] = useState(true)
	const [refreshing, setRefreshing] = useState(false)
	const [search, setSearch] = useState('')
	const [showAll, setShowAll] = useState(false)
	const [openId, setOpenId] = useState<string | null>(null)
	const [drafts, setDrafts] = useState<Record<string, string>>({})
	const [offerFlags, setOfferFlags] = useState<Record<string, boolean>>({})
	const [justPosted, setJustPosted] = useState<Record<string, boolean>>({})
	const [posting, setPosting] = useState<string | null>(null)

	const load = React.useCallback(async (isRefresh = false) => {
		isRefresh ? setRefreshing(true) : setLoading(true)
		try {
			const res = await listHealthQuestions(search.trim() || undefined, 1, 50)
			setQuestions(res.data ?? [])
		} catch {
			setQuestions([])
		} finally {
			isRefresh ? setRefreshing(false) : setLoading(false)
		}
	}, [search])

	React.useEffect(() => {
		load()
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [])

	React.useEffect(() => {
		const t = setTimeout(() => load(), 350)
		return () => clearTimeout(t)
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [search])

	const openCount = questions.filter((q) => q.answers.length === 0).length
	const qOpenCountLabel = openCount === 0 ? 'All answered' : `${openCount} to answer`

	const shown = useMemo(() => (showAll ? questions : questions.slice(0, 3)), [questions, showAll])

	const handlePost = async (q: PatientQuestion) => {
		const draft = (drafts[q.id] ?? '').trim()
		if (draft.length < MIN_ANSWER_LENGTH) return
		setPosting(q.id)
		try {
			const res = await submitDoctorAnswer(q.id, draft)
			if (res.success) {
				setQuestions((prev) => prev.map((x) => (x.id === q.id ? { ...x, answers: [...x.answers, res.data] } : x)))
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
				contentContainerStyle={{ padding: 16, paddingBottom: clearance }}
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
				<View style={styles.card}>
					<View style={styles.headerRow}>
						<View style={styles.headerIcon}>
							<AppPathIcon d={QA_ICON} size={22} strokeWidth={2} color={APP_COLORS.primary} />
						</View>
						<View style={{ flex: 1, minWidth: 0 }}>
							<Text style={styles.headerTitle}>Answer patient questions</Text>
							<Text style={styles.headerSub}>Free public Q&amp;A</Text>
						</View>
						<View style={styles.countPill}>
							<Text style={styles.countPillText}>{qOpenCountLabel}</Text>
						</View>
					</View>

					<AppSearchBar context="healthQuestions" value={search} onChangeText={setSearch} style={styles.searchBar} />

					{loading ? (
						<ActivityIndicator style={{ marginVertical: 24 }} color={APP_COLORS.primary} />
					) : shown.length === 0 ? (
						<Text style={styles.emptyText}>You&apos;re all caught up here.</Text>
					) : (
						shown.map((q, i) => {
							const composing = openId === q.id
							const done = !!justPosted[q.id] && !composing
							const draft = drafts[q.id] ?? ''
							const chars = draft.trim().length
							const canPost = chars >= MIN_ANSWER_LENGTH
							const tone = toneForString(q.tag || 'General')
							const answered = q.answers.length > 0
							const offer = offerFlags[q.id] !== false

							const statLine = done
								? 'You answered · live for the patient'
								: q.answers.length === 0
									? `No reply yet${canAnswer ? ' · tap to answer' : ''}`
									: `${q.answers.length} ${q.answers.length === 1 ? 'doctor answered' : 'doctors answered'}${canAnswer ? ' · add yours' : ''}`
							const statFg = done || answered ? APP_COLORS.success : '#B4532A'
							const statIcon = done || answered ? CHECK_ICON : PLUS_ICON

							return (
								<View key={q.id} style={[styles.qRow, i < shown.length - 1 && styles.qRowDivider]}>
									<TouchableOpacity
										onPress={() => setOpenId(composing ? null : q.id)}
										accessibilityRole="button"
										accessibilityState={{ expanded: composing }}
										style={{ gap: 4 }}
									>
										<View style={styles.tagRow}>
											<View style={[styles.tagPill, { backgroundColor: tone.bg }]}>
												<Text style={[styles.tagPillText, { color: tone.ink }]}>{q.tag}</Text>
											</View>
											<Text style={styles.whoText}>
												Asked for {q.gender}, {q.age}
											</Text>
										</View>
										<Text style={styles.qTitle}>{q.question}</Text>
										<Text style={styles.qText} numberOfLines={composing ? undefined : 2}>
											{q.full_description || q.short_description}
										</Text>
										<View style={styles.statRow}>
											<AppPathIcon d={statIcon} size={14} strokeWidth={2.4} color={statFg} />
											<Text style={[styles.statText, { color: statFg }]}>{statLine}</Text>
										</View>
									</TouchableOpacity>

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
												Patients read these as expert answers, so you can answer once an admin has verified your
												profile.
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
												{QUICK_SNIPPETS.map((s) => (
													<TouchableOpacity
														key={s.label}
														style={styles.snipChip}
														onPress={() =>
															setDrafts((prev) => {
																const cur = (prev[q.id] ?? '').trim()
																return { ...prev, [q.id]: (cur ? `${cur}\n\n` : '') + s.text }
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
													{offer && <AppPathIcon d={CHECK_ICON} size={12} strokeWidth={3} color="#FFFFFF" />}
												</View>
												<Text style={styles.offerLabel}>Offer a consultation with me</Text>
											</TouchableOpacity>
											<Text style={styles.countHint}>
												Public answer · don&apos;t diagnose or give doses · {canPost ? `${chars} characters` : `min ${MIN_ANSWER_LENGTH} characters · ${chars}`}
											</Text>
											<View style={{ flexDirection: 'row', gap: 8 }}>
												<TouchableOpacity style={styles.cancelBtn} onPress={() => setOpenId(null)}>
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
												<AppPathIcon d={CHECK_ICON} size={14} strokeWidth={2.6} color={APP_COLORS.success} />
												<Text style={styles.doneHeaderText}>Your answer is live · patient notified</Text>
											</View>
											<Text style={styles.doneText}>{draft}</Text>
											<View style={styles.doneFooter}>
												<Text style={styles.doneNote}>{offer ? 'Includes "Book a consultation"' : 'No booking button'}</Text>
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

					{!loading && questions.length > 3 && (
						<TouchableOpacity style={styles.moreBtn} onPress={() => setShowAll((v) => !v)}>
							<Text style={styles.moreBtnText}>{showAll ? 'Show fewer' : `Show all ${questions.length} questions`}</Text>
						</TouchableOpacity>
					)}
				</View>
			</ScrollView>
		</View>
	)
}

export default DoctorEngageScreen

const styles = StyleSheet.create({
	screen: { flex: 1, backgroundColor: APP_COLORS.pageBg },
	card: {
		padding: 16,
		borderRadius: 12,
		backgroundColor: APP_COLORS.surface,
		borderWidth: 1,
		borderColor: APP_COLORS.divider,
		gap: 4,
	},
	headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
	headerIcon: {
		width: 44,
		height: 44,
		borderRadius: 14,
		backgroundColor: APP_COLORS.mint,
		alignItems: 'center',
		justifyContent: 'center',
	},
	headerTitle: { fontSize: 18, lineHeight: 24, fontWeight: '700', color: APP_COLORS.ink },
	headerSub: { fontSize: 13, lineHeight: 18, color: APP_COLORS.inkMuted },
	countPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 9999, backgroundColor: APP_COLORS.ink },
	countPillText: { fontSize: 11, lineHeight: 16, fontWeight: '800', color: '#FFFFFF' },
	searchBar: { marginTop: 10 },
	emptyText: { marginTop: 8, fontSize: 14, lineHeight: 20, color: APP_COLORS.inkMuted },
	qRow: { gap: 8, paddingVertical: 12 },
	qRowDivider: { borderBottomWidth: 1, borderBottomColor: APP_COLORS.divider },
	tagRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
	tagPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
	tagPillText: { fontSize: 11, lineHeight: 16, fontWeight: '700' },
	whoText: { fontSize: 12, lineHeight: 16, color: APP_COLORS.inkMuted },
	qTitle: { fontSize: 15, lineHeight: 20, fontWeight: '700', color: APP_COLORS.ink },
	qText: { fontSize: 13, lineHeight: 18, color: APP_COLORS.inkMuted },
	statRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
	statText: { fontSize: 12, lineHeight: 16, fontWeight: '700' },
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
	snipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
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
	moreBtn: {
		marginTop: 8,
		height: 48,
		borderRadius: 12,
		backgroundColor: APP_COLORS.primary,
		alignItems: 'center',
		justifyContent: 'center',
	},
	moreBtnText: { fontSize: 15, lineHeight: 20, fontWeight: '700', color: '#FFFFFF' },
})
