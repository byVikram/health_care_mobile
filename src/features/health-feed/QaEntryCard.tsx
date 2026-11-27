// src/features/health-feed/QaEntryCard.tsx
//
// The card that leads into a person's own Q&A list, from the "Patient Questions" design: a mint card (the shared AppSoftCard) with an
// icon tile (AppIconTile), a title over a one-line subtitle, an amber "N new answers" chip when there is news, and a chevron. The
// doctor's "My answers" (Patient questions section of Engage) and the patient's "My questions" (top of Health questions) are the same
// card with their own words, icon and counts.

import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { AppIconTile, AppPathIcon, AppSoftCard } from '../../components/common'
import { APP_COLORS } from '../../config/theme'
import { NewChip } from './QuestionCard'
import { FEED_ICONS } from './feedTheme'

type Props = {
	title: string
	subtitle: string
	/** 24x24 line-icon path of the tile. */
	icon: string
	/** Answers that are new to the user; the chip shows only when above zero. */
	newCount?: number
	onPress: () => void
}

export function QaEntryCard({ title, subtitle, icon, newCount = 0, onPress }: Props) {
	return (
		<AppSoftCard
			onPress={onPress}
			radius={12}
			padding={0}
			borderColor={APP_COLORS.mintAccent}
			accessibilityLabel={`${title}. ${subtitle}${newCount ? `. ${newCount} new` : ''}`}
			style={styles.card}
		>
			<View style={styles.row}>
				<AppIconTile size={36} radius={10} tone="mint">
					<AppPathIcon d={icon} size={18} strokeWidth={2.1} color={APP_COLORS.primary} />
				</AppIconTile>
				<View style={styles.text}>
					<Text style={styles.title}>{title}</Text>
					<Text style={styles.sub} numberOfLines={1}>
						{subtitle}
					</Text>
				</View>
				{newCount > 0 && <NewChip text={`${newCount} new ${newCount === 1 ? 'answer' : 'answers'}`} />}
				<AppPathIcon d={FEED_ICONS.chevronRight} size={16} strokeWidth={2.4} color={APP_COLORS.inkMuted} />
			</View>
		</AppSoftCard>
	)
}

const styles = StyleSheet.create({
	card: { backgroundColor: '#F2F8F8' },
	row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14 },
	text: { flex: 1, minWidth: 0 },
	title: { fontSize: 14, lineHeight: 19, fontWeight: '800', color: APP_COLORS.ink },
	sub: { fontSize: 12, lineHeight: 16, color: APP_COLORS.inkMuted },
})
