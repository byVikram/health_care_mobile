// Single logout confirmation used everywhere (sidebar, every persona's profile, settings): centered modal with a
// danger icon circle, "Logout" title, "Are you sure you want to logout?" and Cancel / Logout buttons.

import React from 'react'
import { StyleSheet, View } from 'react-native'
import { useTheme } from 'react-native-paper'
import { AppButton } from '../buttons/AppButton'
import { AppModal } from '../layout/AppModal'
import { AppTypography } from '../display/AppTypography'
import { APP_COLORS } from '../../../config/theme'
import LogoutIcon from '../../../assets/icons/logout.svg'

export type LogoutConfirmModalProps = {
	visible: boolean
	onCancel: () => void
	onConfirm: () => void | Promise<void>
}

export function LogoutConfirmModal({ visible, onCancel, onConfirm }: LogoutConfirmModalProps) {
	const theme = useTheme()

	return (
		<AppModal visible={visible} onDismiss={onCancel} contentContainerStyle={styles.container}>
			<View style={styles.content}>
				<View style={styles.iconCircle}>
					<LogoutIcon width={27} height={27} />
				</View>

				<AppTypography variant="h3" align="center" style={styles.title}>
					Logout
				</AppTypography>

				<AppTypography
					variant="body"
					align="center"
					numberOfLines={1}
					adjustsFontSizeToFit
					style={styles.message}
				>
					Are you sure you want to logout?
				</AppTypography>
			</View>

			<View style={styles.actions}>
				<AppButton
					variant="outline"
					style={[styles.button, styles.cancelButton, { borderColor: theme.colors.outline }]}
					textColor={theme.colors.onSurfaceVariant}
					onPress={onCancel}
				>
					Cancel
				</AppButton>
				<AppButton
					style={styles.button}
					buttonColor={theme.colors.error || APP_COLORS.danger}
					textColor={APP_COLORS.surface}
					onPress={() => void onConfirm()}
				>
					Logout
				</AppButton>
			</View>
		</AppModal>
	)
}

const styles = StyleSheet.create({
	container: {
		width: '84%',
		maxWidth: 340,
		alignSelf: 'center',
		borderRadius: 18,
		padding: 0,
		overflow: 'hidden',
	},
	content: {
		alignItems: 'center',
		paddingHorizontal: 20,
		paddingTop: 20,
		paddingBottom: 16,
	},
	iconCircle: {
		width: 62,
		height: 62,
		borderRadius: 31,
		backgroundColor: APP_COLORS.dangerBg,
		alignItems: 'center',
		justifyContent: 'center',
		marginBottom: 12,
	},
	title: {
		color: APP_COLORS.ink,
		fontSize: 20,
		lineHeight: 26,
		fontWeight: '800',
		marginBottom: 4,
	},
	message: {
		color: APP_COLORS.inkMuted,
		fontSize: 14,
		lineHeight: 20,
		maxWidth: '100%',
	},
	actions: {
		flexDirection: 'row',
		gap: 12,
		padding: 14,
		borderTopWidth: 1,
		borderTopColor: APP_COLORS.divider,
	},
	button: {
		flex: 1,
		borderRadius: 10,
	},
	cancelButton: {
		backgroundColor: APP_COLORS.surface,
	},
})

export default LogoutConfirmModal
