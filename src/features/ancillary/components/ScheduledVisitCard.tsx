// src/features/ancillary/components/ScheduledVisitCard.tsx
//
// One visit of a scheduled order on "Booking details" (design: Later · 3 · Booking details):
//   a date tile (DOW / day / month; solid teal for the next visit, grey once cancelled), "VISIT 2 OF 3" overline,
//   the time range, who comes (or when they will be assigned) and a status pill; below it for a visit still on the
//   books a two-button row -- Reschedule | View visit -- and, for a cancelled one, a red note.
// Presentational: the page decides the copy and what the buttons do.

import React from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { APP_COLORS } from '../../../config/theme'
import type { VisitChip } from '../patient/scheduledVisitView'

export type ScheduledVisitCardProps = {
	dow: string
	day: string
	mon: string
	/** "VISIT 2 OF 3 · TODAY". */
	overline: string
	/** "7:00–7:45 PM". */
	range: string
	/** "Nurse assigned at 6:00 PM today". */
	assign: string
	chip: VisitChip
	/** The next visit: solid tile, teal border and a tinted action row. */
	next: boolean
	cancelled: boolean
	/** Show the Reschedule | View visit row. */
	showActions: boolean
	/** The server says this visit can still move (greyed out once its provider is assigned). */
	canReschedule: boolean
	/** Red note under a cancelled visit. */
	cancelNote?: string
	onReschedule: () => void
	onView: () => void
}

const GREY_TEXT = '#9AAFB2'
const ROW_RULE = '#EEF2F3'
const NEXT_ROW_BG = '#F4FAFA'
const CANCEL_RULE = '#F6D5D0'
const CANCEL_INK = '#8A1C12'

export function ScheduledVisitCard(p: ScheduledVisitCardProps) {
	const tileBg = p.cancelled ? APP_COLORS.neutralBg : p.next ? APP_COLORS.primary : APP_COLORS.mint
	const tileFg = p.cancelled ? GREY_TEXT : p.next ? '#FFFFFF' : APP_COLORS.primary
	const overlineColor = p.cancelled ? GREY_TEXT : p.next ? APP_COLORS.primary : APP_COLORS.inkMuted

	return (
		<View style={[styles.card, p.next && !p.cancelled && styles.cardNext]}>
			<View style={styles.head}>
				<View style={[styles.tile, { backgroundColor: tileBg }]} accessibilityElementsHidden>
					<Text style={[styles.tileDow, { color: tileFg }]}>{p.dow}</Text>
					<Text style={[styles.tileDay, { color: tileFg }]}>{p.day}</Text>
					<Text style={[styles.tileMon, { color: tileFg }]}>{p.mon}</Text>
				</View>

				<View style={styles.body}>
					<Text style={[styles.overline, { color: overlineColor }]}>{p.overline}</Text>
					<Text
						style={[styles.range, p.cancelled && { color: GREY_TEXT, textDecorationLine: 'line-through' }]}
					>
						{p.range}
					</Text>
					<View style={styles.assignRow}>
						<MaterialCommunityIcons name="account-outline" size={13} color={APP_COLORS.inkMuted} />
						<Text style={styles.assign}>{p.assign}</Text>
					</View>
				</View>

				<View style={[styles.chip, { backgroundColor: p.chip.bg }]}>
					<View style={[styles.chipDot, { backgroundColor: p.chip.fg }]} />
					<Text style={[styles.chipText, { color: p.chip.fg }]}>{p.chip.label}</Text>
				</View>
			</View>

			{p.showActions && (
				<View style={[styles.actions, { backgroundColor: p.next ? NEXT_ROW_BG : APP_COLORS.surface }]}>
					<TouchableOpacity
						onPress={p.onReschedule}
						disabled={!p.canReschedule}
						accessibilityRole="button"
						accessibilityLabel={`Reschedule ${p.overline.split(' · ')[0].toLowerCase()}`}
						accessibilityState={{ disabled: !p.canReschedule }}
						activeOpacity={0.7}
						style={[styles.action, styles.actionLeft, !p.canReschedule && styles.actionDisabled]}
					>
						<MaterialCommunityIcons name="calendar-month-outline" size={15} color={APP_COLORS.primary} />
						<Text style={styles.actionText}>Reschedule</Text>
					</TouchableOpacity>
					<TouchableOpacity
						onPress={p.onView}
						accessibilityRole="button"
						accessibilityLabel={`View ${p.overline.split(' · ')[0].toLowerCase()}`}
						activeOpacity={0.7}
						style={styles.action}
					>
						<Text style={styles.viewText}>View visit</Text>
						<MaterialCommunityIcons name="chevron-right" size={15} color={APP_COLORS.primary} />
					</TouchableOpacity>
				</View>
			)}

			{!!p.cancelNote && (
				<View style={styles.cancelNote}>
					<Text style={styles.cancelNoteText}>{p.cancelNote}</Text>
				</View>
			)}
		</View>
	)
}

const styles = StyleSheet.create({
	card: {
		borderRadius: 12,
		borderWidth: 1,
		borderColor: APP_COLORS.divider,
		backgroundColor: APP_COLORS.surface,
		overflow: 'hidden',
	},
	cardNext: {
		borderColor: APP_COLORS.mintAccent,
		shadowColor: APP_COLORS.primary,
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.12,
		shadowRadius: 14,
		elevation: 2,
	},
	head: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 },
	tile: { width: 50, paddingVertical: 6, borderRadius: 10, alignItems: 'center' },
	tileDow: { fontSize: 10, lineHeight: 12, fontWeight: '800', letterSpacing: 0.5, opacity: 0.85 },
	tileDay: { fontSize: 20, lineHeight: 24, fontWeight: '800' },
	tileMon: { fontSize: 10, lineHeight: 12, fontWeight: '700', opacity: 0.85 },
	body: { flex: 1, minWidth: 0, gap: 2 },
	overline: { fontSize: 11, lineHeight: 14, fontWeight: '800', letterSpacing: 0.55 },
	range: { fontSize: 16, lineHeight: 22, fontWeight: '800', color: APP_COLORS.ink },
	assignRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
	assign: { flexShrink: 1, fontSize: 12, lineHeight: 16, color: APP_COLORS.inkMuted },
	chip: {
		alignSelf: 'flex-start',
		flexDirection: 'row',
		alignItems: 'center',
		gap: 5,
		paddingHorizontal: 8,
		paddingVertical: 3,
		borderRadius: 9999,
	},
	chipDot: { width: 6, height: 6, borderRadius: 9999 },
	chipText: { fontSize: 11, lineHeight: 16, fontWeight: '800' },
	actions: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: ROW_RULE },
	action: {
		flex: 1,
		height: 44,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 6,
	},
	actionLeft: { borderRightWidth: 1, borderRightColor: ROW_RULE },
	actionDisabled: { opacity: 0.4 },
	actionText: { fontSize: 13, fontWeight: '700', color: APP_COLORS.ink },
	viewText: { fontSize: 13, fontWeight: '800', color: APP_COLORS.primary },
	cancelNote: {
		paddingHorizontal: 12,
		paddingVertical: 10,
		borderTopWidth: 1,
		borderTopColor: CANCEL_RULE,
		backgroundColor: APP_COLORS.dangerBg,
	},
	cancelNoteText: { fontSize: 12, lineHeight: 17, color: CANCEL_INK },
})
