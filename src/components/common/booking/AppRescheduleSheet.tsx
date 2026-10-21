// src/components/common/booking/AppRescheduleSheet.tsx
//
// "Reschedule appointment / pickup" bottom sheet from the KarolaHealth designs: the current slot struck
// through, a date block (title + month label + whatever date control the caller renders), the slot area
// (groups of slot chips, or a loading / empty state), a reassurance note and a "Confirm · day, time" footer
// that stays grey until something is picked. Presentational: the caller owns the dates, slots and the
// reschedule call.

import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { APP_COLORS } from '../../../config/theme'
import { AppButton } from '../buttons/AppButton'
import { AppBottomSheet } from '../layout/AppBottomSheet'

export type AppRescheduleSheetProps = {
	visible: boolean
	title: string
	subtitle?: string
	/** "Fri 26 Sep, 7–9 AM" (rendered struck through next to "Current"). */
	currentLabel: string
	/** Right of "Pick a new date", e.g. "Sep – Oct". */
	monthLabel?: string
	/** The date control (a DateStrip, a day row, ...). */
	dateSection: React.ReactNode
	/** The slot area: slot groups, a spinner or an empty message. */
	children: React.ReactNode
	/** Small line with a shield icon at the bottom. */
	note: string
	/** Footer label: "Confirm · Fri 26 Sep, 7–9 AM" once picked, else "Select a new time". */
	confirmLabel: string
	/** Nothing to confirm yet. */
	confirmDisabled: boolean
	/** The reschedule call is in flight. */
	busy?: boolean
	onConfirm: () => void
	onClose: () => void
}

export function AppRescheduleSheet({
	visible,
	title,
	subtitle,
	currentLabel,
	monthLabel,
	dateSection,
	children,
	note,
	confirmLabel,
	confirmDisabled,
	busy = false,
	onConfirm,
	onClose,
}: AppRescheduleSheetProps) {
	return (
		<AppBottomSheet
			appearance="modern"
			showHeaderDivider={false}
			visible={visible}
			title={title}
			subtitle={subtitle}
			// AppBottomSheet always animates itself closed before calling onClose, so a no-op here would
			// desync it from `visible`; an in-flight reschedule still resolves through the caller.
			onClose={onClose}
			dismissible={!busy}
			maxHeightRatio={0.92}
			footer={
				// Only greyed when there is nothing to confirm; while busy the handler guards re-entry.
				<AppButton
					size="lg"
					onPress={onConfirm}
					disabled={confirmDisabled}
					loading={busy}
					accessibilityState={{ disabled: confirmDisabled }}
					style={confirmDisabled ? styles.confirmDisabled : undefined}
					labelStyle={styles.confirmText}
				>
					{confirmLabel}
				</AppButton>
			}
		>
			<View style={styles.body}>
				<View style={styles.currentRow}>
					<Text style={styles.currentTag}>Current</Text>
					<Text style={styles.currentValue}>{currentLabel}</Text>
				</View>

				<View style={styles.block}>
					<View style={styles.dateHead}>
						<Text style={styles.blockTitle}>Pick a new date</Text>
						{!!monthLabel && <Text style={styles.monthLabel}>{monthLabel}</Text>}
					</View>
					{dateSection}
				</View>

				{children}

				<View style={styles.noteRow}>
					<MaterialCommunityIcons name="shield-check-outline" size={16} color={APP_COLORS.primary} />
					<Text style={styles.noteText}>{note}</Text>
				</View>
			</View>
		</AppBottomSheet>
	)
}

/** Heading + content block inside the sheet body (a slot group: "Morning", "Afternoon", ...). */
export function AppRescheduleGroup({ label, children }: { label: string; children: React.ReactNode }) {
	return (
		<View style={styles.block}>
			<Text style={styles.groupLabel}>{label}</Text>
			{children}
		</View>
	)
}

const styles = StyleSheet.create({
	// AppBottomSheet supplies the 16px side padding and bottom padding above the footer.
	body: { gap: 14 },
	currentRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
		paddingVertical: 10,
		paddingHorizontal: 12,
		borderRadius: 12,
		backgroundColor: APP_COLORS.pageBg,
	},
	currentTag: { fontSize: 13, lineHeight: 18, fontWeight: '600', color: APP_COLORS.inkMuted },
	currentValue: {
		flex: 1,
		fontSize: 13,
		lineHeight: 18,
		fontWeight: '700',
		color: APP_COLORS.inkMuted,
		textDecorationLine: 'line-through',
	},
	block: { gap: 8 },
	dateHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
	blockTitle: { fontSize: 15, lineHeight: 20, fontWeight: '800', color: APP_COLORS.ink },
	monthLabel: { fontSize: 12, lineHeight: 16, color: APP_COLORS.inkMuted },
	groupLabel: { fontSize: 13, lineHeight: 18, fontWeight: '700', color: APP_COLORS.inkMuted },
	noteRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
	noteText: { flex: 1, fontSize: 12, lineHeight: 16, color: APP_COLORS.inkMuted },
	// Overrides Paper's disabled palette so the blocked CTA keeps the design's grey fill + white label.
	confirmDisabled: { backgroundColor: APP_COLORS.inkDisabled },
	confirmText: { fontWeight: '700', color: '#FFFFFF' },
})
