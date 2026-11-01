// src/components/common/booking/AppCatalogBlocks.tsx
//
// Building blocks of a service catalogue screen in the KarolaHealth designs (home-care "Nursing care at home",
// "Lab tests at home"): the collapsing ink header with greeting, search and cart button, the white list section
// with its title / count / subtitle, the "why book with us" trust strip, an empty state and the tinted
// "Shop by concern" tile grid. Pure UI -- the screen owns the data, the cart and the scroll handling.

import React from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { APP_COLORS } from '../../../config/theme'
import AppScreenHeader from '../layout/AppScreenHeader'
import { AppPathIcon } from '../display/AppIcon'
import AppSearchBar from '../inputs/AppSearchBar'
import { AppTextLink } from '../buttons/AppTextLink'

// ---------------------------------------------------------------------------------------------------------
// Header
// ---------------------------------------------------------------------------------------------------------

export type AppCatalogHeaderProps = {
	/** Big title when expanded, small title when the list is scrolled (`compact`). */
	title: string
	/** Small caps line above the title, e.g. "HI VIKRAM". */
	eyebrow?: string
	subtitle?: string
	compact: boolean
	showBack?: boolean
	onBack?: () => void
	cartCount: number
	onCartPress: () => void
	/** Greys the cart button out (e.g. nothing to book yet). */
	cartDisabled?: boolean
	cartLabel: string
	search: {
		value: string
		onChange: (v: string) => void
		placeholder: string
		/** Example terms that rotate as `Search “term”` while empty; without them `placeholder` is shown as-is. */
		hints?: readonly string[]
		accessibilityLabel?: string
	}
}

export function AppCatalogHeader({
	title,
	eyebrow,
	subtitle,
	compact,
	showBack = true,
	onBack,
	cartCount,
	onCartPress,
	cartDisabled = false,
	cartLabel,
	search,
}: AppCatalogHeaderProps) {
	return (
		<AppScreenHeader
			variant="bar"
			backgroundColor={APP_COLORS.ink}
			showBack={showBack}
			onBack={onBack}
			backAccessibilityLabel="Back"
			style={compact ? styles.headerCompact : undefined}
			titleNode={
				<Text
					style={[styles.miniTitle, { opacity: compact ? 1 : 0 }]}
					numberOfLines={1}
					accessibilityElementsHidden={!compact}
					importantForAccessibility={compact ? 'auto' : 'no-hide-descendants'}
				>
					{title}
				</Text>
			}
			rightElement={
				<TouchableOpacity
					style={styles.cartBtn}
					onPress={onCartPress}
					disabled={cartDisabled}
					activeOpacity={0.75}
					accessibilityRole="button"
					accessibilityLabel={cartLabel}
				>
					<MaterialCommunityIcons name="cart-outline" size={24} color={APP_COLORS.surface} />
					{cartCount > 0 && (
						<View style={styles.cartBadge}>
							<Text style={styles.cartBadgeText}>{cartCount}</Text>
						</View>
					)}
				</TouchableOpacity>
			}
		>
			{!compact && (
				<View style={styles.intro}>
					{!!eyebrow && <Text style={styles.eyebrow}>{eyebrow}</Text>}
					<Text style={styles.h1} accessibilityRole="header">
						{title}
					</Text>
					{!!subtitle && <Text style={styles.introSub}>{subtitle}</Text>}
				</View>
			)}
			<AppSearchBar
				placeholder={search.placeholder}
				hints={search.hints}
				tone="onDark"
				value={search.value}
				onChangeText={search.onChange}
				style={styles.search}
			/>
		</AppScreenHeader>
	)
}

// ---------------------------------------------------------------------------------------------------------
// List section / trust strip / empty state
// ---------------------------------------------------------------------------------------------------------

/** White, full-bleed section with a 22/28 title, a muted count on the right and a 14/20 subtitle. */
export function AppCatalogSection({
	title,
	count,
	subtitle,
	children,
}: {
	title: string
	count?: string
	subtitle?: string
	children: React.ReactNode
}) {
	return (
		<View style={styles.listSection}>
			<View style={styles.listHeader}>
				<View style={styles.listTitleRow}>
					<Text style={styles.listTitle} accessibilityRole="header">
						{title}
					</Text>
					{!!count && <Text style={styles.listCount}>{count}</Text>}
				</View>
				{!!subtitle && <Text style={styles.listSub}>{subtitle}</Text>}
			</View>
			{children}
		</View>
	)
}

export type AppTrustChip = { key: string; label: string; icon: string | string[] }

export function AppTrustStrip({ chips, label = 'Why book with us' }: { chips: AppTrustChip[]; label?: string }) {
	return (
		<View style={styles.trust} accessibilityLabel={label}>
			{chips.map((c) => (
				<View key={c.key} style={styles.trustItem} accessible accessibilityLabel={c.label}>
					<View style={styles.trustIcon}>
						<AppPathIcon d={c.icon} size={20} strokeWidth={2} color={APP_COLORS.primary} />
					</View>
					<Text style={styles.trustText}>{c.label}</Text>
				</View>
			))}
		</View>
	)
}

export function AppCatalogEmpty({
	title,
	subtitle,
	actionLabel,
	onAction,
}: {
	title: string
	subtitle: string
	actionLabel?: string
	onAction?: () => void
}) {
	return (
		<View style={styles.empty}>
			<Text style={styles.emptyTitle}>{title}</Text>
			<Text style={styles.emptySub}>{subtitle}</Text>
			{!!actionLabel && !!onAction && (
				<TouchableOpacity
					style={styles.emptyBtn}
					onPress={onAction}
					activeOpacity={0.8}
					accessibilityRole="button"
				>
					<Text style={styles.emptyBtnText}>{actionLabel}</Text>
				</TouchableOpacity>
			)}
		</View>
	)
}

// ---------------------------------------------------------------------------------------------------------
// "Shop by concern" tiles
// ---------------------------------------------------------------------------------------------------------

export type AppConcernTileData = {
	id: string
	label: string
	/** Stroke path(s) on a 24x24 grid. */
	iconPath: string | string[]
	/** Soft background / ink pair of the concern. */
	bg: string
	ink: string
}

function ConcernTile({ tile, active, onPress }: { tile: AppConcernTileData; active: boolean; onPress: () => void }) {
	return (
		<TouchableOpacity
			onPress={onPress}
			activeOpacity={0.8}
			style={[
				styles.tile,
				{
					borderColor: active ? tile.ink : APP_COLORS.divider,
					backgroundColor: active ? tile.bg : APP_COLORS.surface,
				},
			]}
			accessibilityRole="button"
			accessibilityState={{ selected: active }}
			accessibilityLabel={tile.label}
		>
			<View style={[styles.tileIcon, { backgroundColor: active ? tile.ink : tile.bg }]}>
				<AppPathIcon
					d={tile.iconPath}
					size={18}
					strokeWidth={2}
					color={active ? APP_COLORS.surface : tile.ink}
				/>
			</View>
			<Text style={styles.tileLabel} numberOfLines={1}>
				{tile.label}
			</Text>
		</TouchableOpacity>
	)
}

/** Tiles laid out `perRow` to a row; an optional trailing cell (the "+N more" button) goes last. */
export function AppConcernRows({
	tiles,
	activeId,
	onPick,
	perRow,
	trailing,
}: {
	tiles: AppConcernTileData[]
	activeId: string | null
	onPick: (id: string) => void
	perRow: number
	trailing?: React.ReactNode
}) {
	const cells: React.ReactNode[] = tiles.map((t) => (
		<ConcernTile key={t.id} tile={t} active={t.id === activeId} onPress={() => onPick(t.id)} />
	))
	if (trailing) cells.push(<React.Fragment key="more">{trailing}</React.Fragment>)
	const rows: React.ReactNode[][] = []
	for (let i = 0; i < cells.length; i += perRow) rows.push(cells.slice(i, i + perRow))
	return (
		<View style={styles.tileRows}>
			{rows.map((row, r) => (
				<View key={r} style={styles.tileRow}>
					{row.map((cell, c) => (
						<View key={c} style={styles.tileCell}>
							{cell}
						</View>
					))}
					{Array.from({ length: perRow - row.length }).map((_, k) => (
						<View key={`pad-${k}`} style={styles.tileCell} />
					))}
				</View>
			))}
		</View>
	)
}

/** "Shop by concern": a heading with Clear, one row of tiles and a dashed "+N more" tile that opens the full list. */
export function AppConcernGrid({
	title,
	tiles,
	activeId,
	onPick,
	onClear,
	onMore,
	mainCount = 4,
	moreIconPath,
}: {
	title: string
	tiles: AppConcernTileData[]
	activeId: string | null
	onPick: (id: string) => void
	onClear: () => void
	onMore: () => void
	/** Tiles shown before the "+N more" tile. */
	mainCount?: number
	moreIconPath: string | string[]
}) {
	const overflow = tiles.length > mainCount
	// Keep the selected tile visible: move it into the last shown slot when it sits in the overflow.
	const ordered = [...tiles]
	const idx = ordered.findIndex((t) => t.id === activeId)
	if (idx >= mainCount) {
		const [picked] = ordered.splice(idx, 1)
		ordered.splice(mainCount - 1, 0, picked)
	}
	const hidden = tiles.length - mainCount

	return (
		<View style={styles.concern}>
			<View style={styles.concernHead}>
				<Text style={styles.concernTitle} accessibilityRole="header">
					{title}
				</Text>
				{!!activeId && <AppTextLink label="Clear" size="sm" trailingIcon="none" onPress={onClear} />}
			</View>
			<AppConcernRows
				tiles={ordered.slice(0, mainCount)}
				activeId={activeId}
				onPick={onPick}
				perRow={mainCount + 1}
				trailing={
					overflow ? (
						<TouchableOpacity
							onPress={onMore}
							activeOpacity={0.8}
							style={[styles.tile, styles.moreTile]}
							accessibilityRole="button"
							accessibilityLabel={`View all ${tiles.length} concerns`}
						>
							<View style={[styles.tileIcon, { backgroundColor: APP_COLORS.ink }]}>
								<AppPathIcon d={moreIconPath} size={16} strokeWidth={2} color={APP_COLORS.surface} />
							</View>
							<Text style={styles.tileLabel} numberOfLines={1}>
								{`+${hidden} more`}
							</Text>
						</TouchableOpacity>
					) : undefined
				}
			/>
		</View>
	)
}

const styles = StyleSheet.create({
	headerCompact: {
		shadowColor: APP_COLORS.shadow,
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.16,
		shadowRadius: 8,
		elevation: 4,
	},
	miniTitle: { fontSize: 18, lineHeight: 26, fontWeight: '700', color: APP_COLORS.surface },
	cartBtn: { width: 44, height: 44, marginRight: -10, alignItems: 'center', justifyContent: 'center' },
	cartBadge: {
		position: 'absolute',
		top: 4,
		right: 4,
		minWidth: 18,
		height: 18,
		paddingHorizontal: 4,
		borderRadius: 9,
		backgroundColor: APP_COLORS.surface,
		alignItems: 'center',
		justifyContent: 'center',
	},
	cartBadgeText: { fontSize: 12, lineHeight: 18, fontWeight: '600', color: APP_COLORS.ink },
	intro: { gap: 4, marginBottom: 12 },
	eyebrow: { fontSize: 12, lineHeight: 16, fontWeight: '700', letterSpacing: 0.72, color: APP_COLORS.mintAccent },
	h1: { fontSize: 26, lineHeight: 32, fontWeight: '700', color: APP_COLORS.surface },
	introSub: { fontSize: 14, lineHeight: 20, color: APP_COLORS.mint },
	search: { marginBottom: 8 },

	listSection: {
		backgroundColor: APP_COLORS.surface,
		borderTopWidth: 1,
		borderBottomWidth: 1,
		borderColor: APP_COLORS.divider,
		paddingTop: 20,
		paddingHorizontal: 16,
	},
	listHeader: { gap: 4 },
	listTitleRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 },
	listTitle: { flex: 1, fontSize: 22, lineHeight: 28, fontWeight: '700', color: APP_COLORS.ink },
	listCount: { fontSize: 12, lineHeight: 16, fontWeight: '500', color: APP_COLORS.inkMuted },
	listSub: { fontSize: 14, lineHeight: 20, color: APP_COLORS.inkMuted },

	trust: {
		marginHorizontal: 16,
		paddingVertical: 16,
		paddingHorizontal: 12,
		borderRadius: 8,
		borderWidth: 1,
		borderColor: APP_COLORS.divider,
		backgroundColor: APP_COLORS.surface,
		flexDirection: 'row',
		gap: 8,
	},
	trustItem: { flex: 1, minWidth: 0, alignItems: 'center', gap: 8 },
	trustIcon: {
		width: 40,
		height: 40,
		borderRadius: 20,
		backgroundColor: APP_COLORS.mint,
		alignItems: 'center',
		justifyContent: 'center',
	},
	trustText: { fontSize: 12, lineHeight: 16, fontWeight: '600', color: APP_COLORS.ink, textAlign: 'center' },

	empty: {
		marginHorizontal: 16,
		paddingVertical: 32,
		paddingHorizontal: 16,
		borderRadius: 8,
		borderWidth: 1,
		borderColor: APP_COLORS.divider,
		backgroundColor: APP_COLORS.surface,
		alignItems: 'center',
		gap: 8,
	},
	emptyTitle: { fontSize: 18, lineHeight: 26, fontWeight: '700', color: APP_COLORS.ink, textAlign: 'center' },
	emptySub: { fontSize: 14, lineHeight: 20, color: APP_COLORS.inkMuted, textAlign: 'center' },
	emptyBtn: {
		marginTop: 8,
		height: 44,
		paddingHorizontal: 16,
		borderRadius: 8,
		borderWidth: 1,
		borderColor: APP_COLORS.primary,
		backgroundColor: APP_COLORS.surface,
		alignItems: 'center',
		justifyContent: 'center',
	},
	emptyBtnText: { fontSize: 14, fontWeight: '600', color: APP_COLORS.primary },

	concern: { gap: 8 },
	concernHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
	concernTitle: { fontSize: 15, lineHeight: 22, fontWeight: '700', color: APP_COLORS.ink },
	tileRows: { gap: 6 },
	tileRow: { flexDirection: 'row', gap: 6 },
	tileCell: { flex: 1, minWidth: 0 },
	tile: {
		alignItems: 'center',
		gap: 4,
		paddingTop: 8,
		paddingBottom: 6,
		paddingHorizontal: 2,
		borderRadius: 12,
		borderWidth: 2,
		minHeight: 76,
	},
	moreTile: { borderStyle: 'dashed', borderColor: APP_COLORS.border, backgroundColor: APP_COLORS.pageBg },
	tileIcon: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
	tileLabel: { fontSize: 12, lineHeight: 16, fontWeight: '700', color: APP_COLORS.ink, textAlign: 'center' },
})
