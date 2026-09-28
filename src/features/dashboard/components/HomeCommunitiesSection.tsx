// src/features/dashboard/components/HomeCommunitiesSection.tsx
//
// Patient Home "Communities" ("1 · Home"): three featured groups (44px tone tile, name,
// "{category} · Support group|Forum") with a Join / "Joined ✓" toggle. Joining is optimistic and rolls
// back with a toast on failure. A row opens the community forum; "Explore" opens it too.
import React, { useEffect, useState } from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import Toast from 'react-native-toast-message'

import { AppActionChip, AppIconTile, AppPathIcon, AppSection, AppSkeleton, AppTextLink } from '../../../components/common'
import { APP_COLORS, toneForString } from '../../../config/theme'
import { ROUTES } from '../../../navigation/routes'
import type { AppStackParamList } from '../../../navigation/types'
import { listCommunityGroups, type CommunityGroup } from '../../../services/communityService'
import { joinCommunity, leaveCommunity } from '../../../services/homeService'
import { HOME_ICONS, homeSectionProps } from '../homeTheme'

type NavigationProp = NativeStackNavigationProp<AppStackParamList>
type IconName = keyof typeof MaterialCommunityIcons.glyphMap

const isGlyph = (name?: string): name is IconName => !!name && name in MaterialCommunityIcons.glyphMap

type Props = {
	refreshToken?: number
}

function HomeCommunitiesSection({ refreshToken }: Props) {
	const navigation = useNavigation<NavigationProp>()
	const [groups, setGroups] = useState<CommunityGroup[]>([])
	const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
	const [busy, setBusy] = useState<Record<string, boolean>>({})

	useEffect(() => {
		let active = true
		const load = async () => {
			try {
				const res = await listCommunityGroups(true)
				if (!active) return
				if (res.success && Array.isArray(res.data)) {
					setGroups(res.data.slice(0, 3))
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
	}, [refreshToken])

	const setJoined = (id: string, joined: boolean, memberCount?: number) =>
		setGroups((prev) =>
			prev.map((g) =>
				g.id === id ? { ...g, is_joined: joined, member_count: memberCount ?? g.member_count } : g
			)
		)

	const toggle = async (group: CommunityGroup) => {
		if (busy[group.id]) return
		const wasJoined = !!group.is_joined
		setJoined(group.id, !wasJoined)
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

	// Soft-fail: an unreachable communities API hides the section.
	if (status === 'error') return null

	const openForum = () => navigation.navigate(ROUTES.STACK.COMMUNITY_FORUM)

	return (
		<AppSection title="Communities" right={<AppTextLink label="Explore" onPress={openForum} />} {...homeSectionProps(8)}>
			<View style={styles.list}>
				{status === 'loading' &&
					[0, 1, 2].map((i) => (
						<View key={i} style={[styles.row, i < 2 && styles.rowRule]}>
							<AppSkeleton width={44} height={44} borderRadius={14} color={APP_COLORS.divider} />
							<View style={styles.skeletonCol}>
								<AppSkeleton width="60%" height={14} color={APP_COLORS.divider} />
								<AppSkeleton width="40%" height={10} color={APP_COLORS.divider} />
							</View>
						</View>
					))}

				{status === 'ready' && groups.length === 0 && (
					<Text style={styles.emptyText}>No communities to show yet.</Text>
				)}

				{status === 'ready' &&
					groups.map((g, i) => {
						const pair = toneForString(g.icon_name || g.category || g.name)
						const joined = !!g.is_joined
						const kind = g.group_type === 'forum' ? 'Forum' : 'Support group'
						return (
							<View key={g.id} style={[styles.row, i < groups.length - 1 && styles.rowRule]}>
								<TouchableOpacity
									style={styles.rowMain}
									activeOpacity={0.8}
									onPress={openForum}
									accessibilityRole="button"
									accessibilityLabel={`${g.name}, ${g.category} ${kind}`}
								>
									<AppIconTile
										size={44}
										radius={14}
										backgroundColor={pair.bg}
										iconColor={pair.ink}
										icon={isGlyph(g.icon_name) ? g.icon_name : undefined}
										iconSize={22}
									>
										{isGlyph(g.icon_name) ? undefined : (
											<AppPathIcon d={HOME_ICONS.people} size={22} strokeWidth={2} color={pair.ink} />
										)}
									</AppIconTile>
									<View style={styles.textCol}>
										<Text style={styles.name} numberOfLines={1}>
											{g.name}
										</Text>
										<Text style={styles.sub} numberOfLines={1}>
											{[g.category, kind].filter(Boolean).join(' · ')}
										</Text>
									</View>
								</TouchableOpacity>
								<AppActionChip
									label={joined ? 'Joined ✓' : 'Join'}
									onPress={() => toggle(g)}
									accessibilityLabel={joined ? `Leave ${g.name}` : `Join ${g.name}`}
									style={[styles.joinChip, joined ? styles.joinedChip : styles.joinChipIdle]}
								/>
							</View>
						)
					})}
			</View>
		</AppSection>
	)
}

export default React.memo(HomeCommunitiesSection)

const styles = StyleSheet.create({
	list: {
		paddingHorizontal: 16,
	},
	row: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		paddingVertical: 10,
	},
	rowRule: {
		borderBottomWidth: 1,
		borderBottomColor: APP_COLORS.divider,
	},
	rowMain: {
		flex: 1,
		minWidth: 0,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
	},
	skeletonCol: {
		flex: 1,
		gap: 8,
	},
	textCol: {
		flex: 1,
		minWidth: 0,
	},
	name: {
		fontSize: 15,
		lineHeight: 20,
		fontWeight: '700',
		color: APP_COLORS.ink,
	},
	sub: {
		fontSize: 12,
		lineHeight: 16,
		color: APP_COLORS.inkMuted,
	},
	joinChip: {
		paddingHorizontal: 14,
	},
	joinChipIdle: {
		borderColor: APP_COLORS.primary,
		backgroundColor: APP_COLORS.surface,
	},
	joinedChip: {
		borderColor: APP_COLORS.mint,
		backgroundColor: APP_COLORS.mint,
	},
	emptyText: {
		paddingVertical: 16,
		fontSize: 13,
		lineHeight: 18,
		color: APP_COLORS.inkMuted,
		textAlign: 'center',
	},
})
