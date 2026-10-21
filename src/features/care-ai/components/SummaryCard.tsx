// src/features/care-ai/components/SummaryCard.tsx
//
// "Chat summary for the doctor": what Care AI will pass on (concern, medicines, sugar, question) and the switch
// that decides whether the summary is shared with the doctor.

import React, { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { AppToggle } from '../../../components/common'
import { APP_COLORS } from '../../../config/theme'
import { CARE_AI } from '../careAiTheme'
import type { CareAiSummary } from '../careAiTypes'
import { ReplyCard } from './ReplyCard'

type Props = {
	summary: CareAiSummary
	/** Whose chat this is ("For Vikram"). */
	forName: string
	/** Told when the patient switches "Share this summary with the doctor" on or off (it starts on). */
	onShareChange?: (shared: boolean) => void
}

export function SummaryCard({ summary, forName, onShareChange }: Props) {
	const [shared, setShared] = useState(true)
	const changeShared = (value: boolean) => {
		setShared(value)
		onShareChange?.(value)
	}
	return (
		<ReplyCard>
			<View style={styles.header}>
				<Text style={styles.title}>{summary.title}</Text>
				<Text style={styles.forName}>For {forName}</Text>
			</View>
			<View style={styles.rows}>
				{summary.rows.map(([label, value], index) => (
					<View key={label} style={[styles.row, index < summary.rows.length - 1 && styles.rowDivider]}>
						<Text style={styles.label}>{label}</Text>
						<Text style={styles.value}>{value}</Text>
					</View>
				))}
			</View>
			<View style={styles.share}>
				<Text style={styles.shareText}>Share this summary with the doctor</Text>
				<AppToggle
					value={shared}
					onValueChange={changeShared}
					showStatusText={false}
					activeColor={APP_COLORS.success}
					accessibilityLabel="Share this summary with the doctor"
				/>
			</View>
		</ReplyCard>
	)
}

const styles = StyleSheet.create({
	header: {
		paddingVertical: 12,
		paddingHorizontal: 14,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		gap: 8,
		backgroundColor: CARE_AI.softSurface,
	},
	title: { flex: 1, fontSize: 14, lineHeight: 20, fontWeight: '800', color: APP_COLORS.ink },
	forName: { fontSize: 12, fontWeight: '700', color: APP_COLORS.inkMuted },
	rows: { paddingVertical: 4, paddingHorizontal: 14 },
	row: { flexDirection: 'row', gap: 12, paddingVertical: 9 },
	rowDivider: { borderBottomWidth: 1, borderBottomColor: CARE_AI.rowDivider },
	label: { width: 92, fontSize: 13, lineHeight: 19, color: APP_COLORS.inkMuted },
	value: { flex: 1, fontSize: 13, lineHeight: 19, fontWeight: '700', color: APP_COLORS.ink },
	share: {
		paddingVertical: 12,
		paddingHorizontal: 14,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
		borderTopWidth: 1,
		borderTopColor: CARE_AI.hairline,
	},
	shareText: { flex: 1, fontSize: 13, lineHeight: 18, fontWeight: '700', color: APP_COLORS.ink },
})
