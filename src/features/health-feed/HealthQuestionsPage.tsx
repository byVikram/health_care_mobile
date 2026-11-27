// src/features/health-feed/HealthQuestionsPage.tsx
//
// "Health questions" from the Health feeds design: ink search header, topic chips, a count + sort row,
// question cards (topic pill, who asked, 2-line preview, answered / waiting status), an empty state and a
// fixed "Ask a free question" button that opens the ask sheet. Data: GET /api/qa/questions.

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
	ActivityIndicator,
	FlatList,
	Pressable,
	RefreshControl,
	ScrollView,
	StyleSheet,
	Text,
	View,
} from 'react-native'
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { AppPathIcon } from '../../components/common'
import { APP_COLORS } from '../../config/theme'
import { ROUTES } from '../../navigation/routes'
import type { AppStackParamList } from '../../navigation/types'
import { listHealthQuestions, type PatientQuestion } from '../../services/qaService'
import { AskQuestionSheet } from './AskQuestionSheet'
import { FeedHeader } from './FeedHeader'
import { MyQuestionsLink } from './MyQuestionsLink'
import { QuestionCard } from './QuestionCard'
import { FEED_ICONS, askerLine, splitTags } from './feedTheme'

export { askerLine }

type Nav = NativeStackNavigationProp<AppStackParamList>
type SortKey = 'new' | 'answers'

const PAGE_SIZE = 50 // the API's maximum page size
const MAX_PAGES = 4

export default function HealthQuestionsPage() {
	const navigation = useNavigation<Nav>()
	const route = useRoute<RouteProp<AppStackParamList, typeof ROUTES.STACK.PATIENT_QUESTIONS_LIST>>()
	const insets = useSafeAreaInsets()

	const [questions, setQuestions] = useState<PatientQuestion[]>([])
	const [loading, setLoading] = useState(true)
	const [refreshing, setRefreshing] = useState(false)
	const [query, setQuery] = useState('')
	const [topic, setTopic] = useState('All')
	const [sort, setSort] = useState<SortKey>('new')
	const [error, setError] = useState(false)
	const [askOpen, setAskOpen] = useState(!!route.params?.openAskModal)

	const load = useCallback(async () => {
		setError(false)
		try {
			const rows: PatientQuestion[] = []
			for (let page = 1; page <= MAX_PAGES; page++) {
				const res = await listHealthQuestions(undefined, page, PAGE_SIZE)
				if (!res.success) throw new Error('questions failed')
				rows.push(...res.data)
				if (page >= (res.meta?.pages ?? 1)) break
			}
			setQuestions(rows)
		} catch {
			setError(true)
		}
	}, [])

	useEffect(() => {
		load().finally(() => setLoading(false))
	}, [load])

	const onRefresh = async () => {
		setRefreshing(true)
		await load()
		setRefreshing(false)
	}

	const topics = useMemo(() => {
		const seen = new Set<string>()
		questions.forEach((q) => splitTags(q.tag).forEach((t) => seen.add(t)))
		return ['All', ...Array.from(seen).sort()]
	}, [questions])

	const shown = useMemo(() => {
		const q = query.trim().toLowerCase()
		const rows = questions.filter((item) => {
			if (topic !== 'All' && !splitTags(item.tag).includes(topic)) return false
			if (!q) return true
			return `${item.question} ${item.short_description} ${item.tag}`.toLowerCase().includes(q)
		})
		return rows.sort((a, b) =>
			sort === 'answers'
				? b.answers.length - a.answers.length || b.created_at.localeCompare(a.created_at)
				: b.created_at.localeCompare(a.created_at)
		)
	}, [questions, query, topic, sort])

	const openThread = (q: PatientQuestion) =>
		navigation.navigate(ROUTES.STACK.PATIENT_QUESTION_DETAIL, { questionId: q.id, question: q })

	return (
		<View style={styles.page}>
			<FeedHeader
				title="Health questions"
				subtitle="Answered by verified doctors"
				onBack={() => (navigation.canGoBack() ? navigation.goBack() : undefined)}
				search={{
					value: query,
					onChange: setQuery,
					context: 'healthQuestionsFeed',
				}}
				paddingBottom={14}
			/>

			{loading ? (
				<ActivityIndicator style={{ marginTop: 40 }} color={APP_COLORS.primary} />
			) : (
				<FlatList
					data={shown}
					keyExtractor={(q) => q.id}
					refreshControl={
						<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={APP_COLORS.primary} />
					}
					contentContainerStyle={{ paddingBottom: 96 + insets.bottom }}
					showsVerticalScrollIndicator={false}
					ListHeaderComponent={
						<View>
							<View style={styles.myQuestions}>
								<MyQuestionsLink
									onPress={() => navigation.navigate(ROUTES.STACK.PATIENT_MY_QUESTIONS)}
								/>
							</View>
							<ScrollView
								horizontal
								showsHorizontalScrollIndicator={false}
								contentContainerStyle={styles.chips}
								accessibilityRole="radiogroup"
							>
								{topics.map((t) => {
									const on = t === topic
									return (
										<Pressable
											key={t}
											accessibilityRole="radio"
											accessibilityState={{ selected: on }}
											onPress={() => setTopic(t)}
											style={[styles.chip, on && styles.chipOn]}
										>
											<Text
												numberOfLines={1}
												style={[styles.chipText, { color: on ? '#FFFFFF' : APP_COLORS.ink }]}
											>
												{t}
											</Text>
										</Pressable>
									)
								})}
							</ScrollView>
							<View style={styles.countRow}>
								<Text style={styles.count}>
									{shown.length} {shown.length === 1 ? 'question' : 'questions'}
								</Text>
								<Pressable
									onPress={() => setSort(sort === 'new' ? 'answers' : 'new')}
									accessibilityRole="button"
									accessibilityLabel={`Sort by, ${sort === 'new' ? 'Newest' : 'Most answered'}`}
									style={styles.sort}
								>
									<Text style={styles.sortText}>{sort === 'new' ? 'Newest' : 'Most answered'}</Text>
									<AppPathIcon d="M6 9l6 6 6-6" size={16} strokeWidth={2.2} color={APP_COLORS.ink} />
								</Pressable>
							</View>
						</View>
					}
					ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
					renderItem={({ item }) => <QuestionCard q={item} onPress={() => openThread(item)} />}
					ListEmptyComponent={
						error ? (
							<View style={styles.empty}>
								<Text style={styles.emptyTitle}>Couldn’t load questions</Text>
								<Text style={styles.emptyText}>Check your connection and pull down to try again.</Text>
							</View>
						) : (
							<View style={styles.empty}>
								<Text style={styles.emptyTitle}>No questions found</Text>
								<Text style={styles.emptyText}>Try another word, or ask your own question.</Text>
							</View>
						)
					}
				/>
			)}

			<View pointerEvents="box-none" style={[styles.fabWrap, { bottom: Math.max(16, insets.bottom + 8) }]}>
				<Pressable onPress={() => setAskOpen(true)} accessibilityRole="button" style={styles.fab}>
					<AppPathIcon d={FEED_ICONS.plus} size={20} strokeWidth={2.4} color="#FFFFFF" />
					<Text style={styles.fabText}>Ask a free question</Text>
				</Pressable>
			</View>

			<AskQuestionSheet
				visible={askOpen}
				onClose={() => setAskOpen(false)}
				onPosted={() => void load()}
				onViewQuestion={(id) => navigation.navigate(ROUTES.STACK.PATIENT_QUESTION_DETAIL, { questionId: id })}
			/>
		</View>
	)
}

const styles = StyleSheet.create({
	page: { flex: 1, backgroundColor: APP_COLORS.pageBg },
	myQuestions: { paddingHorizontal: 16, paddingTop: 14 },
	chips: { gap: 8, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
	chip: {
		height: 36,
		paddingHorizontal: 14,
		borderRadius: 9999,
		borderWidth: 1,
		borderColor: APP_COLORS.divider,
		backgroundColor: '#FFFFFF',
		alignItems: 'center',
		justifyContent: 'center',
	},
	chipOn: { backgroundColor: APP_COLORS.primary, borderColor: APP_COLORS.primary },
	chipText: { fontSize: 13, fontWeight: '700' },
	countRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 16,
		paddingTop: 12,
		paddingBottom: 10,
	},
	count: { fontSize: 13, lineHeight: 18, fontWeight: '700', color: APP_COLORS.inkMuted },
	sort: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
		height: 32,
		paddingLeft: 12,
		paddingRight: 8,
		borderRadius: 9999,
		borderWidth: 1,
		borderColor: APP_COLORS.divider,
		backgroundColor: '#FFFFFF',
	},
	sortText: { fontSize: 13, fontWeight: '700', color: APP_COLORS.ink },
	empty: { alignItems: 'center', paddingHorizontal: 32, paddingVertical: 48, gap: 4 },
	emptyTitle: { fontSize: 16, lineHeight: 22, fontWeight: '800', color: APP_COLORS.ink },
	emptyText: { fontSize: 13, lineHeight: 19, textAlign: 'center', color: APP_COLORS.inkMuted },
	fabWrap: { position: 'absolute', left: 16, right: 16 },
	fab: {
		height: 52,
		borderRadius: 12,
		backgroundColor: APP_COLORS.primary,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 8,
		shadowColor: APP_COLORS.ink,
		shadowOpacity: 0.25,
		shadowRadius: 12,
		shadowOffset: { width: 0, height: 6 },
		elevation: 6,
	},
	fabText: { fontSize: 16, fontWeight: '800', color: '#FFFFFF' },
})
