// "New login on your account" card (warningBg): device + when, "Was this you?" with "No, log it out" /
// "Yes, it was me". After "No", the caller swaps it for a short "That device is logged out" status.

import React, { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { AppButton } from '../../../../components/common'
import { APP_COLORS } from '../../../../config/theme'
import type { Session } from '../../../auth/authService'
import { deviceName, relativeTime } from './DeviceRow'

export type NewLoginAlertProps = {
	session: Session
	onNotMe: () => Promise<void>
	onWasMe: () => Promise<void>
}

export function NewLoginAlert({ session, onNotMe, onWasMe }: NewLoginAlertProps) {
	const [busy, setBusy] = useState<'no' | 'yes' | null>(null)

	const run = async (which: 'no' | 'yes') => {
		setBusy(which)
		try {
			await (which === 'no' ? onNotMe() : onWasMe())
		} finally {
			setBusy(null)
		}
	}

	return (
		<View style={styles.card} accessibilityRole="alert">
			<View style={styles.head}>
				<MaterialCommunityIcons name="alert-circle-outline" size={22} color={APP_COLORS.warning} />
				<View style={styles.flex}>
					<Text style={styles.title}>New login on your account</Text>
					<Text style={styles.sub}>
						{[deviceName(session), session.ip_address].filter(Boolean).join(' · ')}
					</Text>
					<Text style={styles.sub}>{relativeTime(session.login_at)}</Text>
				</View>
			</View>
			<Text style={styles.question}>Was this you?</Text>
			<View style={styles.actions}>
				<AppButton
					variant="outline"
					size="sm"
					style={styles.flex}
					onPress={() => run('no')}
					loading={busy === 'no'}
					disabled={!!busy}
				>
					No, log it out
				</AppButton>
				<AppButton
					variant="primary"
					size="sm"
					style={styles.flex}
					onPress={() => run('yes')}
					loading={busy === 'yes'}
					disabled={!!busy}
				>
					Yes, it was me
				</AppButton>
			</View>
		</View>
	)
}

const styles = StyleSheet.create({
	flex: {
		flex: 1,
	},
	card: {
		marginHorizontal: 16,
		marginTop: 12,
		padding: 14,
		borderRadius: 12,
		backgroundColor: APP_COLORS.warningBg,
		gap: 10,
	},
	head: {
		flexDirection: 'row',
		gap: 10,
	},
	title: {
		fontSize: 15,
		lineHeight: 20,
		fontWeight: '800',
		color: APP_COLORS.warning,
	},
	sub: {
		fontSize: 12,
		lineHeight: 16,
		color: APP_COLORS.ink,
	},
	question: {
		fontSize: 14,
		lineHeight: 20,
		fontWeight: '700',
		color: APP_COLORS.ink,
	},
	actions: {
		flexDirection: 'row',
		gap: 8,
	},
})

export default NewLoginAlert
