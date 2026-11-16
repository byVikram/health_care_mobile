// src/features/doctor/dashboard/ScheduleRow.tsx
//
// One line of the Schedule day list, from the "Doctor Dashboard NEW" design: the time stacked over AM/PM (amber when the patient is
// late, teal once they are checked in), the name, a mode icon with "Not arrived · 1h 30m late" / "In-clinic · 34 M · Follow-up",
// and on the right the one thing to do next with a caption under its round button -- Check in, Checked in, Start video -- or a chip
// ("In consultation", "Seen", "No-show"), then the three-dots button.
// The round button and the three dots are the shared AppIconButton, the chip AppTag. (The Past list uses the shared
// AppAppointmentRow instead: its rows have no stacked time or round action.)

import React from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { AppIconButton, AppTag } from '../../../components/common'
import { APP_COLORS, TONES } from '../../../config/theme'

const LATE_INK = TONES.sand.ink
const VIDEO_INK = TONES.sky.ink

export type RowAction =
	| { kind: 'checkin'; busy?: boolean; label?: string; onPress: () => void }
	| { kind: 'checkedin'; busy?: boolean; onPress: () => void }
	| { kind: 'video'; busy?: boolean; onPress: () => void }

export type RowChip = { text: string; bg: string; fg: string }

type Props = {
	/** "4:00 PM" */
	time: string
	/** The patient is late for the slot: the time is drawn in amber. */
	late?: boolean
	/** The patient is checked in: the time is drawn in teal. */
	ready?: boolean
	name: string
	video: boolean
	/** The line under the name, already put together: "Not arrived · 1h 30m late". */
	detail: string
	action?: RowAction
	chip?: RowChip
	/** A visit that is over (seen / cancelled / no-show): the name is muted. */
	muted?: boolean
	onPress: () => void
	/** Opens the actions sheet (reschedule, no-show, cancel). */
	onMore?: () => void
	divider: boolean
}

export function ScheduleRow({
	time,
	late,
	ready,
	name,
	video,
	detail,
	action,
	chip,
	muted,
	onPress,
	onMore,
	divider,
}: Props) {
	const [clock, meridiem] = time.split(' ')
	const timeColor = late ? LATE_INK : ready ? APP_COLORS.primary : APP_COLORS.ink
	return (
		<View style={[styles.row, divider && styles.rule]}>
			<TouchableOpacity activeOpacity={0.7} onPress={onPress} accessibilityRole="button" style={styles.main}>
				<View style={styles.timeCol}>
					<Text style={[styles.clock, { color: timeColor }]}>{clock}</Text>
					<Text style={styles.meridiem}>{meridiem}</Text>
				</View>
				<View style={styles.mid}>
					<Text numberOfLines={1} style={[styles.name, muted && styles.nameMuted]}>
						{name}
					</Text>
					<View style={styles.detailRow}>
						<MaterialCommunityIcons
							name={video ? 'video-outline' : 'hospital-building'}
							size={15}
							color={video ? VIDEO_INK : late ? LATE_INK : TONES.lilac.ink}
						/>
						<Text numberOfLines={1} style={styles.detail}>
							{detail}
						</Text>
					</View>
				</View>
			</TouchableOpacity>
			{!!chip && <AppTag label={chip.text} bg={chip.bg} ink={chip.fg} shape="pill" style={styles.chip} />}
			{!!action && <ActionButton action={action} name={name} />}
			{!!onMore && (
				<AppIconButton
					icon="dots-vertical"
					variant="ghost"
					size={36}
					iconColor={APP_COLORS.inkMuted}
					iconSize={20}
					onPress={onMore}
					accessibilityLabel={`More actions for ${name}`}
					style={styles.more}
				/>
			)}
		</View>
	)
}

function ActionButton({ action, name }: { action: RowAction; name: string }) {
	const spec =
		action.kind === 'checkedin'
			? {
					label: 'Checked in',
					icon: 'check' as const,
					bg: APP_COLORS.success,
					fg: '#FFFFFF',
					caption: APP_COLORS.success,
					a11y: `Undo check-in for ${name}`,
				}
			: action.kind === 'video'
				? {
						label: 'Start video',
						icon: 'video-outline' as const,
						bg: TONES.sky.bg,
						fg: VIDEO_INK,
						caption: VIDEO_INK,
						a11y: `Start the video visit with ${name}`,
					}
				: {
						label: action.label ?? 'Check in',
						icon: 'account-check-outline' as const,
						bg: APP_COLORS.mint,
						fg: APP_COLORS.primary,
						caption: APP_COLORS.primary,
						a11y: `Check in ${name}`,
					}
	return (
		<Pressable
			onPress={action.onPress}
			disabled={action.busy}
			accessibilityRole="button"
			accessibilityState={{ busy: !!action.busy }}
			accessibilityLabel={spec.a11y}
			style={styles.action}
		>
			{/* The whole column (caption included) is the button; the circle only draws, so it must not take the touch. */}
			<View pointerEvents="none">
				<AppIconButton
					circle
					size={44}
					icon={spec.icon}
					iconColor={spec.fg}
					backgroundColor={spec.bg}
					accessibilityLabel={spec.a11y}
				>
					{action.busy ? <ActivityIndicator size="small" color={spec.fg} /> : undefined}
				</AppIconButton>
			</View>
			<Text numberOfLines={1} style={[styles.caption, { color: spec.caption }]}>
				{spec.label}
			</Text>
		</Pressable>
	)
}

const styles = StyleSheet.create({
	row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
	rule: { borderBottomWidth: 1, borderBottomColor: APP_COLORS.divider },
	main: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12 },
	timeCol: { width: 46, flexShrink: 0 },
	clock: { fontSize: 16, lineHeight: 20, fontWeight: '800' },
	meridiem: { fontSize: 12, lineHeight: 16, color: APP_COLORS.inkMuted },
	mid: { flex: 1, minWidth: 0, gap: 2 },
	name: { fontSize: 16, lineHeight: 22, fontWeight: '800', color: APP_COLORS.ink },
	nameMuted: { color: APP_COLORS.inkMuted },
	detailRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
	detail: { flexShrink: 1, fontSize: 13, lineHeight: 18, color: APP_COLORS.inkMuted },
	chip: { flexShrink: 0, maxWidth: 130 },
	action: { width: 72, flexShrink: 0, alignItems: 'center', gap: 3, paddingVertical: 6 },
	caption: { fontSize: 12, lineHeight: 16, fontWeight: '800' },
	more: { flexShrink: 0, marginRight: -6 },
})
