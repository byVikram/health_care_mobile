// src/config/toastConfig.tsx
//
// react-native-toast-message config: every toast in the app (success / error / info) is drawn as a
// dark pill at the bottom of the screen with a coloured icon and white text -- "✓ Profile updated".
// Call sites keep using Toast.show({ type, text1, text2 }) unchanged; text1 is the message and the
// optional text2 is a muted second line.

import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import type { ToastConfigParams } from 'react-native-toast-message'
import { AppPathIcon } from '../components/common/display/AppIcon'
import NotificationToast from '../components/common/feedback/NotificationToast'
import { APP_COLORS } from './theme'

/** Distance of the pill from the bottom edge: clears the floating tab bar and sits over footer buttons. */
export const TOAST_BOTTOM_OFFSET = 100

const ICONS = {
	success: { d: 'M5 12.5l4.5 4.5L19 7.5', color: '#5FD39B' },
	error: { d: ['M6 6l12 12', 'M18 6L6 18'], color: '#FF8A80' },
	info: { d: ['M12 11v5.5', 'M12 7.75h.01'], color: APP_COLORS.mintAccent },
} as const

/** Headings some screens pass as text1 ("Error" + the real message as text2): only the message is shown. */
const GENERIC_TITLES = new Set(['error', 'success', 'required', 'invalid range', 'validation error'])

function PillToast({ type, text1, text2 }: ToastConfigParams<unknown> & { type: keyof typeof ICONS }) {
	const generic = !!text2 && GENERIC_TITLES.has((text1 ?? '').trim().toLowerCase())
	const message = generic ? text2 : text1
	const detail = generic ? undefined : text2
	const icon = ICONS[type]

	return (
		<View style={[styles.pill, detail ? styles.pillTall : null]} accessibilityRole="alert" accessible>
			<AppPathIcon d={icon.d as string | string[]} size={18} strokeWidth={2.4} color={icon.color} />
			<View style={styles.textCol}>
				{!!message && (
					<Text style={styles.message} numberOfLines={3}>
						{message}
					</Text>
				)}
				{!!detail && (
					<Text style={styles.detail} numberOfLines={3}>
						{detail}
					</Text>
				)}
			</View>
		</View>
	)
}

export const toastConfig = {
	success: (props: ToastConfigParams<unknown>) => <PillToast {...props} type="success" />,
	error: (props: ToastConfigParams<unknown>) => <PillToast {...props} type="error" />,
	info: (props: ToastConfigParams<unknown>) => <PillToast {...props} type="info" />,
	rejectSuccess: (props: ToastConfigParams<unknown>) => <PillToast {...props} type="error" />,
	// A push that arrives while the app is open and cannot be posted as a system notification (services/pushNotificationService.ts).
	notification: (props: ToastConfigParams<unknown>) => <NotificationToast {...props} />,
}

const styles = StyleSheet.create({
	pill: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
		alignSelf: 'center',
		maxWidth: '92%',
		minHeight: 44,
		paddingVertical: 10,
		paddingHorizontal: 18,
		borderRadius: 9999,
		backgroundColor: APP_COLORS.ink,
		shadowColor: APP_COLORS.shadow,
		shadowOpacity: 0.28,
		shadowRadius: 12,
		shadowOffset: { width: 0, height: 4 },
		elevation: 8,
	},
	pillTall: { borderRadius: 22 },
	textCol: { flexShrink: 1, gap: 1 },
	message: { fontSize: 14, lineHeight: 20, fontWeight: '600', color: '#FFFFFF' },
	detail: { fontSize: 12, lineHeight: 17, color: '#FFFFFFBF' },
})
