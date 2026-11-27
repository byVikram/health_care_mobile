// src/features/ancillary/staff/schedule/TakeJobSheet.tsx
//
// "Take" under Needed now asks first: a tap on the row must not commit her. An instant request holds her for about 90 minutes from now;
// a single scheduled day is added to her schedule. (A booking of several days is not taken from the row: she picks the days in the open
// job view.) The caller runs the take when she confirms.
import React from 'react'
import { AppConfirmSheet } from '../../../../components/common'
import { formatTimeSlot } from '../../../../utils/formatters'
import type { OpenJob } from '../../providerOpenJobsService'
import { longDay } from './scheduleModel'

type Props = {
	job: OpenJob | null
	onClose: () => void
	onConfirm: (job: OpenJob) => Promise<void>
}

export function TakeJobSheet({ job, onClose, onConfirm }: Props) {
	const instant = job?.kind === 'instant'
	const day = job?.days[0]
	const message = !job
		? undefined
		: instant
			? `${job.patientName} is waiting${job.waiting ? ` (${job.waiting})` : ''}. Taking it commits you for about 90 minutes, starting now.`
			: `${job.patientName}${day ? ` · ${longDay(day.date)} at ${formatTimeSlot(day.startTime)}` : ''}. It is added to your schedule.`
	return (
		<AppConfirmSheet
			visible={!!job}
			title={instant ? 'Take this request?' : 'Take this visit?'}
			message={message}
			confirmLabel="Take it"
			cancelLabel="Not now"
			tone="primary"
			onClose={onClose}
			onConfirm={async () => {
				if (job) await onConfirm(job)
			}}
		/>
	)
}
