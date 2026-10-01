// One logged-in device: 40px tile (phone / laptop; sand when it's a new login), device name, where / when,
// optional "New login" tag, and an outlined "Log out" button (hidden for this device).

import React from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { AppIconTile, AppTag } from '../../../../components/common'
import { APP_COLORS } from '../../../../config/theme'
import type { Session } from '../../../auth/authService'

export const isWebSession = (s: Session) =>
	/web|browser|desktop|chrome|windows|mac/i.test(`${s.device_type} ${s.device_name}`)

export const deviceName = (s: Session) => {
	const type = (s.device_type || '').toLowerCase()
	const kind = type === 'ios' ? 'iOS app' : type === 'android' ? 'Android app' : isWebSession(s) ? 'web' : ''
	return [s.device_name || (isWebSession(s) ? 'Browser' : 'Phone'), kind].filter(Boolean).join(' · ')
}

export const relativeTime = (iso?: string | null) => {
	if (!iso) return ''
	const then = new Date(iso.endsWith('Z') || /[+-]\d\d:\d\d$/.test(iso) ? iso : `${iso}Z`).getTime()
	const minutes = Math.max(0, Math.round((Date.now() - then) / 60000))
	if (minutes < 2) return 'just now'
	if (minutes < 60) return `${minutes} min ago`
	const hours = Math.round(minutes / 60)
	if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`
	const days = Math.round(hours / 24)
	return `${days} day${days > 1 ? 's' : ''} ago`
}

export type DeviceRowProps = {
	session: Session
	onLogOut?: () => void
	divider?: boolean
}

export function DeviceRow({ session, onLogOut, divider = false }: DeviceRowProps) {
	const web = isWebSession(session)
	const flagged = !!session.is_new
	const where = [
		session.ip_address,
		session.is_current ? 'active now' : relativeTime(session.last_active_at || session.login_at),
	]
		.filter(Boolean)
		.join(' · ')
	return (
		<View style={[styles.row, divider && styles.divider]}>
			<AppIconTile
				icon={web ? 'laptop' : 'cellphone'}
				backgroundColor={flagged ? APP_COLORS.warningBg : APP_COLORS.pageBg}
				iconColor={flagged ? APP_COLORS.warning : APP_COLORS.inkMuted}
				size={40}
			/>
			<View style={styles.text}>
				<Text style={styles.name} numberOfLines={1}>
					{deviceName(session)}
				</Text>
				<Text style={styles.where} numberOfLines={1}>
					{where}
				</Text>
				{flagged && (
					<AppTag
						label="New login"
						tone="pending"
						size="xs"
						shape="rounded"
						uppercase={false}
						style={styles.tag}
					/>
				)}
			</View>
			{session.is_current ? (
				<AppTag label="Active now" tone="confirmed" size="sm" shape="rounded" />
			) : onLogOut ? (
				<TouchableOpacity
					style={styles.logout}
					onPress={onLogOut}
					accessibilityRole="button"
					accessibilityLabel={`Log out ${deviceName(session)}`}
				>
					<Text style={styles.logoutText}>Log out</Text>
				</TouchableOpacity>
			) : null}
		</View>
	)
}

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
	text: {
		flex: 1,
		minWidth: 0,
	},
	name: {
		fontSize: 15,
		lineHeight: 20,
		fontWeight: '700',
		color: APP_COLORS.ink,
	},
	where: {
		fontSize: 12,
		lineHeight: 16,
		color: APP_COLORS.inkMuted,
	},
	tag: {
		alignSelf: 'flex-start',
		marginTop: 3,
	},
	logout: {
		height: 36,
		paddingHorizontal: 12,
		borderWidth: 1,
		borderColor: APP_COLORS.divider,
		borderRadius: 10,
		justifyContent: 'center',
	},
	logoutText: {
		fontSize: 13,
		fontWeight: '700',
		color: APP_COLORS.danger,
	},
})

export default DeviceRow
