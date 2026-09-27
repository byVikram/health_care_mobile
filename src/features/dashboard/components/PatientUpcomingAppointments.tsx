// src/features/dashboard/components/PatientUpcomingAppointments.tsx
//
// Patient Home "Upcoming" ("1 · Home"): the next upcoming appointment as one card — doctor avatar,
// "{specialty} · In-clinic visit|Video consultation", status tag, and a mint footer strip with the
// relative slot ("Today, 5:30 PM"), clinic, directions and "View". Hidden when there is
// no upcoming appointment or the list fails to load.
import React, { useEffect, useMemo, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { useNavigation } from '@react-navigation/native'

import {
	AppActionChip,
	AppAvatar,
	AppIcon,
	AppIconButton,
	AppPathIcon,
	AppSection,
	AppSkeleton,
	AppTag,
	AppTextLink,
	type AppTagTone,
} from '../../../components/common'
import { APP_COLORS, TONES } from '../../../config/theme'
import { ROUTES } from '../../../navigation/routes'
import type { Appointment } from '../../../types/appointment'
import { combineDateTime, slotLabel } from '../../../utils/date'
import { openOnMap } from '../../../utils/maps'
import { getAppointments } from '../../doctor/doctorService'
import { HOME_ICONS, homeSectionProps } from '../homeTheme'

type ApiAppointment = Appointment & { appointment_time?: string }

type Props = {
	refreshToken?: number
	onRefreshComplete?: () => void
}

const CLOSED_STATUSES = new Set(['cancelled', 'completed', 'rejected', 'no_show'])

const statusLabel = (status: ApiAppointment['status']) =>
	(typeof status === 'string' ? status : status?.label ?? 'pending').toLowerCase()

const STATUS_TAG: Record<string, AppTagTone> = {
	confirmed: 'confirmed',
	pending: 'pending',
	rescheduled: 'scheduled',
	reschedule_required: 'pending',
}

const titleCase = (s: string) => s.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase())

const isVideo = (a: ApiAppointment) => /online|video/.test((a.appointment_mode ?? '').toLowerCase())

const startTime = (a: ApiAppointment) => a.start_time || a.appointment_time || ''

const doctorAvatar = (a: ApiAppointment): string | null => {
	const d = a.doctor as unknown as Record<string, string | null | undefined> | undefined
	return d?.avatar_s3_key || d?.avatar_url || d?.avatar || d?.profile_picture || d?.photo_url || d?.image_url || null
}

export default function PatientUpcomingAppointments({ refreshToken, onRefreshComplete }: Props) {
	const navigation = useNavigation<any>()

	const [items, setItems] = useState<ApiAppointment[]>([])
	const [loading, setLoading] = useState(true)
	const [failed, setFailed] = useState(false)

	useEffect(() => {
		let mounted = true
		const load = async () => {
			try {
				const res = await getAppointments({ limit: 10, variant: 'upcoming' })
				if (!mounted) return
				if (res.success) {
					setItems(Array.isArray(res.data) ? (res.data as ApiAppointment[]) : [])
					setFailed(false)
				} else {
					setFailed(true)
				}
			} catch {
				if (mounted) setFailed(true)
			} finally {
				if (mounted) {
					setLoading(false)
					onRefreshComplete?.()
				}
			}
		}
		void load()
		return () => {
			mounted = false
		}
	}, [refreshToken, onRefreshComplete])

	// The soonest open appointment.
	const next = useMemo(() => {
		const open = items.filter((a) => !CLOSED_STATUSES.has(statusLabel(a.status)))
		const at = (a: ApiAppointment) => combineDateTime(a.appointment_date, startTime(a))?.getTime() ?? Infinity
		return [...open].sort((a, b) => at(a) - at(b))[0] ?? null
	}, [items])

	if (!loading && (failed || !next)) return null

	const header = (
		<AppTextLink
			label="All bookings"
			onPress={() => navigation.navigate(ROUTES.MAIN.TABS, { screen: ROUTES.MAIN.PORTAL })}
		/>
	)

	if (loading || !next) {
		return (
			<AppSection title="Upcoming" right={header} {...homeSectionProps(10)}>
				<View style={styles.card}>
					<View style={styles.topRow}>
						<AppSkeleton width={52} height={52} borderRadius={12} color={APP_COLORS.divider} />
						<View style={styles.skeletonCol}>
							<AppSkeleton width="60%" height={16} color={APP_COLORS.divider} />
							<AppSkeleton width="45%" height={12} color={APP_COLORS.divider} />
						</View>
					</View>
					<View style={styles.footer}>
						<AppSkeleton width="50%" height={16} color={APP_COLORS.divider} />
					</View>
				</View>
			</AppSection>
		)
	}

	const video = isVideo(next)
	const status = statusLabel(next.status)
	const specialty = next.doctor?.specialty || next.doctor?.specialization || 'Consultation'
	const hospital = next.hospital
	const place = video ? 'Online consultation' : hospital?.name || 'Clinic'
	const canDirect = !video && !!(hospital?.address || hospital?.name)
	const when = slotLabel(next.appointment_date, startTime(next))

	return (
		<AppSection title="Upcoming" right={header} {...homeSectionProps(10)}>
			<View style={styles.card}>
				<View style={styles.topRow}>
					<AppAvatar
						uri={doctorAvatar(next)}
						name={next.doctor?.name}
						size={52}
						radius={12}
						backgroundColor={TONES.lilac.bg}
						initialsColor={TONES.lilac.ink}
					/>
					<View style={styles.doctorCol}>
						<Text style={styles.doctorName} numberOfLines={1}>
							{next.doctor?.name ?? 'Doctor'}
						</Text>
						<Text style={styles.doctorSub} numberOfLines={1}>
							{`${specialty} · ${video ? 'Video consultation' : 'In-clinic visit'}`}
						</Text>
					</View>
					<AppTag label={titleCase(status)} tone={STATUS_TAG[status] ?? 'upcoming'} style={styles.statusTag} />
				</View>

				<View style={styles.footer}>
					<View style={styles.whenCol}>
						<View style={styles.inline}>
							<AppPathIcon d={HOME_ICONS.calendar} size={16} strokeWidth={2.2} color={APP_COLORS.primary} />
							<Text style={styles.whenText} numberOfLines={1}>
								{when}
							</Text>
						</View>
						<View style={styles.inline}>
							<AppPathIcon
								d={video ? HOME_ICONS.video : HOME_ICONS.pin}
								size={14}
								strokeWidth={2.2}
								color={APP_COLORS.inkMuted}
							/>
							<Text style={styles.placeText} numberOfLines={1}>
								{place}
							</Text>
						</View>
					</View>
					{canDirect && (
						<AppIconButton
							accessibilityLabel={`Directions to ${hospital?.name ?? 'clinic'}`}
							onPress={() => openOnMap(hospital?.address, hospital?.name)}
						>
							<AppIcon name="directions" size={18} color={APP_COLORS.primary} rounded />
						</AppIconButton>
					)}
					<AppActionChip
						label="View"
						filled
						size="md"
						accessibilityLabel={`View appointment with ${next.doctor?.name ?? 'doctor'}`}
						onPress={() => navigation.navigate(ROUTES.STACK.APPOINTMENT_DETAILS, { appointmentId: next.id })}
						style={styles.viewButton}
					/>
				</View>
			</View>
		</AppSection>
	)
}

const styles = StyleSheet.create({
	card: {
		marginHorizontal: 16,
		borderRadius: 12,
		backgroundColor: APP_COLORS.surface,
		borderWidth: 1,
		borderColor: APP_COLORS.divider,
		overflow: 'hidden',
	},
	topRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		padding: 14,
	},
	skeletonCol: {
		flex: 1,
		gap: 8,
	},
	doctorCol: {
		flex: 1,
		minWidth: 0,
	},
	doctorName: {
		fontSize: 16,
		lineHeight: 22,
		fontWeight: '800',
		color: APP_COLORS.ink,
	},
	doctorSub: {
		fontSize: 13,
		lineHeight: 18,
		color: APP_COLORS.inkMuted,
	},
	statusTag: {
		alignSelf: 'center',
		paddingVertical: 4,
		borderRadius: 8,
	},
	footer: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
		paddingVertical: 12,
		paddingHorizontal: 14,
		backgroundColor: APP_COLORS.mint,
	},
	whenCol: {
		flex: 1,
		minWidth: 0,
	},
	inline: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
	},
	whenText: {
		flexShrink: 1,
		fontSize: 14,
		lineHeight: 20,
		fontWeight: '800',
		color: APP_COLORS.ink,
	},
	placeText: {
		flexShrink: 1,
		fontSize: 12,
		lineHeight: 16,
		color: APP_COLORS.inkMuted,
	},
	viewButton: {
		paddingHorizontal: 14,
	},
})
