// src/features/health-feed/HealthReadsPage.tsx
//
// "Health reads" from the Health feeds design: dark search header with a saved-reads button, sticky
// Articles / Blogs tabs, topic chips, an "Editor's pick" card (articles, all topics), a "For you" strip
// picked from the patient's health profile, the list (cover or tone tile, tag, title, author · read time,
// bookmark), and a "Didn't find your answer? Ask a verified doctor" banner. Podcasts are not part of
// this feed. Data: GET /api/blogs?content_type=article|blog.

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { AppPathIcon } from '../../components/common'
import { APP_COLORS } from '../../config/theme'
import { ROUTES } from '../../navigation/routes'
import type { AppStackParamList } from '../../navigation/types'
import { getAllHealthReads, type HealthRead, type HealthReadType } from '../../services/homeService'
import { getPatientDetails } from '../profile/patient/PatientProfileService'
import { FeedHeader } from './FeedHeader'
import { FEED_ICONS, initialsOf, lookForRead } from './feedTheme'
import { useSavedReads } from './savedReads'

type Nav = NativeStackNavigationProp<AppStackParamList>
type FeedType = Extract<HealthReadType, 'article' | 'blog'>

const TABS: { key: FeedType; label: string }[] = [
	{ key: 'article', label: 'Articles' },
	{ key: 'blog', label: 'Blogs' },
]

// Chronic-condition words from the health profile -> what to look for in a read's category/title.
const CONDITION_PATTERNS: [RegExp, RegExp][] = [
	[/diabet|sugar/, /diabet|endocrin|sugar|thyroid/],
	[/hypertens|blood pressure|\bbp\b|heart|cardi/, /heart|cardio|\bbp\b|hypertens/],
	[/asthma|copd|lung|respirat/, /respirat|asthma|lung|breath/],
	[/thyroid/, /thyroid|endocrin/],
	[/pcos|pcod/, /pcos|women|gynae|hormon/],
]

const authorOf = (r: HealthRead) => r.author_name || (r as unknown as { author?: { name?: string } }).author?.name || ''
const tagOf = (r: HealthRead) => (r.tag || r.category || '').trim()

const metaOf = (r: HealthRead) =>
	[
		authorOf(r),
		r.content_type === 'blog' ? 'Blog' : '',
		r.read_time_minutes
			? r.content_type === 'blog'
				? `${r.read_time_minutes} min`
				: `${r.read_time_minutes} min read`
			: '',
	]
		.filter(Boolean)
		.join(' · ')

export default function HealthReadsPage() {
	const navigation = useNavigation<Nav>()
	const { saved, isSaved, toggle } = useSavedReads()

	const [tab, setTab] = useState<FeedType>('article')
	const [topic, setTopic] = useState('All')
	const [query, setQuery] = useState('')
	const [savedOnly, setSavedOnly] = useState(false)
	const [reads, setReads] = useState<Record<FeedType, HealthRead[]>>({ article: [], blog: [] })
	const [loading, setLoading] = useState(true)
	const [refreshing, setRefreshing] = useState(false)
	const [error, setError] = useState(false)
	const [conditions, setConditions] = useState<string[]>([])

	const load = useCallback(async () => {
		setError(false)
		try {
			const [articles, blogs] = await Promise.all([getAllHealthReads('article'), getAllHealthReads('blog')])
			setReads({ article: articles, blog: blogs })
		} catch {
			setError(true)
		} finally {
			setLoading(false)
		}
	}, [])

	useEffect(() => {
		let alive = true
		void load()
		const loadConditions = async () => {
			try {
				const res = await getPatientDetails()
				if (!alive) return
				const list = res?.data?.medical?.chronic_conditions ?? res?.data?.chronic_conditions
				if (Array.isArray(list)) setConditions(list.map((c: unknown) => String(c)).filter(Boolean))
			} catch {
				// The "for you" topics are optional: the reads list works without them.
			}
		}
		void loadConditions()
		return () => {
			alive = false
		}
	}, [load])

	const all = useMemo(() => [...reads.article, ...reads.blog], [reads])
	const current = reads[tab]
	const topics = useMemo(() => ['All', ...Array.from(new Set(current.map(tagOf).filter(Boolean)))], [current])
	useEffect(() => {
		if (!topics.includes(topic)) setTopic('All')
	}, [topics, topic])

	const q = query.trim().toLowerCase()
	const list = useMemo(() => {
		const base = savedOnly ? all.filter((r) => saved.includes(r.id)) : current
		return base.filter(
			(r) =>
				(savedOnly || topic === 'All' || tagOf(r) === topic) &&
				(!q || `${r.title} ${tagOf(r)} ${authorOf(r)}`.toLowerCase().includes(q))
		)
	}, [savedOnly, all, current, saved, topic, q])

	const featured =
		!savedOnly && tab === 'article' && topic === 'All' && !q ? reads.article.find((r) => r.is_featured) : undefined

	// "For you": reads that match a chronic condition on the patient's health profile.
	const forYou = useMemo(() => {
		if (savedOnly || topic !== 'All' || q) return { items: [] as HealthRead[], label: '' }
		const patterns = conditions.map((c) => ({
			c,
			re:
				CONDITION_PATTERNS.find(([cond]) => cond.test(c.toLowerCase()))?.[1] ??
				new RegExp(
					c
						.toLowerCase()
						.replace(/[^a-z ]/g, '')
						.trim() || '$^'
				),
		}))
		const matched = patterns.filter(({ re }) => all.some((r) => re.test(`${tagOf(r)} ${r.title}`.toLowerCase())))
		const items = all.filter((r) => matched.some(({ re }) => re.test(`${tagOf(r)} ${r.title}`.toLowerCase())))
		return { items, label: matched.map((m) => m.c).join(', ') }
	}, [conditions, all, savedOnly, topic, q])

	const open = (r: HealthRead) => r.slug && navigation.navigate(ROUTES.STACK.BLOG_ARTICLE, { slug: r.slug })
	const tabLabel = TABS.find((t) => t.key === tab)?.label ?? ''
	const listTitle = savedOnly
		? 'Saved reads'
		: topic === 'All'
			? `Latest ${tabLabel.toLowerCase()}`
			: `${tabLabel} · ${topic}`

	return (
		<View style={styles.screen}>
			<FeedHeader
				title="Health reads"
				solid
				subtitle="Written and reviewed by doctors"
				onBack={() => navigation.goBack()}
				action={{
					icon: FEED_ICONS.bookmark,
					label: `Saved reads, ${saved.length}`,
					onPress: () => setSavedOnly((v) => !v),
					active: savedOnly,
				}}
				search={{
					value: query,
					onChange: setQuery,
					context: 'healthReads',
				}}
			/>

			<ScrollView
				refreshControl={
					<RefreshControl
						refreshing={refreshing}
						onRefresh={async () => {
							setRefreshing(true)
							await load()
							setRefreshing(false)
						}}
						tintColor={APP_COLORS.primary}
					/>
				}
				stickyHeaderIndices={[0]}
				contentContainerStyle={styles.content}
				showsVerticalScrollIndicator={false}
			>
				{/* Sticky children lose their own style, so the row styling lives on an inner view. */}
				<View>
					<View style={styles.tabs} accessibilityRole="tablist" accessibilityLabel="Content type">
						{TABS.map((t) => {
							const on = !savedOnly && t.key === tab
							return (
								<Pressable
									key={t.key}
									accessibilityRole="tab"
									accessibilityState={{ selected: on }}
									onPress={() => {
										setSavedOnly(false)
										setTab(t.key)
										setTopic('All')
									}}
									style={styles.tab}
								>
									<Text
										numberOfLines={1}
										ellipsizeMode="clip"
										style={[
											styles.tabText,
											{
												color: on ? APP_COLORS.primary : APP_COLORS.inkMuted,
												fontWeight: on ? '800' : '600',
											},
										]}
									>
										{t.label}
									</Text>
									<View
										style={[
											styles.tabBar,
											{ backgroundColor: on ? APP_COLORS.primary : 'transparent' },
										]}
									/>
								</Pressable>
							)
						})}
					</View>
				</View>

				<View style={styles.body}>
					{!savedOnly && (
						<ScrollView
							horizontal
							showsHorizontalScrollIndicator={false}
							contentContainerStyle={styles.chips}
							accessibilityRole="radiogroup"
						>
							{topics.map((c) => {
								const on = c === topic
								return (
									<Pressable
										key={c}
										accessibilityState={{ selected: on }}
										onPress={() => setTopic(c)}
										style={[styles.chip, on && styles.chipOn]}
									>
										<Text
											numberOfLines={1}
											style={[styles.chipText, { color: on ? '#FFFFFF' : APP_COLORS.ink }]}
										>
											{c}
										</Text>
									</Pressable>
								)
							})}
						</ScrollView>
					)}

					{loading ? (
						<ActivityIndicator style={{ marginTop: 32 }} color={APP_COLORS.primary} />
					) : error && all.length === 0 ? (
						<Pressable onPress={() => void load()} accessibilityRole="button" style={styles.errorBox}>
							<Text style={styles.empty}>Couldn’t load reads. Tap to try again.</Text>
						</Pressable>
					) : (
						<>
							{!!featured && <FeaturedCard read={featured} onPress={() => open(featured)} />}

							{forYou.items.length > 0 && (
								<View style={styles.forYou}>
									<View style={styles.sectionHead}>
										<Text numberOfLines={1} style={styles.h2}>
											For you
										</Text>
										<Text numberOfLines={1} style={styles.sub}>
											Picked from your health profile · {forYou.label}
										</Text>
									</View>
									<ScrollView
										horizontal
										showsHorizontalScrollIndicator={false}
										contentContainerStyle={styles.forYouRow}
									>
										{forYou.items.map((r) => {
											const look = lookForRead(r.category, r.tag, r.title)
											return (
												<Pressable
													key={r.id}
													onPress={() => open(r)}
													style={({ pressed }) => [
														styles.forYouCard,
														pressed && styles.pressed,
													]}
												>
													<View style={[styles.forYouArt, { backgroundColor: look.tone.bg }]}>
														<AppPathIcon
															d={look.icon}
															size={30}
															strokeWidth={1.8}
															color={look.tone.ink}
														/>
													</View>
													<Text
														numberOfLines={1}
														style={[styles.tag, { color: look.tone.ink }]}
													>
														{tagOf(r).toUpperCase()}
													</Text>
													<Text style={styles.forYouTitle}>{r.title}</Text>
													<Text numberOfLines={1} style={styles.meta}>
														{metaOf(r)}
													</Text>
												</Pressable>
											)
										})}
									</ScrollView>
								</View>
							)}

							<View style={styles.listSection}>
								<View style={styles.listHead}>
									<Text numberOfLines={1} style={styles.h2}>
										{listTitle}
									</Text>
									<Text numberOfLines={1} style={styles.count}>
										{list.length} {list.length === 1 ? 'item' : 'items'}
									</Text>
								</View>
								{list.map((r, i) => {
									const look = lookForRead(r.category, r.tag, r.title)
									const on = isSaved(r.id)
									return (
										<View key={r.id} style={[styles.row, i < list.length - 1 && styles.rowRule]}>
											<Pressable onPress={() => open(r)} style={styles.rowMain}>
												<View style={[styles.rowArt, { backgroundColor: look.tone.bg }]}>
													{r.image_url ? (
														<Image source={{ uri: r.image_url }} style={styles.rowImage} />
													) : (
														<AppPathIcon
															d={look.icon}
															size={28}
															strokeWidth={1.8}
															color={look.tone.ink}
														/>
													)}
												</View>
												<View style={styles.rowText}>
													<Text
														numberOfLines={1}
														style={[styles.tag, { color: look.tone.ink }]}
													>
														{tagOf(r).toUpperCase()}
													</Text>
													<Text style={styles.rowTitle}>{r.title}</Text>
													<Text numberOfLines={1} style={styles.meta}>
														{metaOf(r)}
													</Text>
												</View>
											</Pressable>
											<Pressable
												onPress={() => toggle(r.id)}
												accessibilityRole="button"
												accessibilityState={{ selected: on }}
												accessibilityLabel={`${on ? 'Remove from saved' : 'Save'}: ${r.title}`}
												style={styles.saveBtn}
											>
												<AppPathIcon
													d={FEED_ICONS.bookmark}
													size={20}
													strokeWidth={2}
													color={APP_COLORS.primary}
													fill={on ? APP_COLORS.primary : 'none'}
												/>
											</Pressable>
										</View>
									)
								})}
								{list.length === 0 && (
									<Text style={styles.empty}>
										{savedOnly
											? 'You haven’t saved anything yet. Tap the bookmark on a read to keep it here.'
											: 'Nothing here yet for this topic. Try another one.'}
									</Text>
								)}
							</View>

							<Pressable
								onPress={() => navigation.navigate(ROUTES.STACK.PATIENT_QUESTIONS_LIST)}
								style={({ pressed }) => [styles.askBanner, pressed && styles.pressed]}
							>
								<View style={styles.askIcon}>
									<AppPathIcon
										d={FEED_ICONS.question}
										size={22}
										strokeWidth={2}
										color={APP_COLORS.primary}
									/>
								</View>
								<View style={{ flex: 1 }}>
									<Text style={styles.askTitle}>Didn’t find your answer?</Text>
									<Text style={styles.askSub}>Ask a verified doctor, free</Text>
								</View>
								<AppPathIcon
									d={FEED_ICONS.chevronRight}
									size={18}
									strokeWidth={2.4}
									color={APP_COLORS.primary}
								/>
							</Pressable>
						</>
					)}
				</View>
			</ScrollView>
		</View>
	)
}

function FeaturedCard({ read, onPress }: { read: HealthRead; onPress: () => void }) {
	const look = lookForRead(read.category, read.tag, read.title)
	const author = authorOf(read)
	return (
		<Pressable onPress={onPress} style={({ pressed }) => [styles.featured, pressed && styles.pressed]}>
			<View pointerEvents="none" style={styles.featuredBlob} />
			<View style={styles.featuredIcon}>
				<AppPathIcon d={look.icon} size={30} strokeWidth={1.8} color={APP_COLORS.ink} />
			</View>
			<View style={styles.pick}>
				<Text style={styles.pickText}>EDITOR’S PICK</Text>
			</View>
			<Text style={styles.featuredTitle}>{read.title}</Text>
			<View style={styles.featuredMeta}>
				<View style={styles.featuredAvatar}>
					<Text style={styles.featuredAvatarText}>{initialsOf(author)}</Text>
				</View>
				<Text numberOfLines={1} style={styles.featuredMetaText}>
					{[author, read.read_time_minutes ? `${read.read_time_minutes} min read` : '']
						.filter(Boolean)
						.join(' · ')}
				</Text>
			</View>
			<View style={styles.readNow}>
				<Text style={styles.readNowText}>Read now</Text>
				<AppPathIcon d={FEED_ICONS.chevronRight} size={14} strokeWidth={2.6} color={APP_COLORS.ink} />
			</View>
		</Pressable>
	)
}

const styles = StyleSheet.create({
	screen: { flex: 1, backgroundColor: APP_COLORS.pageBg },
	content: { paddingTop: 8, paddingBottom: 32 },
	tabs: {
		flexDirection: 'row',
		paddingHorizontal: 16,
		backgroundColor: APP_COLORS.pageBg,
		borderBottomWidth: 1,
		borderBottomColor: APP_COLORS.divider,
	},
	tab: { flex: 1, minWidth: 0, height: 48, alignItems: 'center', justifyContent: 'center' },
	tabText: { fontSize: 14, flexShrink: 0 },
	tabBar: {
		position: 'absolute',
		left: 14,
		right: 14,
		bottom: -1,
		height: 3,
		borderTopLeftRadius: 3,
		borderTopRightRadius: 3,
	},
	body: { gap: 18, paddingTop: 18 },
	errorBox: { paddingVertical: 32 },
	chips: { gap: 8, paddingHorizontal: 16 },
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
	chipOn: { backgroundColor: APP_COLORS.ink, borderColor: APP_COLORS.ink },
	chipText: { fontSize: 13, fontWeight: '700' },
	pressed: { opacity: 0.92 },

	featured: {
		marginHorizontal: 16,
		padding: 16,
		borderRadius: 14,
		overflow: 'hidden',
		backgroundColor: APP_COLORS.ink,
		gap: 8,
	},
	featuredBlob: {
		position: 'absolute',
		right: -50,
		top: -50,
		width: 170,
		height: 170,
		borderRadius: 9999,
		backgroundColor: APP_COLORS.primary,
	},
	featuredIcon: {
		position: 'absolute',
		right: 18,
		top: 18,
		width: 64,
		height: 64,
		borderRadius: 9999,
		backgroundColor: APP_COLORS.mintAccent,
		alignItems: 'center',
		justifyContent: 'center',
	},
	pick: {
		alignSelf: 'flex-start',
		paddingHorizontal: 6,
		paddingVertical: 1,
		borderRadius: 4,
		backgroundColor: '#C2410C',
	},
	pickText: { fontSize: 10, lineHeight: 14, fontWeight: '800', letterSpacing: 0.4, color: '#FFFFFF' },
	featuredTitle: { maxWidth: 240, fontSize: 19, lineHeight: 25, fontWeight: '800', color: '#FFFFFF' },
	featuredMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
	featuredAvatar: {
		width: 24,
		height: 24,
		borderRadius: 9999,
		backgroundColor: APP_COLORS.mint,
		alignItems: 'center',
		justifyContent: 'center',
	},
	featuredAvatarText: { fontSize: 10, fontWeight: '800', color: APP_COLORS.primary },
	featuredMetaText: { flexShrink: 1, fontSize: 12, lineHeight: 16, color: APP_COLORS.mintAccent },
	readNow: {
		alignSelf: 'flex-start',
		marginTop: 4,
		height: 32,
		paddingHorizontal: 12,
		borderRadius: 8,
		backgroundColor: '#FFFFFF',
		flexDirection: 'row',
		alignItems: 'center',
		gap: 2,
	},
	readNowText: { fontSize: 13, fontWeight: '700', color: APP_COLORS.ink },

	forYou: { gap: 10 },
	sectionHead: { paddingHorizontal: 16 },
	h2: { flexShrink: 1, fontSize: 18, lineHeight: 26, fontWeight: '700', color: APP_COLORS.ink },
	sub: { fontSize: 12, lineHeight: 16, color: APP_COLORS.inkMuted },
	forYouRow: { gap: 10, paddingHorizontal: 16 },
	forYouCard: {
		width: 200,
		padding: 12,
		borderRadius: 12,
		backgroundColor: '#FFFFFF',
		borderWidth: 1,
		borderColor: APP_COLORS.divider,
		gap: 8,
	},
	forYouArt: { width: '100%', height: 84, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
	forYouTitle: { fontSize: 14, lineHeight: 19, fontWeight: '700', color: APP_COLORS.ink },
	tag: { fontSize: 11, lineHeight: 14, fontWeight: '700', letterSpacing: 0.4 },
	meta: { fontSize: 12, lineHeight: 16, color: APP_COLORS.inkMuted },

	listSection: { backgroundColor: '#FFFFFF', padding: 16 },
	listHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 },
	count: { flexShrink: 0, fontSize: 12, lineHeight: 16, fontWeight: '700', color: APP_COLORS.inkMuted },
	row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
	rowRule: { borderBottomWidth: 1, borderBottomColor: APP_COLORS.divider },
	rowMain: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 12 },
	rowArt: {
		width: 72,
		height: 72,
		borderRadius: 14,
		overflow: 'hidden',
		alignItems: 'center',
		justifyContent: 'center',
	},
	rowImage: { width: '100%', height: '100%' },
	rowText: { flex: 1, minWidth: 0, gap: 2 },
	rowTitle: { fontSize: 15, lineHeight: 20, fontWeight: '700', color: APP_COLORS.ink },
	saveBtn: {
		width: 44,
		height: 44,
		marginRight: -10,
		borderRadius: 10,
		alignItems: 'center',
		justifyContent: 'center',
	},
	empty: { marginTop: 12, fontSize: 14, lineHeight: 20, color: APP_COLORS.inkMuted },

	askBanner: {
		marginHorizontal: 16,
		padding: 14,
		borderRadius: 12,
		backgroundColor: APP_COLORS.mint,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
	},
	askIcon: {
		width: 44,
		height: 44,
		borderRadius: 12,
		backgroundColor: '#FFFFFF',
		alignItems: 'center',
		justifyContent: 'center',
	},
	askTitle: { fontSize: 15, lineHeight: 20, fontWeight: '800', color: APP_COLORS.ink },
	askSub: { fontSize: 13, lineHeight: 18, color: APP_COLORS.inkMuted },
})
