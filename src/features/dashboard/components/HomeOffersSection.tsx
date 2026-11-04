// src/features/dashboard/components/HomeOffersSection.tsx
//
// Patient Home "Offers" carousel ("1 · Home"): 124px slides from the `home_offers` ads placement,
// auto-advancing every 4500ms. The CTA tracks the click, then opens the offer's in-app route or URL.
// Hidden while empty or when the ads endpoint fails.
import React, { useEffect, useState } from 'react'
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useNavigation } from '@react-navigation/native'

import { AppCarousel, AppPathIcon, AppSkeleton, AppTag } from '../../../components/common'
import { APP_COLORS, TONES, type ToneKey } from '../../../config/theme'
import { getHomeOffers, trackAdClick, type HomeOffer } from '../../../services/homeService'
import { HOME_ICONS } from '../homeTheme'
import { openWebUrl } from '../../../utils/safeLinking'
import { resolveOfferRoute } from '../offerTargets'

type SlideTheme = {
	bg: string
	circle: string
	title: string
	sub: string
	eyebrow: string
	ctaBg: string
	ctaFg: string
	iconBg: string
	iconFg: string
}

const slideTheme = (tone: HomeOffer['tone']): SlideTheme => {
	if (tone === 'ink' || !tone) {
		return {
			bg: APP_COLORS.ink,
			circle: APP_COLORS.primary,
			title: APP_COLORS.surface,
			sub: APP_COLORS.mintAccent,
			eyebrow: APP_COLORS.mintAccent,
			ctaBg: APP_COLORS.surface,
			ctaFg: APP_COLORS.ink,
			iconBg: APP_COLORS.mintAccent,
			iconFg: APP_COLORS.ink,
		}
	}
	const pair = TONES[tone as ToneKey] ?? TONES.mint
	return {
		bg: pair.bg,
		circle: `${APP_COLORS.surface}80`,
		title: APP_COLORS.ink,
		sub: APP_COLORS.inkMuted,
		eyebrow: pair.ink,
		ctaBg: APP_COLORS.primary,
		ctaFg: APP_COLORS.surface,
		iconBg: APP_COLORS.surface,
		iconFg: pair.ink,
	}
}

/** Illustration glyph for an offer without an image: picked from its target / copy. */
const offerIcon = (offer: HomeOffer) => {
	const target = offer.target
	const hay = [
		offer.title,
		offer.tag,
		target?.type === 'route' ? target.route : '',
		target?.type === 'route' ? JSON.stringify(target.params ?? {}) : '',
	]
		.join(' ')
		.toLowerCase()
	if (/video|consult/.test(hay)) return HOME_ICONS.video
	if (/nurs|ancillary|home ?care|care at home|caregiver/.test(hay)) return HOME_ICONS.syringe
	return HOME_ICONS.clipboard
}

type Props = {
	refreshToken?: number
}

function HomeOffersSection({ refreshToken }: Props) {
	const navigation = useNavigation<any>()
	const [offers, setOffers] = useState<HomeOffer[]>([])
	const [loading, setLoading] = useState(true)

	useEffect(() => {
		let active = true
		const load = async () => {
			try {
				const list = await getHomeOffers()
				if (active) setOffers(list.filter((o) => !!o?.title))
			} catch {
				if (active) setOffers([])
			} finally {
				if (active) setLoading(false)
			}
		}
		void load()
		return () => {
			active = false
		}
	}, [refreshToken])

	const handleOffer = async (offer: HomeOffer) => {
		trackAdClick(offer.public_id).catch(() => undefined)
		const target = offer.target
		if (!target) return
		try {
			if (target.type === 'url' && target.url) {
				await openWebUrl(target.url)
			} else if (target.type === 'route' && target.route) {
				// Only the allowed browse screens, with plain params: anything else is ignored.
				const next = resolveOfferRoute(target.route, target.params)
				if (next) navigation.navigate(next.name, next.params)
			}
		} catch {
			// Unknown route / unopenable URL: nothing to do from Home.
		}
	}

	if (loading) {
		return (
			<View style={styles.skeletonWrap}>
				<AppSkeleton height={124} borderRadius={12} color={APP_COLORS.divider} />
			</View>
		)
	}

	if (offers.length === 0) return null

	return (
		<AppCarousel
			data={offers}
			autoPlay
			autoPlayInterval={4500}
			accessibilityLabel="Offers"
			keyExtractor={(o, i) => o.public_id || String(i)}
			renderItem={({ item, index }) => {
				const t = slideTheme(item.tone)
				const isInk = item.tone === 'ink' || !item.tone
				const cta = item.cta_label || 'Explore'
				return (
					<TouchableOpacity
						activeOpacity={0.92}
						onPress={() => handleOffer(item)}
						style={[styles.slide, { backgroundColor: t.bg }]}
						accessibilityRole="button"
						accessibilityLabel={`Offer ${index + 1} of ${offers.length}. ${item.tag ? `${item.tag}. ` : ''}${item.title}. ${item.subtitle ?? ''}`}
						accessibilityHint={cta}
					>
						<View
							style={[styles.circle, { backgroundColor: t.circle }]}
							importantForAccessibility="no-hide-descendants"
						/>
						<View style={styles.textCol}>
							{!!item.tag &&
								(isInk ? (
									<AppTag label={item.tag} size="xs" tone="offer" />
								) : (
									<Text style={[styles.eyebrow, { color: t.eyebrow }]} numberOfLines={1}>
										{item.tag.toUpperCase()}
									</Text>
								))}
							<Text style={[styles.title, { color: t.title }]} numberOfLines={1}>
								{item.title}
							</Text>
							{!!item.subtitle && (
								<Text style={[styles.sub, { color: t.sub }]} numberOfLines={1}>
									{item.subtitle}
								</Text>
							)}
							<View style={[styles.cta, { backgroundColor: t.ctaBg }]}>
								<Text style={[styles.ctaText, { color: t.ctaFg }]} numberOfLines={1}>
									{cta}
								</Text>
								<AppPathIcon d={HOME_ICONS.chevronRight} size={14} strokeWidth={2.4} color={t.ctaFg} />
							</View>
						</View>
						<View
							style={[styles.art, { backgroundColor: t.iconBg }]}
							importantForAccessibility="no-hide-descendants"
						>
							{item.image_url ? (
								<Image source={{ uri: item.image_url }} style={styles.artImage} />
							) : (
								<AppPathIcon d={offerIcon(item)} size={32} strokeWidth={1.6} color={t.iconFg} />
							)}
						</View>
					</TouchableOpacity>
				)
			}}
		/>
	)
}

export default React.memo(HomeOffersSection)

const styles = StyleSheet.create({
	skeletonWrap: {
		paddingHorizontal: 16,
	},
	slide: {
		height: 124,
		borderRadius: 12,
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
		overflow: 'hidden',
	},
	artImage: {
		width: 64,
		height: 64,
	},
})
