// src/features/ancillary/staff/availability/GoOnlinePermissionsPage.tsx
//
// "Before you go online" (nurse design 7). Opened by ensureGoOnlinePermissions() when the Today availability
// switch is turned on while a required permission is missing. Rows reflect the real OS state (re-read when the
// provider returns from Settings); "Go online" unlocks once location and notifications are granted and then
// hands control back to the switch, which carries on going online. Leaving the screen any other way cancels.
import React, { useCallback, useEffect, useState } from 'react'
import { AppState, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { AppButton, AppScreenHeader } from '../../../../components/common'
import { APP_COLORS, TONES } from '../../../../config/theme'
import {
	getGoOnlinePermissionState,
	isReadyToGoOnline,
	openAppSettings,
	requestLocationPermission,
	requestNotificationPermission,
	resolveGoOnlineGate,
	type GoOnlinePermissionState,
} from './goOnlinePermissions'

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name']

type RowProps = {
	icon: IconName
	title: string
	subtitle: string
	done: boolean
	actionLabel: string
	onAction: () => void
	last?: boolean
}

function PermissionRow({ icon, title, subtitle, done, actionLabel, onAction, last }: RowProps) {
	const tone = done ? { bg: APP_COLORS.successBg, ink: APP_COLORS.success } : TONES.sand
	return (
		<View style={[styles.row, !last && styles.rowDivider]}>
			<View style={[styles.tile, { backgroundColor: tone.bg }]}>
				<MaterialCommunityIcons name={icon} size={20} color={tone.ink} />
			</View>
			<View style={styles.rowText}>
				<Text style={styles.rowTitle}>{title}</Text>
				<Text style={styles.rowSub}>{subtitle}</Text>
			</View>
			{done ? (
				<View style={styles.doneWrap} accessibilityLabel={`${title}: done`}>
					<MaterialCommunityIcons name="check" size={16} color={APP_COLORS.success} />
					<Text style={styles.doneText}>Done</Text>
				</View>
			) : (
				<TouchableOpacity
					style={styles.action}
					onPress={onAction}
					accessibilityRole="button"
					accessibilityLabel={`${actionLabel}: ${title}`}
				>
					<Text style={styles.actionText}>{actionLabel}</Text>
				</TouchableOpacity>
			)}
		</View>
	)
}

export default function GoOnlinePermissionsPage() {
	const navigation = useNavigation()
	const insets = useSafeAreaInsets()
	const [state, setState] = useState<GoOnlinePermissionState | null>(null)

	const refresh = useCallback(async () => setState(await getGoOnlinePermissionState()), [])

	useEffect(() => {
		void refresh()
		const sub = AppState.addEventListener('change', (s) => {
			if (s === 'active') void refresh()
		})
		return () => sub.remove()
	}, [refresh])

	// Any exit other than "Go online" (back button, swipe, hardware back) cancels the pending switch.
	useEffect(() => () => resolveGoOnlineGate(false), [])

	const ready = !!state && isReadyToGoOnline(state)
	const locationOk = !!state && state.location && state.locationServices
	const doneCount = [locationOk, !!state?.notifications].filter(Boolean).length
	const locationNeedsSettings = !!state && (state.locationBlocked || (state.location && !state.locationServices))

	const askLocation = async () => {
		if (locationNeedsSettings) return openAppSettings()
		await requestLocationPermission()
		await refresh()
	}

	const askNotifications = async () => {
		await requestNotificationPermission()
		const next = await getGoOnlinePermissionState()
		setState(next)
		if (!next.notifications) openAppSettings()
	}

	const goOnline = () => {
		resolveGoOnlineGate(true)
		navigation.goBack()
	}

	return (
		<View style={styles.page}>
			<AppScreenHeader
				variant="bar"
				title="Before you go online"
				subtitle={state ? `${doneCount} of 2 done` : 'Checking…'}
				onBack={() => navigation.goBack()}
			/>
			<ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
				<View style={styles.card}>
					<Text style={styles.h2}>So you never miss a request</Text>
					<Text style={styles.lead}>
						Requests ring for only 30 seconds. Allow these once and they’ll reach you even when your phone
						is locked.
					</Text>
					<PermissionRow
						icon="map-marker-outline"
						title="Location"
						subtitle={
							state?.location && !state.locationServices
								? 'Turn location on in your phone settings'
								: 'Find requests near you while the app is open'
						}
						done={locationOk}
						actionLabel={locationNeedsSettings ? 'Settings' : 'Allow'}
						onAction={askLocation}
					/>
					<PermissionRow
						icon="bell-outline"
						title="Notifications"
						subtitle="Show visit requests and updates"
						done={!!state?.notifications}
						actionLabel="Allow"
						onAction={askNotifications}
					/>
					<View style={styles.tip}>
						<View style={[styles.tile, { backgroundColor: TONES.sky.bg }]}>
							<MaterialCommunityIcons name="battery-heart-variant" size={20} color={TONES.sky.ink} />
						</View>
						<View style={styles.rowText}>
							<Text style={styles.rowTitle}>Keep the app open</Text>
							<Text style={styles.rowSub}>
								Stay in the app while you’re online and switch battery saving off for it, so your phone
								doesn’t close it.
							</Text>
						</View>
						<TouchableOpacity
							style={styles.outline}
							onPress={openAppSettings}
							accessibilityRole="button"
							accessibilityLabel="Open app settings"
						>
							<Text style={styles.outlineText}>Settings</Text>
						</TouchableOpacity>
					</View>
				</View>
				{!ready && state ? (
					<View style={styles.notice}>
						<Text style={styles.noticeText}>
							{2 - doneCount} left. Without these, requests may not reach you when your phone is locked.
						</Text>
					</View>
				) : null}
			</ScrollView>
			<View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) + 8 }]}>
				<AppButton variant="primary" size="lg" softDisabled disabled={!ready} onPress={goOnline}>
					Go online
				</AppButton>
			</View>
		</View>
	)
}

const styles = StyleSheet.create({
	page: {
		flex: 1,
		backgroundColor: APP_COLORS.pageBg,
	},
	content: {
		paddingTop: 8,
		paddingBottom: 16,
		gap: 8,
	},
	card: {
		backgroundColor: APP_COLORS.surface,
		padding: 16,
	},
	h2: {
		fontSize: 18,
		lineHeight: 24,
		fontWeight: '800',
		color: APP_COLORS.ink,
	},
	lead: {
		marginTop: 4,
		marginBottom: 4,
		fontSize: 13,
		lineHeight: 18,
		color: APP_COLORS.inkMuted,
	},
	row: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		paddingVertical: 14,
	},
	rowDivider: {
		borderBottomWidth: 1,
		borderBottomColor: APP_COLORS.divider,
	},
	tip: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		paddingTop: 14,
	},
	tile: {
		width: 40,
		height: 40,
		borderRadius: 12,
		alignItems: 'center',
		justifyContent: 'center',
	},
	rowText: {
		flex: 1,
		minWidth: 0,
	},
	rowTitle: {
		fontSize: 15,
		lineHeight: 20,
		fontWeight: '800',
		color: APP_COLORS.ink,
	},
	rowSub: {
		fontSize: 12,
		lineHeight: 16,
		color: APP_COLORS.inkMuted,
	},
	doneWrap: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
	},
	doneText: {
		fontSize: 13,
		fontWeight: '800',
		color: APP_COLORS.success,
	},
	action: {
		height: 36,
		paddingHorizontal: 14,
		borderRadius: 10,
		backgroundColor: APP_COLORS.primary,
		alignItems: 'center',
		justifyContent: 'center',
	},
	actionText: {
		fontSize: 13,
		fontWeight: '700',
		color: '#FFFFFF',
	},
	outline: {
		height: 36,
		paddingHorizontal: 14,
		borderRadius: 10,
		borderWidth: 1.5,
		borderColor: APP_COLORS.primary,
		backgroundColor: APP_COLORS.surface,
		alignItems: 'center',
		justifyContent: 'center',
	},
	outlineText: {
		fontSize: 13,
		fontWeight: '700',
		color: APP_COLORS.primary,
	},
	notice: {
		marginHorizontal: 16,
		padding: 12,
		borderRadius: 12,
		backgroundColor: APP_COLORS.warningBg,
	},
	noticeText: {
		fontSize: 13,
		lineHeight: 18,
		fontWeight: '700',
		color: APP_COLORS.warning,
	},
	footer: {
		backgroundColor: APP_COLORS.surface,
		borderTopWidth: 1,
		borderTopColor: APP_COLORS.divider,
		paddingTop: 12,
		paddingHorizontal: 16,
	},
})
