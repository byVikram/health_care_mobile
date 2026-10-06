// "Login & security": new-login alert, this device, other devices (log out one / all others) and safety
// tips. Login is OTP-only, so there is no password section.

import React, { useState } from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import Toast from 'react-native-toast-message'
import { AppConfirmSheet, AppInfoBanner, StatusModal } from '../../../components/common'
import { APP_COLORS } from '../../../config/theme'
import type { Session } from '../../auth/authService'
import { useSessions } from '../hooks/useSessions'
import { DeviceRow, deviceName } from './components/DeviceRow'
import { NewLoginAlert } from './components/NewLoginAlert'
import { ProfileScreen } from './components/ProfileScreen'

type Ask = { kind: 'one'; session: Session } | { kind: 'all' } | null

export default function LoginSecurityPage() {
	const { loading, error, reload, current, others, logOut, logOutOthers, acknowledge } = useSessions()
	const [ask, setAsk] = useState<Ask>(null)
	const [secured, setSecured] = useState(false)
	const [actionError, setActionError] = useState<string | null>(null)
	const flagged = others.find((s) => s.is_new)

	const guard = async (fn: () => Promise<void>) => {
		try {
			await fn()
		} catch (e) {
			setActionError(e instanceof Error ? e.message : 'Please try again.')
		}
	}

	const confirm = async () => {
		const target = ask
		setAsk(null)
		await guard(async () => {
			if (target?.kind === 'one') {
				await logOut(target.session.id)
				Toast.show({ type: 'success', text1: `${deviceName(target.session)} logged out` })
			} else if (target?.kind === 'all') {
				const n = await logOutOthers()
				Toast.show({
					type: 'success',
					text1: n ? `Logged out of ${n} other device${n > 1 ? 's' : ''}` : 'No other devices',
				})
			}
		})
	}

	return (
		<ProfileScreen
			title="Login & security"
			subtitle="Logged-in devices"
			loading={loading}
			loadError={error}
			onRetry={reload}
			overlays={
				<>
					<AppConfirmSheet
						visible={!!ask}
						onClose={() => setAsk(null)}
						title={
							ask?.kind === 'one'
								? `Log out ${deviceName(ask.session)}?`
								: 'Log out of all other devices?'
						}
						message={
							ask?.kind === 'all'
								? 'Every device except this phone will need an OTP to log in again. Bookings are not affected.'
								: 'That device will need an OTP to log in again. Bookings are not affected.'
						}
						confirmLabel="Log out"
						onConfirm={confirm}
					/>
					<StatusModal
						visible={!!actionError}
						status="error"
						title="Something went wrong"
						description={actionError || ''}
						submitText="OK"
						onSubmit={() => setActionError(null)}
					/>
				</>
			}
		>
			{flagged && !secured && (
				<NewLoginAlert
					session={flagged}
					onNotMe={() =>
						guard(async () => {
							await logOut(flagged.id)
							setSecured(true)
						})
					}
					onWasMe={() =>
						guard(async () => {
							await acknowledge(flagged.id)
							Toast.show({ type: 'success', text1: 'Thanks for confirming' })
						})
					}
				/>
			)}
			{secured && (
				<AppInfoBanner
					tone="success"
					icon={null}
					title="That device is logged out"
					subtitle="If someone else knows your OTP, contact support."
					style={styles.banner}
				/>
			)}

			{current && (
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>THIS DEVICE</Text>
					<DeviceRow session={current} />
				</View>
			)}

			<View style={styles.section}>
				<Text style={styles.sectionTitle}>OTHER DEVICES</Text>
				{others.length ? (
					others.map((s, i) => (
						<DeviceRow
							key={s.id}
							session={s}
							divider={i < others.length - 1}
							onLogOut={() => setAsk({ kind: 'one', session: s })}
						/>
					))
				) : (
					<Text style={styles.empty}>You’re only logged in on this phone</Text>
				)}
			</View>

			{others.length > 0 && (
				<TouchableOpacity
					style={styles.allButton}
					onPress={() => setAsk({ kind: 'all' })}
					accessibilityRole="button"
				>
					<MaterialCommunityIcons name="logout-variant" size={20} color={APP_COLORS.danger} />
					<Text style={styles.allText}>Log out of all other devices</Text>
				</TouchableOpacity>
			)}

			<View style={styles.tips}>
				<Text style={styles.tipTitle}>Don’t recognise a device?</Text>
				<Text style={styles.tipText}>
					Log it out now. If someone else knows your OTP, contact support. Logging out never cancels bookings.
				</Text>
			</View>
		</ProfileScreen>
	)
}

const styles = StyleSheet.create({
	banner: {
		marginHorizontal: 16,
		marginTop: 12,
	},
	section: {
		backgroundColor: APP_COLORS.surface,
		paddingHorizontal: 16,
		paddingTop: 6,
		paddingBottom: 4,
	},
	sectionTitle: {
		marginTop: 8,
		fontSize: 12,
		lineHeight: 16,
		fontWeight: '800',
		letterSpacing: 0.7,
		color: APP_COLORS.inkMuted,
	},
	empty: {
		paddingVertical: 14,
		fontSize: 13,
		lineHeight: 18,
		color: APP_COLORS.inkMuted,
	},
	allButton: {
		marginHorizontal: 16,
		height: 48,
		borderWidth: 1,
		borderColor: APP_COLORS.divider,
		borderRadius: 12,
		backgroundColor: APP_COLORS.surface,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 8,
	},
	allText: {
		fontSize: 15,
		fontWeight: '700',
		color: APP_COLORS.danger,
	},
	tips: {
		marginHorizontal: 16,
		padding: 14,
		borderRadius: 12,
		backgroundColor: APP_COLORS.mint,
		gap: 4,
	},
	tipTitle: {
		fontSize: 14,
		lineHeight: 20,
		fontWeight: '800',
		color: APP_COLORS.ink,
	},
	tipText: {
		fontSize: 13,
		lineHeight: 18,
		color: APP_COLORS.ink,
	},
})
