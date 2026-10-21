import React, { useState } from 'react'
import { Image, StyleSheet, Text, View, type ImageStyle, type StyleProp, type TextStyle } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { APP_COLORS } from '../../../config/theme'

type IconName = keyof typeof MaterialCommunityIcons.glyphMap

interface AppAvatarProps {
	uri?: string | null
	name?: string
	size?: number
	style?: StyleProp<ImageStyle>
	/** Corner radius. Defaults to a full circle (size / 2). */
	radius?: number
	borderWidth?: number
	borderColor?: string
	/** Placeholder / image-loading background. Defaults to the existing teal (placeholder) / grey (image). */
	backgroundColor?: string
	/** Initials / fallback icon colour. Defaults to white. */
	initialsColor?: string
	/** Extra initials text style (e.g. design member avatars: 16-17/22 700). */
	initialsStyle?: StyleProp<TextStyle>
	/** MaterialCommunityIcons glyph shown instead of initials when there is no photo (e.g. 'account'). */
	fallbackIcon?: IconName
	/** Selected ring: 3px white gap + 2px APP_COLORS.primary outer ring (design member picker). */
	ring?: boolean
	/** Only applied when given (existing callers keep their current accessibility tree). */
	accessibilityLabel?: string
}

const getInitials = (name?: string) => {
	if (!name) return '?'
	const parts = name.trim().split(/\s+/)
	const initials = parts.slice(0, 2).map((p) => p.charAt(0).toUpperCase())
	return initials.join('') || '?'
}

// Circular profile image with a graceful initials fallback when the remote
// photo is missing or fails to load (e.g. no network). Used anywhere a
// provider/patient/doctor profile photo is shown across the app.
export default function AppAvatar({
	uri,
	name,
	size = 44,
	style,
	radius,
	borderWidth,
	borderColor,
	backgroundColor,
	initialsColor,
	initialsStyle,
	fallbackIcon,
	ring = false,
	accessibilityLabel,
}: AppAvatarProps) {
	const [failed, setFailed] = useState(false)
	const showImage = !!uri && !failed
	const dimension = { width: size, height: size, borderRadius: radius ?? size / 2 }
	const overrides: ImageStyle = {}
	if (borderWidth != null) overrides.borderWidth = borderWidth
	if (borderColor != null) overrides.borderColor = borderColor
	if (backgroundColor != null) overrides.backgroundColor = backgroundColor

	let inner: React.ReactElement
	if (showImage) {
		inner = (
			<Image
				source={{ uri: uri as string }}
				style={[styles.image, dimension, overrides, style]}
				onError={() => setFailed(true)}
				accessibilityLabel={accessibilityLabel}
			/>
		)
	} else {
		inner = (
			<View
				style={[styles.placeholder, dimension, overrides, style as StyleProp<ImageStyle>]}
				accessible={accessibilityLabel ? true : undefined}
				accessibilityLabel={accessibilityLabel}
			>
				{fallbackIcon ? (
					<MaterialCommunityIcons name={fallbackIcon} size={size * 0.55} color={initialsColor ?? '#ffffff'} />
				) : (
					<Text
						style={[
							styles.initials,
							{ fontSize: Math.max(12, size * 0.38) },
							initialsColor ? { color: initialsColor } : null,
							initialsStyle,
						]}
					>
						{getInitials(name)}
					</Text>
				)}
			</View>
		)
	}

	if (!ring) return inner

	// CSS: box-shadow 0 0 0 3px #fff, 0 0 0 5px primary
	const outerRadius = radius != null ? radius + 5 : size
	return (
		<View style={[styles.ringOuter, { borderRadius: outerRadius }]}>
			<View style={[styles.ringInner, { borderRadius: radius != null ? radius + 3 : size }]}>{inner}</View>
		</View>
	)
}

const styles = StyleSheet.create({
	image: {
		backgroundColor: '#eceeee',
	},
	placeholder: {
		backgroundColor: '#2B6F71',
		alignItems: 'center',
		justifyContent: 'center',
	},
	initials: {
		color: '#ffffff',
		fontWeight: '700',
	},
	ringOuter: {
		padding: 2,
		backgroundColor: APP_COLORS.primary,
	},
	ringInner: {
		padding: 3,
		backgroundColor: '#ffffff',
	},
})
