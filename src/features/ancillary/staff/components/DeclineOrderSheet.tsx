// src/features/ancillary/staff/components/DeclineOrderSheet.tsx
//
// Bottom sheet the provider confirms a scheduled-order decline in: reason chips + confirm / keep buttons.
// The chosen reason is sent with POST /provider/me/orders/{id}/decline and shared with the patient.
import React, { useEffect, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { AppBottomSheet, AppButton, AppChip, AppInfoBanner } from '../../../../components/common'
import { APP_COLORS } from '../../../../config/theme'

export const DECLINE_REASONS = [
	'Not available at these times',
	'Too far from my location',
	'Service outside my expertise',
	'Personal emergency',
	'Other',
] as const

export type DeclineOrderSheetProps = {
	visible: boolean
	patientName?: string
	visitsCount?: number
	submitting?: boolean
	onClose: () => void
	onConfirm: (reason: string) => void
}

export function DeclineOrderSheet({
	visible,
	patientName,
	visitsCount = 1,
	submitting = false,
	onClose,
	onConfirm,
}: DeclineOrderSheetProps) {
	const [reason, setReason] = useState<string>(DECLINE_REASONS[0])

	useEffect(() => {
		if (visible) setReason(DECLINE_REASONS[0])
	}, [visible])

	const visitsText = visitsCount === 1 ? 'the visit' : `all ${visitsCount} visits`

	return (
		<AppBottomSheet
			visible={visible}
			title="Decline this booking?"
			subtitle={patientName ? `Request from ${patientName}` : undefined}
			onClose={onClose}
			appearance="modern"
			showHeaderDivider={false}
			dismissible={!submitting}
			footer={
				<View style={styles.footer}>
					<AppButton
						variant="outline"
						size="md"
						onPress={onClose}
						disabled={submitting}
						style={styles.footerBtn}
					>
						Keep request
					</AppButton>
					<AppButton
						variant="danger"
						size="md"
						onPress={() => onConfirm(reason)}
						loading={submitting}
						disabled={submitting}
						style={styles.footerBtn}
					>
						Decline
					</AppButton>
				</View>
			}
		>
			<View style={styles.body}>
				<Text style={styles.label} accessibilityRole="header">
					Reason
				</Text>
				<View style={styles.chips} accessibilityRole="radiogroup">
					{DECLINE_REASONS.map((r) => (
						<AppChip
							key={r}
							label={r}
							selected={reason === r}
							onPress={() => setReason(r)}
							variant="soft"
							shape="pill"
							size="sm"
							checkmark
							disabled={submitting}
							accessibilityRole="radio"
						/>
					))}
				</View>
				<AppInfoBanner
					tone="warning"
					title={`This cancels ${visitsText}`}
					subtitle="The patient is notified and can book another provider."
				/>
			</View>
		</AppBottomSheet>
	)
}

const styles = StyleSheet.create({
	body: {
		gap: 12,
		paddingBottom: 8,
	},
	label: {
		fontSize: 14,
		lineHeight: 20,
		fontWeight: '700',
		color: APP_COLORS.ink,
	},
	chips: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 8,
	},
	footer: {
		flexDirection: 'row',
		gap: 12,
	},
	footerBtn: {
		flex: 1,
	},
})

export default DeclineOrderSheet
