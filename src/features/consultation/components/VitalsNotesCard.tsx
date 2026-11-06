// src/features/consultation/components/VitalsNotesCard.tsx
//
// The "Vitals" card at the top of the Notes tab (design variant B). Nothing recorded today: a dashed card saying so, with the
// last reading and a Record button that opens the sheet. Recorded today: the time, how many readings need attention, an Edit
// button and one chip per reading (the most worrying first). Display only: the data and the actions come in as props.

import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { AppButton, AppIconTile, AppSoftCard, AppTag } from '../../../components/common'
import { APP_COLORS } from '../../../config/theme'
import { RATING_LABELS, RATING_TONES, formatClock, type VitalChip } from '../vitalsEntry'

type Props = {
	/** When the last of today's readings was taken; null when nothing was recorded today. */
	recordedAt: Date | null
	chips: VitalChip[]
	flags: { text: string; flagged: boolean }
	/** The empty card's second line ("Last on 12 Jun · BP 128/84"). */
	lastReading: string
	/** Whether today's readings have been fetched: until then "not recorded" is not known. */
	loadState?: 'loading' | 'ready' | 'error'
	/** After a failed fetch: try again. */
	onRetry?: () => void
	/** Shown but not editable (the notes were already submitted). */
	readOnly?: boolean
	onRecord: () => void
}

export function VitalsNotesCard({
	recordedAt,
	chips,
	flags,
	lastReading,
	loadState = 'ready',
	onRetry,
	readOnly = false,
	onRecord,
}: Props) {
	if (!recordedAt && loadState !== 'ready') {
		const failed = loadState === 'error'
		return (
			<AppSoftCard
				radius={14}
				padding={12}
				borderColor="#9FB4B6"
				style={styles.emptyCard}
				accessibilityLabel="Vitals"
			>
				<View style={styles.row}>
					<AppIconTile icon="heart-pulse" tone="mint" size={40} radius={12} />
					<View style={styles.flex}>
						<Text style={styles.title}>Vitals</Text>
						<Text style={styles.sub}>
							{failed ? 'Couldn’t load today’s readings' : 'Checking today’s readings…'}
						</Text>
					</View>
					{failed && !!onRetry && (
						<AppButton
							variant="outline"
							size="sm"
							icon="refresh"
							onPress={onRetry}
							accessibilityLabel="Try loading today’s vitals again"
						>
							Retry
						</AppButton>
					)}
				</View>
			</AppSoftCard>
		)
	}

	if (!recordedAt) {
		return (
			<AppSoftCard
				radius={14}
				padding={12}
				borderColor="#9FB4B6"
				style={styles.emptyCard}
				accessibilityLabel="Vitals not recorded"
			>
				<View style={styles.row}>
					<AppIconTile icon="heart-pulse" tone="mint" size={40} radius={12} />
					<View style={styles.flex}>
						<Text style={styles.title}>Vitals not recorded</Text>
						<Text style={styles.sub}>{lastReading}</Text>
					</View>
					{!readOnly && (
						<AppButton
							variant="primary"
							size="sm"
							icon="plus"
							onPress={onRecord}
							accessibilityLabel="Record vitals"
						>
							Record
						</AppButton>
					)}
				</View>
			</AppSoftCard>
		)
	}

	return (
		<AppSoftCard radius={14} padding={14} style={styles.filledCard} accessibilityLabel="Vitals">
			<View style={styles.row}>
				<View style={styles.flex}>
					<Text style={styles.title}>Vitals</Text>
					<Text style={[styles.sub, styles.subStrong]}>
						{`Recorded today, ${formatClock(recordedAt)} · `}
						<Text style={{ color: flags.flagged ? APP_COLORS.danger : APP_COLORS.success }}>
							{flags.text}
						</Text>
					</Text>
				</View>
				{!readOnly && (
					<AppButton
						variant="outline"
						size="sm"
						icon="pencil-outline"
						onPress={onRecord}
						accessibilityLabel="Edit vitals"
					>
						Edit
					</AppButton>
				)}
			</View>
			<View style={styles.chips}>
				{chips.map((chip) => {
					const tone = RATING_TONES[chip.rating]
					return (
						<AppTag
							key={chip.key}
							label={chip.label}
							accessibilityLabel={`${chip.label}${RATING_LABELS[chip.rating] ? `, ${RATING_LABELS[chip.rating]}` : ''}`}
							bg={tone.chipBg}
							ink={tone.chipInk}
							dot={tone.dot}
							size="md"
						/>
					)
				})}
			</View>
		</AppSoftCard>
	)
}

const styles = StyleSheet.create({
	emptyCard: { borderWidth: 1.5, borderStyle: 'dashed' },
	filledCard: { gap: 10 },
	row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
	flex: { flex: 1, minWidth: 0 },
	title: { fontSize: 13, lineHeight: 18, fontWeight: '800', color: APP_COLORS.ink },
	sub: { fontSize: 11, lineHeight: 14, color: APP_COLORS.inkMuted },
	subStrong: { fontWeight: '700' },
	chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
})

export default VitalsNotesCard
