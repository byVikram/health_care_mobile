// src/features/appointment/VisitSummaryPage.tsx
//
// Patient-facing "Visit summary" screen for a COMPLETED appointment — port of
// design Screen 7b (7b_visit_summary.html, 390x844). Per the "keep visuals,
// wire only what's real" rule used across this restyle pass: doctor's notes /
// prescription / follow-up only render when the backing TreatmentRecord
// actually has that field. TreatmentRecord carries no structured medicine or
// advised-test list (only notes / prescription_s3_key / follow_up_date), so the
// prescription card shows the real prescription document instead of
// fabricated medicine rows, and the lab-test row is a generic, always-real
// entry point into the Laboratory search flow rather than a named test.

import React, { useCallback, useEffect, useState } from 'react'
import { View, ScrollView, StyleSheet, ActivityIndicator, TextInput, Share } from 'react-native'
import { Text } from 'react-native-paper'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import Toast from 'react-native-toast-message'
import { useNavigation, useRoute } from '@react-navigation/native'
import {
	AppActionChip,
	AppAvatar,
	AppButton,
	AppDashedDivider,
	AppFooterBar,
	AppIconButton,
	AppIconTile,
	AppInfoBanner,
	AppNavRow,
	AppScreenHeader,
	AppSection,
	AppTextLink,
	PrescriptionPreview,
} from '../../components/common'
import AppRatingStars from '../../components/common/display/AppRatingStars'
import { showComingSoon } from '../../utils/toast'
import { getAppointmentById } from '../../services/appointmentService'
import { getReviewForAppointment, createReview, DoctorReview } from '../../services/reviewService'
import { patientService, treatmentService, PrescriptionLink, TreatmentRecord } from '../consultation/ConsultationService'
import { Appointment, AppointmentDoctor } from '../../types/appointment'
import { ROUTES } from '../../navigation/routes'
import { formatTimeSlot, capitaliseWords, bookingRef } from '../../utils/formatters'
import { buildS3Url } from '../../utils/s3Utils'
import { openWebUrl } from '../../utils/safeLinking'
import { formatFullDate, formatInterval, fullDayLabel, parseDateOnly } from '../../utils/date'
import { APP_COLORS, TONES, formatInr } from '../../config/theme'

function modeLabel(mode?: string | null, hospital?: string | null): string {
	const m = (mode || '').toLowerCase()
	if (m.includes('video')) return 'Video call'
	if (m.includes('clinic')) return `In-clinic visit${hospital ? ` · ${hospital}` : ''}`
	return `${capitaliseWords(mode)}${hospital ? ` · ${hospital}` : ''}`
}

// Wrapped so press events / errors are never forwarded as showComingSoon's `text2`.
const comingSoon = () => showComingSoon()

type DoctorWithQuals = AppointmentDoctor & { qualifications?: string | string[] | null; degree?: string | null }

export default function VisitSummaryPage() {
	const navigation = useNavigation<any>()
	const route = useRoute<any>()
	const { appointmentId } = (route.params || {}) as { appointmentId: string }

	const [appt, setAppt] = useState<Appointment | null>(null)
	const [loading, setLoading] = useState(true)
	const [loadError, setLoadError] = useState(false)
	const [treatment, setTreatment] = useState<TreatmentRecord | null>(null)

	const [review, setReview] = useState<DoctorReview | null>(null)
	const [reviewLoading, setReviewLoading] = useState(false)
	const [rating, setRating] = useState(0)
	const [comment, setComment] = useState('')
	const [submittingReview, setSubmittingReview] = useState(false)
	const [downloading, setDownloading] = useState(false)

	useEffect(() => {
		if (!appointmentId) {
			setLoading(false)
			setLoadError(true)
			return
		}
		let cancelled = false
		setLoading(true)
		setLoadError(false)
		const fetchAppointment = async () => {
			try {
				const data = await getAppointmentById(appointmentId)
				if (!cancelled) setAppt(data)
			} catch {
				if (!cancelled) setLoadError(true)
			} finally {
				if (!cancelled) setLoading(false)
			}
		}
		fetchAppointment()
		return () => {
			cancelled = true
		}
	}, [appointmentId])

	// The doctor's handwritten notes are read through a signed link that expires after about five minutes, so the
	// record is reloaded (a fresh link) whenever the image reports it could not be fetched.
	const loadTreatment = useCallback(async () => {
		const patientId = appt?.patient?.id
		if (!patientId) return
		try {
			const records = await patientService.getPatientTreatmentHistory(patientId)
			// `appointment_id` is the internal number; the appointment on screen is known by its public id.
			const match = records.find((r) => r.appointment_public_id === appt?.id) ?? null
			setTreatment(match)
		} catch {
			// No treatment record is a valid real state (e.g. notes not yet added) — not an error banner.
		}
	}, [appt?.patient?.id, appt?.id])

	useEffect(() => {
		void loadTreatment()
	}, [loadTreatment])

	useEffect(() => {
		if (!appointmentId) return
		let cancelled = false
		setReviewLoading(true)
		const fetchReview = async () => {
			try {
				const data = await getReviewForAppointment(appointmentId)
				if (!cancelled) setReview(data)
			} catch {
				// No review yet (or it failed to load) — the rating form still shows.
			} finally {
				if (!cancelled) setReviewLoading(false)
			}
		}
		fetchReview()
		return () => {
			cancelled = true
		}
	}, [appointmentId])

	const handleSubmitReview = async () => {
		if (!rating || !appt) return
		setSubmittingReview(true)
		try {
			await createReview({
				doctor_id: appt.doctor.id,
				appointment_id: appt.id,
				rating,
				comment: comment.trim() || undefined,
			})
			const updated = await getReviewForAppointment(appointmentId)
			setReview(updated)
		} catch {
			// Swallow — review submission is a nice-to-have on this screen, no fabricated success state shown.
		} finally {
			setSubmittingReview(false)
		}
	}

	const goBack = () => {
		if (navigation.canGoBack()) navigation.goBack()
		else navigation.navigate(ROUTES.STACK.APPOINTMENTS)
	}

	if (loading) {
		return (
			<View style={[styles.container, styles.centerContent]}>
				<ActivityIndicator size="large" color={APP_COLORS.primary} />
			</View>
		)
	}

	if (loadError || !appt) {
		return (
			<View style={[styles.container, styles.centerContent]}>
				<MaterialCommunityIcons name="alert-circle-outline" size={48} color={APP_COLORS.danger} />
				<Text style={{ marginTop: 16, color: APP_COLORS.danger, textAlign: 'center' }}>
					Failed to load this visit summary.
				</Text>
				<AppButton variant="primary" style={{ marginTop: 20 }} onPress={goBack}>
					Go Back
				</AppButton>
			</View>
		)
	}

	const bookingId = bookingRef(appt.public_id ?? appt.id)
	const rawStatus = typeof appt.status === 'string' ? appt.status : appt.status?.label
	const doctor = appt.doctor as DoctorWithQuals | undefined
	const doctorSpecialty = doctor?.specialty ?? doctor?.specialization
	const quals = Array.isArray(doctor?.qualifications)
		? doctor?.qualifications.join(', ')
		: (doctor?.qualifications ?? doctor?.degree ?? null)
	const avatarUri = buildS3Url(doctor?.avatar_s3_key)
	const visitDate = parseDateOnly(appt.appointment_date, { ignoreTime: false })
	const timeLabel = appt.start_time ? formatTimeSlot(appt.start_time) : ''
	const whenLabel = [visitDate ? fullDayLabel(visitDate, { markToday: false }) : appt.appointment_date, timeLabel]
		.filter(Boolean)
		.join(', ')
	const whereLabel = modeLabel(appt.appointment_mode, appt.hospital?.name)
	const followUp = parseDateOnly(treatment?.follow_up_date, { ignoreTime: false })
	const followUpInterval = followUp ? formatInterval(visitDate, followUp) : null
	// The doctor's submitted prescription (the handwritten page) and/or an uploaded prescription file.
	const hasPrescription = !!(treatment?.notes_image_url || treatment?.prescription_s3_key)
	const prescriptionDate = parseDateOnly((treatment?.notes_submitted_at ?? treatment?.created_at)?.slice(0, 10), {
		ignoreTime: false,
	})
	const hasFee = appt.fees != null && Number(appt.fees) > 0
	const shownRating = review ? review.rating : rating

	const openDoctor = () => navigation.navigate(ROUTES.STACK.DOCTOR_DETAIL, { id: appt.doctor.id })

	const handleShare = () => {
		const lines = [
			`Visit summary · Booking ${bookingId}`,
			appt.doctor?.name ? `${appt.doctor.name}${doctorSpecialty ? ` (${doctorSpecialty})` : ''}` : null,
			whenLabel,
			whereLabel,
			treatment?.notes ? `Doctor's notes: ${treatment.notes}` : null,
			followUp ? `Follow-up: around ${formatFullDate(followUp)}` : null,
		].filter(Boolean)
		Share.share({ message: lines.join('\n') }).catch(() => {})
	}

	const handleDownload = async () => {
		if (downloading) return
		setDownloading(true)
		try {
			// The prescription's link is signed and expires after about five minutes: ask for a fresh one. The link on
			// screen may already be stale, so it is never opened as a fallback.
			let fresh: PrescriptionLink | null = null
			if (treatment?.notes_image_url && appt) {
				try {
					fresh = await treatmentService.getPrescription(appt.id)
				} catch {
					Toast.show({ type: 'error', text1: 'Couldn’t get your prescription. Check your connection and try again.' })
					return
				}
			}
			// Only the server's signed link is opened: a plain bucket URL built from the stored key is not trusted, and
			// the bucket is private. https only.
			const url = fresh?.prescription_url
			if (!url) return comingSoon()
			openWebUrl(url).catch(comingSoon)
		} finally {
			setDownloading(false)
		}
	}

	return (
		<View style={styles.container}>
			<AppScreenHeader
				variant="bar"
				solid
				title="Visit summary"
				subtitle={`Booking ${bookingId}`}
				titleStyle={styles.headerTitle}
				onBack={goBack}
				backAccessibilityLabel="Back to bookings"
				rightElement={
					<View style={styles.headerActions}>
						<AppIconButton
							icon="share-variant-outline"
							variant="ghost"
							size={44}
							circle
							onPress={handleShare}
							accessibilityLabel="Share"
						/>
						<AppIconButton
							icon="help-circle-outline"
							variant="ghost"
							size={44}
							circle
							onPress={comingSoon}
							accessibilityLabel="Help"
							style={styles.headerBtnRight}
						/>
					</View>
				}
			/>

			<ScrollView
				style={styles.scroll}
				contentContainerStyle={styles.scrollContent}
				showsVerticalScrollIndicator={false}
				keyboardShouldPersistTaps="handled"
			>
				{/* Status banner */}
				<AppInfoBanner
					tone="success"
					size="prominent"
					icon="check-bold"
					tileSize={44}
					eyebrow={rawStatus || 'completed'}
					title={whenLabel}
					subtitle={whereLabel}
					style={styles.statusBanner}
				/>
				<View style={{ height: 8 }} />

				{/* Doctor card */}
				<AppSection marginTop={0} gap={12} style={styles.doctorRow}>
					<AppAvatar
						uri={avatarUri}
						name={appt.doctor?.name?.replace(/^Dr\.?\s*/i, '').charAt(0) ?? 'D'}
						size={60}
						radius={16}
						backgroundColor={TONES.lilac.bg}
						initialsColor={TONES.lilac.ink}
						initialsStyle={styles.avatarInitial}
					/>
					<View style={styles.flexCol}>
						<Text style={styles.doctorName}>{appt.doctor?.name ?? '—'}</Text>
						{doctorSpecialty ? <Text style={styles.doctorSpecialty}>{doctorSpecialty}</Text> : null}
						{quals ? <Text style={styles.doctorQuals}>{quals}</Text> : null}
						<AppTextLink
							label="View profile"
							size="sm"
							onPress={openDoctor}
							style={styles.viewProfileRow}
						/>
					</View>
				</AppSection>

				{/* Doctor's notes: only when the doctor wrote some, and not when they are already on the prescription page */}
				{treatment?.notes?.trim() && !treatment.notes_image_url ? (
					<AppSection title="Doctor’s notes" titleSize="sm" marginTop={0}>
						<Text style={styles.bodyText}>{treatment.notes}</Text>
					</AppSection>
				) : null}

				{/* Prescription: the page the doctor wrote (tap to view it full screen), then the way on to lab tests. */}
				{hasPrescription ? (
					<AppSection title="Prescription" titleSize="sm" marginTop={0}>
						{treatment?.notes_image_url ? (
							<PrescriptionPreview
								uri={treatment.notes_image_url}
								title={prescriptionDate ? `Prescription · ${formatFullDate(prescriptionDate)}` : 'Prescription'}
								subtitle={[appt.doctor?.name, appt.hospital?.name].filter(Boolean).join(' · ') || 'Your doctor'}
								viewerSubtitle={[prescriptionDate ? formatFullDate(prescriptionDate) : null, appt.doctor?.name].filter(Boolean).join(' · ')}
								onExpired={loadTreatment}
								onSave={handleDownload}
								saving={downloading}
							/>
						) : (
							<View style={styles.rxBox}>
								<View style={styles.rxRow}>
									<AppIconTile icon="pill" tone="peach" size={40} radius={12} iconSize={20} />
									<View style={styles.flexCol}>
										<Text style={styles.rxName}>{appt.doctor?.name ?? 'Your doctor'}</Text>
										<Text style={styles.rxMeta}>
											{prescriptionDate ? `Issued ${formatFullDate(prescriptionDate)}` : 'Issued after your visit'}
										</Text>
									</View>
									<AppActionChip
										label="Download"
										icon="download-outline"
										onPress={handleDownload}
										loading={downloading}
										accessibilityLabel="Download prescription"
									/>
								</View>
							</View>
						)}
						<AppActionChip
							variant="tinted"
							icon="flask-outline"
							label="Book lab test"
							onPress={() => navigation.navigate(ROUTES.STACK.LABORATORY_LIST)}
							style={styles.labBtn}
						/>
					</AppSection>
				) : (
					/* No prescription: lab tests is still a real entry point into the Laboratory search flow */
					<AppSection title="Lab tests" titleSize="sm" marginTop={0}>
						<View style={styles.rxBox}>
							<View style={styles.rxRow}>
								<AppIconTile icon="flask-outline" tone="lilac" size={40} radius={12} iconSize={20} />
								<View style={styles.flexCol}>
									<Text style={styles.rxName}>Lab test</Text>
									<Text style={styles.rxMeta}>Book any test your doctor advised</Text>
								</View>
								<AppActionChip label="Book test" onPress={() => navigation.navigate(ROUTES.STACK.LABORATORY_LIST)} />
							</View>
						</View>
					</AppSection>
				)}

				{/* Follow-up — only when real */}
				{followUp ? (
					<AppSection title="Follow-up" titleSize="sm" marginTop={0}>
						<AppInfoBanner
							tone="sky"
							icon="calendar-blank-outline"
							title={followUpInterval ? `Review in ${followUpInterval}` : 'Follow-up recommended'}
							subtitle={`Around ${formatFullDate(followUp)}`}
							action={{ label: 'Book', onPress: openDoctor }}
						/>
					</AppSection>
				) : null}

				{/* Payment — only the real fee field */}
				{hasFee ? (
					<AppSection title="Payment" titleSize="sm" marginTop={0}>
						<View style={styles.payRow}>
							<Text style={styles.payText}>Consultation fee</Text>
							<Text style={styles.payText}>{formatInr(appt.fees)}</Text>
						</View>
						<View style={styles.payRow}>
							<Text style={styles.payText}>Booking fee</Text>
							<Text style={[styles.payText, styles.payFree]}>Free</Text>
						</View>
						<AppDashedDivider color={APP_COLORS.border} style={styles.payDash} />
						<View style={styles.payTotalRow}>
							<Text style={styles.payTotalLabel}>Paid</Text>
							<Text style={styles.payTotalValue}>{formatInr(appt.fees)}</Text>
						</View>
						<View style={styles.payMetaRow}>
							<View style={{ flex: 1 }} />
							<AppTextLink
								label="Receipt"
								size="sm"
								leadingIcon="chevron-down"
								trailingIcon="none"
								onPress={comingSoon}
								style={styles.receiptLink}
								textStyle={styles.receiptText}
							/>
						</View>
					</AppSection>
				) : null}

				{/* Rating — real getReviewForAppointment / createReview calls */}
				<AppSection title="How was your visit?" titleSize="sm" marginTop={0}>
					{reviewLoading ? (
						<ActivityIndicator color={APP_COLORS.primary} style={{ alignSelf: 'flex-start' }} />
					) : (
						<>
							<AppRatingStars
								variant="buttons"
								value={shownRating}
								onChange={review ? undefined : setRating}
								accessibilityLabel="Rating"
							/>
							{review ? (
								review.comment ? (
									<Text style={styles.bodyText}>{review.comment}</Text>
								) : null
							) : rating > 0 ? (
								<>
									<TextInput
										placeholder="Add a comment (optional)"
										placeholderTextColor={APP_COLORS.inkMuted}
										value={comment}
										onChangeText={setComment}
										style={styles.commentInput}
										multiline
									/>
									{/* `loading` shows spinner + label and blocks presses; the 0.6 dim is this screen's */}
									<AppActionChip
										label="Submit review"
										filled
										loading={submittingReview}
										onPress={handleSubmitReview}
										style={[styles.submitBtn, submittingReview && styles.submitBtnBusy]}
									/>
								</>
							) : null}
						</>
					)}
				</AppSection>

				{/* Help */}
				<AppNavRow
					title="Need help with this booking?"
					subtitle="Chat with Karolahealth support"
					onPress={comingSoon}
					leading={{ icon: 'chat-question-outline', tone: 'lilac', size: 36, iconSize: 18 }}
					trailing={<MaterialCommunityIcons name="chevron-right" size={18} color={APP_COLORS.border} />}
					style={styles.helpCard}
					titleStyle={styles.helpTitle}
				/>
			</ScrollView>

			{/* Footer */}
			<AppFooterBar>
				<AppButton
					variant="outline"
					size="lg"
					icon="chevron-down"
					style={styles.footerBtn}
					onPress={comingSoon}
				>
					Invoice
				</AppButton>
				<AppButton size="lg" style={styles.footerBtn} onPress={openDoctor}>
					Book follow-up
				</AppButton>
			</AppFooterBar>
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: APP_COLORS.pageBg,
	},
	centerContent: {
		justifyContent: 'center',
		alignItems: 'center',
		padding: 24,
	},
	flexCol: {
		flex: 1,
		minWidth: 0,
		flexDirection: 'column',
	},

	// Header (AppScreenHeader 'bar' defaults to 16/20 with a subtitle; the design uses 18/24 700)
	headerTitle: {
		fontSize: 18,
		lineHeight: 24,
		fontWeight: '700',
	},
	headerActions: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
	},
	headerBtnRight: {
		marginRight: -10,
	},

	scroll: {
		flex: 1,
	},
	scrollContent: {
		gap: 8,
		paddingBottom: 16,
	},

	// Status banner (prominent AppInfoBanner, centred with the design's 16 radius)
	statusBanner: {
		marginTop: 16,
		marginHorizontal: 16,
		borderRadius: 16,
		alignItems: 'center',
	},

	bodyText: {
		fontSize: 14,
		lineHeight: 21,
		color: APP_COLORS.ink,
	},

	// Doctor
	doctorRow: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	avatarInitial: {
		fontSize: 22,
		fontWeight: '800',
	},
	doctorName: {
		fontSize: 17,
		lineHeight: 22,
		fontWeight: '800',
		color: APP_COLORS.ink,
	},
	doctorSpecialty: {
		fontSize: 13,
		lineHeight: 18,
		fontWeight: '700',
		color: TONES.lilac.ink,
	},
	doctorQuals: {
		fontSize: 12,
		lineHeight: 16,
		color: APP_COLORS.inkMuted,
	},
	viewProfileRow: {
		alignSelf: 'flex-start',
		marginTop: 2,
	},

	// Prescription block
	rxBox: {
		borderWidth: 1,
		borderColor: APP_COLORS.divider,
		borderRadius: 12,
		overflow: 'hidden',
	},
	rxRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		padding: 12,
	},
	// Full-width "Book lab test" under the prescription row.
	labBtn: {
		alignSelf: 'stretch',
		marginTop: 12,
	},
	rxName: {
		fontSize: 15,
		lineHeight: 20,
		fontWeight: '800',
		color: APP_COLORS.ink,
	},
	rxMeta: {
		fontSize: 13,
		lineHeight: 18,
		color: APP_COLORS.inkMuted,
	},

	// Payment
	payRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
	},
	payText: {
		fontSize: 14,
		lineHeight: 20,
		color: APP_COLORS.ink,
	},
	payFree: {
		color: APP_COLORS.success,
		fontWeight: '700',
	},
	payDash: {
		marginTop: 2,
	},
	payTotalRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'baseline',
	},
	payTotalLabel: {
		fontSize: 15,
		fontWeight: '800',
		color: APP_COLORS.ink,
	},
	payTotalValue: {
		fontSize: 20,
		lineHeight: 26,
		fontWeight: '800',
		color: APP_COLORS.ink,
	},
	payMetaRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		gap: 8,
	},
	// AppTextLink sm at the design's 4px icon gap and 12/16 label
	receiptLink: {
		gap: 4,
	},
	receiptText: {
		fontSize: 12,
		lineHeight: 16,
	},

	// Rating
	commentInput: {
		borderWidth: 1,
		borderColor: APP_COLORS.divider,
		borderRadius: 12,
		paddingHorizontal: 12,
		paddingVertical: 10,
		fontSize: 14,
		lineHeight: 20,
		color: APP_COLORS.ink,
		minHeight: 72,
		textAlignVertical: 'top',
	},
	// AppActionChip filled: its 1px primary border + 11 = the design's 12px side padding
	submitBtn: {
		alignSelf: 'flex-start',
		paddingHorizontal: 11,
	},
	submitBtnBusy: {
		opacity: 0.6,
	},

	// Help
	// AppNavRow restyled as the design's bordered card; title 14/20 700
	helpCard: {
		marginHorizontal: 16,
		paddingVertical: 12,
		paddingHorizontal: 14,
		borderRadius: 12,
		backgroundColor: APP_COLORS.surface,
		borderWidth: 1,
		borderColor: APP_COLORS.divider,
	},
	helpTitle: {
		fontSize: 14,
		fontWeight: '700',
	},

	// Footer
	footerBtn: {
		flex: 1,
	},
})
