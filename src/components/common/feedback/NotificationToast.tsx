// src/components/common/feedback/NotificationToast.tsx
//
// The banner shown at the top of the screen when a push arrives while the app is open (Android and iOS show no system notification
// for the app that is in front, so the app draws its own, like a chat app does): a bell tile, a bold title and the message in up to
// two lines. A tap opens what it is about; a swipe up dismisses it (react-native-toast-message). Used as the `notification` type of
// `toastConfig`; see `pushNotificationService.handleForeground`.
import { Pressable, StyleSheet, Text, View } from 'react-native'
import type { ToastConfigParams } from 'react-native-toast-message'

import { APP_COLORS, SOFT_CARD_SHADOW } from '../../../config/theme'
import { AppPathIcon } from '../display/AppIcon'

const BELL = 'M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 0 0 3.4 0'

export default function NotificationToast({ text1, text2, onPress }: ToastConfigParams<unknown>) {
	return (
		<Pressable
			onPress={onPress}
			accessibilityRole="button"
			accessibilityLabel={[text1, text2].filter(Boolean).join('. ')}
			style={({ pressed }) => [styles.card, pressed && styles.pressed]}
		>
			<View style={styles.iconTile}>
				<AppPathIcon d={BELL} size={22} color={APP_COLORS.primary} />
			</View>
			<View style={styles.texts}>
				<Text style={styles.title} numberOfLines={1}>
					{text1}
				</Text>
				{!!text2 && (
					<Text style={styles.body} numberOfLines={2}>
						{text2}
					</Text>
				)}
			</View>
		</Pressable>
	)
}

const styles = StyleSheet.create({
	card: {
		flexDirection: 'row',
		alignItems: 'center',
		width: '92%',
		maxWidth: 520,
		paddingVertical: 12,
		paddingHorizontal: 12,
		borderRadius: 16,
		borderWidth: 1,
		borderColor: APP_COLORS.cardBorder,
		backgroundColor: APP_COLORS.surface,
		elevation: 8,
		...SOFT_CARD_SHADOW,
	},
	pressed: { opacity: 0.92 },
	iconTile: {
		width: 40,
		height: 40,
		borderRadius: 12,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: APP_COLORS.mint,
		marginRight: 12,
	},
	texts: { flex: 1 },
	title: { fontSize: 14, fontWeight: '700', color: APP_COLORS.ink },
	body: { fontSize: 13, lineHeight: 18, color: APP_COLORS.inkMuted, marginTop: 2 },
})
