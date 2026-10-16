// src/components/common/display/AppFallbackImage.tsx
//
// An <Image> that shows `fallback` (e.g. the service's icon tile) when the image cannot be loaded. Images served from the
// public CDN depend on the network, so a failed load (offline, CDN problem, wrong key) must not leave a blank area.
// The failure is reset whenever `source` changes, so a new image gets its own attempt.
import React, { useEffect, useState } from 'react'
import { Image, type ImageSourcePropType, type ImageStyle, type StyleProp } from 'react-native'

interface AppFallbackImageProps {
	source: ImageSourcePropType
	style?: StyleProp<ImageStyle>
	resizeMode?: 'cover' | 'contain' | 'stretch' | 'center'
	/** Drawn instead of the image when it fails to load. */
	fallback: React.ReactNode
}

export function AppFallbackImage({ source, style, resizeMode = 'cover', fallback }: AppFallbackImageProps) {
	const [failed, setFailed] = useState(false)
	// A remote source is identified by its uri; a bundled one (a number) cannot fail to load.
	const identity = typeof source === 'object' && source && 'uri' in source ? source.uri : source

	useEffect(() => {
		setFailed(false)
	}, [identity])

	if (failed) return <>{fallback}</>
	return <Image source={source} style={style} resizeMode={resizeMode} onError={() => setFailed(true)} />
}
