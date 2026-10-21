// src/features/doctor/dashboard/ClinicSwitcher.tsx
//
// Clinic switcher from the "Doctor Dashboard" design's Home header: a small translucent chip under
// the doctor's name (pin icon, clinic name, chevron) that opens a "Your clinics" bottom sheet -- one
// radio card per clinic (tinted icon tile, address + hours, "N patients today"). The list comes from
// GET /api/doctors/clinics. The choice is kept in AuthContext (selectedHospital / selectedHospitalId)
// so Home and Schedule can scope their appointment queries to it.

import React, { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { AppBottomSheet, AppPathIcon } from '../../../components/common'
import { useAuth } from '../../../context/AuthContext'
import { APP_COLORS, TONES, TONE_ORDER } from '../../../config/theme'
import { getMyClinics, type DoctorClinicsSummary } from '../doctorService'

const PIN = 'M12 21s7-6 7-11a7 7 0 0 0-14 0c0 5 7 11 7 11zM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z'
const CHEVRON_DOWN = 'M6 9l6 6 6-6'

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

export function ClinicSwitcher() {
	const { selectedHospital, selectedHospitalId, setSelectedHospital, setSelectedHospitalId } = useAuth()
	const [summary, setSummary] = useState<DoctorClinicsSummary | null>(null)
	const [loading, setLoading] = useState(true)
	const [open, setOpen] = useState(false)

	const load = useCallback(async () => {
		try {
			const data = await getMyClinics()
			setSummary(data)
			// First time through (nothing chosen yet): default to the primary clinic, which the API lists first.
			if (selectedHospital === null && data.clinics.length > 0) {
				setSelectedHospital(data.clinics[0].name)
				setSelectedHospitalId(data.clinics[0].id)
			}
		} catch {
			// Non-fatal: the chip just keeps its placeholder text.
		} finally {
			setLoading(false)
		}
	}, [selectedHospital, setSelectedHospital, setSelectedHospitalId])

	useEffect(() => {
		load()
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [])

	// Refresh today's counts every time the sheet opens.
	useEffect(() => {
		if (open) load()
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [open])

	const clinics = summary?.clinics ?? []
	const choose = (name: string, id: string) => {
		setSelectedHospital(name)
		setSelectedHospitalId(id)
		setOpen(false)
	}

	return (
		<>
			<Pressable
				onPress={() => setOpen(true)}
				accessibilityRole="button"
				accessibilityLabel={`Clinic: ${selectedHospital ?? 'none selected'}. Tap to switch clinic`}
				style={styles.chip}
			>
				<AppPathIcon d={PIN} size={14} strokeWidth={2.2} color={APP_COLORS.mintAccent} />
				<Text style={styles.chipText} numberOfLines={1}>
					{selectedHospital ?? (loading ? 'Loading…' : 'Select clinic')}
				</Text>
				<AppPathIcon d={CHEVRON_DOWN} size={14} strokeWidth={2.6} color="#E3EFEF" />
			</Pressable>

			<AppBottomSheet visible={open} title="Your clinics" subtitle="Switch where you’re seeing patients" onClose={() => setOpen(false)} appearance="modern">
				{loading && !summary ? (
					<View style={styles.center}>
						<ActivityIndicator color={APP_COLORS.primary} />
					</View>
				) : clinics.length === 0 ? (
					<View style={styles.center}>
						<Text style={styles.empty}>No clinics assigned yet</Text>
					</View>
				) : (
					<View style={{ gap: 8 }} accessibilityRole="radiogroup" accessibilityLabel="Clinic">
						{clinics.map((c, i) => (
							<ClinicCard
								key={c.id}
								on={c.id === selectedHospitalId}
								icon={PIN}
								tone={TONES[TONE_ORDER[i % TONE_ORDER.length]]}
								name={c.name}
								sub={[c.address, c.timings].filter(Boolean).join(' · ')}
								count={c.patients_today}
								onPress={() => choose(c.name, c.id)}
							/>
						))}
					</View>
				)}
			</AppBottomSheet>
		</>
	)
}

function ClinicCard({
	on,
	icon,
	tone,
	name,
	sub,
	count,
	onPress,
}: {
	on: boolean
	icon: string
	tone: { bg: string; ink: string }
	name: string
	sub: string
	count: number
	onPress: () => void
}) {
	return (
		<TouchableOpacity accessibilityRole="radio" accessibilityState={{ checked: on }} onPress={onPress} style={[styles.card, on && styles.cardOn]}>
			<View style={[styles.iconTile, { backgroundColor: tone.bg }]}>
				<AppPathIcon d={icon} size={20} strokeWidth={2} color={tone.ink} />
			</View>
			<View style={styles.cardText}>
				<Text style={styles.cardName} numberOfLines={1}>
					{name}
				</Text>
				{!!sub && (
					<Text style={styles.cardSub} numberOfLines={2}>
						{sub}
					</Text>
				)}
				<Text style={[styles.cardCount, count === 0 && { color: APP_COLORS.inkMuted }]}>
					{count > 0 ? `${plural(count, 'patient', 'patients')} today` : 'No visits today'}
				</Text>
			</View>
			<View style={[styles.ring, { borderColor: on ? APP_COLORS.primary : APP_COLORS.border }]}>
				<View style={[styles.ringDot, { backgroundColor: on ? APP_COLORS.primary : 'transparent' }]} />
			</View>
		</TouchableOpacity>
	)
}

const styles = StyleSheet.create({
	chip: {
		alignSelf: 'flex-start',
		maxWidth: '100%',
		height: 28,
		marginTop: 2,
		paddingLeft: 6,
		paddingRight: 8,
		borderRadius: 6,
		backgroundColor: '#FFFFFF1A',
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
	},
	chipText: { flexShrink: 1, fontSize: 13, lineHeight: 18, fontWeight: '700', color: '#E3EFEF' },
	center: { padding: 32, alignItems: 'center', justifyContent: 'center' },
	empty: { fontSize: 14, color: APP_COLORS.inkMuted },
	card: {
		paddingVertical: 10,
		paddingHorizontal: 12,
		borderWidth: 1.5,
		borderColor: APP_COLORS.divider,
		borderRadius: 8,
		backgroundColor: '#FFFFFF',
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
	},
	cardOn: { borderColor: APP_COLORS.primary, backgroundColor: APP_COLORS.mint },
	iconTile: { width: 40, height: 40, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
	cardText: { flex: 1, minWidth: 0, gap: 1 },
	cardName: { fontSize: 15, lineHeight: 20, fontWeight: '800', color: APP_COLORS.ink },
	cardSub: { fontSize: 12, lineHeight: 16, color: APP_COLORS.inkMuted },
	cardCount: { fontSize: 12, lineHeight: 16, fontWeight: '700', color: APP_COLORS.success },
	ring: { width: 20, height: 20, borderRadius: 9999, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
	ringDot: { width: 10, height: 10, borderRadius: 9999 },
})

export default ClinicSwitcher
