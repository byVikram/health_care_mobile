// src/features/health-feed/ReadArticlePage.tsx
//
// Article / blog reader from the Health feeds design: white top bar (the title fades in once you scroll),
// bookmark + share, a reading-progress line, a tone-and-icon hero (or the cover image), tag, headline,
// author row, the body, a "general information" note, a "Was this helpful?" card, a book-a-doctor card
// and "Keep reading". Data: GET /api/blogs/{slug} (+ the latest reads for "Keep reading").

import React, { useEffect, useRef, useState } from 'react'
import {
	ActivityIndicator,
	Animated,
	Image,
	NativeScrollEvent,
	NativeSyntheticEvent,
	Pressable,
	ScrollView,
	Share,
	StyleSheet,
	Text,
	View,
} from 'react-native'
import { useNavigation, useRoute } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { RouteProp } from '@react-navigation/native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { AppPathIcon } from '../../components/common'
import { APP_COLORS } from '../../config/theme'
import { ROUTES } from '../../navigation/routes'
import type { AppStackParamList } from '../../navigation/types'
import { getBlogPost, type BlogPost } from '../../services/blogService'
import { getHealthReads, type HealthRead } from '../../services/homeService'
import { ArticleBody } from './articleContent'
import { FEED_ICONS, initialsOf, longDate, lookForRead } from './feedTheme'
import { useSavedReads } from './savedReads'

type Nav = NativeStackNavigationProp<AppStackParamList>
type Vote = 'yes' | 'no' | null

// A short professional line from the author's bio ("Clinical nutritionist"), only when it fits the byline.
const BIO_MAX_CHARS = 44

export default function ReadArticlePage() {
	const navigation = useNavigation<Nav>()
	const route = useRoute<RouteProp<AppStackParamList, typeof ROUTES.STACK.BLOG_ARTICLE>>()
	const insets = useSafeAreaInsets()
	const { isSaved, toggle } = useSavedReads()

	const [post, setPost] = useState<BlogPost | null>(null)
	const [loading, setLoading] = useState(true)
	const [related, setRelated] = useState<HealthRead[]>([])
	const [vote, setVote] = useState<Vote>(null)
	const [progress, setProgress] = useState(0)
	const barTitle = useRef(new Animated.Value(0)).current

	useEffect(() => {
		let alive = true
		setLoading(true)
		const loadPost = async () => {
			try {
				const res = await getBlogPost(route.params.slug)
				if (alive) setPost(res.data)
			} catch {
				if (alive) setPost(null)
			} finally {
				if (alive) setLoading(false)
			}
		}
		void loadPost()
		return () => {
			alive = false
		}
	}, [route.params.slug])

	useEffect(() => {
		if (!post) return
		let alive = true
		const type = post.content_type === 'blog' ? 'blog' : 'article'
		const loadRelated = async () => {
			try {
				const [same, other] = await Promise.all([
					getHealthReads(type, 10),
					getHealthReads(type === 'blog' ? 'article' : 'blog', 10),
				])
				if (!alive) return
				const pool = [...same, ...other].filter((r) => r.id !== post.id)
				const sameCategory = pool.filter((r) => r.category === post.category)
				setRelated([...sameCategory, ...pool.filter((r) => !sameCategory.includes(r))].slice(0, 2))
			} catch {
				// "Related reads" is optional: the article stands without it.
			}
		}
		void loadRelated()
		return () => {
			alive = false
		}
	}, [post])

	const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
		const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent
		const pct = Math.round((100 * contentOffset.y) / Math.max(1, contentSize.height - layoutMeasurement.height))
		const clamped = Math.max(0, Math.min(100, pct))
		setProgress((prev) => (prev === clamped ? prev : clamped))
		Animated.timing(barTitle, { toValue: clamped > 8 ? 1 : 0, duration: 160, useNativeDriver: true }).start()
	}

	const goBack = () => navigation.goBack()

	if (loading) {
		return (
			<View style={[styles.screen, styles.center]}>
				<ActivityIndicator color={APP_COLORS.primary} />
			</View>
		)
	}
	if (!post) {
		return (
			<View style={[styles.screen, styles.center, { paddingTop: insets.top }]}>
				<Text style={styles.notFound}>This article isn’t available right now.</Text>
				<Pressable onPress={goBack} style={styles.backLink}>
					<Text style={styles.backLinkText}>Go back</Text>
				</Pressable>
			</View>
		)
	}

	const look = lookForRead(post.category, post.tag, post.title)
	const author = post.author_name || post.author?.name || ''
	const bio = post.author?.bio?.trim()
	const saved = isSaved(post.id)
	const byline = [
		bio && bio.length <= BIO_MAX_CHARS ? bio.replace(/\.$/, '') : '',
		longDate(post.published_at || post.created_at),
		post.read_time_minutes ? `${post.read_time_minutes} min read` : '',
	]
		.filter(Boolean)
		.join(' · ')
	const shortTitle = post.title.length > 34 ? `${post.title.slice(0, 32).trim()}…` : post.title

	return (
		<View style={styles.screen}>
			<View style={[styles.bar, { paddingTop: insets.top + 8, height: 60 + insets.top }]}>
				<Pressable
					onPress={goBack}
					accessibilityRole="button"
					accessibilityLabel="Back to health reads"
					style={styles.barBtn}
				>
					<AppPathIcon d={FEED_ICONS.back} size={22} strokeWidth={2.2} color={APP_COLORS.ink} />
				</Pressable>
				<Animated.Text numberOfLines={1} style={[styles.barTitle, { opacity: barTitle }]}>
					{shortTitle}
				</Animated.Text>
				<Pressable
					onPress={() => toggle(post.id)}
					accessibilityRole="button"
					accessibilityState={{ selected: saved }}
					accessibilityLabel="Save article"
					style={styles.barBtn}
				>
					<AppPathIcon
						d={FEED_ICONS.bookmark}
						size={20}
						strokeWidth={2}
						color={APP_COLORS.primary}
						fill={saved ? APP_COLORS.primary : 'none'}
					/>
				</Pressable>
				<Pressable
					onPress={() => Share.share({ message: `${post.title} — on KarolaHealth` }).catch(() => {})}
					accessibilityRole="button"
					accessibilityLabel="Share article"
					style={styles.barBtn}
				>
					<AppPathIcon d={FEED_ICONS.share} size={20} strokeWidth={2} color={APP_COLORS.primary} />
				</Pressable>
			</View>
			<View style={styles.progressTrack}>
				<View style={[styles.progressFill, { width: `${progress}%` }]} />
			</View>

			<ScrollView
				onScroll={onScroll}
				scrollEventThrottle={16}
				contentContainerStyle={styles.content}
				showsVerticalScrollIndicator={false}
			>
				<View style={[styles.hero, { backgroundColor: look.tone.bg }]}>
					{post.image_url ? (
						<Image source={{ uri: post.image_url }} style={StyleSheet.absoluteFill} resizeMode="cover" />
					) : (
						<>
							<View style={[styles.heroBlobLeft]} />
							<View style={[styles.heroBlobRight, { backgroundColor: `${look.tone.ink}1F` }]} />
							<AppPathIcon d={look.icon} size={72} strokeWidth={1.4} color={look.tone.ink} />
						</>
					)}
				</View>

				<View style={styles.article}>
					<Text style={[styles.tag, { color: look.tone.ink }]}>
						{(post.tag || post.category).toUpperCase()}
					</Text>
					<Text style={styles.title} accessibilityRole="header">
						{post.title}
					</Text>
					<View style={styles.authorRow}>
						<View style={styles.avatar}>
							<Text style={styles.avatarText}>{initialsOf(author) || 'KH'}</Text>
						</View>
						<View style={{ flex: 1, minWidth: 0 }}>
							<Text style={styles.authorName}>{author || 'KarolaHealth'}</Text>
							{!!byline && <Text style={styles.byline}>{byline}</Text>}
						</View>
					</View>

					<ArticleBody content={post.content} />

					<View style={styles.note} accessibilityRole="text">
						<Text style={styles.noteText}>
							This article is general information, not medical advice. Speak to a doctor before starting
							supplements, especially if you take regular medicines.
						</Text>
					</View>
				</View>

				<View style={styles.helpful}>
					<Text style={styles.helpfulText}>
						{vote === null
							? 'Was this helpful?'
							: vote === 'yes'
								? 'Thanks! We’ll show you more like this.'
								: 'Thanks for telling us. We’ll improve it.'}
					</Text>
					{vote === null && (
						<>
							<Pressable
								onPress={() => setVote('yes')}
								style={[styles.voteBtn, { borderColor: APP_COLORS.primary }]}
							>
								<Text style={[styles.voteText, { color: APP_COLORS.primary }]}>Yes</Text>
							</Pressable>
							<Pressable
								onPress={() => setVote('no')}
								style={[styles.voteBtn, { borderColor: APP_COLORS.border }]}
							>
								<Text style={[styles.voteText, { color: APP_COLORS.ink }]}>No</Text>
							</Pressable>
						</>
					)}
				</View>

				<Pressable
					onPress={() => navigation.navigate(ROUTES.MAIN.TABS, { screen: ROUTES.MAIN.SEARCH })}
					style={({ pressed }) => [styles.cta, pressed && { opacity: 0.92 }]}
				>
					<View pointerEvents="none" style={styles.ctaBlob} />
					<View style={styles.ctaText}>
						<Text style={styles.ctaTitle}>Want to talk to a doctor about this?</Text>
						<Text style={styles.ctaSub}>Book a consultation</Text>
					</View>
					<View style={styles.ctaBtn}>
						<Text style={styles.ctaBtnText}>Book</Text>
					</View>
				</Pressable>

				{related.length > 0 && (
					<View style={styles.related}>
						<Text style={styles.relatedTitle}>Keep reading</Text>
						{related.map((r, i) => {
							const rl = lookForRead(r.category, r.tag, r.title)
							const meta = [r.author_name, r.read_time_minutes ? `${r.read_time_minutes} min read` : '']
								.filter(Boolean)
								.join(' · ')
							return (
								<Pressable
									key={r.id}
									onPress={() =>
										r.slug && navigation.push(ROUTES.STACK.BLOG_ARTICLE, { slug: r.slug })
									}
									style={[styles.relatedRow, i < related.length - 1 && styles.relatedRule]}
								>
									<View style={[styles.relatedArt, { backgroundColor: rl.tone.bg }]}>
										<AppPathIcon d={rl.icon} size={24} strokeWidth={1.8} color={rl.tone.ink} />
									</View>
									<View style={{ flex: 1, minWidth: 0, gap: 2 }}>
										<Text style={styles.relatedRowTitle}>{r.title}</Text>
										<Text style={styles.relatedMeta}>{meta}</Text>
									</View>
								</Pressable>
							)
						})}
					</View>
				)}
			</ScrollView>
		</View>
	)
}

const styles = StyleSheet.create({
	screen: { flex: 1, backgroundColor: '#FFFFFF' },
	center: { alignItems: 'center', justifyContent: 'center', gap: 12 },
	notFound: { fontSize: 15, color: APP_COLORS.inkMuted },
	backLink: { height: 44, paddingHorizontal: 16, justifyContent: 'center' },
	backLinkText: { fontSize: 15, fontWeight: '700', color: APP_COLORS.primary },
	bar: {
		paddingHorizontal: 8,
		paddingBottom: 8,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
		backgroundColor: '#FFFFFF',
		borderBottomWidth: 1,
		borderBottomColor: APP_COLORS.divider,
		zIndex: 2,
	},
	barBtn: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
	barTitle: { flex: 1, minWidth: 0, fontSize: 15, lineHeight: 20, fontWeight: '700', color: APP_COLORS.ink },
	progressTrack: { height: 3, backgroundColor: APP_COLORS.mint },
	progressFill: { height: 3, backgroundColor: APP_COLORS.primary },
	content: { gap: 16, paddingBottom: 40 },
	hero: { height: 168, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
	heroBlobLeft: {
		position: 'absolute',
		left: -40,
		bottom: -60,
		width: 180,
		height: 180,
		borderRadius: 9999,
		backgroundColor: '#FFFFFF80',
	},
	heroBlobRight: { position: 'absolute', right: -30, top: -40, width: 130, height: 130, borderRadius: 9999 },
	article: { gap: 14, paddingHorizontal: 20 },
	tag: { fontSize: 11, lineHeight: 14, fontWeight: '800', letterSpacing: 0.66 },
	title: { fontSize: 26, lineHeight: 32, fontWeight: '800', color: APP_COLORS.ink },
	authorRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
	avatar: {
		width: 40,
		height: 40,
		borderRadius: 9999,
		backgroundColor: APP_COLORS.mint,
		alignItems: 'center',
		justifyContent: 'center',
	},
	avatarText: { fontSize: 13, fontWeight: '800', color: APP_COLORS.primary },
	authorName: { fontSize: 14, lineHeight: 20, fontWeight: '800', color: APP_COLORS.ink },
	byline: { fontSize: 12, lineHeight: 16, color: APP_COLORS.inkMuted },
	note: { padding: 12, borderRadius: 12, borderWidth: 1, borderColor: APP_COLORS.divider },
	noteText: { fontSize: 13, lineHeight: 19, color: APP_COLORS.inkMuted },
	helpful: {
		marginHorizontal: 20,
		padding: 14,
		borderRadius: 12,
		backgroundColor: APP_COLORS.pageBg,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
	},
	helpfulText: { flex: 1, fontSize: 14, lineHeight: 20, fontWeight: '700', color: APP_COLORS.ink },
	voteBtn: {
		height: 40,
		paddingHorizontal: 14,
		borderRadius: 10,
		borderWidth: 1.5,
		backgroundColor: '#FFFFFF',
		alignItems: 'center',
		justifyContent: 'center',
	},
	voteText: { fontSize: 13, fontWeight: '700' },
	cta: {
		marginHorizontal: 20,
		padding: 16,
		borderRadius: 14,
		overflow: 'hidden',
		backgroundColor: APP_COLORS.primary,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
	},
	ctaBlob: {
		position: 'absolute',
		right: -40,
		bottom: -50,
		width: 140,
		height: 140,
		borderRadius: 9999,
		backgroundColor: '#276668',
	},
	ctaText: { flex: 1, gap: 2 },
	ctaTitle: { fontSize: 16, lineHeight: 22, fontWeight: '800', color: '#FFFFFF' },
	ctaSub: { fontSize: 13, lineHeight: 18, color: APP_COLORS.mint },
	ctaBtn: {
		height: 36,
		paddingHorizontal: 12,
		borderRadius: 8,
		backgroundColor: '#FFFFFF',
		alignItems: 'center',
		justifyContent: 'center',
	},
	ctaBtnText: { fontSize: 13, fontWeight: '700', color: APP_COLORS.ink },
	related: { paddingHorizontal: 20 },
	relatedTitle: { marginBottom: 4, fontSize: 18, lineHeight: 26, fontWeight: '700', color: APP_COLORS.ink },
	relatedRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
	relatedRule: { borderBottomWidth: 1, borderBottomColor: APP_COLORS.divider },
	relatedArt: { width: 56, height: 56, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
	relatedRowTitle: { fontSize: 15, lineHeight: 20, fontWeight: '700', color: APP_COLORS.ink },
	relatedMeta: { fontSize: 12, lineHeight: 16, color: APP_COLORS.inkMuted },
})
