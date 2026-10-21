// src/features/care-ai/components/AttachSheet.tsx
//
// "Add a report or photo" sheet behind the composer's + button: take a photo, upload a file, or pick something
// already in the selected person's health records (the HbA1c report, a prescription).

import React from 'react'
import { StyleSheet, Text } from 'react-native'
import { AppBottomSheet, AppNavRow, AppPathIcon } from '../../../components/common'
import { APP_COLORS, TONES } from '../../../config/theme'
import { CARE_AI_ICONS } from '../careAiIcons'

type Props = {
	visible: boolean
	/** Whose records are listed ("VIKRAM"). */
	ownerName: string
	onClose: () => void
	onTakePhoto: () => void
	onUploadFile: () => void
	onPickReport: () => void
	onPickPrescription: () => void
}

type TileProps = { path: string; bg: string; ink: string }

const tile = ({ path, bg, ink }: TileProps) => ({
	size: 40,
	radius: 12,
	backgroundColor: bg,
	children: <AppPathIcon d={path} size={20} strokeWidth={2} color={ink} />,
})

export function AttachSheet({
	visible,
	ownerName,
	onClose,
	onTakePhoto,
	onUploadFile,
	onPickReport,
	onPickPrescription,
}: Props) {
	return (
		<AppBottomSheet
			visible={visible}
			title="Add a report or photo"
			subtitle="Care AI can read lab reports and prescriptions and explain them in simple words."
			onClose={onClose}
			appearance="modern"
		>
			<AppNavRow
				title="Take a photo"
				subtitle="Of a report or prescription"
				leading={tile({ path: CARE_AI_ICONS.camera, bg: TONES.sky.bg, ink: TONES.sky.ink })}
				trailing={false}
				minHeight={56}
				onPress={onTakePhoto}
			/>
			<AppNavRow
				title="Upload from gallery or files"
				subtitle="JPG, PNG or PDF"
				leading={tile({ path: CARE_AI_ICONS.gallery, bg: TONES.lilac.bg, ink: TONES.lilac.ink })}
				trailing={false}
				minHeight={56}
				divider
				onPress={onUploadFile}
			/>
			<Text style={styles.section}>FROM {ownerName.toUpperCase()}’S RECORDS</Text>
			<AppNavRow
				title="HbA1c report"
				subtitle="Karola Labs · 28 Sep"
				leading={tile({ path: CARE_AI_ICONS.flask, bg: APP_COLORS.mint, ink: APP_COLORS.primary })}
				trailing={false}
				minHeight={56}
				divider
				onPress={onPickReport}
			/>
			<AppNavRow
				title="Prescription · Dr. Ananya Rao"
				subtitle="12 Sep · 3 medicines"
				leading={tile({ path: CARE_AI_ICONS.file, bg: APP_COLORS.dangerBg, ink: APP_COLORS.danger })}
				trailing={false}
				minHeight={56}
				onPress={onPickPrescription}
			/>
		</AppBottomSheet>
	)
}

const styles = StyleSheet.create({
	section: {
		marginTop: 10,
		fontSize: 12,
		lineHeight: 16,
		fontWeight: '800',
		letterSpacing: 0.72,
		color: APP_COLORS.inkMuted,
	},
})
