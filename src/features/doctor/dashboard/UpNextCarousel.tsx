// src/features/doctor/dashboard/UpNextCarousel.tsx
//
// Home -> "Up next · N", from the "Doctor Dashboard NEW" design: a swipeable row of cards, one per patient still to be seen today
// (earliest first), a pager under it and a last "See all N to go" card when more are waiting. Each card: token (or VIDEO CONSULT),
// time and "in 12 min" / "1h 30m late", avatar, name, age and gender, the status chip, the reason for the visit, and the one action
// that fits where the patient is: Check in (not arrived), Start consult (checked in), Start video (a video visit).
// The swiping and the page dots are the shared AppCarousel; the chip is AppTag, the button AppButton, the photo AppAvatar.
// Not drawn because the API has nothing behind them: the patient's conditions / allergies tags and the call button.

import React from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { AppAvatar, AppButton, AppCarousel, AppPathIcon, AppTag, type AppTagTone } from '../../../components/common'
import { APP_COLORS } from '../../../config/theme'
import { buildS3Url } from '../../../utils/s3Utils'
import {
	effectiveStatusLabel,
	formatMinutes,
	formatTime12h,
	humanizeStatus,
	isVideoMode,
	minutesUntilStart,
} from '../scheduleUtils'
import type { Appointment } from '../../../types/appointment'

const ARROW = 'M9 6l6 6-6 6'

/** The chip's tone: checked in is green, a waiting patient blue, anything else neutral. */
function chipTone(label: string): AppTagTone {
	if (label === 'checked_in' || label === 'completed') return 'completed'
	if (label === 'not_arrived') return 'sky'
	if (label === 'pending') return 'pending'
	return 'neutral'
}

/** "in 12 min" while it is ahead, "1h 30m late" once the slot has started and the patient has not been checked in. */
function whenLabel(apt: Appointment): string | null {
	const diff = minutesUntilStart(apt)
	if (diff === null) return null
	if (diff > 0) return `in ${formatMinutes(diff)}`
	return effectiveStatusLabel(apt) === 'checked_in' ? null : diff === 0 ? 'now' : `${formatMinutes(diff)} late`
}

type Slide = { kind: 'visit'; apt: Appointment } | { kind: 'more' }

type Props = {
	/** The patients still to be seen, earliest first (at most `limit` are drawn as cards). */
	items: Appointment[]
	/** "06": the number of the visit in today's clinic queue; undefined for a video visit. */
	tokenOf: (apt: Appointment) => string | undefined
	/** How many cards before the "See all" card. */
	limit?: number
	startingId: string | null
	checkingInId: string | null
	onStart: (apt: Appointment) => void
	onCheckIn: (apt: Appointment) => void
	onOpen: (apt: Appointment) => void
	onSeeAll: () => void
}

export function UpNextCarousel({
	items,
	tokenOf,
	limit = 4,
	startingId,
	checkingInId,
	onStart,
	onCheckIn,
	onOpen,
	onSeeAll,
}: Props) {
	const shown = items.slice(0, limit)
	const slides: Slide[] = [
		...shown.map((apt): Slide => ({ kind: 'visit', apt })),
		...(items.length > shown.length ? [{ kind: 'more' } as Slide] : []),
	]

	return (
		<AppCarousel
			data={slides}
			loop={false}
			accessibilityLabel="Up next"
			keyExtractor={(slide) => (slide.kind === 'visit' ? slide.apt.id : 'more')}
			renderItem={({ item, active }) =>
				item.kind === 'more' ? (
					<TouchableOpacity
						accessibilityRole="button"
						accessibilityLabel={`See all ${items.length} to go`}
						onPress={onSeeAll}
						activeOpacity={0.8}
						style={styles.seeAll}
					>
						<View style={styles.seeAllIcon}>
							<AppPathIcon d={ARROW} size={20} strokeWidth={2.4} color={APP_COLORS.primary} />
						</View>
						<Text style={styles.seeAllText}>See all {items.length} to go</Text>
					</TouchableOpacity>
				) : (
					<UpNextCard
						apt={item.apt}
						token={tokenOf(item.apt)}
						starting={startingId === item.apt.id}
						checkingIn={checkingInId === item.apt.id}
						highlighted={active}
						onStart={() => onStart(item.apt)}
						onCheckIn={() => onCheckIn(item.apt)}
						onOpen={() => onOpen(item.apt)}
					/>
				)
			}
		/>
	)
}

function UpNextCard({
	apt,
	token,
	starting,
	checkingIn,
	highlighted,
	onStart,
	onCheckIn,
	onOpen,
}: {
	apt: Appointment
	token?: string
	starting: boolean
	checkingIn: boolean
	highlighted: boolean
	onStart: () => void
	onCheckIn: () => void
	onOpen: () => void
}) {
	const label = effectiveStatusLabel(apt)
	const video = isVideoMode(apt.appointment_mode)
	const when = whenLabel(apt)
	const reason = apt.symptoms || apt.pre_intake?.symptoms || apt.reason
	const patient = apt.patient
	const meta = [patient?.age ? `${patient.age} yrs` : null, patient?.gender].filter(Boolean).join(' · ')

	// A video visit starts the call; an in-clinic one starts the consultation once the patient is at the desk, until then it checks them in.
	const startsVisit = video || label === 'checked_in'

	return (
		<View style={[styles.card, highlighted && styles.cardOn]}>
			<TouchableOpacity
				activeOpacity={0.85}
				onPress={onOpen}
				accessibilityRole="button"
				accessibilityLabel={`Open ${patient?.name ?? 'patient'}`}
			>
				<View style={styles.band}>
					<Text style={styles.token}>{video ? 'VIDEO CONSULT' : token ? `TOKEN ${token}` : 'IN-CLINIC'}</Text>
					<Text style={styles.when} numberOfLines={1}>
						{formatTime12h(apt.start_time)}
						{when ? ` · ${when}` : ''}
					</Text>
				</View>
				<View style={styles.body}>
					<View style={styles.who}>
						<AppAvatar
							uri={buildS3Url(patient?.avatar_s3_key)}
							name={patient?.name}
							size={52}
							radius={12}
						/>
						<View style={{ flex: 1, minWidth: 0 }}>
							<Text style={styles.name} numberOfLines={1}>
								{patient?.name ?? 'Patient'}
							</Text>
							{!!meta && <Text style={styles.meta}>{meta}</Text>}
						</View>
						<AppTag label={humanizeStatus(label)} tone={chipTone(label)} />
					</View>
					{!!reason && (
						<View style={styles.reason}>
							<Text style={styles.reasonLabel}>REASON FOR VISIT</Text>
							<Text style={styles.reasonText} numberOfLines={3}>
								{reason}
							</Text>
						</View>
					)}
				</View>
			</TouchableOpacity>
			<View style={styles.footer}>
				{startsVisit ? (
					<AppButton size="md" onPress={onStart} loading={starting} disabled={starting}>
						{video ? 'Start video' : 'Start consult'}
					</AppButton>
				) : (
					<AppButton
						size="md"
						buttonColor={APP_COLORS.mint}
						textColor={APP_COLORS.primary}
						onPress={onCheckIn}
						loading={checkingIn}
						disabled={checkingIn}
					>
						Check in
					</AppButton>
				)}
			</View>
		</View>
	)
}

const styles = StyleSheet.create({
	card: {
		borderRadius: 14,
		borderWidth: 1.5,
		borderColor: APP_COLORS.divider,
		backgroundColor: '#FFFFFF',
		overflow: 'hidden',
	},
	cardOn: { borderColor: APP_COLORS.primary },
	band: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		gap: 8,
		paddingHorizontal: 14,
		paddingVertical: 10,
		backgroundColor: APP_COLORS.mint,
	},
	token: { fontSize: 12, lineHeight: 16, fontWeight: '800', letterSpacing: 0.6, color: APP_COLORS.primary },
	when: { flexShrink: 1, fontSize: 14, lineHeight: 20, fontWeight: '800', color: APP_COLORS.ink },
	body: { padding: 14, gap: 12 },
	who: { flexDirection: 'row', alignItems: 'center', gap: 12 },
	name: { fontSize: 18, lineHeight: 24, fontWeight: '800', color: APP_COLORS.ink },
	meta: { fontSize: 14, lineHeight: 20, color: APP_COLORS.inkMuted },
	reason: { padding: 10, borderRadius: 8, backgroundColor: APP_COLORS.pageBg, gap: 2 },
	reasonLabel: { fontSize: 11, lineHeight: 14, fontWeight: '800', letterSpacing: 0.6, color: APP_COLORS.inkMuted },
	reasonText: { fontSize: 14, lineHeight: 20, color: APP_COLORS.ink },
	footer: { paddingHorizontal: 14, paddingBottom: 14 },
	seeAll: {
		flex: 1,
		borderRadius: 14,
		borderWidth: 1.5,
		borderStyle: 'dashed',
		borderColor: APP_COLORS.divider,
		backgroundColor: '#FFFFFF',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 10,
		paddingVertical: 24,
	},
	seeAllIcon: {
		width: 44,
		height: 44,
		borderRadius: 9999,
		backgroundColor: APP_COLORS.mint,
		alignItems: 'center',
		justifyContent: 'center',
	},
	seeAllText: { fontSize: 15, lineHeight: 20, fontWeight: '800', color: APP_COLORS.primary },
})

export default UpNextCarousel
