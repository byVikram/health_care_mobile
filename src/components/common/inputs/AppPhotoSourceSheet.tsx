// src/components/common/inputs/AppPhotoSourceSheet.tsx
//
// "Change photo" bottom sheet from the profile designs: a titled header, one row per choice (icon tile, title,
// hint) -- take a photo, choose from the gallery, optionally pick a file (`onChooseFile`: a PDF, a document) and, when `onRemove` is
// given, remove -- and a tip. The hints, the file row and the tip are props, so the same sheet serves any upload that starts with
// "where is it from?" (the defaults are the profile photo's).
// Choosing a row closes the sheet first and calls its handler once the sheet has slid out, so the camera /
// gallery can open straight away (iOS won't present one modal over another that is still closing).

import React from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { APP_COLORS, TONES } from '../../../config/theme'
import { AppBottomSheet } from '../layout/AppBottomSheet'

export type AppPhotoSourceSheetProps = {
	visible: boolean
	onClose: () => void
	onTakePhoto: () => void
	onChoosePhoto: () => void
	/** Shows a third row for a file (a PDF, a document). Omit where only photos are taken. */
	onChooseFile?: () => void
	/** Shows the "Remove photo" row. Omit where a photo can only be replaced. */
	onRemove?: () => void
	title?: string
	subtitle?: string
	/** Row texts; the defaults are the profile photo's. */
	takePhotoHint?: string
	choosePhotoHint?: string
	chooseFileTitle?: string
	chooseFileHint?: string
	/** The note under the rows. */
	tip?: string
}

// Sheet slide-out time (AppBottomSheet closes in 200ms).
const SHEET_CLOSE_MS = 260

type OptionProps = {
	icon: React.ComponentProps<typeof MaterialCommunityIcons>['name']
	title: string
	hint: string
	onPress: () => void
	danger?: boolean
}

function Option({ icon, title, hint, onPress, danger = false }: OptionProps) {
	const tile = danger ? { bg: APP_COLORS.dangerBg, ink: APP_COLORS.danger } : TONES.mint
	return (
		<TouchableOpacity
			style={styles.option}
			onPress={onPress}
			activeOpacity={0.85}
			accessibilityRole="button"
			accessibilityLabel={title}
		>
			<View style={[styles.tile, { backgroundColor: tile.bg }]}>
				<MaterialCommunityIcons name={icon} size={22} color={tile.ink} />
			</View>
			<View style={styles.optionText}>
				<Text style={[styles.optionTitle, danger && { color: APP_COLORS.danger }]}>{title}</Text>
				<Text style={styles.optionHint}>{hint}</Text>
			</View>
		</TouchableOpacity>
	)
}

export function AppPhotoSourceSheet({
	visible,
	onClose,
	onTakePhoto,
	onChoosePhoto,
	onChooseFile,
	onRemove,
	title = 'Profile photo',
	subtitle,
	takePhotoHint = 'Use your camera',
	choosePhotoHint = 'Pick one from your photos',
	chooseFileTitle = 'Choose a file',
	chooseFileHint = 'Pick a document from your phone',
	tip = 'Use a clear, recent photo of your face on a plain background.',
}: AppPhotoSourceSheetProps) {
	const choose = (action: () => void) => () => {
		onClose()
		setTimeout(action, SHEET_CLOSE_MS)
	}

	return (
		<AppBottomSheet
			visible={visible}
			onClose={onClose}
			title={title}
			subtitle={subtitle}
			appearance="modern"
			showHeaderDivider={false}
		>
			<View style={styles.options}>
				<Option icon="camera-outline" title="Take a photo" hint={takePhotoHint} onPress={choose(onTakePhoto)} />
				<Option
					icon="image-outline"
					title="Choose from gallery"
					hint={choosePhotoHint}
					onPress={choose(onChoosePhoto)}
				/>
				{onChooseFile ? (
					<Option
						icon="file-pdf-box"
						title={chooseFileTitle}
						hint={chooseFileHint}
						onPress={choose(onChooseFile)}
					/>
				) : null}
				{onRemove ? (
					<Option
						icon="trash-can-outline"
						title="Remove photo"
						hint="Delete your current photo"
						onPress={choose(onRemove)}
						danger
					/>
				) : null}
			</View>
			{tip ? <Text style={styles.tip}>{tip}</Text> : null}
		</AppBottomSheet>
	)
}

export default AppPhotoSourceSheet

const styles = StyleSheet.create({
	options: {
		paddingBottom: 4,
	},
	option: {
		minHeight: 60,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 14,
		paddingVertical: 8,
		borderTopWidth: 1,
		borderTopColor: APP_COLORS.neutralBg,
	},
	tile: {
		width: 40,
		height: 40,
		borderRadius: 12,
		alignItems: 'center',
		justifyContent: 'center',
	},
	optionText: {
		flex: 1,
	},
	optionTitle: {
		fontSize: 15,
		lineHeight: 20,
		fontWeight: '700',
		color: APP_COLORS.ink,
	},
	optionHint: {
		fontSize: 12,
		lineHeight: 16,
		color: APP_COLORS.inkMuted,
	},
	tip: {
		marginTop: 8,
		padding: 10,
		borderRadius: 10,
		backgroundColor: APP_COLORS.pageBg,
		fontSize: 12,
		lineHeight: 18,
		color: APP_COLORS.inkMuted,
	},
})
