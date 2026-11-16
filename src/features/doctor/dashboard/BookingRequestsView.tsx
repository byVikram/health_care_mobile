// src/features/doctor/dashboard/BookingRequestsView.tsx
//
// The body of the Booking requests page ("Doctor Dashboard NEW"): "Patients are waiting to hear back.", a dismissible tip about the
// swipe ("Tip: swipe a card right to accept or left to decline, or tap ⋮ for all options."), then one swipe card per request, or
// "All caught up. New requests show here." The header (back arrow, "Booking requests", "N requests") is the screen's.
// The "Auto-confirm bookings" card (AutoConfirmCard) sits above all of it. Not drawn: the "answer within 6 hours" rule, which has no
// backend behind it.

import React, { useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { APP_COLORS } from '../../../config/theme'
import { AppEmptyCard, AppInfoBanner } from '../../../components/common'
import { statusReasonCopy } from '../../appointment/statusReason'
import {
	humanizeStatus,
	isPending,
	isRescheduleRequest,
	isUrgentRequest,
	isVideoMode,
	statusLabelOf,
} from '../scheduleUtils'
import { AutoConfirmCard } from './AutoConfirmCard'
import { BookingRequestCard } from './BookingRequestCard'
import type { Appointment } from '../../../types/appointment'

// The tip is shown until it is closed or a card is swiped, once per app session.
let tipGone = false

/** "70 yrs · Male · New request" ("Confirmed" and so on for a booking that is not a request, when it is referred from its menu). */
export function requestWho(apt: Appointment): string {
	const kind = isRescheduleRequest(apt)
		? 'Reschedule request'
		: isPending(apt)
			? 'New request'
			: humanizeStatus(statusLabelOf(apt))
	return [apt.patient?.age ? `${apt.patient.age} yrs` : null, apt.patient?.gender, kind].filter(Boolean).join(' · ')
}

type Props = {
	requests: Appointment[]
	loading: boolean
	busyId: string | null
	/** The last read of the requests failed: what is listed may be out of date, and an empty list proves nothing. */
	loadFailed?: boolean
	/** "Today, 8:00 PM" / "Fri 26 Sep, 10:30 AM" */
	whenOf: (apt: Appointment) => string
	feeOf: (apt: Appointment) => string
	onAccept: (apt: Appointment) => void
	onDecline: (apt: Appointment) => void
	onMenu: (apt: Appointment) => void
	/** The auto-confirm switch; null while it is not known yet (the card is left out until the server has answered). */
	autoConfirm: {
		enabled: boolean
		busy: boolean
		confirmedCount: number
		onChange: (enabled: boolean) => void
	} | null
}

export function BookingRequestsView({
	requests,
	loading,
	busyId,
	loadFailed = false,
	whenOf,
	feeOf,
	onAccept,
	onDecline,
	onMenu,
	autoConfirm,
}: Props) {
	const [showTip, setShowTip] = useState(!tipGone)
	const closeTip = () => {
		tipGone = true
		setShowTip(false)
	}

	if (loading && !autoConfirm) return <ActivityIndicator style={{ marginTop: 24 }} color={APP_COLORS.primary} />

	return (
		<View style={styles.page}>
			{!!autoConfirm && <AutoConfirmCard {...autoConfirm} />}
			{loading && <ActivityIndicator style={{ marginTop: 12 }} color={APP_COLORS.primary} />}
			{!loading && requests.length > 0 && (
				<>
					<Text style={styles.hint}>Patients are waiting to hear back.</Text>
					{showTip && (
						<AppInfoBanner
							tone="info"
							icon={null}
							title="Tip: swipe a card right to accept or left to decline, or tap ⋮ for all options."
							titleStyle={styles.tipText}
							right={
								<Pressable
									onPress={closeTip}
									accessibilityRole="button"
									accessibilityLabel="Dismiss tip"
									style={styles.tipClose}
								>
									<MaterialCommunityIcons name="close" size={18} color={APP_COLORS.primary} />
								</Pressable>
							}
						/>
					)}
				</>
			)}
			{loadFailed && !loading && (
				<AppInfoBanner
					tone="warning"
					icon="wifi-off"
					title="Couldn't refresh your requests. Pull down to try again."
					titleStyle={styles.tipText}
				/>
			)}
			{loading ? null : requests.length === 0 && !loadFailed ? (
				<AppEmptyCard title="All caught up" message="New requests show here." />
			) : (
				requests.map((apt) => (
					<BookingRequestCard
						key={apt.id}
						name={apt.patient?.name ?? 'Patient'}
						who={requestWho(apt)}
						when={whenOf(apt)}
						video={isVideoMode(apt.appointment_mode)}
						fee={feeOf(apt)}
						reason={apt.symptoms || apt.pre_intake?.symptoms || apt.reason}
						statusNote={statusReasonCopy(apt)}
						flag={isUrgentRequest(apt)}
						busy={busyId === apt.id}
						onAccept={() => onAccept(apt)}
						onDecline={() => onDecline(apt)}
						onMenu={() => onMenu(apt)}
						onSwiped={closeTip}
					/>
				))
			)}
		</View>
	)
}

const styles = StyleSheet.create({
	page: { gap: 12, paddingHorizontal: 16 },
	hint: { fontSize: 13, lineHeight: 18, color: APP_COLORS.inkMuted },
	// The shared banner's title is a bold coloured line; the tip is an ordinary sentence.
	tipText: { fontSize: 13, lineHeight: 18, fontWeight: '400', color: APP_COLORS.ink },
	tipClose: { width: 32, height: 32, borderRadius: 9999, alignItems: 'center', justifyContent: 'center' },
})
