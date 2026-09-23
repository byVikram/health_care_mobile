// src/features/radiology/ScanTypeSelectorModal.tsx
import React, { useState, useEffect, useCallback } from 'react'
import {
	Modal,
	View,
	Text,
	TouchableOpacity,
	ScrollView,
	Image,
	StyleSheet,
	Dimensions,
	ImageSourcePropType,
	LayoutChangeEvent,
	Platform,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { AppSkeleton } from '../../../components/common/AppSkeleton'

import allScansIcon from '../../../assets/Radiology/All scans.png'
import mriIcon from '../../../assets/Radiology/mri (2).png'
import ctIcon from '../../../assets/Radiology/ct-scan.png'
import xrayIcon from '../../../assets/Radiology/X-ray.png'
import ultrasoundIcon from '../../../assets/Radiology/ultrasound (1).png'
import { getScanTypes, type MobileScanType } from '../../profile/radiology/radiologyService'

// This is a Modal, not a navigator screen — it must never be opened via
// navigation.navigate('ScanTypeSelectorModal' / 'Scantypeselectormodal').
// Render it inside the screen that owns the filters and toggle a `visible`
// boolean in local state instead. Selection is reported back via onSelect,
// which the parent uses to update its filters state (e.g. RadiologyFilters.scanType).

interface ScanTypeSelectorModalProps {
	visible: boolean
	onClose: () => void
	/** Called with the chosen scan type id/name. Both undefined = "All Scans" (clear filter). */
	onSelect: (scanTypeId?: number, scanTypeName?: string) => void
}

interface ScanVisualConfig {
	groupKey: string
	keywords: string[]
	label: string
	icon: ImageSourcePropType
}

const SCAN_VISUAL_CONFIGS: ScanVisualConfig[] = [
	{ groupKey: 'mri', keywords: ['mri'], label: 'MRI Scan', icon: mriIcon },
	{ groupKey: 'ct', keywords: ['ct'], label: 'CT Scan', icon: ctIcon },
	{ groupKey: 'xray', keywords: ['x-ray', 'xray'], label: 'X-Ray', icon: xrayIcon },
	{ groupKey: 'ultrasound', keywords: ['ultrasound', 'sono'], label: 'Ultrasound', icon: ultrasoundIcon },
]

const DEFAULT_VISUAL: ScanVisualConfig = {
	groupKey: 'other',
	keywords: [],
	label: 'Other Scan',
	icon: mriIcon,
}

function resolveScanVisual(scanName: string): ScanVisualConfig {
	const lower = scanName.toLowerCase()
	return SCAN_VISUAL_CONFIGS.find((cfg) => cfg.keywords.some((kw) => lower.includes(kw))) ?? DEFAULT_VISUAL
}

interface GroupedScanType {
	groupKey: string
	label: string
	icon: ImageSourcePropType
	scanTypes: MobileScanType[]
}

function groupScanTypes(scanTypes: MobileScanType[]): GroupedScanType[] {
	const groups = new Map<string, GroupedScanType>()
	scanTypes.forEach((st) => {
		const visual = resolveScanVisual(st.name)
		const existing = groups.get(visual.groupKey)
		if (existing) {
			existing.scanTypes.push(st)
		} else {
			groups.set(visual.groupKey, {
				groupKey: visual.groupKey,
				label: visual.label,
				icon: visual.icon,
				scanTypes: [st],
			})
		}
	})
	return Array.from(groups.values())
}

const COLORS = {
	primary: '#2B6F71',
	border: '#E2E5E7',
	text: '#1A1A1A',
	error: '#B3261E',
	errorBg: '#FDECEA',
	overlay: 'rgba(0,0,0,0.5)',
	white: '#FFFFFF',
}

const NUM_COLUMNS = 3
const CARD_GAP = 12
const SCREEN_WIDTH = Dimensions.get('window').width
const MODAL_WIDTH = Math.min(SCREEN_WIDTH * 0.92, 480)
const CONTENT_HPADDING = 24

type CardItem = {
	key: string
	icon: ImageSourcePropType
	label: string
	onPress: () => void
}

interface ScanCardProps {
	icon: ImageSourcePropType
	label: string
	size: number
	onPress: () => void
}

function ScanCard({ icon, label, size, onPress }: ScanCardProps) {
	return (
		<TouchableOpacity
			activeOpacity={0.8}
			onPress={onPress}
			style={[styles.card, { width: size, height: size }]}
		>
			<View style={styles.cardIconWrap}>
				<Image source={icon} style={{ width: '72%', height: '72%' }} resizeMode="contain" />
			</View>
			<Text style={styles.cardLabel} numberOfLines={2}>
				{label}
			</Text>
		</TouchableOpacity>
	)
}

export default function ScanTypeSelectorModal({ visible, onClose, onSelect }: ScanTypeSelectorModalProps) {
	const [scanTypes, setScanTypes] = useState<MobileScanType[]>([])
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const [contentWidth, setContentWidth] = useState(MODAL_WIDTH - CONTENT_HPADDING * 2)

	useEffect(() => {
		if (!visible) return
		let active = true
		setLoading(true)
		setError(null)

		const fetchTypes = async () => {
			try {
				const res = await getScanTypes()
				if (!active) return
				if (res.success && res.data) setScanTypes(res.data)
			} catch (err) {
				console.error('Failed to load scan types', err)
				if (!active) return
				setError('Failed to load scan types. Please try again.')
			} finally {
				if (active) setLoading(false)
			}
		}
		void fetchTypes()
		return () => {
			active = false
		}
	}, [visible])

	// "All Scans" clears the filter — no navigation, just report the selection up.
	const handleAllScans = useCallback(() => {
		onSelect(undefined, undefined)
		onClose()
	}, [onSelect, onClose])

	const handleSelect = useCallback(
		(group: GroupedScanType) => {
			const rep = group.scanTypes[0]
			if (!rep) return
			onSelect(rep.id, group.label)
			onClose()
		},
		[onSelect, onClose]
	)

	const onContentLayout = (e: LayoutChangeEvent) => {
		setContentWidth(e.nativeEvent.layout.width)
	}

	const cardSize = contentWidth > 0 ? (contentWidth - CARD_GAP * (NUM_COLUMNS - 1)) / NUM_COLUMNS : 0

	const groupedScanTypes = groupScanTypes(scanTypes)

	const cards: CardItem[] = [
		...groupedScanTypes.map((g) => ({
			key: g.groupKey,
			icon: g.icon,
			label: g.label,
			onPress: () => handleSelect(g),
		})),
		{ key: 'all', icon: allScansIcon, label: 'All Scans', onPress: handleAllScans },
	]

	const rows: CardItem[][] = []
	for (let i = 0; i < cards.length; i += NUM_COLUMNS) {
		rows.push(cards.slice(i, i + NUM_COLUMNS))
	}

	const skeletonRowCounts = [3, 2]

	return (
		<Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
			<View style={styles.overlay}>
				<View style={[styles.modalContainer, { width: MODAL_WIDTH }]}>
					{/* Header */}
					<View style={styles.header}>
						<TouchableOpacity onPress={onClose} style={styles.closeButton}>
							<Ionicons name="close" size={20} color={COLORS.white} />
						</TouchableOpacity>
						<Text style={styles.headerTitle}>What type of scan are you looking for?</Text>
					</View>

					{/* Content */}
					<ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
						<View onLayout={onContentLayout}>
							{loading ? (
								<View style={{ gap: 16 }}>
									{skeletonRowCounts.map((count, rowIndex) => (
										<View
											key={rowIndex}
											style={{
												flexDirection: 'row',
												gap: CARD_GAP,
												justifyContent: count === NUM_COLUMNS ? 'flex-start' : 'center',
											}}
										>
											{Array.from({ length: count }).map((_, index) => (
												<View key={index} style={[styles.card, { width: cardSize, height: cardSize }]}>
													<View style={styles.cardIconWrap}>
														<AppSkeleton width="72%" height="72%" />
													</View>
													<AppSkeleton width="60%" height={20} />
												</View>
											))}
										</View>
									))}
								</View>
							) : error ? (
								<View style={styles.errorBox}>
									<Text style={styles.errorText}>{error}</Text>
								</View>
							) : (
								<View style={{ gap: 16 }}>
									{rows.map((row, rowIdx) => (
										<View
											key={rowIdx}
											style={{
												flexDirection: 'row',
												gap: CARD_GAP,
												justifyContent: row.length === NUM_COLUMNS ? 'flex-start' : 'center',
											}}
										>
											{row.map((card) => (
												<ScanCard
													key={card.key}
													icon={card.icon}
													label={card.label}
													size={cardSize}
													onPress={card.onPress}
												/>
											))}
										</View>
									))}
								</View>
							)}
						</View>
					</ScrollView>
				</View>
			</View>
		</Modal>
	)
}

const styles = StyleSheet.create({
	overlay: {
		flex: 1,
		backgroundColor: COLORS.overlay,
		justifyContent: 'center',
		alignItems: 'center',
		paddingHorizontal: 16,
	},
	modalContainer: {
		backgroundColor: COLORS.white,
		borderRadius: 20,
		overflow: 'hidden',
		maxHeight: '85%',
		...Platform.select({
			ios: {
				shadowColor: '#000',
				shadowOffset: { width: 0, height: 4 },
				shadowOpacity: 0.2,
				shadowRadius: 12,
			},
			android: {
				elevation: 8,
			},
		}),
	},
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: COLORS.primary,
		paddingVertical: 14,
		paddingHorizontal: 16,
		gap: 8,
	},
	closeButton: {
		marginRight: 4,
		padding: 4,
	},
	headerTitle: {
		flex: 1,
		color: COLORS.white,
		fontWeight: '600',
		fontSize: 16,
	},
	content: {
		flexGrow: 0,
	},
	contentContainer: {
		paddingHorizontal: CONTENT_HPADDING,
		paddingTop: 24,
		paddingBottom: 24,
	},
	card: {
		flexDirection: 'column',
		borderRadius: 16,
		borderWidth: 1.5,
		borderColor: COLORS.border,
		paddingTop: 20,
		paddingBottom: 16,
		paddingHorizontal: 8,
		alignItems: 'center',
		justifyContent: 'center',
		gap: 12,
	},
	cardIconWrap: {
		flex: 1,
		width: '100%',
		alignItems: 'center',
		justifyContent: 'center',
	},
	cardLabel: {
		fontWeight: '600',
		fontSize: 13,
		textAlign: 'center',
		lineHeight: 17,
		color: COLORS.text,
	},
	errorBox: {
		backgroundColor: COLORS.errorBg,
		borderRadius: 10,
		padding: 14,
	},
	errorText: {
		color: COLORS.error,
		fontSize: 13,
	},
})