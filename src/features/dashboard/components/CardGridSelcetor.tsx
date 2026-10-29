import React, { useEffect, useMemo, useState } from 'react'
import {
	Image,
	Pressable,
	ScrollView,
	StyleSheet,
	TextInput,
	View,
	useWindowDimensions,
	type ImageSourcePropType,
} from 'react-native'
import { IconButton } from 'react-native-paper'
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'
import { AppModal, AppSkeleton, AppTypography } from '../../../components/common'

export interface SelectorCardItem {
	key: string
	icon: ImageSourcePropType | string
	label: string
	onClick: () => void
}

interface CardGridSelectorModalProps {
	open: boolean
	onClose: () => void
	title: string
	cards: SelectorCardItem[]
	loading?: boolean
	error?: string | null
	loadingPlaceholderRows?: number[]
	emptyText?: string
	searchable?: boolean
	searchPlaceholder?: string
}

const MAX_MODAL_WIDTH = 540
const MODAL_HORIZONTAL_MARGIN = 12

function getGridMetrics(width: number, modalWidth: number) {
	const isTablet = width >= 768
	const columns = width < 360 ? 2 : 3
	const contentPadding = isTablet ? 20 : width < 360 ? 12 : 14
	const columnGap = isTablet ? 14 : 10
	const rowGap = isTablet ? 14 : 12
	const cardWidth = Math.floor((modalWidth - contentPadding * 2 - columnGap * (columns - 1)) / columns)
	const cardHeight = Math.max(isTablet ? 148 : 118, Math.floor(cardWidth * (isTablet ? 0.98 : 1.18)))
	const iconSize = Math.min(isTablet ? 72 : 58, Math.max(isTablet ? 54 : 42, Math.floor(cardWidth * 0.46)))

	return {
		columns,
		contentPadding,
		columnGap,
		rowGap,
		cardWidth,
		cardHeight,
		iconSize,
	}
}

function chunkIntoRows<T>(items: T[], size: number): T[][] {
	const rows: T[][] = []
	for (let index = 0; index < items.length; index += size) {
		rows.push(items.slice(index, index + size))
	}
	return rows
}

function getImageSource(source: ImageSourcePropType | string): ImageSourcePropType {
	return typeof source === 'string' ? { uri: source } : source
}

type SelectorCardProps = Omit<SelectorCardItem, 'key'> & {
	cardWidth: number
	cardHeight: number
	iconSize: number
}

function SelectorCard({ icon, label, onClick, cardWidth, cardHeight, iconSize }: SelectorCardProps) {
	return (
		<Pressable
			accessibilityRole="button"
			accessibilityLabel={label}
			onPress={onClick}
			style={({ pressed }) => [
				styles.card,
				{
					width: cardWidth,
					height: cardHeight,
					opacity: pressed ? 0.84 : 1,
					transform: [{ translateY: pressed ? 1 : 0 }],
				},
			]}
		>
			<View style={styles.iconWrap}>
				<Image
					source={getImageSource(icon)}
					style={{ width: iconSize, height: iconSize }}
					resizeMode="contain"
					accessibilityIgnoresInvertColors
				/>
			</View>
			<AppTypography variant="caption" style={styles.cardLabel} numberOfLines={3}>
				{label}
			</AppTypography>
		</Pressable>
	)
}

type SkeletonCardProps = {
	cardWidth: number
	cardHeight: number
	iconSize: number
}

function SkeletonCard({ cardWidth, cardHeight, iconSize }: SkeletonCardProps) {
	return (
		<View style={[styles.card, { width: cardWidth, height: cardHeight }]}>
			<View style={styles.iconWrap}>
				<AppSkeleton width={iconSize} height={iconSize} borderRadius={12} />
			</View>
			<AppSkeleton width="60%" height={20} borderRadius={6} />
		</View>
	)
}

export default function CardGridSelectorModal({
	open,
	onClose,
	title,
	cards,
	loading = false,
	error = null,
	loadingPlaceholderRows = [3, 2],
	emptyText = 'No options available.',
	searchable = false,
	searchPlaceholder = 'Search services',
}: CardGridSelectorModalProps) {
	const { width, height } = useWindowDimensions()
	const [searchQuery, setSearchQuery] = useState('')
	const isTablet = width >= 768
	const modalWidth = Math.min(width - MODAL_HORIZONTAL_MARGIN * 2, MAX_MODAL_WIDTH)
	const { columns, contentPadding, columnGap, rowGap, cardWidth, cardHeight, iconSize } = useMemo(
		() => getGridMetrics(width, modalWidth),
		[width, modalWidth],
	)
	const filteredCards = useMemo(() => {
		const term = searchQuery.trim().toLowerCase()
		if (!searchable || !term) return cards

		return cards.filter((card) => card.label.toLowerCase().includes(term) || card.key.toLowerCase().includes(term))
	}, [cards, searchable, searchQuery])
	const rows = useMemo(() => chunkIntoRows(filteredCards, columns), [columns, filteredCards])
	const loadingRows = useMemo(
		() => loadingPlaceholderRows.map((count) => Math.min(count, columns)),
		[columns, loadingPlaceholderRows],
	)
	const maxContentHeight = Math.min(height * 0.62, isTablet ? 460 : 400)

	useEffect(() => {
		if (!open) setSearchQuery('')
	}, [open])

	const renderLoading = () => (
		<View style={styles.rows}>
			{loadingRows.map((placeholderCount, rowIndex) => (
				<View
					key={`placeholder-${rowIndex}`}
					style={[
						styles.row,
						{ columnGap, marginBottom: rowIndex === loadingRows.length - 1 ? 0 : rowGap },
						placeholderCount === columns ? styles.rowStart : styles.rowCenter,
					]}
				>
					{Array.from({ length: placeholderCount }).map((_, index) => (
						<SkeletonCard
							key={`placeholder-${rowIndex}-${index}`}
							cardWidth={cardWidth}
							cardHeight={cardHeight}
							iconSize={iconSize}
						/>
					))}
				</View>
			))}
		</View>
	)

	const renderContent = () => {
		if (loading) return renderLoading()

		if (error) {
			return (
				<View style={styles.errorBox} accessibilityRole="alert">
					<AppTypography variant="body" style={styles.errorText}>
						{error}
					</AppTypography>
				</View>
			)
		}

		if (filteredCards.length === 0) {
			return (
				<View style={styles.emptyBox}>
					<AppTypography variant="body" style={styles.emptyText}>
						{searchQuery.trim() ? `No options match "${searchQuery.trim()}".` : emptyText}
					</AppTypography>
				</View>
			)
		}

		return (
			<View style={styles.rows}>
				{rows.map((row, rowIndex) => (
					<View
						key={`row-${rowIndex}`}
						style={[
							styles.row,
							{ columnGap, marginBottom: rowIndex === rows.length - 1 ? 0 : rowGap },
							row.length === columns ? styles.rowStart : styles.rowCenter,
						]}
					>
						{row.map((card) => (
							<SelectorCard
								key={card.key}
								icon={card.icon}
								label={card.label}
								onClick={card.onClick}
								cardWidth={cardWidth}
								cardHeight={cardHeight}
								iconSize={iconSize}
							/>
						))}
					</View>
				))}
			</View>
		)
	}

	return (
		<AppModal
			visible={open}
			onDismiss={onClose}
			dismissable
			contentContainerStyle={[
				styles.modal,
				{
					width: modalWidth,
					maxHeight: height * 0.85,
				},
			]}
		>
			<View style={styles.header}>
				<IconButton
					icon="close"
					iconColor="#fff"
					size={20}
					onPress={onClose}
					style={styles.closeButton}
					accessibilityLabel="Close"
				/>
				<AppTypography variant="h4" style={styles.title} numberOfLines={1}>
					{title}
				</AppTypography>
			</View>

			<ScrollView
				style={{ maxHeight: maxContentHeight }}
				contentContainerStyle={[
					styles.content,
					{
						paddingHorizontal: contentPadding,
						paddingVertical: contentPadding,
					},
				]}
				showsVerticalScrollIndicator={false}
				keyboardShouldPersistTaps="handled"
			>
				{searchable && !loading && !error ? (
					<View style={styles.searchBox}>
						<MaterialCommunityIcons name="magnify" size={18} color="#667085" />
						<TextInput
							value={searchQuery}
							onChangeText={setSearchQuery}
							placeholder={searchPlaceholder}
							placeholderTextColor="#667085"
							style={styles.searchInput}
							returnKeyType="search"
							clearButtonMode="while-editing"
						/>
						{searchQuery.length > 0 ? (
							<Pressable
								accessibilityRole="button"
								accessibilityLabel="Clear search"
								onPress={() => setSearchQuery('')}
								hitSlop={8}
							>
								<MaterialCommunityIcons name="close-circle" size={18} color="#98A2B3" />
							</Pressable>
						) : null}
					</View>
				) : null}
				{renderContent()}
			</ScrollView>
		</AppModal>
	)
}

const styles = StyleSheet.create({
	modal: {
		alignSelf: 'center',
		borderRadius: 20,
		overflow: 'hidden',
		padding: 0,
	},
	header: {
		minHeight: 48,
		backgroundColor: '#2b6f71',
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: 4,
		paddingHorizontal: 8,
	},
	closeButton: {
		margin: 0,
		marginRight: 4,
	},
	title: {
		flex: 1,
		color: '#fff',
		fontSize: 15,
		lineHeight: 20,
		fontWeight: '600',
	},
	content: {
		flexGrow: 1,
	},
	searchBox: {
		height: 38,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 9,
		borderRadius: 10,
		backgroundColor: '#F5F7FB',
		paddingHorizontal: 10,
		marginBottom: 12,
	},
	searchInput: {
		flex: 1,
		height: '100%',
		padding: 0,
		margin: 0,
		color: '#1e2a3a',
		fontSize: 12,
		fontWeight: '500',
	},
	rows: {},
	row: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	rowStart: {
		justifyContent: 'flex-start',
	},
	rowCenter: {
		justifyContent: 'center',
	},
	card: {
		borderRadius: 12,
		borderWidth: 1.5,
		borderColor: '#E0E0E0',
		backgroundColor: '#fff',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingTop: 12,
		paddingBottom: 10,
		paddingHorizontal: 8,
	},
	iconWrap: {
		flex: 1,
		width: '100%',
		alignItems: 'center',
		justifyContent: 'center',
		minHeight: 0,
		marginBottom: 6,
	},
	cardLabel: {
		color: '#1e2a3a',
		fontSize: 11,
		lineHeight: 14,
		fontWeight: '600',
		textAlign: 'center',
		minHeight: 42,
		width: '100%',
		includeFontPadding: false,
		textAlignVertical: 'center',
	},
	errorBox: {
		borderRadius: 10,
		backgroundColor: '#FDECEC',
		borderWidth: 1,
		borderColor: '#F6B8B8',
		paddingVertical: 12,
		paddingHorizontal: 14,
	},
	errorText: {
		color: '#9B1C1C',
		fontSize: 14,
		lineHeight: 20,
	},
	emptyBox: {
		minHeight: 120,
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: 16,
	},
	emptyText: {
		color: '#667085',
		fontSize: 14,
		lineHeight: 20,
		textAlign: 'center',
	},
})
