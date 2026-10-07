// src/components/common/booking/AppCancelSheet.tsx
//
// "Cancel this appointment / order?" bottom sheet from the KarolaHealth designs: a "Tell us why (optional)"
// reason chip group, a "Prefer another time? Reschedule instead" hint and Keep it / Yes, cancel buttons.
// Presentational: the caller supplies the copy and the reasons and runs the actual cancellation
// (`onConfirm` gets the picked reason, if any); `busy` shows the spinner and blocks dismissing.

import React, { useEffect, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { APP_COLORS } from '../../../config/theme'
import { AppButton } from '../buttons/AppButton'
import { AppChip } from '../inputs/AppChip'
import { AppBottomSheet } from '../layout/AppBottomSheet'

export type AppCancelSheetProps = {
	visible: boolean
	title: string
	subtitle?: string
	reasons: string[]
	onClose: () => void
	onRescheduleInstead: () => void
	onConfirm: (reason: string | null) => void
	/** A cancellation is in flight: shows the spinner and keeps the sheet open. */
	busy?: boolean
}

export function AppCancelSheet({
	visible,
	title,
	subtitle,
	reasons,
	onClose,
	onRescheduleInstead,
	onConfirm,
	busy = false,
}: AppCancelSheetProps) {
	const [reason, setReason] = useState<string | null>(null)
	useEffect(() => {
		if (visible) setReason(null)
	}, [visible])

	return (
		<AppBottomSheet
			appearance="modern"
			showHeaderDivider={false}
			visible={visible}
			title={title}
			subtitle={subtitle}
			// AppBottomSheet always animates itself closed before calling onClose, so a no-op here would
			// desync it from `visible`; an in-flight cancel still resolves through the caller.
			onClose={onClose}
			dismissible={!busy}
			maxHeightRatio={0.88}
		>
			<View style={styles.body}>
				<View style={styles.reasonBlock}>
					<Text style={styles.reasonLabel}>Tell us why (optional)</Text>
					<View style={styles.chips} accessibilityRole="radiogroup" accessibilityLabel="Reason">
						{reasons.map((r) => {
							const on = reason === r
							return (
								<AppChip
									key={r}
									label={r}
									selected={on}
									onPress={() => setReason(on ? null : r)}
									variant="soft"
									shape="rounded"
									size="sm"
									radius={10}
									borderColor={APP_COLORS.divider}
									accessibilityRole="radio"
									style={styles.chip}
									textStyle={[styles.chipText, on && styles.chipTextOn]}
								/>
							)
						})}
					</View>
				</View>

				<View style={styles.rescheduleHint}>
					<MaterialCommunityIcons name="calendar-blank-outline" size={18} color={APP_COLORS.primary} />
					<Text style={styles.hintText}>
						Prefer another time?{' '}
						<Text style={styles.hintLink} onPress={onRescheduleInstead} accessibilityRole="button">
							Reschedule instead
						</Text>
					</Text>
				</View>

				<View style={styles.actions}>
					{/* Not `disabled` while busy: Paper greys disabled buttons out; the handlers guard instead. */}
					<AppButton variant="outline" size="lg" style={styles.btn} onPress={busy ? undefined : onClose}>
						Keep it
					</AppButton>
					<AppButton
						variant="danger"
						size="lg"
						style={[styles.btn, busy && styles.disabled]}
						onPress={() => !busy && onConfirm(reason)}
						loading={busy}
					>
						Yes, cancel
					</AppButton>
				</View>
			</View>
		</AppBottomSheet>
	)
}

const styles = StyleSheet.create({
	// AppBottomSheet supplies the 16px side padding and safe-area bottom padding.
	body: { paddingBottom: 4, gap: 14 },
	reasonBlock: { gap: 8 },
	reasonLabel: { fontSize: 13, lineHeight: 18, fontWeight: '700', color: APP_COLORS.ink },
	chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
	chip: { borderWidth: 1.5 },
	chipText: { fontWeight: '700' },
	chipTextOn: { color: APP_COLORS.primary },
	rescheduleHint: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		paddingVertical: 10,
		paddingHorizontal: 12,
		borderRadius: 12,
		backgroundColor: APP_COLORS.mint,
	},
	hintText: { flex: 1, fontSize: 13, lineHeight: 18, color: APP_COLORS.ink },
	hintLink: { color: APP_COLORS.primary, fontWeight: '700' },
	actions: { flexDirection: 'row', gap: 8 },
	btn: { flex: 1 },
	disabled: { opacity: 0.7 },
})
