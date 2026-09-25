// src/features/appointment/VisitSummaryPage.tsx
//
// Patient-facing "Visit summary" screen for a COMPLETED appointment — the real
// equivalent of mockup Screen 7b. No such screen existed before; this is new.
// Per the "keep visuals, wire only what's real" rule used across this restyle
// pass: doctor's notes / prescription / follow-up only render when the
// backing TreatmentRecord actually has that field. The mockup's specific
// "Lipid profile — Book test" recommendation has no backing data anywhere in
// the app (no field for a doctor-recommended test exists), so instead of
// fabricating a test name we show a generic, always-real "Book a lab test"
// entry point into the Laboratory search flow.

import React, { useEffect, useState } from 'react'
import { View, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, Linking, TextInput } from 'react-native'
import { Text } from 'react-native-paper'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useNavigation, useRoute } from '@react-navigation/native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { AppButton } from '../../components/common'
import { getAppointmentById } from '../../services/appointmentService'
import { getReviewForAppointment, createReview, DoctorReview } from '../../services/reviewService'
import { patientService, TreatmentRecord } from '../consultation/ConsultationService'
import { Appointment } from '../../types/appointment'
import { ROUTES } from '../../navigation/routes'
import { formatShortDateDisplay } from '../../utils/date'
import { formatTimeSlot, capitaliseWords } from '../../utils/formatters'

const PRIMARY = '#2B6F71'
const INK = '#12373E'
const INK_MUTED = '#5B6B6E'
const DIVIDER = '#D5E1E2'
const SURFACE_MUTED = '#F5F8F8'
const SUCCESS_BG = '#E6F4EC'
const SUCCESS = '#1E7A4E'
const PEACH_BG = '#FDE8DC'
const PEACH = '#B4532A'
const LILAC_BG = '#ECE6FA'
const LILAC = '#6A4BB5'
const SKY = '#2463A8'
const AMBER = '#E8A200'

function formatDate(d?: string | null): string {
	if (!d) return '—'
	const date = new Date(d)
	if (isNaN(date.getTime())) return d
	return formatShortDateDisplay(date)
}

const formatTime = (t?: string | null): string => (t ? formatTimeSlot(t) : '')
const capitalise = capitaliseWords

export default function VisitSummaryPage() {
	const navigation = useNavigation<any>()
	const route = useRoute<any>()
	const insets = useSafeAreaInsets()
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
		getAppointmentById(appointmentId)
			.then((data) => {
				if (!cancelled) setAppt(data)
			})
			.catch(() => {
				if (!cancelled) setLoadError(true)
			})
			.finally(() => {
				if (!cancelled) setLoading(false)
			})
		return () => {
			cancelled = true
		}
	}, [appointmentId])

	useEffect(() => {
		const patientId = appt?.patient?.id
		if (!patientId) return
		let cancelled = false
		patientService
			.getPatientTreatmentHistory(patientId)
			.then((records) => {
				if (cancelled) return
				const match = records.find((r) => String(r.appointment_id) === String(appt?.id)) ?? null
				setTreatment(match)
			})
			.catch(() => {
				// No treatment record is a valid real state (e.g. notes not yet added) — not an error banner.
			})
		return () => {
			cancelled = true
		}
	}, [appt?.patient?.id, appt?.id])

	useEffect(() => {
		if (!appointmentId) return
		let cancelled = false
		setReviewLoading(true)
		getReviewForAppointment(appointmentId)
			.then((data) => {
				if (!cancelled) setReview(data)
			})
			.finally(() => {
				if (!cancelled) setReviewLoading(false)
			})
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
				<ActivityIndicator size="large" color={PRIMARY} />
			</View>
		)
	}

	if (loadError || !appt) {
		return (
			<View style={[styles.container, styles.centerContent]}>
				<MaterialCommunityIcons name="alert-circle-outline" size={48} color="#e53935" />
				<Text style={{ marginTop: 16, color: '#e53935', textAlign: 'center' }}>
					Failed to load this visit summary.
				</Text>
				<AppButton variant="primary" style={{ marginTop: 20 }} onPress={goBack}>
					Go Back
				</AppButton>
			</View>
		)
	}

	const rawStatus = typeof appt.status === 'string' ? appt.status : appt.status?.label
	const doctorSpecialty = appt.doctor?.specialty ?? appt.doctor?.specialization

	return (
		<View style={styles.container}>
			<View style={[styles.header, { paddingTop: 16 + insets.top }]}>
				<TouchableOpacity onPress={goBack} style={styles.backBtn} hitSlop={10}>
					<MaterialCommunityIcons name="arrow-left" size={22} color="#fff" />
				</TouchableOpacity>
				<View style={{ flex: 1 }}>
					<Text style={styles.headerTitle}>Visit summary</Text>
					<Text style={styles.headerSubtitle}>Booking #{appt.public_id ?? appt.id}</Text>
				</View>
			</View>

			<ScrollView
				contentContainerStyle={{ paddingBottom: 24 + insets.bottom }}
				showsVerticalScrollIndicator={false}
			>
				{/* Status banner */}
				<View style={styles.statusBanner}>
					<View style={styles.statusIconCircle}>
						<MaterialCommunityIcons name="check" size={22} color="#fff" />
					</View>
					<View style={{ flex: 1 }}>
						<Text style={styles.statusLabel}>{(rawStatus || '').toUpperCase()}</Text>
						<Text style={styles.statusDateTime}>
							{formatDate(appt.appointment_date)}
							{appt.start_time ? `, ${formatTime(appt.start_time)}` : ''}
						</Text>
						<Text style={styles.statusMeta}>
							{capitalise(appt.appointment_mode)}
							{appt.hospital?.name ? ` · ${appt.hospital.name}` : ''}
						</Text>
					</View>
				</View>

				{/* Doctor card */}
				<View style={styles.card}>
					<View style={styles.doctorRow}>
						{appt.doctor?.avatar_s3_key ? (
							<View style={styles.avatarWrap}>
								<Text style={styles.avatarInitial}>{appt.doctor.name?.charAt(0) ?? 'D'}</Text>
							</View>
						) : (
							<View style={styles.avatarWrap}>
								<Text style={styles.avatarInitial}>{appt.doctor?.name?.charAt(0) ?? 'D'}</Text>
							</View>
						)}
						<View style={{ flex: 1 }}>
							<Text style={styles.doctorName}>{appt.doctor?.name ?? '—'}</Text>
							{doctorSpecialty ? <Text style={styles.doctorSpecialty}>{doctorSpecialty}</Text> : null}
							<TouchableOpacity
								style={styles.viewProfileRow}
								onPress={() => navigation.navigate(ROUTES.STACK.DOCTOR_DETAIL, { id: appt.doctor.id })}
							>
								<Text style={styles.viewProfileText}>View profile</Text>
								<MaterialCommunityIcons name="chevron-right" size={16} color={PRIMARY} />
							</TouchableOpacity>
						</View>
					</View>
				</View>

				{/* Doctor's notes — only when real */}
				{treatment?.notes ? (
					<View style={styles.card}>
						<Text style={styles.sectionTitle}>Doctor's notes</Text>
						<Text style={styles.bodyText}>{treatment.notes}</Text>
					</View>
				) : null}

				{/* Prescription — only when real */}
				{treatment?.prescription_s3_key ? (
					<View style={styles.card}>
						<Text style={styles.sectionTitle}>Prescription</Text>
						<View style={styles.prescriptionRow}>
							<View style={[styles.iconBox, { backgroundColor: PEACH_BG }]}>
								<MaterialCommunityIcons name="file-document-outline" size={20} color={PEACH} />
							</View>
							<View style={{ flex: 1 }}>
								<Text style={styles.prescriptionTitle}>Prescription</Text>
								<Text style={styles.prescriptionMeta}>{formatDate(treatment.created_at)}</Text>
							</View>
						</View>
						<View style={styles.buttonRow}>
							<AppButton
								variant="outline"
								style={{ flex: 1 }}
								icon="tray-arrow-down"
								onPress={() => Linking.openURL(treatment.prescription_s3_key as string)}
							>
								Download
							</AppButton>
							<AppButton
								variant="primary"
								style={{ flex: 1 }}
								onPress={() => navigation.navigate(ROUTES.STACK.PHARMACY_SEARCH_PAGE)}
							>
								Order medicines
							</AppButton>
						</View>
					</View>
				) : null}

				{/* Generic lab-test entry point (no fabricated recommendation — see file header note) */}
				<View style={styles.card}>
					<Text style={styles.sectionTitle}>Need a lab test?</Text>
					<View style={styles.labRow}>
						<View style={[styles.iconBox, { backgroundColor: LILAC_BG }]}>
							<MaterialCommunityIcons name="flask-outline" size={20} color={LILAC} />
						</View>
						<Text style={[styles.bodyText, { flex: 1 }]}>
							Book a lab test near you whenever your doctor advises one.
						</Text>
					</View>
					<AppButton variant="outline" onPress={() => navigation.navigate(ROUTES.STACK.LABORATORY_LIST)}>
						Book a lab test
					</AppButton>
				</View>

				{/* Follow-up — only when real */}
				{treatment?.follow_up_date ? (
					<View style={styles.card}>
						<Text style={styles.sectionTitle}>Follow-up</Text>
						<View style={styles.followUpRow}>
							<View style={styles.followUpIconBox}>
								<MaterialCommunityIcons name="calendar-month" size={18} color={SKY} />
							</View>
							<View style={{ flex: 1 }}>
								<Text style={styles.followUpTitle}>Follow-up recommended</Text>
								<Text style={styles.followUpDate}>{formatDate(treatment.follow_up_date)}</Text>
							</View>
							<AppButton
								variant="primary"
								compact
								onPress={() => navigation.navigate(ROUTES.STACK.DOCTOR_DETAIL, { id: appt.doctor.id })}
							>
								Book
							</AppButton>
						</View>
					</View>
				) : null}

				{/* Payment — only the real fee field, no fabricated breakdown */}
				{appt.fees != null ? (
					<View style={styles.card}>
						<Text style={styles.sectionTitle}>Payment</Text>
						<View style={styles.paymentRow}>
							<Text style={styles.bodyText}>Consultation fee</Text>
							<Text style={styles.paymentValue}>₹{appt.fees}</Text>
						</View>
					</View>
				) : null}

				{/* Rating — real getReviewForAppointment / createReview calls */}
				<View style={styles.card}>
					<Text style={styles.sectionTitle}>How was your visit?</Text>
					{reviewLoading ? (
						<ActivityIndicator color={PRIMARY} style={{ marginTop: 8 }} />
					) : review ? (
						<View style={{ marginTop: 4 }}>
							<View style={{ flexDirection: 'row', gap: 4 }}>
								{[1, 2, 3, 4, 5].map((s) => (
									<MaterialCommunityIcons
										key={s}
										name={s <= review.rating ? 'star' : 'star-outline'}
										size={20}
										color={AMBER}
									/>
								))}
							</View>
							{review.comment ? (
								<Text style={[styles.bodyText, { marginTop: 8 }]}>{review.comment}</Text>
							) : null}
						</View>
					) : (
						<View style={{ marginTop: 4 }}>
							<View style={{ flexDirection: 'row', gap: 8 }}>
								{[1, 2, 3, 4, 5].map((s) => (
									<TouchableOpacity key={s} onPress={() => setRating(s)} hitSlop={6}>
										<MaterialCommunityIcons
											name={s <= rating ? 'star' : 'star-outline'}
											size={26}
											color={AMBER}
										/>
									</TouchableOpacity>
								))}
							</View>
							<TextInput
								placeholder="Add a comment (optional)"
								placeholderTextColor={INK_MUTED}
								value={comment}
								onChangeText={setComment}
								style={styles.commentInput}
								multiline
							/>
							<AppButton
								variant="primary"
								loading={submittingReview}
								disabled={!rating || submittingReview}
								onPress={handleSubmitReview}
								style={{ marginTop: 10, alignSelf: 'flex-start' }}
							>
								Submit review
							</AppButton>
						</View>
					)}
				</View>
			</ScrollView>

			<View style={[styles.footer, { paddingBottom: 12 + insets.bottom }]}>
				<AppButton
					variant="primary"
					style={styles.footerButton}
					onPress={() => navigation.navigate(ROUTES.STACK.DOCTOR_DETAIL, { id: appt.doctor.id })}
				>
					Book follow-up
				</AppButton>
			</View>
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: SURFACE_MUTED,
	},
	centerContent: {
		justifyContent: 'center',
		alignItems: 'center',
		padding: 24,
	},
	header: {
		backgroundColor: PRIMARY,
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 8,
		paddingBottom: 16,
		gap: 4,
	},
	backBtn: {
		width: 44,
		height: 44,
		borderRadius: 22,
		alignItems: 'center',
		justifyContent: 'center',
	},
	headerTitle: {
		fontSize: 18,
		lineHeight: 24,
		fontWeight: '700',
		color: '#fff',
	},
	headerSubtitle: {
		fontSize: 12,
		lineHeight: 16,
		fontWeight: '500',
		color: '#E3EFEF',
	},

	statusBanner: {
		margin: 16,
		marginBottom: 8,
		padding: 16,
		borderRadius: 16,
		backgroundColor: SUCCESS_BG,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
	},
	statusIconCircle: {
		width: 44,
		height: 44,
		borderRadius: 12,
		backgroundColor: SUCCESS,
		alignItems: 'center',
		justifyContent: 'center',
	},
	statusLabel: {
		fontSize: 11,
		lineHeight: 14,
		fontWeight: '800',
		letterSpacing: 0.6,
		color: SUCCESS,
	},
	statusDateTime: {
		fontSize: 18,
		lineHeight: 24,
		fontWeight: '800',
		color: INK,
		marginTop: 2,
	},
	statusMeta: {
		fontSize: 13,
		lineHeight: 18,
		color: INK_MUTED,
		marginTop: 2,
	},

	card: {
		marginHorizontal: 16,
		marginBottom: 8,
		padding: 16,
		borderRadius: 16,
		backgroundColor: '#fff',
	},
	sectionTitle: {
		fontSize: 16,
		lineHeight: 22,
		fontWeight: '800',
		color: INK,
		marginBottom: 10,
	},
	bodyText: {
		fontSize: 14,
		lineHeight: 21,
		color: INK,
	},

	doctorRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
	},
	avatarWrap: {
		width: 60,
		height: 60,
		borderRadius: 16,
		backgroundColor: PRIMARY,
		alignItems: 'center',
		justifyContent: 'center',
	},
	avatarInitial: {
		fontSize: 22,
		fontWeight: '700',
		color: '#fff',
	},
	doctorName: {
		fontSize: 17,
		lineHeight: 22,
		fontWeight: '800',
		color: INK,
	},
	doctorSpecialty: {
		fontSize: 13,
		lineHeight: 18,
		fontWeight: '700',
		color: LILAC,
		marginTop: 1,
	},
	viewProfileRow: {
		flexDirection: 'row',
		alignItems: 'center',
		alignSelf: 'flex-start',
		marginTop: 4,
	},
	viewProfileText: {
		fontSize: 13,
		fontWeight: '700',
		color: PRIMARY,
	},

	iconBox: {
		width: 40,
		height: 40,
		borderRadius: 12,
		alignItems: 'center',
		justifyContent: 'center',
	},
	prescriptionRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		padding: 12,
		borderWidth: 1,
		borderColor: DIVIDER,
		borderRadius: 12,
	},
	prescriptionTitle: {
		fontSize: 15,
		lineHeight: 20,
		fontWeight: '800',
		color: INK,
	},
	prescriptionMeta: {
		fontSize: 13,
		lineHeight: 18,
		color: INK_MUTED,
	},
	buttonRow: {
		flexDirection: 'row',
		gap: 8,
		marginTop: 10,
	},

	labRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		marginBottom: 12,
	},

	followUpRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
		padding: 12,
		borderRadius: 12,
		backgroundColor: '#DDEBFA',
	},
	followUpIconBox: {
		width: 32,
		height: 32,
		borderRadius: 10,
		backgroundColor: '#fff',
		alignItems: 'center',
		justifyContent: 'center',
	},
	followUpTitle: {
		fontSize: 14,
		lineHeight: 20,
		fontWeight: '800',
		color: SKY,
	},
	followUpDate: {
		fontSize: 12,
		lineHeight: 16,
		color: INK,
	},

	paymentRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
	},
	paymentValue: {
		fontSize: 14,
		lineHeight: 20,
		fontWeight: '700',
		color: INK,
	},

	commentInput: {
		marginTop: 10,
		borderWidth: 1,
		borderColor: DIVIDER,
		borderRadius: 10,
		paddingHorizontal: 12,
		paddingVertical: 8,
		fontSize: 13,
		color: INK,
		minHeight: 44,
		textAlignVertical: 'top',
	},

	footer: {
		backgroundColor: '#fff',
		borderTopWidth: 1,
		borderTopColor: DIVIDER,
		paddingHorizontal: 16,
		paddingTop: 12,
	},
	footerButton: {
		borderRadius: 12,
	},
})
