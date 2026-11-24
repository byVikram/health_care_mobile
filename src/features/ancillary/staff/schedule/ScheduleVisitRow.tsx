// src/features/ancillary/staff/schedule/ScheduleVisitRow.tsx
//
// One visit on the Schedule (ancillary schedule design): the time and "PM", the patient's name, a line with a bolt (instant) or a
// house (scheduled) icon + "care · area", then on the right a Start button (a visit of today), a chip ("Day 2 of 5", "Released",
// "Cancelled"...) and a ⋮ button for the manage sheet. Rows live inside a ScheduleCard (white section with a small caps title).
import React from 'react'
import { Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { AppPathIcon } from '../../../../components/common'
import { APP_COLORS } from '../../../../config/theme'
import { timeParts, type ScheduleVisit } from './scheduleModel'
import { PATHS, SCH } from './scheduleTheme'

/** White section card with a 12/800 small-caps title (and an optional muted line under it). */
export function ScheduleCard({
	title,
	subtitle,
	titleColor = APP_COLORS.inkMuted,
	borderColor = SCH.cardBorder,
	icon,
	children,
	accessibilityLabel,
}: {
	title?: string
	subtitle?: string
	titleColor?: string
	borderColor?: string
	icon?: string
	children: React.ReactNode
	accessibilityLabel?: string
}) {
	return (
		<View style={[styles.card, { borderColor }]} accessibilityLabel={accessibilityLabel}>
			{!!title && (
				<View style={styles.cardHead}>
					<View style={styles.cardTitleRow}>
						{!!icon && <AppPathIcon d={icon} size={14} strokeWidth={2.4} color={titleColor} />}
						<Text style={[styles.cardTitle, { color: titleColor }]} accessibilityRole="header">
							{title}
						</Text>
					</View>
					{!!subtitle && <Text style={styles.cardSub}>{subtitle}</Text>}
				</View>
			)}
			{children}
		</View>
	)
}

/** The 56-wide time column: "6:00" over "PM" (or "Now" over "instant"). */
export function TimeColumn({ startTime, color }: { startTime: string; color: string }) {
	const { time, ampm } = timeParts(startTime)
	return (
		<View style={styles.timeCol}>
			<Text style={[styles.time, { color }]}>{time}</Text>
			<Text style={styles.ampm}>{ampm}</Text>
		</View>
	)
}

/** The "bolt/house + text" line under a name. */
export function SubLine({ instant, text }: { instant: boolean; text: string }) {
	return (
		<View style={styles.subRow}>
			<AppPathIcon
				d={instant ? PATHS.bolt : PATHS.home}
				size={12}
				strokeWidth={2.4}
				color={instant ? SCH.instantInk : APP_COLORS.primary}
			/>
			<Text style={styles.sub} numberOfLines={1}>
				{text}
			</Text>
		</View>
	)
}

const chipFor = (v: ScheduleVisit): { label: string; bg: string; ink: string } | null => {
	switch (v.state) {
		case 'released':
			return {
				label: v.kind === 'instant' ? 'Reassigned' : 'Released',
				bg: SCH.released,
				ink: APP_COLORS.inkMuted,
			}
		case 'cancelled':
			return { label: 'Cancelled', bg: SCH.released, ink: APP_COLORS.inkMuted }
		case 'missed':
			return { label: 'Patient not home', bg: APP_COLORS.warningBg, ink: APP_COLORS.warning }
		case 'done':
			return { label: 'Completed', bg: APP_COLORS.mint, ink: APP_COLORS.primary }
		default:
			return v.count > 1 && v.kind === 'scheduled'
				? { label: `Day ${v.index} of ${v.count}`, bg: APP_COLORS.mint, ink: APP_COLORS.primary }
				: null
	}
}

type RowProps = {
	visit: ScheduleVisit
	isToday: boolean
	onOpen: () => void
	onMore: () => void
}

export function ScheduleVisitRow({ visit, isToday, onOpen, onMore }: RowProps) {
	const active = visit.state === 'active'
	const instant = visit.kind === 'instant'
	const chip = chipFor(visit)
	const timeColor = !active ? SCH.faint : instant ? SCH.instantInk : isToday ? APP_COLORS.primary : APP_COLORS.ink
	const canStart = active && isToday && !!visit.visitId

	return (
		<View style={[styles.row, !active && { opacity: 0.6 }]}>
			<View style={styles.rowMain}>
				<Pressable
					onPress={onOpen}
					disabled={!visit.visitId}
					accessibilityRole="button"
					accessibilityLabel={`${visit.patientName}, ${visit.care}`}
					style={styles.rowPress}
				>
					<TimeColumn startTime={visit.startTime} color={timeColor} />
					<View style={styles.mid}>
						<Text style={styles.name} numberOfLines={1}>
							{visit.patientName}
						</Text>
						<SubLine instant={instant} text={[visit.care, visit.area].filter(Boolean).join(' · ')} />
					</View>
				</Pressable>
				{canStart && (
					<TouchableOpacity
						onPress={onOpen}
						activeOpacity={0.8}
						style={styles.action}
						accessibilityRole="button"
						accessibilityLabel={`${visit.inProgress ? 'Continue' : 'Start'} visit for ${visit.patientName}`}
					>
						<View style={styles.startCircle}>
							<AppPathIcon d={PATHS.play} size={16} strokeWidth={2} color={APP_COLORS.primary} />
						</View>
						<Text style={styles.actionLabel}>{visit.inProgress ? 'Continue' : 'Start'}</Text>
					</TouchableOpacity>
				)}
				{chip && (
					<View style={[styles.chip, { backgroundColor: chip.bg }]}>
						<Text style={[styles.chipText, { color: chip.ink }]} numberOfLines={1}>
							{chip.label}
						</Text>
					</View>
				)}
				{active && (
					<TouchableOpacity
						onPress={onMore}
						activeOpacity={0.7}
						style={styles.more}
						accessibilityRole="button"
						accessibilityLabel={`More for ${visit.patientName}`}
					>
						<AppPathIcon d={PATHS.more} size={20} strokeWidth={3} color={APP_COLORS.inkMuted} />
					</TouchableOpacity>
				)}
			</View>
			{instant && active && isToday && (
				<Text style={[styles.note, { color: SCH.instantInk }]}>
					Instant · accepted · the patient is expecting you
				</Text>
			)}
		</View>
	)
}

const styles = StyleSheet.create({
	card: {
		paddingHorizontal: 14,
		paddingVertical: 2,
		borderRadius: 16,
		borderWidth: 1,
		backgroundColor: APP_COLORS.surface,
	},
	cardHead: { marginTop: 10, marginBottom: 2, gap: 2 },
	cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
	cardTitle: { fontSize: 12, lineHeight: 16, fontWeight: '800', letterSpacing: 0.7 },
	cardSub: { fontSize: 12, lineHeight: 16, color: APP_COLORS.inkMuted },
	row: { gap: 6, paddingVertical: 12, borderTopWidth: 1, borderTopColor: SCH.rule },
	rowMain: { flexDirection: 'row', alignItems: 'center', gap: 12 },
	rowPress: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 12 },
	timeCol: { width: 56 },
	time: { fontSize: 14, lineHeight: 18, fontWeight: '800' },
	ampm: { fontSize: 11, lineHeight: 14, color: APP_COLORS.inkMuted },
	mid: { flex: 1, minWidth: 0, gap: 2 },
	name: { fontSize: 15, lineHeight: 20, fontWeight: '700', color: APP_COLORS.ink },
	subRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
	sub: { flexShrink: 1, fontSize: 12, lineHeight: 16, color: APP_COLORS.inkMuted },
	action: { width: 56, alignItems: 'center', gap: 3 },
	startCircle: {
		width: 36,
		height: 36,
		borderRadius: 18,
		backgroundColor: APP_COLORS.mint,
		alignItems: 'center',
		justifyContent: 'center',
	},
	actionLabel: { fontSize: 11, lineHeight: 13, fontWeight: '800', color: APP_COLORS.primary },
	chip: { height: 22, paddingHorizontal: 8, borderRadius: 6, justifyContent: 'center' },
	chipText: { fontSize: 11, fontWeight: '800' },
	more: { width: 32, height: 36, marginRight: -8, alignItems: 'center', justifyContent: 'center' },
	note: { marginLeft: 68, fontSize: 12, lineHeight: 16, fontWeight: '700' },
})
