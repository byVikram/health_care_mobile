// src/features/ancillary/staff/visit/CancelVisitSheet.tsx
//
// "Can't make it? Cancel visit" (visit details design): reason radio list, a "Just running late? Message ..."
// hint when the late reason is picked, an optional note to the patient and a red "Cancel visit" button, then
// the "Visit cancelled" done state with "Back to Today". Cancelling hands the booking back to dispatch
// (POST /provider/requests/{id}/cancel -- the patient is refunded / the request is re-sent to other
// providers); the picked reason is also filed as a visit issue (POST /provider/me/visits/{id}/issues).
import React, { useEffect, useState } from 'react'
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import Toast from 'react-native-toast-message'
import { AppBottomSheet, AppButton } from '../../../../components/common'
import { APP_COLORS } from '../../../../config/theme'
import { API_ENDPOINTS } from '../../../../constants/apiUrls'
import ApiService from '../../../../services/apiService'
import { showComingSoon } from '../../../../utils/toast'
import { extractApiErrorMessage } from '../../ancillaryService'
import { reportVisitIssue, type VisitIssueReason } from '../../providerVisitService'

type CancelReason = { id: string; label: string; issue: VisitIssueReason }

const CANCEL_REASONS: CancelReason[] = [
	{ id: 'late', label: 'Stuck in traffic or running very late', issue: 'RUNNING_LATE' },
	{ id: 'unwell', label: 'Emergency or feeling unwell', issue: 'CANT_MAKE_IT' },
	{ id: 'vehicle', label: 'Vehicle problem', issue: 'CANT_MAKE_IT' },
	{ id: 'address', label: 'Can’t find or reach the address', issue: 'ADDRESS_NOT_FOUND' },
	{ id: 'other', label: 'Other reason', issue: 'OTHER' },
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
}: CancelVisitSheetProps) {
	const [reasonId, setReasonId] = useState<string | null>(null)
	const [note, setNote] = useState('')
	const [submitting, setSubmitting] = useState(false)
	const [done, setDone] = useState(false)

	useEffect(() => {
		if (visible) {
			setReasonId(null)
			setNote('')
			setDone(false)
		}
	}, [visible])

	const reason = CANCEL_REASONS.find((r) => r.id === reasonId) ?? null

	const submit = async () => {
		if (!reason || submitting) return
		setSubmitting(true)
		try {
			const text = [reason.label, note.trim()].filter(Boolean).join(' - ')
			await ApiService.post(API_ENDPOINTS.ANCILLARY.CANCEL_PROVIDER(requestId), { reason: text })
			// Support trail for ops; the cancel itself has already happened.
			void reportVisitIssue(visitId, reason.issue, text).catch(() => undefined)
			setDone(true)
		} catch (e) {
			Toast.show({
				type: 'error',
				text1: 'Could not cancel the visit',
				text2: extractApiErrorMessage(e, 'Please try again.'),
			})
		} finally {
			setSubmitting(false)
		}
	}

	const subtitle = [patientName, serviceTitle, instant ? 'instant' : null].filter(Boolean).join(' · ')

	return (
		<AppBottomSheet
			visible={visible}
			title={done ? 'Visit cancelled' : 'Cancel this visit?'}
			subtitle={done ? undefined : subtitle}
			onClose={done ? onBackToToday : onClose}
			appearance="modern"
			showHeaderDivider={false}
			dismissible={!submitting}
			footer={
				done ? (
					<AppButton size="lg" onPress={onBackToToday}>
						Back to Today
					</AppButton>
				) : (
					<AppButton
						size="lg"
						variant="danger"
						onPress={() => void submit()}
						loading={submitting}
						disabled={!reason || submitting}
						style={!reason ? styles.ctaOff : undefined}
					>
						Cancel visit
					</AppButton>
				)
			}
		>
			{done ? (
				<View style={styles.doneBody}>
					<View style={styles.doneIcon}>
						<MaterialCommunityIcons name="close" size={22} color={APP_COLORS.danger} />
					</View>
					<Text style={styles.doneSub}>
						{`Reason: ${reason?.label ?? ''}. ${patientFirstName} has been refunded and we’re finding another provider.`}
					</Text>
				</View>
			) : (
				<View style={styles.body}>
					<View style={styles.reasons} accessibilityRole="radiogroup">
						{CANCEL_REASONS.map((r) => {
							const on = r.id === reasonId
							return (
								<Pressable
									key={r.id}
									onPress={() => setReasonId(r.id)}
									disabled={submitting}
									accessibilityRole="radio"
									accessibilityState={{ checked: on }}
									style={[styles.reason, on && styles.reasonOn]}
								>
									<View style={[styles.ring, on && styles.ringOn]}>
										{on ? <View style={styles.dot} /> : null}
									</View>
									<Text style={styles.reasonText}>{r.label}</Text>
								</Pressable>
							)
						})}
					</View>

					{reasonId === 'late' ? (
						<Pressable
							onPress={() => {
								onClose()
								showComingSoon('Chat with patients is coming soon.')
							}}
							accessibilityRole="button"
							style={styles.lateHint}
						>
							<Text style={styles.lateText}>
								<Text style={styles.lateBold}>Just running late?</Text>
								{` Message ${patientFirstName} with your new time instead. Most patients are happy to wait a few minutes.`}
							</Text>
						</Pressable>
					) : null}

					<View style={styles.noteWrap}>
						<Text style={styles.noteLabel}>Note to patient (optional)</Text>
						<TextInput
							value={note}
							onChangeText={setNote}
							placeholder="A short, kind explanation"
							placeholderTextColor={APP_COLORS.inkMuted}
							multiline
							maxLength={500}
							editable={!submitting}
							textAlignVertical="top"
							style={styles.noteInput}
						/>
					</View>

					<Text style={styles.policy}>
						{`${patientFirstName} gets a full refund and we’ll send the request to another provider nearby right away. Cancelling after accepting can lower your priority for new requests.`}
					</Text>
				</View>
			)}
		</AppBottomSheet>
	)
}

const styles = StyleSheet.create({
	body: {
		gap: 14,
		paddingBottom: 8,
	},
	reasons: {
		gap: 6,
	},
	reason: {
		minHeight: 48,
		paddingVertical: 8,
		paddingHorizontal: 12,
		borderWidth: 1.5,
		borderColor: APP_COLORS.divider,
		borderRadius: 12,
		backgroundColor: APP_COLORS.surface,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
	},
	reasonOn: {
		borderColor: APP_COLORS.primary,
		backgroundColor: APP_COLORS.mint,
	},
	ring: {
		width: 18,
		height: 18,
		borderRadius: 9,
		borderWidth: 2,
		borderColor: APP_COLORS.border,
		alignItems: 'center',
		justifyContent: 'center',
	},
	ringOn: {
		borderColor: APP_COLORS.primary,
	},
	dot: {
		width: 8,
		height: 8,
		borderRadius: 4,
		backgroundColor: APP_COLORS.primary,
	},
	reasonText: {
		flex: 1,
		fontSize: 14,
		lineHeight: 20,
		fontWeight: '700',
		color: APP_COLORS.ink,
	},
	lateHint: {
		paddingVertical: 10,
		paddingHorizontal: 12,
		borderRadius: 10,
		backgroundColor: APP_COLORS.mint,
	},
	lateText: {
		fontSize: 13,
		lineHeight: 18,
		color: APP_COLORS.ink,
	},
	lateBold: {
		fontWeight: '800',
		color: APP_COLORS.primary,
	},
	noteWrap: {
		gap: 6,
	},
	noteLabel: {
		fontSize: 13,
		lineHeight: 18,
		fontWeight: '800',
		color: APP_COLORS.ink,
	},
	noteInput: {
		minHeight: 64,
		paddingVertical: 10,
		paddingHorizontal: 12,
		borderWidth: 1,
		borderColor: APP_COLORS.border,
		borderRadius: 10,
		backgroundColor: APP_COLORS.surface,
		fontSize: 15,
		lineHeight: 21,
		color: APP_COLORS.ink,
	},
	policy: {
		fontSize: 12,
		lineHeight: 17,
		color: APP_COLORS.inkMuted,
	},
	ctaOff: {
		backgroundColor: '#E4A9A3',
	},
	doneBody: {
		alignItems: 'center',
		gap: 8,
		paddingTop: 8,
		paddingBottom: 4,
	},
	doneIcon: {
		width: 56,
		height: 56,
		borderRadius: 28,
		backgroundColor: APP_COLORS.dangerBg,
		alignItems: 'center',
		justifyContent: 'center',
	},
	doneSub: {
		fontSize: 14,
		lineHeight: 20,
		color: APP_COLORS.inkMuted,
		textAlign: 'center',
	},
})

export default CancelVisitSheet
