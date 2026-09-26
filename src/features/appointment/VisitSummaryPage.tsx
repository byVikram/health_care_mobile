// src/features/appointment/VisitSummaryPage.tsx
//
// Patient-facing "Visit summary" screen for a COMPLETED appointment — port of
// design Screen 7b (7b_visit_summary.html, 390x844). Per the "keep visuals,
// wire only what's real" rule used across this restyle pass: doctor's notes /
// prescription / follow-up only render when the backing TreatmentRecord
// actually has that field. TreatmentRecord carries no structured medicine or
// advised-test list (only notes / prescription_s3_key / follow_up_date), so the
// prescription block shows the real prescription document instead of
// fabricated medicine rows, and the lab-test row is a generic, always-real
// entry point into the Laboratory search flow rather than a named test.

import React, { useEffect, useState } from 'react'
import {
	View,
	ScrollView,
	StyleSheet,
	TouchableOpacity,
	ActivityIndicator,
	Linking,
	TextInput,
	Share,
} from 'react-native'
import { Text } from 'react-native-paper'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useNavigation, useRoute } from '@react-navigation/native'
import {
	AppActionChip,
	AppAvatar,
	AppButton,
	AppDashedDivider,
	AppFooterBar,
	AppIconTile,
	AppInfoBanner,
	AppScreenHeader,
	AppSection,
} from '../../components/common'
import { showComingSoon } from '../../utils/toast'
import { getAppointmentById } from '../../services/appointmentService'
import { getReviewForAppointment, createReview, DoctorReview } from '../../services/reviewService'
import { patientService, TreatmentRecord } from '../consultation/ConsultationService'
import { Appointment, AppointmentDoctor } from '../../types/appointment'
import { ROUTES } from '../../navigation/routes'
import { formatTimeSlot, capitaliseWords } from '../../utils/formatters'
import { buildS3Url } from '../../utils/s3Utils'
import { APP_COLORS, TONES, formatInr } from '../../config/theme'

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** Parses 'YYYY-MM-DD' as a local date (avoids UTC shift); falls back to Date parsing. */
function parseDate(d?: string | null): Date | null {
	if (!d) return null
	const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d)
	const date = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(d)
	return isNaN(date.getTime()) ? null : date
}

/** "Fri 5 Sep" */
const formatDayLabel = (date: Date) => `${DOW[date.getDay()]} ${date.getDate()} ${MONTHS[date.getMonth()]}`
/** "5 Dec 2026" */
const formatFullDate = (date: Date) => `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`

/** "3 months" / "2 weeks" / "5 days" between the visit and the follow-up date. */
function formatInterval(from: Date | null, to: Date): string | null {
	if (!from) return null
	const days = Math.round((to.getTime() - from.getTime()) / 86400000)
	if (days <= 0) return null
	if (days < 14) return `${days} day${days === 1 ? '' : 's'}`
	if (days < 60) {
		const w = Math.round(days / 7)
		return `${w} week${w === 1 ? '' : 's'}`
	}
	const mo = Math.round(days / 30)
	return `${mo} month${mo === 1 ? '' : 's'}`
}

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

	useEffect(() => {
		const patientId = appt?.patient?.id
		if (!patientId) return
		let cancelled = false
		const fetchTreatment = async () => {
			try {
				const records = await patientService.getPatientTreatmentHistory(patientId)
				if (cancelled) return
				const match = records.find((r) => String(r.appointment_id) === String(appt?.id)) ?? null
				setTreatment(match)
			} catch {
				// No treatment record is a valid real state (e.g. notes not yet added) — not an error banner.
			}
		}
		fetchTreatment()
		return () => {
			cancelled = true
		}
	}, [appt?.patient?.id, appt?.id])

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

	const bookingRef = appt.public_id ?? appt.id
	const rawStatus = typeof appt.status === 'string' ? appt.status : appt.status?.label
	const doctor = appt.doctor as DoctorWithQuals | undefined
	const doctorSpecialty = doctor?.specialty ?? doctor?.specialization
	const quals = Array.isArray(doctor?.qualifications)
		? doctor?.qualifications.join(', ')
		: (doctor?.qualifications ?? doctor?.degree ?? null)
	const avatarUri = buildS3Url(doctor?.avatar_s3_key)
	const visitDate = parseDate(appt.appointment_date)
	const timeLabel = appt.start_time ? formatTimeSlot(appt.start_time) : ''
	const whenLabel = [visitDate ? formatDayLabel(visitDate) : appt.appointment_date, timeLabel]
		.filter(Boolean)
		.join(', ')
	const whereLabel = modeLabel(appt.appointment_mode, appt.hospital?.name)
	const followUp = parseDate(treatment?.follow_up_date)
	const followUpInterval = followUp ? formatInterval(visitDate, followUp) : null
	const prescriptionDate = parseDate(treatment?.created_at?.slice(0, 10))
	const hasFee = appt.fees != null && Number(appt.fees) > 0
	const shownRating = review ? review.rating : rating

	const openDoctor = () => navigation.navigate(ROUTES.STACK.DOCTOR_DETAIL, { id: appt.doctor.id })

	const handleShare = () => {
		const lines = [
			`Visit summary · Booking ${bookingRef}`,
			appt.doctor?.name ? `${appt.doctor.name}${doctorSpecialty ? ` (${doctorSpecialty})` : ''}` : null,
			whenLabel,
			whereLabel,
			treatment?.notes ? `Doctor's notes: ${treatment.notes}` : null,
			followUp ? `Follow-up: around ${formatFullDate(followUp)}` : null,
		].filter(Boolean)
		Share.share({ message: lines.join('\n') }).catch(() => {})
	}

	const handleDownload = () => {
		const url = buildS3Url(treatment?.prescription_s3_key)
		if (!url) return comingSoon()
		Linking.openURL(url).catch(comingSoon)
	}

	return (
		<View style={styles.container}>
			<AppScreenHeader
				variant="bar"
				title="Visit summary"
				subtitle={`Booking ${bookingRef}`}
				titleStyle={styles.headerTitle}
				onBack={goBack}
				backAccessibilityLabel="Back to bookings"
				rightElement={
					<View style={styles.headerActions}>
						<TouchableOpacity onPress={handleShare} style={styles.headerBtn} accessibilityLabel="Share">
							<MaterialCommunityIcons name="share-variant-outline" size={22} color={APP_COLORS.surface} />
						</TouchableOpacity>
						<TouchableOpacity
							onPress={comingSoon}
							style={[styles.headerBtn, styles.headerBtnRight]}
							accessibilityLabel="Help"
						>
							<MaterialCommunityIcons name="help-circle-outline" size={22} color={APP_COLORS.surface} />
						</TouchableOpacity>
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
						<TouchableOpacity style={styles.viewProfileRow} onPress={openDoctor} hitSlop={8}>
							<Text style={styles.linkText}>View profile</Text>
							<MaterialCommunityIcons name="chevron-right" size={16} color={APP_COLORS.primary} />
						</TouchableOpacity>
					</View>
				</AppSection>

				{/* Doctor's notes — only when real */}
				{treatment?.notes ? (
					<AppSection title="Doctor’s notes" titleSize="sm" marginTop={0}>
						<Text style={styles.bodyText}>{treatment.notes}</Text>
					</AppSection>
				) : null}

				{/* Prescription — real prescription document + generic lab-test entry (see file header) */}
				<AppSection
					title={treatment?.prescription_s3_key ? 'Prescription' : 'Lab tests'}
					titleSize="sm"
					marginTop={0}
				>
					<View style={styles.rxBox}>
						{treatment?.prescription_s3_key ? (
							<View style={styles.rxRow}>
								<AppIconTile icon="pill" tone="peach" size={40} radius={12} iconSize={20} />
								<View style={styles.flexCol}>
									<Text style={styles.rxName}>Prescription</Text>
									<Text style={styles.rxMeta}>
										{prescriptionDate
											? `Issued ${formatFullDate(prescriptionDate)} · by ${appt.doctor?.name ?? 'your doctor'}`
											: `Issued by ${appt.doctor?.name ?? 'your doctor'}`}
									</Text>
								</View>
							</View>
						) : null}
						<View style={[styles.rxRow, treatment?.prescription_s3_key ? styles.rxRowDivider : null]}>
							<AppIconTile icon="flask-outline" tone="lilac" size={40} radius={12} iconSize={20} />
							<View style={styles.flexCol}>
								<Text style={styles.rxName}>Lab test</Text>
								<Text style={styles.rxMeta}>Book any test your doctor advised</Text>
							</View>
							<AppActionChip
								label="Book test"
								onPress={() => navigation.navigate(ROUTES.STACK.LABORATORY_LIST)}
							/>
						</View>
						{treatment?.prescription_s3_key ? (
							<View style={styles.rxFooter}>
								<AppActionChip
									label="Download"
									icon="chevron-down"
									onPress={handleDownload}
									style={styles.rxFooterBtn}
								/>
								<AppActionChip
									label="Order medicines"
									icon="pill"
									filled
									onPress={() => navigation.navigate(ROUTES.STACK.PHARMACY_SEARCH_PAGE)}
									style={styles.rxFooterBtn}
								/>
							</View>
						) : null}
					</View>
				</AppSection>

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
							<TouchableOpacity style={styles.receiptLink} onPress={comingSoon} hitSlop={8}>
								<MaterialCommunityIcons name="chevron-down" size={14} color={APP_COLORS.primary} />
								<Text style={styles.receiptText}>Receipt</Text>
							</TouchableOpacity>
						</View>
					</AppSection>
				) : null}

				{/* Rating — real getReviewForAppointment / createReview calls */}
				<AppSection title="How was your visit?" titleSize="sm" marginTop={0}>
					{reviewLoading ? (
						<ActivityIndicator color={APP_COLORS.primary} style={{ alignSelf: 'flex-start' }} />
					) : (
						<>
							<View style={styles.starRow} accessibilityRole="radiogroup" accessibilityLabel="Rating">
								{[1, 2, 3, 4, 5].map((s) => (
									<TouchableOpacity
										key={s}
										style={styles.starBtn}
										disabled={!!review}
										onPress={() => setRating(s)}
										accessibilityLabel={`${s} star`}
										accessibilityState={{ selected: s === shownRating }}
									>
										<MaterialCommunityIcons
											name={s <= shownRating ? 'star' : 'star-outline'}
											size={22}
											color={APP_COLORS.star}
										/>
									</TouchableOpacity>
								))}
							</View>
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
									{/* Local: AppActionChip has no loading state (spinner + label). */}
									<TouchableOpacity
										style={[
											styles.smallBtnPrimary,
											styles.submitBtn,
											submittingReview && { opacity: 0.6 },
										]}
										disabled={submittingReview}
										onPress={handleSubmitReview}
									>
										{submittingReview ? (
											<ActivityIndicator size="small" color={APP_COLORS.surface} />
										) : null}
										<Text style={styles.smallBtnPrimaryText}>Submit review</Text>
									</TouchableOpacity>
								</>
							) : null}
						</>
					)}
				</AppSection>

				{/* Help */}
				<TouchableOpacity style={styles.helpCard} onPress={comingSoon} activeOpacity={0.7}>
					<AppIconTile icon="chat-question-outline" tone="lilac" size={36} iconSize={18} />
					<View style={styles.flexCol}>
						<Text style={styles.helpTitle}>Need help with this booking?</Text>
						<Text style={styles.helpSub}>Chat with Karolahealth support</Text>
					</View>
					<MaterialCommunityIcons name="chevron-right" size={18} color={APP_COLORS.border} />
				</TouchableOpacity>
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
	headerBtn: {
		width: 44,
		height: 44,
		borderRadius: 22,
		alignItems: 'center',
		justifyContent: 'center',
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
		flexDirection: 'row',
		alignItems: 'center',
		alignSelf: 'flex-start',
		gap: 2,
		marginTop: 2,
	},
	linkText: {
		fontSize: 13,
		lineHeight: 18,
		fontWeight: '700',
		color: APP_COLORS.primary,
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
	rxRowDivider: {
		borderTopWidth: 1,
		borderTopColor: APP_COLORS.divider,
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
	rxFooter: {
		flexDirection: 'row',
		gap: 8,
		padding: 12,
		backgroundColor: APP_COLORS.pageBg,
	},
	rxFooterBtn: {
		flex: 1,
		minWidth: 0,
		justifyContent: 'center',
	},

	// Small (36px) primary button -- review submit only (needs a loading spinner)
	smallBtnPrimary: {
		height: 36,
		paddingHorizontal: 12,
		borderRadius: 10,
		backgroundColor: APP_COLORS.primary,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
	},
	smallBtnPrimaryText: {
		fontSize: 13,
		fontWeight: '700',
		color: APP_COLORS.surface,
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
	receiptLink: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
	},
	receiptText: {
		fontSize: 12,
		lineHeight: 16,
		fontWeight: '700',
		color: APP_COLORS.primary,
	},

	// Rating
	starRow: {
		flexDirection: 'row',
		gap: 8,
	},
	starBtn: {
		width: 44,
		height: 44,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: APP_COLORS.divider,
		backgroundColor: APP_COLORS.surface,
		alignItems: 'center',
		justifyContent: 'center',
	},
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
	submitBtn: {
		alignSelf: 'flex-start',
	},

	// Help
	helpCard: {
		marginHorizontal: 16,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		paddingVertical: 12,
		paddingHorizontal: 14,
		borderRadius: 12,
		backgroundColor: APP_COLORS.surface,
		borderWidth: 1,
		borderColor: APP_COLORS.divider,
	},
	helpTitle: {
		fontSize: 14,
		lineHeight: 20,
		fontWeight: '700',
		color: APP_COLORS.ink,
	},
	helpSub: {
		fontSize: 12,
		lineHeight: 16,
		color: APP_COLORS.inkMuted,
	},

	// Footer
	footerBtn: {
		flex: 1,
	},
})
