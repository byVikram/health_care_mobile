// src/features/ancillary/staff/today/ProviderScheduleTimeline.tsx
//
// "Today's schedule" of the provider Today screen (design "Nursing · 1 · Today"): a timeline of the day's visits --
// time on the left, a dot joined by a line, then the service with a status chip (Done / Next / On the way /
// In progress / Upcoming) and "patient · area · distance" -- followed by later days' visits. Tapping a row opens
// the visit. An accepted instant ("Book now") visit has no slot, so its time reads "Now".
import React from 'react'
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native'
import { APP_COLORS, TONES } from '../../../../config/theme'
import { formatTimeSlot } from '../../../../utils/formatters'
import type { ProviderVisitSummary } from '../../providerVisitService'
import type { ProviderSpecialityCopy } from '../providerSpecialityCopy'
import { isProviderWork, shortDay, visitSubtitle, visitTitle } from './todayView'

type Props = {
	/** Today's visits, in order (GET /provider/me/today -> schedule). */
	schedule: ProviderVisitSummary[]
	/** Visits on later days (-> upcoming). */
	upcoming: ProviderVisitSummary[]
	/** The visit the Next-visit card is showing; its row is marked "Next". */
	nextVisitId?: string | null
	copy: ProviderSpecialityCopy
	onOpen: (visit: ProviderVisitSummary) => void
}

type RowState = { chip: string; chipBg: string; chipInk: string; dot: string; faded: boolean }

const STARTED = ['IN_PROGRESS', 'ARRIVED', 'EN_ROUTE']

const rowState = (v: ProviderVisitSummary, isNext: boolean): RowState => {
	switch (v.status) {
		case 'COMPLETED':
			return {
				chip: 'Done',
				chipBg: APP_COLORS.successBg,
				chipInk: APP_COLORS.success,
				dot: APP_COLORS.success,
				faded: true,
			}
		case 'IN_PROGRESS':
		case 'ARRIVED':
			return {
				chip: 'In progress',
				chipBg: APP_COLORS.mint,
				chipInk: APP_COLORS.primary,
				dot: APP_COLORS.primary,
				faded: false,
			}
		case 'EN_ROUTE':
			return {
				chip: 'On the way',
				chipBg: TONES.sky.bg,
				chipInk: TONES.sky.ink,
				dot: APP_COLORS.primary,
				faded: false,
			}
	}
	return isNext
		? { chip: 'Next', chipBg: APP_COLORS.mint, chipInk: APP_COLORS.primary, dot: APP_COLORS.primary, faded: false }
		: {
				chip: 'Upcoming',
				chipBg: APP_COLORS.neutralBg,
				chipInk: APP_COLORS.inkMuted,
				dot: APP_COLORS.divider,
				faded: false,
			}
}

function Row({
	visit,
	timeLabel,
	dayLabel,
	isNext,
	last,
	copy,
	onOpen,
}: {
	visit: ProviderVisitSummary
	timeLabel: string
	dayLabel?: string
	isNext: boolean
	last: boolean
	copy: ProviderSpecialityCopy
	onOpen: (visit: ProviderVisitSummary) => void
}) {
	const s = rowState(visit, isNext)
	const title = visitTitle(visit, copy.noun)
	return (
		<Pressable
			onPress={() => onOpen(visit)}
			accessibilityRole="button"
			accessibilityLabel={`${timeLabel}, ${title}, ${s.chip}`}
			style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
		>
			<View style={styles.timeCol}>
				{dayLabel ? <Text style={styles.time}>{dayLabel}</Text> : null}
				<Text style={styles.time}>{timeLabel}</Text>
			</View>
			<View style={styles.rail}>
				<View
					style={[
						styles.dot,
						{
							backgroundColor: s.dot,
							boxShadow: `0 0 0 3px ${APP_COLORS.surface}, 0 0 0 4px ${s.dot}`,
						} as ViewStyle,
					]}
				/>
				{!last ? <View style={styles.line} /> : null}
			</View>
			<View style={[styles.body, { paddingBottom: last ? 0 : 14, opacity: s.faded ? 0.7 : 1 }]}>
				<View style={styles.titleRow}>
					<Text style={styles.title} numberOfLines={2}>
						{title}
					</Text>
					<View style={[styles.chip, { backgroundColor: s.chipBg }]}>
						<Text style={[styles.chipText, { color: s.chipInk }]}>{s.chip}</Text>
					</View>
				</View>
				<Text style={styles.sub} numberOfLines={1}>
					{visitSubtitle(visit)}
				</Text>
			</View>
		</Pressable>
	)
}

export function ProviderScheduleTimeline({ schedule, upcoming, nextVisitId, copy, onOpen }: Props) {
	const today = schedule.filter((v) => isProviderWork(v.status))
	const later = upcoming.filter((v) => isProviderWork(v.status))
	if (today.length === 0 && later.length === 0) return null

	// Mark one row "Next": the Next-visit card's visit, else the first one not yet started or finished.
	const fallbackNext = today.find((v) => v.status !== 'COMPLETED' && !STARTED.includes(v.status))
	const nextId = nextVisitId ?? fallbackNext?.visit_public_id ?? null

	return (
		<View style={styles.section} accessibilityLabel="Schedule">
			{today.length > 0 ? (
				<>
					<Text style={styles.heading}>Today’s schedule</Text>
					<View>
						{today.map((v, i) => (
							<Row
								key={v.visit_public_id}
								visit={v}
								timeLabel={v.start_time ? formatTimeSlot(v.start_time) : 'Now'}
								isNext={v.visit_public_id === nextId}
								last={i === today.length - 1}
								copy={copy}
								onOpen={onOpen}
							/>
						))}
					</View>
				</>
			) : null}
			{later.length > 0 ? (
				<>
					<Text style={[styles.heading, today.length > 0 && styles.headingSpaced]}>Upcoming</Text>
					<View>
						{later.map((v, i) => (
							<Row
								key={v.visit_public_id}
								visit={v}
								dayLabel={shortDay(v.date)}
								timeLabel={formatTimeSlot(v.start_time)}
								isNext={false}
								last={i === later.length - 1}
								copy={copy}
								onOpen={onOpen}
							/>
						))}
					</View>
				</>
			) : null}
		</View>
	)
}

const styles = StyleSheet.create({
	section: { gap: 12, paddingTop: 4 },
	heading: { fontSize: 16, lineHeight: 22, fontWeight: '800', color: APP_COLORS.ink },
	headingSpaced: { marginTop: 8 },
	row: { flexDirection: 'row', gap: 12 },
	timeCol: { width: 64, paddingTop: 2, alignItems: 'flex-end' },
	time: { fontSize: 12, lineHeight: 16, fontWeight: '700', color: APP_COLORS.inkMuted, textAlign: 'right' },
	rail: { alignItems: 'center' },
	dot: { width: 12, height: 12, marginTop: 3, borderRadius: 6 },
	line: { flexGrow: 1, width: 2, marginVertical: 4, backgroundColor: APP_COLORS.divider },
	body: { flex: 1, minWidth: 0, gap: 2 },
	titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
	title: { flex: 1, fontSize: 14, lineHeight: 20, fontWeight: '800', color: APP_COLORS.ink },
	chip: { paddingVertical: 1, paddingHorizontal: 8, borderRadius: 6 },
	chipText: { fontSize: 11, lineHeight: 16, fontWeight: '700' },
	sub: { fontSize: 12, lineHeight: 16, color: APP_COLORS.inkMuted },
})

export default ProviderScheduleTimeline
