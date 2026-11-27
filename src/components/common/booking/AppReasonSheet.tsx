// src/components/common/booking/AppReasonSheet.tsx
//
// The "why?" sheet (release a day, can't make an instant visit, hide a job; any "tell us why you are doing this" confirmation) on the shared
// AppCancelSheet: who and when, a required reason, an optional note for the care team, a mint info box and Back / confirm buttons. The
// caller runs the action: `onConfirm` gets the picked reason and the note and returns how it went; the sheet shows the confirmation or
// the error, and `onDone` is the follow-up.
import React from 'react'
import { AppCancelSheet, type AppCancelResult } from './AppCancelSheet'

export type AppReasonSheetProps = {
	visible: boolean
	title: string
	subtitle?: string
	who: string
	line: string
	reasons: string[]
	/** Placeholder of the optional note; omit for no note field. */
	notePlaceholder?: string
	info: string
	confirmLabel: string
	/** 'danger' = red button (releasing something), 'primary' = the plain teal one. */
	tone?: 'danger' | 'primary'
	/** Title and line of the confirmation the sheet shows once the action went through (not needed when `onConfirm` returns `quick`). */
	successTitle?: string
	successMessage?: string
	onClose: () => void
	/** Runs the action and returns how it went (the sheet shows the confirmation, or the error). */
	onConfirm: (reason: string, note: string) => Promise<AppCancelResult>
	/** The confirmation was closed: the action is done. */
	onDone?: () => void
}

export function AppReasonSheet({
	visible,
	title,
	subtitle,
	who,
	line,
	reasons,
	notePlaceholder,
	info,
	confirmLabel,
	tone = 'danger',
	successTitle,
	successMessage,
	onClose,
	onConfirm,
	onDone,
}: AppReasonSheetProps) {
	return (
		<AppCancelSheet
			visible={visible}
			title={title}
			subtitle={subtitle}
			summary={{ title: who, line }}
			reasons={reasons}
			reasonRequired
			noteLabel={notePlaceholder ? 'Note for the care team' : undefined}
			notePlaceholder={notePlaceholder}
			notice={{ text: info }}
			confirmLabel={confirmLabel}
			confirmTone={tone}
			successTitle={successTitle ?? 'Done'}
			successMessage={successMessage}
			onClose={onClose}
			onDone={onDone}
			onConfirm={(reason, note) => onConfirm(reason ?? reasons[0], note)}
		/>
	)
}
