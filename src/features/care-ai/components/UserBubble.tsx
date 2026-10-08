// src/features/care-ai/components/UserBubble.tsx
//
// The patient's message: a teal bubble (square bottom-right corner), with the attached report above it when
// they sent one.

import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { AppIconTile, AppPathIcon } from '../../../components/common'
import { APP_COLORS } from '../../../config/theme'
import { CARE_AI_ICONS } from '../careAiIcons'
import type { CareAiUserMessage } from '../careAiTypes'

export function UserBubble({ message }: { message: CareAiUserMessage }) {
	return (
		<View style={styles.wrap}>
			{message.file ? (
				<View style={styles.file}>
					<AppIconTile size={36} radius={10} backgroundColor="#FFFFFF" iconColor={APP_COLORS.danger}>
						<AppPathIcon d={CARE_AI_ICONS.file} size={18} strokeWidth={2} color={APP_COLORS.danger} />
					</AppIconTile>
					<View>
						<Text style={styles.fileName}>{message.file.name}</Text>
						<Text style={styles.fileSub}>{message.file.sub}</Text>
					</View>
				</View>
			) : null}
			<View style={styles.bubble}>
				<Text style={styles.text}>{message.text}</Text>
			</View>
		</View>
	)
}

const styles = StyleSheet.create({
	wrap: { alignSelf: 'flex-end', maxWidth: '78%', alignItems: 'flex-end', gap: 6 },
	file: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
		paddingVertical: 10,
		paddingHorizontal: 12,
		borderRadius: 14,
		backgroundColor: APP_COLORS.mint,
	},
	fileName: { fontSize: 14, lineHeight: 19, fontWeight: '800', color: APP_COLORS.ink },
	fileSub: { fontSize: 12, lineHeight: 16, color: APP_COLORS.inkMuted },
	bubble: {
		paddingVertical: 10,
		paddingHorizontal: 14,
		borderTopLeftRadius: 18,
		borderTopRightRadius: 18,
		borderBottomLeftRadius: 18,
		borderBottomRightRadius: 6,
		backgroundColor: APP_COLORS.primary,
	},
	text: { fontSize: 15, lineHeight: 21, color: '#FFFFFF' },
})
