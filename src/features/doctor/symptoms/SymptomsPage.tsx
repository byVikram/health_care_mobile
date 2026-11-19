// src/features/doctor/symptoms/SymptomsPage.tsx
//
// "0 · Symptoms (from Home → All symptoms)": every symptom as the same 64px circular card Home uses, in alphabetical order, with a search
// box. A card opens doctor search for the speciality the server linked the symptom to (speciality_symptoms).
//
// Built from the shared pieces: AppScreenHeader (with AppSearchBar in its slot), AppSection, AppCatalogEmpty, AppIconTile and AppSkeleton.
// The A-Z order is made HERE, on what the API returned: the backend's order is not relied on and not changed.
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native'
import { useNavigation, type NavigationProp } from '@react-navigation/native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import {
	AppCatalogEmpty,
	AppIconTile,
	AppPathIcon,
	AppScreenHeader,
	AppSearchBar,
	AppSection,
	AppSkeleton,
} from '../../../components/common'
import { APP_COLORS } from '../../../config/theme'
import { ROUTES } from '../../../navigation/routes'
import type { AppStackParamList } from '../../../navigation/types'
import type { SymptomItem } from '../../../types/speciality'
import { resolveSpecialityForSymptom } from '../../dashboard/components/SpecialitySection'
import { symptomMeta, symptomSearchText } from '../../dashboard/symptomCardMeta'
import { getSpecialities, getSymptoms } from '../doctorService'

const SIDE_PADDING = 16
const COL_GAP = 8
const ROW_GAP = 18
/** Placeholder tiles while the symptoms load (3 rows of 4). */
const SKELETON_COUNT = 12

/** A-Z by the label the card shows (case and accents ignored, "Back pain" before "Body ache"). */
const byLabel = (a: SymptomItem, b: SymptomItem) =>
	symptomMeta(a).label.localeCompare(symptomMeta(b).label, undefined, { sensitivity: 'base', numeric: true })

export default function SymptomsPage() {
	const navigation = useNavigation<NavigationProp<AppStackParamList>>()
	const insets = useSafeAreaInsets()
	const { width } = useWindowDimensions()

	const [symptoms, setSymptoms] = useState<SymptomItem[]>([])
	const [loading, setLoading] = useState(true)
	const [failed, setFailed] = useState(false)
	const [reloadKey, setReloadKey] = useState(0)
	const [query, setQuery] = useState('')

	useEffect(() => {
		let active = true
		const load = async () => {
			setLoading(true)
			setFailed(false)
			try {
				const res = await getSymptoms()
				if (!active) return
				if (res?.success && Array.isArray(res.data)) setSymptoms(res.data)
				else setFailed(true)
			} catch (error) {
				console.error('Error fetching symptoms:', error)
				if (active) setFailed(true)
			} finally {
				if (active) setLoading(false)
			}
		}
		void load()
		return () => {
			active = false
		}
	}, [reloadKey])

	const sorted = useMemo(() => [...symptoms].sort(byLabel), [symptoms])
	const q = query.trim().toLowerCase()
	const items = useMemo(() => (q ? sorted.filter((s) => symptomSearchText(s).includes(q)) : sorted), [sorted, q])

	const columns = width >= 600 ? 6 : 4
	const cellWidth = Math.floor((width - SIDE_PADDING * 2 - COL_GAP * (columns - 1)) / columns)

	const openDoctors = useCallback(
		async (symptom: SymptomItem) => {
			// The server already says which speciality this symptom belongs to: use it as it is.
			if (symptom.speciality_id) {
				navigation.navigate(ROUTES.STACK.DOCTOR_SEARCH, {
					specialityId: String(symptom.speciality_id),
					specialityName: symptom.speciality_label ?? undefined,
				})
				return
			}
			// A symptom with no link: find the likeliest speciality the way Home does; none found = the plain doctor list.
			let specialities: Awaited<ReturnType<typeof getSpecialities>>['data'] = []
			try {
				const res = await getSpecialities()
				if (res.success && res.data) specialities = res.data
			} catch (error) {
				console.error('Error fetching specialities:', error)
			}
			const resolved = resolveSpecialityForSymptom(symptom, specialities)
			navigation.navigate(
				ROUTES.STACK.DOCTOR_SEARCH,
				resolved
					? { specialityId: String(resolved.id), specialityName: resolved.label }
					: { specialityName: symptom.speciality_label ?? undefined }
			)
		},
		[navigation]
	)

	const handleBack = () =>
		navigation.canGoBack()
			? navigation.goBack()
			: navigation.navigate(ROUTES.MAIN.TABS, { screen: ROUTES.MAIN.HOME })

	const browseSpecialities = () => navigation.navigate(ROUTES.MAIN.TABS, { screen: ROUTES.MAIN.SEARCH })

	return (
		<View style={styles.container}>
			<AppScreenHeader
				variant="bar"
				title="Symptoms"
				subtitle="Pick what you feel. We’ll show the right doctors."
				titleStyle={styles.headerTitle}
				onBack={handleBack}
				backAccessibilityLabel="Back to home"
			>
				<AppSearchBar context="symptoms" tone="onDark" value={query} onChangeText={setQuery} />
			</AppScreenHeader>

			<ScrollView
				style={styles.scroll}
				contentContainerStyle={{ paddingBottom: 24 + insets.bottom }}
				keyboardShouldPersistTaps="handled"
				showsVerticalScrollIndicator={false}
			>
				{loading ? (
					<AppSection gap={16} accessibilityLabel="Loading symptoms">
						<View style={styles.grid}>
							{Array.from({ length: SKELETON_COUNT }, (_, i) => (
								<View key={`symptom-skeleton-${i}`} style={[styles.cell, { width: cellWidth }]}>
									<AppSkeleton width={64} height={64} borderRadius={32} color={APP_COLORS.divider} />
									<AppSkeleton width={56} height={12} color={APP_COLORS.divider} />
								</View>
							))}
						</View>
					</AppSection>
				) : failed ? (
					<AppCatalogEmpty
						title="Couldn’t load symptoms"
						subtitle="Check your connection and try again."
						actionLabel="Try again"
						onAction={() => setReloadKey((k) => k + 1)}
					/>
				) : items.length > 0 ? (
					<AppSection title={q ? 'Matching symptoms' : 'All symptoms'} titleSize="sm" gap={16}>
						<View style={styles.grid}>
							{items.map((s) => {
								const meta = symptomMeta(s)
								return (
									<TouchableOpacity
										key={s.id}
										style={[styles.cell, { width: cellWidth }]}
										activeOpacity={0.8}
										onPress={() => void openDoctors(s)}
										accessibilityRole="button"
										accessibilityLabel={meta.label}
										accessibilityHint={`See ${s.speciality_label ?? 'doctors'}`}
									>
										<AppIconTile size={64} circle backgroundColor={meta.pair.bg}>
											<AppPathIcon
												d={meta.icon}
												size={28}
												strokeWidth={2}
												color={meta.pair.ink}
											/>
										</AppIconTile>
										<Text style={styles.label} numberOfLines={2}>
											{meta.label}
										</Text>
									</TouchableOpacity>
								)
							})}
						</View>
					</AppSection>
				) : (
					<AppCatalogEmpty
						title={q ? `No symptom matches “${query.trim()}”` : 'No symptoms yet'}
						subtitle="Try another word, or browse all specialities."
						actionLabel="Browse specialities"
						onAction={browseSpecialities}
					/>
				)}
			</ScrollView>
		</View>
	)
}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: APP_COLORS.pageBg },
	scroll: { flex: 1, backgroundColor: APP_COLORS.pageBg },
	// the design's 18/26 title (the shared bar shows 16/20 when there is a subtitle)
	headerTitle: { fontSize: 18, lineHeight: 26, fontWeight: '600' },

	grid: { flexDirection: 'row', flexWrap: 'wrap', columnGap: COL_GAP, rowGap: ROW_GAP },
	// the same cell as Home's "Not feeling well?" row, at a fixed width
	cell: { alignItems: 'center', gap: 6 },
	label: { fontSize: 12, lineHeight: 16, fontWeight: '700', color: APP_COLORS.ink, textAlign: 'center' },
})
