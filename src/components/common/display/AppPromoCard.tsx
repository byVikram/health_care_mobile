// src/components/common/display/AppPromoCard.tsx
//
// Offer / promo slide from the KarolaHealth designs (home-care catalogue "PRIORITY · 24/7 — Need a nurse right
// now?", "RECOVERY PLAN — Home after surgery?", "FIRST VISIT — Vitals check at home"): 120 high, radius 16,
// padding 12x16, a decorative circle top-right, text column (eyebrow, 17/22 700 title, 12/16 subtitle with an
// optional price + struck-through MRP, 32-high CTA pill) and a 64px round art tile with a stroke icon.
//   tone 'ink'      — APP_COLORS.ink card, eyebrow as an offer AppTag, mint subtitle, white CTA.
//   tone <ToneKey>  — soft TONES[tone].bg card, eyebrow in the tone ink, primary CTA, white art tile.
// Designed to sit inside AppCarousel, but works standalone.

import React from 'react'
import { StyleSheet, Text, TouchableOpacity, View, type StyleProp, type ViewStyle } from 'react-native'
import { APP_COLORS, TONES, type ToneKey } from '../../../config/theme'
import { AppPathIcon } from './AppIcon'
import { AppTag } from './AppTag'

export type AppPromoCardTone = 'ink' | ToneKey

export type AppPromoCardProps = {
	title: string
	/** Small caps line above the title, e.g. "PRIORITY · 24/7". */
	eyebrow?: string
	subtitle?: string
	/** Appended to the subtitle, e.g. "₹249". */
	priceLabel?: string
	/** Struck-through after the price, e.g. "₹349". */
	mrpLabel?: string
	ctaLabel: string
	/** Show a trailing chevron in the CTA. Defaults to true. */
	ctaChevron?: boolean
	onPress: () => void
	/** Stroke path(s) on a 24x24 grid for the round art tile. */
	iconPath?: string | string[]
	tone?: AppPromoCardTone
	/** Card height. Defaults to 120. */
	height?: number
	accessibilityLabel?: string
	accessibilityHint?: string
	style?: StyleProp<ViewStyle>
}

const CHEVRON = 'M9 6l6 6-6 6'

const themeFor = (tone: AppPromoCardTone) => {
	if (tone === 'ink') {
		return {
			bg: APP_COLORS.ink,
			circle: APP_COLORS.primary,
			circleOpacity: 1,
			eyebrow: APP_COLORS.mintAccent,
			title: APP_COLORS.surface,
			sub: APP_COLORS.mintAccent,
			ctaBg: APP_COLORS.surface,
			ctaFg: APP_COLORS.ink,
			artBg: APP_COLORS.mintAccent,
			artFg: APP_COLORS.ink,
		}
	}
	const pair = TONES[tone]
	return {
		bg: pair.bg,
		circle: APP_COLORS.surface,
		circleOpacity: 0.55,
		eyebrow: pair.ink,
		title: APP_COLORS.ink,
		sub: APP_COLORS.inkMuted,
		ctaBg: APP_COLORS.primary,
		ctaFg: APP_COLORS.surface,
		artBg: APP_COLORS.surface,
		artFg: pair.ink,
	}
}

export function AppPromoCard({
	title,
	eyebrow,
	subtitle,
	priceLabel,
	mrpLabel,
	ctaLabel,
	ctaChevron = true,
	onPress,
	iconPath,
	tone = 'ink',
	height = 120,
	accessibilityLabel,
	accessibilityHint,
	style,
}: AppPromoCardProps) {
	const t = themeFor(tone)
	const isInk = tone === 'ink'
	const hasSub = !!subtitle || !!priceLabel
	const a11y =
		accessibilityLabel ??
		[eyebrow, title, subtitle, priceLabel, mrpLabel ? `was ${mrpLabel}` : ''].filter(Boolean).join('. ')

	return (
		<TouchableOpacity
			activeOpacity={0.92}
			onPress={onPress}
			style={[styles.card, { height, backgroundColor: t.bg }, style]}
			accessibilityRole="button"
			accessibilityLabel={a11y}
			accessibilityHint={accessibilityHint ?? ctaLabel}
		>
			<View
				style={[styles.circle, { backgroundColor: t.circle, opacity: t.circleOpacity }]}
				importantForAccessibility="no-hide-descendants"
			/>
			<View style={styles.textCol}>
				{!!eyebrow &&
					(isInk ? (
						<AppTag label={eyebrow} size="xs" tone="offer" />
					) : (
						<Text style={[styles.eyebrow, { color: t.eyebrow }]} numberOfLines={1}>
							{eyebrow.toUpperCase()}
						</Text>
					))}
				<Text style={[styles.title, { color: t.title }]} numberOfLines={1}>
					{title}
				</Text>
				{hasSub && (
					<Text style={[styles.sub, { color: t.sub }]} numberOfLines={1}>
						{subtitle}
						{!!subtitle && !!priceLabel ? ' · ' : ''}
						{priceLabel}
						{!!mrpLabel && (
							<Text style={styles.mrp}>
								{' '}
								{mrpLabel}
							</Text>
						)}
					</Text>
				)}
				<View style={[styles.cta, { backgroundColor: t.ctaBg }]}>
					<Text style={[styles.ctaText, { color: t.ctaFg }]} numberOfLines={1}>
						{ctaLabel}
					</Text>
					{ctaChevron && <AppPathIcon d={CHEVRON} size={14} strokeWidth={2.4} color={t.ctaFg} />}
				</View>
			</View>
			{!!iconPath && (
				<View style={[styles.art, { backgroundColor: t.artBg }]} importantForAccessibility="no-hide-descendants">
					<AppPathIcon d={iconPath} size={32} strokeWidth={1.6} color={t.artFg} />
				</View>
			)}
		</TouchableOpacity>
	)
}

const styles = StyleSheet.create({
	card: {
		borderRadius: 16,
		paddingVertical: 12,
		paddingHorizontal: 16,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		overflow: 'hidden',
	},
	circle: {
		position: 'absolute',
		right: -40,
		top: -40,
		width: 140,
		height: 140,
		borderRadius: 70,
	},
	textCol: {
		flex: 1,
		minWidth: 0,
		alignItems: 'flex-start',
		gap: 2,
	},
	eyebrow: {
		fontSize: 11,
		lineHeight: 14,
		fontWeight: '700',
		letterSpacing: 0.66,
	},
	title: {
		fontSize: 17,
		lineHeight: 22,
		fontWeight: '700',
	},
	sub: {
		fontSize: 12,
		lineHeight: 16,
	},
	mrp: {
		textDecorationLine: 'line-through',
	},
	cta: {
		marginTop: 4,
		height: 32,
		paddingHorizontal: 12,
		borderRadius: 8,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 2,
	},
	ctaText: {
		fontSize: 13,
		fontWeight: '600',
	},
	art: {
		width: 64,
		height: 64,
		borderRadius: 32,
		alignItems: 'center',
		justifyContent: 'center',
	},
})

export default AppPromoCard
