// src/features/ancillary/staff/visit/ReportIssueSheet.tsx
//
// "Report an issue" for a visit (visit details: "Can't make it? Report an issue"; in progress: "Report an
// issue"): reason chips + optional details -> POST /provider/me/visits/{id}/issues. The ops team follows up.
import React, { useEffect, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import Toast from 'react-native-toast-message'
import { AppBottomSheet, AppButton, AppChip, NotesInput } from '../../../../components/common'
import { APP_COLORS } from '../../../../config/theme'
import { extractApiErrorMessage } from '../../ancillaryService'
import { reportVisitIssue, type VisitIssueReason } from '../../providerVisitService'

const REASONS: { key: VisitIssueReason; label: string }[] = [
	{ key: 'CANT_MAKE_IT', label: 'I can’t make it' },
	{ key: 'RUNNING_LATE', label: 'Running late' },
	{ key: 'PATIENT_NOT_AVAILABLE', label: 'Patient not available' },
	{ key: 'ADDRESS_NOT_FOUND', label: 'Can’t find the address' },
	{ key: 'SAFETY_CONCERN', label: 'Safety concern' },
	{ key: 'OTHER', label: 'Something else' },
]

export type ReportIssueSheetProps = {
	visible: boolean
	visitId: string
	/** Pre-selected reason (e.g. "Can't make it" from visit details). */
	initialReason?: VisitIssueReason
	onClose: () => void
}

export function ReportIssueSheet({ visible, visitId, initialReason = 'RUNNING_LATE', onClose }: ReportIssueSheetProps) {
	const [reason, setReason] = useState<VisitIssueReason>(initialReason)
	const [details, setDetails] = useState('')
	const [submitting, setSubmitting] = useState(false)

	useEffect(() => {
		if (visible) {
			setReason(initialReason)
			setDetails('')
		}
	}, [visible, initialReason])

	const submit = async () => {
		if (submitting) return
		setSubmitting(true)
		try {
			await reportVisitIssue(visitId, reason, details)
			Toast.show({
				type: 'success',
				text1: 'Issue reported',
				text2: 'Our team will get in touch with you shortly.',
			})
			onClose()
		} catch (e) {
			Toast.show({
				type: 'error',
				text1: 'Could not report the issue',
				text2: extractApiErrorMessage(e, 'Please try again.'),
			})
		} finally {
			setSubmitting(false)
		}
	}

	return (
		<AppBottomSheet
			visible={visible}
			title="Report an issue"
			subtitle="Tell us what's wrong and our team will help"
			onClose={onClose}
			appearance="modern"
			showHeaderDivider={false}
			dismissible={!submitting}
			footer={
				<AppButton size="lg" onPress={() => void submit()} loading={submitting} disabled={submitting}>
					Send to support
				</AppButton>
			}
		>
			<View style={styles.body}>
				<Text style={styles.label} accessibilityRole="header">
					What happened?
				</Text>
				<View style={styles.chips} accessibilityRole="radiogroup">
					{REASONS.map((r) => (
						<AppChip
							key={r.key}
							label={r.label}
							selected={reason === r.key}
							onPress={() => setReason(r.key)}
							variant="soft"
							shape="pill"
							size="sm"
							checkmark
							disabled={submitting}
							accessibilityRole="radio"
						/>
					))}
				</View>
				<NotesInput
					value={details}
					onChangeValue={setDetails}
					placeholder="Add details (optional)"
					maxLength={1000}
				/>
			</View>
		</AppBottomSheet>
	)
}

const styles = StyleSheet.create({
	body: {
		gap: 12,
		paddingBottom: 8,
	},
	label: {
		fontSize: 14,
		lineHeight: 20,
		fontWeight: '700',
		color: APP_COLORS.ink,
	},
	chips: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 8,
	},
})

export default ReportIssueSheet
