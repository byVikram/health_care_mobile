// The top-bar background from the Doctor Consultation design ("1 · Specialities — minimal colour"): the
// ink base with three soft radial glows (teal top-right, blue left, mint bottom). Every header in the app
// draws it as its first child so the bars look the same everywhere. Purely decorative: it never takes touches
// and is hidden from screen readers.

import React from 'react'
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native'
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg'
import { APP_COLORS } from '../../../config/theme'

type AppHeaderBackdropProps = {
	/** Replaces the ink base colour; the glows are still drawn on top. */
	base?: string
	style?: StyleProp<ViewStyle>
}

// [id, centre x/y, radius x/y, colour, centre opacity]: the design's three radial-gradient layers, each
// fading to transparent at 70% of its radius.
const GLOWS = [
	{ id: 'hbTeal', cx: 0.92, cy: 0, rx: 0.55, ry: 0.75, color: '#2B6F71', opacity: 1 },
	{ id: 'hbBlue', cx: 0, cy: 0.45, rx: 0.5, ry: 0.7, color: '#1F5E7A', opacity: 0.9 },
	{ id: 'hbMint', cx: 0.72, cy: 1.15, rx: 0.45, ry: 0.6, color: '#9FD3D1', opacity: 0.4 },
] as const

export function AppHeaderBackdrop({ base = APP_COLORS.ink, style }: AppHeaderBackdropProps) {
	return (
		<View
			pointerEvents="none"
			importantForAccessibility="no-hide-descendants"
			accessibilityElementsHidden
			style={[StyleSheet.absoluteFill, { backgroundColor: base }, style]}
		>
			<Svg width="100%" height="100%">
				<Defs>
					{GLOWS.map((g) => (
						<RadialGradient
							key={g.id}
							id={g.id}
							cx={g.cx}
							cy={g.cy}
							fx={g.cx}
							fy={g.cy}
							rx={g.rx}
							ry={g.ry}
						>
							<Stop offset="0" stopColor={g.color} stopOpacity={g.opacity} />
							<Stop offset="0.7" stopColor={g.color} stopOpacity={0} />
						</RadialGradient>
					))}
				</Defs>
				{GLOWS.map((g) => (
					<Rect key={g.id} x="0" y="0" width="100%" height="100%" fill={`url(#${g.id})`} />
				))}
			</Svg>
		</View>
	)
}

export default AppHeaderBackdrop
