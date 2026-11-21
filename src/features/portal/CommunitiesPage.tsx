// src/features/portal/CommunitiesPage.tsx
//
// "6 · Communities" (Home → Communities → Explore): a header with search, "Your communities" (the groups the patient has joined), then
// "Discover communities" with category chips and every group with a Join / "Joined ✓" toggle. Fed by GET /api/communities (is_joined and
// member_count come with each group); Join / Joined call POST / DELETE /api/communities/{id}/join. Joining shows at once and is rolled
// back with a toast if the call fails. The cards and rows are information only: Join / Joined is the one action.
//
// Built from the shared pieces: AppScreenHeader (with AppSearchBar in its slot), AppSection, AppChip, AppActionChip, AppInfoBanner,
// AppCatalogEmpty, AppIconTile and AppSkeleton.
//
// Not built: the design's "live expert session" banner and its unread counts: nothing in the API carries them.
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useNavigation, type NavigationProp } from '@react-navigation/native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Toast from 'react-native-toast-message'

import {
	AppActionChip,
	AppCatalogEmpty,
	AppChip,
	AppIconTile,
	AppInfoBanner,
	AppPathIcon,
	AppScreenHeader,
	AppSearchBar,
	AppSection,
	AppSkeleton,
} from '../../components/common'
import { APP_COLORS } from '../../config/theme'
import { ROUTES } from '../../navigation/routes'
import type { AppStackParamList } from '../../navigation/types'
import { listCommunityGroups, type CommunityGroup } from '../../services/communityService'
import { joinCommunity, leaveCommunity } from '../../services/homeService'
import { homeSectionProps } from '../dashboard/homeTheme'
import { COMMUNITY_ICONS, communitySearchText, communityVisual, kindOf, membersText } from './communityVisuals'

export default function CommunitiesPage() {
	const navigation = useNavigation<NavigationProp<AppStackParamList>>()
	const insets = useSafeAreaInsets()

	const [groups, setGroups] = useState<CommunityGroup[]>([])
	const [loading, setLoading] = useState(true)
	const [refreshing, setRefreshing] = useState(false)
	const [failed, setFailed] = useState(false)
	const [reloadKey, setReloadKey] = useState(0)
	const [query, setQuery] = useState('')
	const [category, setCategory] = useState('all')
	const [busy, setBusy] = useState<Record<string, boolean>>({})

	useEffect(() => {
		let active = true
		const load = async () => {
			setFailed(false)
			try {
				const res = await listCommunityGroups()
				if (!active) return
				if (res.success && Array.isArray(res.data)) setGroups(res.data)
				else setFailed(true)
			} catch (error) {
				console.error('Error fetching communities:', error)
				if (active) setFailed(true)
			} finally {
				if (active) {
					setLoading(false)
					setRefreshing(false)
				}
			}
		}
		void load()
		return () => {
			active = false
		}
	}, [reloadKey])

	const setJoined = useCallback((id: string, joined: boolean, memberCount?: number) => {
		setGroups((prev) =>
			prev.map((g) =>
				g.id === id ? { ...g, is_joined: joined, member_count: memberCount ?? g.member_count } : g
			)
		)
	}, [])

	const toggleJoin = async (group: CommunityGroup) => {
		if (busy[group.id]) return
		const wasJoined = !!group.is_joined
		setJoined(group.id, !wasJoined) // shown at once, undone below if the call fails
		setBusy((b) => ({ ...b, [group.id]: true }))
		try {
			const res = wasJoined ? await leaveCommunity(group.id) : await joinCommunity(group.id)
			if (res) setJoined(group.id, !!res.is_joined, res.member_count)
		} catch {
			setJoined(group.id, wasJoined)
			Toast.show({
				type: 'error',
				text1: wasJoined ? 'Couldn’t leave the group' : 'Couldn’t join the group',
				text2: 'Please try again.',
			})
		} finally {
			setBusy((b) => ({ ...b, [group.id]: false }))
		}
	}

	const handleBack = () =>
		navigation.canGoBack()
			? navigation.goBack()
			: navigation.navigate(ROUTES.MAIN.TABS, { screen: ROUTES.MAIN.HOME })

	const reload = () => {
		setLoading(true)
		setReloadKey((k) => k + 1)
	}

	const q = query.trim().toLowerCase()
	const matching = useMemo(() => (q ? groups.filter((g) => communitySearchText(g).includes(q)) : groups), [groups, q])
	const mine = useMemo(() => matching.filter((g) => g.is_joined), [matching])
	const categories = useMemo(() => [...new Set(groups.map((g) => g.category).filter(Boolean))], [groups])
	// a category that is no longer in the list (a refresh dropped it) counts as All
	const activeCategory = categories.includes(category) ? category : 'all'
	const discover = useMemo(
		() => (activeCategory === 'all' ? matching : matching.filter((g) => g.category === activeCategory)),
		[matching, activeCategory]
	)

	return (
		<View style={styles.container}>
			<AppScreenHeader
				variant="bar"
				title="Communities"
				subtitle="Moderated by verified doctors"
				titleStyle={styles.headerTitle}
				subtitleStyle={styles.headerSubtitle}
				style={styles.header}
				onBack={handleBack}
			>
				<AppSearchBar context="communities" tone="onDark" value={query} onChangeText={setQuery} />
			</AppScreenHeader>

			<ScrollView
				style={styles.scroll}
				contentContainerStyle={[styles.content, { paddingBottom: 32 + insets.bottom }]}
				keyboardShouldPersistTaps="handled"
				showsVerticalScrollIndicator={false}
				refreshControl={
					<RefreshControl
						refreshing={refreshing}
						onRefresh={() => {
							setRefreshing(true)
							setReloadKey((k) => k + 1)
						}}
					/>
				}
			>
				{failed && !loading ? (
					<AppCatalogEmpty
						title="Couldn’t load communities"
						subtitle="Check your connection and try again."
						actionLabel="Try again"
						onAction={reload}
					/>
				) : (
					<>
						{/* YOUR COMMUNITIES */}
						<AppSection
							title="Your communities"
							right={!loading ? <Text style={styles.countText}>{mine.length} joined</Text> : undefined}
							{...homeSectionProps(10)}
						>
							{loading ? (
								<View style={styles.mineRow}>
									{[0, 1].map((i) => (
										<AppSkeleton
											key={i}
											width={168}
											height={112}
											borderRadius={14}
											color={APP_COLORS.divider}
										/>
									))}
								</View>
							) : mine.length === 0 ? (
								<Text style={styles.hintText}>
									{groups.some((g) => g.is_joined)
										? 'None of your communities match this search.'
										: 'You haven’t joined a community yet. Pick one below.'}
								</Text>
							) : (
								<ScrollView
									horizontal
									showsHorizontalScrollIndicator={false}
									contentContainerStyle={styles.mineRow}
								>
									{mine.map((g) => {
										const v = communityVisual(g)
										return (
											<View key={g.id} style={[styles.mineCard, { backgroundColor: v.bg }]}>
												<AppIconTile size={40} radius={12} backgroundColor={APP_COLORS.surface}>
													<AppPathIcon d={v.icon} size={22} strokeWidth={2} color={v.ink} />
												</AppIconTile>
												<Text style={styles.mineName} numberOfLines={2}>
													{g.name}
												</Text>
												<Text style={[styles.mineMeta, { color: v.ink }]}>
													{membersText(g.member_count)}
												</Text>
											</View>
										)
									})}
								</ScrollView>
							)}
						</AppSection>

						{/* DISCOVER COMMUNITIES */}
						<AppSection title="Discover communities" marginTop={0} gap={12}>
							{categories.length > 1 && (
								<ScrollView
									horizontal
									showsHorizontalScrollIndicator={false}
									style={styles.chipScroll}
									contentContainerStyle={styles.chipRow}
								>
									{['all', ...categories].map((c) => {
										const on = c === activeCategory
										return (
											<AppChip
												key={c}
												label={c === 'all' ? 'All' : c}
												selected={on}
												onPress={() => setCategory(c)}
												shape="pill"
												size="sm"
												borderColor={APP_COLORS.divider}
												style={on ? styles.chipOn : undefined}
											/>
										)
									})}
								</ScrollView>
							)}

							{loading ? (
								<View>
									{[0, 1, 2].map((i) => (
										<View key={i} style={[styles.row, i < 2 && styles.rowRule]}>
											<AppSkeleton
												width={48}
												height={48}
												borderRadius={14}
												color={APP_COLORS.divider}
											/>
											<View style={styles.skeletonCol}>
												<AppSkeleton width="55%" height={14} color={APP_COLORS.divider} />
												<AppSkeleton width="80%" height={10} color={APP_COLORS.divider} />
											</View>
										</View>
									))}
								</View>
							) : discover.length === 0 ? (
								<AppCatalogEmpty
									title={q ? `No community matches “${query.trim()}”` : 'No communities to show yet'}
									subtitle={q ? 'Try another condition or topic.' : 'Check back soon.'}
								/>
							) : (
								<View>
									{discover.map((g, i) => {
										const v = communityVisual(g)
										const joined = !!g.is_joined
										return (
											<View
												key={g.id}
												style={[styles.row, i < discover.length - 1 && styles.rowRule]}
											>
												<View
													style={styles.rowMain}
													accessible
													accessibilityLabel={`${g.name}, ${kindOf(g)}, ${membersText(g.member_count)}`}
												>
													<AppIconTile size={48} radius={14} backgroundColor={v.bg}>
														<AppPathIcon
															d={v.icon}
															size={24}
															strokeWidth={2}
															color={v.ink}
														/>
													</AppIconTile>
													<View style={styles.textCol}>
														<Text style={styles.name} numberOfLines={1}>
															{g.name}
														</Text>
														{!!g.description && (
															<Text style={styles.desc} numberOfLines={2}>
																{g.description}
															</Text>
														)}
														<View style={styles.metaRow}>
															<AppPathIcon
																d={COMMUNITY_ICONS.shield}
																size={14}
																strokeWidth={2.2}
																color={APP_COLORS.success}
															/>
															<Text style={styles.meta} numberOfLines={1}>
																{kindOf(g)} · {membersText(g.member_count)}
															</Text>
														</View>
													</View>
												</View>
												<AppActionChip
													label={joined ? 'Joined ✓' : 'Join'}
													onPress={() => void toggleJoin(g)}
													accessibilityLabel={joined ? `Leave ${g.name}` : `Join ${g.name}`}
													style={[
														styles.joinChip,
														joined ? styles.joinedChip : styles.joinChipIdle,
													]}
												/>
											</View>
										)
									})}
								</View>
							)}
						</AppSection>

						{/* NOTE */}
						<AppInfoBanner
							title="Posts are shared with members only."
							subtitle="Doctors moderate every group, but advice here doesn’t replace a consultation."
							style={styles.note}
						/>
					</>
				)}
			</ScrollView>
		</View>
	)
}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: APP_COLORS.pageBg },

	// header: the shared bar, with the design's 20/26 800 title, mint-accent subtitle and rounded bottom corners
	header: { borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
	headerTitle: { fontSize: 20, lineHeight: 26, fontWeight: '800' },
	headerSubtitle: { color: APP_COLORS.mintAccent },

	scroll: { flex: 1 },
	content: { paddingTop: 16, gap: 20, flexGrow: 1 },

	countText: { fontSize: 12, lineHeight: 16, fontWeight: '700', color: APP_COLORS.inkMuted },
	hintText: { paddingHorizontal: 16, fontSize: 13, lineHeight: 18, color: APP_COLORS.inkMuted },

	// Your communities
	mineRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 16 },
	mineCard: { width: 168, padding: 12, borderRadius: 14, gap: 8 },
	mineName: { fontSize: 15, lineHeight: 20, fontWeight: '800', color: APP_COLORS.ink },
	mineMeta: { fontSize: 12, lineHeight: 16, fontWeight: '700' },

	// Discover communities
	chipScroll: { marginHorizontal: -16 },
	chipRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16 },
	chipOn: { backgroundColor: APP_COLORS.ink, borderColor: APP_COLORS.ink },
	row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 12 },
	rowRule: { borderBottomWidth: 1, borderBottomColor: APP_COLORS.divider },
	rowMain: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
	skeletonCol: { flex: 1, gap: 8 },
	textCol: { flex: 1, minWidth: 0, gap: 2 },
	name: { fontSize: 15, lineHeight: 20, fontWeight: '800', color: APP_COLORS.ink },
	desc: { fontSize: 13, lineHeight: 18, color: APP_COLORS.inkMuted },
	metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
	meta: { flexShrink: 1, fontSize: 12, lineHeight: 16, color: APP_COLORS.inkMuted },
	joinChip: { paddingHorizontal: 14, marginTop: 6 },
	joinChipIdle: { borderColor: APP_COLORS.primary, backgroundColor: APP_COLORS.surface },
	joinedChip: { borderColor: APP_COLORS.mint, backgroundColor: APP_COLORS.mint },

	note: { marginHorizontal: 16 },
})
