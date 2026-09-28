// src/features/dashboard/components/AncillaryServicesSheet.tsx
//
// "Healthcare at home" sheet (design 1c): 2-column grid of tone cards (icon tile, title, subtitle) that
// open the patient ancillary booking flow for that service key, plus "Lab tests at home" (laboratory
// list) and a trust footer. Opened from the floating tab bar's middle button, the Ancillary tab and the
// More services sheet via useHomeSheets().open('ancillary'); rendered once by <HomeSheetsHost />.
import React from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useNavigation, type NavigationProp } from '@react-navigation/native'
import { AppBottomSheet, AppIconTile, AppPathIcon, AppTag } from '../../../components/common'
import { APP_COLORS, TONES } from '../../../config/theme'
import { ROUTES } from '../../../navigation/routes'
import type { AppStackParamList } from '../../../navigation/types'
import { HOME_CHROME_PATHS, type HomeChromeIcon } from '../homeChromeIcons'
import { formatBalance, useAncillaryStartingPrices } from '../useHomeChromeData'

export interface AncillaryServicesSheetProps {
	visible: boolean
	onClose: () => void
}

type HomeCareTarget = { kind: 'ancillary'; serviceKey: string; serviceLabel: string } | { kind: 'laboratory' }

interface HomeCareCard {
	key: string
	title: string
	subtitle: string
	icon: HomeChromeIcon
	colors: { bg: string; ink: string }
	target: HomeCareTarget
	/** Show the "From ₹x" tag when the categories API returns a starting price for this key. */
	showPrice?: boolean
}

// Service keys match the ancillary booking flow (AncillaryServicesPage / fetchAncillaryServices).
const CARDS: HomeCareCard[] = [
	{
		key: 'nursing-care',
		title: 'Nursing care',
		subtitle: 'Injections, dressing, IV',
		icon: 'nursing',
		colors: TONES.mint,
		target: { kind: 'ancillary', serviceKey: 'nursing-care', serviceLabel: 'Nursing Care' },
		showPrice: true,
	},
	{
		key: 'home-care',
		title: 'Home care',
		subtitle: 'Elder & patient attendants',
		icon: 'homeCare',
		colors: TONES.peach,
		target: { kind: 'ancillary', serviceKey: 'home-care', serviceLabel: 'Home Care' },
	},
	{
		key: 'physiotherapy',
		title: 'Physiotherapy',
		subtitle: 'Pain relief & mobility',
		icon: 'physio',
		colors: TONES.sky,
		target: { kind: 'ancillary', serviceKey: 'physiotherapy', serviceLabel: 'Physiotherapy' },
	},
	{
		key: 'rehab-care',
		title: 'Rehab care',
		subtitle: 'After surgery or stroke',
		icon: 'rehab',
		colors: TONES.lilac,
		target: { kind: 'ancillary', serviceKey: 'rehab-care', serviceLabel: 'Rehab Care' },
	},
	{
		key: 'medical-equipment',
		title: 'Medical equipment',
		subtitle: 'Rent or buy at home',
		icon: 'equipment',
		colors: TONES.sand,
		target: { kind: 'ancillary', serviceKey: 'medical-equipment', serviceLabel: 'Medical Equipment' },
	},
	{
		key: 'lab-at-home',
		title: 'Lab tests at home',
		subtitle: 'Free sample pickup',
		icon: 'lab',
		colors: { bg: APP_COLORS.successBg, ink: APP_COLORS.success },
		target: { kind: 'laboratory' },
	},
]

const priceFor = (prices: Record<string, number>, card: HomeCareCard) => {
	if (card.target.kind !== 'ancillary') return undefined
	const { serviceKey, serviceLabel } = card.target
	return prices[serviceKey] ?? prices[serviceLabel.toLowerCase()] ?? prices[card.title.toLowerCase()]
}

export default function AncillaryServicesSheet({ visible, onClose }: AncillaryServicesSheetProps) {
	const navigation = useNavigation<NavigationProp<AppStackParamList>>()
	const prices = useAncillaryStartingPrices(visible)

	const handlePress = (card: HomeCareCard) => {
		onClose()
		if (card.target.kind === 'laboratory') {
			navigation.navigate(ROUTES.STACK.LABORATORY_LIST)
			return
		}
		navigation.navigate(ROUTES.STACK.ANCILLARY_SERVICES, {
			serviceKey: card.target.serviceKey,
			serviceLabel: card.target.serviceLabel,
		})
	}

	const rows: HomeCareCard[][] = []
	for (let i = 0; i < CARDS.length; i += 2) rows.push(CARDS.slice(i, i + 2))

	return (
		<AppBottomSheet
			visible={visible}
			onClose={onClose}
			title="Healthcare at home"
			subtitle="Verified professionals visit you at home"
			appearance="modern"
			showHeaderDivider={false}
			maxHeightRatio={0.88}
		>
			<View style={styles.body}>
				<View style={styles.grid}>
					{rows.map((row) => (
						<View key={row.map((c) => c.key).join('|')} style={styles.row}>
							{row.map((card) => {
								const price = card.showPrice ? priceFor(prices, card) : undefined
								const priceLabel = price ? `From ${formatBalance(price)}` : undefined
								return (
									<TouchableOpacity
										key={card.key}
										style={[styles.card, { backgroundColor: card.colors.bg }]}
										onPress={() => handlePress(card)}
										activeOpacity={0.8}
										accessibilityRole="button"
										accessibilityLabel={[card.title, card.subtitle, priceLabel]
											.filter(Boolean)
											.join(', ')}
									>
										{!!priceLabel && (
											<AppTag
												label={priceLabel}
												tone="ink"
												size="xs"
												uppercase={false}
												style={styles.priceTag}
											/>
										)}
										<AppIconTile size={44} radius={12} backgroundColor={APP_COLORS.surface}>
											<AppPathIcon
												d={HOME_CHROME_PATHS[card.icon]}
												size={22}
												color={card.colors.ink}
												strokeWidth={2}
											/>
										</AppIconTile>
										<View>
											<Text style={styles.title} numberOfLines={1}>
												{card.title}
											</Text>
											<Text style={styles.subtitle} numberOfLines={2}>
												{card.subtitle}
											</Text>
										</View>
									</TouchableOpacity>
								)
							})}
							{row.length < 2 && <View style={styles.cardSpacer} />}
						</View>
					))}
				</View>

				<View style={styles.trust}>
					<AppPathIcon d={HOME_CHROME_PATHS.shield} size={18} color={APP_COLORS.primary} strokeWidth={2} />
					<Text style={styles.trustText}>Background-verified staff · Pay after the visit</Text>
				</View>
			</View>
		</AppBottomSheet>
	)
}

const styles = StyleSheet.create({
	body: {
		gap: 12,
		paddingTop: 4,
	},
	grid: {
		gap: 10,
	},
	row: {
		flexDirection: 'row',
		gap: 10,
	},
	card: {
		flex: 1,
		minWidth: 0,
		gap: 8,
		padding: 14,
		borderRadius: 12,
	},
	cardSpacer: {
		flex: 1,
	},
	priceTag: {
		position: 'absolute',
		top: 10,
		right: 10,
		zIndex: 1,
	},
	title: {
		fontSize: 15,
		lineHeight: 20,
		fontWeight: '800',
		color: APP_COLORS.ink,
	},
	subtitle: {
		fontSize: 12,
		lineHeight: 16,
		color: APP_COLORS.inkMuted,
	},
	trust: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		paddingVertical: 10,
		paddingHorizontal: 12,
		borderRadius: 12,
		backgroundColor: APP_COLORS.pageBg,
	},
	trustText: {
		flex: 1,
		fontSize: 13,
		lineHeight: 18,
		color: APP_COLORS.ink,
	},
})
