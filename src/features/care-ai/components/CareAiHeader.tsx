// src/features/care-ai/components/CareAiHeader.tsx
//
// Care AI screen header: back, the sparkle badge, "Care AI / Your health assistant" with its online dot, then
// Recent chats and New chat.

import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { AppIconButton, AppPathIcon } from '../../../components/common'
import { APP_COLORS } from '../../../config/theme'
import { CARE_AI_ICONS } from '../careAiIcons'
import { CARE_AI } from '../careAiTheme'
import { CareAiAvatar } from './CareAiAvatar'

type Props = {
	onBack: () => void
	onOpenHistory: () => void
	onNewChat: () => void
}

export function CareAiHeader({ onBack, onOpenHistory, onNewChat }: Props) {
	const insets = useSafeAreaInsets()
	return (
		<View style={[styles.header, { paddingTop: insets.top + 6 }]}>
			<AppIconButton circle size={44} variant="ghost" onPress={onBack} accessibilityLabel="Back to home">
				<AppPathIcon d={CARE_AI_ICONS.back} size={24} strokeWidth={2} color={APP_COLORS.ink} />
			</AppIconButton>
			<CareAiAvatar size={36} ring={3} iconSize={18} />
			<View style={styles.titleCol}>
				<Text style={styles.title} accessibilityRole="header">
					Care AI
				</Text>
				<View style={styles.statusRow}>
					<View style={styles.onlineDot} />
					<Text style={styles.status}>Your health assistant</Text>
				</View>
			</View>
			<AppIconButton circle size={44} variant="ghost" onPress={onOpenHistory} accessibilityLabel="Recent chats">
				<AppPathIcon d={CARE_AI_ICONS.history} size={22} strokeWidth={2} color={APP_COLORS.ink} />
			</AppIconButton>
			<AppIconButton circle size={44} variant="ghost" onPress={onNewChat} accessibilityLabel="New chat">
				<AppPathIcon d={CARE_AI_ICONS.compose} size={21} strokeWidth={2} color={APP_COLORS.ink} />
			</AppIconButton>
		</View>
	)
}

const styles = StyleSheet.create({
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		paddingBottom: 6,
		paddingLeft: 4,
		paddingRight: 8,
		backgroundColor: APP_COLORS.surface,
		borderBottomWidth: 1,
		borderBottomColor: CARE_AI.hairline,
	},
	titleCol: { flex: 1, minWidth: 0 },
	title: { fontSize: 17, lineHeight: 22, fontWeight: '800', color: APP_COLORS.ink },
	statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
	onlineDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: CARE_AI.online },
	status: { fontSize: 12, lineHeight: 16, color: APP_COLORS.inkMuted },
})
