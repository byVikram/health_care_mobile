// src/components/common/booking/AppVisitList.tsx
//
// Numbered visit rows from the home-nursing pages:
//   variant 'plan' (default) — Review & pay "3 visits · Injection administration": 36px number tile, radius 10,
//       APP_COLORS.mint / primary 13/800 number.
//   variant 'status' — visit detail "Your visits": 32px tile on APP_COLORS.pageBg / ink number, trailing AppTag
//       status per row ("Today" / "Confirmed").
//   `current` row (either variant) = APP_COLORS.primary tile with a white number.
// Row: padding 10 0, gap 12, APP_COLORS.divider bottom border (none on the last row), title 14/20 800 ink,
// sub 12/16 muted. Optional header (title 16/22 800 + "Edit" AppTextLink) and a 12/16 muted footer note
// ("Each visit gets its own start and completion code.").

import React from 'react'
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native'
import { APP_COLORS } from '../../../config/theme'
import { AppIconTile } from '../display/AppIconTile'
import { AppTag, type AppTagProps } from '../display/AppTag'
import { AppTextLink } from '../buttons/AppTextLink'

export type AppVisitListItem = {
	/** Stable key; defaults to the index. */
	key?: string | number
	/** Number shown in the tile. Defaults to position + 1. */
	index?: number
	/** Date / time line, e.g. "Today, Thu 25 Sep". */
	title: string
	/** e.g. "7:00 PM · 30–45 mins" or "7:00 PM · Sunita Joseph". */
	sub?: string
	status?: AppTagProps
	/** Highlights the number tile (the visit happening today / next). */
	current?: boolean
}

export type AppVisitListProps = {
	visits: AppVisitListItem[]
	variant?: 'plan' | 'status'
	/** Optional header title, e.g. "3 visits · Injection administration". */
	title?: string
	/** Shows an "Edit" link in the header (rendered even without a title). */
	onEdit?: () => void
	/** Defaults to "Edit". */
	editLabel?: string
	footerNote?: string
	style?: StyleProp<ViewStyle>
}

export function AppVisitList({
	visits,
	variant = 'plan',
	title,
	onEdit,
	editLabel = 'Edit',
	footerNote,
	style,
}: AppVisitListProps) {
	const plan = variant === 'plan'
	const tileSize = plan ? 36 : 32

	return (
		<View style={[styles.wrap, style]}>
			{(!!title || !!onEdit) && (
				<View style={styles.header}>
					<Text style={styles.headerTitle} accessibilityRole="header" numberOfLines={2}>
						{title ?? ''}
					</Text>
					{!!onEdit && (
						<AppTextLink
							label={editLabel}
							onPress={onEdit}
							size="sm"
							trailingIcon="none"
							accessibilityLabel={title ? `${editLabel} ${title}` : `${editLabel} visits`}
						/>
					)}
				</View>
			)}

			<View accessibilityRole="list">
				{visits.map((v, i) => {
					const n = v.index ?? i + 1
					const last = i === visits.length - 1
					const bg = v.current ? APP_COLORS.primary : plan ? APP_COLORS.mint : APP_COLORS.pageBg
					const fg = v.current ? APP_COLORS.surface : plan ? APP_COLORS.primary : APP_COLORS.ink
					return (
						<View
							key={v.key ?? i}
							style={[styles.row, !last && styles.rowDivider]}
							accessible
							accessibilityLabel={[`Visit ${n}`, v.title, v.sub, v.status?.label]
								.filter(Boolean)
								.join(', ')}
						>
							<AppIconTile size={tileSize} radius={10} backgroundColor={bg}>
								<Text style={[styles.num, { color: fg }]}>{n}</Text>
							</AppIconTile>
							<View style={styles.text}>
								<Text style={styles.title} numberOfLines={1}>
									{v.title}
								</Text>
								{!!v.sub && (
									<Text style={styles.sub} numberOfLines={1}>
										{v.sub}
									</Text>
								)}
							</View>
							{!!v.status && (
								<AppTag
									{...v.status}
									textStyle={[styles.statusText, v.status.textStyle]}
									style={[styles.status, v.status.style]}
								/>
							)}
						</View>
					)
				})}
			</View>

			{!!footerNote && <Text style={styles.note}>{footerNote}</Text>}
		</View>
	)
}

const styles = StyleSheet.create({
	wrap: {
		gap: 10,
	},
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		gap: 8,
	},
	headerTitle: {
		flex: 1,
		fontSize: 16,
		lineHeight: 22,
		fontWeight: '800',
		color: APP_COLORS.ink,
	},
	row: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		paddingVertical: 10,
	},
	rowDivider: {
		borderBottomWidth: 1,
		borderBottomColor: APP_COLORS.divider,
	},
	num: {
		fontSize: 13,
		lineHeight: 18,
		fontWeight: '800',
	},
	text: {
		flex: 1,
		minWidth: 0,
	},
	title: {
		fontSize: 14,
		lineHeight: 20,
		fontWeight: '800',
		color: APP_COLORS.ink,
	},
	sub: {
		fontSize: 12,
		lineHeight: 16,
		color: APP_COLORS.inkMuted,
	},
	status: {
		flexShrink: 0,
		alignSelf: 'center',
	},
	statusText: {
		fontSize: 11,
		lineHeight: 16,
	},
	note: {
		fontSize: 12,
		lineHeight: 16,
		color: APP_COLORS.inkMuted,
	},
})

export default AppVisitList
