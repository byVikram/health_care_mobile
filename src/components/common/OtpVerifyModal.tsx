// components/common/OtpVerifyModal.tsx
// Reusable OTP verification popup, styled after the 6-digit box UI used at
// login (features/auth/components/OtpForm.tsx), but generic: it does not
// call authService.verifyOtp/sendOtp or touch auth tokens. Callers supply
// their own onVerify/onResend handlers, so this can gate any "verify to
// edit" flow (bank details, sensitive profile fields, etc.) as well as be
// reused for login-style flows that want a popup instead of a full screen.
import React, { useEffect, useRef, useState } from 'react'
import {
	ActivityIndicator,
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from 'react-native'
import { AppModal } from './AppModal'
import { AppTypography } from './AppTypography'

export interface OtpVerifyResult {
	success: boolean
	message?: string
}

export interface OtpVerifyModalProps {
	visible: boolean
	onDismiss: () => void
	/** Modal title shown in the AppModal header. */
	title?: string
	/** Short description shown above the OTP boxes, e.g. what the code was sent to. */
	description?: string
	/** Number of OTP digits. Defaults to 6 to match the login OTP screen. */
	length?: number
	/** Called with the entered code once all digits are filled and the user taps Verify. */
	onVerify: (code: string) => Promise<OtpVerifyResult> | OtpVerifyResult
	/** Optional resend handler. If omitted, the resend row is hidden. */
	onResend?: () => Promise<OtpVerifyResult> | OtpVerifyResult
	/** Cooldown (seconds) applied after a resend. Defaults to 60, matching login. */
	resendCooldownSeconds?: number
	/** Called after a successful verify, once the modal has reset its own state. */
	onSuccess?: () => void
	/** Optional helper hint shown under the boxes, e.g. a demo-mode OTP hint. */
	hint?: string
}

const TEAL = '#0c7c7c'

export default function OtpVerifyModal({
	visible,
	onDismiss,
	title = 'Verify OTP',
	description = 'Enter the code sent to your registered mobile number.',
	length = 6,
	onVerify,
	onResend,
	resendCooldownSeconds = 60,
	onSuccess,
	hint,
}: OtpVerifyModalProps) {
	const [otp, setOtp] = useState<string[]>(Array(length).fill(''))
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState('')
	const [resendLoading, setResendLoading] = useState(false)
	const [resendMessage, setResendMessage] = useState('')
	const [resendCooldown, setResendCooldown] = useState(0)
	const inputs = useRef<(TextInput | null)[]>([])

	// Reset internal state whenever the modal is (re)opened.
	useEffect(() => {
		if (visible) {
			setOtp(Array(length).fill(''))
			setError('')
			setResendMessage('')
			setResendCooldown(0)
			setLoading(false)
			setResendLoading(false)
		}
	}, [visible, length])

	useEffect(() => {
		if (resendCooldown <= 0) return
		const timer = setTimeout(() => setResendCooldown((prev) => prev - 1), 1000)
		return () => clearTimeout(timer)
	}, [resendCooldown])

	const handleChange = (val: string, idx: number) => {
		const digit = val.replace(/\D/g, '').slice(-1)
		const next = [...otp]
		next[idx] = digit
		setOtp(next)
		setError('')
		setResendMessage('')
		if (digit && idx < length - 1) {
			inputs.current[idx + 1]?.focus()
		}
	}

	const handleKeyPress = (e: any, idx: number) => {
		if (e.nativeEvent.key === 'Backspace' && !otp[idx] && idx > 0) {
			inputs.current[idx - 1]?.focus()
		}
	}

	const handleVerify = async () => {
		const code = otp.join('')
		if (code.length < length) {
			setError(`Please enter the complete ${length}-digit OTP`)
			return
		}

		setLoading(true)
		setError('')

		try {
			const result = await onVerify(code)
			if (!result.success) {
				setError(result.message || 'Invalid OTP. Please try again.')
				return
			}
			onSuccess?.()
			onDismiss()
		} catch (err: any) {
			setError(err?.message || 'Invalid OTP. Please try again.')
		} finally {
			setLoading(false)
		}
	}

	const handleResend = async () => {
		if (!onResend || resendCooldown > 0 || resendLoading) return

		setResendLoading(true)
		setResendMessage('')
		setError('')

		try {
			const result = await onResend()
			if (!result.success) {
				setError(result.message || 'Failed to resend OTP')
				return
			}
			setOtp(Array(length).fill(''))
			inputs.current[0]?.focus()
			setResendMessage('OTP resent successfully!')
			setResendCooldown(resendCooldownSeconds)
			setTimeout(() => setResendMessage(''), 3000)
		} catch (err: any) {
			setError(err?.message || 'Failed to resend OTP. Please try again.')
		} finally {
			setResendLoading(false)
		}
	}

	return (
		<AppModal visible={visible} onDismiss={onDismiss} title={title} contentContainerStyle={styles.squareCard}>
			<AppTypography variant="body" style={styles.description}>
				{description}
			</AppTypography>

			<View style={styles.otpRow}>
				{otp.map((digit, idx) => (
					<TextInput
						key={idx}
						ref={(el) => {
							inputs.current[idx] = el
						}}
						style={[
							styles.otpBox,
							digit ? styles.otpBoxFilled : null,
							!!error ? styles.otpBoxError : null,
						]}
						value={digit}
						onChangeText={(val) => handleChange(val, idx)}
						onKeyPress={(e) => handleKeyPress(e, idx)}
						keyboardType="number-pad"
						maxLength={1}
						textAlign="center"
						selectionColor={TEAL}
					/>
				))}
			</View>

			{!!error && <Text style={styles.errorText}>{error}</Text>}
			{!!resendMessage && <Text style={styles.successText}>{resendMessage}</Text>}
			{!!hint && (
				<AppTypography variant="caption" style={styles.hintText}>
					{hint}
				</AppTypography>
			)}

			<TouchableOpacity
				style={[styles.button, loading && styles.buttonDisabled]}
				onPress={handleVerify}
				disabled={loading}
				activeOpacity={0.85}
			>
				{loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Verify OTP</Text>}
			</TouchableOpacity>

			{onResend ? (
				<Text style={styles.resendText}>
					Didn't receive a code?{' '}
					{resendCooldown > 0 ? (
						<Text style={styles.resendCooldown}>Resend in {resendCooldown}s</Text>
					) : (
						<Text style={styles.tealUnderline} onPress={handleResend}>
							{resendLoading ? 'Sending...' : 'Resend OTP'}
						</Text>
					)}
				</Text>
			) : null}
		</AppModal>
	)
}

const styles = StyleSheet.create({
	squareCard: {
		width: 420,
		height: 420,
		borderRadius: 26,
		padding: 32,
		justifyContent: 'center',
		alignSelf: 'center',
	},
	description: {
		color: '#62707a',
		fontSize: 14,
		lineHeight: 21,
		marginBottom: 24,
		textAlign: 'center',
	},
	otpRow: {
		flexDirection: 'row',
		justifyContent: 'center',
		gap: 10,
		marginBottom: 24,
	},
	otpBox: {
		flex: 1,
		maxWidth: 56,
		height: 64,
		borderWidth: 1.5,
		borderColor: '#d1d5db',
		borderRadius: 12,
		fontSize: 24,
		fontWeight: '600',
		color: '#111',
		backgroundColor: '#f9fafb',
	},
	otpBoxFilled: {
		borderColor: TEAL,
		backgroundColor: '#f0fdfa',
	},
	otpBoxError: {
		borderColor: '#dc2626',
	},
	errorText: {
		color: '#dc2626',
		fontSize: 13,
		marginBottom: 12,
		textAlign: 'center',
	},
	successText: {
		color: TEAL,
		fontSize: 13,
		marginBottom: 12,
		textAlign: 'center',
	},
	hintText: {
		fontSize: 12,
		color: '#9a6b00',
		textAlign: 'center',
		marginBottom: 12,
	},
	button: {
		backgroundColor: TEAL,
		paddingVertical: 18,
		borderRadius: 12,
		alignItems: 'center',
		marginTop: 10,
	},
	buttonDisabled: {
		opacity: 0.7,
	},
	buttonText: {
		color: '#fff',
		fontWeight: '600',
		fontSize: 16,
	},
	resendText: {
		color: '#666',
		fontSize: 14,
		textAlign: 'center',
		marginTop: 16,
	},
	tealUnderline: {
		color: TEAL,
		fontWeight: '600',
		textDecorationLine: 'underline',
	},
	resendCooldown: {
		color: '#999',
		fontWeight: '500',
	},
})
