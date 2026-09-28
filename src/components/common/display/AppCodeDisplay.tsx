// src/components/common/display/AppCodeDisplay.tsx
//
// Patient-facing code card from the KarolaHealth designs (Track visit "START CODE" /
// "COMPLETION CODE"): a dark rounded card with an eyebrow, a one-line instruction, a sub note
// and the code rendered one digit per white box. Screen readers get the whole card as one
// element reading "Start code: 3 9 5 7" instead of the individual boxes.

import React from 'react'
import { StyleProp, StyleSheet, TouchableOpacity, View, ViewStyle } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { AppTypography } from './AppTypography'
import { APP_COLORS } from '../../../config/theme'

type IconName = keyof typeof MaterialCommunityIcons.glyphMap

export type AppCodeDisplayTone = 'primary' | 'success'

export interface AppCodeDisplayProps {
	/** The code to show; empty/null renders `emptyText` in place of the digit boxes. */
	code?: string | null
	/** Small uppercase label, e.g. "START CODE". */
	eyebrow: string
	/** Instruction line, e.g. "Share when Sunita reaches your door". */
	title?: string
	/** Sub note, e.g. "Not on a call or before she arrives". */
	note?: string
	tone?: AppCodeDisplayTone
	/** Eyebrow icon (default shield-check-outline for primary, check-decagram-outline for success). */
	icon?: IconName
	/** 'inline' (design): text left, digits right. 'stacked': digits under the text (narrow cards). */
	layout?: 'inline' | 'stacked'
	/** Shows a copy button; the caller does the actual copy/share. */
	onCopy?: () => void
	copyLabel?: string
	/** Shown instead of the digits while the code is not available. */
	emptyText?: string
	style?: StyleProp<ViewStyle>
}

type ToneStyle = { bg: string; eyebrow: string; text: string; note: string; digit: string }

const TONE_STYLES: Record<AppCodeDisplayTone, ToneStyle> = {
	primary: {
		bg: APP_COLORS.ink,
		eyebrow: APP_COLORS.mintAccent,
		text: APP_COLORS.surface,
		note: APP_COLORS.mint,
		digit: APP_COLORS.ink,
	},
	success: {
		bg: APP_COLORS.success,
		eyebrow: APP_COLORS.successBg,
		text: APP_COLORS.surface,
		note: APP_COLORS.successBg,
		digit: APP_COLORS.success,
	},
}

export function AppCodeDisplay({
	code,
	eyebrow,
	title,
	note,
	tone = 'primary',
	icon,
	layout = 'inline',
	onCopy,
	copyLabel = 'Copy code',
	emptyText = 'Not available yet',
	style,
}: AppCodeDisplayProps) {
	const t = TONE_STYLES[tone]
	const digits = (code ?? '').trim().split('')
	const hasCode = digits.length > 0
	const eyebrowIcon = icon ?? (tone === 'success' ? 'check-decagram-outline' : 'shield-check-outline')
	const spoken = `${eyebrow}: ${hasCode ? digits.join(' ') : emptyText}`
	const stacked = layout === 'stacked'

	const digitRow = hasCode ? (
		<View style={styles.digits}>
			{digits.map((digit, idx) => (
				<View key={idx} style={styles.digitBox}>
					<AppTypography style={[styles.digitText, { color: t.digit }]}>{digit}</AppTypography>
				</View>
			))}
		</View>
	) : (
		<AppTypography style={[styles.empty, { color: t.note }]}>{emptyText}</AppTypography>
	)

	return (
		<View style={[styles.card, stacked && styles.cardStacked, { backgroundColor: t.bg }, style]}>
			<View
				style={[styles.body, stacked && styles.bodyStacked]}
				accessible
				accessibilityRole="text"
				accessibilityLabel={[spoken, title, note].filter(Boolean).join('. ')}
			>
				<View style={styles.textCol}>
					<View style={styles.eyebrowRow}>
						<MaterialCommunityIcons name={eyebrowIcon} size={14} color={t.eyebrow} />
						<AppTypography style={[styles.eyebrow, { color: t.eyebrow }]}>
							{eyebrow.toUpperCase()}
						</AppTypography>
					</View>
					{title ? <AppTypography style={[styles.title, { color: t.text }]}>{title}</AppTypography> : null}
					{note ? <AppTypography style={[styles.note, { color: t.note }]}>{note}</AppTypography> : null}
				</View>
				{digitRow}
			</View>
			{onCopy && hasCode ? (
				<TouchableOpacity
					style={[styles.copyBtn, stacked && styles.copyBtnStacked, { borderColor: t.note }]}
					onPress={onCopy}
					accessibilityRole="button"
					accessibilityLabel={copyLabel}
					hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
				>
					<MaterialCommunityIcons name="content-copy" size={18} color={t.text} />
				</TouchableOpacity>
			) : null}
		</View>
	)
}

export default AppCodeDisplay

const styles = StyleSheet.create({
	card: {
		borderRadius: 14,
		paddingVertical: 12,
		paddingHorizontal: 14,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
	},
	cardStacked: {
		alignItems: 'flex-start',
	},
	body: {
		flex: 1,
		minWidth: 0,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
	},
	bodyStacked: {
		flexDirection: 'column',
		alignItems: 'flex-start',
		gap: 10,
	},
	textCol: {
		flexShrink: 1,
		flexGrow: 1,
		minWidth: 0,
		gap: 2,
	},
	eyebrowRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
	},
	eyebrow: {
		fontSize: 11,
		lineHeight: 14,
		fontWeight: '800',
		letterSpacing: 0.9,
	},
	title: {
		fontSize: 13,
		lineHeight: 18,
		fontWeight: '700',
	},
	note: {
		fontSize: 11,
		lineHeight: 14,
	},
	digits: {
		flexShrink: 0,
		flexDirection: 'row',
		gap: 5,
	},
	digitBox: {
		width: 34,
		height: 42,
		borderRadius: 8,
		backgroundColor: APP_COLORS.surface,
		alignItems: 'center',
		justifyContent: 'center',
	},
	digitText: {
		fontSize: 22,
		lineHeight: 28,
		fontWeight: '800',
	},
	empty: {
		flexShrink: 0,
		fontSize: 12,
		lineHeight: 16,
		fontWeight: '600',
	},
	copyBtn: {
		flexShrink: 0,
		width: 36,
		height: 36,
		borderRadius: 10,
		borderWidth: 1,
		alignItems: 'center',
		justifyContent: 'center',
	},
	copyBtnStacked: {
		alignSelf: 'flex-start',
	},
})
