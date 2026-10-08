// src/features/care-ai/components/ResultsCard.tsx
//
// The lab values Care AI picked out of a report: name + reference range, the value, and a High / Low / Normal /
// Borderline tag.

import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { AppTag } from '../../../components/common'
import { APP_COLORS, TONES } from '../../../config/theme'
import { CARE_AI } from '../careAiTheme'
import type { CareAiLabResult, CareAiResultStatus } from '../careAiTypes'
import { ReplyCard } from './ReplyCard'

const STATUS_COLORS: Record<CareAiResultStatus, { bg: string; ink: string }> = {
	High: { bg: APP_COLORS.dangerBg, ink: APP_COLORS.danger },
	Low: { bg: APP_COLORS.dangerBg, ink: APP_COLORS.danger },
	Normal: { bg: APP_COLORS.successBg, ink: APP_COLORS.success },
	Borderline: { bg: TONES.sand.bg, ink: TONES.sand.ink },
}

export function ResultsCard({ results }: { results: CareAiLabResult[] }) {
	return (
		<ReplyCard style={styles.card}>
			{results.map((result, index) => (
				<View key={result.name} style={[styles.row, index < results.length - 1 && styles.rowDivider]}>
					<View style={styles.text}>
						<Text style={styles.name}>{result.name}</Text>
						<Text style={styles.range}>{result.range}</Text>
					</View>
					<Text style={styles.value}>{result.value}</Text>
					<AppTag
						label={result.status}
						bg={STATUS_COLORS[result.status].bg}
						ink={STATUS_COLORS[result.status].ink}
						size="sm"
						shape="rounded"
						uppercase={false}
						style={styles.tag}
					/>
				</View>
			))}
		</ReplyCard>
	)
}

const styles = StyleSheet.create({
	card: { paddingVertical: 4, paddingHorizontal: 14 },
	row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
	rowDivider: { borderBottomWidth: 1, borderBottomColor: CARE_AI.rowDivider },
	text: { flex: 1, minWidth: 0 },
	name: { fontSize: 14, lineHeight: 20, fontWeight: '700', color: APP_COLORS.ink },
	range: { fontSize: 12, lineHeight: 16, color: APP_COLORS.inkMuted },
	value: { fontSize: 15, lineHeight: 20, fontWeight: '800', color: APP_COLORS.ink },
	tag: { minWidth: 56, justifyContent: 'center' },
})
