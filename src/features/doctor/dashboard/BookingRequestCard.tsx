// src/features/doctor/dashboard/BookingRequestCard.tsx
//
// One request on the Booking requests page, from the "Doctor Dashboard NEW" design. There are no buttons on the card: swipe it right
// to accept (a green "Accept" grows from the left, "Release to accept" once it is far enough) or left to decline (red, from the
// right), or tap the three dots for every option. The card: round initials badge, name, "70 yrs · Male · New request", the slot with
// the fee on the right, "Reason · ...", and for a patient marked severe a red "May need urgent in-person care" note (the border
// turns red too). Screen-reader users get Accept and Decline as custom actions instead of the swipe (the three dots stay reachable).
// A swipe that accepts does not confirm at once: the card shows "Accepting ... Undo" for a few seconds first (UNDO_MS), because the
// patient is told the moment a booking is confirmed and a slip of the thumb must not do that. Leaving the page inside that window
// still accepts: the doctor meant it.

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { PanResponder, Pressable, StyleSheet, Text, View, type AccessibilityActionEvent } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { AppAvatar, AppPathIcon } from '../../../components/common'
import { APP_COLORS } from '../../../config/theme'

const CLINIC = 'M5 21V5a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v16M3 21h18M12 8v6M9 11h6'
const VIDEO = 'M3 6h12v12H3zM15 10l6-3v10l-6-3z'
const TICK = 'M5 12.5l4.5 4.5L19 7.5'
const CROSS = 'M6 6l12 12M18 6L6 18'
const GREEN = APP_COLORS.success
const FLAG_EDGE = '#F3C5BF'
/** How long a swiped accept can still be undone before it is sent. */
const UNDO_MS = 4000

type Props = {
	name: string
	/** "70 yrs · Male · New request" */
	who: string
	/** "Today, 8:00 PM" */
	when: string
	video: boolean
	/** "₹500": the fee, shown muted on the right of the slot. */
	fee: string
	reason?: string | null
	/** Why it came back to the doctor (a patient's reschedule request): title + reason. */
	statusNote?: { title: string; reason: string } | null
	/** The patient marked their symptoms severe. */
	flag: boolean
	busy?: boolean
	onAccept: () => void
	onDecline: () => void
	onMenu: () => void
	/** A swipe ends the tip ("swipe a card right to accept..."). */
	onSwiped?: () => void
}

export function BookingRequestCard({
	name,
	who,
	when,
	video,
	fee,
	reason,
	statusNote,
	flag,
	busy,
	onAccept,
	onDecline,
	onMenu,
	onSwiped,
}: Props) {
	const [width, setWidth] = useState(340)
	const [dx, setDx] = useState(0)
	// A swiped accept waiting out its undo window.
	const [holding, setHolding] = useState(false)
	const acceptRef = useRef(onAccept)
	const heldRef = useRef(false)
	useEffect(() => {
		acceptRef.current = onAccept
	})
	useEffect(() => {
		heldRef.current = holding
		if (!holding) return
		const timer = setTimeout(() => {
			heldRef.current = false
			setHolding(false)
			acceptRef.current()
		}, UNDO_MS)
		return () => clearTimeout(timer)
	}, [holding])
	// Leaving the page inside the window still sends the accept (the card is gone, there is nothing left to undo).
	useEffect(
		() => () => {
			if (heldRef.current) acceptRef.current()
		},
		[]
	)
	// The finger has to travel 60% of the card for the overlay to fill it; 80% of that arms the action.
	const reach = width * 0.6

	const pan = useMemo(
		() =>
			PanResponder.create({
				// Only a clearly sideways move takes the touch, so the page still scrolls and the buttons still tap.
				onMoveShouldSetPanResponder: (_, g) =>
					!busy && !holding && Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
				onPanResponderTerminationRequest: () => false,
				onPanResponderMove: (_, g) => setDx(Math.max(-reach, Math.min(reach, g.dx))),
				onPanResponderRelease: (_, g) => {
					setDx(0)
					onSwiped?.()
					if (g.dx > reach * 0.8) setHolding(true)
					else if (g.dx < -reach * 0.8) onDecline()
				},
				onPanResponderTerminate: () => setDx(0),
			}),
		[busy, holding, reach, onDecline, onSwiped]
	)

	const progress = Math.min(1, Math.abs(dx) / reach)
	const armed = progress > 0.8
	const showText = progress > 0.35

	return (
		<View
			onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
			accessibilityActions={[
				{ name: 'accept', label: 'Accept' },
				{ name: 'decline', label: 'Decline' },
			]}
			onAccessibilityAction={(e: AccessibilityActionEvent) => {
				if (e.nativeEvent.actionName === 'accept') onAccept()
				else if (e.nativeEvent.actionName === 'decline') onDecline()
			}}
			style={[styles.card, { borderColor: flag ? FLAG_EDGE : '#E3EAEB' }, busy && { opacity: 0.6 }]}
			{...pan.panHandlers}
		>
			{holding && (
				<View style={styles.holding} accessibilityRole="alert">
					<AppPathIcon d={TICK} size={22} strokeWidth={2.6} color="#FFFFFF" />
					<Text style={styles.holdingText} numberOfLines={1}>
						Accepting {name}
					</Text>
					<Pressable
						onPress={() => setHolding(false)}
						accessibilityRole="button"
						accessibilityLabel={`Undo accepting ${name}`}
						hitSlop={8}
					>
						<Text style={styles.undo}>Undo</Text>
					</Pressable>
				</View>
			)}
			{dx > 0 && (
				<View
					pointerEvents="none"
					style={[
						styles.overlay,
						{ left: 0, width: progress * width, backgroundColor: armed ? GREEN : '#1E7A4EE6' },
					]}
				>
					{showText && (
						<View style={styles.overlayLabel}>
							<AppPathIcon d={TICK} size={24} strokeWidth={2.6} color="#FFFFFF" />
							<Text style={styles.overlayText} numberOfLines={1}>
								{armed ? 'Release to accept' : 'Accept'}
							</Text>
						</View>
					)}
				</View>
			)}
			{dx < 0 && (
				<View
					pointerEvents="none"
					style={[
						styles.overlay,
						{ right: 0, width: progress * width, backgroundColor: armed ? APP_COLORS.danger : '#B42318E6' },
					]}
				>
					{showText && (
						<View style={styles.overlayLabel}>
							<AppPathIcon d={CROSS} size={24} strokeWidth={2.6} color="#FFFFFF" />
							<Text style={styles.overlayText} numberOfLines={1}>
								{armed ? 'Release to decline' : 'Decline'}
							</Text>
						</View>
					)}
				</View>
			)}

			<View style={styles.top}>
				<AppAvatar name={name} size={40} backgroundColor={APP_COLORS.mint} initialsColor={APP_COLORS.primary} />
				<View style={{ flex: 1, minWidth: 0 }}>
					<Text style={styles.name} numberOfLines={1}>
						{name}
					</Text>
					<Text style={styles.who} numberOfLines={1}>
						{who}
					</Text>
				</View>
				<Pressable
					onPress={onMenu}
					accessibilityRole="button"
					accessibilityLabel={`More actions for ${name}`}
					style={styles.menuBtn}
				>
					<MaterialCommunityIcons name="dots-vertical" size={22} color={APP_COLORS.ink} />
				</Pressable>
			</View>

			<View style={styles.slot}>
				<AppPathIcon d={video ? VIDEO : CLINIC} size={16} strokeWidth={2.2} color={APP_COLORS.primary} />
				<Text style={styles.slotText} numberOfLines={1}>
					{when}
				</Text>
				<Text style={styles.fee}>{fee}</Text>
			</View>

			{!!reason && (
				<Text style={styles.reason}>
					<Text style={{ fontWeight: '800' }}>Reason · </Text>
					{reason}
				</Text>
			)}
			{!!statusNote && (
				<Text style={styles.reason}>
					<Text style={{ fontWeight: '800' }}>{statusNote.title} · </Text>
					{statusNote.reason}
				</Text>
			)}
			{flag && (
				<View style={styles.flag}>
					<Text style={styles.flagText}>May need urgent in-person care. Consider referring.</Text>
				</View>
			)}
		</View>
	)
}

const styles = StyleSheet.create({
	card: { overflow: 'hidden', padding: 14, gap: 10, borderRadius: 16, borderWidth: 1, backgroundColor: '#FFFFFF' },
	overlay: {
		position: 'absolute',
		top: 0,
		bottom: 0,
		zIndex: 2,
		alignItems: 'center',
		justifyContent: 'center',
		overflow: 'hidden',
	},
	holding: {
		position: 'absolute',
		top: 0,
		right: 0,
		bottom: 0,
		left: 0,
		zIndex: 3,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 10,
		paddingHorizontal: 16,
		backgroundColor: GREEN,
	},
	holdingText: { flexShrink: 1, fontSize: 16, lineHeight: 22, fontWeight: '800', color: '#FFFFFF' },
	undo: { fontSize: 16, lineHeight: 22, fontWeight: '800', color: '#FFFFFF', textDecorationLine: 'underline' },
	overlayLabel: { flexDirection: 'row', alignItems: 'center', gap: 8 },
	overlayText: { fontSize: 18, lineHeight: 24, fontWeight: '800', color: '#FFFFFF' },
	top: { flexDirection: 'row', alignItems: 'center', gap: 10 },
	name: { fontSize: 15, lineHeight: 20, fontWeight: '800', color: APP_COLORS.ink },
	who: { fontSize: 12, lineHeight: 16, color: APP_COLORS.inkMuted },
	menuBtn: {
		width: 40,
		height: 40,
		marginRight: -8,
		borderRadius: 9999,
		alignItems: 'center',
		justifyContent: 'center',
	},
	slot: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		paddingHorizontal: 12,
		paddingVertical: 10,
		borderRadius: 10,
		backgroundColor: APP_COLORS.pageBg,
	},
	slotText: { flex: 1, minWidth: 0, fontSize: 14, lineHeight: 20, fontWeight: '700', color: APP_COLORS.ink },
	fee: { fontSize: 12, lineHeight: 16, fontWeight: '600', color: APP_COLORS.inkMuted },
	reason: { fontSize: 13, lineHeight: 19, color: APP_COLORS.ink },
	flag: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10, backgroundColor: APP_COLORS.dangerBg },
	flagText: { fontSize: 12, lineHeight: 16, fontWeight: '700', color: APP_COLORS.danger },
})

export default BookingRequestCard
