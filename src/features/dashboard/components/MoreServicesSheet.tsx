// src/features/dashboard/components/MoreServicesSheet.tsx
//
// "More services" sheet (design 1b): red Emergency · SOS row (dials the configured emergency number) and a
// 3-column grid of service tiles. Opened with useHomeSheets().open('more'); rendered once by <HomeSheetsHost />.
// Numbers come from GET /api/lookup/app-config; when that is unreachable SOS / Ambulance fall back to India's
// national 112 / 108, and Blood bank (which calls Karolahealth support) is hidden.
import React, { useEffect, useRef, useState } from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useNavigation, type NavigationProp } from '@react-navigation/native'
import { AppBottomSheet, AppIconTile, AppPathIcon } from '../../../components/common'
import { APP_COLORS, TONES } from '../../../config/theme'
import { ROUTES } from '../../../navigation/routes'
import type { AppStackParamList } from '../../../navigation/types'
import { HOME_CHROME_PATHS, type HomeChromeIcon } from '../homeChromeIcons'
import {
	FALLBACK_AMBULANCE_NUMBER,
	FALLBACK_EMERGENCY_NUMBER,
	openContactUrl,
	telUrl,
	useAppConfig,
} from '../useHomeChromeData'
import AlliedSelectorModal from './AlliedSelectorModal'
import TherapeuticSelector from './TherapeuticSelector'

export interface MoreServicesSheetProps {
	visible: boolean
	onClose: () => void
}

interface ServiceTile {
	key: string
	title: string
	subtitle: string
	icon: HomeChromeIcon
	colors: { bg: string; ink: string }
	onPress: () => void
}

// Let the sheet finish sliding out before another modal is presented (iOS presents one at a time).
const HANDOFF_MS = 260

const COLUMNS = 3
const TILE_GAP = 8

export default function MoreServicesSheet({ visible, onClose }: MoreServicesSheetProps) {
	const navigation = useNavigation<NavigationProp<AppStackParamList>>()
	const config = useAppConfig(visible)
	const [alliedOpen, setAlliedOpen] = useState(false)
	const [therapeuticOpen, setTherapeuticOpen] = useState(false)
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

	useEffect(
		() => () => {
			if (timerRef.current) clearTimeout(timerRef.current)
		},
		[]
	)

	const closeThen = (next: () => void) => {
		onClose()
		if (timerRef.current) clearTimeout(timerRef.current)
		timerRef.current = setTimeout(next, HANDOFF_MS)
	}

	const emergencyNumber = config?.emergency_number || FALLBACK_EMERGENCY_NUMBER
	const ambulanceNumber = config?.ambulance_number || FALLBACK_AMBULANCE_NUMBER
	const supportNumber = config?.support_phone || ''

	const dial = (number: string) => {
		void openContactUrl(telUrl(number))
	}

	const tiles: ServiceTile[] = [
		{
			key: 'ambulance',
			title: 'Ambulance',
			subtitle: 'Book or track',
			icon: 'ambulance',
			colors: TONES.peach,
			onPress: () => dial(ambulanceNumber),
		},
		// No blood-bank flow exists in the app yet: the tile calls Karolahealth support, and hides without a number.
		...(supportNumber
			? [
					{
						key: 'blood-bank',
						title: 'Blood bank',
						subtitle: 'Find donors & units',
						icon: 'bloodBank' as const,
						colors: { bg: APP_COLORS.dangerBg, ink: APP_COLORS.danger },
						onPress: () => dial(supportNumber),
					},
				]
			: []),
		// "ICU Care at Home" is a nursing-care service in the ancillary catalogue.
		{
			key: 'icu',
			title: 'ICU care',
			subtitle: 'Beds & ICU at home',
			icon: 'icu',
			colors: { bg: APP_COLORS.successBg, ink: APP_COLORS.success },
			onPress: () => {
				onClose()
				navigation.navigate(ROUTES.STACK.ANCILLARY_SERVICES, {
					serviceKey: 'nursing-care',
					serviceLabel: 'Nursing Care',
				})
			},
		},
		{
			key: 'allied',
			title: 'Allied health',
			subtitle: 'Ayurveda, homoeopathy',
			icon: 'allied',
			colors: TONES.sand,
			onPress: () => closeThen(() => setAlliedOpen(true)),
		},
		{
			key: 'therapeutic',
			title: 'Therapeutic',
			subtitle: 'Yoga, counselling',
			icon: 'therapeutic',
			colors: TONES.lilac,
			onPress: () => closeThen(() => setTherapeuticOpen(true)),
		},
	]

	const rows: ServiceTile[][] = []
	for (let i = 0; i < tiles.length; i += COLUMNS) rows.push(tiles.slice(i, i + COLUMNS))

	return (
		<>
			<AppBottomSheet
				visible={visible}
				onClose={onClose}
				title="More services"
				subtitle="Everything else Karolahealth offers"
				appearance="modern"
				showHeaderDivider={false}
				maxHeightRatio={0.88}
			>
				<View style={styles.body}>
					<TouchableOpacity
						style={styles.sos}
						onPress={() => dial(emergencyNumber)}
						activeOpacity={0.85}
						accessibilityRole="button"
						accessibilityLabel={`Emergency SOS. Call ${emergencyNumber}`}
						accessibilityHint="Calls an ambulance or emergency care now"
					>
						<AppIconTile size={48} radius={14} backgroundColor={APP_COLORS.danger}>
							<AppPathIcon
								d={HOME_CHROME_PATHS.phone}
								size={24}
								color={APP_COLORS.surface}
								strokeWidth={2}
							/>
						</AppIconTile>
						<View style={styles.sosText}>
							<Text style={styles.sosTitle}>Emergency · SOS</Text>
							<Text style={styles.sosSubtitle}>Call an ambulance or emergency care now</Text>
						</View>
						<View style={styles.callChip}>
							<Text style={styles.callChipText}>Call</Text>
						</View>
					</TouchableOpacity>

					<View style={styles.grid}>
						{rows.map((row) => (
							<View key={row.map((t) => t.key).join('|')} style={styles.row}>
								{row.map((tile) => (
									<TouchableOpacity
										key={tile.key}
										style={styles.tile}
										onPress={tile.onPress}
										activeOpacity={0.8}
										accessibilityRole="button"
										accessibilityLabel={`${tile.title}, ${tile.subtitle}`}
									>
										<AppIconTile size={48} radius={14} backgroundColor={tile.colors.bg}>
											<AppPathIcon
												d={HOME_CHROME_PATHS[tile.icon]}
												size={24}
												color={tile.colors.ink}
												strokeWidth={2}
											/>
										</AppIconTile>
										<Text style={styles.tileTitle} numberOfLines={1}>
											{tile.title}
										</Text>
										<Text style={styles.tileSubtitle} numberOfLines={2}>
											{tile.subtitle}
										</Text>
									</TouchableOpacity>
								))}
							</View>
						))}
					</View>
				</View>
			</AppBottomSheet>

			<AlliedSelectorModal open={alliedOpen} onClose={() => setAlliedOpen(false)} />
			<TherapeuticSelector open={therapeuticOpen} onClose={() => setTherapeuticOpen(false)} />
		</>
	)
}

const styles = StyleSheet.create({
	body: {
		gap: 14,
		paddingTop: 4,
	},
	sos: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		padding: 12,
		borderRadius: 12,
		backgroundColor: APP_COLORS.dangerBg,
	},
	sosText: {
		flex: 1,
		minWidth: 0,
	},
	sosTitle: {
		fontSize: 16,
		lineHeight: 22,
		fontWeight: '800',
		color: APP_COLORS.danger,
	},
	sosSubtitle: {
		fontSize: 13,
		lineHeight: 18,
		color: APP_COLORS.inkMuted,
	},
	callChip: {
		height: 40,
		paddingHorizontal: 14,
		borderRadius: 10,
		backgroundColor: APP_COLORS.danger,
		alignItems: 'center',
		justifyContent: 'center',
	},
	callChipText: {
		fontSize: 14,
		fontWeight: '700',
		color: APP_COLORS.surface,
	},
	// The tiles' own margins make the gaps (see `row`), so the grid takes back the outer half vertically.
	grid: {
		marginVertical: -TILE_GAP / 2,
	},
	// Tiles are a third of the row each and carry half the gap as a margin; the row's negative margin takes the outer half
	// back, so every tile is the same size and a short last row is simply centred.
	row: {
		flexDirection: 'row',
		justifyContent: 'center',
		marginHorizontal: -TILE_GAP / 2,
	},
	tile: {
		width: `${100 / COLUMNS}%`,
		margin: TILE_GAP / 2,
		minWidth: 0,
		alignItems: 'center',
		gap: 6,
		paddingVertical: 12,
		paddingHorizontal: 6,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: APP_COLORS.divider,
		backgroundColor: APP_COLORS.surface,
	},
	tileTitle: {
		fontSize: 14,
		lineHeight: 18,
		fontWeight: '700',
		color: APP_COLORS.ink,
		textAlign: 'center',
	},
	tileSubtitle: {
		fontSize: 11,
		lineHeight: 14,
		color: APP_COLORS.inkMuted,
		textAlign: 'center',
	},
})
