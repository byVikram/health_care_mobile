// src/features/doctor/dashboard/RequestSheets.tsx
//
// The sheets of the Booking requests page, from the "Doctor Dashboard NEW" design:
//   RequestActionsSheet   the card's three-dots menu: Accept / Ask to reschedule / Refer to another doctor / Decline
//   DeclineRequestSheet   "Decline request": a reason (one of them is "Refer to another doctor", which carries on to the refer
//                         sheet), an optional note, the red Decline request button
//   ReferDoctorSheet      "Refer to another doctor": search, speciality chips, the doctors, a note for the doctor, Refer to Dr ...
// "Ask for another time" is the shared AskPatientRescheduleSheet in its `request` variant.
// Built from the shared AppBottomSheet, AppButton, AppChip, AppRadioCard, AppAvatar, AppTag, AppInfoBanner and AppSearchBar; the
// doctors come from useReferDoctors (the real favourites and doctor search).

import React, { useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native'
import {
	AppAvatar,
	AppBottomSheet,
	AppButton,
	AppChip,
	AppInfoBanner,
	AppRadioCard,
	AppSearchBar,
	AppTag,
} from '../../../components/common'
import { APP_COLORS, TONES, toneForString } from '../../../config/theme'
import type { FavouriteDoctorListItem } from '../search/components/FavouriteDoctorList'
import { composeReason, NoteField, ReasonList, type ReasonOption } from '../components/ReasonPicker'
import { SheetMenu } from '../components/SheetMenu'
import { useReferDoctors } from '../components/useReferDoctors'

const REASON_MAX = 500

/** The strip under a request sheet's title: the patient, "Today, 8:00 PM · 70 yrs · Male", and the Red flag tag. */
function RequestStrip({ name, line, flag }: { name: string; line: string; flag: boolean }) {
	return (
		<View style={styles.strip}>
			<View style={{ flex: 1, minWidth: 0 }}>
				<Text style={styles.stripName}>{name}</Text>
				<Text style={styles.stripLine} numberOfLines={1}>
					{line}
				</Text>
			</View>
			{flag && <AppTag label="Red flag" tone="cancelled" />}
		</View>
	)
}

/** An explanatory sentence in the shared banner (its title is a bold coloured line by default). */
function Note({ tone, text }: { tone: 'info' | 'warning' | 'danger'; text: string }) {
	return <AppInfoBanner tone={tone} icon={null} title={text} titleStyle={styles.noteText} />
}

type Who = { name: string; line: string; flag: boolean }

// ── the three-dots menu ────────────────────────────────────────────────────────────────────────────

export function RequestActionsSheet({
	visible,
	who,
	onClose,
	onAccept,
	onAskReschedule,
	onRefer,
	onDecline,
}: {
	visible: boolean
	who: Who
	onClose: () => void
	onAccept: () => void
	onAskReschedule: () => void
	onRefer: () => void
	onDecline: () => void
}) {
	return (
		<AppBottomSheet
			visible={visible}
			title="Appointment actions"
			subtitle="Choose an action for this appointment"
			onClose={onClose}
			appearance="modern"
		>
			<View style={{ gap: 16 }}>
				<RequestStrip {...who} />
				<SheetMenu
					rows={[
						{
							icon: 'check',
							tile: APP_COLORS.successBg,
							ink: APP_COLORS.success,
							title: 'Accept',
							sub: 'Confirm the booking · patient is notified',
							onPress: onAccept,
						},
						{
							icon: 'calendar-clock-outline',
							tile: TONES.sky.bg,
							ink: TONES.sky.ink,
							title: 'Ask to reschedule',
							sub: 'Patient picks a new slot',
							onPress: onAskReschedule,
						},
						{
							icon: 'arrow-right',
							tile: TONES.lilac.bg,
							ink: TONES.lilac.ink,
							title: 'Refer to another doctor',
							sub: 'Send to a specialist who can see them',
							onPress: onRefer,
						},
						{
							icon: 'calendar-remove-outline',
							tile: APP_COLORS.dangerBg,
							ink: APP_COLORS.danger,
							title: 'Decline',
							sub: 'Patient is told why',
							danger: true,
							onPress: onDecline,
						},
					]}
				/>
			</View>
		</AppBottomSheet>
	)
}

// ── decline ────────────────────────────────────────────────────────────────────────────────────────

export const DECLINE_REASONS: ReasonOption[] = [
	{ id: 'spec', label: 'Not my speciality' },
	{ id: 'refer', label: 'Refer to another doctor' },
	{ id: 'emerg', label: 'Needs emergency care, not a clinic visit' },
	{ id: 'full', label: 'Fully booked that day' },
	{ id: 'other', label: 'Other reason' },
]

export function DeclineRequestSheet({
	visible,
	who,
	firstName,
	busy,
	onClose,
	onDecline,
	onChooseDoctor,
}: {
	visible: boolean
	who: Who
	firstName: string
	busy: boolean
	onClose: () => void
	/** The reason as sent (the picked one, then the note). */
	onDecline: (reason: string) => void
	/** "Refer to another doctor" was picked: carry on to the refer sheet. */
	onChooseDoctor: () => void
}) {
	const [reasonId, setReasonId] = useState<string>(DECLINE_REASONS[0].id)
	const [note, setNote] = useState('')

	useEffect(() => {
		if (!visible) return
		setReasonId(DECLINE_REASONS[0].id)
		setNote('')
	}, [visible])

	const refer = reasonId === 'refer'
	return (
		<AppBottomSheet
			visible={visible}
			title="Decline request"
			subtitle={`${firstName} will be told and can book another doctor.`}
			onClose={onClose}
			appearance="modern"
		>
			<View style={{ gap: 16 }}>
				<RequestStrip {...who} />
				<View style={{ gap: 8 }}>
					<Text style={styles.heading}>Reason</Text>
					<ReasonList options={DECLINE_REASONS} value={reasonId} onChange={setReasonId} />
				</View>
				<NoteField
					label="Note for the patient"
					optional
					placeholder="Add a short note"
					value={note}
					onChange={setNote}
					maxLength={REASON_MAX}
				/>
				<Note
					tone="info"
					text={
						refer
							? `Next, pick the doctor. ${firstName} gets their profile and can book directly.`
							: `${firstName} is notified with your reason.`
					}
				/>
				<AppButton
					size="lg"
					variant={refer ? 'primary' : 'danger'}
					loading={busy}
					disabled={busy}
					onPress={() =>
						refer ? onChooseDoctor() : onDecline(composeReason(DECLINE_REASONS, reasonId, note, REASON_MAX))
					}
				>
					{refer ? 'Choose a doctor' : 'Decline request'}
				</AppButton>
			</View>
		</AppBottomSheet>
	)
}

// ── refer ──────────────────────────────────────────────────────────────────────────────────────────

export function ReferDoctorSheet({
	visible,
	who,
	firstName,
	busy,
	onClose,
	onRefer,
}: {
	visible: boolean
	who: Who
	firstName: string
	busy: boolean
	onClose: () => void
	onRefer: (doctor: FavouriteDoctorListItem, notes: string) => void
}) {
	const { query, setQuery, searching, doctors } = useReferDoctors(visible)
	const [speciality, setSpeciality] = useState('all')
	const [pickedId, setPickedId] = useState<string | null>(null)
	const [notes, setNotes] = useState('')

	useEffect(() => {
		if (!visible) return
		setSpeciality('all')
		setPickedId(null)
		setNotes('')
	}, [visible])

	const specialities = useMemo(
		() => Array.from(new Set(doctors.map((d) => d.specialities[0]).filter(Boolean))),
		[doctors]
	)
	const shown = doctors.filter((d) => speciality === 'all' || d.specialities[0] === speciality)
	const picked = doctors.find((d) => d.id === pickedId) ?? null

	return (
		<AppBottomSheet
			visible={visible}
			title="Refer to another doctor"
			subtitle={`Choose who should see ${firstName}. They get the doctor’s profile and can book directly.`}
			onClose={onClose}
			appearance="modern"
		>
			<View style={{ gap: 16 }}>
				<RequestStrip {...who} />
				<AppSearchBar context="doctors" value={query} onChangeText={setQuery} showMicrophone={false} />
				{specialities.length > 1 && (
					<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
						{['all', ...specialities].map((sp) => (
							<AppChip
								key={sp}
								label={sp === 'all' ? 'All' : sp}
								shape="pill"
								size="md"
								selected={sp === speciality}
								onPress={() => setSpeciality(sp)}
							/>
						))}
					</ScrollView>
				)}
				{searching ? (
					<ActivityIndicator color={APP_COLORS.primary} />
				) : shown.length === 0 ? (
					<Text style={styles.empty}>
						{query.trim() ? 'No doctors found.' : 'No favourites yet. Search to find a colleague.'}
					</Text>
				) : (
					<View style={{ gap: 8 }}>
						<Text style={styles.heading}>
							{shown.length} {shown.length === 1 ? 'doctor' : 'doctors'}{' '}
							{query.trim() ? 'found' : 'in your network'}
						</Text>
						{shown.map((d) => {
							const tone = toneForString(d.specialities[0] ?? d.name)
							return (
								<AppRadioCard
									key={d.id}
									title={d.name}
									subtitle={[
										d.specialities[0],
										d.location,
										d.experience_years ? `${d.experience_years} yrs` : null,
									]
										.filter(Boolean)
										.join(' · ')}
									selected={d.id === pickedId}
									onPress={() => setPickedId(d.id)}
									leading={
										<AppAvatar
											name={d.name.replace(/^Dr\.?\s+/i, '')}
											size={44}
											radius={12}
											backgroundColor={tone.bg}
											initialsColor={tone.ink}
										/>
									}
								/>
							)
						})}
					</View>
				)}
				<NoteField
					label="Note for the doctor"
					placeholder="Why you’re referring (shared with the doctor)"
					value={notes}
					onChange={setNotes}
					maxLength={REASON_MAX}
				/>
				{!!picked && (
					<Note
						tone="info"
						text={`The request closes as Referred. ${firstName} is notified with ${picked.name}’s profile.`}
					/>
				)}
				<AppButton
					size="lg"
					loading={busy}
					disabled={!picked || busy}
					softDisabled
					onPress={() => picked && onRefer(picked, notes.trim())}
				>
					{picked ? `Refer to ${picked.name}` : 'Select a doctor'}
				</AppButton>
			</View>
		</AppBottomSheet>
	)
}

const styles = StyleSheet.create({
	strip: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
		padding: 12,
		borderRadius: 12,
		backgroundColor: APP_COLORS.pageBg,
	},
	stripName: { fontSize: 16, lineHeight: 22, fontWeight: '800', color: APP_COLORS.ink },
	stripLine: { fontSize: 13, lineHeight: 18, color: APP_COLORS.inkMuted },
	heading: { fontSize: 15, lineHeight: 20, fontWeight: '800', color: APP_COLORS.ink },
	// The shared banner's title is a bold coloured line; these notes are ordinary sentences.
	noteText: { fontSize: 14, lineHeight: 20, fontWeight: '400', color: APP_COLORS.ink },
	empty: { fontSize: 14, lineHeight: 20, color: APP_COLORS.inkMuted },
})
