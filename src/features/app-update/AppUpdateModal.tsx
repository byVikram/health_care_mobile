// src/features/app-update/AppUpdateModal.tsx
//
// "1.5 · Update required" (Offline & Models design): a centred card over a scrim with a download icon, "Update
// Karolahealth", one full-width "Update now" button and the version line. A MANDATORY update (installed build below
// the minimum supported one) can only be left by updating: no "Later", the scrim does nothing and the Android back
// button is ignored. An optional update (a newer build exists) adds "Later". "Update now" opens the download link the
// API sent (a direct APK link now, a store link later) and the card stays up, so coming back without installing
// still shows it; the next launch checks again.

import React, { useState } from 'react'
import { Linking, Modal, StyleSheet, Text, View } from 'react-native'
import { AppButton } from '../../components/common/buttons/AppButton'
import { AppPathIcon } from '../../components/common/display/AppIcon'
import { APP_COLORS } from '../../config/theme'
import type { AppUpdate } from '../../services/homeService'
import { isDownloadUrl } from './appUpdate'

const DOWNLOAD_ICON = 'M12 4v12M7 11l5 5 5-5M4 20h16'

const noop = () => {}

type Props = {
	update: AppUpdate
	/** True when the installed build is below the minimum supported one. */
	required: boolean
	/** "Later" (optional updates only). */
	onLater: () => void
}

export function AppUpdateModal({ update, required, onLater }: Props) {
	const [error, setError] = useState('')

	const openDownload = async () => {
		setError('')
		if (!isDownloadUrl(update.download_url)) {
			setError('The download link is not available right now. Please try again later.')
			return
		}
		try {
			await Linking.openURL(update.download_url)
			if (!required) onLater()
		} catch {
			setError("Couldn't open the download link. Please try again.")
		}
	}

	return (
		<Modal
			transparent
			visible
			animationType="fade"
			statusBarTranslucent
			// A required update cannot be dismissed with the Android back button.
			onRequestClose={required ? noop : onLater}
		>
			<View style={styles.scrim}>
				<View style={styles.card} accessibilityViewIsModal accessibilityRole="alert">
					<View style={styles.iconCircle} importantForAccessibility="no-hide-descendants">
						<AppPathIcon d={DOWNLOAD_ICON} size={30} strokeWidth={2.2} color={APP_COLORS.primary} />
					</View>
					<Text style={styles.title}>Update Karolahealth</Text>
					<Text style={styles.body}>
						{required
							? 'A new version is needed to keep your bookings and payments working safely. It takes less than a minute.'
							: 'A new version of Karolahealth is available with the latest improvements. It takes less than a minute.'}
					</Text>
					{!!update.release_notes?.trim() && (
						<Text style={styles.notes} numberOfLines={4}>
							{update.release_notes.trim()}
						</Text>
					)}
					{!!error && <Text style={styles.error}>{error}</Text>}

					<View style={styles.actions}>
						<AppButton
							size="lg"
							icon="download"
							onPress={() => void openDownload()}
							style={styles.fullWidth}
						>
							Update now
						</AppButton>
						{!required && (
							<AppButton variant="text" onPress={onLater} style={styles.fullWidth}>
								Later
							</AppButton>
						)}
						<Text style={styles.version}>Version {update.version_name}</Text>
					</View>
				</View>
			</View>
		</Modal>
	)
}

export default AppUpdateModal

const styles = StyleSheet.create({
	scrim: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		padding: 24,
		backgroundColor: '#12373E80',
	},
	card: {
		width: '100%',
		maxWidth: 420,
		alignItems: 'center',
		gap: 10,
		paddingTop: 24,
		paddingHorizontal: 20,
		paddingBottom: 16,
		borderRadius: 20,
		backgroundColor: APP_COLORS.surface,
		shadowColor: APP_COLORS.shadow,
		shadowOffset: { width: 0, height: 16 },
		shadowOpacity: 0.25,
		shadowRadius: 40,
		elevation: 12,
	},
	iconCircle: {
		width: 64,
		height: 64,
		borderRadius: 32,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: APP_COLORS.mint,
	},
	title: {
		marginTop: 4,
		fontSize: 20,
		lineHeight: 26,
		fontWeight: '800',
		textAlign: 'center',
		color: APP_COLORS.ink,
	},
	body: {
		fontSize: 14,
		lineHeight: 21,
		textAlign: 'center',
		color: APP_COLORS.inkMuted,
	},
	notes: {
		fontSize: 13,
		lineHeight: 19,
		textAlign: 'center',
		color: APP_COLORS.inkMuted,
	},
	error: {
		fontSize: 13,
		lineHeight: 18,
		textAlign: 'center',
		color: APP_COLORS.danger,
	},
	actions: {
		alignSelf: 'stretch',
		alignItems: 'center',
		marginTop: 8,
		gap: 8,
	},
	fullWidth: {
		alignSelf: 'stretch',
	},
	version: {
		fontSize: 12,
		color: APP_COLORS.border,
	},
})
