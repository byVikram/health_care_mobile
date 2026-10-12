// src/components/common/display/ConsultationNotesImage.tsx
//
// The doctor's submitted (scribbled) consultation notes: the image in a bordered card, tap to open it full screen.
// Shared by the doctor's consultation screen, the patient's visit summary and the doctor's patient-history list.
//
// The image comes from a signed URL that expires after about five minutes (GET /api/treatments/... returns a
// fresh one each time). If the image cannot be fetched, `onExpired` is called ONCE so the caller can reload the
// record for a fresh link; if that does not help (the object is gone, no network) the card says so and offers
// "Tap to retry", which allows one more reload. It never reloads in a loop: every fresh link is a new string, so
// the limit is per image, not per URL.

import React, { useEffect, useRef, useState } from 'react'
import { Image, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { APP_COLORS } from '../../../config/theme'

/** Background of the scribble canvas the doctor draws on, so a transparent PNG still reads as paper. */
const PAPER = '#FFFDF6'
/** Shown until the image reports its real size. */
const DEFAULT_RATIO = 4 / 3

type Props = {
	uri: string
	/** The link failed to load (most often: it expired). Called once per `uri`. */
	onExpired?: () => void
}

export function ConsultationNotesImage({ uri, onExpired }: Props) {
	const insets = useSafeAreaInsets()
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

	if (failed) {
		return (
			<TouchableOpacity
				onPress={() => {
					autoReloaded.current = false
					setFailed(false)
					setAttempt((n) => n + 1)
				}}
				accessibilityRole="button"
				accessibilityLabel="Could not load the notes image. Tap to retry"
				style={[styles.card, styles.failed]}
			>
				<MaterialCommunityIcons name="image-off-outline" size={22} color={APP_COLORS.inkMuted} />
				<Text style={styles.failedText}>Couldn’t load the notes image · Tap to retry</Text>
			</TouchableOpacity>
		)
	}

	return (
		<>
			<TouchableOpacity
				onPress={() => setOpen(true)}
				activeOpacity={0.9}
				accessibilityRole="imagebutton"
				accessibilityLabel="Doctor’s handwritten notes. Tap to enlarge"
				style={styles.card}
			>
				<Image
					key={attempt}
					source={{ uri }}
					resizeMode="contain"
					onLoad={(e) => {
						autoReloaded.current = false
						const { width, height } = e.nativeEvent.source
						if (width && height) setRatio(width / height)
					}}
					onError={handleError}
					style={[styles.image, { aspectRatio: ratio }]}
				/>
			</TouchableOpacity>

			<Modal visible={open} animationType="fade" onRequestClose={() => setOpen(false)}>
				<View style={[styles.viewer, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 8 }]}>
					<TouchableOpacity
						onPress={() => setOpen(false)}
						accessibilityRole="button"
						accessibilityLabel="Close"
						style={styles.close}
					>
						<MaterialCommunityIcons name="close" size={24} color={APP_COLORS.ink} />
					</TouchableOpacity>
					<Image
						source={{ uri }}
						resizeMode="contain"
						// An expired link: close the viewer; the card behind it reloads the record and offers a retry.
						onError={() => {
							setOpen(false)
							handleError()
						}}
						style={styles.viewerImage}
					/>
				</View>
			</Modal>
		</>
	)
}

const styles = StyleSheet.create({
	card: {
		borderRadius: 12,
		borderWidth: 1,
		borderColor: APP_COLORS.divider,
		backgroundColor: PAPER,
		overflow: 'hidden',
	},
	image: { width: '100%' },
	failed: {
		minHeight: 96,
		paddingHorizontal: 16,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 8,
		backgroundColor: APP_COLORS.pageBg,
	},
	failedText: { flexShrink: 1, fontSize: 13, lineHeight: 18, fontWeight: '600', color: APP_COLORS.inkMuted },
	// Paper colour, like the card: a transparent PNG with dark ink must not land on black.
	viewer: { flex: 1, backgroundColor: PAPER },
	close: { alignSelf: 'flex-end', width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
	viewerImage: { flex: 1, width: '100%' },
})
