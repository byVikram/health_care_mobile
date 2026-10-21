// src/features/care-ai/components/WelcomePanel.tsx
//
// The first thing in a new chat: the hero ("Hi Vikram, how can I help?"), the "NEW FOR YOU" report banner, the
// starter list and the "Use my health records" switch. Once a question has been asked it folds into the one-line
// GreetingStrip.

import React from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { AppNavRow, AppPathIcon, AppToggle } from '../../../components/common'
import { APP_COLORS, TONES } from '../../../config/theme'
import { STARTERS } from '../careAiData'
import { CARE_AI_ICONS } from '../careAiIcons'
import { CARE_AI } from '../careAiTheme'
import type { CareAiStarter } from '../careAiTypes'
import { CareAiAvatar } from './CareAiAvatar'

type WelcomeProps = {
	firstName: string
	recordsOn: boolean
	onToggleRecords: (on: boolean) => void
	onExplainReport: () => void
	onPickStarter: (starter: CareAiStarter) => void
}

export function WelcomePanel({ firstName, recordsOn, onToggleRecords, onExplainReport, onPickStarter }: WelcomeProps) {
	return (
		<View style={styles.panel}>
			<View style={styles.hero}>
				<CareAiAvatar size={52} ring={4} iconSize={26} />
				<View style={styles.heroText}>
					<Text style={styles.heroTitle} accessibilityRole="header">
						Hi {firstName}, how can I help?
					</Text>
					<Text style={styles.heroSub}>
						Ask about symptoms, medicines or everyday health. I can also find you the right doctor.
					</Text>
				</View>
			</View>

			<TouchableOpacity
				onPress={onExplainReport}
				activeOpacity={0.9}
				accessibilityRole="button"
				accessibilityLabel="Your HbA1c report is ready. Explain it"
				style={styles.reportBanner}
			>
				<View style={styles.reportTile}>
					<AppPathIcon d={CARE_AI_ICONS.flask} size={22} strokeWidth={2} color={APP_COLORS.ink} />
				</View>
				<View style={styles.reportText}>
					<Text style={styles.reportEyebrow}>NEW FOR YOU</Text>
					<Text style={styles.reportTitle}>Your HbA1c report is ready</Text>
					<Text style={styles.reportSub}>Karola Labs · 28 Sep</Text>
				</View>
				<View style={styles.reportCta}>
					<Text style={styles.reportCtaText}>Explain it</Text>
				</View>
			</TouchableOpacity>

			<Text style={styles.sectionLabel}>OR ASK ABOUT</Text>
			<View style={styles.starterCard}>
				{STARTERS.map((starter, index) => (
					<AppNavRow
						key={starter.id}
						title={starter.title}
						subtitle={starter.sub}
						leading={{
							size: 40,
							radius: 12,
							tone: starter.tone,
							children: (
								<AppPathIcon
									d={starter.icon}
									size={20}
									strokeWidth={2}
									color={TONES[starter.tone].ink}
								/>
							),
						}}
						trailing={false}
						minHeight={64}
						divider={index < STARTERS.length - 1}
						onPress={() => onPickStarter(starter)}
						style={styles.starterRow}
						titleStyle={styles.starterTitle}
					/>
				))}
			</View>

			<View style={styles.recordsRow}>
				<AppPathIcon d={CARE_AI_ICONS.shieldCheck} size={18} strokeWidth={2.1} color={APP_COLORS.success} />
				<View style={styles.recordsText}>
					<Text style={styles.recordsTitle}>Use my health records</Text>
					<Text style={styles.recordsSub}>
						{recordsOn
							? 'Personal answers from your reports, medicines and visits'
							: 'Off · answers will be general'}
					</Text>
				</View>
				<AppToggle
					value={recordsOn}
					onValueChange={onToggleRecords}
					showStatusText={false}
					activeColor={APP_COLORS.success}
					accessibilityLabel="Use my health records for personal answers"
				/>
			</View>
		</View>
	)
}

/** After the first question: "Hi Vikram! Ask me anything about your health." */
export function GreetingStrip({ firstName }: { firstName: string }) {
	return (
		<View style={styles.strip}>
			<CareAiAvatar size={28} ring={2} iconSize={14} />
			<Text style={styles.stripText}>
				<Text style={styles.stripName}>Hi {firstName}!</Text> Ask me anything about your health.
			</Text>
		</View>
	)
}

const styles = StyleSheet.create({
	panel: { gap: 16, paddingHorizontal: 4, paddingTop: 4 },
	hero: { alignItems: 'flex-start', gap: 12, paddingTop: 8 },
	heroText: { gap: 4 },
	heroTitle: { fontSize: 22, lineHeight: 28, fontWeight: '800', letterSpacing: -0.22, color: APP_COLORS.ink },
	heroSub: { fontSize: 15, lineHeight: 22, color: APP_COLORS.inkMuted },
	reportBanner: {
		padding: 14,
		borderRadius: 16,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		backgroundColor: APP_COLORS.ink,
	},
	reportTile: {
		width: 44,
		height: 44,
		borderRadius: 12,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: APP_COLORS.mintAccent,
	},
	reportText: { flex: 1, minWidth: 0, gap: 2 },
	reportEyebrow: {
		fontSize: 11,
		lineHeight: 14,
		fontWeight: '800',
		letterSpacing: 0.9,
		color: APP_COLORS.mintAccent,
	},
	reportTitle: { fontSize: 15, lineHeight: 20, fontWeight: '800', color: '#FFFFFF' },
	reportSub: { fontSize: 12, lineHeight: 16, color: CARE_AI.onInkMuted },
	reportCta: {
		height: 34,
		paddingHorizontal: 12,
		borderRadius: 9999,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#FFFFFF',
	},
	reportCtaText: { fontSize: 13, fontWeight: '800', color: APP_COLORS.ink },
	sectionLabel: { fontSize: 12, lineHeight: 16, fontWeight: '800', letterSpacing: 0.72, color: APP_COLORS.inkMuted },
	starterCard: {
		borderRadius: 14,
		overflow: 'hidden',
		backgroundColor: '#FFFFFF',
		borderWidth: 1,
		borderColor: CARE_AI.cardBorder,
	},
	starterRow: { paddingHorizontal: 14, paddingVertical: 10, borderBottomColor: CARE_AI.rowDivider },
	starterTitle: { fontWeight: '700' },
	recordsRow: {
		paddingVertical: 10,
		paddingHorizontal: 12,
		borderRadius: 12,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
		backgroundColor: CARE_AI.softSurface,
	},
	recordsText: { flex: 1, minWidth: 0 },
	recordsTitle: { fontSize: 13, lineHeight: 18, fontWeight: '700', color: APP_COLORS.ink },
	recordsSub: { fontSize: 12, lineHeight: 16, color: APP_COLORS.inkMuted },
	strip: {
		paddingVertical: 10,
		paddingHorizontal: 12,
		borderRadius: 14,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
		backgroundColor: CARE_AI.softSurface,
	},
	stripText: { flex: 1, fontSize: 14, lineHeight: 20, color: CARE_AI.body },
	stripName: { fontWeight: '700', color: APP_COLORS.ink },
})
