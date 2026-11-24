// src/features/ancillary/components/CancelVisitsSheet.tsx
//
// "Cancel visits" (design: Later · 3 · Booking details) on the shared AppCancelSheet: the visits to cancel come first (one, or all of the
// remaining ones: AppCheckList 'list' with an "All remaining visits" master row), then a required Reason, what it costs, and
// Keep visits / Cancel N visits. A visit that can't be cancelled any more (too close to its start, or already sent to a provider) is
// listed but locked, with the reason. Presentational: the page runs the cancellation (`onConfirm` gets the picked ids + reason).

import React, { useEffect, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { APP_COLORS } from '../../../config/theme'
import { AppCancelSheet, AppCheckList, type AppCancelResult } from '../../../components/common'

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
	onClose: () => void
	/** Cancels the picked visits and returns how it went (the sheet shows the confirmation, or the error). */
	onConfirm: (visitIds: string[], reason: string) => Promise<AppCancelResult>
	/** The confirmation was closed. */
	onDone?: () => void
}

export function CancelVisitsSheet({ visible, rows, initialId, onClose, onConfirm, onDone }: CancelVisitsSheetProps) {
	const cancellable = rows.filter((r) => r.canCancel)
	const [pickedIds, setPicked] = useState<string[]>([])
	// The order refreshes while the sheet is open: a visit that became too close (or was sent to a provider) drops out.
	const picked = pickedIds.filter((id) => cancellable.some((r) => r.id === id))

	useEffect(() => {
		if (!visible) return
		const first = cancellable.find((r) => r.id === initialId) ?? cancellable[0]
		setPicked(first ? [first.id] : [])
		// Only on open: the rows refresh while the page polls and must not reset the patient's picks.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [visible])

	const n = picked.length
	const allOn = cancellable.length > 0 && n === cancellable.length
	const toggle = (id: string, on: boolean) =>
		setPicked((p) => (on ? [...p.filter((x) => x !== id), id] : p.filter((x) => x !== id)))
	const ctaLabel = !n
		? 'Pick a visit'
		: allOn && n > 1
			? `Cancel all ${n} visits`
			: `Cancel ${n} visit${n === 1 ? '' : 's'}`

	return (
		<AppCancelSheet
			visible={visible}
			title="Cancel visits"
			subtitle="Pick one visit or all of them"
			reasons={CANCEL_REASONS}
			reasonRequired
			notice={{ text: 'Charges ₹0: you pay after each visit, so nothing is charged for a cancelled one.' }}
			confirmLabel={ctaLabel}
			confirmDisabled={n === 0}
			successTitle={n === 1 ? 'Visit cancelled' : 'Visits cancelled'}
			successMessage="You pay after each visit, so nothing was charged."
			onClose={onClose}
			onDone={onDone}
			onConfirm={async (reason) => (reason ? onConfirm(picked, reason) : { ok: false, error: 'Pick a reason.' })}
		>
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
		</AppCancelSheet>
	)
}

const styles = StyleSheet.create({
	list: { borderWidth: 1, borderColor: APP_COLORS.divider, borderRadius: 12, overflow: 'hidden' },
	allRow: { backgroundColor: APP_COLORS.pageBg, borderBottomWidth: 1, borderBottomColor: APP_COLORS.divider },
})
