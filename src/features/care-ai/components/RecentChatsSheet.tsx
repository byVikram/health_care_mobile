// src/features/care-ai/components/RecentChatsSheet.tsx
//
// "Recent chats" sheet: search, New chat, the chats grouped This week / Earlier (each with its tag, e.g.
// "For Raghav"), and the privacy line. With no chats yet it shows the "No chats yet" empty state instead.

import React, { useMemo, useState } from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { AppBottomSheet, AppButton, AppIconTile, AppPathIcon, AppSearchBar, AppTag } from '../../../components/common'
import { APP_COLORS, TONES } from '../../../config/theme'
import { RECENT_GROUPS } from '../careAiData'
import { CARE_AI_ICONS } from '../careAiIcons'
import { CARE_AI } from '../careAiTheme'
import type { CareAiRecentChat } from '../careAiTypes'

type Props = {
	visible: boolean
	chats: CareAiRecentChat[]
	onClose: () => void
	onNewChat: () => void
	onOpenChat: (chat: CareAiRecentChat) => void
}

export function RecentChatsSheet({ visible, chats, onClose, onNewChat, onOpenChat }: Props) {
	const [query, setQuery] = useState('')

	const groups = useMemo(() => {
		const q = query.trim().toLowerCase()
		const matches = q ? chats.filter((c) => `${c.title} ${c.preview}`.toLowerCase().includes(q)) : chats
		return RECENT_GROUPS.map((group) => ({ group, items: matches.filter((c) => c.group === group) })).filter(
			(g) => g.items.length > 0
		)
	}, [chats, query])

	return (
		<AppBottomSheet visible={visible} title="Recent chats" onClose={onClose} appearance="modern">
			{chats.length === 0 ? (
				<View style={styles.empty}>
					<View style={styles.emptyIcon}>
						<AppPathIcon d={CARE_AI_ICONS.chat} size={32} strokeWidth={1.8} color={APP_COLORS.primary} />
					</View>
					<Text style={styles.emptyTitle}>No chats yet</Text>
					<Text style={styles.emptyText}>
						Your conversations with Care AI will show up here, so you can pick up where you left off.
					</Text>
					<AppButton size="lg" style={styles.emptyButton} onPress={onClose}>
						Start a chat
					</AppButton>
				</View>
			) : (
				<View>
					<View style={styles.tools}>
						<AppSearchBar context="careAiChats" value={query} onChangeText={setQuery} showMicrophone={false} style={styles.search} />
						<TouchableOpacity onPress={onNewChat} accessibilityRole="button" style={styles.newChat}>
							<AppPathIcon
								d={CARE_AI_ICONS.plus}
								size={16}
								strokeWidth={2.4}
								color={APP_COLORS.primary}
							/>
							<Text style={styles.newChatText}>New chat</Text>
						</TouchableOpacity>
					</View>

					{groups.map(({ group, items }) => (
						<View key={group}>
							<Text style={styles.group}>{group.toUpperCase()}</Text>
							{items.map((chat, index) => (
								<TouchableOpacity
									key={chat.title}
									onPress={() => onOpenChat(chat)}
									activeOpacity={0.8}
									accessibilityRole="button"
									style={[styles.row, index < items.length - 1 && styles.rowDivider]}
								>
									<AppIconTile size={40} radius={12} tone={chat.tone}>
										<AppPathIcon
											d={chat.icon}
											size={20}
											strokeWidth={2}
											color={TONES[chat.tone].ink}
										/>
									</AppIconTile>
									<View style={styles.rowText}>
										<View style={styles.rowTop}>
											<Text style={styles.rowTitle} numberOfLines={1}>
												{chat.title}
											</Text>
											<Text style={styles.rowWhen}>{chat.when}</Text>
										</View>
										<Text style={styles.rowPreview} numberOfLines={1}>
											{chat.preview}
										</Text>
										{chat.tag ? (
											<AppTag
												label={chat.tag.label}
												tone={chat.tag.tone}
												size="sm"
												uppercase={false}
												style={styles.tag}
											/>
										) : null}
									</View>
								</TouchableOpacity>
							))}
						</View>
					))}

					<View style={styles.privacy}>
						<AppPathIcon d={CARE_AI_ICONS.shield} size={14} strokeWidth={2} color={APP_COLORS.inkMuted} />
						<Text style={styles.privacyText}>Chats are private to you and are kept for 90 days.</Text>
					</View>
				</View>
			)}
		</AppBottomSheet>
	)
}

const styles = StyleSheet.create({
	tools: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
	search: {
		flex: 1,
		minWidth: 0,
	},
	newChat: {
		height: 44,
		paddingHorizontal: 14,
		borderRadius: 12,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		backgroundColor: APP_COLORS.mint,
	},
	newChatText: { fontSize: 14, fontWeight: '800', color: APP_COLORS.primary },
	group: {
		marginTop: 12,
		marginBottom: 4,
		fontSize: 12,
		lineHeight: 16,
		fontWeight: '800',
		letterSpacing: 0.72,
		color: APP_COLORS.inkMuted,
	},
	row: { paddingVertical: 10, flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
	rowDivider: { borderBottomWidth: 1, borderBottomColor: CARE_AI.rowDivider },
	rowText: { flex: 1, minWidth: 0, gap: 2 },
	rowTop: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
	rowTitle: { flex: 1, minWidth: 0, fontSize: 15, lineHeight: 20, fontWeight: '700', color: APP_COLORS.ink },
	rowWhen: { fontSize: 12, lineHeight: 16, color: APP_COLORS.inkMuted },
	rowPreview: { fontSize: 13, lineHeight: 18, color: APP_COLORS.inkMuted },
	tag: { alignSelf: 'flex-start', marginTop: 2 },
	privacy: { marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 6 },
	privacyText: { flex: 1, fontSize: 12, lineHeight: 17, color: APP_COLORS.inkMuted },
	empty: { alignItems: 'center', gap: 8, paddingTop: 24, paddingHorizontal: 8 },
	emptyIcon: {
		width: 72,
		height: 72,
		borderRadius: 36,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: APP_COLORS.mint,
	},
	emptyTitle: { marginTop: 6, fontSize: 17, lineHeight: 24, fontWeight: '800', color: APP_COLORS.ink },
	emptyText: { maxWidth: 260, textAlign: 'center', fontSize: 14, lineHeight: 20, color: APP_COLORS.inkMuted },
	emptyButton: { marginTop: 10, alignSelf: 'stretch' },
})
