// src/components/common/booking/AppointmentActionSheet.tsx
//
// One configurable bottom sheet backing AppointmentActionCard's Reject/Cancel and Refer actions
// (source: the "Doctor Dashboard" design's single sheet that swaps content by mode, rather than
// separate dialogs). Reuses the existing FavouriteDoctorList (colleague row) component and the real
// referral/favourites services — no new endpoints, no simulated data.
// There is no Reschedule mode: a doctor does not pick a new slot, they ask the patient to choose one
// (see features/doctor/components/AskPatientRescheduleSheet).

import React, { useEffect, useState } from 'react'
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { AppBottomSheet } from '../layout/AppBottomSheet'
import AppSearchBar from '../inputs/AppSearchBar'
import FavouriteDoctorList, { type FavouriteDoctorListItem } from '../../../features/doctor/search/components/FavouriteDoctorList'
import { APP_COLORS } from '../../../config/theme'
import { getDoctors, getFavouriteDoctors } from '../../../features/doctor/doctorService'

export type ActionSheetMode = 'reject' | 'refer'

export type RejectReasonOption = { id: string; label: string }

export type AppointmentActionSheetProps = {
	visible: boolean
	mode: ActionSheetMode
	onClose: () => void
	appointmentId: string
	patientName: string
	slotLabel: string
	/** Reject-mode reason list; pass a different list depending on isRequest (e.g. "Cancel" reasons for an already-confirmed booking). */
	reasons: RejectReasonOption[]
	busy?: boolean
	onConfirmReject: (reasonLabel: string, note: string) => void
	onConfirmRefer: (doctor: FavouriteDoctorListItem, notes: string) => void
}

export function AppointmentActionSheet({
	visible,
	mode,
	onClose,
	appointmentId,
	patientName,
	slotLabel,
	reasons,
	busy = false,
	onConfirmReject,
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
		const loadFavourites = async () => {
			try {
				const res = await getFavouriteDoctors()
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
			} catch {
				// Best-effort: the refer list just stays empty and search still works.
			}
		}
		void loadFavourites()
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

	const title = mode === 'reject' ? 'Reject request' : 'Refer to a colleague'

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

			{mode === 'refer' && (
				<View style={{ gap: 12 }}>
					<AppSearchBar context="doctors" value={referQuery} onChangeText={setReferQuery} showMicrophone={false} />
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
