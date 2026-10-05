// src/features/health-feed/AskQuestionSheet.tsx
//
// "Ask a doctor, free" from the Health feeds design: a tall bottom sheet with Who-is-this-for (you, a
// family member, or someone else with an age + gender), Tags (up to 3, via a full-sheet picker), a title
// and a description, a Submit button that reveals what's missing, and a "Question submitted" screen.
// Posts to POST /api/qa/questions (tags go in the question's `tag` as a comma-separated list).

import React, { useEffect, useMemo, useState } from 'react'
import {
	ActivityIndicator,
	KeyboardAvoidingView,
	Modal,
	Platform,
	Pressable,
	ScrollView,
	StyleSheet,
	Text,
	TextInput,
	View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Toast from 'react-native-toast-message'
import { AppAvatar, AppPathIcon } from '../../components/common'
import { APP_COLORS } from '../../config/theme'
import { useFamilyMembers, SELF_MEMBER_KEY, type FamilyMemberOption } from '../../hooks/useFamilyMembers'
import { getPatientDetails } from '../profile/patient/PatientProfileService'
import { submitHealthQuestion } from '../../services/qaService'
import { getSpecialities } from '../doctor/doctorService'
import { buildS3Url } from '../../utils/s3Utils'
import { FEED_ICONS, toneForTopic } from './feedTheme'

const GENDERS = ['Female', 'Male', 'Other']
const OTHER_KEY = 'other'
const MAX_TAGS = 3
const MIN_TITLE = 10
const MIN_BODY = 20
const FIELD_BORDER = '#9FB4B6'
const ERROR = '#B42318'

type Person = {
	key: string
	label: string
	detail: string
	age?: string
	gender?: string
	avatar?: string | null
	initials?: string
	isAdd?: boolean
}

const cap = (v?: string) => (v ? v.charAt(0).toUpperCase() + v.slice(1).toLowerCase() : '')
const ageNumber = (v?: string | number) =>
	String(v ?? '')
		.replace(/\s*(yrs?|years?)$/i, '')
		.trim()

function personFrom(m: FamilyMemberOption): Person {
	const self = m.key === SELF_MEMBER_KEY || m.relation === 'Self'
	const age = ageNumber(m.age)
	const gender = cap(m.gender)
	const facts = [age ? `${age} yrs` : '', gender].filter(Boolean).join(', ')
	return {
		key: m.key,
		label: self ? 'Myself' : m.relation,
		detail: [m.name, facts].filter(Boolean).join(' · '),
		age,
		gender,
		avatar: m.avatar,
		initials: m.name
			.split(/\s+/)
			.slice(0, 2)
			.map((p) => p[0])
			.join('')
			.toUpperCase(),
	}
}

type Props = {
	visible: boolean
	onClose: () => void
	/** Called after a successful post, with the new question's id (e.g. to refresh the list). */
	onPosted?: (questionId: string) => void
	/** "View my question" on the confirmation screen. */
	onViewQuestion?: (questionId: string) => void
}

export function AskQuestionSheet({ visible, onClose, onPosted, onViewQuestion }: Props) {
	const insets = useSafeAreaInsets()
	const { members } = useFamilyMembers()
	const people = useMemo<Person[]>(
		() => [
			...members.map(personFrom),
			{ key: OTHER_KEY, label: 'Someone else', detail: 'Enter their age and gender', isAdd: true },
		],
		[members]
	)

	const [who, setWho] = useState(SELF_MEMBER_KEY)
	const [whoOpen, setWhoOpen] = useState(false)
	const [tagsOpen, setTagsOpen] = useState(false)
	const [tagQuery, setTagQuery] = useState('')
	const [tags, setTags] = useState<string[]>([])
	const [age, setAge] = useState('')
	const [gender, setGender] = useState('')
	const [title, setTitle] = useState('')
	const [body, setBody] = useState('')
	const [tried, setTried] = useState(false)
	const [submitting, setSubmitting] = useState(false)
	const [posted, setPosted] = useState<{ id: string; title: string; tags: string[]; askedFor: string } | null>(null)
	const [location, setLocation] = useState('India')
	const [specialities, setSpecialities] = useState<string[]>([])
	const [specStatus, setSpecStatus] = useState<'loading' | 'ready' | 'error'>('loading')

	// Reset every time the sheet opens, and pick up the patient's city for the post.
	useEffect(() => {
		if (!visible) return
		setWho(SELF_MEMBER_KEY)
		setWhoOpen(false)
		setTagsOpen(false)
		setTagQuery('')
		setTags([])
		setAge('')
		setGender('')
		setTitle('')
		setBody('')
		setTried(false)
		setPosted(null)
		setSpecStatus('loading')
		getSpecialities()
			.then((res) => {
				setSpecialities((res.data ?? []).map((sp) => sp.label).filter(Boolean))
				setSpecStatus('ready')
			})
			.catch(() => setSpecStatus('error'))
		getPatientDetails()
			.then((res) => {
				const personal = res?.data?.personal ?? res?.data
				const city = personal?.city || personal?.location
				if (city) setLocation(String(city))
			})
			.catch(() => {})
	}, [visible])

	const current = people.find((p) => p.key === who) ?? people[0]
	const other = who === OTHER_KEY
	const okTags = tags.length > 0
	const okTitle = title.trim().length >= MIN_TITLE
	const okBody = body.trim().length >= MIN_BODY
	const okWho = !other || (age.trim() !== '' && !!gender)
	const ready = okTags && okTitle && okBody && okWho
	const err = (ok: boolean) => tried && !ok

	const submit = async () => {
		if (!ready) {
			setTried(true)
			return
		}
		if (submitting) return
		const askerGender = other ? gender : cap(current.gender) || 'Other'
		const askerAge = other ? age.trim() : current.age || ''
		setSubmitting(true)
		try {
			const res = await submitHealthQuestion({
				gender: askerGender,
				age: askerAge ? `${askerAge} yrs` : 'Not shared',
				location,
				tag: tags.join(', '),
				question: title.trim(),
				short_description: body.trim().slice(0, 160),
				full_description: body.trim(),
			})
			if (!res.success) throw new Error('not saved')
			setPosted({
				id: res.data.id,
				title: title.trim(),
				tags,
				askedFor: `Asked for ${askerGender}${askerAge ? `, ${askerAge} yrs` : ''}`,
			})
			onPosted?.(res.data.id)
		} catch {
			Toast.show({ type: 'error', text1: 'Couldn’t post your question', text2: 'Please try again.' })
		} finally {
			setSubmitting(false)
		}
	}

	const toggleTag = (t: string) => {
		if (tags.includes(t)) setTags(tags.filter((x) => x !== t))
		else if (tags.length < MAX_TAGS) setTags([...tags, t])
	}

	const topics = specialities.filter(
		(t) => !tagQuery.trim() || t.toLowerCase().includes(tagQuery.trim().toLowerCase())
	)

	return (
		<Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
			<KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.overlay}>
				<Pressable style={styles.scrim} onPress={onClose} accessibilityLabel="Close" />
				<View style={[styles.sheet, { height: posted ? 560 : '92%', maxHeight: '100%' }]}>
					<View style={styles.head}>
						<View style={styles.handle} />
						<View style={styles.headRow}>
							<View style={{ flex: 1, minWidth: 0 }}>
								<Text style={styles.sheetTitle}>
									{posted ? 'Question submitted' : 'Ask a doctor, free'}
								</Text>
								<Text style={styles.sheetSub}>Answered by verified doctors</Text>
							</View>
							<Pressable
								onPress={onClose}
								accessibilityRole="button"
								accessibilityLabel="Close"
								style={styles.closeBtn}
							>
								<AppPathIcon d={FEED_ICONS.close} size={22} strokeWidth={2} color={APP_COLORS.ink} />
							</Pressable>
						</View>
					</View>

					{!posted ? (
						<>
							<ScrollView
								style={styles.formScroll}
								contentContainerStyle={styles.form}
								keyboardShouldPersistTaps="handled"
								showsVerticalScrollIndicator={false}
							>
								<View style={styles.section}>
									<Text style={styles.label}>Who is this question for?</Text>
									<Pressable
										onPress={() => setWhoOpen(true)}
										accessibilityRole="button"
										style={[styles.select, { minHeight: 56, gap: 12 }]}
									>
										<PersonTile person={current} />
										<View style={{ flex: 1, minWidth: 0 }}>
											<Text style={styles.personLabel}>{current.label}</Text>
											<Text style={styles.personDetail} numberOfLines={1}>
												{current.detail}
											</Text>
										</View>
										<AppPathIcon
											d="M6 9l6 6 6-6"
											size={18}
											strokeWidth={2.2}
											color={APP_COLORS.inkMuted}
										/>
									</Pressable>
									{other && (
										<View style={styles.otherBox}>
											<View style={styles.ageCol}>
												<Text style={styles.miniLabel}>Age</Text>
												<TextInput
													value={age}
													onChangeText={(v) => setAge(v.replace(/[^0-9]/g, '').slice(0, 3))}
													keyboardType="number-pad"
													placeholder="Years"
													placeholderTextColor={APP_COLORS.inkMuted}
													style={[
														styles.ageInput,
														{ borderColor: err(age.trim() !== '') ? ERROR : FIELD_BORDER },
													]}
												/>
											</View>
											<View style={{ flex: 1, gap: 6 }}>
												<Text style={styles.miniLabel}>Gender</Text>
												<View
													style={[
														styles.genderTrack,
														{ borderColor: err(!!gender) ? ERROR : FIELD_BORDER },
													]}
												>
													{GENDERS.map((g) => {
														const on = gender === g
														return (
															<Pressable
																key={g}
																onPress={() => setGender(g)}
																accessibilityRole="radio"
																accessibilityState={{ checked: on }}
																style={[styles.genderBtn, on && styles.genderBtnOn]}
															>
																<Text
																	style={[
																		styles.genderText,
																		{ color: on ? '#FFFFFF' : APP_COLORS.ink },
																	]}
																>
																	{g}
																</Text>
															</Pressable>
														)
													})}
												</View>
											</View>
										</View>
									)}
								</View>

								<View style={styles.section}>
									<Text style={styles.label}>Tags</Text>
									<Pressable
										onPress={() => {
											setTagQuery('')
											setTagsOpen(true)
										}}
										accessibilityRole="button"
										style={[
											styles.select,
											{ minHeight: 52, gap: 8, borderColor: err(okTags) ? ERROR : FIELD_BORDER },
										]}
									>
										<View style={styles.tagPills}>
											{tags.length === 0 ? (
												<Text style={styles.placeholder}>Select tags</Text>
											) : (
												tags.map((t) => (
													<View key={t} style={styles.tagPill}>
														<Text style={styles.tagPillText}>{t}</Text>
													</View>
												))
											)}
										</View>
										<AppPathIcon
											d="M6 9l6 6 6-6"
											size={18}
											strokeWidth={2.2}
											color={APP_COLORS.inkMuted}
										/>
									</Pressable>
									<Text style={[styles.help, err(okTags) && styles.helpError]}>
										{err(okTags)
											? 'Pick at least 1 tag'
											: tags.length >= MAX_TAGS
												? '3 of 3 selected'
												: 'Up to 3, so the right doctors see your question'}
									</Text>
								</View>

								<View style={styles.section}>
									<Text style={styles.label}>Your question</Text>
									<TextInput
										value={title}
										onChangeText={setTitle}
										maxLength={120}
										placeholder="e.g. Is it safe to fast with type 2 diabetes?"
										placeholderTextColor="#7A8B8E"
										style={[
											styles.titleInput,
											{ borderColor: err(okTitle) ? ERROR : FIELD_BORDER },
										]}
									/>
									<View style={styles.helpRow}>
										<Text style={[styles.help, err(okTitle) && styles.helpError]}>
											{err(okTitle)
												? 'Please write at least 10 characters'
												: 'Keep it short and clear'}
										</Text>
										<Text style={styles.count}>{title.length}/120</Text>
									</View>
								</View>

								<View style={styles.section}>
									<Text style={styles.label}>Describe your concern</Text>
									<TextInput
										value={body}
										onChangeText={setBody}
										maxLength={1000}
										multiline
										textAlignVertical="top"
										placeholder="Include your symptoms, how long you’ve had them, and any medicines you take."
										placeholderTextColor="#7A8B8E"
										style={[styles.bodyInput, { borderColor: err(okBody) ? ERROR : FIELD_BORDER }]}
									/>
									<View style={styles.helpRow}>
										<Text style={[styles.help, err(okBody) && styles.helpError, { flex: 1 }]}>
											{err(okBody)
												? 'Please add a few more details (at least 20 characters)'
												: 'More details help doctors give a better answer'}
										</Text>
										<Text style={styles.count}>{body.length}/1000</Text>
									</View>
								</View>

								<View style={styles.disclaimer}>
									<AppPathIcon
										d={FEED_ICONS.info}
										size={16}
										strokeWidth={2}
										color={APP_COLORS.inkMuted}
									/>
									<Text style={styles.disclaimerText}>
										Answers are general advice, not a diagnosis. For an emergency, call 108.
									</Text>
								</View>
							</ScrollView>
							<View style={[styles.footer, { paddingBottom: Math.max(20, insets.bottom + 8) }]}>
								<Pressable
									onPress={submit}
									accessibilityRole="button"
									accessibilityState={{ disabled: !ready }}
									style={[styles.submit, { backgroundColor: ready ? APP_COLORS.primary : '#9DB9BA' }]}
								>
									{submitting ? (
										<ActivityIndicator color="#FFFFFF" />
									) : (
										<Text style={styles.submitText}>Submit question</Text>
									)}
								</Pressable>
							</View>
						</>
					) : (
						<>
							<ScrollView contentContainerStyle={styles.done} showsVerticalScrollIndicator={false}>
								<View style={styles.doneIcon}>
									<AppPathIcon d={FEED_ICONS.check} size={40} strokeWidth={2.6} color="#1E7A4E" />
								</View>
								<Text style={styles.doneTitle}>Question submitted</Text>
								<Text style={styles.doneText}>
									We’ll notify you when a doctor answers. Your question is visible to others without
									your name.
								</Text>
								<View style={styles.summary}>
									<View style={styles.summaryTop}>
										{posted.tags.map((t) => (
											<View
												key={t}
												style={[styles.topicPill, { backgroundColor: toneForTopic(t).bg }]}
											>
												<Text style={[styles.topicPillText, { color: toneForTopic(t).ink }]}>
													{t}
												</Text>
											</View>
										))}
										<Text style={styles.askedFor}>{posted.askedFor}</Text>
									</View>
									<Text style={styles.summaryTitle}>{posted.title}</Text>
									<View style={styles.waiting}>
										<View style={styles.waitingDot} />
										<Text style={styles.waitingText}>Waiting for a doctor’s answer</Text>
									</View>
								</View>
							</ScrollView>
							<View style={[styles.footer, { paddingBottom: Math.max(20, insets.bottom + 8), gap: 8 }]}>
								<Pressable
									onPress={() => {
										onClose()
										onViewQuestion?.(posted.id)
									}}
									accessibilityRole="button"
									style={styles.submit}
								>
									<Text style={styles.submitText}>View my question</Text>
								</Pressable>
								<Pressable onPress={onClose} accessibilityRole="button" style={styles.doneBtn}>
									<Text style={styles.doneBtnText}>Done</Text>
								</Pressable>
							</View>
						</>
					)}

					{whoOpen && (
						<View style={styles.subSheet}>
							<View style={styles.subHead}>
								<View style={styles.handle} />
								<View style={styles.subTitleRow}>
									<Pressable
										onPress={() => setWhoOpen(false)}
										accessibilityRole="button"
										accessibilityLabel="Back"
										style={styles.subBack}
									>
										<AppPathIcon
											d={FEED_ICONS.back}
											size={22}
											strokeWidth={2.2}
											color={APP_COLORS.ink}
										/>
									</Pressable>
									<Text style={styles.subTitle}>Who is this question for?</Text>
								</View>
							</View>
							<ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 4 }}>
								{people.map((p) => {
									const on = p.key === who
									return (
										<Pressable
											key={p.key}
											onPress={() => {
												setWho(p.key)
												setWhoOpen(false)
											}}
											accessibilityRole="radio"
											accessibilityState={{ checked: on }}
											style={styles.whoRow}
										>
											<PersonTile person={p} />
											<View style={{ flex: 1, minWidth: 0 }}>
												<Text style={styles.personLabel}>{p.label}</Text>
												<Text style={styles.personDetail} numberOfLines={1}>
													{p.detail}
												</Text>
											</View>
											<View
												style={[
													styles.ring,
													{ borderColor: on ? APP_COLORS.primary : '#9FB4B6' },
												]}
											>
												<View
													style={[
														styles.ringDot,
														{ backgroundColor: on ? APP_COLORS.primary : 'transparent' },
													]}
												/>
											</View>
										</Pressable>
									)
								})}
							</ScrollView>
						</View>
					)}

					{tagsOpen && (
						<View style={styles.subSheet}>
							<View style={[styles.subHead, { gap: 10 }]}>
								<View style={styles.handle} />
								<View style={styles.subTitleRow}>
									<Pressable
										onPress={() => setTagsOpen(false)}
										accessibilityRole="button"
										accessibilityLabel="Back"
										style={styles.subBack}
									>
										<AppPathIcon
											d={FEED_ICONS.back}
											size={22}
											strokeWidth={2.2}
											color={APP_COLORS.ink}
										/>
									</Pressable>
									<Text style={[styles.subTitle, { flex: 1 }]}>Select tags</Text>
									<Text style={styles.tagCount}>
										{tags.length}/{MAX_TAGS}
									</Text>
								</View>
								<View style={styles.tagSearch}>
									<AppPathIcon
										d={FEED_ICONS.search}
										size={18}
										strokeWidth={2.2}
										color={APP_COLORS.inkMuted}
									/>
									<TextInput
										value={tagQuery}
										onChangeText={setTagQuery}
										placeholder="Search speciality"
										placeholderTextColor={APP_COLORS.inkMuted}
										style={styles.tagSearchInput}
									/>
								</View>
							</View>
							<ScrollView
								contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 4 }}
								keyboardShouldPersistTaps="handled"
							>
								{topics.map((t) => {
									const on = tags.includes(t)
									const full = tags.length >= MAX_TAGS
									return (
										<Pressable
											key={t}
											onPress={() => toggleTag(t)}
											accessibilityRole="checkbox"
											accessibilityState={{ checked: on }}
											style={[styles.tagRow, { opacity: !on && full ? 0.4 : 1 }]}
										>
											<Text style={styles.tagRowText}>{t}</Text>
											<View
												style={[
													styles.box,
													{
														borderColor: on ? APP_COLORS.primary : '#9FB4B6',
														backgroundColor: on ? APP_COLORS.primary : '#FFFFFF',
													},
												]}
											>
												{on && (
													<AppPathIcon
														d={FEED_ICONS.check}
														size={13}
														strokeWidth={3}
														color="#FFFFFF"
													/>
												)}
											</View>
										</Pressable>
									)
								})}
								{specStatus === 'loading' && (
									<ActivityIndicator style={{ marginTop: 24 }} color={APP_COLORS.primary} />
								)}
								{specStatus === 'error' && (
									<Text style={styles.noMatch}>Couldn’t load tags. Close and try again.</Text>
								)}
								{specStatus === 'ready' && topics.length === 0 && (
									<Text style={styles.noMatch}>No matching tags</Text>
								)}
							</ScrollView>
							<View style={[styles.footer, { paddingBottom: Math.max(20, insets.bottom + 8) }]}>
								<Pressable
									onPress={() => setTagsOpen(false)}
									accessibilityRole="button"
									style={styles.submit}
								>
									<Text style={styles.submitText}>
										{tags.length ? `Done · ${tags.length} selected` : 'Done'}
									</Text>
								</Pressable>
							</View>
						</View>
					)}
				</View>
			</KeyboardAvoidingView>
		</Modal>
	)
}

function PersonTile({ person }: { person: Person }) {
	if (person.isAdd) {
		return (
			<View style={[styles.tile, { backgroundColor: APP_COLORS.mint }]}>
				<AppPathIcon d={FEED_ICONS.plus} size={18} strokeWidth={2.2} color={APP_COLORS.primary} />
			</View>
		)
	}
	return (
		<AppAvatar
			uri={buildS3Url(person.avatar ?? null)}
			name={person.initials}
			size={36}
			borderWidth={0}
			backgroundColor={person.key === SELF_MEMBER_KEY ? APP_COLORS.mint : '#ECE6FA'}
			initialsColor={person.key === SELF_MEMBER_KEY ? APP_COLORS.ink : '#6A4BB5'}
		/>
	)
}

const styles = StyleSheet.create({
	overlay: { flex: 1, justifyContent: 'flex-end' },
	scrim: { ...StyleSheet.absoluteFill, backgroundColor: '#12373E80' },
	sheet: {
		backgroundColor: '#FFFFFF',
		borderTopLeftRadius: 20,
		borderTopRightRadius: 20,
		overflow: 'hidden',
		shadowColor: APP_COLORS.ink,
		shadowOpacity: 0.16,
		shadowRadius: 24,
		shadowOffset: { width: 0, height: -8 },
		elevation: 12,
	},
	head: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
	handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 9999, backgroundColor: '#C9D6D7' },
	headRow: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 52 },
	sheetTitle: { fontSize: 19, lineHeight: 26, fontWeight: '800', color: APP_COLORS.ink },
	sheetSub: { fontSize: 13, lineHeight: 18, color: APP_COLORS.inkMuted },
	closeBtn: {
		width: 44,
		height: 44,
		marginRight: -10,
		borderRadius: 9999,
		alignItems: 'center',
		justifyContent: 'center',
	},
	formScroll: { flex: 1, borderTopWidth: 1, borderTopColor: '#E3EAEB' },
	form: { gap: 22, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 24 },
	section: { gap: 8 },
	label: { fontSize: 14, lineHeight: 20, fontWeight: '800', color: APP_COLORS.ink },
	select: {
		paddingVertical: 8,
		paddingHorizontal: 12,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: FIELD_BORDER,
		backgroundColor: '#FFFFFF',
		flexDirection: 'row',
		alignItems: 'center',
	},
	tile: { width: 36, height: 36, borderRadius: 9999, alignItems: 'center', justifyContent: 'center' },
	personLabel: { fontSize: 15, lineHeight: 20, fontWeight: '700', color: APP_COLORS.ink },
	personDetail: { fontSize: 12, lineHeight: 16, color: APP_COLORS.inkMuted },
	otherBox: {
		padding: 12,
		borderRadius: 12,
		backgroundColor: APP_COLORS.pageBg,
		flexDirection: 'row',
		gap: 10,
		alignItems: 'flex-end',
	},
	ageCol: { width: 92, gap: 6 },
	miniLabel: { fontSize: 12, fontWeight: '700', color: APP_COLORS.inkMuted },
	ageInput: {
		height: 44,
		paddingHorizontal: 12,
		borderRadius: 12,
		borderWidth: 1,
		backgroundColor: '#FFFFFF',
		fontSize: 15,
		color: APP_COLORS.ink,
	},
	genderTrack: {
		height: 44,
		padding: 3,
		borderRadius: 12,
		borderWidth: 1,
		backgroundColor: '#FFFFFF',
		flexDirection: 'row',
		gap: 3,
	},
	genderBtn: { flex: 1, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
	genderBtnOn: { backgroundColor: APP_COLORS.primary },
	genderText: { fontSize: 13, fontWeight: '700' },
	tagPills: { flex: 1, minWidth: 0, flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
	placeholder: { fontSize: 15, lineHeight: 20, color: '#7A8B8E' },
	tagPill: {
		height: 28,
		paddingHorizontal: 10,
		borderRadius: 8,
		backgroundColor: APP_COLORS.mint,
		alignItems: 'center',
		justifyContent: 'center',
	},
	tagPillText: { fontSize: 13, fontWeight: '700', color: APP_COLORS.ink },
	help: { fontSize: 12, lineHeight: 16, color: APP_COLORS.inkMuted },
	helpError: { color: ERROR, fontWeight: '700' },
	helpRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
	count: { fontSize: 12, lineHeight: 16, color: '#7A8B8E' },
	titleInput: {
		height: 52,
		paddingHorizontal: 14,
		borderRadius: 12,
		borderWidth: 1,
		backgroundColor: '#FFFFFF',
		fontSize: 15,
		color: APP_COLORS.ink,
	},
	bodyInput: {
		minHeight: 148,
		paddingHorizontal: 14,
		paddingVertical: 12,
		borderRadius: 12,
		borderWidth: 1,
		backgroundColor: '#FFFFFF',
		fontSize: 15,
		lineHeight: 22,
		color: APP_COLORS.ink,
	},
	disclaimer: { flexDirection: 'row', gap: 8 },
	disclaimerText: { flex: 1, fontSize: 12, lineHeight: 17, color: APP_COLORS.inkMuted },
	footer: {
		paddingHorizontal: 16,
		paddingTop: 12,
		backgroundColor: '#FFFFFF',
		borderTopWidth: 1,
		borderTopColor: APP_COLORS.divider,
	},
	submit: {
		height: 52,
		borderRadius: 12,
		backgroundColor: APP_COLORS.primary,
		alignItems: 'center',
		justifyContent: 'center',
	},
	submitText: { fontSize: 16, fontWeight: '800', color: '#FFFFFF' },
	doneBtn: {
		height: 48,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: '#9FC4C5',
		alignItems: 'center',
		justifyContent: 'center',
	},
	doneBtnText: { fontSize: 15, fontWeight: '700', color: APP_COLORS.primary },
	done: { alignItems: 'center', gap: 10, paddingHorizontal: 24, paddingTop: 20, paddingBottom: 16 },
	doneIcon: {
		width: 88,
		height: 88,
		borderRadius: 9999,
		backgroundColor: '#E6F4EC',
		alignItems: 'center',
		justifyContent: 'center',
	},
	doneTitle: { marginTop: 10, fontSize: 22, lineHeight: 28, fontWeight: '800', color: APP_COLORS.ink },
	doneText: { maxWidth: 300, textAlign: 'center', fontSize: 14, lineHeight: 21, color: APP_COLORS.inkMuted },
	summary: {
		alignSelf: 'stretch',
		marginTop: 14,
		padding: 14,
		borderRadius: 12,
		backgroundColor: APP_COLORS.pageBg,
		borderWidth: 1,
		borderColor: APP_COLORS.divider,
		gap: 6,
	},
	summaryTop: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
	topicPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
	topicPillText: { fontSize: 11, lineHeight: 16, fontWeight: '700' },
	askedFor: { fontSize: 12, lineHeight: 16, color: APP_COLORS.inkMuted },
	summaryTitle: { fontSize: 15, lineHeight: 21, fontWeight: '800', color: APP_COLORS.ink },
	waiting: { flexDirection: 'row', alignItems: 'center', gap: 6 },
	waitingDot: { width: 6, height: 6, borderRadius: 9999, backgroundColor: '#C98A1C' },
	waitingText: { fontSize: 12, lineHeight: 16, fontWeight: '700', color: '#8A5300' },
	subSheet: { ...StyleSheet.absoluteFill, backgroundColor: '#FFFFFF' },
	subHead: {
		paddingHorizontal: 16,
		paddingTop: 8,
		paddingBottom: 6,
		borderBottomWidth: 1,
		borderBottomColor: '#E3EAEB',
	},
	subTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 52 },
	subBack: {
		width: 44,
		height: 44,
		marginLeft: -10,
		borderRadius: 9999,
		alignItems: 'center',
		justifyContent: 'center',
	},
	subTitle: { fontSize: 18, lineHeight: 24, fontWeight: '800', color: APP_COLORS.ink },
	whoRow: {
		minHeight: 64,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		borderBottomWidth: 1,
		borderBottomColor: '#EEF2F2',
	},
	ring: { width: 22, height: 22, borderRadius: 9999, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
	ringDot: { width: 10, height: 10, borderRadius: 9999 },
	tagCount: { fontSize: 13, fontWeight: '700', color: APP_COLORS.inkMuted },
	tagSearch: {
		height: 44,
		paddingHorizontal: 12,
		borderRadius: 12,
		backgroundColor: APP_COLORS.pageBg,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
	},
	tagSearchInput: { flex: 1, minWidth: 0, height: 40, fontSize: 15, color: APP_COLORS.ink, padding: 0 },
	tagRow: {
		minHeight: 52,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		borderBottomWidth: 1,
		borderBottomColor: '#EEF2F2',
	},
	tagRowText: { flex: 1, fontSize: 15, fontWeight: '600', color: APP_COLORS.ink },
	box: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
	noMatch: { marginVertical: 24, textAlign: 'center', fontSize: 14, color: APP_COLORS.inkMuted },
})

export default AskQuestionSheet
