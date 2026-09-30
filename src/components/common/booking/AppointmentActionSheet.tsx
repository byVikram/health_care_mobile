// src/components/common/booking/AppointmentActionSheet.tsx
//
// One configurable bottom sheet backing AppointmentActionCard's Reject/Cancel, Reschedule and Refer
// actions (source: the "Doctor Dashboard" design's single sheet that swaps content by mode, rather
// than three separate dialogs). Reuses the existing DateSlotPicker (date+slot picker) and
// FavouriteDoctorList (colleague row) components and the real availability/referral/favourites
// services already proven by DoctorAppointments.tsx — no new endpoints, no simulated data.

import React, { useEffect, useState } from 'react'
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { AppBottomSheet } from '../layout/AppBottomSheet'
import DateSlotPicker from '../inputs/DateSlotPicker'
import FavouriteDoctorList, { type FavouriteDoctorListItem } from '../../../features/doctor/search/components/FavouriteDoctorList'
import { APP_COLORS } from '../../../config/theme'
import { getDoctorAvailability, getDoctors, getFavouriteDoctors } from '../../../features/doctor/doctorService'
import { normalizeAvailabilitySlots, toApiDate } from '../../../features/doctor/scheduleUtils'
import type { SlotGroup } from '../../../features/doctor/doctorService'

export type ActionSheetMode = 'reject' | 'reschedule' | 'refer'

export type RejectReasonOption = { id: string; label: string }

export type AppointmentActionSheetProps = {
	visible: boolean
	mode: ActionSheetMode
	onClose: () => void
	appointmentId: string
	patientName: string
	slotLabel: string
	doctorId?: string
	hospitalId?: string
	appointmentType: 'clinic' | 'video'
	/** Reject-mode reason list; pass a different list depending on isRequest (e.g. "Cancel" reasons for an already-confirmed booking). */
	reasons: RejectReasonOption[]
	busy?: boolean
	onConfirmReject: (reasonLabel: string, note: string) => void
	onConfirmReschedule: (date: Date, startTime: string, endTime: string | null) => void
	onConfirmRefer: (doctor: FavouriteDoctorListItem, notes: string) => void
}

export function AppointmentActionSheet({
	visible,
	mode,
	onClose,
	appointmentId,
	patientName,
	slotLabel,
	doctorId,
	hospitalId,
	appointmentType,
	reasons,
	busy = false,
	onConfirmReject,
	onConfirmReschedule,
	onConfirmRefer,
}: AppointmentActionSheetProps) {
	// ── Reject ──────────────────────────────────────────────────────────────
	const [reasonId, setReasonId] = useState<string | null>(null)
	const [note, setNote] = useState('')

	useEffect(() => {
		if (visible && mode === 'reject') {
			setReasonId(null)
			setNote('')
		}
	}, [visible, mode])

	// ── Reschedule ──────────────────────────────────────────────────────────
	const [rsDate, setRsDate] = useState<Date | null>(null)
	const [rsTime, setRsTime] = useState<string | null>(null)
	const [rsSlots, setRsSlots] = useState<SlotGroup[]>([])
	const [rsLoading, setRsLoading] = useState(false)

	useEffect(() => {
		if (visible && mode === 'reschedule') {
			setRsDate(new Date())
			setRsTime(null)
		}
	}, [visible, mode])

	useEffect(() => {
		if (!visible || mode !== 'reschedule' || !rsDate || !doctorId || !hospitalId) return
		let mounted = true
		const load = async () => {
			setRsLoading(true)
			setRsSlots([])
			try {
				const res = await getDoctorAvailability({ doctor_id: doctorId, hospital_id: hospitalId, date: toApiDate(rsDate) })
				if (mounted) setRsSlots(normalizeAvailabilitySlots(res, appointmentType))
			} catch {
				// Empty slot list renders its own "no slots" state below.
			} finally {
				if (mounted) setRsLoading(false)
			}
		}
		void load()
		return () => {
			mounted = false
		}
	}, [visible, mode, rsDate, doctorId, hospitalId, appointmentType])

	// ── Refer ───────────────────────────────────────────────────────────────
	const [referQuery, setReferQuery] = useState('')
	const [favourites, setFavourites] = useState<FavouriteDoctorListItem[]>([])
	const [searchResults, setSearchResults] = useState<FavouriteDoctorListItem[]>([])
	const [referLoading, setReferLoading] = useState(false)
	const [selectedDoctor, setSelectedDoctor] = useState<FavouriteDoctorListItem | null>(null)
	const [referNotes, setReferNotes] = useState('')

	useEffect(() => {
		if (!visible || mode !== 'refer') return
		setReferQuery('')
		setSelectedDoctor(null)
		setReferNotes('')
		let mounted = true
		getFavouriteDoctors()
			.then((res) => {
				if (!mounted || !res.success) return
				setFavourites(
					(res.data?.favourites ?? []).map((d) => ({
						id: d.id,
						name: d.name,
						avatar_s3_key: d.avatar_s3_key ?? null,
						location: d.location ?? '',
						experience_years: d.experience_years ?? null,
						specialities: d.specialities ?? [],
						is_verified: d.is_verified,
					})),
				)
			})
			.catch(() => {})
		return () => {
			mounted = false
		}
	}, [visible, mode])

	useEffect(() => {
		if (!visible || mode !== 'refer') return
		const trimmed = referQuery.trim()
		if (!trimmed) {
			setSearchResults([])
			return
		}
		let mounted = true
		setReferLoading(true)
		const timer = setTimeout(async () => {
			try {
				const res = await getDoctors({ search: trimmed, limit: 20 })
				if (mounted && res.success) {
					setSearchResults(
						(res.data ?? []).map((d: any) => ({
							id: d.id,
							name: d.name,
							avatar_s3_key: d.avatar_s3_key ?? null,
							location: d.location ?? '',
							experience_years: d.experience_years ?? null,
							specialities: d.specialities ?? [],
							is_verified: d.is_verified,
						})),
					)
				}
			} catch {
				if (mounted) setSearchResults([])
			} finally {
				if (mounted) setReferLoading(false)
			}
		}, 400)
		return () => {
			mounted = false
			clearTimeout(timer)
		}
	}, [visible, mode, referQuery])

	const referList = referQuery.trim() ? searchResults : favourites

	const title = mode === 'reject' ? 'Reject request' : mode === 'reschedule' ? 'Suggest a new time' : 'Refer to a colleague'

	return (
		<AppBottomSheet visible={visible} title={title} subtitle={`${patientName} · ${slotLabel}`} onClose={onClose} appearance="modern">
			{mode === 'reject' && (
				<View style={{ gap: 12 }}>
					<View style={{ gap: 6 }}>
						{reasons.map((r) => {
							const on = r.id === reasonId
							return (
								<TouchableOpacity key={r.id} style={[styles.reasonRow, on && styles.reasonRowOn]} onPress={() => setReasonId(r.id)}>
									<View style={[styles.radioOuter, on && styles.radioOuterOn]}>{on && <View style={styles.radioInner} />}</View>
									<Text style={styles.reasonLabel}>{r.label}</Text>
								</TouchableOpacity>
							)
						})}
					</View>
					<View style={{ gap: 6 }}>
						<Text style={styles.fieldLabel}>Note to patient (optional)</Text>
						<TextInput
							value={note}
							onChangeText={setNote}
							placeholder="A short, kind explanation"
							placeholderTextColor={APP_COLORS.inkMuted}
							multiline
							numberOfLines={2}
							style={styles.textArea}
						/>
					</View>
					<TouchableOpacity
						style={[styles.dangerBtn, !reasonId && styles.btnDisabled]}
						disabled={!reasonId || busy}
						onPress={() => {
							const r = reasons.find((x) => x.id === reasonId)
							if (r) onConfirmReject(r.label, note.trim())
						}}
					>
						{busy ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.dangerBtnText}>{title}</Text>}
					</TouchableOpacity>
				</View>
			)}

			{mode === 'reschedule' && (
				<View style={{ gap: 12 }}>
					<DateSlotPicker
						selectedDate={rsDate}
						onDateChange={(d) => {
							setRsDate(d)
							setRsTime(null)
						}}
						selectedTime={rsTime}
						onTimeChange={(t) => setRsTime(Array.isArray(t) ? t[0] : t)}
						availableSlots={rsSlots}
						loading={rsLoading}
						disablePast
					/>
					<Text style={styles.hintText}>The patient can accept the new time or pick another.</Text>
					<TouchableOpacity
						style={[styles.primaryBtn, (!rsTime || !rsDate) && styles.btnDisabled]}
						disabled={!rsTime || !rsDate || busy}
						onPress={() => {
							if (!rsDate || !rsTime) return
							const slot = rsSlots.flatMap((g) => g.slots).find((s) => s.start_time === rsTime)
							onConfirmReschedule(rsDate, rsTime, slot?.end_time ?? null)
						}}
					>
						{busy ? (
							<ActivityIndicator size="small" color="#FFFFFF" />
						) : (
							<Text style={styles.primaryBtnText}>{rsTime ? `Send ${rsTime}` : 'Pick a slot'}</Text>
						)}
					</TouchableOpacity>
				</View>
			)}

			{mode === 'refer' && (
				<View style={{ gap: 12 }}>
					<View style={styles.searchBox}>
						<MaterialCommunityIcons name="magnify" size={18} color={APP_COLORS.inkMuted} />
						<TextInput
							value={referQuery}
							onChangeText={setReferQuery}
							placeholder="Search doctor or speciality"
							placeholderTextColor={APP_COLORS.inkMuted}
							style={styles.searchInput}
						/>
					</View>
					<Text style={styles.fieldLabel}>{referQuery.trim() ? 'SEARCH RESULTS' : '★ YOUR FAVOURITES'}</Text>
					{referLoading ? (
						<ActivityIndicator color={APP_COLORS.primary} />
					) : referList.length === 0 ? (
						<Text style={styles.hintText}>{referQuery.trim() ? 'No doctors found.' : 'No favourites yet — search to find a colleague.'}</Text>
					) : (
						<View style={{ gap: 8 }}>
							{referList.map((d) => (
								<TouchableOpacity
									key={d.id}
									style={[styles.referRow, selectedDoctor?.id === d.id && styles.referRowOn]}
									onPress={() => setSelectedDoctor(d)}
								>
									<View style={[styles.radioOuter, selectedDoctor?.id === d.id && styles.radioOuterOn]}>
										{selectedDoctor?.id === d.id && <View style={styles.radioInner} />}
									</View>
									<FavouriteDoctorList
										doctor={d}
										isCompact
										onToggleBookmark={() => {}}
										placeholderImage={require('../../../assets/Banner/doctor.png')}
										onPress={() => setSelectedDoctor(d)}
									/>
								</TouchableOpacity>
							))}
						</View>
					)}
					<View style={{ gap: 6 }}>
						<Text style={styles.fieldLabel}>Notes for colleague (optional)</Text>
						<TextInput
							value={referNotes}
							onChangeText={setReferNotes}
							placeholder="Anything they should know"
							placeholderTextColor={APP_COLORS.inkMuted}
							multiline
							numberOfLines={2}
							style={styles.textArea}
						/>
					</View>
					<TouchableOpacity
						style={[styles.primaryBtn, !selectedDoctor && styles.btnDisabled]}
						disabled={!selectedDoctor || busy}
						onPress={() => selectedDoctor && onConfirmRefer(selectedDoctor, referNotes.trim())}
					>
						{busy ? (
							<ActivityIndicator size="small" color="#FFFFFF" />
						) : (
							<Text style={styles.primaryBtnText}>{selectedDoctor ? `Refer to ${selectedDoctor.name}` : 'Select a doctor'}</Text>
						)}
					</TouchableOpacity>
				</View>
			)}
		</AppBottomSheet>
	)
}

export default AppointmentActionSheet

const styles = StyleSheet.create({
	reasonRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
		minHeight: 48,
		paddingHorizontal: 12,
		paddingVertical: 8,
		borderWidth: 1.5,
		borderColor: APP_COLORS.divider,
		borderRadius: 12,
	},
	reasonRowOn: { borderColor: APP_COLORS.primary, backgroundColor: APP_COLORS.mint },
	radioOuter: {
		width: 18,
		height: 18,
		borderRadius: 9999,
		borderWidth: 2,
		borderColor: APP_COLORS.border,
		alignItems: 'center',
		justifyContent: 'center',
	},
	radioOuterOn: { borderColor: APP_COLORS.primary },
	radioInner: { width: 8, height: 8, borderRadius: 9999, backgroundColor: APP_COLORS.primary },
	reasonLabel: { fontSize: 14, lineHeight: 20, fontWeight: '700', color: APP_COLORS.ink, flex: 1 },
	fieldLabel: { fontSize: 12, lineHeight: 16, fontWeight: '800', letterSpacing: 0.4, color: APP_COLORS.inkMuted },
	textArea: {
		minHeight: 60,
		padding: 10,
		borderWidth: 1,
		borderColor: APP_COLORS.border,
		borderRadius: 10,
		backgroundColor: APP_COLORS.surface,
		fontSize: 15,
		lineHeight: 21,
		color: APP_COLORS.ink,
		textAlignVertical: 'top',
	},
	dangerBtn: { height: 52, borderRadius: 12, backgroundColor: APP_COLORS.danger, alignItems: 'center', justifyContent: 'center' },
	dangerBtnText: { fontSize: 15, lineHeight: 20, fontWeight: '800', color: '#FFFFFF' },
	primaryBtn: { height: 52, borderRadius: 12, backgroundColor: APP_COLORS.primary, alignItems: 'center', justifyContent: 'center' },
	primaryBtnText: { fontSize: 15, lineHeight: 20, fontWeight: '800', color: '#FFFFFF' },
	btnDisabled: { backgroundColor: APP_COLORS.disabledBtn },
	hintText: { fontSize: 12, lineHeight: 17, color: APP_COLORS.inkMuted },
	searchBox: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		height: 44,
		paddingHorizontal: 12,
		borderWidth: 1,
		borderColor: APP_COLORS.border,
		borderRadius: 10,
	},
	searchInput: { flex: 1, fontSize: 15, color: APP_COLORS.ink },
	referRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		borderWidth: 1.5,
		borderColor: APP_COLORS.divider,
		borderRadius: 12,
		paddingLeft: 10,
	},
	referRowOn: { borderColor: APP_COLORS.primary, backgroundColor: APP_COLORS.mint },
})
