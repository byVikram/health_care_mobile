// src/features/dashboard/components/HealthQrSheet.tsx
//
// "My health QR" sheet (design qrOpen): mint card with the patient's avatar, name and display id, a QR code
// encoding the patient's public id (GET /api/patients/me/summary), Save / Share actions and a privacy note.
// react-native-view-shot isn't installed, so both actions share the patient ID as text via the OS share
// sheet rather than the QR image. Opened with useHomeSheets().open('qr'); rendered once by <HomeSheetsHost />.
import React from 'react'
import { ActivityIndicator, Share, StyleSheet, Text, View } from 'react-native'
import QRCode from 'react-native-qrcode-svg'
import { AppAvatar, AppBottomSheet, AppButton, AppPathIcon } from '../../../components/common'
import { APP_COLORS } from '../../../config/theme'
import { useAuth } from '../../../context/AuthContext'
import { HOME_CHROME_PATHS } from '../homeChromeIcons'
import { usePatientSummary } from '../useHomeChromeData'

export interface HealthQrSheetProps {
	visible: boolean
	onClose: () => void
}

const QR_SIZE = 200

export default function HealthQrSheet({ visible, onClose }: HealthQrSheetProps) {
	const { user } = useAuth()
	const { summary, settled } = usePatientSummary(visible)

	const name = summary?.name || user?.name || 'Patient'
	const avatarUri = summary?.avatar_url || user?.avatar || null
	const displayId = summary?.display_id || ''
	const qrValue = summary?.public_id || ''
	const shareId = displayId || qrValue

	const shareText = async (message: string) => {
		try {
			await Share.share({ title: 'My health QR', message })
		} catch {
			// Share sheet dismissed or unavailable; nothing to do.
		}
	}

	const handleSave = () => {
		void shareText(`Karolahealth patient ID: ${shareId}`)
	}

	const handleShare = () => {
		void shareText(
			`${name}'s Karolahealth patient ID is ${shareId}. Show it at the clinic, lab or pharmacy to open my records.`
		)
	}

	return (
		<AppBottomSheet
			visible={visible}
			onClose={onClose}
			title="My health QR"
			subtitle="Scan at the clinic, lab or pharmacy"
			appearance="modern"
			showHeaderDivider={false}
			maxHeightRatio={0.92}
		>
			<View style={styles.body}>
				<View style={styles.card}>
					<View style={styles.identity}>
						<AppAvatar
							uri={avatarUri}
							name={name}
							size={44}
							borderWidth={2}
							borderColor={APP_COLORS.surface}
						/>
						<View style={styles.identityText}>
							<Text style={styles.name} numberOfLines={1}>
								{name}
							</Text>
							{!!displayId && <Text style={styles.patientId}>Patient ID · {displayId}</Text>}
						</View>
					</View>

					<View
						style={styles.qrBox}
						accessible
						accessibilityRole="image"
						accessibilityLabel={
							qrValue
								? `QR code for ${name}${displayId ? `, patient ID ${displayId}` : ''}`
								: 'QR code unavailable'
						}
					>
						{qrValue ? (
							<QRCode
								value={qrValue}
								size={QR_SIZE}
								color={APP_COLORS.ink}
								backgroundColor={APP_COLORS.surface}
							/>
						) : (
							<View style={styles.qrPlaceholder}>
								{settled ? (
									<Text style={styles.qrUnavailable}>
										Your QR code couldn't be loaded. Please try again later.
									</Text>
								) : (
									<ActivityIndicator color={APP_COLORS.primary} />
								)}
							</View>
						)}
					</View>

					<Text style={styles.note}>Staff scan this to open your records and check you in.</Text>
				</View>

				<View style={styles.actions}>
					<AppButton
						variant="outline"
						size="md"
						icon="download"
						onPress={handleSave}
						disabled={!shareId}
						style={styles.action}
						contentStyle={styles.actionContent}
						labelStyle={styles.actionLabel}
						accessibilityLabel="Save patient ID"
					>
						Save
					</AppButton>
					<AppButton
						size="md"
						icon="share-variant"
						onPress={handleShare}
						disabled={!shareId}
						style={styles.action}
						contentStyle={styles.actionContent}
						labelStyle={styles.actionLabel}
						accessibilityLabel="Share patient ID"
					>
						Share
					</AppButton>
				</View>

				<View style={styles.privacy}>
					<AppPathIcon d={HOME_CHROME_PATHS.shield} size={16} color={APP_COLORS.primary} strokeWidth={2} />
					<Text style={styles.privacyText}>Only verified Karolahealth staff can open it</Text>
				</View>
			</View>
		</AppBottomSheet>
	)
}

const styles = StyleSheet.create({
	body: {
		alignItems: 'center',
		gap: 16,
		paddingTop: 8,
	},
	card: {
		alignSelf: 'stretch',
		alignItems: 'center',
		gap: 14,
		padding: 20,
		borderRadius: 16,
		backgroundColor: APP_COLORS.mint,
	},
	identity: {
		alignSelf: 'stretch',
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
	},
	identityText: {
		flex: 1,
		minWidth: 0,
	},
	name: {
		fontSize: 16,
		lineHeight: 22,
		fontWeight: '800',
		color: APP_COLORS.ink,
	},
	patientId: {
		fontSize: 12,
		lineHeight: 16,
		color: APP_COLORS.inkMuted,
	},
	qrBox: {
		padding: 12,
		borderRadius: 12,
		backgroundColor: APP_COLORS.surface,
		shadowColor: APP_COLORS.shadow,
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.08,
		shadowRadius: 3,
		elevation: 1,
	},
	qrPlaceholder: {
		width: QR_SIZE,
		height: QR_SIZE,
		alignItems: 'center',
		justifyContent: 'center',
		padding: 16,
	},
	qrUnavailable: {
		fontSize: 13,
		lineHeight: 18,
		color: APP_COLORS.inkMuted,
		textAlign: 'center',
	},
	note: {
		fontSize: 13,
		lineHeight: 18,
		color: APP_COLORS.ink,
		textAlign: 'center',
	},
	actions: {
		alignSelf: 'stretch',
		flexDirection: 'row',
		gap: 8,
	},
	action: {
		flex: 1,
	},
	actionContent: {
		height: 48,
	},
	actionLabel: {
		fontSize: 15,
		fontWeight: '700',
	},
	privacy: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
	},
	privacyText: {
		fontSize: 12,
		lineHeight: 16,
		color: APP_COLORS.inkMuted,
	},
})
