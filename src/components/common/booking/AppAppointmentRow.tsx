// src/components/common/booking/AppAppointmentRow.tsx
//
// The recurring "time+token / name+mode+meta / status chip" list row from the doctor dashboard
// designs (Up next, Later today, Schedule Today/Past, and reusable as-is for any future
// appointment-shaped list — Pharmacy/Laboratory order rows share the same shape: a fixed leading
// column, a name + coloured-detail line, and a trailing status chip). Rows stack inside an
// AppSoftCard with `divider` on every row but the last.

import React from 'react'
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View, type StyleProp, type ViewStyle } from 'react-native'
import { APP_COLORS, TONES, type ToneKey } from '../../../config/theme'
import { AppTag, type AppTagTone } from '../display/AppTag'

export type AppAppointmentRowAction = {
	label: string
	onPress: () => void
	loading?: boolean
	disabled?: boolean
}

export type AppAppointmentRowProps = {
	/** e.g. "5:30 PM". Left column, fixed 56px width. */
	time: string
	/** e.g. "Token 06". Small muted caption under `time`. */
	token?: string
	name: string
	/** e.g. "Video" / "In-clinic" — rendered bold in `modeColor` (or a ToneKey's ink). */
	mode?: string
	modeColor?: string
	modeTone?: ToneKey
	/** e.g. "Follow-up" / "34 yrs · Male". Appended after `mode` with a "· " separator. */
	meta?: string
	/** Status chip on the right, e.g. "Checked in", "Waiting". */
	status?: string
	statusTone?: AppTagTone
	/**
	 * A small filled button after the status chip (e.g. "Check In" on a not_arrived row). Generic on
	 * purpose — any future appointment-shaped list (Pharmacy/Laboratory order rows) can use it for
	 * its own one-tap action instead of the row just being a plain navigate-to-detail press target.
	 */
	action?: AppAppointmentRowAction
	onPress?: () => void
	/** Bottom divider border. Defaults to true; pass false for the last row in a list. */
	divider?: boolean
	style?: StyleProp<ViewStyle>
}

export function AppAppointmentRow({
	time,
	token,
	name,
	mode,
	modeColor,
	modeTone,
	meta,
	status,
	statusTone = 'mint',
	action,
	onPress,
	divider = true,
	style,
}: AppAppointmentRowProps) {
	const resolvedModeColor = modeColor ?? (modeTone ? TONES[modeTone].ink : APP_COLORS.primary)
	const Wrapper = onPress ? TouchableOpacity : View

	return (
		<Wrapper
			style={[styles.row, divider && styles.divider, style]}
			{...(onPress ? { onPress, accessibilityRole: 'button' as const, activeOpacity: 0.7 } : {})}
		>
			<View style={styles.timeCol}>
				<Text style={styles.time} numberOfLines={1}>
					{time}
				</Text>
				{!!token && (
					<Text style={styles.token} numberOfLines={1}>
						{token}
					</Text>
				)}
			</View>
			<View style={styles.mid}>
				<Text style={styles.name} numberOfLines={1}>
					{name}
				</Text>
				{(mode || meta) && (
					<Text style={styles.metaLine} numberOfLines={1}>
						{!!mode && <Text style={[styles.mode, { color: resolvedModeColor }]}>{mode}</Text>}
						{mode && meta ? ' · ' : ''}
						{meta}
					</Text>
				)}
			</View>
			{!!status && <AppTag label={status} tone={statusTone} />}
			{!!action && (
				<TouchableOpacity
					style={[styles.actionBtn, action.disabled && styles.actionBtnDisabled]}
					onPress={action.onPress}
					disabled={action.disabled || action.loading}
				>
					{action.loading ? (
						<ActivityIndicator size="small" color="#FFFFFF" />
					) : (
						<Text style={styles.actionBtnText} numberOfLines={1}>
							{action.label}
						</Text>
					)}
				</TouchableOpacity>
			)}
		</Wrapper>
	)
}

export default AppAppointmentRow

const styles = StyleSheet.create({
	row: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		paddingVertical: 12,
	},
	divider: {
		borderBottomWidth: 1,
		borderBottomColor: APP_COLORS.divider,
	},
	timeCol: {
		width: 56,
		flexShrink: 0,
	},
	time: {
		fontSize: 13,
		lineHeight: 18,
		fontWeight: '800',
		color: APP_COLORS.ink,
	},
	token: {
		fontSize: 11,
		lineHeight: 14,
		fontWeight: '600',
		color: APP_COLORS.inkMuted,
	},
	mid: {
		flex: 1,
		minWidth: 0,
		gap: 2,
	},
	name: {
		fontSize: 14,
		lineHeight: 20,
		fontWeight: '800',
		color: APP_COLORS.ink,
	},
	metaLine: {
		fontSize: 12,
		lineHeight: 16,
		color: APP_COLORS.inkMuted,
	},
	mode: {
		fontWeight: '700',
	},
	actionBtn: {
		flexShrink: 0,
		height: 32,
		paddingHorizontal: 12,
		borderRadius: 8,
		backgroundColor: APP_COLORS.primary,
		alignItems: 'center',
		justifyContent: 'center',
	},
	actionBtnDisabled: { backgroundColor: APP_COLORS.disabledBtn },
	actionBtnText: { fontSize: 12, lineHeight: 16, fontWeight: '700', color: '#FFFFFF' },
})
