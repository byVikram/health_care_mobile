// src/features/ancillary/components/MissedVisitBanner.tsx
//
// A home-care visit the provider reported as a no-show (the patient was not available at the address), on the booking
// screens: asks what happened while the patient can still answer (opening the same "What happened?" sheet as a doctor
// no-show), then says how the answer was taken -- recorded as missed, not counted, or being reviewed -- using the server's own
// words. The answer decides it: some reasons count as a missed visit, others (illness, wrong address) never do.
import React, { useState } from 'react'
import { AppInfoBanner, type AppInfoBannerTone } from '../../../components/common'
import NoShowReplySheet from '../../appointment/components/NoShowReplySheet'
import { useVisitNoShow } from '../hooks/useVisitNoShow'

type Props = {
	visitId: string
	/** "visit 2", "this visit" ... as it should read in the title. */
	title: string
	/** "nurse", "physiotherapist" ... */
	noun: string
}

const STATE_VIEW: Record<string, { tone: AppInfoBannerTone; title: string }> = {
	valid: { tone: 'warning', title: 'Recorded as a missed visit' },
	invalid: { tone: 'success', title: 'This missed visit won’t count' },
	needs_review: { tone: 'sky', title: 'We’re looking into this' },
}

/** "26 Oct, 6:30 PM" in the device's clock. */
const deadlineText = (iso?: string) => {
	const d = iso ? new Date(iso) : null
	return d && !Number.isNaN(d.getTime())
		? d.toLocaleString(undefined, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })
		: ''
}

export function MissedVisitBanner({ visitId, title, noun }: Props) {
	const { info, reload } = useVisitNoShow(visitId)
	const [open, setOpen] = useState(false)

	// Until the answer is known (or if it could not be loaded) the patient is simply asked.
	const asking = !info || info.can_reply
	const view = info ? STATE_VIEW[info.state] : undefined
	const answered = info?.reason ? info.reasons.find((r) => r.value === info.reason)?.label : null
	const deadline = deadlineText(info?.reply_deadline)

	return (
		<>
			<AppInfoBanner
				tone={asking ? 'warning' : (view?.tone ?? 'warning')}
				icon={null}
				title={asking ? `We couldn’t complete ${title}` : (view?.title ?? 'The time to reply has passed')}
				subtitle={
					asking
						? `The ${noun} couldn’t meet you. Tell us what happened${deadline ? ` by ${deadline}` : ''}. If you don’t reply, it is recorded as a missed visit.`
						: [info?.message, answered ? `Your answer: ${answered}` : null].filter(Boolean).join(' ')
				}
				action={asking ? { label: 'Tell us what happened', onPress: () => setOpen(true) } : undefined}
				actionPlacement="below"
			/>
			{open && <NoShowReplySheet visible visitId={visitId} onClose={() => setOpen(false)} onReplied={reload} />}
		</>
	)
}
