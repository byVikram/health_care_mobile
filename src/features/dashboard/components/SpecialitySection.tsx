import React, { useEffect, useState } from 'react'
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, useWindowDimensions, ActivityIndicator } from 'react-native'
import { useNavigation, type NavigationProp } from '@react-navigation/native'
import { ROUTES } from '../../../navigation/routes'
import type { AppStackParamList } from '../../../navigation/types'
import { getSpecialities, getSymptoms } from '../../doctor/doctorService'
import { SpecialityItem, SymptomItem } from '../../../types/speciality'

import pregnancyImage from '../../../assets/specialties/pregnancy.svg'
import acneImage from '../../../assets/specialties/acne.svg'
import performanceImage from '../../../assets/specialties/performance.svg'
import coughImage from '../../../assets/specialties/cough.svg'
import childImage from '../../../assets/specialties/child.svg'
import depressionImage from '../../../assets/specialties/depression.svg'
import { Button } from 'react-native-paper'

const TEAL = '#0c7c7c'

// icon_key (from the symptoms API) -> local illustration.
const ICON_MAP: Record<string, React.ComponentType<{ width?: string | number; height?: string | number }>> = {
	pregnancy: pregnancyImage,
	acne: acneImage,
	performance: performanceImage,
	cough: coughImage,
	child: childImage,
	depression: depressionImage,
}

// Fallback symptoms when symptoms API is empty or offline
const DEFAULT_SYMPTOMS: SymptomItem[] = [
	{
		id: 'sym-pregnancy',
		label: 'Pregnancy or Period doubts',
		icon_key: 'pregnancy',
		speciality_id: null,
		speciality_label: 'Gynecology',
	},
	{
		id: 'sym-acne',
		label: 'Acne, pimple or Skin Issues',
		icon_key: 'acne',
		speciality_id: null,
		speciality_label: 'Dermatology',
	},
	{
		id: 'sym-performance',
		label: 'Performance issues in bed',
		icon_key: 'performance',
		speciality_id: null,
		speciality_label: 'Urology',
	},
	{
		id: 'sym-cough',
		label: 'Cold, cough or fever',
		icon_key: 'cough',
		speciality_id: null,
		speciality_label: 'General Medicine',
	},
	{
		id: 'sym-child',
		label: 'Child not feeling well',
		icon_key: 'child',
		speciality_id: null,
		speciality_label: 'Pediatrics',
	},
	{
		id: 'sym-depression',
		label: 'Depression or anxiety',
		icon_key: 'depression',
		speciality_id: null,
		speciality_label: 'Psychiatry',
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

function SpecialitySection() {
	const navigation = useNavigation<NavigationProp<AppStackParamList>>()
	const { width } = useWindowDimensions()
	const [symptoms, setSymptoms] = useState<SymptomItem[]>([])
	const [specialities, setSpecialities] = useState<SpecialityItem[]>([])
	const [loading, setLoading] = useState(true)

	useEffect(() => {
		let active = true
		setLoading(true)
		Promise.all([getSymptoms(), getSpecialities()])
			.then(([symptomsRes, specialitiesRes]) => {
				if (!active) return
				if (symptomsRes?.success && symptomsRes.data && symptomsRes.data.length > 0) {
					setSymptoms(symptomsRes.data)
				} else {
					setSymptoms(DEFAULT_SYMPTOMS)
				}
				if (specialitiesRes?.success && specialitiesRes.data) {
					setSpecialities(specialitiesRes.data)
				}
			})
			.catch((error) => {
				console.error('Error fetching symptoms/specialities:', error)
				if (active) setSymptoms(DEFAULT_SYMPTOMS)
			})
			.finally(() => {
				if (active) setLoading(false)
			})
		return () => {
			active = false
		}
	}, [])

	const isTablet = width >= 768
	const isMiniTablet = width >= 600 && width < 768
	const isWide = isTablet || isMiniTablet

	const availableWidth = width - 32 - 8 * 5
	const CARD_WIDTH = isWide ? availableWidth / 6 : 110
	const BOX_SIZE = isWide ? Math.min(Math.floor(CARD_WIDTH) - 10, 120) : 100

	const handleConsult = async (symptom: SymptomItem) => {
		let currentSpecs = specialities
		if (!currentSpecs || currentSpecs.length === 0) {
			try {
				const res = await getSpecialities()
				if (res.success && res.data) {
					currentSpecs = res.data
					setSpecialities(res.data)
				}
			} catch (error) {
				console.error('Error loading specialities:', error)
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

		// If no specialty matched in currentSpecs, attempt fresh fetch
		try {
			const res = await getSpecialities()
			if (res.success && res.data) {
				const retrySpec = resolveSpecialityForSymptom(symptom, res.data)
				if (retrySpec) {
					navigation.navigate(ROUTES.STACK.DOCTOR_SEARCH, {
						specialityId: String(retrySpec.id),
						specialityName: retrySpec.label,
					})
					return
				}
			}
		} catch (e) {
			console.error('Error fetching specialities on retry:', e)
		}

		navigation.navigate(ROUTES.STACK.DOCTOR_SEARCH, {
			specialityName: symptom.speciality_label ?? undefined,
		})
	}

	const renderCard = (s: SymptomItem, cardWidth: number, boxSize: number, isTab: boolean) => {
		const Icon = (s.icon_key && ICON_MAP[s.icon_key]) || pregnancyImage
		return (
			<TouchableOpacity
				key={s.id}
				onPress={() => handleConsult(s)}
				activeOpacity={0.7}
				style={{ width: cardWidth, alignItems: 'center', paddingVertical: 4 }}
			>
				<View style={{ width: '100%', alignItems: 'center', gap: 6 }}>
					<View style={[styles.iconBox, { width: boxSize, height: boxSize }]}>
						<Icon width={'100%'} height={'100%'} />
					</View>

					<Text style={[styles.cardTitle, isTab && styles.cardTitleTablet]} numberOfLines={2}>
						{s.label}
					</Text>
				</View>
			</TouchableOpacity>
		)
	}

	return (
		<View style={styles.container}>
			{/* ── Header ── */}
			<View style={styles.headerRow}>
				<TouchableOpacity
					style={styles.headerLeft}
					onPress={() => navigation.navigate(ROUTES.STACK.ALL_SPECIALITIES as never)}
					activeOpacity={0.8}
				>
					<Text style={[styles.subHeading, isTablet && styles.subHeadingTablet]}>
						Find experienced doctors across all specialties
					</Text>
				</TouchableOpacity>
				<Button
					mode="outlined"
					style={styles.viewAllBtn}
					labelStyle={{ fontSize: 12 }}
					onPress={() => navigation.navigate(ROUTES.STACK.ALL_SPECIALITIES as never)}
				>
					View All
				</Button>
			</View>

			{loading ? (
				<View style={{ paddingVertical: 24, alignItems: 'center' }}>
					<ActivityIndicator size="small" color={TEAL} />
				</View>
			) : isWide ? (
				// TABLET / MINI-TABLET — all cards in one row
				<View style={styles.tabletGrid}>
					{symptoms.map((s) => renderCard(s, CARD_WIDTH, BOX_SIZE, isTablet))}
				</View>
			) : (
				// MOBILE — horizontal scroll
				<ScrollView
					horizontal
					showsHorizontalScrollIndicator={false}
					contentContainerStyle={styles.scrollContent}
				>
					{symptoms.map((s) => renderCard(s, CARD_WIDTH, BOX_SIZE, false))}
				</ScrollView>
			)}
		</View>
	)
}

export default React.memo(SpecialitySection)

const styles = StyleSheet.create({
	container: {
		paddingVertical: 16,
		backgroundColor: '#fff',
	},
	headerRow: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		justifyContent: 'space-between',
		paddingHorizontal: 16,
		marginBottom: 20,
		gap: 12,
	},
	headerLeft: {
		flex: 1,
		borderLeftWidth: 3,
		borderLeftColor: TEAL,
		paddingLeft: 10,
	},
	heading: {
		fontSize: 15,
		fontWeight: '700',
		color: '#111',
		lineHeight: 21,
		marginBottom: 3,
	},
	headingTablet: {
		fontSize: 18,
		lineHeight: 26,
	},
	subHeading: {
		fontSize: 12,
		color: '#777',
		lineHeight: 17,
	},
	subHeadingTablet: {
		fontSize: 14,
		lineHeight: 20,
	},
	viewAllBtn: {
		borderRadius: 20,
	},
	tabletGrid: {
		flexDirection: 'row',
		paddingHorizontal: 16,
		gap: 8,
		alignItems: 'flex-start',
	},
	scrollContent: {
		paddingHorizontal: 16,
		paddingBottom: 8,
		gap: 10,
	},
	iconBox: {
		borderRadius: 16,
		overflow: 'hidden',
	},
	cardTitle: {
		fontSize: 12,
		fontWeight: '500',
		color: '#222',
		textAlign: 'center',
		lineHeight: 17,
	},
	cardTitleTablet: {
		fontSize: 13,
		lineHeight: 19,
	},
	consultText: {
		fontSize: 13,
		color: TEAL,
		fontWeight: '600',
	},
	consultTextTablet: {
		fontSize: 14,
	},
})
