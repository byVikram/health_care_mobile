// src/features/doctor/verify-access/VerifyAccessPage.tsx
//
// Doctor-side "Verify access" gate (source: the "Doctor Dashboard" design's Verify-access screen):
// the doctor reads back a 6-digit SMS code the patient just received before their file opens, so
// every access to a patient's health records is opt-in per visit and logged. Real network calls
// throughout (see doctorService.sendPatientAccessOtp / verifyPatientAccessOtp) — this is a PHI
// access gate, not cosmetic, so it never simulates a pass/fail client-side.

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import Toast from 'react-native-toast-message'
import { AppHeaderBackdrop, AppOtpInput, AppPathIcon, AppSoftCard } from '../../../components/common'
import { APP_COLORS } from '../../../config/theme'
import { ROUTES } from '../../../navigation/routes'
import type { RootStackParamList } from '../../../navigation/types'
import { startConsultation, verifyPatientAccessOtp } from '../doctorService'

const RESEND_SECONDS = 30
const MAX_TRIES = 3

type Route = RouteProp<RootStackParamList, typeof ROUTES.STACK.VERIFY_ACCESS>

export function VerifyAccessPage() {
	const navigation = useNavigation<any>()
	const insets = useSafeAreaInsets()
	const { params } = useRoute<Route>()
	const appointmentId = params?.appointmentId
	const patientName = params?.patientName ?? 'the patient'
	const patientMeta = params?.patientMeta

	const [code, setCode] = useState('')
	const [error, setError] = useState(false)
	const [errorReason, setErrorReason] = useState("That code didn't match.")
	const [tries, setTries] = useState(MAX_TRIES)
	const [verifying, setVerifying] = useState(false)
	const [wait, setWait] = useState(RESEND_SECONDS)
	const [altOpen, setAltOpen] = useState(false)
	const [shake, setShake] = useState(0)
	const timer = useRef<ReturnType<typeof setInterval> | null>(null)

	const tick = useCallback(() => {
		if (timer.current) clearInterval(timer.current)
		timer.current = setInterval(() => {
			setWait((w) => {
				if (w <= 1) {
					if (timer.current) clearInterval(timer.current)
					return 0
				}
				return w - 1
			})
		}, 1000)
	}, [])

	useEffect(() => {
		tick()
		return () => {
			if (timer.current) clearInterval(timer.current)
		}
	}, [tick])

	const full = code.length === 6
	const canVerify = full && tries > 0 && !verifying

	const openPatientFile = () => {
		navigation.replace(ROUTES.STACK.CONSULTATION, {
			appointmentId,
			patientId: params?.patientId,
		})
	}

	const handleVerify = async () => {
		if (!canVerify || !appointmentId) return
		setVerifying(true)
		try {
			const res = await verifyPatientAccessOtp(appointmentId, code)
			if (res.success && res.verified) {
				// No intermediate "Access granted" screen -- verifying is itself the consent action,
				// so go straight into the patient's file instead of making the doctor tap again.
				openPatientFile()
			} else {
				setTries((t) => Math.max(0, t - 1))
				setErrorReason(res.message || "That code didn't match.")
				setError(true)
				setCode('')
				setShake((s) => s + 1)
			}
		} catch (err: any) {
			// Surface the real backend reason (wrong OTP, expired code, wrong doctor account, appointment
			// not found, etc.) instead of a blanket "didn't match" -- that generic text was masking real
			// causes (e.g. being logged in as a different doctor than the one on the appointment) behind
			// what looked like a typo, making this impossible to self-diagnose.
			const reason: string | undefined = err?.response?.data?.message
			setTries((t) => Math.max(0, t - 1))
			setErrorReason(reason || "That code didn't match.")
			setError(true)
			setCode('')
			setShake((s) => s + 1)
			Toast.show({ type: 'error', text1: reason || 'Could not verify the code. Please try again.' })
		} finally {
			setVerifying(false)
		}
	}

	const handleResend = async () => {
		if (wait > 0 || !appointmentId) return
		try {
			// No dedicated "resend" endpoint exists — re-running start-consultation regenerates the
			// code server-side (see doctorService.startConsultation's doc comment on why this still
			// doesn't reach the patient by SMS today).
			await startConsultation(appointmentId)
			Toast.show({ type: 'success', text1: 'A new code was generated.' })
		} catch {
			Toast.show({ type: 'error', text1: 'Could not generate a new code.' })
		} finally {
			setWait(RESEND_SECONDS)
			setCode('')
			setError(false)
			setErrorReason("That code didn't match.")
			setTries(MAX_TRIES)
			tick()
		}
	}

	return (
		<View style={styles.screen}>
			<View style={[styles.header, { paddingTop: insets.top + 8 }]}>
				<AppHeaderBackdrop />
				<View style={styles.topRow}>
					<TouchableOpacity
						onPress={() => navigation.goBack()}
						accessibilityRole="button"
						accessibilityLabel="Back"
						style={styles.backButton}
					>
						<AppPathIcon d="M15 6l-6 6 6 6" size={22} strokeWidth={2.2} color="#FFFFFF" />
					</TouchableOpacity>
					<Text style={styles.headerTitle}>Verify access</Text>
				</View>
				<View style={styles.centerCol}>
					<View style={styles.shield}>
						<MaterialCommunityIcons name="shield-lock-outline" size={32} color="#FFFFFF" />
					</View>
					<Text style={styles.title}>Patient consent needed</Text>
					<Text style={styles.subtitle}>
						To protect health records, enter the code sent to the patient before opening the file.
					</Text>
				</View>
			</View>

			<ScrollView contentContainerStyle={styles.body}>
				<AppSoftCard radius={14}>
					<View style={styles.patientRow}>
						<View style={{ flex: 1, minWidth: 0 }}>
							<Text style={styles.patientName} numberOfLines={1}>
								{patientName}
							</Text>
							{!!patientMeta && (
								<Text style={styles.patientMeta} numberOfLines={1}>
									{patientMeta}
								</Text>
							)}
						</View>
						<View style={styles.lockChip}>
							<Text style={styles.lockChipText}>Locked</Text>
						</View>
					</View>
				</AppSoftCard>

				<AppSoftCard radius={14} style={{ gap: 14 }}>
					<View>
						<Text style={styles.otpTitle}>Enter the 6-digit code</Text>
						<Text style={styles.otpSub}>Sent by SMS to {patientName}&apos;s number</Text>
					</View>
					<AppOtpInput
						length={6}
						value={code}
						onChange={(v) => {
							setCode(v)
							setError(false)
						}}
						onComplete={handleVerify}
						error={error}
						caret
						shake={shake}
						autoFocus
						disabled={verifying || tries === 0}
						accessibilityLabel="One-time code"
						// Six boxes across the card: wider track + tighter gap + a 48px height make each box ~47x48 (near square) instead of ~37x56.
						boxHeight={48}
						style={styles.otpRow}
					/>
					{error && (
						<Text style={styles.errorText} accessibilityRole="alert">
							{errorReason} {tries > 0 ? `${tries} ${tries === 1 ? 'try' : 'tries'} left.` : 'Please resend a new code.'}
						</Text>
					)}
					<View style={styles.resendRow}>
						<Text style={styles.resendHint}>
							{wait > 0 ? `Resend in 0:${wait < 10 ? '0' : ''}${wait}` : "Didn't get the code?"}
						</Text>
						<TouchableOpacity onPress={handleResend} disabled={wait > 0}>
							<Text style={[styles.resendLabel, wait > 0 && styles.resendLabelDisabled]}>Resend SMS</Text>
						</TouchableOpacity>
					</View>
					<TouchableOpacity
						style={[styles.verifyBtn, !canVerify && styles.verifyBtnDisabled]}
						onPress={handleVerify}
						disabled={!canVerify}
					>
						{verifying ? (
							<ActivityIndicator size="small" color="#FFFFFF" />
						) : (
							<Text style={styles.verifyBtnText}>{full ? 'Verify & continue' : 'Enter all 6 digits'}</Text>
						)}
					</TouchableOpacity>
				</AppSoftCard>

				<View style={{ gap: 6 }}>
					<TouchableOpacity
						style={styles.altToggle}
						onPress={() => setAltOpen((o) => !o)}
						accessibilityRole="button"
						accessibilityState={{ expanded: altOpen }}
					>
						<Text style={styles.altToggleText}>Patient can&apos;t receive the code?</Text>
						<MaterialCommunityIcons
							name={altOpen ? 'chevron-up' : 'chevron-down'}
							size={16}
							color={APP_COLORS.primary}
						/>
					</TouchableOpacity>
					{altOpen && (
						<View style={{ gap: 8 }}>
							<View style={styles.altOption}>
								<MaterialCommunityIcons name="qrcode-scan" size={20} color={APP_COLORS.primary} />
								<View style={{ flex: 1 }}>
									<Text style={styles.altOptionTitle}>Scan patient&apos;s check-in QR</Text>
									<Text style={styles.altOptionSub}>From their Karolahealth app</Text>
								</View>
							</View>
							<View style={[styles.altOption, styles.altOptionDanger]}>
								<MaterialCommunityIcons name="alert-outline" size={20} color={APP_COLORS.danger} />
								<View style={{ flex: 1 }}>
									<Text style={styles.altOptionTitle}>Emergency access</Text>
									<Text style={styles.altOptionSub}>Give a reason. The patient and clinic admin are told.</Text>
								</View>
							</View>
						</View>
					)}
				</View>

				<View style={styles.footerNote}>
					<MaterialCommunityIcons name="shield-outline" size={18} color={APP_COLORS.inkMuted} />
					<Text style={styles.footerNoteText}>
						Health records open only with the patient&apos;s consent. Ask {patientName.split(' ')[0]} to read out the
						code they just received.
					</Text>
				</View>
			</ScrollView>
		</View>
	)
}

export default VerifyAccessPage

const styles = StyleSheet.create({
	screen: { flex: 1, backgroundColor: APP_COLORS.pageBg },
	header: {
		position: 'relative',
		overflow: 'hidden',
		backgroundColor: APP_COLORS.ink,
		// paddingTop is set inline (insets.top + 8) so it clears the status bar/notch -- see AppHeader.
		paddingHorizontal: 16,
		paddingBottom: 28,
		borderBottomLeftRadius: 24,
		borderBottomRightRadius: 24,
		gap: 16,
	},	topRow: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44 },
	backButton: { width: 44, height: 44, marginLeft: -8, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
	headerTitle: { fontSize: 16, lineHeight: 22, fontWeight: '800', color: '#FFFFFF' },
	centerCol: { alignItems: 'center', gap: 10 },
	shield: {
		width: 64,
		height: 64,
		borderRadius: 20,
		backgroundColor: '#FFFFFF1F',
		alignItems: 'center',
		justifyContent: 'center',
	},
	title: { fontSize: 22, lineHeight: 28, fontWeight: '800', color: '#FFFFFF', textAlign: 'center' },
	subtitle: { fontSize: 14, lineHeight: 20, color: '#E3EFEF', textAlign: 'center', maxWidth: 300 },
	body: { padding: 16, gap: 16 },
	patientRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
	patientName: { fontSize: 16, lineHeight: 22, fontWeight: '800', color: APP_COLORS.ink },
	patientMeta: { fontSize: 12, lineHeight: 16, color: APP_COLORS.inkMuted },
	lockChip: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, backgroundColor: APP_COLORS.warningBg },
	lockChipText: { fontSize: 11, lineHeight: 16, fontWeight: '700', color: APP_COLORS.warning },
	otpTitle: { fontSize: 15, lineHeight: 20, fontWeight: '800', color: APP_COLORS.ink },
	otpRow: { maxWidth: 320, gap: 8 },
	otpSub: { fontSize: 13, lineHeight: 18, color: APP_COLORS.inkMuted },
	errorText: { fontSize: 13, lineHeight: 18, fontWeight: '700', color: APP_COLORS.danger },
	resendRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
	resendHint: { fontSize: 13, lineHeight: 18, color: APP_COLORS.inkMuted },
	resendLabel: { fontSize: 13, lineHeight: 18, fontWeight: '700', color: APP_COLORS.primary },
	resendLabelDisabled: { color: APP_COLORS.inkDisabled },
	verifyBtn: {
		height: 52,
		borderRadius: 12,
		backgroundColor: APP_COLORS.primary,
		alignItems: 'center',
		justifyContent: 'center',
		flexDirection: 'row',
		gap: 6,
	},
	verifyBtnDisabled: { backgroundColor: APP_COLORS.disabledBtn },
	verifyBtnText: { fontSize: 15, lineHeight: 20, fontWeight: '800', color: '#FFFFFF' },
	altToggle: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 6 },
	altToggleText: { fontSize: 13, lineHeight: 18, fontWeight: '700', color: APP_COLORS.primary },
	altOption: {
		minHeight: 52,
		padding: 12,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: APP_COLORS.divider,
		backgroundColor: APP_COLORS.surface,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
	},
	altOptionDanger: { borderColor: '#F3B7AE' },
	altOptionTitle: { fontSize: 14, lineHeight: 19, fontWeight: '800', color: APP_COLORS.ink },
	altOptionSub: { fontSize: 12, lineHeight: 16, color: APP_COLORS.inkMuted },
	footerNote: {
		marginTop: 'auto',
		flexDirection: 'row',
		gap: 10,
		padding: 12,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: APP_COLORS.divider,
	},
	footerNoteText: { flex: 1, fontSize: 12, lineHeight: 17, color: APP_COLORS.inkMuted },
})
