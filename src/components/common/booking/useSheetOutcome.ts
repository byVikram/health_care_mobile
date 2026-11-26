// src/components/common/booking/useSheetOutcome.ts
//
// The ONE outcome of a bottom sheet that runs a call when its button is pressed (the reschedule sheet, the doctor's "ask the patient
// to reschedule"), the same as AppCancelSheet gives a cancellation: the caller's `run` does the call and RETURNS ITS RESULT, and
//   busy    the sheet shows the spinner and cannot be dismissed while it is true
//   ok      a success toast (`successTitle`, or the result's own `title` / `message`) and then `onDone(result)`, the flow's follow-up
//           (close, refresh): the follow-up runs on the NEXT render, so state the flow set while `run` ran is already in place
//   error   the sheet stays open and `error` holds the text to show inline above the button (a toast would sit behind the sheet and
//           a status pop-up would stack a second layer on it); `onFailed` lets a flow react (reload slots that just went)
// A sheet that opens again starts clean (no old error, not busy).

import { useEffect, useState } from 'react'
import Toast from 'react-native-toast-message'

export type SheetOk<T = unknown> = {
	ok: true
	/** Override the success toast when the outcome is only known now. */
	title?: string
	message?: string
	/** Whatever the call gave back (the lab's rescheduled order): handed to `onDone`, so the flow needs no state of its own for it. */
	data?: T
}
export type SheetResult<T = unknown> = SheetOk<T> | { ok: false; error: string }

/** A readable message from a failed call (the server's `message`, a `detail` string or `detail.message`), else `fallback`. */
export function sheetErrorMessage(error: unknown, fallback = 'Please try again.'): string {
	const data = (error as { response?: { data?: { message?: unknown; detail?: unknown } } } | null)?.response?.data
	const text = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null)
	const detail = data?.detail as { message?: unknown } | string | undefined
	return (
		text(data?.message) ??
		text(typeof detail === 'string' ? detail : undefined) ??
		text(typeof detail === 'object' ? detail?.message : undefined) ??
		fallback
	)
}

type Options<T> = {
	visible: boolean
	run: () => Promise<SheetResult<T>>
	successTitle: string
	successMessage?: string
	onDone: (result: SheetOk<T>) => void
	onFailed?: (error: string) => void
}

export function useSheetOutcome<T = unknown>({
	visible,
	run,
	successTitle,
	successMessage,
	onDone,
	onFailed,
}: Options<T>) {
	const [busy, setBusy] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [finishing, setFinishing] = useState<SheetOk<T> | null>(null)
	const [wasVisible, setWasVisible] = useState(visible)

	// A fresh outcome every time the sheet opens, reset while rendering (React's way of adjusting state when a prop changes).
	if (visible !== wasVisible) {
		setWasVisible(visible)
		if (visible) {
			setBusy(false)
			setError(null)
			setFinishing(null)
		}
	}

	const confirm = async () => {
		if (busy) return
		setBusy(true)
		setError(null)
		try {
			const result = await run()
			if (!result.ok) {
				setError(result.error)
				onFailed?.(result.error)
			} else {
				Toast.show({
					type: 'success',
					text1: result.title ?? successTitle,
					text2: result.message ?? successMessage,
				})
				setFinishing(result)
			}
		} catch {
			const message = 'Something went wrong. Please try again.'
			setError(message)
			onFailed?.(message)
		} finally {
			setBusy(false)
		}
	}

	useEffect(() => {
		if (!finishing) return
		const result = finishing
		setFinishing(null)
		onDone(result)
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [finishing])

	return { busy, error, confirm }
}
