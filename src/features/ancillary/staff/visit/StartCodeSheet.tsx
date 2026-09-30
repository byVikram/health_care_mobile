// src/features/ancillary/staff/visit/StartCodeSheet.tsx
//
// "2a · Start code" sheet: the provider types the 4-digit start code the patient reads out from their app
// (each visit of a recurring order has its own). A correct code starts the visit timer and notifies the
// patient; a wrong one shows the error under the boxes.
import React, { useEffect, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { AppBottomSheet, AppButton, AppOtpInput } from '../../../../components/common'
import { APP_COLORS } from '../../../../config/theme'
import { extractApiErrorMessage } from '../../ancillaryService'
import { startVisit, type ProviderVisitDetail } from '../../providerVisitService'

const CODE_LENGTH = 4

export type StartCodeSheetProps = {
	visible: boolean
	visitId: string
	patientFirstName: string
	onClose: () => void
	onStarted: (visit: ProviderVisitDetail) => void
}

export function StartCodeSheet({ visible, visitId, patientFirstName, onClose, onStarted }: StartCodeSheetProps) {
	const [code, setCode] = useState('')
	const [error, setError] = useState<string | null>(null)
	const [submitting, setSubmitting] = useState(false)

	useEffect(() => {
		if (visible) {
			setCode('')
			setError(null)
		}
	}, [visible])

	const ready = code.length === CODE_LENGTH

	const submit = async () => {
		if (!ready || submitting) return
		setSubmitting(true)
		setError(null)
		try {
			const visit = await startVisit(visitId, code)
			onStarted(visit)
		} catch (e) {
			setError(extractApiErrorMessage(e, 'Could not start the visit. Please try again.'))
		} finally {
			setSubmitting(false)
		}
	}

	return (
		<AppBottomSheet
			visible={visible}
			title="Enter start code"
			subtitle={`Ask ${patientFirstName} for the 4-digit code in the Karolahealth app`}
			onClose={onClose}
			appearance="modern"
			showHeaderDivider={false}
			dismissible={!submitting}
			footer={
				<AppButton
					size="lg"
					icon={ready ? 'check' : undefined}
					onPress={() => void submit()}
					loading={submitting}
					disabled={!ready || submitting}
					softDisabled
				>
					{ready ? 'Start visit' : 'Enter the 4-digit code'}
				</AppButton>
			}
		>
			<View style={styles.body}>
				<AppOtpInput
					length={CODE_LENGTH}
					value={code}
					onChange={(v) => {
						setCode(v)
						if (error) setError(null)
					}}
					autoFocus
					error={!!error}
					disabled={submitting}
					accessibilityLabel="Start code"
				/>
				{error ? (
					<Text style={styles.error} accessibilityLiveRegion="polite">
						{error}
					</Text>
				) : null}
				<View style={styles.hint}>
					<MaterialCommunityIcons name="shield-check-outline" size={16} color={APP_COLORS.inkMuted} />
					<Text style={styles.hintText}>
						{`The code proves you reached ${patientFirstName}’s home. It starts the visit timer and the patient is notified.`}
					</Text>
				</View>
			</View>
		</AppBottomSheet>
	)
}

const styles = StyleSheet.create({
	body: {
		alignItems: 'center',
		gap: 14,
		paddingTop: 8,
		paddingBottom: 8,
	},
	error: {
		fontSize: 13,
		lineHeight: 18,
		fontWeight: '600',
		color: APP_COLORS.danger,
		textAlign: 'center',
	},
	hint: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		gap: 6,
	},
	hintText: {
		flex: 1,
		fontSize: 12,
		lineHeight: 16,
		color: APP_COLORS.inkMuted,
	},
})

export default StartCodeSheet
