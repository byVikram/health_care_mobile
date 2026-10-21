// src/features/dashboard/components/HomeHealthReadsSection.tsx
//
// Patient Home "Health reads" ("1 · Home"): one section with Articles / Blogs / Podcasts tabs, each
// showing two rows from GET /api/blogs?content_type=… (72px tone tile — or the cover image — tag,
// title, "author · N min read" / "Listen · N min"). Tabs load lazily and are cached until the page
// refreshes. A row opens the article; podcasts open their media URL (no in-app player yet).
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'

import { AppPathIcon, AppSection, AppSkeleton, AppTabs, AppTextLink } from '../../../components/common'
import { APP_COLORS, toneForString } from '../../../config/theme'
import { ROUTES } from '../../../navigation/routes'
import type { AppStackParamList } from '../../../navigation/types'
import { getHealthReads, type HealthRead, type HealthReadType } from '../../../services/homeService'
import { HOME_ICONS, homeSectionProps } from '../homeTheme'
import { openWebUrl } from '../../../utils/safeLinking'

type NavigationProp = NativeStackNavigationProp<AppStackParamList>

const TABS: { key: HealthReadType; label: string; empty: string }[] = [
	{ key: 'article', label: 'Articles', empty: 'No articles yet.' },
	{ key: 'blog', label: 'Blogs', empty: 'No blogs yet.' },
	{ key: 'podcast', label: 'Podcasts', empty: 'No podcasts yet.' },
]

type TabState = { status: 'loading' | 'ready' | 'error'; items: HealthRead[] }

const readIcon = (r: HealthRead) => {
	const hay = `${r.tag ?? ''} ${r.category ?? ''} ${r.title}`.toLowerCase()
	if (r.content_type === 'podcast') return /video|panel|watch/.test(hay) ? HOME_ICONS.video : HOME_ICONS.mic
	if (/diet|nutri|vitamin|food|immun/.test(hay)) return HOME_ICONS.apple
	if (/virus|covid|corona|vaccin|infection/.test(hay)) return HOME_ICONS.shield
	if (/diabet|sugar|blood/.test(hay)) return HOME_ICONS.drop
	if (/heart|cancer|care|caregiv/.test(hay)) return HOME_ICONS.heart
	return HOME_ICONS.document
}

const readMeta = (r: HealthRead) => {
	if (r.content_type === 'podcast') {
		const mins = r.media_duration_seconds ? Math.max(1, Math.round(r.media_duration_seconds / 60)) : null
		return ['Listen', mins ? `${mins} min` : null].filter(Boolean).join(' · ')
	}
	const author = r.author_name || (r as unknown as { author?: { name?: string } }).author?.name
	const time = r.read_time_minutes ? `${r.read_time_minutes} min read` : r.content_type === 'blog' ? 'Blog' : 'Article'
	return [author, time].filter(Boolean).join(' · ')
}

type Props = {
	refreshToken?: number
}

function HomeHealthReadsSection({ refreshToken }: Props) {
	const navigation = useNavigation<NavigationProp>()
	const [tab, setTab] = useState<HealthReadType>('article')
	const [tabs, setTabs] = useState<Partial<Record<HealthReadType, TabState>>>({})
	const mounted = useRef(true)

	useEffect(() => {
		mounted.current = true
		return () => {
			mounted.current = false
		}
	}, [])

	const load = useCallback(async (type: HealthReadType) => {
		setTabs((prev) => ({ ...prev, [type]: { status: 'loading', items: prev[type]?.items ?? [] } }))
		try {
			const items = await getHealthReads(type, 2)
			if (mounted.current) setTabs((prev) => ({ ...prev, [type]: { status: 'ready', items: items.slice(0, 2) } }))
		} catch {
			if (mounted.current) setTabs((prev) => ({ ...prev, [type]: { status: 'error', items: [] } }))
		}
	}, [])

	// Pull-to-refresh drops the cache; the active tab reloads right away.
	useEffect(() => {
		setTabs({})
	}, [refreshToken])

	const current = tabs[tab]
	useEffect(() => {
		if (!current) void load(tab)
	}, [current, tab, load])

	const openRead = async (r: HealthRead) => {
		if (r.content_type === 'podcast' && r.media_url) {
			try {
				await openWebUrl(r.media_url)
				return
			} catch {
				// fall through to the article page
			}
		}
		if (r.slug) navigation.navigate(ROUTES.STACK.BLOG_ARTICLE, { slug: r.slug })
	}

	const active = TABS.find((t) => t.key === tab) ?? TABS[0]
	const status = current?.status ?? 'loading'
	const items = current?.items ?? []

	return (
		<AppSection
			title="Health reads"
			right={<AppTextLink label="View all" onPress={() => navigation.navigate(ROUTES.STACK.BLOG_LIST)} />}
			{...homeSectionProps(8)}
		>
			<AppTabs tabs={TABS} value={tab} onChange={setTab} accessibilityLabel="Content type" style={styles.tabs} />
			<View style={styles.panel}>
				{status === 'loading' &&
					[0, 1].map((i) => (
						<View key={i} style={[styles.row, i === 0 && styles.rowRule]}>
							<AppSkeleton width={72} height={72} borderRadius={14} color={APP_COLORS.divider} />
							<View style={styles.skeletonCol}>
								<AppSkeleton width="30%" height={10} color={APP_COLORS.divider} />
								<AppSkeleton width="90%" height={14} color={APP_COLORS.divider} />
								<AppSkeleton width="50%" height={10} color={APP_COLORS.divider} />
							</View>
						</View>
					))}

				{status === 'error' && (
					<TouchableOpacity
						onPress={() => load(tab)}
						style={styles.stateBox}
						accessibilityRole="button"
						accessibilityHint="Try loading again"
					>
						<Text style={styles.stateText}>{`Couldn’t load ${active.label.toLowerCase()}. Tap to retry.`}</Text>
					</TouchableOpacity>
				)}

				{status === 'ready' && items.length === 0 && (
					<View style={styles.stateBox}>
						<Text style={styles.stateText}>{active.empty}</Text>
					</View>
				)}

				{status === 'ready' &&
					items.map((r, i) => {
						const pair = toneForString(r.tag || r.category || r.content_type)
						const isMedia = r.content_type === 'podcast'
						const tag = (r.tag || r.category || (isMedia ? 'Podcast' : '')).toUpperCase()
						return (
							<TouchableOpacity
								key={r.id || r.slug}
								style={[styles.row, i < items.length - 1 && styles.rowRule]}
								activeOpacity={0.8}
								onPress={() => openRead(r)}
								accessibilityRole={isMedia ? 'button' : 'link'}
								accessibilityLabel={`${tag ? `${tag}. ` : ''}${r.title}. ${readMeta(r)}`}
							>
								<View style={[styles.tile, { backgroundColor: pair.bg }]}>
									{r.image_url ? (
										<Image source={{ uri: r.image_url }} style={styles.tileImage} />
									) : (
										<AppPathIcon d={readIcon(r)} size={30} strokeWidth={1.8} color={pair.ink} />
									)}
									{isMedia && (
										<View style={styles.playBadge}>
											<MaterialCommunityIcons name="play" size={14} color={APP_COLORS.surface} />
										</View>
									)}
								</View>
								<View style={styles.textCol}>
									{!!tag && (
										<Text style={[styles.tag, { color: pair.ink }]} numberOfLines={1}>
											{tag}
										</Text>
									)}
									<Text style={styles.title} numberOfLines={2}>
										{r.title}
									</Text>
									<Text style={styles.meta} numberOfLines={1}>
										{readMeta(r)}
									</Text>
								</View>
							</TouchableOpacity>
						)
					})}
			</View>
		</AppSection>
	)
}

export default React.memo(HomeHealthReadsSection)

const styles = StyleSheet.create({
	tabs: {
		marginHorizontal: 16,
	},
	panel: {
		paddingHorizontal: 16,
	},
	row: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		paddingVertical: 12,
	},
	rowRule: {
		borderBottomWidth: 1,
		borderBottomColor: APP_COLORS.divider,
	},
	skeletonCol: {
		flex: 1,
		gap: 8,
	},
	tile: {
		width: 72,
		height: 72,
		borderRadius: 14,
		alignItems: 'center',
		justifyContent: 'center',
		overflow: 'hidden',
	},
	tileImage: {
		width: 72,
		height: 72,
	},
	playBadge: {
		position: 'absolute',
		right: 6,
		bottom: 6,
		width: 22,
		height: 22,
		borderRadius: 11,
		backgroundColor: APP_COLORS.ink,
		alignItems: 'center',
		justifyContent: 'center',
	},
	textCol: {
		flex: 1,
		minWidth: 0,
		gap: 2,
	},
	tag: {
		fontSize: 11,
		lineHeight: 14,
		fontWeight: '700',
		letterSpacing: 0.44,
	},
	title: {
		fontSize: 15,
		lineHeight: 20,
		fontWeight: '700',
		color: APP_COLORS.ink,
	},
	meta: {
		fontSize: 12,
		lineHeight: 16,
		color: APP_COLORS.inkMuted,
	},
	stateBox: {
		paddingVertical: 20,
		alignItems: 'center',
	},
	stateText: {
		fontSize: 13,
		lineHeight: 18,
		color: APP_COLORS.inkMuted,
		textAlign: 'center',
	},
})
