// src/features/doctor/components/DoctorActionSheet.tsx
//
// THE sheet of a doctor's "send this request on" actions: asking the patient to choose another time (a booked appointment or a booking
// request) and referring a request to another doctor. A doctor never picks a slot, so these are not the patient's reschedule sheet
// (AppRescheduleSheet); they are one sheet whose content comes in through props:
//   slotLabel     a quiet strip with the slot being given up ("Today, Thu 25 Sep, 4:00 PM · In-clinic"); the patient's name is not
//                 repeated, the appointment or request the sheet was opened from is right behind it
//   reasons       "Select a reason" + an optional message to the patient (the reason sent is the picked one, then the message)
//   pickDoctor    search, speciality chips and every doctor (the doctor's saved ones first, the rest loaded a page at a time as the
//                 list is scrolled), a note for the doctor; the confirm button names the picked doctor
//   notice        a plain explanation of what happens next
//   keepLabel     a second, outline button that closes the sheet ("Keep appointment")
// It ends the way every sheet that runs a call ends (useSheetOutcome): `onConfirm` makes the call and returns how it went, the button
// shows the spinner, then a success toast and `onDone` (close, refresh), or the message inline above the button (no status pop-up).
// The confirm button is pinned under the scrolling content, so it stays in reach however far the doctor list was scrolled.

import React, { useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native'
import {
	AppAvatar,
	AppBottomSheet,
	AppButton,
	AppChip,
	AppIconButton,
	AppInfoBanner,
	AppRadioCard,
	AppSearchBar,
	useSheetOutcome,
	type SheetResult,
} from '../../../components/common'
import { APP_COLORS, toneForString } from '../../../config/theme'
import { RESCHEDULE_REASON_MAX_LENGTH } from '../doctorService'
import type { FavouriteDoctorListItem } from '../search/components/FavouriteDoctorList'
import { composeReason, NoteField, ReasonPicker, type ReasonOption } from './ReasonPicker'
import { useReferDoctors } from './useReferDoctors'

/** The reasons of "Ask to reschedule" (a booked appointment). */
export const RESCHEDULE_REASONS: ReasonOption[] = [
	{ id: 'emerg', label: 'I have an emergency' },
	{ id: 'late', label: 'Running late at the hospital' },
	{ id: 'report', label: 'Need a test report first' },
	{ id: 'other', label: 'Other reason' },
]

/** The reasons of "Ask for another time" (a booking request). */
export const REQUEST_RESCHEDULE_REASONS: ReasonOption[] = [
	{ id: 'na', label: 'Not available at this time' },
	{ id: 'taken', label: 'Slot already taken' },
	{ id: 'long', label: 'Needs a longer appointment' },
	{ id: 'other', label: 'Other reason' },
]

/** What `onConfirm` gets: the text to send (the reason and message, or the note for the doctor) and the picked doctor (`pickDoctor`). */
export type DoctorActionInput = { message: string; doctor: FavouriteDoctorListItem | null }

export type DoctorActionSheetProps = {
	visible: boolean
	title: string
	subtitle?: string
	/** The slot being given up. */
	slotLabel?: string
	/** Shows "Select a reason" and the message box; the first reason starts picked. */
	reasons?: ReasonOption[]
	/** Placeholder of the message to the patient (`reasons`). */
	messagePlaceholder?: string
	/** Shows the doctors to choose from, and "Note for the doctor". */
	pickDoctor?: boolean
	/** What happens next. */
	notice?: string
	/** The confirm button's label; with `pickDoctor` it is shown until a doctor is picked ("Select a doctor"). */
	confirmLabel: string
	/** With `pickDoctor`: the label once a doctor is picked ("Refer to Dr X"). */
	pickedConfirmLabel?: (doctor: FavouriteDoctorListItem) => string
	/** A second, outline button that closes the sheet ("Keep appointment"). */
	keepLabel?: string
	/** The success toast; with `pickDoctor` it may name the doctor. */
	successTitle: string | ((doctor: FavouriteDoctorListItem | null) => string)
	/** Makes the call and returns how it went. */
	onConfirm: (input: DoctorActionInput) => Promise<SheetResult>
	/** It went through (the toast is up): the flow's follow-up. Defaults to `onClose`. */
	onDone?: () => void
	onClose: () => void
}

export function DoctorActionSheet({
	visible,
	title,
	subtitle,
	slotLabel,
	reasons,
	messagePlaceholder = 'Add a short note',
	pickDoctor = false,
	notice,
	confirmLabel,
	pickedConfirmLabel,
	keepLabel,
	successTitle,
	onConfirm,
	onDone,
	onClose,
}: DoctorActionSheetProps) {
	const [reasonId, setReasonId] = useState<string | null>(reasons?.[0]?.id ?? null)
	const [note, setNote] = useState('')
	const [speciality, setSpeciality] = useState('all')
	const [pickedId, setPickedId] = useState<string | null>(null)
	const list = useReferDoctors(visible && pickDoctor)

	// Every opening starts from a clean form.
	useEffect(() => {
		if (!visible) return
		setReasonId(reasons?.[0]?.id ?? null)
		setNote('')
		setSpeciality('all')
		setPickedId(null)
		// eslint-disable-next-line react-hooks/exhaustive-deps -- only an opening resets the form
	}, [visible])

	const specialities = useMemo(
		() => Array.from(new Set(list.doctors.map((d) => d.specialities[0]).filter(Boolean))),
		[list.doctors]
	)
	const shown = list.doctors.filter((d) => speciality === 'all' || d.specialities[0] === speciality)
	const picked = list.doctors.find((d) => d.id === pickedId) ?? null

	const { busy, error, confirm } = useSheetOutcome({
		visible,
		run: () =>
			onConfirm({
				message: reasons
					? composeReason(reasons, reasonId, note, RESCHEDULE_REASON_MAX_LENGTH)
					: note.trim().slice(0, RESCHEDULE_REASON_MAX_LENGTH),
				doctor: picked,
			}),
		successTitle: typeof successTitle === 'function' ? successTitle(picked) : successTitle,
		onDone: () => (onDone ? onDone() : onClose()),
	})

	// Nothing to confirm until a reason (or a doctor) is picked.
	const blocked = pickDoctor ? !picked : !!reasons && !reasonId
	const label = pickDoctor && picked && pickedConfirmLabel ? pickedConfirmLabel(picked) : confirmLabel

	return (
		<AppBottomSheet
			visible={visible}
			title={title}
			subtitle={subtitle}
			onClose={onClose}
			appearance="modern"
			dismissible={!busy}
			onScrollNearEnd={pickDoctor ? list.loadMore : undefined}
			// The footer is taller with the second button: the content above is sized for it.
			footerHeight={keepLabel ? 128 : 64}
			footer={
				<View style={styles.footer}>
					{error ? <SheetNote tone="danger" text={error} /> : null}
					<AppButton
						size="lg"
						loading={busy}
						disabled={busy || blocked}
						softDisabled
						onPress={() => void confirm()}
					>
						{label}
					</AppButton>
					{!!keepLabel && (
						<AppButton variant="outline" size="lg" onPress={onClose} disabled={busy}>
							{keepLabel}
						</AppButton>
					)}
				</View>
			}
		>
			<View style={styles.body}>
				{!!slotLabel && (
					<View style={styles.slot}>
						<Text style={styles.slotText}>{slotLabel}</Text>
					</View>
				)}

				{!!reasons && (
					<ReasonPicker
						options={reasons}
						value={reasonId}
						onChange={setReasonId}
						note={note}
						onNoteChange={setNote}
						noteMaxLength={RESCHEDULE_REASON_MAX_LENGTH}
						notePlaceholder={messagePlaceholder}
					/>
				)}

				{pickDoctor && (
					<>
						<AppSearchBar context="doctors" value={list.query} onChangeText={list.setQuery} />
						{specialities.length > 1 && (
							<ScrollView
								horizontal
								showsHorizontalScrollIndicator={false}
								contentContainerStyle={{ gap: 8 }}
							>
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
						<NoteField
							label="Note for the doctor"
							placeholder="Why you’re referring (shared with the doctor)"
							value={note}
							onChange={setNote}
							maxLength={RESCHEDULE_REASON_MAX_LENGTH}
						/>
					</>
				)}

				{!!notice && <SheetNote tone="info" text={notice} />}

				{pickDoctor &&
					(list.searching && shown.length === 0 ? (
						<ActivityIndicator color={APP_COLORS.primary} />
					) : shown.length === 0 ? (
						<Text style={styles.empty}>
							{list.loadFailed
								? 'Couldn’t load doctors. Check your connection and try again.'
								: list.query.trim()
									? 'No doctors found.'
									: 'No doctors to show yet.'}
						</Text>
					) : (
						<View style={{ gap: 8 }}>
							{shown.map((d) => {
								const saved = list.isFavourite(d.id)
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
										hideRadio
										trailing={
											<AppIconButton
												icon={saved ? 'bookmark' : 'bookmark-outline'}
												variant="ghost"
												size={36}
												circle
												iconColor={saved ? APP_COLORS.primary : APP_COLORS.inkMuted}
												disabled={list.pendingIds.includes(d.id)}
												onPress={() => void list.toggleFavourite(d)}
												accessibilityLabel={
													saved
														? `Remove ${d.name} from saved doctors`
														: `Save ${d.name} to your doctors`
												}
											/>
										}
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
							{list.loadingMore && <ActivityIndicator color={APP_COLORS.primary} />}
						</View>
					))}
			</View>
		</AppBottomSheet>
	)
}

/** An explanatory sentence in the shared banner (its title is a bold coloured line by default). */
function SheetNote({ tone, text }: { tone: 'info' | 'danger'; text: string }) {
	return <AppInfoBanner tone={tone} icon={null} title={text} titleStyle={styles.noteText} />
}

export default DoctorActionSheet

const styles = StyleSheet.create({
	body: { gap: 16 },
	footer: { gap: 8 },
	// The slot being given up, without the patient: a quiet strip.
	slot: { padding: 12, borderRadius: 12, backgroundColor: APP_COLORS.pageBg },
	slotText: { fontSize: 14, lineHeight: 20, fontWeight: '700', color: APP_COLORS.ink },
	empty: { fontSize: 14, lineHeight: 20, color: APP_COLORS.inkMuted },
	// The shared banner's title is a bold coloured line; these notes are ordinary sentences.
	noteText: { fontSize: 14, lineHeight: 20, fontWeight: '400', color: APP_COLORS.ink },
})
