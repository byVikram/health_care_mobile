// src/components/common/booking/AppCatalogItemRow.tsx
//
// Service-catalogue row, "media" layout from the KarolaHealth home-care designs (Nursing care at home →
// Care packages / Nursing procedures): text column on the left (18/24 600 name,
// "₹199 ~~₹249~~ · 30 mins", up to two muted bullet points, a mint "View details" pill) and a 112px media tile
// on the right (image, or a tone tile with a stroke icon) with an overlapping Add / Added toggle.
// Pure UI — the parent owns the cart; rows are separated by a 1px APP_COLORS.divider (pass `divider`).

import React from 'react'
import {
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
	type ImageSourcePropType,
	type StyleProp,
	type ViewStyle,
} from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { APP_COLORS, TONES, type ToneKey } from '../../../config/theme'
import { AppPathIcon } from '../display/AppIcon'
import { AppFallbackImage } from '../display/AppFallbackImage'

export type AppCatalogItemRowProps = {
	name: string
	priceLabel: string
	/** Struck-through MRP, e.g. "₹249". */
	mrpLabel?: string
	/** e.g. "30 mins" / "7 visits". */
	metaLabel?: string
	/** Up to two short lines under the price. */
	points?: string[]
	/** Media tile: an image, else a tone tile with `iconPath`. */
	imageSource?: ImageSourcePropType
	iconPath?: string | string[]
	tone?: ToneKey
	added: boolean
	onToggle: () => void
	onPress: () => void
	addLabel?: string
	addedLabel?: string
	detailsLabel?: string
	/** Top divider (every row but the first). */
	divider?: boolean
	style?: StyleProp<ViewStyle>
}

export function AppCatalogItemRow({
	name,
	priceLabel,
	mrpLabel,
	metaLabel,
	points,
	imageSource,
	iconPath,
	tone = 'mint',
	added,
	onToggle,
	onPress,
	addLabel = 'Add',
	addedLabel = 'Added',
	detailsLabel = 'View details',
	divider = false,
	style,
}: AppCatalogItemRowProps) {
	const pair = TONES[tone]
	const lines = (points ?? []).filter(Boolean).slice(0, 2)
	const priceA11y = `${priceLabel}${mrpLabel ? `, was ${mrpLabel}` : ''}${metaLabel ? `, ${metaLabel}` : ''}`
	const fallbackTile = (
		<View style={[styles.tile, { backgroundColor: pair.bg }]}>
			<View style={[styles.disc1, { backgroundColor: pair.ink }]} />
			<View style={[styles.disc2, { backgroundColor: pair.ink }]} />
			{!!iconPath && <AppPathIcon d={iconPath} size={44} strokeWidth={1.5} color={pair.ink} />}
		</View>
	)

	return (
		<View style={[styles.row, divider && styles.divider, style]}>
			<View style={styles.textCol}>
				<TouchableOpacity
					onPress={onPress}
					activeOpacity={0.7}
					accessibilityRole="button"
					accessibilityLabel={`${name}. ${priceA11y}`}
					accessibilityHint="Opens the service details"
				>
					<Text style={styles.name}>{name}</Text>
				</TouchableOpacity>
				<Text style={styles.price} importantForAccessibility="no">
					<Text style={styles.priceNow}>{priceLabel}</Text>
					{!!mrpLabel && <Text style={styles.priceWas}> {mrpLabel}</Text>}
					{!!metaLabel && <Text style={styles.meta}> · {metaLabel}</Text>}
				</Text>
				{lines.length > 0 && (
					<View style={styles.points}>
						{lines.map((line, i) => (
							<View key={`${i}-${line}`} style={styles.pointRow}>
								<View style={styles.bullet} />
								<Text style={styles.pointText} numberOfLines={2}>
									{line}
								</Text>
							</View>
						))}
					</View>
				)}
				<TouchableOpacity
					onPress={onPress}
					activeOpacity={0.8}
					style={styles.detailsPill}
					accessibilityRole="button"
					accessibilityLabel={`${detailsLabel}, ${name}`}
				>
					<Text style={styles.detailsText}>{detailsLabel}</Text>
					<MaterialCommunityIcons name="chevron-right" size={16} color={APP_COLORS.primary} />
				</TouchableOpacity>
			</View>

			<View style={styles.media}>
				<TouchableOpacity
					onPress={onPress}
					activeOpacity={0.85}
					accessible={false}
					importantForAccessibility="no-hide-descendants"
				>
					{imageSource ? (
						<AppFallbackImage
							source={imageSource}
							style={[styles.tile, { backgroundColor: pair.bg }]}
							fallback={fallbackTile}
						/>
					) : (
						fallbackTile
					)}
				</TouchableOpacity>
				<TouchableOpacity
					onPress={onToggle}
					activeOpacity={0.85}
					style={[styles.addBtn, added && styles.addBtnOn]}
					accessibilityRole="button"
					accessibilityState={{ selected: added }}
					accessibilityLabel={added ? `${name} added. Remove from booking` : `Add ${name} to booking`}
				>
					<MaterialCommunityIcons
						name={added ? 'check' : 'plus'}
						size={16}
						color={added ? APP_COLORS.surface : APP_COLORS.primary}
					/>
					<Text style={[styles.addText, added && styles.addTextOn]}>{added ? addedLabel : addLabel}</Text>
				</TouchableOpacity>
			</View>
		</View>
	)
}

const TILE = 112

const styles = StyleSheet.create({
	row: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		gap: 16,
		paddingVertical: 16,
	},
	divider: {
		borderTopWidth: 1,
		borderTopColor: APP_COLORS.divider,
	},
	textCol: {
		flex: 1,
		minWidth: 0,
		alignItems: 'flex-start',
		gap: 4,
	},
	name: {
		fontSize: 18,
		lineHeight: 24,
		fontWeight: '600',
		color: APP_COLORS.ink,
	},
	price: {
		fontSize: 14,
		lineHeight: 20,
		color: APP_COLORS.ink,
	},
	priceNow: {
		fontWeight: '700',
	},
	priceWas: {
		color: APP_COLORS.inkMuted,
		textDecorationLine: 'line-through',
	},
	meta: {
		color: APP_COLORS.inkMuted,
	},
	points: {
		// textCol uses alignItems: 'flex-start', which stops this view from
		// stretching to the column's width by default -- without that width,
		// pointText's flex: 1 below has nothing to grow against and Yoga
		// collapses it to ~0 width (renders, but invisible/clipped).
		alignSelf: 'stretch',
		gap: 4,
		marginTop: 4,
	},
	pointRow: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		gap: 8,
	},
	bullet: {
		width: 4,
		height: 4,
		borderRadius: 2,
		marginTop: 8,
		backgroundColor: APP_COLORS.inkMuted,
	},
	pointText: {
		flex: 1,
		fontSize: 14,
		lineHeight: 20,
		color: APP_COLORS.inkMuted,
	},
	detailsPill: {
		marginTop: 6,
		height: 32,
		paddingLeft: 12,
		paddingRight: 8,
		borderRadius: 8,
		backgroundColor: APP_COLORS.mint,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 2,
	},
	detailsText: {
		fontSize: 13,
		lineHeight: 18,
		fontWeight: '700',
		color: APP_COLORS.primary,
	},
	media: {
		width: TILE,
		paddingBottom: 16,
		alignItems: 'center',
	},
	tile: {
		width: TILE,
		height: TILE,
		borderRadius: 16,
		overflow: 'hidden',
		alignItems: 'center',
		justifyContent: 'center',
	},
	disc1: {
		position: 'absolute',
		width: TILE * 0.7,
		height: TILE * 0.7,
		borderRadius: TILE * 0.35,
		right: -TILE * 0.18,
		top: -TILE * 0.18,
		opacity: 0.12,
	},
	disc2: {
		position: 'absolute',
		width: TILE * 0.44,
		height: TILE * 0.44,
		borderRadius: TILE * 0.22,
		left: -TILE * 0.12,
		bottom: -TILE * 0.12,
		opacity: 0.18,
	},
	addBtn: {
		position: 'absolute',
		bottom: 0,
		minWidth: 84,
		height: 36,
		paddingHorizontal: 12,
		borderRadius: 8,
		borderWidth: 1,
		borderColor: APP_COLORS.border,
		backgroundColor: APP_COLORS.surface,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 4,
		shadowColor: APP_COLORS.shadow,
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.08,
		shadowRadius: 3,
		elevation: 2,
	},
	addBtnOn: {
		backgroundColor: APP_COLORS.primary,
		borderColor: APP_COLORS.primary,
	},
	addText: {
		fontSize: 15,
		fontWeight: '700',
		color: APP_COLORS.primary,
	},
	addTextOn: {
		color: APP_COLORS.surface,
	},
})

export default AppCatalogItemRow
