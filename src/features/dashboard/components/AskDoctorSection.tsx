// src/features/dashboard/components/AskDoctorSection.tsx
//
// Patient Home "Ask a doctor, free" ("1 · Home"): bordered card with a mint icon header, a question
// search field (debounced) and the first three answered health questions ("Asked for Female, 30 yrs",
// title, excerpt, "N doctors answered"), then "Ask a free question". Navigation matches the previous
// PatientHealthQuestionsList: a question opens its detail, the button opens the list with the ask modal.
import React, { useEffect, useState } from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'

import { AppIconTile, AppInput, AppPathIcon, AppSkeleton, AppTag } from '../../../components/common'
import { APP_COLORS, toneForString } from '../../../config/theme'
import { ROUTES } from '../../../navigation/routes'
import type { AppNavigationParamList } from '../../../navigation/types'
import { listHealthQuestions, type PatientQuestion } from '../../../services/qaService'
import { HOME_ICONS } from '../homeTheme'

type NavigationProp = NativeStackNavigationProp<AppNavigationParamList>

type Props = {
	itemLimit?: number
	refreshToken?: number
}

const askedFor = (q: PatientQuestion) => {
	const who = q.gender ? q.gender.charAt(0).toUpperCase() + q.gender.slice(1) : 'Patient'
	const age = q.age ? `, ${String(q.age).replace(/\s*yrs?$/i, '')} yrs` : ''
	return `Asked for ${who}${age}`
}

function AskDoctorSection({ itemLimit = 3, refreshToken }: Props) {
	const navigation = useNavigation<NavigationProp>()
	const [search, setSearch] = useState('')
	const [query, setQuery] = useState('')
	const [questions, setQuestions] = useState<PatientQuestion[]>([])
	const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')

	// Debounce typing so every keystroke doesn't hit the API.
	useEffect(() => {
		const t = setTimeout(() => setQuery(search.trim()), 300)
		return () => clearTimeout(t)
	}, [search])

	useEffect(() => {
		let active = true
		const load = async () => {
			setStatus('loading')
			try {
				const res = await listHealthQuestions(query, 1, itemLimit)
				if (!active) return
				if (res.success && Array.isArray(res.data)) {
					setQuestions(res.data.slice(0, itemLimit))
					setStatus('ready')
				} else {
					setStatus('error')
				}
			} catch {
				if (active) setStatus('error')
			}
		}
		void load()
		return () => {
			active = false
		}
	}, [query, itemLimit, refreshToken])

	return (
		<View style={styles.card} accessibilityLabel="Ask a doctor, free">
			<View style={styles.header}>
				<AppIconTile size={44} radius={14} tone="mint">
					<AppPathIcon d={HOME_ICONS.chatQuestion} size={22} strokeWidth={2} color={APP_COLORS.primary} />
				</AppIconTile>
				<View style={styles.headerText}>
					<Text style={styles.title} accessibilityRole="header">
						Ask a doctor, free
					</Text>
					<Text style={styles.subtitle}>Verified doctors answer health questions</Text>
				</View>
			</View>

			<AppInput
				isSearch
				value={search}
				onChangeText={setSearch}
				placeholder="Search questions or symptoms"
				placeholderTextColor={APP_COLORS.inkMuted}
				accessibilityLabel="Search questions"
				autoCorrect={false}
				returnKeyType="search"
				noMargin
				containerStyle={styles.searchContainer}
				style={styles.searchInput}
				contentStyle={styles.searchContent}
				outlineStyle={styles.searchOutline}
				outlineColor={APP_COLORS.border}
				activeOutlineColor={APP_COLORS.primary}
				textColor={APP_COLORS.ink}
			/>

			{status === 'loading' &&
				Array.from({ length: itemLimit }, (_, i) => (
					<View key={i} style={[styles.item, i < itemLimit - 1 && styles.itemRule]}>
						<AppSkeleton width="45%" height={12} color={APP_COLORS.divider} />
						<AppSkeleton width="85%" height={15} color={APP_COLORS.divider} />
						<AppSkeleton width="100%" height={12} color={APP_COLORS.divider} />
					</View>
				))}

			{status === 'error' && <Text style={styles.stateText}>Questions are unavailable right now.</Text>}

			{status === 'ready' && questions.length === 0 && (
				<Text style={styles.stateText}>{query ? 'No questions match your search.' : 'No questions yet.'}</Text>
			)}

			{status === 'ready' &&
				questions.map((q, i) => {
					const tag = q.tag || 'General'
					const pair = toneForString(tag)
					const answers = q.answers?.length ?? 0
					return (
						<TouchableOpacity
							key={q.id}
							style={[styles.item, i < questions.length - 1 && styles.itemRule]}
							activeOpacity={0.8}
							onPress={() =>
								navigation.navigate(ROUTES.STACK.PATIENT_QUESTION_DETAIL, { questionId: String(q.id) })
							}
							accessibilityRole="button"
							accessibilityLabel={`${tag}. ${q.question}. ${answers} ${answers === 1 ? 'doctor' : 'doctors'} answered`}
						>
							<View style={styles.metaRow}>
								<AppTag label={tag} bg={pair.bg} ink={pair.ink} textStyle={styles.tagText} />
								<Text style={styles.askedFor} numberOfLines={1}>
									{askedFor(q)}
								</Text>
							</View>
							<Text style={styles.question} numberOfLines={2}>
								{q.question}
							</Text>
							{!!(q.short_description || q.full_description) && (
								<Text style={styles.excerpt} numberOfLines={2}>
									{q.short_description || q.full_description}
								</Text>
							)}
							{answers > 0 && (
								<View style={styles.answered}>
									<AppPathIcon d={HOME_ICONS.check} size={14} strokeWidth={2.6} color={APP_COLORS.success} />
									<Text style={styles.answeredText}>
										{`${answers} ${answers === 1 ? 'doctor' : 'doctors'} answered`}
									</Text>
								</View>
							)}
						</TouchableOpacity>
					)
				})}

			<TouchableOpacity
				style={styles.askButton}
				activeOpacity={0.85}
				onPress={() => navigation.navigate(ROUTES.STACK.PATIENT_QUESTIONS_LIST, { openAskModal: true })}
				accessibilityRole="button"
				accessibilityLabel="Ask a free question"
			>
				<AppPathIcon d={HOME_ICONS.plus} size={18} strokeWidth={2.4} color={APP_COLORS.surface} />
				<Text style={styles.askButtonText}>Ask a free question</Text>
			</TouchableOpacity>
		</View>
	)
}

export default React.memo(AskDoctorSection)

const styles = StyleSheet.create({
	card: {
		marginHorizontal: 16,
		padding: 16,
		borderRadius: 12,
		backgroundColor: APP_COLORS.surface,
		borderWidth: 1,
		borderColor: APP_COLORS.divider,
		gap: 4,
	},
	header: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		gap: 12,
	},
	headerText: {
		flex: 1,
		minWidth: 0,
	},
	title: {
		fontSize: 18,
		lineHeight: 24,
		fontWeight: '700',
		color: APP_COLORS.ink,
	},
	subtitle: {
		fontSize: 13,
		lineHeight: 18,
		color: APP_COLORS.inkMuted,
	},
	searchContainer: {
		marginTop: 10,
	},
	searchInput: {
		backgroundColor: APP_COLORS.surface,
		height: 44,
	},
	searchContent: {
		height: 44,
		minHeight: 44,
		paddingVertical: 0,
		fontSize: 15,
	},
	searchOutline: {
		borderRadius: 12,
		borderWidth: 1,
	},
	item: {
		gap: 4,
		paddingVertical: 12,
	},
	itemRule: {
		borderBottomWidth: 1,
		borderBottomColor: APP_COLORS.divider,
	},
	metaRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
	},
	tagText: {
		fontSize: 11,
		lineHeight: 16,
	},
	askedFor: {
		flexShrink: 1,
		fontSize: 12,
		lineHeight: 16,
		color: APP_COLORS.inkMuted,
	},
	question: {
		fontSize: 15,
		lineHeight: 20,
		fontWeight: '700',
		color: APP_COLORS.ink,
	},
	excerpt: {
		fontSize: 13,
		lineHeight: 18,
		color: APP_COLORS.inkMuted,
	},
	answered: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
	},
	answeredText: {
		fontSize: 12,
		lineHeight: 16,
		fontWeight: '700',
		color: APP_COLORS.success,
	},
	stateText: {
		paddingVertical: 16,
		fontSize: 13,
		lineHeight: 18,
		color: APP_COLORS.inkMuted,
		textAlign: 'center',
	},
	askButton: {
		marginTop: 8,
		height: 48,
		borderRadius: 12,
		backgroundColor: APP_COLORS.primary,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 6,
	},
	askButtonText: {
		fontSize: 15,
		fontWeight: '700',
		color: APP_COLORS.surface,
	},
})
