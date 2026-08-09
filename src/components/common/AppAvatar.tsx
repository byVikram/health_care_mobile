import React, { useState } from 'react'
import { Image, StyleSheet, Text, View, type ImageStyle, type StyleProp } from 'react-native'

interface AppAvatarProps {
	uri?: string
	name?: string
	size?: number
	style?: StyleProp<ImageStyle>
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
export default function AppAvatar({ uri, name, size = 44, style }: AppAvatarProps) {
	const [failed, setFailed] = useState(false)
	const showImage = !!uri && !failed
	const dimension = { width: size, height: size, borderRadius: size / 2 }

	if (showImage) {
		return (
			<Image
				source={{ uri }}
				style={[styles.image, dimension, style]}
				onError={() => setFailed(true)}
			/>
		)
	}

	return (
		<View style={[styles.placeholder, dimension, style]}>
			<Text style={[styles.initials, { fontSize: Math.max(12, size * 0.38) }]}>{getInitials(name)}</Text>
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
})
