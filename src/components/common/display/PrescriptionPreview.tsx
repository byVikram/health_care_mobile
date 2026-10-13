// src/components/common/display/PrescriptionPreview.tsx
//
// The patient's prescription on the Visit summary (design: summary.html, "7b"): a row with a small thumbnail of the
// prescription page, who wrote it and when, and "Tap to view"; tapping opens the page full screen with a
// "Save to phone" action.
//
// The image is the page the backend drew (clinic band, doctor, patient grid, the doctor's notes, footer) from a signed
// URL that expires after about five minutes. If it cannot be fetched `onExpired` is called ONCE so the caller can
// reload the record for a fresh link; if that does not help, the row offers "Tap to retry" (one more reload each).

import React, { useEffect, useRef, useState } from 'react'
import { ActivityIndicator, Image, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { APP_COLORS } from '../../../config/theme'
import { PRESCRIPTION_PAGE } from '../../../config/prescription'

const DEFAULT_RATIO = PRESCRIPTION_PAGE.designWidth / PRESCRIPTION_PAGE.designHeight
const THUMB_WIDTH = 56
const THUMB_HEIGHT = 79
const VIEWER_BG = '#0E2A2F'
const VIEWER_ACCENT = '#9FD3D1'

type Props = {
	uri: string
	/** "Prescription · 5 Sep 2026" */
	title: string
	/** "Dr. Farah Siddiqui · Karolahealth Clinic" */
	subtitle: string
	/** Under "Prescription" in the viewer: "5 Sep 2026 · Dr. Farah Siddiqui" */
	viewerSubtitle: string
	/** The link failed to load (most often: it expired). Called once per failure. */
	onExpired?: () => void
	/** "Save to phone": the caller fetches a fresh link and opens it. */
	onSave: () => void
	saving?: boolean
}

export function PrescriptionPreview({ uri, title, subtitle, viewerSubtitle, onExpired, onSave, saving = false }: Props) {
	const insets = useSafeAreaInsets()
	const { width: screenWidth } = useWindowDimensions()
	const [ratio, setRatio] = useState(DEFAULT_RATIO)
	const [failed, setFailed] = useState(false)
	const [open, setOpen] = useState(false)
	// A reload bumps this so React Native fetches the URL again even if it is the same string.
	const [attempt, setAttempt] = useState(0)
	// One automatic reload per failure; reset by a successful load or a manual retry.
	const autoReloaded = useRef(false)

	// A new link (the record was reloaded) is a fresh start.
	useEffect(() => {
		setFailed(false)
	}, [uri])

	const handleError = () => {
		setFailed(true)
		if (!autoReloaded.current) {
			autoReloaded.current = true
			onExpired?.()
		}
	}

	const onRowPress = () => {
		if (failed) {
			autoReloaded.current = false
			setFailed(false)
			setAttempt((n) => n + 1)
			return
		}
		setOpen(true)
	}

	const viewerWidth = Math.min(screenWidth - 64, 480)

	return (
		<>
			<TouchableOpacity
				onPress={onRowPress}
				activeOpacity={0.85}
				accessibilityRole="button"
				accessibilityLabel={failed ? 'Could not load the prescription. Tap to retry' : `View prescription. ${title}`}
				style={styles.row}
			>
				<View style={styles.thumb}>
					{failed ? (
						<MaterialCommunityIcons name="image-off-outline" size={22} color={APP_COLORS.inkMuted} />
					) : (
						<Image
							key={attempt}
							source={{ uri }}
							resizeMode="cover"
							onLoad={(e) => {
								autoReloaded.current = false
								const { width, height } = e.nativeEvent.source
								if (width && height) setRatio(width / height)
							}}
							onError={handleError}
							// Top of the page, cropped at the bottom when the page is taller than the thumbnail.
							style={[styles.thumbImage, { height: THUMB_WIDTH / ratio }]}
						/>
					)}
				</View>
				<View style={styles.textCol}>
					<Text style={styles.title} numberOfLines={1}>
						{title}
					</Text>
					<Text style={styles.subtitle} numberOfLines={1}>
						{subtitle}
					</Text>
					<View style={styles.hintRow}>
						<MaterialCommunityIcons name={failed ? 'refresh' : 'image-outline'} size={14} color={APP_COLORS.primary} />
						<Text style={styles.hint}>{failed ? 'Couldn’t load · Tap to retry' : 'Tap to view'}</Text>
					</View>
				</View>
				<MaterialCommunityIcons name="chevron-right" size={18} color="#7A8B8E" />
			</TouchableOpacity>

			<Modal visible={open} animationType="fade" onRequestClose={() => setOpen(false)}>
				<View style={[styles.viewer, { paddingTop: insets.top }]}>
					<View style={styles.viewerHeader}>
						<TouchableOpacity onPress={() => setOpen(false)} accessibilityRole="button" accessibilityLabel="Close" style={styles.close}>
							<MaterialCommunityIcons name="close" size={22} color="#FFFFFF" />
						</TouchableOpacity>
						<View style={styles.viewerTitleCol}>
							<Text style={styles.viewerTitle}>Prescription</Text>
							<Text style={styles.viewerSubtitle} numberOfLines={1}>
								{viewerSubtitle}
							</Text>
						</View>
					</View>
					<ScrollView style={styles.flex} contentContainerStyle={styles.viewerBody} showsVerticalScrollIndicator={false}>
						<Image
							source={{ uri }}
							resizeMode="contain"
							// An expired link: close the viewer; the row behind it reloads the record and offers a retry.
							onError={() => {
								setOpen(false)
								handleError()
							}}
							accessibilityLabel={`Prescription. ${subtitle}`}
							style={[styles.viewerImage, { width: viewerWidth, aspectRatio: ratio }]}
						/>
					</ScrollView>
					<View style={[styles.viewerFooter, { paddingBottom: 24 + insets.bottom * 0.5 }]}>
						<TouchableOpacity onPress={onSave} disabled={saving} accessibilityRole="button" style={styles.saveBtn}>
							{saving ? (
								<ActivityIndicator size="small" color={APP_COLORS.ink} />
							) : (
								<MaterialCommunityIcons name="download-outline" size={18} color={APP_COLORS.ink} />
							)}
							<Text style={styles.saveText}>Save to phone</Text>
						</TouchableOpacity>
					</View>
				</View>
			</Modal>
		</>
	)
}

const styles = StyleSheet.create({
	flex: { flex: 1 },
	row: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		padding: 10,
		borderWidth: 1,
		borderColor: APP_COLORS.divider,
		borderRadius: 12,
		backgroundColor: '#FFFFFF',
	},
	thumb: {
		width: THUMB_WIDTH,
		height: THUMB_HEIGHT,
		borderRadius: 6,
		overflow: 'hidden',
		backgroundColor: APP_COLORS.pageBg,
		borderWidth: 1,
		borderColor: '#E3EAEB',
		alignItems: 'center',
		justifyContent: 'center',
	},
	thumbImage: { position: 'absolute', top: 0, left: 0, width: THUMB_WIDTH },
	textCol: { flex: 1, minWidth: 0, gap: 2 },
	title: { fontSize: 15, lineHeight: 20, fontWeight: '800', color: APP_COLORS.ink },
	subtitle: { fontSize: 13, lineHeight: 18, color: APP_COLORS.inkMuted },
	hintRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
	hint: { fontSize: 12, lineHeight: 16, fontWeight: '700', color: APP_COLORS.primary },

	viewer: { flex: 1, backgroundColor: VIEWER_BG },
	viewerHeader: { height: 64, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', gap: 4 },
	close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
	viewerTitleCol: { flex: 1, minWidth: 0 },
	viewerTitle: { fontSize: 16, lineHeight: 22, fontWeight: '800', color: '#FFFFFF' },
	viewerSubtitle: { fontSize: 12, lineHeight: 16, color: VIEWER_ACCENT },
	viewerBody: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, paddingVertical: 8 },
	// The page, as a sheet of paper on the dark background.
	viewerImage: { borderRadius: 6, backgroundColor: '#FFFFFF' },
	viewerFooter: { paddingHorizontal: 16, paddingTop: 12 },
	saveBtn: {
		height: 48,
		borderRadius: 12,
		backgroundColor: VIEWER_ACCENT,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 6,
	},
	saveText: { fontSize: 14, fontWeight: '800', color: APP_COLORS.ink },
})
