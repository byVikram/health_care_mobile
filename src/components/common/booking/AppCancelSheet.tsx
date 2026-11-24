// src/components/common/booking/AppCancelSheet.tsx
//
// THE cancellation sheet of the app (doctor, patient, home-care provider, laboratory, any later flow): one look, and the copy of each
// flow comes in through props. Top to bottom, as in the home-care "Can't make it?" design:
//   header          the title, a one-line `subtitle` and the close button
//   summary         a grey card: who and when ("Suresh N." / "Instant visit · Wound dressing + 1 more · 1.4 km")
//   children        a flow's own block (home care: the visits to pick from)
//   choice          "What do you want to cancel?": option rows with a line under each (this visit / this and the later ones)
//   reasons         a "Reason" list: one full-width row per reason, the radio on the right, the picked one tinted (optional by default;
//                   `reasonRequired` makes the confirm button wait for one)
//   note            a plain multi-line box, shown when `noteLabel` is given (its placeholder says what it is: "Note for the care team")
//   notice          a tinted box: who is told, what it costs, what happens next (`onPress` makes it a link, e.g. "Running late?")
//   rescheduleInstead  "Prefer another time? Reschedule instead", shown only when the flow offers it
//   footnote        a small muted policy line
//   buttons         Back / Cancel <thing> (the confirm label and colour are props; pinned under the scrolling content)
// ONE outcome for every flow, so a cancellation reads the same for a doctor, a patient, a nurse and the lab: `onConfirm` runs the
// cancellation and RETURNS ITS RESULT. The sheet shows the spinner and blocks dismissing while it runs, then
//   ok     by default (`successStyle` 'toast') the sheet closes at once, a success toast says `successTitle` / `successMessage`, and
//          `onDone` runs the flow's follow-up (refresh, go back): pressing the red button already was the confirmation, so there is no
//          second screen (`onDone` gets the result, so what the call returned in `data` needs no state of the flow's own). A flow that must be acknowledged, because its screen is gone or what happens next needs explaining, uses
//          `successStyle="screen"`: the form becomes a confirmation (a green check, the title and message, one `doneLabel` button) and
//          closing it (the button, a swipe, Back) runs `onDone`
//   error  stays open and shows the message in red above the buttons, so the user can retry or keep the booking (a toast would sit
//          behind the sheet, and a status pop-up would stack a second layer on it)
// No status pop-up after a cancellation. Use the sheet as is; do not build another cancel modal.

import React, { useEffect, useState } from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import Toast from 'react-native-toast-message'
import { APP_COLORS } from '../../../config/theme'
import { AppButton } from '../buttons/AppButton'
import { AppInfoBanner, INFO_BANNER_TONES, type AppInfoBannerTone } from '../display/AppInfoBanner'
import { AppInput } from '../inputs/AppInput'
import { AppRadio } from '../inputs/AppRadio'
import { AppBottomSheet } from '../layout/AppBottomSheet'

/** One row of the "what do you want to cancel?" choice. */
export type AppCancelChoiceOption = { id: string; label: string; sub?: string }

export type AppCancelChoice = {
	/** Heading over the rows ("What do you want to cancel?"). */
	label: string
	options: AppCancelChoiceOption[]
	value: string
	onChange: (id: string) => void
}

/** A tinted box under the reasons. */
export type AppCancelNotice = {
	text: string
	/** Defaults to 'info' (mint). */
	tone?: AppInfoBannerTone
	/** Makes the whole notice a button (the hint "Just running late? Tell the patient how many minutes"). */
	onPress?: () => void
}

/** The grey card under the title: who the cancellation is about, and when. */
export type AppCancelSummary = { title: string; line?: string }

/**
 * What `onConfirm` returns. `ok`: the cancellation went through (`title` / `message` override the sheet's successTitle /
 * successMessage when the outcome is only known now: "Cancellation requested"). `carryOn`: this step was not a cancellation, the flow moved
 * on to something else (a doctor who picked "Refer to another doctor"), so the sheet shows nothing. `error`: it did not go through; the
 * sheet shows this text.
 */
export type AppCancelOk<T = unknown> = {
	ok: true
	title?: string
	message?: string
	/** Whatever the call gave back (the lab's cancelled order): handed to `onDone`, so the flow needs no state of its own for it. */
	data?: T
}
export type AppCancelResult<T = unknown> = AppCancelOk<T> | { ok: true; carryOn: true } | { ok: false; error: string }

/** A readable message from a failed cancel call (the server's `message`, a `detail` string or `detail.message`), else `fallback`. */
export function cancelErrorMessage(error: unknown, fallback = 'Please try again.'): string {
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

export type AppCancelSheetProps<T = unknown> = {
	visible: boolean
	title: string
	subtitle?: string
	summary?: AppCancelSummary
	/** The reasons to pick from; leave empty for a flow that asks no reason. */
	reasons?: string[]
	/** The confirm button waits for a reason (otherwise the reason is optional and can be un-picked). */
	reasonRequired?: boolean
	/** Called whenever the picked reason changes, so a flow can react to it (the "late" hint, "Refer to another doctor"). */
	onReasonChange?: (reason: string | null) => void
	/** A flow's own block. */
	children?: React.ReactNode
	choice?: AppCancelChoice
	/** What the note box is ("Message to patient"); the box is shown only when this is given. It is its placeholder and its label. */
	noteLabel?: string
	/** Overrides the placeholder, which is otherwise the label plus "(optional)". */
	notePlaceholder?: string
	noteMaxLength?: number
	/** Adds "(optional)" to the note's placeholder. Defaults to true. */
	noteOptional?: boolean
	notice?: AppCancelNotice
	footnote?: string
	/** "Prefer another time? Reschedule instead": shown only when given. */
	onRescheduleInstead?: () => void
	/** Defaults to "Back". */
	keepLabel?: string
	/** "Cancel appointment", "Cancel order", "Decline request": say what is cancelled. Defaults to "Cancel". */
	confirmLabel?: string
	/** 'danger' (red, the default) for a cancellation; 'primary' for a step that is not one (a doctor sent on to refer instead). */
	confirmTone?: 'danger' | 'primary'
	/** An extra reason the confirm button must wait for (no visit picked yet). */
	confirmDisabled?: boolean
	/** Dismissing the form (Back, a swipe, Back): the cancellation did not happen. */
	onClose: () => void
	/** Runs the cancellation and returns how it went (see AppCancelResult). */
	onConfirm: (reason: string | null, note: string) => Promise<AppCancelResult<T>>
	/** What is said once it went through ("Appointment cancelled"): the success toast, or the confirmation screen's title. */
	successTitle: string
	successMessage?: string
	/** 'toast' (default): close at once and say it in a toast. 'screen': a confirmation screen the user closes (see the header). */
	successStyle?: 'toast' | 'screen'
	/** The confirmation screen's single button (`successStyle` 'screen'). Defaults to "Done". */
	doneLabel?: string
	/**
	 * The cancellation went through (the toast is up, or the confirmation screen was closed): the flow's follow-up (refresh, go back).
	 * Gets the result `onConfirm` returned (its `data`). Defaults to `onClose`.
	 */
	onDone?: (result?: AppCancelOk<T>) => void
	maxHeightRatio?: number
}

/** A full-width option row, the radio on the right (the reasons and the "what to cancel" choice share it). */
function OptionRow({
	label,
	sub,
	on,
	disabled,
	onPress,
}: {
	label: string
	sub?: string
	on: boolean
	disabled?: boolean
	onPress: () => void
}) {
	return (
		<TouchableOpacity
			onPress={onPress}
			disabled={disabled}
			activeOpacity={0.8}
			accessibilityRole="radio"
			accessibilityState={{ checked: on, disabled }}
			style={[styles.option, on && styles.optionOn]}
		>
			<View style={styles.optionText}>
				<Text style={styles.optionLabel}>{label}</Text>
				{!!sub && <Text style={styles.optionSub}>{sub}</Text>}
			</View>
			<AppRadio checked={on} size={20} />
		</TouchableOpacity>
	)
}

export function AppCancelSheet<T = unknown>({
	visible,
	title,
	subtitle,
	summary,
	reasons = [],
	reasonRequired = false,
	onReasonChange,
	children,
	choice,
	noteLabel,
	notePlaceholder,
	noteMaxLength = 500,
	noteOptional = true,
	notice,
	footnote,
	onRescheduleInstead,
	keepLabel = 'Back',
	confirmLabel = 'Cancel',
	confirmTone = 'danger',
	confirmDisabled = false,
	onClose,
	onConfirm,
	successTitle,
	successMessage,
	successStyle = 'toast',
	doneLabel = 'Done',
	onDone,
	maxHeightRatio = 0.92,
}: AppCancelSheetProps<T>) {
	const [reason, setReasonState] = useState<string | null>(null)
	const [note, setNote] = useState('')
	const [busy, setBusy] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [outcome, setOutcome] = useState<{ title: string; message?: string; result: AppCancelOk<T> } | null>(null)
	// The cancellation went through and the toast is up: the follow-up runs on the NEXT render (see below), with this result.
	const [finishing, setFinishing] = useState<AppCancelOk<T> | null>(null)
	const [wasVisible, setWasVisible] = useState(visible)

	const setReason = (next: string | null) => {
		setReasonState(next)
		setError(null)
		onReasonChange?.(next)
	}

	// A fresh form every time the sheet opens. Reset while rendering (React's way of adjusting state when a prop changes), not in an
	// effect: no extra render with the old form on screen.
	if (visible !== wasVisible) {
		setWasVisible(visible)
		if (visible) {
			setReasonState(null)
			setNote('')
			setBusy(false)
			setError(null)
			setOutcome(null)
			setFinishing(null)
		}
	}

	// The flow's own reason state starts clean too (the parent's state cannot be set while rendering). Only on open: a caller that
	// re-creates onReasonChange each render must not reset what was picked.
	useEffect(() => {
		if (visible) onReasonChange?.(null)
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [visible])

	const blocked = confirmDisabled || (reasonRequired && !reason)

	const confirm = async () => {
		if (busy || blocked) return
		setBusy(true)
		setError(null)
		try {
			const result = await onConfirm(reason, note.trim())
			if (!result.ok) setError(result.error)
			else if (!('carryOn' in result)) {
				const title = result.title ?? successTitle
				const message = result.message ?? successMessage
				if (successStyle === 'screen') setOutcome({ title, message, result })
				else {
					Toast.show({ type: 'success', text1: title, text2: message })
					setFinishing(result)
				}
			}
		} catch {
			setError('Something went wrong. Please try again.')
		} finally {
			setBusy(false)
		}
	}

	// Closing the confirmation is the flow's follow-up; closing the form is "never mind".
	const finish = (result?: AppCancelOk<T>) => (onDone ? onDone(result) : onClose())

	// The follow-up of a toast-style success runs here, not straight after the call returns: a flow updates its own state while
	// `onConfirm` runs (the doctor's list of handled requests, which `onDone` reads), and only the next render sees it in `onDone`.
	useEffect(() => {
		if (!finishing) return
		const result = finishing
		setFinishing(null)
		finish(result)
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [finishing])

	const tone = INFO_BANNER_TONES[notice?.tone ?? 'info']

	return (
		<AppBottomSheet
			appearance="modern"
			showHeaderDivider={false}
			visible={visible}
			title={outcome ? outcome.title : title}
			subtitle={outcome ? undefined : subtitle}
			// AppBottomSheet always animates itself closed before calling onClose, so a no-op here would desync it from `visible`;
			// an in-flight cancel still resolves through the caller.
			onClose={outcome ? () => finish(outcome.result) : onClose}
			dismissible={!busy}
			maxHeightRatio={maxHeightRatio}
			footer={
				outcome ? (
					<AppButton size="lg" onPress={() => finish(outcome.result)}>
						{doneLabel}
					</AppButton>
				) : (
					<View style={styles.footer}>
						{error ? <AppInfoBanner tone="danger" title={error} titleStyle={styles.errorText} /> : null}
						<View style={styles.actions}>
							{/* Not `disabled` while busy: Paper greys disabled buttons out; the handlers guard instead. */}
							<AppButton
								variant="outline"
								size="lg"
								style={styles.btn}
								onPress={busy ? undefined : onClose}
							>
								{keepLabel}
							</AppButton>
							<AppButton
								variant={confirmTone}
								size="lg"
								softDisabled
								style={[styles.btn, busy && styles.busy]}
								disabled={blocked && !busy}
								onPress={() => void confirm()}
								loading={busy}
							>
								{confirmLabel}
							</AppButton>
						</View>
					</View>
				)
			}
		>
			{outcome ? (
				<View style={styles.doneBody}>
					<View style={styles.doneIcon}>
						<MaterialCommunityIcons name="check" size={26} color={APP_COLORS.success} />
					</View>
					{outcome.message ? <Text style={styles.doneText}>{outcome.message}</Text> : null}
				</View>
			) : (
				<View style={styles.body}>
					{summary ? (
						<View style={styles.summary}>
							<Text style={styles.summaryTitle}>{summary.title}</Text>
							{!!summary.line && <Text style={styles.summaryLine}>{summary.line}</Text>}
						</View>
					) : null}

					{children ? (
						// Locked while the call runs, like the reasons and the note, so what was picked cannot change under it.
						<View style={[styles.children, busy && styles.noTouch]}>{children}</View>
					) : null}

					{choice ? (
						<View style={styles.block}>
							<Text style={styles.heading}>{choice.label}</Text>
							<View
								style={styles.options}
								accessibilityRole="radiogroup"
								accessibilityLabel={choice.label}
							>
								{choice.options.map((o) => (
									<OptionRow
										key={o.id}
										label={o.label}
										sub={o.sub}
										on={o.id === choice.value}
										disabled={busy}
										onPress={() => {
											setError(null)
											choice.onChange(o.id)
										}}
									/>
								))}
							</View>
						</View>
					) : null}

					{reasons.length > 0 ? (
						<View style={styles.block}>
							<Text style={styles.heading}>
								Reason {!reasonRequired && <Text style={styles.optional}>(optional)</Text>}
							</Text>
							<View style={styles.options} accessibilityRole="radiogroup" accessibilityLabel="Reason">
								{reasons.map((r) => {
									const on = reason === r
									return (
										<OptionRow
											key={r}
											label={r}
											on={on}
											disabled={busy}
											// A required reason is swapped, never cleared; an optional one toggles off.
											onPress={() => setReason(on && !reasonRequired ? null : r)}
										/>
									)
								})}
							</View>
						</View>
					) : null}

					{noteLabel ? (
						<AppInput
							noMargin
							multiline
							numberOfLines={2}
							placeholder={notePlaceholder ?? `${noteLabel}${noteOptional ? ' (optional)' : ''}`}
							value={note}
							onChangeText={(t) => {
								setError(null)
								setNote(t.slice(0, noteMaxLength))
							}}
							maxLength={noteMaxLength}
							editable={!busy}
							accessibilityLabel={noteLabel}
						/>
					) : null}

					{notice ? (
						<TouchableOpacity
							onPress={notice.onPress}
							disabled={!notice.onPress}
							activeOpacity={0.8}
							accessibilityRole={notice.onPress ? 'button' : undefined}
							style={[styles.notice, { backgroundColor: tone.bg }]}
						>
							<Text style={styles.noticeText}>{notice.text}</Text>
						</TouchableOpacity>
					) : null}

					{onRescheduleInstead ? (
						<View style={styles.rescheduleHint}>
							<MaterialCommunityIcons
								name="calendar-blank-outline"
								size={18}
								color={APP_COLORS.primary}
							/>
							<Text style={styles.hintText}>
								Prefer another time?{' '}
								<Text style={styles.hintLink} onPress={onRescheduleInstead} accessibilityRole="button">
									Reschedule instead
								</Text>
							</Text>
						</View>
					) : null}

					{footnote ? <Text style={styles.footnote}>{footnote}</Text> : null}
				</View>
			)}
		</AppBottomSheet>
	)
}

const styles = StyleSheet.create({
	// AppBottomSheet supplies the 16px side padding and safe-area bottom padding.
	body: { paddingBottom: 4, gap: 12 },
	summary: { padding: 12, borderRadius: 12, backgroundColor: APP_COLORS.pageBg },
	summaryTitle: { fontSize: 15, lineHeight: 20, fontWeight: '700', color: APP_COLORS.ink },
	summaryLine: { fontSize: 12, lineHeight: 16, color: APP_COLORS.inkMuted },
	children: { gap: 12 },
	noTouch: { pointerEvents: 'none' },
	block: { gap: 8 },
	heading: { fontSize: 13, lineHeight: 18, fontWeight: '800', color: APP_COLORS.ink },
	optional: { fontWeight: '400', color: APP_COLORS.inkMuted },
	options: { gap: 8 },
	option: {
		minHeight: 48,
		paddingVertical: 10,
		paddingHorizontal: 12,
		borderRadius: 12,
		borderWidth: 1.5,
		borderColor: APP_COLORS.divider,
		backgroundColor: APP_COLORS.surface,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		gap: 10,
	},
	optionOn: { borderColor: APP_COLORS.primary, backgroundColor: '#F0F7F7' },
	optionText: { flex: 1, minWidth: 0 },
	optionLabel: { fontSize: 14, lineHeight: 20, fontWeight: '700', color: APP_COLORS.ink },
	optionSub: { fontSize: 12, lineHeight: 17, color: APP_COLORS.inkMuted },
	notice: { padding: 10, paddingHorizontal: 12, borderRadius: 10 },
	noticeText: { fontSize: 12, lineHeight: 17, color: APP_COLORS.ink },
	errorText: { fontSize: 13, lineHeight: 19, fontWeight: '400', color: APP_COLORS.ink },
	rescheduleHint: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		paddingVertical: 10,
		paddingHorizontal: 12,
		borderRadius: 12,
		backgroundColor: APP_COLORS.mint,
	},
	hintText: { flex: 1, fontSize: 13, lineHeight: 18, color: APP_COLORS.ink },
	hintLink: { color: APP_COLORS.primary, fontWeight: '700' },
	footnote: { fontSize: 12, lineHeight: 17, color: APP_COLORS.inkMuted },
	footer: { gap: 10 },
	actions: { flexDirection: 'row', gap: 8 },
	btn: { flex: 1 },
	busy: { opacity: 0.7 },
	doneBody: { alignItems: 'center', gap: 8, paddingTop: 8, paddingBottom: 4 },
	doneIcon: {
		width: 56,
		height: 56,
		borderRadius: 28,
		backgroundColor: APP_COLORS.successBg,
		alignItems: 'center',
		justifyContent: 'center',
	},
	doneText: { fontSize: 14, lineHeight: 20, color: APP_COLORS.inkMuted, textAlign: 'center' },
})
