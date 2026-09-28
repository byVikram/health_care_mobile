// src/components/common/display/AppDashedDivider.tsx
//
// Dashed rules drawn with react-native-svg, because RN's `borderStyle: 'dashed'` on a single
// edge is unreliable on Android.
//   variant 'line'   — full-width dashed rule (CSS `border-top: Npx dashed`).
//   variant 'ticket' — perforation line for ticket cards: the dashes are inset from the card edges
//                      and a semicircle cut-out sits on each end. The parent card must have
//                      `overflow: 'hidden'` so the cut-out circles are clipped into half-circles.

import React from 'react'
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native'
import Svg, { Line } from 'react-native-svg'
import { APP_COLORS } from '../../../config/theme'

export type AppDashedDividerProps = {
	variant?: 'line' | 'ticket'
	/** Dash colour. Defaults to APP_COLORS.divider. */
	color?: string
	/** Line thickness. Defaults to 1 ('line') / 2 ('ticket'). */
	thickness?: number
	/** Dash length. Defaults to 3 x thickness (how browsers draw a CSS dashed border). */
	dash?: number
	/** Gap length. Defaults to `dash`. */
	gap?: number
	/** 'ticket': colour of the surface behind the card (fills the cut-outs). Defaults to APP_COLORS.pageBg. */
	cutoutColor?: string
	/** 'ticket': horizontal distance of the dashes from each card edge. Defaults to 20. */
	inset?: number
	/** 'ticket': cut-out circle diameter. Defaults to 20. */
	cutoutSize?: number
	style?: StyleProp<ViewStyle>
}

function DashedLine({ color, thickness, dash, gap }: { color: string; thickness: number; dash: number; gap: number }) {
	return (
		<Svg width="100%" height={thickness}>
			<Line
				x1="0"
				y1={thickness / 2}
				x2="100%"
				y2={thickness / 2}
				stroke={color}
				strokeWidth={thickness}
				strokeDasharray={`${dash} ${gap}`}
			/>
		</Svg>
	)
}

export function AppDashedDivider({
	variant = 'line',
	color = APP_COLORS.divider,
	thickness,
	dash,
	gap,
	cutoutColor = APP_COLORS.pageBg,
	inset = 20,
	cutoutSize = 20,
	style,
}: AppDashedDividerProps) {
	const t = thickness ?? (variant === 'ticket' ? 2 : 1)
	const d = dash ?? t * 3
	const g = gap ?? d

	if (variant === 'line') {
		return (
			<View
				style={[{ height: t }, style]}
				accessibilityElementsHidden
				importantForAccessibility="no-hide-descendants"
			>
				<DashedLine color={color} thickness={t} dash={d} gap={g} />
			</View>
		)
	}

	// Cut-outs overhang the card edge by 12px (matches the Payment / Confirmed designs:
	// a 20px circle whose centre sits 2px outside the card).
	const overhang = cutoutSize / 2 + 2
	const cutout = {
		top: t / 2 - cutoutSize / 2,
		width: cutoutSize,
		height: cutoutSize,
		borderRadius: cutoutSize / 2,
		backgroundColor: cutoutColor,
	}
	return (
		<View
			style={[{ height: t, marginHorizontal: inset }, style]}
			accessibilityElementsHidden
			importantForAccessibility="no-hide-descendants"
		>
			<DashedLine color={color} thickness={t} dash={d} gap={g} />
			<View style={[styles.cutout, cutout, { left: -(inset + overhang) }]} />
			<View style={[styles.cutout, cutout, { right: -(inset + overhang) }]} />
		</View>
	)
}

const styles = StyleSheet.create({
	cutout: {
		position: 'absolute',
	},
})

export default AppDashedDivider
