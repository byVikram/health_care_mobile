// src/features/dashboard/components/ConsultSection.tsx
//
// Patient Home "Book by speciality" ("1 · Home"): a 2x2 grid of bordered rows (40px tone tile, name,
// short subtitle). Each row resolves to the real speciality from the specialities list by label and
// opens doctor search; "View all" opens the specialities page.
import React from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'

import { AppIconTile, AppPathIcon, AppSection, AppTextLink } from '../../../components/common'
import { APP_COLORS, TONES } from '../../../config/theme'
import { ROUTES } from '../../../navigation/routes'
import type { AppStackParamList } from '../../../navigation/types'
import type { SpecialityItem } from '../../../types/speciality'
import { getSpecialities } from '../../doctor/doctorService'
import { HOME_ICONS, homeSectionProps } from '../homeTheme'

type NavigationProp = NativeStackNavigationProp<AppStackParamList>

type ConsultRow = {
	key: string
	title: string
	subtitle: string
	bg: string
	ink: string
	icon: string
	/** Matches the speciality label from the API (e.g. "Dentistry", "Gynecology", "General Medicine"). */
	match: RegExp
	/** Search fallback when no speciality matches. */
	fallbackName: string
}

const CONSULTS: ConsultRow[] = [
	{
		key: 'dentist',
		title: 'Dentist',
		subtitle: 'Teeth & gums',
		bg: TONES.sky.bg,
		ink: TONES.sky.ink,
		icon: HOME_ICONS.tooth,
		match: /dent/i,
		fallbackName: 'Dentistry',
	},
	{
		key: 'gynaecologist',
		title: 'Gynaecologist',
		subtitle: 'Women’s health',
		bg: TONES.peach.bg,
		ink: TONES.peach.ink,
		icon: HOME_ICONS.female,
		match: /gyn|obstetric/i,
		fallbackName: 'Gynecology',
	},
	{
		key: 'dietitian',
		title: 'Dietitian',
		subtitle: 'Diet & nutrition',
		bg: APP_COLORS.successBg,
		ink: APP_COLORS.success,
		icon: HOME_ICONS.apple,
		match: /diet|nutri/i,
		fallbackName: 'Nutrition & Dietetics',
	},
	{
		key: 'general',
		title: 'General physician',
		subtitle: 'Fever, cold, BP',
		bg: TONES.mint.bg,
		ink: TONES.mint.ink,
		icon: HOME_ICONS.stethoscope,
		match: /general|physician|internal medicine/i,
		fallbackName: 'General Medicine',
	},
]

type Props = {
	/** Specialities fetched once by the Home page. */
	specialities?: SpecialityItem[]
}

function ConsultSection({ specialities = [] }: Props) {
	const navigation = useNavigation<NavigationProp>()

	const handleConsult = async (row: ConsultRow) => {
		let list = specialities
		if (list.length === 0) {
			try {
				const res = await getSpecialities()
				if (res.success && res.data) list = res.data
			} catch {
				list = []
			}
		}
		const match = list.find((s) => row.match.test(s.label))
		if (match) {
			navigation.navigate(ROUTES.STACK.DOCTOR_SEARCH, {
				specialityId: String(match.id),
				specialityName: match.label,
			})
			return
		}
		navigation.navigate(ROUTES.STACK.DOCTOR_SEARCH, { specialityName: row.fallbackName })
	}

	return (
		<AppSection
			title="Book by speciality"
			right={<AppTextLink label="View all" onPress={() => navigation.navigate(ROUTES.STACK.ALL_SPECIALITIES)} />}
			{...homeSectionProps(12)}
		>
			<View style={styles.grid}>
				{CONSULTS.map((row) => (
					<TouchableOpacity
						key={row.key}
						style={styles.row}
						activeOpacity={0.8}
						onPress={() => handleConsult(row)}
						accessibilityRole="button"
						accessibilityLabel={`${row.title}, ${row.subtitle}`}
					>
						<AppIconTile size={40} radius={12} backgroundColor={row.bg}>
							<AppPathIcon d={row.icon} size={20} strokeWidth={2} color={row.ink} />
						</AppIconTile>
						<View style={styles.textCol}>
							<Text style={styles.title} numberOfLines={1}>
								{row.title}
							</Text>
							<Text style={styles.subtitle} numberOfLines={1}>
								{row.subtitle}
							</Text>
						</View>
					</TouchableOpacity>
				))}
			</View>
		</AppSection>
	)
}

export default React.memo(ConsultSection)

const styles = StyleSheet.create({
	grid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 8,
		paddingHorizontal: 16,
	},
	row: {
		flexBasis: '47%',
		flexGrow: 1,
		minWidth: 0,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
		padding: 10,
		borderRadius: 10,
		backgroundColor: APP_COLORS.surface,
		borderWidth: 1,
		borderColor: APP_COLORS.divider,
	},
	textCol: {
		flex: 1,
		minWidth: 0,
	},
	title: {
		fontSize: 14,
		lineHeight: 18,
		fontWeight: '700',
		color: APP_COLORS.ink,
	},
	subtitle: {
		fontSize: 12,
		lineHeight: 16,
		color: APP_COLORS.inkMuted,
	},
})
