import AsyncStorage from '@react-native-async-storage/async-storage'
// features/auth/components/OtpForm.tsx
import React, { useEffect, useRef, useState } from 'react'
import { Keyboard, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import * as Device from 'expo-device'
import { verifyOtp, sendOtp } from '../authService'
import { markNotificationPromptShownOnBackend } from '../../../services/notificationPermissionService'
import { useAuth, UserRole } from '../../../context/AuthContext'
import { otpSchema, getFieldErrors } from '../../../validation/authSchemas'
import { APP_COLORS } from '../../../config/theme'
import { AuthFooter, AuthHeaderMint, CtaButton, ICON_PATHS, KeyboardLiftView, OtpBoxes, OTP_LENGTH, PathIcon } from './AuthKit'
import Toast from 'react-native-toast-message'

interface Props {
	contactNumber: string
	onVerify: () => void
	onEditContact?: () => void
	onBack?: () => void
	/** Verify button label, e.g. "Verify & log in". */
	ctaLabel?: string
	/** When set, the header shows "STEP n OF 2" (register flow). */
	step?: number
	/** Verify as soon as all digits are entered (the button still works for a manual verify). */
	autoVerify?: boolean
	/** New account: never show the "Enable Notifications" popup (the prompt is marked as already shown). */
	skipNotificationPrompt?: boolean
}

const RESEND_COOLDOWN_SECONDS = 60
// Longest wait for the keyboard to report it has closed, so a missed event can never hold up the login.
const KEYBOARD_CLOSE_TIMEOUT_MS = 600

/** Closes the keyboard and resolves once it is fully gone (at once when it is not open). */
const dismissKeyboard = () =>
	new Promise<void>((resolve) => {
		if (!Keyboard.isVisible()) {
			resolve()
			return
		}
		let timer: ReturnType<typeof setTimeout>
		const sub = Keyboard.addListener('keyboardDidHide', () => {
			clearTimeout(timer)
			sub.remove()
			resolve()
		})
		timer = setTimeout(() => {
			sub.remove()
			resolve()
		}, KEYBOARD_CLOSE_TIMEOUT_MS)
		Keyboard.dismiss()
	})

const formatTimer = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

export default function OtpForm({
	contactNumber,
	onVerify,
	onEditContact,
	onBack,
	ctaLabel = 'Verify & log in',
	step,
	autoVerify = false,
	skipNotificationPrompt = false,
}: Props) {
	const [otp, setOtp] = useState('')
	// One verify at a time: the last digit can arrive twice (typing + autofill) and must not submit twice.
	const verifying = useRef(false)
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState('')
	const [resendLoading, setResendLoading] = useState(false)
	const [resendMessage, setResendMessage] = useState('')
	// The code was just sent when this screen opens, so resend starts on cooldown.
	const [resendCooldown, setResendCooldown] = useState(RESEND_COOLDOWN_SECONDS)
	const { setAuth } = useAuth()

	useEffect(() => {
		if (resendCooldown <= 0) return
		const timer = setTimeout(() => setResendCooldown((prev) => prev - 1), 1000)
		return () => clearTimeout(timer)
	}, [resendCooldown])

	const handleChange = (val: string) => {
		setOtp(val)
		setError('')
		setResendMessage('')
		if (autoVerify && val.length === OTP_LENGTH) void handleVerify(val)
	}

	const handleVerify = async (code: string = otp) => {
		if (verifying.current) return
		const fieldErrors = getFieldErrors(otpSchema, { otp: code })
		if (fieldErrors.otp) {
			setError(fieldErrors.otp)
			return
		}

		verifying.current = true
		setLoading(true)
		setError('')

		try {
			const deviceName = Device.deviceName
			const deviceMetadata = {
				manufacturer: Device.manufacturer,
				model: Device.modelName,
				os_version: Device.osVersion,
				brand: Device.brand,
			}
			const response = await verifyOtp({
				contact_number: contactNumber,
				otp: code,
				device_name: deviceName,
				device_type: Platform.OS,
				fcm_token: null,
				device_metadata: deviceMetadata,
			})

			if (response.success === false || !response.data?.access_token || !response.data?.refresh_token) {
				throw new Error(response.message || 'OTP verification failed')
			}
			const normalizedRole = String(response.data.user?.role || '').toLowerCase()
			const role = normalizedRole as UserRole

			// Saving the session is what opens the dashboard: close the keyboard first, and wait until it is gone, so
			// the next screen never appears with the keyboard still sliding down.
			await dismissKeyboard()

			await setAuth(
				role,
				{
					id: response.data.user?.id,
					name: response.data.user?.name || '',
					email: response.data.user?.email,
				},
				response.data.access_token,
				response.data.refresh_token,
				skipNotificationPrompt ? true : (response.data.notification_prompt_shown ?? false)
			)
			// Remember it on the backend too, so the popup doesn't come back on the next login.
			// (not when the server already has it: that call would change nothing)
			if (skipNotificationPrompt && !response.data.notification_prompt_shown) void markNotificationPromptShownOnBackend()

			const returnedSpecialty =
				(response.data.user as any)?.specialty_id ||
				(response.data.user as any)?.specialty ||
				(response.data.user as any)?.specialty_name
			if (returnedSpecialty) {
				await AsyncStorage.setItem('user_specialty', String(returnedSpecialty))
			}

			onVerify()
		} catch (err: any) {
			const errorMsg = err?.response?.data?.message || err?.message || 'Invalid OTP. Please try again.'
			setError(errorMsg)
		} finally {
			verifying.current = false
			setLoading(false)
		}
	}

	const handleResend = async () => {
		if (resendCooldown > 0 || resendLoading) return

		setResendLoading(true)
		setResendMessage('')
		setError('')

		try {
			const response = await sendOtp(contactNumber)

			if (!response.success) {
				throw new Error(response.message || 'Failed to resend OTP')
			}

			setOtp('')
			setResendMessage('Code sent again')
			setResendCooldown(RESEND_COOLDOWN_SECONDS)
		} catch (err: any) {
			const errorMsg = err?.response?.data?.message || err?.message || 'Failed to resend OTP. Please try again.'
			setError(errorMsg)
			if (__DEV__) Toast.show({ type: 'error', text1: errorMsg })
		} finally {
			setResendLoading(false)
		}
	}

	const formatted = `${contactNumber.slice(0, 5)} ${contactNumber.slice(5)}`.trim()

	return (
		<KeyboardLiftView style={styles.flex}>
			<AuthHeaderMint onBack={onBack} backLabel="Back" step={step}>
				<View style={styles.art} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
					<View style={styles.artCircle}>
						<PathIcon d={ICON_PATHS.phone} size={38} color={APP_COLORS.primary} strokeWidth={1.8} />
					</View>
					<View style={styles.artBubble}>
						<Text style={styles.artBubbleText}>••••••</Text>
					</View>
				</View>

				<View style={styles.titleBlock}>
					<Text style={styles.title}>Enter the code</Text>
					<View style={styles.sentRow}>
						<Text style={styles.sentText}>Sent by SMS to</Text>
						<View style={styles.phoneChip}>
							<Text style={styles.phoneChipText}>{`+91 ${formatted}`}</Text>
							{onEditContact ? (
								<Pressable
									onPress={onEditContact}
									accessibilityRole="button"
									accessibilityLabel="Edit number"
									hitSlop={8}
									style={styles.editBtn}
								>
									<PathIcon
										d={ICON_PATHS.edit}
										size={14}
										color={APP_COLORS.primary}
										strokeWidth={2.2}
									/>
								</Pressable>
							) : null}
						</View>
					</View>
				</View>
			</AuthHeaderMint>

			<ScrollView
				style={styles.flex}
				contentContainerStyle={styles.main}
				keyboardShouldPersistTaps="handled"
				showsVerticalScrollIndicator={false}
			>
				<OtpBoxes value={otp} onChange={handleChange} error={!!error} autoFocus />

				{error ? (
					<Text accessibilityRole="alert" style={styles.errorText}>
						{error}
					</Text>
				) : (
					<Text style={styles.hint}>
						{resendMessage || "We'll fill it in automatically when the SMS arrives"}
					</Text>
				)}

				<View style={styles.resendBlock}>
					{resendCooldown > 0 ? (
						<View style={styles.timerPill}>
							<PathIcon d={ICON_PATHS.clock} size={15} color={APP_COLORS.inkMuted} strokeWidth={2.2} />
							<Text style={styles.timerText}>
								Resend code in <Text style={styles.timerStrong}>{formatTimer(resendCooldown)}</Text>
							</Text>
						</View>
					) : (
						<View style={styles.resendRow}>
							<Text style={styles.resendLabel}>Didn't get it?</Text>
							<Pressable
								onPress={handleResend}
								disabled={resendLoading}
								accessibilityRole="button"
								style={styles.resendBtn}
							>
								<Text style={styles.resendBtnText}>{resendLoading ? 'Sending...' : 'Resend SMS'}</Text>
							</Pressable>
						</View>
					)}
				</View>
			</ScrollView>

			<AuthFooter divider={false}>
				<CtaButton
					label={ctaLabel}
					onPress={() => void handleVerify()}
					disabled={otp.length < OTP_LENGTH}
					loading={loading}
				/>
			</AuthFooter>
		</KeyboardLiftView>
	)
}

const styles = StyleSheet.create({
	flex: { flex: 1, backgroundColor: APP_COLORS.surface },
	art: { height: 96, alignItems: 'center', justifyContent: 'center' },
	artCircle: {
		width: 84,
		height: 84,
		borderRadius: 42,
		backgroundColor: APP_COLORS.surface,
		alignItems: 'center',
		justifyContent: 'center',
		shadowColor: APP_COLORS.shadow,
		shadowOffset: { width: 0, height: 8 },
		shadowOpacity: 0.1,
		shadowRadius: 20,
		elevation: 4,
	},
	artBubble: {
		position: 'absolute',
		left: '50%',
		marginLeft: 26,
		top: 6,
		paddingVertical: 6,
		paddingHorizontal: 10,
		borderTopLeftRadius: 12,
		borderTopRightRadius: 12,
		borderBottomRightRadius: 12,
		borderBottomLeftRadius: 4,
		backgroundColor: APP_COLORS.primary,
	},
	artBubbleText: { fontSize: 14, fontWeight: '800', letterSpacing: 2.8, color: APP_COLORS.surface },
	titleBlock: { gap: 6 },
	title: { fontSize: 28, lineHeight: 34, fontWeight: '800', color: APP_COLORS.ink },
	sentRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
	sentText: { fontSize: 15, lineHeight: 22, color: '#3D5357' },
	phoneChip: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		paddingVertical: 2,
		paddingLeft: 10,
		paddingRight: 4,
		borderRadius: 999,
		backgroundColor: APP_COLORS.surface,
	},
	phoneChipText: { fontSize: 15, fontWeight: '800', color: APP_COLORS.ink },
	editBtn: {
		width: 26,
		height: 26,
		borderRadius: 13,
		backgroundColor: APP_COLORS.mint,
		alignItems: 'center',
		justifyContent: 'center',
	},
	main: { padding: 24, paddingTop: 28, paddingBottom: 16, gap: 16 },
	hint: { textAlign: 'center', fontSize: 12, lineHeight: 16, color: APP_COLORS.inkMuted },
	errorText: { textAlign: 'center', fontSize: 13, lineHeight: 18, fontWeight: '700', color: APP_COLORS.danger },
	resendBlock: { alignItems: 'center' },
	timerPill: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		paddingVertical: 6,
		paddingHorizontal: 12,
		borderRadius: 999,
		backgroundColor: APP_COLORS.pageBg,
	},
	timerText: { fontSize: 13, lineHeight: 18, color: APP_COLORS.inkMuted },
	timerStrong: { fontWeight: '700', color: APP_COLORS.ink },
	resendRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
	resendLabel: { fontSize: 14, color: APP_COLORS.inkMuted },
	resendBtn: {
		height: 36,
		paddingHorizontal: 12,
		borderWidth: 1.5,
		borderColor: APP_COLORS.primary,
		borderRadius: 999,
		backgroundColor: APP_COLORS.surface,
		alignItems: 'center',
		justifyContent: 'center',
	},
	resendBtnText: { fontSize: 13, fontWeight: '800', color: APP_COLORS.primary },
})
