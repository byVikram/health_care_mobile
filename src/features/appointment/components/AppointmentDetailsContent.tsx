// src/features/appointment/components/AppointmentDetailsContent.tsx
//
// Shared appointment-details content (profile header, info rows, history
// timeline, "view visit summary" CTA). Used by both AppointmentHistoryTab.tsx
// (bottom sheet) and AppointmentDetailsPage.tsx (full routed screen) so the
// real fetch/render logic lives in exactly one place.

import React, { useEffect, useRef, useState } from 'react'
import { Animated, Easing, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import { AppButton } from '../../../components/common'
import { getAppointmentById } from '../../../services/appointmentService'
import { Appointment, AppointmentHistoryEntry } from '../../../types/appointment'
import { getStatusStyle } from '../../../constants/statusColors'
import { ROUTES } from '../../../navigation/routes'
import { openDirections } from '../../../utils/maps'
import { formatTimeSlot, capitaliseWords } from '../../../utils/formatters'

const PRIMARY = '#2B6F71'
const INK = '#12373E'
const INK_MUTED = '#5B6B6E'
const DIVIDER = '#D5E1E2'
const SURFACE_MUTED = '#F5F8F8'

// ── Helpers ──────────────────────────────────────────────────────────────────

const formatTime = (t: string | null | undefined): string => (t ? formatTimeSlot(t) : '—')
const capitalise = capitaliseWords

function formatDate(d: string | null | undefined): string {
	if (!d) return '—'
	const date = new Date(d)
	if (isNaN(date.getTime())) return d
	return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
}

function formatDateTime(iso: string): string {
	const d = new Date(iso)
	if (isNaN(d.getTime())) return iso
	return (
		d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) +
		' · ' +
		d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
	)
}

/**
 * Safely convert a history slot value to a display string.
 * The backend can return:
 *   - null / undefined  → show nothing
 *   - a plain string    → use as-is
 *   - a slot object     → { appointment_date, start_time, end_time }
 *   - any other object  → JSON.stringify as a fallback
 */
function formatSlotValue(raw: unknown): string | null {
	if (raw === null || raw === undefined) return null
	if (typeof raw === 'string') return raw || null
	if (typeof raw === 'object') {
		const slot = raw as Record<string, string | null | undefined>
		const date = slot.appointment_date ?? slot.date ?? ''
		const start = slot.start_time ?? slot.startTime ?? ''
		const end = slot.end_time ?? slot.endTime ?? ''
		const parts: string[] = []
		if (date) parts.push(formatDate(date))
		if (start) parts.push(formatTime(start) + (end ? ' – ' + formatTime(end) : ''))
		return parts.length ? parts.join(', ') : JSON.stringify(raw)
	}
	return String(raw)
}

function getHistoryActionMeta(action: string): { icon: keyof typeof MaterialCommunityIcons.glyphMap; color: string } {
	const a = action.toLowerCase()
	if (a === 'created') return { icon: 'check-circle-outline', color: '#43a047' }
	if (a === 'rescheduled') return { icon: 'calendar-refresh', color: '#fb8c00' }
	if (a === 'cancelled') return { icon: 'close-circle-outline', color: '#e53935' }
	if (a === 'confirmed') return { icon: 'check-circle-outline', color: '#1e88e5' }
	return { icon: 'clock-outline', color: '#8e24aa' } // pending / other
}

function getActorChipColors(actorType: string): { bg: string; color: string } {
	if (actorType === 'doctor') return { bg: '#e3f2fd', color: '#1565c0' }
	return { bg: '#fce4ec', color: '#880e4f' }
}

// ── Sub-component: StatusChip ───────────────────────────────────────────────

function StatusChip({ status, fontSize = 11, height = 22 }: { status: string; fontSize?: number; height?: number }) {
	const { bg, color } = getStatusStyle(status)
	return (
		<View style={[styles.statusChip, { backgroundColor: bg, height, borderRadius: height / 2 }]}>
			<Text style={[styles.statusChipText, { color, fontSize }]}>{capitalise(status)}</Text>
		</View>
	)
}

// ── Sub-component: InfoRow ──────────────────────────────────────────────────

function InfoRow({
	icon,
	label,
	value,
}: {
	icon: keyof typeof MaterialCommunityIcons.glyphMap
	label: string
	value: React.ReactNode
}) {
	return (
		<View style={styles.infoRow}>
			<View style={styles.infoIconBox}>
				<MaterialCommunityIcons name={icon} size={16} color="#6b7280" />
			</View>
			<View style={styles.infoContent}>
				<Text style={styles.infoLabel}>{label}</Text>
				{typeof value === 'string' || typeof value === 'number' ? (
					<Text style={styles.infoValue}>{value}</Text>
				) : (
					<View>{value}</View>
				)}
			</View>
		</View>
	)
}

// ── Sub-component: HistoryTimeline ──────────────────────────────────────────

function HistoryTimeline({ entries }: { entries: AppointmentHistoryEntry[] }) {
	if (!entries.length) {
		return <Text style={styles.historyEmptyText}>No history available.</Text>
	}

	return (
		<View style={styles.historyContainer}>
			{entries.map((entry, idx) => {
				const fromStr = formatSlotValue(entry.old_value)
				const toStr = formatSlotValue(entry.new_value)
				const { icon, color } = getHistoryActionMeta(entry.action)
				const actorChip = getActorChipColors(entry.actor_type)
				const isLast = idx === entries.length - 1
				const showFromTo =
					(fromStr || toStr) &&
					entry.action.toLowerCase() !== 'confirmed' &&
					entry.action.toLowerCase() !== 'cancelled'

				return (
					<View key={idx} style={[styles.historyEntryRow, !isLast && styles.historyEntryRowPad]}>
						{/* Vertical connector line */}
						{!isLast && <View style={[styles.historyConnector, { borderColor: color + '33' }]} />}

						{/* Icon bubble */}
						<View
							style={[
								styles.historyIconBubble,
								{ borderColor: color + '40', backgroundColor: color + '18' },
							]}
						>
							<MaterialCommunityIcons name={icon} size={13} color={color} />
						</View>

						{/* Content */}
						<View style={styles.historyEntryContent}>
							<View style={styles.historyActionRow}>
								<Text style={styles.historyActionText}>{capitalise(entry.action)}</Text>
								<View style={[styles.historyActorChip, { backgroundColor: actorChip.bg }]}>
									<Text style={[styles.historyActorChipText, { color: actorChip.color }]}>
										{capitalise(entry.actor_type)}
									</Text>
								</View>
							</View>

							<Text style={styles.historyTimestamp}>{formatDateTime(entry.created_at)}</Text>

							{showFromTo && (
								<View style={styles.fromToCard}>
									{fromStr && (
										<View style={styles.fromToRow}>
											<View style={styles.fromToBullet} />
											<Text style={styles.fromToText}>
												<Text style={styles.fromToLabel}>From: </Text>
												{fromStr}
											</Text>
										</View>
									)}
									{toStr && (
										<View style={[styles.fromToRow, fromStr ? styles.fromToRowMargin : undefined]}>
											<View style={styles.fromToBullet} />
											<Text style={styles.fromToText}>
												<Text style={styles.fromToLabel}>To: </Text>
												{toStr}
											</Text>
										</View>
									)}
								</View>
							)}

							{entry.reason && <Text style={styles.historyReasonText}>Reason: {entry.reason}</Text>}
						</View>
					</View>
				)
			})}
		</View>
	)
}

// ── Sub-component: SkeletonBox / DrawerSkeleton ─────────────────────────────

function SkeletonBox({ width, height, style }: { width: number | string; height: number; style?: object }) {
	const opacity = useRef(new Animated.Value(0.4)).current

	useEffect(() => {
		const animation = Animated.loop(
			Animated.sequence([
				Animated.timing(opacity, { toValue: 1, duration: 700, easing: Easing.ease, useNativeDriver: true }),
				Animated.timing(opacity, { toValue: 0.4, duration: 700, easing: Easing.ease, useNativeDriver: true }),
			])
		)
		animation.start()
		return () => animation.stop()
	}, [opacity])

	return <Animated.View style={[{ width, height, backgroundColor: DIVIDER, borderRadius: 6, opacity }, style]} />
}

function DrawerSkeleton() {
	return (
		<View style={styles.skeletonContainer}>
			<View style={styles.skeletonHeaderRow}>
				<SkeletonBox width={48} height={48} style={{ borderRadius: 24 }} />
				<View style={styles.skeletonHeaderText}>
					<SkeletonBox width="60%" height={18} />
					<View style={{ height: 6 }} />
					<SkeletonBox width="40%" height={14} />
				</View>
			</View>

			<View style={styles.divider} />

			{Array.from({ length: 5 }).map((_, i) => (
				<View key={i} style={styles.skeletonInfoRow}>
					<SkeletonBox width={18} height={18} style={{ borderRadius: 9 }} />
					<View style={styles.skeletonInfoText}>
						<SkeletonBox width="30%" height={12} />
						<View style={{ height: 4 }} />
						<SkeletonBox width="55%" height={16} />
					</View>
				</View>
			))}

			<View style={styles.divider} />

			<SkeletonBox width="40%" height={18} />
			<View style={{ height: 12 }} />
			{Array.from({ length: 3 }).map((_, i) => (
				<View key={i} style={styles.skeletonInfoRow}>
					<SkeletonBox width={16} height={16} style={{ borderRadius: 8 }} />
					<View style={styles.skeletonInfoText}>
						<SkeletonBox width="50%" height={14} />
						<View style={{ height: 4 }} />
						<SkeletonBox width="70%" height={12} />
					</View>
				</View>
			))}
		</View>
	)
}

// ── Props ────────────────────────────────────────────────────────────────────

interface AppointmentDetailsContentProps {
	/** Whether this instance should be fetching right now (bottom sheet: only
	 *  while open; full-page screen: always true). */
	active: boolean
	appointmentId: string | null
	viewAs?: 'doctor' | 'patient'
	/** Called right before navigating to the visit-summary screen -- lets the
	 *  bottom-sheet caller close itself first. Full-page callers can omit it. */
	onBeforeNavigate?: () => void
}

// ── Main component ───────────────────────────────────────────────────────────

export default function AppointmentDetailsContent({
	active,
	appointmentId,
	viewAs = 'patient',
	onBeforeNavigate,
}: AppointmentDetailsContentProps) {
	const navigation = useNavigation<any>()
	const [appt, setAppt] = useState<Appointment | null>(null)
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)

	useEffect(() => {
		if (!active || !appointmentId) {
			setAppt(null)
			setError(null)
			return
		}
		let cancelled = false
		setLoading(true)
		setError(null)
		setAppt(null)

		const load = async () => {
			try {
				const data = await getAppointmentById(appointmentId)
				if (!cancelled) setAppt(data)
			} catch {
				if (!cancelled) setError('Failed to load appointment details. Please try again.')
			} finally {
				if (!cancelled) setLoading(false)
			}
		}
		void load()

		return () => {
			cancelled = true
		}
	}, [active, appointmentId])

	const rawStatus = appt
		? typeof appt.status === 'string'
			? appt.status
			: (appt.status as { label: string }).label
		: ''

	return (
		<>
			{loading && <DrawerSkeleton />}

			{error && !loading && (
				<View style={styles.errorContainer}>
					<Text style={styles.errorText}>{error}</Text>
				</View>
			)}

			{appt && !loading && (
				<View style={styles.contentContainer}>
					{/* ── Profile header (switches based on logged-in role) ── */}
					<View style={styles.doctorHeader}>
						{viewAs === 'doctor' ? (
							// Doctor is logged in → show patient's profile
							<>
								{appt.patient?.avatar_s3_key ? (
									<Image
										source={{ uri: appt.patient.avatar_s3_key }}
										style={styles.avatar}
										resizeMode="cover"
									/>
								) : (
									<View style={[styles.avatar, styles.avatarPlaceholder]}>
										<Text style={styles.avatarInitial}>{appt.patient?.name?.charAt(0) ?? 'P'}</Text>
									</View>
								)}
								<View style={styles.doctorInfo}>
									<View style={styles.doctorNameRow}>
										<Text style={styles.doctorName}>{appt.patient?.name ?? '—'}</Text>
										<StatusChip status={rawStatus} />
									</View>
									{(appt.patient?.gender || appt.patient?.age) && (
										<Text style={styles.specialty}>
											{[
												appt.patient?.gender,
												appt.patient?.age ? `${appt.patient.age} yrs` : undefined,
											]
												.filter(Boolean)
												.join(' · ')}
										</Text>
									)}
								</View>
							</>
						) : (
							// Patient is logged in → show doctor's profile (original behaviour)
							<>
								{appt.doctor?.avatar_s3_key ? (
									<Image
										source={{ uri: appt.doctor.avatar_s3_key }}
										style={styles.avatar}
										resizeMode="cover"
									/>
								) : (
									<View style={[styles.avatar, styles.avatarPlaceholder]}>
										<Text style={styles.avatarInitial}>{appt.doctor?.name?.charAt(0) ?? 'D'}</Text>
									</View>
								)}
								<View style={styles.doctorInfo}>
									<View style={styles.doctorNameRow}>
										<Text style={styles.doctorName}>{appt.doctor?.name ?? '—'}</Text>
										<StatusChip status={rawStatus} />
									</View>
									{(appt.doctor?.specialty || appt.doctor?.specialization) && (
										<Text style={styles.specialty}>
											{appt.doctor?.specialty ?? appt.doctor?.specialization}
										</Text>
									)}
								</View>
							</>
						)}
					</View>

					<View style={styles.divider} />

					{/* ── Appointment info rows ───────────────────────────── */}
					<View style={styles.infoSection}>
						<InfoRow icon="calendar-blank-outline" label="Date" value={formatDate(appt.appointment_date)} />
						<InfoRow
							icon="clock-outline"
							label="Time"
							value={`${formatTime(appt.start_time)}${appt.end_time ? ' – ' + formatTime(appt.end_time) : ''}`}
						/>
						<InfoRow icon="hospital-box-outline" label="Mode" value={capitalise(appt.appointment_mode)} />
						{appt.hospital && (
							<InfoRow
								icon="map-marker-outline"
								label="Hospital"
								value={
									<View>
										<Text style={styles.hospitalName}>{appt.hospital.name}</Text>
										{appt.hospital.address && (
											<Text style={styles.hospitalAddress}>{appt.hospital.address}</Text>
										)}
										{(appt.hospital.address || appt.hospital.name) && (
											<TouchableOpacity
												onPress={() =>
													openDirections(appt.hospital?.latitude, appt.hospital?.longitude, appt.hospital?.address, appt.hospital?.name)
												}
												style={styles.mapLink}
												activeOpacity={0.7}
											>
												<MaterialCommunityIcons name="open-in-new" size={12} color={PRIMARY} />
												<Text style={styles.mapLinkText}>View on Map</Text>
											</TouchableOpacity>
										)}
									</View>
								}
							/>
						)}
						<InfoRow
							icon="currency-inr"
							label="Consultation Fee"
							value={appt.fees != null ? `₹${appt.fees}` : '—'}
						/>
						{appt.patient && (
							<InfoRow
								icon="account-outline"
								label="Patient"
								value={
									`${appt.patient.name}` +
									(appt.patient.gender ? ` · ${capitalise(appt.patient.gender)}` : '') +
									(appt.patient.age ? `, ${appt.patient.age} yrs` : '')
								}
							/>
						)}
					</View>

					<View style={styles.divider} />

					{/* ── History timeline ───────────────────────────────── */}
					<View style={styles.historySection}>
						<Text style={styles.historySectionTitle}>Appointment History</Text>
						<View style={styles.historyScrollBox}>
							<ScrollView
								nestedScrollEnabled={true}
								showsVerticalScrollIndicator={true}
								indicatorStyle="black"
								persistentScrollbar={true}
								scrollEventThrottle={16}
								contentContainerStyle={styles.historyScrollContent}
							>
								<HistoryTimeline entries={appt.history ?? []} />
							</ScrollView>
						</View>
					</View>

					{viewAs === 'patient' && rawStatus.toLowerCase() === 'completed' && (
						<AppButton
							variant="primary"
							style={styles.visitSummaryBtn}
							onPress={() => {
								onBeforeNavigate?.()
								navigation.navigate(ROUTES.STACK.VISIT_SUMMARY, { appointmentId: appt.id })
							}}
						>
							View visit summary
						</AppButton>
					)}
				</View>
			)}
		</>
	)
}

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
	errorContainer: {
		alignItems: 'center',
		paddingVertical: 48,
	},
	errorText: {
		fontSize: 14,
		fontWeight: '500',
		color: '#dc2626',
		textAlign: 'center',
	},

	// Doctor header
	doctorHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		paddingBottom: 16,
	},
	avatar: {
		width: 52,
		height: 52,
		borderRadius: 26,
	},
	avatarPlaceholder: {
		backgroundColor: PRIMARY,
		alignItems: 'center',
		justifyContent: 'center',
	},
	avatarInitial: {
		fontSize: 20,
		fontWeight: '700',
		color: '#ffffff',
	},
	doctorInfo: {
		flex: 1,
		minWidth: 0,
	},
	doctorNameRow: {
		flexDirection: 'row',
		alignItems: 'center',
		flexWrap: 'wrap',
		gap: 8,
	},
	doctorName: {
		fontSize: 15,
		fontWeight: '700',
		color: INK,
	},
	specialty: {
		fontSize: 12,
		color: INK_MUTED,
		marginTop: 2,
	},

	divider: {
		height: 1,
		backgroundColor: DIVIDER,
		marginVertical: 4,
	},
	contentContainer: {
		paddingHorizontal: 20,
		paddingBottom: 28,
	},

	// Status chip
	statusChip: {
		alignSelf: 'flex-start',
		paddingHorizontal: 8,
		justifyContent: 'center',
		alignItems: 'center',
	},
	statusChipText: {
		fontWeight: '700',
	},

	// Info section / InfoRow
	infoSection: {
		paddingVertical: 8,
	},
	infoRow: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		gap: 12,
		paddingVertical: 6,
	},
	infoIconBox: {
		marginTop: 2,
		flexShrink: 0,
	},
	infoContent: {
		flex: 1,
		gap: 2,
	},
	infoLabel: {
		fontSize: 11,
		color: INK_MUTED,
		lineHeight: 14,
	},
	infoValue: {
		fontSize: 13,
		fontWeight: '500',
		color: INK,
		lineHeight: 18,
	},
	hospitalName: {
		fontSize: 13,
		fontWeight: '500',
		color: INK,
		lineHeight: 18,
	},
	hospitalAddress: {
		fontSize: 11,
		color: INK_MUTED,
		marginTop: 2,
		lineHeight: 15,
	},
	mapLink: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
		marginTop: 4,
	},
	mapLinkText: {
		fontSize: 12,
		color: PRIMARY,
		fontWeight: '600',
	},

	// History section
	historySection: {
		paddingTop: 16,
		paddingBottom: 8,
	},
	historySectionTitle: {
		fontSize: 14,
		fontWeight: '700',
		color: INK,
		marginBottom: 12,
	},
	historyScrollBox: {
		minHeight: 80,
		maxHeight: 240,
		borderWidth: 1,
		borderColor: DIVIDER,
		borderRadius: 10,
		backgroundColor: SURFACE_MUTED,
		// NOTE: overflow must NOT be 'hidden' — that clips the scrollbar indicator
	},
	historyContainer: {
		marginTop: 4,
	},
	historyScrollContent: {
		padding: 10,
	},
	historyEmptyText: {
		fontSize: 13,
		color: INK_MUTED,
		marginTop: 8,
	},
	historyEntryRow: {
		flexDirection: 'row',
		position: 'relative',
	},
	historyEntryRowPad: {
		paddingBottom: 20,
	},
	historyConnector: {
		position: 'absolute',
		left: 11,
		top: 22,
		bottom: 0,
		width: 1,
		borderLeftWidth: 1,
		borderStyle: 'dashed',
	},
	historyIconBubble: {
		width: 22,
		height: 22,
		borderRadius: 11,
		borderWidth: 1.5,
		alignItems: 'center',
		justifyContent: 'center',
		flexShrink: 0,
		marginTop: 1,
		zIndex: 1,
	},
	historyEntryContent: {
		flex: 1,
		marginLeft: 10,
		minWidth: 0,
	},
	historyActionRow: {
		flexDirection: 'row',
		alignItems: 'center',
		flexWrap: 'wrap',
		gap: 6,
	},
	historyActionText: {
		fontSize: 13,
		fontWeight: '600',
		color: INK,
	},
	historyActorChip: {
		borderRadius: 9,
		paddingHorizontal: 8,
		paddingVertical: 2,
	},
	historyActorChipText: {
		fontSize: 10,
		fontWeight: '700',
	},
	historyTimestamp: {
		fontSize: 11,
		color: INK_MUTED,
		marginTop: 2,
	},
	fromToCard: {
		marginTop: 6,
		padding: 8,
		backgroundColor: SURFACE_MUTED,
		borderRadius: 8,
		borderLeftWidth: 3,
		borderLeftColor: DIVIDER,
	},
	fromToRow: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		gap: 6,
	},
	fromToRowMargin: {
		marginTop: 4,
	},
	fromToBullet: {
		width: 5,
		height: 5,
		borderRadius: 3,
		backgroundColor: '#d1d5db',
		marginTop: 5,
		flexShrink: 0,
	},
	fromToText: {
		fontSize: 11,
		color: INK_MUTED,
		flex: 1,
	},
	fromToLabel: {
		fontWeight: '700',
		color: INK,
	},
	historyReasonText: {
		fontSize: 11,
		color: INK_MUTED,
		fontStyle: 'italic',
		marginTop: 4,
	},

	visitSummaryBtn: {
		marginTop: 16,
		borderRadius: 12,
	},

	// Skeleton
	skeletonContainer: {
		paddingTop: 4,
		gap: 16,
	},
	skeletonHeaderRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
	},
	skeletonHeaderText: {
		flex: 1,
	},
	skeletonInfoRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		marginBottom: 8,
	},
	skeletonInfoText: {
		flex: 1,
	},
})
