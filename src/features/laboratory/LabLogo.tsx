// src/features/laboratory/LabLogo.tsx
//
// A lab's logo (the image LabStack gives for it) in a rounded tile; the lab icon when there is none or it fails
// to load.

import React from 'react'
import { StyleSheet, View } from 'react-native'
import { AppFallbackImage, AppIconTile, AppPathIcon } from '../../components/common'
import { APP_COLORS } from '../../config/theme'
import { LAB_ICONS } from './labMock'

type Props = { uri?: string | null; size?: number }

export function LabLogo({ uri, size = 44 }: Props) {
	const icon = (
		<AppIconTile size={size} radius={12} tone="mint">
			<AppPathIcon d={LAB_ICONS.clinic} size={Math.round(size / 2)} strokeWidth={2} color={APP_COLORS.primary} />
		</AppIconTile>
	)
	if (!uri) return icon
	return (
		<View style={[styles.frame, { width: size, height: size }]}>
			<AppFallbackImage
				source={{ uri }}
				style={styles.image}
				resizeMode="contain"
				fallback={icon}
			/>
		</View>
	)
}

const styles = StyleSheet.create({
	frame: {
		borderRadius: 12,
		borderWidth: 1,
		borderColor: APP_COLORS.divider,
		backgroundColor: '#FFFFFF',
		overflow: 'hidden',
		alignItems: 'center',
		justifyContent: 'center',
	},
	image: { width: '88%', height: '88%' },
})
