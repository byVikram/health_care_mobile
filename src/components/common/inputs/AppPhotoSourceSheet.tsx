// src/components/common/inputs/AppPhotoSourceSheet.tsx
//
// "Change photo" bottom sheet from the profile designs: a titled header, one row per choice (icon tile, title,
// hint) -- take a photo, choose from the gallery, and (when `onRemove` is given) remove -- and a photo tip.
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
	/** Shows the "Remove photo" row. Omit where a photo can only be replaced. */
	onRemove?: () => void
	title?: string
	subtitle?: string
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
	onRemove,
	title = 'Profile photo',
	subtitle,
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
				<Option
					icon="camera-outline"
					title="Take a photo"
					hint="Use your camera"
					onPress={choose(onTakePhoto)}
				/>
				<Option
					icon="image-outline"
					title="Choose from gallery"
					hint="Pick one from your photos"
					onPress={choose(onChoosePhoto)}
				/>
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
			<Text style={styles.tip}>Use a clear, recent photo of your face on a plain background.</Text>
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
