// src/features/ancillary/staff/schedule/ManageVisitSheet.tsx
//
// The ⋮ sheet of a visit on the Schedule (ancillary schedule design S7 / S12): who and when, then one row per action with a
// tinted icon tile - Navigate, Call, Visit details, "Running late" (any visit due today that she has not reached yet: the patient
// is told) and, for an instant visit, "I'm on my way"; the last rows give the visit back: "Can't make it" (one visit), or for a
// booking of several days "Can't make this day" and "Release all remaining days" (this day and the later ones she holds).
import React from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { AppBottomSheet, AppPathIcon } from '../../../../components/common'
import { APP_COLORS } from '../../../../config/theme'
import { formatTimeSlot } from '../../../../utils/formatters'
import { canReportRunningLate } from './RunningLateSheet'
import { longDay, type ScheduleVisit } from './scheduleModel'
import { PATHS } from './scheduleTheme'

export type ManageAction =
	'navigate' | 'call' | 'details' | 'onTheWay' | 'late' | 'release' | 'releaseDay' | 'releaseRest'

type Item = {
	action: ManageAction
	label: string
	sub: string
	icon: string
	tile: { bg: string; ink: string }
	danger?: boolean
}

const MINT = { bg: APP_COLORS.mint, ink: APP_COLORS.primary }
const AMBER = { bg: APP_COLORS.warningBg, ink: APP_COLORS.warning }
const RED = { bg: APP_COLORS.dangerBg, ink: APP_COLORS.danger }

type Props = {
	visible: boolean
	visit: ScheduleVisit | null
	/** How many days of this order she holds from this one on (decides "Can't make it" vs the day / remaining-days pair). */
	remainingDays: number
	onClose: () => void
	onAction: (action: ManageAction, visit: ScheduleVisit) => void
}

export function ManageVisitSheet({ visible, visit, remainingDays, onClose, onAction }: Props) {
	if (!visit) return null
	const first = visit.patientName.split(' ')[0]
	const instant = visit.kind === 'instant'
	const canLate = visit.state === 'active' && canReportRunningLate(visit.status, visit.date)
	const when = visit.startTime ? `${longDay(visit.date)} · ${formatTimeSlot(visit.startTime)}` : 'Instant visit'
	const line = [when, visit.count > 1 ? `Day ${visit.index} of ${visit.count}` : null, visit.care]
		.filter(Boolean)
		.join(' · ')

	const items: Item[] = []
	if (instant) {
		items.push({
			action: 'onTheWay',
			label: 'I’m on my way',
			sub: `Lets ${first} know you are heading there`,
			icon: PATHS.nav,
			tile: MINT,
		})
	}
	items.push(
		{ action: 'navigate', label: 'Navigate', sub: visit.area || 'Open directions', icon: PATHS.nav, tile: MINT },
		{ action: 'call', label: `Call ${first}`, sub: 'Opens the dialer', icon: PATHS.phone, tile: MINT }
	)
	if (!instant) {
		items.push({
			action: 'details',
			label: 'Visit details',
			sub: 'Care notes, address and patient history',
			icon: PATHS.file,
			tile: MINT,
		})
	}
	if (canLate) {
		items.push({
			action: 'late',
			label: 'Running late',
			sub: `Tell ${first} you need a few more minutes`,
			icon: PATHS.calendar,
			tile: AMBER,
		})
	}
	if (remainingDays > 1) {
		items.push(
			{
				action: 'releaseDay',
				label: 'Can’t make this day',
				sub: `${longDay(visit.date)} only · another nurse takes it`,
				icon: PATHS.release,
				tile: AMBER,
			},
			{
				action: 'releaseRest',
				label: 'Release all remaining days',
				sub: `${remainingDays} days from ${longDay(visit.date)} · another nurse takes them`,
				icon: PATHS.close,
				tile: RED,
				danger: true,
			}
		)
	} else {
		items.push({
			action: 'release',
			label: instant ? 'Can’t make it' : 'Can’t make this visit',
			sub: instant ? 'We’ll offer it to other nurses nearby' : 'Release it · another nurse takes it',
			icon: instant ? PATHS.close : PATHS.release,
			tile: instant ? RED : AMBER,
			danger: instant,
		})
	}

	return (
		<AppBottomSheet
			visible={visible}
			title={instant ? 'Instant visit' : 'Manage visit'}
			onClose={onClose}
			appearance="modern"
			showHeaderDivider={false}
		>
			<View style={styles.body}>
				<View style={styles.who}>
					<Text style={styles.whoName}>{visit.patientName}</Text>
					<Text style={styles.whoLine}>{line}</Text>
				</View>
				{items.map((item) => (
					<TouchableOpacity
						key={item.action}
						onPress={() => onAction(item.action, visit)}
						activeOpacity={0.7}
						style={styles.item}
						accessibilityRole="button"
					>
						<View style={[styles.tile, { backgroundColor: item.tile.bg }]}>
							<AppPathIcon d={item.icon} size={20} strokeWidth={2.2} color={item.tile.ink} />
						</View>
						<View style={styles.itemText}>
							<Text style={[styles.itemLabel, item.danger && { color: APP_COLORS.danger }]}>
								{item.label}
							</Text>
							<Text style={styles.itemSub} numberOfLines={1}>
								{item.sub}
							</Text>
						</View>
						<AppPathIcon d={PATHS.chevronRight} size={16} strokeWidth={2.4} color={APP_COLORS.inkMuted} />
					</TouchableOpacity>
				))}
			</View>
		</AppBottomSheet>
	)
}

const styles = StyleSheet.create({
	body: { gap: 0 },
	who: { padding: 12, borderRadius: 12, backgroundColor: APP_COLORS.pageBg, marginBottom: 6 },
	whoName: { fontSize: 15, lineHeight: 20, fontWeight: '700', color: APP_COLORS.ink },
	whoLine: { fontSize: 12, lineHeight: 16, color: APP_COLORS.inkMuted },
	item: {
		minHeight: 60,
		paddingVertical: 8,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		borderBottomWidth: 1,
		borderBottomColor: '#EEF2F2',
	},
	tile: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
	itemText: { flex: 1, minWidth: 0 },
	itemLabel: { fontSize: 15, lineHeight: 20, fontWeight: '800', color: APP_COLORS.ink },
	itemSub: { fontSize: 12, lineHeight: 16, color: APP_COLORS.inkMuted },
})
