// src/features/ancillary/staff/visit/StartCodeSheet.tsx
//
// "2a · Start code" sheet: the provider types the 4-digit start code the patient reads out from their app
// (each visit of a recurring order has its own). A correct code starts the visit timer and notifies the
// patient; a wrong one shows the error under the boxes.
import React, { useEffect, useRef, useState } from 'react'
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import Toast from 'react-native-toast-message'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { AppBottomSheet, AppButton } from '../../../../components/common'
import { APP_COLORS } from '../../../../config/theme'
import { extractApiErrorMessage } from '../../ancillaryService'
import { startVisit, type ProviderVisitDetail } from '../../providerVisitService'
import type { ProviderSpecialityCopy } from '../providerSpecialityCopy'

const CODE_LENGTH = 4

export type StartCodeSheetProps = {
	visible: boolean
	visitId: string
	patientFirstName: string
	copy: ProviderSpecialityCopy
	onClose: () => void
	onStarted: (visit: ProviderVisitDetail) => void
}

export function StartCodeSheet({ visible, visitId, patientFirstName, copy, onClose, onStarted }: StartCodeSheetProps) {
	const [code, setCode] = useState('')
	const [error, setError] = useState<string | null>(null)
	const [submitting, setSubmitting] = useState(false)
	const inputRef = useRef<TextInput>(null)

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
			setError(extractApiErrorMessage(e, `Could not start the ${copy.noun}. Please try again.`))
		} finally {
			setSubmitting(false)
		}
	}

	const resend = () =>
		Toast.show({
			type: 'info',
			text1: 'Code is in the patient’s app',
			text2: `${patientFirstName} can see the 4-digit start code on the booking in the Karolahealth app.`,
		})

	return (
		<AppBottomSheet
			visible={visible}
			title={copy.startTitle}
			subtitle={`Ask ${patientFirstName} for the 4-digit code in the Karolahealth app`}
			onClose={onClose}
			appearance="modern"
			showHeaderDivider={false}
			dismissible={!submitting}
		>
			<View style={styles.body}>
				<Pressable
					style={styles.boxes}
					onPress={() => inputRef.current?.focus()}
					accessibilityRole="none"
					accessible={false}
				>
					{Array.from({ length: CODE_LENGTH }, (_, i) => {
						const filled = !!code[i]
						return (
							<View
								key={i}
								style={[
									styles.box,
									filled && styles.boxFilled,
									code.length === i && !submitting && styles.boxActive,
									!!error && styles.boxError,
								]}
							>
								<Text style={styles.boxDigit}>{code[i] ?? ''}</Text>
							</View>
						)
					})}
					<TextInput
						ref={inputRef}
						value={code}
						onChangeText={(t) => {
							setCode(t.replace(/\D/g, '').slice(0, CODE_LENGTH))
							if (error) setError(null)
						}}
						keyboardType="number-pad"
						maxLength={CODE_LENGTH}
						autoFocus
						editable={!submitting}
						caretHidden
						textContentType="oneTimeCode"
						autoComplete="sms-otp"
						accessibilityLabel="4-digit start code"
						style={styles.hiddenInput}
					/>
				</Pressable>
				{error ? (
					<Text style={styles.error} accessibilityLiveRegion="polite">
						{error}
					</Text>
				) : null}
				<View style={styles.hint}>
					<MaterialCommunityIcons name="shield-check-outline" size={16} color={APP_COLORS.primary} />
					<Text style={styles.hintText}>
						{`The code proves you reached ${patientFirstName}’s home. It ${copy.startHint} and the patient is notified.`}
					</Text>
				</View>
				<Pressable onPress={resend} accessibilityRole="button" hitSlop={8}>
					<Text style={styles.resend}>Patient can’t find the code? Resend it by SMS</Text>
				</Pressable>
				<AppButton
					size="lg"
					icon={ready ? 'check' : undefined}
					onPress={() => void submit()}
					loading={submitting}
					disabled={!ready || submitting}
					softDisabled
					style={styles.cta}
				>
					{ready ? `Code verified · ${copy.startButton.toLowerCase()}` : 'Enter the 4-digit code'}
				</AppButton>
			</View>
		</AppBottomSheet>
	)
}

const styles = StyleSheet.create({
	body: {
		alignItems: 'center',
		gap: 14,
		paddingTop: 8,
		paddingBottom: 12,
	},
	boxes: {
		flexDirection: 'row',
		gap: 10,
	},
	box: {
		width: 60,
		height: 68,
		borderRadius: 12,
		borderWidth: 2,
		borderColor: APP_COLORS.divider,
		backgroundColor: APP_COLORS.surface,
		alignItems: 'center',
		justifyContent: 'center',
	},
	boxFilled: {
		borderColor: APP_COLORS.ink,
	},
	boxActive: {
		borderColor: APP_COLORS.primary,
	},
	boxError: {
		borderColor: APP_COLORS.danger,
	},
	boxDigit: {
		fontSize: 28,
		lineHeight: 34,
		fontWeight: '800',
		color: APP_COLORS.ink,
	},
	hiddenInput: {
		position: 'absolute',
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
		opacity: 0,
		fontSize: 16,
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
	resend: {
		fontSize: 13,
		lineHeight: 18,
		fontWeight: '700',
		color: APP_COLORS.primary,
		textAlign: 'center',
	},
	cta: {
		alignSelf: 'stretch',
	},
})

export default StartCodeSheet
