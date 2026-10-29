// src/features/appointment/components/NoShowReplySheet.tsx
//
// "What happened?" sheet for an appointment the doctor marked as a no-show (patient no-show policy). Loads
// GET /appointments/{id}/no-show, shows the server's message and, while replying is still open, a single-choice
// list of reasons (labels come from the API; no free text) with the reply deadline and a Submit button. The reply
// is one-time and final: after it the sheet only shows the returned message.

import React, { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native'
import { AppBottomSheet, AppButton, AppRadio } from '../../../components/common'
import { APP_COLORS } from '../../../config/theme'
import { getNoShow, replyToNoShow, type NoShowInfo } from '../../../services/appointmentService'

type Props = {
	visible: boolean
	/** The appointment's public id. */
	appointmentId: string
	onClose: () => void
	/** Called after the reply went through, so the caller can refresh what it shows. */
	onReplied?: () => void
}

const statusOf = (error: unknown): number | undefined => (error as { response?: { status?: number } })?.response?.status

const serverMessage = (error: unknown): string | undefined => {
	const message = (error as { response?: { data?: { message?: unknown } } })?.response?.data?.message
	return typeof message === 'string' && message.trim() ? message : undefined
}

/** Friendly text for a failed load (404 / 403 / anything else). */
const loadErrorText = (error: unknown): string => {
	switch (statusOf(error)) {
		case 404:
			return 'This appointment was not marked as a no-show, so there is nothing to reply to.'
		case 403:
			return 'You can only reply for your own or your family’s appointments.'
		default:
			// No response at all (offline / timeout): apiService already worded the message for the user.
			return statusOf(error) === undefined && (error as Error)?.message
				? (error as Error).message
				: 'We couldn’t load this. Please try again.'
	}
}

/** The reply deadline in the device's locale and time zone ("26 Sep 2026, 6:30 PM"). */
const formatDeadline = (iso: string): string => {
	const d = new Date(iso)
	if (Number.isNaN(d.getTime())) return ''
	return d.toLocaleString(undefined, {
		day: 'numeric',
		month: 'short',
		year: 'numeric',
		hour: 'numeric',
		minute: '2-digit',
	})
}

export default function NoShowReplySheet({ visible, appointmentId, onClose, onReplied }: Props) {
	const [info, setInfo] = useState<NoShowInfo | null>(null)
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [selected, setSelected] = useState<string | null>(null)
	const [submitting, setSubmitting] = useState(false)
	// Why the last submit failed (409: already answered / deadline passed, or a network error) -- shown above the list.
	const [submitError, setSubmitError] = useState<string | null>(null)

	const load = useCallback(async () => {
		setLoading(true)
		setError(null)
		try {
			setInfo(await getNoShow(appointmentId))
		} catch (e) {
			setInfo(null)
			setError(loadErrorText(e))
		} finally {
			setLoading(false)
		}
	}, [appointmentId])

	// Fresh load every time the sheet opens (the state may have changed since: answered, deadline passed).
	useEffect(() => {
		if (!visible) return
		setInfo(null) // never show the previous state while the new one loads
		setSelected(null)
		setSubmitError(null)
		void load()
	}, [visible, load])

	const submit = async () => {
		if (!selected || submitting) return
		setSubmitting(true)
		setSubmitError(null)
		try {
			setInfo(await replyToNoShow(appointmentId, selected))
			onReplied?.()
		} catch (e) {
			if (statusOf(e) === 409) {
				// Already answered, or the deadline passed: show the server's reason, then what the record says now.
				setSubmitError(serverMessage(e) ?? 'This can no longer be answered.')
				try {
					setInfo(await getNoShow(appointmentId))
				} catch {
					/* keep what we have */
				}
			} else {
				const gone = statusOf(e) === 404 || statusOf(e) === 403
				setSubmitError(
					gone ? loadErrorText(e) : (serverMessage(e) ?? 'We couldn’t send your answer. Please try again.')
				)
			}
		} finally {
			setSubmitting(false)
		}
	}

	const canReply = !!info?.can_reply
	const deadline = info ? formatDeadline(info.reply_deadline) : ''
	const answeredLabel = info?.reason ? (info.reasons.find((r) => r.value === info.reason)?.label ?? null) : null

	return (
		<AppBottomSheet
			visible={visible}
			title="What happened?"
			onClose={onClose}
			appearance="modern"
			showHeaderDivider={false}
			dismissible={!submitting}
			footer={
				canReply ? (
					<AppButton size="lg" onPress={submit} disabled={!selected || submitting} loading={submitting} softDisabled>
						Submit
					</AppButton>
				) : undefined
			}
		>
			{loading && !info ? (
				<ActivityIndicator style={styles.loader} color={APP_COLORS.primary} />
			) : error ? (
				<View style={styles.body}>
					<Text style={styles.errorText}>{error}</Text>
					<AppButton variant="outline" size="md" onPress={() => void load()}>
						Try again
					</AppButton>
				</View>
			) : info ? (
				<View style={styles.body}>
					{!!submitError && <Text style={styles.errorText}>{submitError}</Text>}
					<Text style={styles.message}>{info.message}</Text>

					{canReply ? (
						<>
							{!!deadline && <Text style={styles.deadline}>Please reply by {deadline}. You can reply once.</Text>}
							<View accessibilityRole="radiogroup" style={styles.list}>
								{info.reasons.map((r) => {
									const on = r.value === selected
									return (
										<Pressable
											key={r.value}
											accessibilityRole="radio"
											accessibilityState={{ checked: on, disabled: submitting }}
											disabled={submitting}
											onPress={() => setSelected(r.value)}
											style={[styles.option, on && styles.optionOn]}
										>
											<AppRadio checked={on} />
											<Text style={styles.optionText}>{r.label}</Text>
										</Pressable>
									)
								})}
							</View>
						</>
					) : (
						!!answeredLabel && <Text style={styles.answered}>Your answer: {answeredLabel}</Text>
					)}
				</View>
			) : null}
		</AppBottomSheet>
	)
}

const styles = StyleSheet.create({
	loader: { paddingVertical: 32 },
	body: { gap: 14, paddingBottom: 12 },
	message: { fontSize: 14, lineHeight: 20, color: APP_COLORS.ink },
	deadline: { fontSize: 13, lineHeight: 18, fontWeight: '700', color: APP_COLORS.warning },
	answered: { fontSize: 13, lineHeight: 18, color: APP_COLORS.inkMuted },
	errorText: { fontSize: 13, lineHeight: 18, color: APP_COLORS.danger },
	list: { gap: 8 },
	option: {
		minHeight: 48,
		paddingHorizontal: 12,
		paddingVertical: 8,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		borderWidth: 1,
		borderRadius: 12,
		borderColor: APP_COLORS.divider,
		backgroundColor: APP_COLORS.surface,
	},
	optionOn: { borderColor: APP_COLORS.primary, backgroundColor: APP_COLORS.mint },
	optionText: { flex: 1, fontSize: 15, lineHeight: 20, fontWeight: '700', color: APP_COLORS.ink },
})
