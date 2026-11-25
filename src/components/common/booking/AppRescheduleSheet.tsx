// src/components/common/booking/AppRescheduleSheet.tsx
//
// "Reschedule appointment / pickup" bottom sheet from the KarolaHealth designs: the current slot,
// a date block (title + month label + whatever date control the caller renders), the slot area
// (groups of slot chips, or a loading / empty state), a reassurance note and a "Confirm · day, time" footer
// that stays grey until something is picked. The caller owns the dates and slots and runs the reschedule in `onConfirm`, which
// RETURNS ITS RESULT, so a reschedule ends the same way for every service (doctor visit, home-care visit, lab, any later one) and
// the same way a cancellation does (AppCancelSheet): the sheet shows the spinner and blocks dismissing while it runs, then
//   ok     it closes at once, a success toast says `successTitle` / `successMessage`, and `onDone` runs the flow's follow-up (refresh,
//          update the page; it gets the result, so what the call returned in `data` needs no state of the flow's own)
//   error  it stays open with what was picked and shows the message in red above the button, so the user can pick another time (a
//          toast would sit behind the sheet and a status pop-up would stack a second layer on it); `onFailed` lets a flow react (the
//          lab reloads its free times, one may have just gone)
// No status pop-up after a reschedule, no spinner or success toast of the flow's own. A doctor does not pick a slot: the doctor's
// side is the "ask the patient to reschedule" sheet (features/doctor), which ends the same way (useSheetOutcome).

import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { APP_COLORS } from '../../../config/theme'
import { AppButton } from '../buttons/AppButton'
import { AppInfoBanner } from '../display/AppInfoBanner'
import { AppBottomSheet } from '../layout/AppBottomSheet'
import { useSheetOutcome, type SheetOk, type SheetResult } from './useSheetOutcome'

export type AppRescheduleOk<T = unknown> = SheetOk<T>
/** What `onConfirm` returns: `ok` (the call went through, `data` is what it gave back) or `error` (the text to show in the sheet). */
export type AppRescheduleResult<T = unknown> = SheetResult<T>

export type AppRescheduleSheetProps<T = unknown> = {
	visible: boolean
	title: string
	subtitle?: string
	/** "Fri 26 Sep, 7–9 AM" (shown next to "Current"). */
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
	/** Runs the reschedule and returns how it went (see AppRescheduleResult). */
	onConfirm: () => Promise<AppRescheduleResult<T>>
	/** What is said once it went through ("Appointment rescheduled"): the success toast. */
	successTitle: string
	successMessage?: string
	/** The reschedule went through (the toast is up): the flow's follow-up. Gets the result `onConfirm` returned. Defaults to `onClose`. */
	onDone?: (result: AppRescheduleOk<T>) => void
	/** The reschedule did not go through; the message is already in the sheet. */
	onFailed?: (error: string) => void
	/** Dismissing the sheet: nothing was rescheduled. */
	onClose: () => void
}

/** A readable message from a failed reschedule call (the server's `message`, a `detail` string or `detail.message`), else `fallback`. */
export { sheetErrorMessage as rescheduleErrorMessage } from './useSheetOutcome'

export function AppRescheduleSheet<T = unknown>({
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
	onConfirm,
	successTitle,
	successMessage,
	onDone,
	onFailed,
	onClose,
}: AppRescheduleSheetProps<T>) {
	const { busy, error, confirm } = useSheetOutcome<T>({
		visible,
		run: onConfirm,
		successTitle,
		successMessage,
		onDone: (result) => (onDone ? onDone(result) : onClose()),
		onFailed,
	})

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
				<View style={styles.footer}>
					{error ? <AppInfoBanner tone="danger" title={error} titleStyle={styles.errorText} /> : null}
					{/* Only greyed when there is nothing to confirm; while busy the handler guards re-entry. */}
					<AppButton
						size="lg"
						onPress={() => void confirm()}
						disabled={confirmDisabled}
						loading={busy}
						accessibilityState={{ disabled: confirmDisabled }}
						style={confirmDisabled ? styles.confirmDisabled : undefined}
						labelStyle={styles.confirmText}
					>
						{confirmLabel}
					</AppButton>
				</View>
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
	},
	block: { gap: 8 },
	dateHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
	blockTitle: { fontSize: 15, lineHeight: 20, fontWeight: '800', color: APP_COLORS.ink },
	monthLabel: { fontSize: 12, lineHeight: 16, color: APP_COLORS.inkMuted },
	groupLabel: { fontSize: 13, lineHeight: 18, fontWeight: '700', color: APP_COLORS.inkMuted },
	noteRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
	noteText: { flex: 1, fontSize: 12, lineHeight: 16, color: APP_COLORS.inkMuted },
	footer: { gap: 10 },
	errorText: { fontSize: 13, lineHeight: 19, fontWeight: '400', color: APP_COLORS.ink },
	// Overrides Paper's disabled palette so the blocked CTA keeps the design's grey fill + white label.
	confirmDisabled: { backgroundColor: APP_COLORS.inkDisabled },
	confirmText: { fontWeight: '700', color: '#FFFFFF' },
})
