// src/features/doctor/components/SheetMenu.tsx
//
// The "Appointment actions" list of the doctor's sheets ("Doctor Dashboard NEW"): one bordered card of rows, each a tinted icon tile,
// a title, a one-line explanation and a chevron. Used by the Schedule row's three-dots sheet and the Booking requests card's.
// Each row is the shared AppNavRow (with an AppIconTile); this only adds the card and the per-row tile colours.

import React from 'react'
import { StyleSheet, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { AppNavRow } from '../../../components/common'
import { APP_COLORS } from '../../../config/theme'

export type SheetMenuRow = {
	/** A MaterialCommunityIcons glyph. */
	icon: keyof typeof MaterialCommunityIcons.glyphMap
	/** Tile background and icon colour. */
	tile: string
	ink: string
	title: string
	sub: string
	/** Draws the title in the danger colour (Cancel, Decline). */
	danger?: boolean
	disabled?: boolean
	onPress: () => void
}

export function SheetMenu({ rows }: { rows: SheetMenuRow[] }) {
	return (
		<View style={styles.menu}>
			{rows.map((r, i) => (
				<AppNavRow
					key={r.title}
					title={r.title}
					subtitle={r.sub}
					leading={{ icon: r.icon, size: 40, radius: 10, backgroundColor: r.tile, iconColor: r.ink }}
					onPress={r.onPress}
					disabled={r.disabled}
					divider={i < rows.length - 1}
					minHeight={64}
					titleStyle={[styles.title, r.danger && { color: APP_COLORS.danger }]}
					style={styles.row}
				/>
			))}
		</View>
	)
}

const styles = StyleSheet.create({
	menu: {
		borderWidth: 1,
		borderColor: APP_COLORS.divider,
		borderRadius: 12,
		overflow: 'hidden',
		backgroundColor: '#FFFFFF',
	},
	row: { paddingHorizontal: 12, paddingVertical: 10 },
	title: { fontSize: 16, lineHeight: 22, fontWeight: '800' },
})
