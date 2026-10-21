// src/features/doctor/dashboard/TodayPatients.tsx
//
// Schedule -> Today, from the "Doctor schedule" design: an All / Upcoming / Done tab strip with count
// pills, an All types / In-clinic / Video chip row, and one card of patient rows -- time,
// name, "mode · age gender", a status dot + text, and (for patients still to be seen) the round
// check-in toggle and a three-dots button for Reschedule / Cancel (see TodayActionSheet). After one of those the
// row shows what happened ("Cancelled · patient notified", "Moved to ...") in place of the buttons. The counts follow
// the visit-type chip, like the design.

import React from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { AppPathIcon } from '../../../components/common'
import { APP_COLORS } from '../../../config/theme'

export type TodayTab = 'every' | 'upcoming' | 'done'
export type TodayVisit = 'any' | 'clinic' | 'video'

const VIDEO_BLUE = '#2463A8'
const NOT_ARRIVED = '#7A8B8E'
const DANGER = '#B42318'
const TRACK = '#E9EEEF'
const CHECK = 'M5 12l5 5 9-10'

export function TodayTabs({
	value,
	counts,
	onChange,
}: {
	value: TodayTab
	counts: Record<TodayTab, number>
	onChange: (v: TodayTab) => void
}) {
	const tabs: { id: TodayTab; label: string }[] = [
		{ id: 'every', label: 'All' },
		{ id: 'upcoming', label: 'Upcoming' },
		{ id: 'done', label: 'Done' },
	]
	return (
		<View style={styles.track} accessibilityRole="tablist" accessibilityLabel="Appointments">
			{tabs.map((t) => {
				const on = t.id === value
				return (
					<TouchableOpacity
						key={t.id}
						accessibilityRole="tab"
						accessibilityState={{ selected: on }}
						activeOpacity={0.8}
						onPress={() => onChange(t.id)}
						style={[styles.tab, on && styles.tabOn]}
					>
						<Text
							numberOfLines={1}
							style={[styles.tabText, { color: on ? APP_COLORS.ink : APP_COLORS.inkMuted }]}
						>
							{t.label}
						</Text>
						<View style={[styles.count, { backgroundColor: on ? APP_COLORS.ink : APP_COLORS.divider }]}>
							<Text style={[styles.countText, { color: on ? '#FFFFFF' : APP_COLORS.ink }]}>
								{counts[t.id]}
							</Text>
						</View>
					</TouchableOpacity>
				)
			})}
		</View>
	)
}

const VISIT_CHIPS: { id: TodayVisit; label: string; icon?: string }[] = [
	{ id: 'any', label: 'All types' },
	{ id: 'clinic', label: 'In-clinic', icon: 'M3 21h18M5 21V8l7-5 7 5v13M10 21v-5h4v5' },
	{ id: 'video', label: 'Video', icon: 'M3 6h12v12H3zM15 10l6-3v10l-6-3z' },
]

export function TodayVisitChips({ value, onChange }: { value: TodayVisit; onChange: (v: TodayVisit) => void }) {
	return (
		<View style={styles.chips} accessibilityRole="radiogroup" accessibilityLabel="Visit type">
			{VISIT_CHIPS.map((c) => {
				const on = c.id === value
				const color = on ? APP_COLORS.primary : APP_COLORS.inkMuted
				return (
					<TouchableOpacity
						key={c.id}
						accessibilityRole="radio"
						accessibilityState={{ checked: on }}
						activeOpacity={0.8}
						onPress={() => onChange(c.id)}
						style={[styles.chip, on && styles.chipOn]}
					>
						{!!c.icon && <AppPathIcon d={c.icon} size={14} strokeWidth={2.2} color={color} />}
						<Text numberOfLines={1} style={[styles.chipText, { color }]}>
							{c.label}
						</Text>
					</TouchableOpacity>
				)
			})}
		</View>
	)
}

export type TodayRowProps = {
	time: string
	name: string
	video: boolean
	/** "34 yrs · Male" */
	meta: string
	done: boolean
	checkedIn: boolean
	busy?: boolean
	divider: boolean
	onPress: () => void
	onToggle: () => void
	/** Opens the Reschedule / Cancel sheet. */
	onMore?: () => void
	/** What was done to this appointment from the sheet; replaces the buttons. */
	outcome?: { text: string; tone: 'danger' | 'info' }
}

export function TodayPatientRow({
	time,
	name,
	video,
	meta,
	done,
	checkedIn,
	busy,
	divider,
	onPress,
	onToggle,
	onMore,
	outcome,
}: TodayRowProps) {
	const statusColor = outcome
		? outcome.tone === 'danger'
			? DANGER
			: VIDEO_BLUE
		: done
			? APP_COLORS.primary
			: checkedIn
				? APP_COLORS.success
				: NOT_ARRIVED
	const statusText = outcome ? outcome.text : done ? 'Completed' : checkedIn ? 'Checked in' : 'Not arrived'
	const cancelled = outcome?.tone === 'danger'
	return (
		<View style={[styles.row, divider && styles.rowRule]}>
			<TouchableOpacity activeOpacity={0.7} onPress={onPress} accessibilityRole="button" style={styles.rowMain}>
				<View style={styles.timeCol}>
					<Text numberOfLines={1} style={styles.time}>
						{time}
					</Text>
				</View>
				<View style={styles.mid}>
					<Text numberOfLines={1} style={[styles.name, outcome && styles.nameMuted, cancelled && styles.struck]}>
						{name}
					</Text>
					<Text numberOfLines={1} style={styles.metaLine}>
						<Text style={[styles.mode, { color: video ? VIDEO_BLUE : APP_COLORS.primary }]}>
							{video ? 'Video' : 'In-clinic'}
						</Text>
						{meta ? ` · ${meta}` : ''}
					</Text>
					<View style={styles.status}>
						<View style={[styles.dot, { backgroundColor: statusColor }]} />
						<Text numberOfLines={1} style={[styles.statusText, { color: statusColor }]}>
							{statusText}
						</Text>
					</View>
				</View>
			</TouchableOpacity>
			{!done && !outcome && (
				<Pressable
					onPress={onToggle}
					disabled={busy}
					accessibilityRole="switch"
					accessibilityState={{ checked: checkedIn, busy }}
					accessibilityLabel={checkedIn ? `Undo check-in for ${name}` : `Check in ${name}`}
					style={styles.toggleHit}
				>
					<View
						style={[
							styles.ring,
							{
								borderStyle: checkedIn ? 'solid' : 'dashed',
								borderColor: checkedIn ? APP_COLORS.success : '#9FB4B6',
								backgroundColor: checkedIn ? APP_COLORS.success : '#FFFFFF',
							},
						]}
					>
						{busy ? (
							<ActivityIndicator size="small" color={checkedIn ? '#FFFFFF' : APP_COLORS.primary} />
						) : (
							<AppPathIcon
								d={CHECK}
								size={16}
								strokeWidth={3}
								color={checkedIn ? '#FFFFFF' : APP_COLORS.dotInactive}
							/>
						)}
					</View>
				</Pressable>
			)}
			{!done && !outcome && !!onMore && (
				<Pressable
					onPress={onMore}
					accessibilityRole="button"
					accessibilityLabel={`More actions for ${name}`}
					style={styles.moreHit}
				>
					<MaterialCommunityIcons name="dots-vertical" size={20} color={APP_COLORS.inkMuted} />
				</Pressable>
			)}
		</View>
	)
}

const styles = StyleSheet.create({
	track: { flexDirection: 'row', gap: 4, padding: 4, borderRadius: 12, backgroundColor: TRACK },
	tab: {
		flex: 1,
		minWidth: 0,
		height: 38,
		borderRadius: 9,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 6,
	},
	tabOn: {
		backgroundColor: '#FFFFFF',
		shadowColor: APP_COLORS.ink,
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.16,
		shadowRadius: 3,
		elevation: 1,
	},
	tabText: { flexShrink: 1, fontSize: 13, fontWeight: '800' },
	count: {
		minWidth: 20,
		height: 18,
		paddingHorizontal: 6,
		borderRadius: 9999,
		alignItems: 'center',
		justifyContent: 'center',
	},
	countText: { fontSize: 11, lineHeight: 14, fontWeight: '800' },

	chips: { flexDirection: 'row', alignItems: 'center', gap: 8 },
	chip: {
		height: 32,
		paddingHorizontal: 12,
		borderRadius: 9999,
		borderWidth: 1,
		borderColor: APP_COLORS.divider,
		backgroundColor: '#FFFFFF',
		flexDirection: 'row',
		alignItems: 'center',
		gap: 5,
	},
	chipOn: { backgroundColor: APP_COLORS.mint, borderColor: APP_COLORS.primary },
	chipText: { fontSize: 12, fontWeight: '700' },

	row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
	rowRule: { borderBottomWidth: 1, borderBottomColor: APP_COLORS.divider },
	rowMain: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
	// Wide enough for "11:00 AM" at 13px/800 -- 56 clipped it on real devices.
	timeCol: { width: 64, flexShrink: 0 },
	time: { fontSize: 13, lineHeight: 18, fontWeight: '800', color: APP_COLORS.ink },
	mid: { flex: 1, minWidth: 0, gap: 2 },
	name: { fontSize: 14, lineHeight: 20, fontWeight: '800', color: APP_COLORS.ink },
	nameMuted: { color: NOT_ARRIVED },
	struck: { textDecorationLine: 'line-through' },
	metaLine: { fontSize: 12, lineHeight: 16, color: APP_COLORS.inkMuted },
	mode: { fontWeight: '700' },
	status: { marginTop: 2, flexDirection: 'row', alignItems: 'center', gap: 6 },
	dot: { width: 7, height: 7, borderRadius: 9999 },
	statusText: { flexShrink: 1, fontSize: 12, lineHeight: 16, fontWeight: '700' },
	// Sits close to the check-in toggle, like the design (a narrower hit area that overlaps its edge).
	moreHit: { width: 32, height: 44, marginLeft: -6, marginRight: -6, flexShrink: 0, alignItems: 'center', justifyContent: 'center' },
	toggleHit: { width: 44, height: 44, flexShrink: 0, alignItems: 'center', justifyContent: 'center' },
	ring: { width: 32, height: 32, borderRadius: 9999, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
})
