// src/components/common/feedback/AppConfirmSheet.tsx
//
// Confirmation sheet from the profile designs ("Delete your account?", "Delete Home?", "Log out of
// Chrome on Windows?", "Remove Raghav from family?"): modern AppBottomSheet with a 14/20 muted message and
// two side-by-side 48px buttons — outlined cancel + confirm (danger by default). The confirm button shows a
// spinner while `onConfirm` resolves and the sheet can't be dismissed meanwhile.

import React, { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { AppBottomSheet } from '../layout/AppBottomSheet'
import { AppButton } from '../buttons/AppButton'
import { APP_COLORS } from '../../../config/theme'

export type AppConfirmSheetProps = {
	visible: boolean
	onClose: () => void
	title: string
	message?: string
	confirmLabel?: string
	cancelLabel?: string
	tone?: 'danger' | 'primary'
	onConfirm: () => void | Promise<void>
}

export function AppConfirmSheet({
	visible,
	onClose,
	title,
	message,
	confirmLabel = 'Delete',
	cancelLabel = 'Cancel',
	tone = 'danger',
	onConfirm,
}: AppConfirmSheetProps) {
	const [busy, setBusy] = useState(false)

	const handleConfirm = async () => {
		setBusy(true)
		try {
			await onConfirm()
		} finally {
			setBusy(false)
		}
	}

	return (
		<AppBottomSheet
			visible={visible}
			onClose={onClose}
			title={title}
			appearance="modern"
			showHeaderDivider={false}
			dismissible={!busy}
		>
			<View style={styles.body}>
				{!!message && <Text style={styles.message}>{message}</Text>}
				<View style={styles.actions}>
					<AppButton variant="outline" size="md" style={styles.button} onPress={onClose} disabled={busy}>
						{cancelLabel}
					</AppButton>
					<AppButton
						variant={tone === 'danger' ? 'danger' : 'primary'}
						size="md"
						style={styles.button}
						onPress={handleConfirm}
						loading={busy}
						disabled={busy}
					>
						{confirmLabel}
					</AppButton>
				</View>
			</View>
		</AppBottomSheet>
	)
}

const styles = StyleSheet.create({
	body: {
		gap: 16,
		paddingBottom: 12,
	},
	message: {
		fontSize: 14,
		lineHeight: 20,
		color: APP_COLORS.inkMuted,
	},
	actions: {
		flexDirection: 'row',
		gap: 8,
	},
	button: {
		flex: 1,
	},
})

export default AppConfirmSheet
