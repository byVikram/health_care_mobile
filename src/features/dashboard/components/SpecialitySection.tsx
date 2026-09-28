// src/features/dashboard/components/SpecialitySection.tsx
//
// Patient Home "Not feeling well?" ("1 · Home"): the first four symptoms as 64px circular tone tiles
// with short labels. A tap resolves the symptom to its speciality and opens doctor search (unchanged
// logic); "All symptoms" opens the specialities page. Falls back to a built-in symptom list when the
// symptoms API is empty or fails.
import React, { useEffect, useState } from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useNavigation, type NavigationProp } from '@react-navigation/native'

import { AppIconTile, AppPathIcon, AppSection, AppSkeleton, AppTextLink } from '../../../components/common'
import { APP_COLORS, TONES, toneForString, type ToneKey } from '../../../config/theme'
import { ROUTES } from '../../../navigation/routes'
import type { AppStackParamList } from '../../../navigation/types'
import type { SpecialityItem, SymptomItem } from '../../../types/speciality'
import { getSpecialities, getSymptoms } from '../../doctor/doctorService'
import { HOME_ICONS, homeSectionProps } from '../homeTheme'

/** icon_key (symptoms API) -> short Home label, tone and glyph. */
const SYMPTOM_META: Record<string, { label: string; tone: ToneKey; icon: string }> = {
	acne: { label: 'Skin & acne', tone: 'peach', icon: HOME_ICONS.skin },
	child: { label: 'Child unwell', tone: 'sky', icon: HOME_ICONS.child },
	cough: { label: 'Cold & fever', tone: 'mint', icon: HOME_ICONS.thermometer },
	depression: { label: 'Stress & anxiety', tone: 'lilac', icon: HOME_ICONS.brain },
	pregnancy: { label: 'Periods & pregnancy', tone: 'sand', icon: HOME_ICONS.female },
	performance: { label: 'Sexual health', tone: 'sky', icon: HOME_ICONS.pulse },
}

// Fallback symptoms when the symptoms API is empty or offline (design order first).
const DEFAULT_SYMPTOMS: SymptomItem[] = [
	{
		id: 'sym-acne',
		label: 'Acne, pimple or Skin Issues',
		icon_key: 'acne',
		speciality_id: null,
		speciality_label: 'Dermatology',
	},
	{
		id: 'sym-child',
		label: 'Child not feeling well',
		icon_key: 'child',
		speciality_id: null,
		speciality_label: 'Pediatrics',
	},
	{
		id: 'sym-cough',
		label: 'Cold, cough or fever',
		icon_key: 'cough',
		speciality_id: null,
		speciality_label: 'General Medicine',
	},
	{
		id: 'sym-depression',
		label: 'Depression or anxiety',
		icon_key: 'depression',
		speciality_id: null,
		speciality_label: 'Psychiatry',
	},
	{
		id: 'sym-pregnancy',
		label: 'Pregnancy or Period doubts',
		icon_key: 'pregnancy',
		speciality_id: null,
		speciality_label: 'Gynecology',
	},
	{
		id: 'sym-performance',
		label: 'Performance issues in bed',
		icon_key: 'performance',
		speciality_id: null,
		speciality_label: 'Urology',
	},
]

export function resolveSpecialityForSymptom(
	symptom: SymptomItem,
	specialities: SpecialityItem[]
): SpecialityItem | undefined {
	if (!specialities || specialities.length === 0) return undefined

	// 1. Check if symptom has a speciality_id that matches
	if (symptom.speciality_id) {
		const matchById = specialities.find((s) => String(s.id) === String(symptom.speciality_id))
		if (matchById) return matchById
	}

	// 2. Check if symptom.speciality_label matches a specialty label
	if (symptom.speciality_label) {
		const specLabelLower = symptom.speciality_label.toLowerCase().trim()
		const matchBySpecLabel = specialities.find(
			(s) =>
				s.label.toLowerCase().trim() === specLabelLower ||
				s.label.toLowerCase().includes(specLabelLower) ||
				specLabelLower.includes(s.label.toLowerCase())
		)
		if (matchBySpecLabel) return matchBySpecLabel
	}

	// 3. Keyword matching based on symptom label & icon_key against known specialty domains
	const symptomText = `${symptom.icon_key ?? ''} ${symptom.label ?? ''}`.toLowerCase()

	const patternMap: { keywords: string[]; specMatch: (s: SpecialityItem) => boolean }[] = [
		{
			keywords: ['pregnancy', 'period', 'pregnant', 'gynec', 'gynaec'],
			specMatch: (s) => /gyn|women|obstetric/i.test(s.label) || /gyn/i.test(s.icon_key),
		},
		{
			keywords: ['acne', 'pimple', 'skin', 'derma'],
			specMatch: (s) => /derma|skin/i.test(s.label) || /skin|derma/i.test(s.icon_key),
		},
		{
			keywords: ['performance', 'bed', 'urolog', 'sex'],
			specMatch: (s) => /uro|sex/i.test(s.label) || /uro/i.test(s.icon_key),
		},
		{
			keywords: ['cough', 'cold', 'fever', 'general', 'physician', 'medicine'],
			specMatch: (s) =>
				/general|physician|internal|medicine/i.test(s.label) || /stethoscope|general/i.test(s.icon_key),
		},
		{
			keywords: ['child', 'pediatr', 'paediatr', 'kids', 'baby'],
			specMatch: (s) => /pedia|paedia|child/i.test(s.label) || /pedia|child/i.test(s.icon_key),
		},
		{
			keywords: ['depression', 'anxiety', 'psychiatr', 'mental'],
			specMatch: (s) => /psych|mental/i.test(s.label) || /psych/i.test(s.icon_key),
		},
	]

	for (const pattern of patternMap) {
		if (pattern.keywords.some((kw) => symptomText.includes(kw))) {
			const match = specialities.find(pattern.specMatch)
			if (match) return match
		}
	}

	// 4. Fallback search: match specialty label substring within symptom text
	return specialities.find((s) => s.label.length > 3 && symptomText.includes(s.label.toLowerCase()))
}

const symptomMeta = (s: SymptomItem) => {
	const meta = s.icon_key ? SYMPTOM_META[s.icon_key] : undefined
	if (meta) return { label: meta.label, pair: TONES[meta.tone], icon: meta.icon }
	return { label: s.label, pair: toneForString(s.label), icon: HOME_ICONS.pulse }
}

type Props = {
	/** Specialities fetched once by the Home page (used to resolve a symptom's speciality). */
	specialities?: SpecialityItem[]
	refreshToken?: number
}

function SpecialitySection({ specialities = [], refreshToken }: Props) {
	const navigation = useNavigation<NavigationProp<AppStackParamList>>()
	const [symptoms, setSymptoms] = useState<SymptomItem[]>([])
	const [loading, setLoading] = useState(true)

	useEffect(() => {
		let active = true
		const load = async () => {
			try {
				const res = await getSymptoms()
				if (!active) return
				setSymptoms(res?.success && res.data && res.data.length > 0 ? res.data : DEFAULT_SYMPTOMS)
			} catch {
				if (active) setSymptoms(DEFAULT_SYMPTOMS)
			} finally {
				if (active) setLoading(false)
			}
		}
		void load()
		return () => {
			active = false
		}
	}, [refreshToken])

	const handleConsult = async (symptom: SymptomItem) => {
		let currentSpecs = specialities
		if (!currentSpecs || currentSpecs.length === 0) {
			try {
				const res = await getSpecialities()
				if (res.success && res.data) currentSpecs = res.data
			} catch {
				currentSpecs = []
			}
		}

		const resolvedSpec = resolveSpecialityForSymptom(symptom, currentSpecs)
		if (resolvedSpec) {
			navigation.navigate(ROUTES.STACK.DOCTOR_SEARCH, {
				specialityId: String(resolvedSpec.id),
				specialityName: resolvedSpec.label,
			})
			return
		}

		navigation.navigate(ROUTES.STACK.DOCTOR_SEARCH, {
			specialityName: symptom.speciality_label ?? undefined,
		})
	}

	return (
		<AppSection
			title="Not feeling well?"
			right={
				<AppTextLink
					label="All symptoms"
					onPress={() => navigation.navigate(ROUTES.STACK.ALL_SPECIALITIES)}
				/>
			}
			{...homeSectionProps(12)}
		>
			<View style={styles.grid}>
				{loading
					? [0, 1, 2, 3].map((i) => (
							<View key={i} style={styles.item}>
								<AppSkeleton width={64} height={64} borderRadius={32} color={APP_COLORS.divider} />
								<AppSkeleton width={56} height={12} color={APP_COLORS.divider} />
							</View>
						))
					: symptoms.slice(0, 4).map((s) => {
							const meta = symptomMeta(s)
							return (
								<TouchableOpacity
									key={s.id}
									style={styles.item}
									activeOpacity={0.8}
									onPress={() => handleConsult(s)}
									accessibilityRole="button"
									accessibilityLabel={meta.label}
									accessibilityHint="Find doctors for this symptom"
								>
									<AppIconTile size={64} circle backgroundColor={meta.pair.bg}>
										<AppPathIcon d={meta.icon} size={28} strokeWidth={2} color={meta.pair.ink} />
									</AppIconTile>
									<Text style={styles.label} numberOfLines={2}>
										{meta.label}
									</Text>
								</TouchableOpacity>
							)
						})}
			</View>
		</AppSection>
	)
}

export default React.memo(SpecialitySection)

const styles = StyleSheet.create({
	grid: {
		flexDirection: 'row',
		gap: 8,
		paddingHorizontal: 16,
	},
	item: {
		flex: 1,
		minWidth: 0,
		alignItems: 'center',
		gap: 6,
	},
	label: {
		fontSize: 12,
		lineHeight: 16,
		fontWeight: '700',
		color: APP_COLORS.ink,
		textAlign: 'center',
	},
})
