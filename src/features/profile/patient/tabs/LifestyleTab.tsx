import React, { useMemo } from 'react'
import { View, ScrollView, StyleSheet, useWindowDimensions } from 'react-native'
import { AppSelect, AppButton } from '../../../../components/common'
import type { PatientProfileState } from '../PatientProfileService'

const SMOKING_OPTIONS = [
	{ label: 'Never', value: 'Never' },
	{ label: 'Former smoker', value: 'Former smoker' },
	{ label: 'Occasional', value: 'Occasional' },
	{ label: 'Regular', value: 'Regular' },
]

const ALCOHOL_OPTIONS = [
	{ label: 'Never', value: 'Never' },
	{ label: 'Occasionally', value: 'Occasionally' },
	{ label: 'Socially', value: 'Socially' },
	{ label: 'Regularly', value: 'Regularly' },
]

const EXERCISE_OPTIONS = [
	{ label: 'Sedentary', value: 'Sedentary' },
	{ label: '1-2 days/week', value: '1-2 days/week' },
	{ label: '3-4 days/week', value: '3-4 days/week' },
	{ label: '5+ days/week', value: '5+ days/week' },
]

const FOOD_PREFERENCE_OPTIONS = [
	{ label: 'Omnivore', value: 'Omnivore' },
	{ label: 'Vegetarian', value: 'Vegetarian' },
	{ label: 'Vegan', value: 'Vegan' },
	{ label: 'Keto', value: 'Keto' },
	{ label: 'Gluten-free', value: 'Gluten-free' },
]

const SLEEP_OPTIONS = [
	{ label: '5 hours', value: '5' },
	{ label: '6 hours', value: '6' },
	{ label: '7 hours', value: '7' },
	{ label: '8 hours', value: '8' },
	{ label: '9 hours', value: '9' },
]

const OCCUPATION_OPTIONS = [
	{ label: 'Student', value: 'Student' },
	{ label: 'Doctor', value: 'Doctor' },
	{ label: 'Engineer', value: 'Engineer' },
	{ label: 'Teacher', value: 'Teacher' },
	{ label: 'Nurse', value: 'Nurse' },
	{ label: 'Business', value: 'Business' },
	{ label: 'Farmer', value: 'Farmer' },
	{ label: 'Housewife', value: 'Housewife' },
	{ label: 'Self-employed', value: 'Self-employed' },
	{ label: 'Other', value: 'Other' },
]

interface Props {
	data: PatientProfileState
	onChange: (key: keyof PatientProfileState, value: any) => void
	onSave: () => void
	saving: boolean
}

export default function LifestyleTab({ data, onChange, onSave, saving }: Props) {
	const { width } = useWindowDimensions()
	const isTablet = width >= 768 && width < 1024
	const isMobile = width < 768

	const contentWidth = useMemo(() => {
		if (width >= 1280) return 760
		if (width >= 1024) return 680
		if (isTablet) return 600
		return 640
	}, [width, isTablet])

	const sectionPadding = isMobile ? 16 : isTablet ? 32 : 48

	return (
		<ScrollView
			style={styles.scroll}
			contentContainerStyle={[styles.scrollContent, { paddingHorizontal: sectionPadding }]}
			keyboardShouldPersistTaps="handled"
			showsVerticalScrollIndicator={false}
		>
			<View style={[styles.contentShell, { maxWidth: contentWidth }]}>
				<View style={styles.formFieldsWrapper}>
				{/* Smoking Habits */}
				<AppSelect
					label="Smoking Habits"
					options={SMOKING_OPTIONS}
					value={data.smoking}
					onSelect={(val: string) => onChange('smoking', val)}
					placeholder="Select smoking habit"
					presentation="sheet"
					sheetTitle="Smoking habits"
					size="compact"
					style={styles.fieldMargin}
				/>

				{/* Alcohol Consumption */}
				<AppSelect
					label="Alcohol Consumption"
					options={ALCOHOL_OPTIONS}
					value={data.alcohol}
					onSelect={(val: string) => onChange('alcohol', val)}
					placeholder="Select alcohol consumption"
					presentation="sheet"
					sheetTitle="Alcohol consumption"
					size="compact"
					style={styles.fieldMargin}
				/>

				{/* Exercise Frequency */}
				<AppSelect
					label="Exercise frequency"
					options={EXERCISE_OPTIONS}
					value={data.exerciseFrequency}
					onSelect={(val: string) => onChange('exerciseFrequency', val)}
					placeholder="Select exercise frequency"
					presentation="sheet"
					sheetTitle="Exercise frequency"
					size="compact"
					style={styles.fieldMargin}
				/>

				{/* Food Preferences */}
				<AppSelect
					label="Food Preferences"
					options={FOOD_PREFERENCE_OPTIONS}
					value={data.foodPreference}
					onSelect={(val: string) => onChange('foodPreference', val)}
					placeholder="Select food preference"
					presentation="sheet"
					sheetTitle="Food preferences"
					size="compact"
					style={styles.fieldMargin}
				/>

				{/* Sleep Hours */}
				<AppSelect
					label="Sleep hours"
					options={SLEEP_OPTIONS}
					value={data.sleepHours}
					onSelect={(val: string) => onChange('sleepHours', val)}
					placeholder="Select sleep hours"
					presentation="sheet"
					sheetTitle="Sleep hours"
					size="compact"
					style={styles.fieldMargin}
				/>

				{/* Occupation */}
				<AppSelect
					label="Occupation"
					options={OCCUPATION_OPTIONS}
					value={data.occupation}
					onSelect={(val: string) => onChange('occupation', val)}
					placeholder="Select occupation"
					presentation="sheet"
					sheetTitle="Occupation"
					size="compact"
					style={styles.fieldMargin}
				/>
				</View>

				<View style={styles.saveButtonWrapper}>
					<AppButton
						variant="primary"
						formAction
						style={styles.saveButton}
						onPress={onSave}
						loading={saving}
						disabled={saving}
					>
						Save
					</AppButton>
				</View>
			</View>
		</ScrollView>
	)
}

const styles = StyleSheet.create({
	scroll: {
		flex: 1,
		backgroundColor: '#fff',
	},
	scrollContent: {
		flexGrow: 1,
		alignItems: 'center',
		width: '100%',
	},
	contentShell: {
		width: '100%',
		alignSelf: 'center',
	},
	formFieldsWrapper: {
		paddingVertical: 16,
	},
	fieldMargin: {
		marginBottom: 16,
	},
	saveButtonWrapper: {
		paddingBottom: 24,
		alignItems: 'center',
	},
	saveButton: {
		width: '100%',
		// maxWidth: 320,
	},
})
