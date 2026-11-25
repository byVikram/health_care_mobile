// src/features/ancillary/staff/today/ProviderHomeHeader.tsx
//
// The header of the provider Home ("Nursing · Today" of the Ancillary Home design): the dark ink header with its glow, the
// provider's photo (or initials) that opens the drawer, her name with a "Within 5 km" pill under it (taps through to Travel radius),
// the notifications bell, and a second row "Fri 20 Nov · 2 visits done today". The design dropped the old availability card, so the
// online switch lives here as a small Online / Offline pill on that second row: going offline must stay one tap away.
import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { AppAvatar, AppHeaderBackdrop, AppPathIcon } from '../../../../components/common'
import { APP_COLORS } from '../../../../config/theme'
import { HOME_CHROME_PATHS } from '../../../dashboard/homeChromeIcons'
import { PATHS } from '../schedule/scheduleTheme'

const GLASS = '#FFFFFF1F'

type Props = {
	name: string
	avatarUri?: string | null
	/** "Within 5 km"; the pill is left out when null. */
	areaLabel: string | null
	notificationCount: number
	/** "Fri 20 Nov" */
	dateLabel: string
	/** "2 visits done today"; left out when null. */
	doneLine: string | null
	/** null until the server answers. */
	online: boolean | null
	/** Status loading or a change in flight: the pill is locked. */
	busy: boolean
	onAvatarPress: () => void
	onAreaPress: () => void
	onNotificationsPress: () => void
	onToggleOnline: () => void
}

export function ProviderHomeHeader({
	name,
	avatarUri,
	areaLabel,
	notificationCount,
	dateLabel,
	doneLine,
	online,
	busy,
	onAvatarPress,
	onAreaPress,
	onNotificationsPress,
	onToggleOnline,
}: Props) {
	const insets = useSafeAreaInsets()
	const isOnline = online === true
	return (
		<View style={[styles.header, { paddingTop: insets.top + 8 }]}>
			<AppHeaderBackdrop />
			<View style={styles.topRow}>
				<Pressable
					onPress={onAvatarPress}
					accessibilityRole="button"
					accessibilityLabel="Open menu and profile"
					style={styles.avatar}
				>
					<AppAvatar
						uri={avatarUri}
						name={name}
						size={44}
						radius={10}
						borderWidth={0}
						backgroundColor={APP_COLORS.mint}
						initialsColor={APP_COLORS.primary}
					/>
				</Pressable>
				<View style={styles.nameCol}>
					<Text style={styles.name} numberOfLines={1}>
						{name}
					</Text>
					{!!areaLabel && (
						<Pressable
							onPress={onAreaPress}
							accessibilityRole="button"
							accessibilityLabel={`${areaLabel}. Change your travel radius`}
							style={styles.area}
						>
							<AppPathIcon d={PATHS.pin} size={14} strokeWidth={2.2} color={APP_COLORS.mintAccent} />
							<Text style={styles.areaText} numberOfLines={1}>
								{areaLabel}
							</Text>
							<AppPathIcon d={PATHS.chevronDown} size={14} strokeWidth={2.4} color="#FFFFFF" />
						</Pressable>
					)}
				</View>
				<Pressable
					onPress={onNotificationsPress}
					accessibilityRole="button"
					accessibilityLabel={
						notificationCount > 0 ? `Notifications, ${notificationCount} new` : 'Notifications'
					}
					style={styles.bell}
				>
					<AppPathIcon d={HOME_CHROME_PATHS.bell} size={22} strokeWidth={2} color="#FFFFFF" />
					{notificationCount > 0 && <View style={styles.bellDot} />}
				</Pressable>
			</View>

			<View style={styles.dayRow}>
				<Text style={styles.dayLine} numberOfLines={1}>
					{dateLabel}
					{!!doneLine && <Text style={styles.doneLine}>{` · ${doneLine}`}</Text>}
				</Text>
				<Pressable
					onPress={onToggleOnline}
					disabled={busy || online === null}
					accessibilityRole="switch"
					accessibilityState={{ checked: isOnline, disabled: busy || online === null }}
					accessibilityLabel="Taking instant requests"
					style={[styles.onlinePill, (busy || online === null) && styles.onlineBusy]}
				>
					<View
						style={[styles.onlineDot, { backgroundColor: isOnline ? APP_COLORS.mintAccent : '#7A8B8E' }]}
					/>
					<Text style={styles.onlineText}>{isOnline ? 'Online' : 'Offline'}</Text>
				</Pressable>
			</View>
		</View>
	)
}

const styles = StyleSheet.create({
	header: {
		position: 'relative',
		overflow: 'hidden',
		backgroundColor: APP_COLORS.ink,
		paddingHorizontal: 16,
		paddingBottom: 16,
		borderBottomLeftRadius: 24,
		borderBottomRightRadius: 24,
		gap: 12,
		zIndex: 2,
	},
	topRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52 },
	avatar: {
		width: 48,
		height: 48,
		borderRadius: 12,
		borderWidth: 2,
		borderColor: APP_COLORS.mintAccent,
		backgroundColor: APP_COLORS.mint,
		alignItems: 'center',
		justifyContent: 'center',
	},
	nameCol: { flex: 1, minWidth: 0 },
	name: { fontSize: 20, lineHeight: 26, fontWeight: '800', color: '#FFFFFF' },
	area: {
		alignSelf: 'flex-start',
		marginTop: 4,
		height: 28,
		paddingHorizontal: 10,
		borderRadius: 9999,
		backgroundColor: GLASS,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
	},
	areaText: { flexShrink: 1, fontSize: 12, fontWeight: '700', color: '#FFFFFF' },
	bell: {
		width: 44,
		height: 44,
		borderRadius: 12,
		backgroundColor: GLASS,
		alignItems: 'center',
		justifyContent: 'center',
	},
	bellDot: {
		position: 'absolute',
		right: 10,
		top: 9,
		width: 9,
		height: 9,
		borderRadius: 5,
		backgroundColor: APP_COLORS.mintAccent,
		borderWidth: 2,
		borderColor: APP_COLORS.ink,
	},
	dayRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
	dayLine: { flex: 1, fontSize: 13, lineHeight: 18, fontWeight: '700', color: '#FFFFFF' },
	doneLine: { color: APP_COLORS.mintAccent },
	onlinePill: {
		height: 32,
		paddingHorizontal: 12,
		borderRadius: 16,
		backgroundColor: GLASS,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
	},
	onlineBusy: { opacity: 0.6 },
	onlineDot: { width: 8, height: 8, borderRadius: 4 },
	onlineText: { fontSize: 12, fontWeight: '800', color: '#FFFFFF' },
})
