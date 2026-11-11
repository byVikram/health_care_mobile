// src/features/medical-records/components/RecordViewerModal.tsx
//
// Full-screen viewer for an opened record's photo: a dark bar with the title, "Full size" and a close button, and the photo as wide
// as the screen (pinch to zoom on iOS; "Full size" opens it in the phone's browser, which zooms everywhere: a prescription is only
// useful if its writing can be read). The photo is a signed link that lasts about five minutes, so the viewer is opened right after
// the link is fetched. (A PDF is handed to the phone's own viewer instead, by the screen.)

import React, { useEffect, useState } from 'react'
import { Image, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Toast from 'react-native-toast-message'
import { AppPathIcon } from '../../../components/common'
import { APP_COLORS } from '../../../config/theme'
import { openWebUrl } from '../../../utils/safeLinking'
import type { RecordLink } from '../medicalRecordsTypes'

type Props = {
	visible: boolean
	title: string
	file: RecordLink | null
	onClose: () => void
}

/** Shown until a page reports its real size. */
const DEFAULT_RATIO = 3 / 4

function Photo({ url, width }: { url: string; width: number }) {
	const [ratio, setRatio] = useState(DEFAULT_RATIO)
	const [failed, setFailed] = useState(false)

	useEffect(() => {
		let active = true
		Image.getSize(
			url,
			(w, h) => {
				if (active && w > 0) setRatio(h / w)
			},
			() => active && setFailed(true)
		)
		return () => {
			active = false
		}
	}, [url])

	return (
		<View style={styles.page}>
			{failed ? (
				<View style={[styles.failed, { width, height: width * DEFAULT_RATIO }]}>
					<Text style={styles.failedText}>Couldn’t load this photo. Close and open the record again.</Text>
				</View>
			) : (
				<Image
					source={{ uri: url }}
					style={{ width, height: width * ratio }}
					resizeMode="contain"
					onError={() => setFailed(true)}
				/>
			)}
		</View>
	)
}

export function RecordViewerModal({ visible, title, file, onClose }: Props) {
	const insets = useSafeAreaInsets()
	const { width } = useWindowDimensions()

	const openFullSize = async () => {
		if (!file) return
		try {
			await openWebUrl(file.url)
		} catch {
			Toast.show({ type: 'error', text1: 'Couldn’t open the photo' })
		}
	}

	return (
		<Modal visible={visible} animationType="slide" onRequestClose={onClose}>
			<View style={styles.screen}>
				<View style={[styles.bar, { paddingTop: insets.top + 8 }]}>
					<View style={styles.barText}>
						<Text style={styles.title} numberOfLines={1}>
							{title}
						</Text>
					</View>
					{!!file && (
						<TouchableOpacity
							onPress={openFullSize}
							accessibilityRole="button"
							accessibilityLabel="Open the photo full size in the browser"
							hitSlop={8}
						>
							<Text style={styles.fullSize}>Full size</Text>
						</TouchableOpacity>
					)}
					<TouchableOpacity
						onPress={onClose}
						accessibilityRole="button"
						accessibilityLabel="Close"
						style={styles.close}
					>
						<AppPathIcon d="M6 6l12 12M18 6L6 18" size={22} strokeWidth={2} color="#FFFFFF" />
					</TouchableOpacity>
				</View>
				<ScrollView
					minimumZoomScale={1}
					maximumZoomScale={4}
					bouncesZoom
					contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 16 }]}
				>
					{file && <Photo key={file.url} url={file.url} width={width} />}
				</ScrollView>
			</View>
		</Modal>
	)
}

const styles = StyleSheet.create({
	screen: { flex: 1, backgroundColor: '#0B1F23' },
	bar: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		paddingHorizontal: 16,
		paddingBottom: 10,
		backgroundColor: APP_COLORS.ink,
	},
	barText: { flex: 1, minWidth: 0 },
	title: { fontSize: 16, lineHeight: 22, fontWeight: '800', color: '#FFFFFF' },
	fullSize: { fontSize: 13, fontWeight: '800', color: APP_COLORS.mintAccent },
	close: { width: 44, height: 44, marginRight: -10, alignItems: 'center', justifyContent: 'center' },
	body: { paddingTop: 8 },
	page: { alignItems: 'center' },
	failed: { alignItems: 'center', justifyContent: 'center', padding: 24 },
	failedText: { fontSize: 13, lineHeight: 18, color: '#FFFFFFB3', textAlign: 'center' },
})
