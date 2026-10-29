// src/features/ancillary/components/CancelVisitsSheet.tsx
//
// "Cancel visits" bottom sheet (design: Later · 3 · Booking details): pick one visit or all of the remaining ones
// (AppCheckList 'list' with an "All remaining visits" master row), a required Reason (AppChipGroup), what it costs,
// and Keep visits / Cancel N visits. A visit that can't be cancelled any more (too close to its start, or already
// sent to a provider) is listed but locked, with the reason. Presentational: the page runs the cancellation
// (`onConfirm` gets the picked ids + reason).

import React, { useEffect, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { APP_COLORS } from '../../../config/theme'
import { AppBottomSheet, AppButton, AppCheckList, AppChipGroup } from '../../../components/common'

export type CancelVisitRow = {
	id: string
	/** "Visit 2 · Tue 26 Sep". */
	title: string
	/** "7:00 PM · next visit". */
	sub: string
	/** "₹199". */
	fee: string
	/** False once the visit can no longer be cancelled. */
	canCancel: boolean
	/** Why it is locked, when it is. */
	lockedNote?: string
}

export const CANCEL_REASONS = ['Plans changed', 'Feeling better', 'Booked by mistake', 'Other']

export type CancelVisitsSheetProps = {
	visible: boolean
	rows: CancelVisitRow[]
	/** Ticked when the sheet opens (the visit the patient was looking at, else the first one that can be cancelled). */
	initialId?: string | null
	/** The cancellation call is in flight. */
	busy?: boolean
	onClose: () => void
	onConfirm: (visitIds: string[], reason: string) => void
}

export function CancelVisitsSheet({
	visible,
	rows,
	initialId,
	busy = false,
	onClose,
	onConfirm,
}: CancelVisitsSheetProps) {
	const cancellable = rows.filter((r) => r.canCancel)
	const [pickedIds, setPicked] = useState<string[]>([])
	// The order refreshes while the sheet is open: a visit that became too close (or was sent to a provider) drops out.
	const picked = pickedIds.filter((id) => cancellable.some((r) => r.id === id))
	const [reason, setReason] = useState<string | null>(null)

	useEffect(() => {
		if (!visible) return
		const first = cancellable.find((r) => r.id === initialId) ?? cancellable[0]
		setPicked(first ? [first.id] : [])
		setReason(null)
		// Only on open: the rows refresh while the page polls and must not reset the patient's picks.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [visible])

	const n = picked.length
	const allOn = cancellable.length > 0 && n === cancellable.length
	const ready = n > 0 && !!reason
	const toggle = (id: string, on: boolean) =>
		setPicked((p) => (on ? [...p.filter((x) => x !== id), id] : p.filter((x) => x !== id)))
	const ctaLabel = !n
		? 'Pick a visit'
		: allOn && n > 1
			? `Cancel all ${n} visits`
			: `Cancel ${n} visit${n === 1 ? '' : 's'}`

	return (
		<AppBottomSheet
			appearance="modern"
			showHeaderDivider={false}
			visible={visible}
			title="Cancel visits"
			subtitle="Pick one visit or all of them"
			onClose={onClose}
			dismissible={!busy}
			maxHeightRatio={0.92}
			footer={
				<View style={styles.actions}>
					<AppButton variant="outline" size="lg" style={styles.btn} onPress={busy ? undefined : onClose}>
						Keep visits
					</AppButton>
					<AppButton
						variant="danger"
						size="lg"
						style={[styles.btn, !ready && styles.dangerOff]}
						disabled={!ready}
						loading={busy}
						onPress={() => !busy && onConfirm(picked, reason as string)}
					>
						{ctaLabel}
					</AppButton>
				</View>
			}
		>
			<View style={styles.body}>
				<View style={styles.list}>
					<View style={styles.allRow}>
						<AppCheckList
							variant="list"
							tone="danger"
							items={[
								{
									key: 'all',
									label: 'All remaining visits',
									checked: allOn ? true : n ? 'mixed' : false,
									trailing: `${n} of ${cancellable.length}`,
									disabled: !cancellable.length,
								},
							]}
							onToggle={() => setPicked(allOn ? [] : cancellable.map((r) => r.id))}
						/>
					</View>
					<AppCheckList
						variant="list"
						tone="danger"
						items={rows.map((r) => ({
							key: r.id,
							label: r.title,
							sub: r.canCancel ? r.sub : (r.lockedNote ?? r.sub),
							trailing: r.fee,
							checked: picked.includes(r.id),
							disabled: !r.canCancel,
						}))}
						onToggle={toggle}
					/>
				</View>

				<View style={styles.reasonBlock}>
					<Text style={styles.reasonLabel}>Reason</Text>
					<AppChipGroup
						single
						options={CANCEL_REASONS}
						values={reason ? [reason] : []}
						onChange={(v) => setReason(v[0] ?? null)}
						accessibilityLabel="Reason"
					/>
				</View>

				<View style={styles.charge}>
					<View style={styles.chargeText}>
						<Text style={styles.chargeTitle}>Charges</Text>
						<Text style={styles.chargeSub}>You pay after each visit, so nothing is charged</Text>
					</View>
					<Text style={styles.chargeAmount}>₹0</Text>
				</View>
			</View>
		</AppBottomSheet>
	)
}

const styles = StyleSheet.create({
	body: { gap: 14 },
	list: { borderWidth: 1, borderColor: APP_COLORS.divider, borderRadius: 12, overflow: 'hidden' },
	allRow: { backgroundColor: APP_COLORS.pageBg, borderBottomWidth: 1, borderBottomColor: APP_COLORS.divider },
	reasonBlock: { gap: 8 },
	reasonLabel: { fontSize: 13, lineHeight: 18, fontWeight: '800', color: APP_COLORS.ink },
	charge: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		gap: 8,
		paddingHorizontal: 12,
		paddingVertical: 10,
		borderRadius: 10,
		backgroundColor: APP_COLORS.pageBg,
	},
	chargeText: { flex: 1, minWidth: 0 },
	chargeTitle: { fontSize: 13, lineHeight: 18, fontWeight: '800', color: APP_COLORS.ink },
	chargeSub: { fontSize: 12, lineHeight: 16, color: APP_COLORS.inkMuted },
	chargeAmount: { fontSize: 18, lineHeight: 24, fontWeight: '800', color: APP_COLORS.ink },
	actions: { flexDirection: 'row', gap: 8 },
	btn: { flex: 1 },
	// A blocked "Cancel" keeps the design's faded red instead of Paper's grey.
	dangerOff: { backgroundColor: '#D9A39C' },
})
