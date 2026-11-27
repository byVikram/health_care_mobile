// src/features/ancillary/staff/schedule/ReleaseVisitSheet.tsx
//
// "Release this visit / this day / the remaining days" and the instant "Can't make it?" of the Schedule: the shared reason sheet with the
// wording of the ancillary schedule design. The caller runs the release (`onConfirm`, useScheduleActions.confirmRelease); the reason and
// note it gets are stored with the release itself. A release less than 12 hours before the visit still goes through, but it is recorded.
import React from 'react'
import { AppReasonSheet, type AppCancelResult } from '../../../../components/common'
import { formatTimeSlot } from '../../../../utils/formatters'
import { longDay, type ScheduleVisit } from './scheduleModel'

/** Why a scheduled day is given back, as the design words it. */
export const RELEASE_REASONS = [
	'Not available that day',
	'Emergency / unwell',
	'Clash with another visit',
	'Other reason',
]
/** Why an instant visit is passed on. */
export const INSTANT_REASONS = [
	'Stuck in traffic / too far',
	'Previous visit running long',
	'Emergency / unwell',
	'Other reason',
]

type Props = {
	visit: ScheduleVisit
	/** How many days of the booking she holds from this one on (this day and the later ones). */
	remainingDays: number
	/** What the release gives back: this day only, or this day and the later ones. */
	scope: 'DAY' | 'REMAINING'
	onClose: () => void
	onConfirm: (reason: string, note: string) => Promise<AppCancelResult>
}

export function ReleaseVisitSheet({ visit, remainingDays, scope, onClose, onConfirm }: Props) {
	const instant = visit.kind === 'instant'
	const many = remainingDays > 1
	const rest = many && scope === 'REMAINING'
	const first = visit.patientName.split(' ')[0]
	return (
		<AppReasonSheet
			visible
			title={
				instant
					? 'Can’t make it?'
					: rest
						? 'Release remaining days?'
						: many
							? 'Release this day?'
							: 'Release this visit?'
			}
			subtitle={
				instant
					? `${first} is waiting for you.`
					: rest
						? `You’ll stop visiting ${visit.patientName} from ${longDay(visit.date)}.`
						: many
							? `Only ${longDay(visit.date)}. Your other days with ${visit.patientName} stay yours.`
							: undefined
			}
			who={visit.patientName}
			line={[
				instant ? 'Instant visit' : longDay(visit.date),
				visit.startTime ? formatTimeSlot(visit.startTime) : null,
				visit.care,
			]
				.filter(Boolean)
				.join(' · ')}
			reasons={instant ? INSTANT_REASONS : RELEASE_REASONS}
			notePlaceholder="Note for the care team (optional)"
			info={
				instant
					? `We’ll offer this visit to other nurses nearby right away and tell ${first}.`
					: 'We’ll offer it to other nurses nearby and tell the family who’s coming. Release at least 12 hours before the visit. A later release is recorded.'
			}
			confirmLabel={
				instant
					? 'Cancel instant visit'
					: rest
						? `Release ${remainingDays} days`
						: many
							? 'Release this day'
							: 'Release this visit'
			}
			successTitle={instant ? 'Instant visit passed on' : rest ? 'Days released' : 'Visit released'}
			successMessage={
				instant
					? 'We’ve offered it to other nurses nearby.'
					: rest
						? 'We’re finding other nurses.'
						: 'We’re finding another nurse.'
			}
			onClose={onClose}
			onDone={onClose}
			onConfirm={onConfirm}
		/>
	)
}
