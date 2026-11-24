// src/features/ancillary/staff/visit/CancelVisitSheet.tsx
//
// "Can't make it? Cancel visit" (visit details design) on the shared AppCancelSheet: a reason list (required), a message to the patient,
// and Keep visit / Cancel visit; the sheet then shows the "Visit cancelled" confirmation (or the error) and "Back to Today" closes it.
// Cancelling hands the visit back to dispatch (the patient is refunded / it is re-sent to other providers); the picked reason is also
// filed as a visit issue (POST /provider/me/visits/{id}/issues). When the reason is "running late" the sheet offers the running-late
// sheet instead (the patient is told how many minutes).
// A booking of several days asks WHAT is cancelled: only this visit (the default: her other days stay hers), or this one and every later
// day she holds (POST /provider/me/visits/{id}/release, scope DAY / REMAINING). A single visit, an instant one, and an older order the
// server cannot give back day by day (409 RELEASE_NOT_SUPPORTED) are handed back whole (POST /provider/requests/{id}/cancel).
import React, { useEffect, useState } from 'react'
import { AppCancelSheet, type AppCancelResult } from '../../../../components/common'
import { API_ENDPOINTS } from '../../../../constants/apiUrls'
import ApiService from '../../../../services/apiService'
import { showComingSoon } from '../../../../utils/toast'
import { extractApiErrorMessage } from '../../ancillaryService'
import { apiErrorCode, releaseVisitDay, type ReleaseScope } from '../../providerOpenJobsService'
import { reportVisitIssue, type VisitIssueReason } from '../../providerVisitService'

type CancelReason = { label: string; issue: VisitIssueReason }

const LATE_REASON = 'Stuck in traffic or running very late'

const CANCEL_REASONS: CancelReason[] = [
	{ label: LATE_REASON, issue: 'RUNNING_LATE' },
	{ label: 'Emergency or feeling unwell', issue: 'CANT_MAKE_IT' },
	{ label: 'Vehicle problem', issue: 'CANT_MAKE_IT' },
	{ label: 'Can’t find or reach the address', issue: 'ADDRESS_NOT_FOUND' },
	{ label: 'Other reason', issue: 'OTHER' },
]

export type CancelVisitSheetProps = {
	visible: boolean
	/** Visit (for the issue log) and its order (the cancel endpoint takes the order id). */
	visitId: string
	requestId: string
	patientName: string
	patientFirstName: string
	serviceTitle: string
	/** Instant "Book now" visit (adds "· instant" to the subtitle). */
	instant: boolean
	onClose: () => void
	/** "Back to Today". */
	onBackToToday: () => void
	/** Opens the running-late sheet (the visit is due today and she has not arrived); without it the hint stays "coming soon". */
	onRunningLate?: () => void
	/** How many days the booking has, and which one this is: with later days the sheet asks what to cancel. */
	visitsCount?: number
	dayIndex?: number
}

export function CancelVisitSheet({
	visible,
	visitId,
	requestId,
	patientName,
	patientFirstName,
	serviceTitle,
	instant,
	onClose,
	onBackToToday,
	onRunningLate,
	visitsCount = 1,
	dayIndex = 1,
}: CancelVisitSheetProps) {
	const [reason, setReason] = useState<string | null>(null)
	/** What to cancel when the booking has later days: only this visit (the safe default), or this one and the later ones. */
	const [scope, setScope] = useState<ReleaseScope>('DAY')

	useEffect(() => {
		if (visible) setScope('DAY')
	}, [visible])

	/** More days follow this one, so "only this visit" and "this and the later ones" are different things. */
	const askScope = !instant && visitsCount > dayIndex

	const submit = async (picked: string | null, note: string): Promise<AppCancelResult> => {
		const chosen = CANCEL_REASONS.find((r) => r.label === picked)
		if (!chosen) return { ok: false, error: 'Pick a reason.' }
		try {
			const text = [chosen.label, note].filter(Boolean).join(' - ')
			// Support trail for ops, noted BEFORE the cancel: once the visit is handed back the nurse no longer holds it and the server
			// refuses her note (403), which the app then showed as an "Access Denied" dialog although the cancel had worked. A note
			// that cannot be saved is not worth stopping the cancel for.
			await reportVisitIssue(visitId, chosen.issue, text, { silent: true }).catch(() => undefined)
			// A booking of several days gives back only what she chose; everything else (a single or instant visit, an older order the
			// server cannot split: 409 RELEASE_NOT_SUPPORTED) goes back whole, as it always did.
			let whole = !askScope
			if (askScope) {
				try {
					await releaseVisitDay(visitId, scope, chosen.label, note)
				} catch (e) {
					if (apiErrorCode(e) !== 'RELEASE_NOT_SUPPORTED') throw e
					whole = true
				}
			}
			if (whole) await ApiService.post(API_ENDPOINTS.ANCILLARY.CANCEL_PROVIDER(requestId), { reason: text })
			return {
				ok: true,
				message: `Reason: ${chosen.label}. ${
					whole
						? `${patientFirstName} has been refunded and we’re finding another provider.`
						: scope === 'DAY'
							? `Only this visit was given back and we’re finding another provider for it. Your other days with ${patientFirstName} stay yours.`
							: 'This visit and the later ones were given back and we’re finding another provider for them.'
				}`,
			}
		} catch (e) {
			return { ok: false, error: extractApiErrorMessage(e, 'Please try again.') }
		}
	}

	const late = reason === LATE_REASON
	const rest = askScope && scope === 'REMAINING'

	return (
		<AppCancelSheet
			visible={visible}
			title="Cancel this visit?"
			summary={{
				title: patientName,
				line: [instant ? 'Instant visit' : null, serviceTitle].filter(Boolean).join(' · '),
			}}
			reasons={CANCEL_REASONS.map((r) => r.label)}
			reasonRequired
			onReasonChange={setReason}
			choice={
				askScope
					? {
							label: 'What do you want to cancel?',
							options: [
								{
									id: 'DAY',
									label: 'Only this visit',
									sub: `Day ${dayIndex} of ${visitsCount} · your other days stay yours`,
								},
								{
									id: 'REMAINING',
									label: 'This visit and all the later ones',
									sub: `Day ${dayIndex} to ${visitsCount} · every day you hold from here on`,
								},
							],
							value: scope,
							onChange: (id) => setScope(id as ReleaseScope),
						}
					: undefined
			}
			noteLabel="Message to patient"
			notice={
				late
					? {
							tone: 'info',
							text: onRunningLate
								? `Just running late? Tell ${patientFirstName} how many minutes instead. Most patients are happy to wait a few minutes.`
								: `Just running late? Message ${patientFirstName} with your new time instead. Most patients are happy to wait a few minutes.`,
							onPress: () => {
								onClose()
								if (onRunningLate) onRunningLate()
								else showComingSoon('Chat with patients is coming soon.')
							},
						}
					: undefined
			}
			footnote={`${patientFirstName} gets a full refund and we’ll send the request to another provider nearby right away. Cancelling after accepting can lower your priority for new requests.`}
			confirmLabel={rest ? 'Cancel this and later visits' : 'Cancel visit'}
			successTitle="Visit cancelled"
			successStyle="screen"
			doneLabel="Back to Today"
			onClose={onClose}
			onDone={onBackToToday}
			onConfirm={submit}
		/>
	)
}

export default CancelVisitSheet
