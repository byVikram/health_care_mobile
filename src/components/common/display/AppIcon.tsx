// src/components/common/display/AppIcon.tsx
//
// Shared KarolaHealth stroke icon set (24x24 viewBox, fill none), copied path-for-path from the
// "Consult a doctor" reference designs (doctor_consultation.html). Glyphs from the search screens use
// round caps/joins, glyphs from the payment screens use SVG default butt caps; each keeps its original
// line cap so ports stay pixel-faithful — pass `rounded` to force round caps.

import React from 'react'
import Svg, { Circle, Path, Rect } from 'react-native-svg'

export type AppIconName =
	// consult / search set
	| 'back'
	| 'search'
	| 'chevronRight'
	| 'chevronDown'
	| 'video'
	| 'pin'
	| 'steth'
	// payment / confirmed set
	| 'phone'
	| 'card'
	| 'bank'
	| 'clinic'
	| 'shield'
	| 'lock'
	| 'check'
	| 'calendar'
	| 'directions'
	| 'download'
	// system states set (Offline & Models.html)
	| 'wifiOff'
	| 'refresh'
	| 'call'

/** Glyphs that come from the payment designs, which use SVG default (butt) caps. */
const BUTT_CAP_ICONS: ReadonlySet<AppIconName> = new Set<AppIconName>([
	'phone',
	'card',
	'bank',
	'clinic',
	'shield',
	'lock',
	'check',
	'calendar',
	'directions',
	'download',
])

export type AppIconProps = {
	name: AppIconName
	/** Defaults to 24. (The old payment set defaulted to 20 — pass size={20} when migrating it.) */
	size?: number
	color: string
	strokeWidth?: number
	/** Force round (true) or butt (false) caps/joins. Defaults to the glyph's source design. */
	rounded?: boolean
	accessibilityLabel?: string
}

export function AppIcon({ name, size = 24, color, strokeWidth = 2, rounded, accessibilityLabel }: AppIconProps) {
	const round = rounded ?? !BUTT_CAP_ICONS.has(name)
	const common = {
		fill: 'none',
		stroke: color,
		strokeWidth,
		...(round ? { strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const } : null),
	}
	return (
		<Svg
			width={size}
			height={size}
			viewBox="0 0 24 24"
			accessibilityLabel={accessibilityLabel}
			accessible={accessibilityLabel ? true : undefined}
		>
			{name === 'back' && <Path d="M15 18l-6-6 6-6" {...common} />}
			{name === 'chevronRight' && <Path d="M9 6l6 6-6 6" {...common} />}
			{name === 'chevronDown' && <Path d="M6 9l6 6 6-6" {...common} />}
			{name === 'search' && (
				<>
					<Circle cx={11} cy={11} r={7} {...common} />
					<Path d="M20 20l-3.5-3.5" {...common} />
				</>
			)}
			{name === 'video' && (
				<>
					<Rect x={3} y={6} width={12} height={12} rx={2} {...common} />
					<Path d="M15 10l6-3v10l-6-3z" {...common} />
				</>
			)}
			{name === 'pin' && (
				<>
					<Path d="M12 21s7-6.1 7-11.5A7 7 0 0 0 5 9.5C5 14.9 12 21 12 21z" {...common} />
					<Circle cx={12} cy={9.5} r={2.5} {...common} />
				</>
			)}
			{name === 'steth' && (
				<>
					<Path d="M6 3v6a4 4 0 0 0 8 0V3M10 13v3a5 5 0 0 0 10 0v-2" {...common} />
					<Circle cx={20} cy={12} r={2} {...common} />
				</>
			)}
			{name === 'phone' && (
				<>
					<Rect x={7} y={2} width={10} height={20} rx={2} {...common} />
					<Path d="M11 18h2" {...common} />
				</>
			)}
			{name === 'card' && (
				<>
					<Rect x={3} y={5} width={18} height={14} rx={2} {...common} />
					<Path d="M3 10h18M7 15h4" {...common} />
				</>
			)}
			{name === 'bank' && <Path d="M3 10l9-6 9 6M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 21h18" {...common} />}
			{name === 'clinic' && (
				<>
					<Path d="M4 21V8l8-5 8 5v13" {...common} />
					<Path d="M10 21v-5h4v5" {...common} />
				</>
			)}
			{name === 'shield' && (
				<>
					<Path d="M12 3l8 3v6c0 4.5-3.4 8.2-8 9-4.6-.8-8-4.5-8-9V6z" {...common} />
					<Path d="M8.5 12l2.5 2.5 4.5-4.5" {...common} />
				</>
			)}
			{name === 'lock' && (
				<>
					<Rect x={5} y={11} width={14} height={10} rx={2} {...common} />
					<Path d="M8 11V8a4 4 0 0 1 8 0v3" {...common} />
				</>
			)}
			{name === 'check' && <Path d="M5 12.5l4.5 4.5L19 7.5" {...common} />}
			{name === 'calendar' && (
				<>
					<Rect x={4} y={5} width={16} height={16} rx={2} {...common} />
					<Path d="M4 10h16M9 3v4M15 3v4M12 13v5M9.5 15.5h5" {...common} />
				</>
			)}
			{name === 'directions' && <Path d="M3 11l18-8-8 18-2-8z" {...common} />}
			{name === 'download' && <Path d="M12 4v11M7 10l5 5 5-5M5 20h14" {...common} />}
			{name === 'wifiOff' && (
				<Path
					d="M2 2l20 20M8.5 16.5a5 5 0 0 1 7 0M5 12.5a10 10 0 0 1 5.2-2.7M19 12.5a10 10 0 0 0-2.4-1.7M1.5 9a15 15 0 0 1 4.4-2.8M22.5 9A15 15 0 0 0 12 4.5c-1 0-2 .1-3 .3M12 20h.01"
					{...common}
				/>
			)}
			{name === 'refresh' && (
				<Path d="M20 11a8 8 0 0 0-14.9-3.9M4 4v4h4M4 13a8 8 0 0 0 14.9 3.9M20 20v-4h-4" {...common} />
			)}
			{name === 'call' && (
				<Path
					d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"
					{...common}
				/>
			)}
		</Svg>
	)
}

export type AppPathIconProps = {
	/** One or more SVG path `d` strings on a 24x24 grid (e.g. the design's speciality `I` path map). */
	d: string | string[]
	size?: number
	color: string
	strokeWidth?: number
	accessibilityLabel?: string
}

/** Arbitrary stroke-path icon (round caps/joins). Defaults match the speciality tiles: 30px, 1.7 stroke. */
export function AppPathIcon({ d, size = 30, color, strokeWidth = 1.7, accessibilityLabel }: AppPathIconProps) {
	const paths = Array.isArray(d) ? d : [d]
	return (
		<Svg
			width={size}
			height={size}
			viewBox="0 0 24 24"
			accessibilityLabel={accessibilityLabel}
			accessible={accessibilityLabel ? true : undefined}
		>
			{paths.map((p, i) => (
				<Path
					key={i}
					d={p}
					fill="none"
					stroke={color}
					strokeWidth={strokeWidth}
					strokeLinecap="round"
					strokeLinejoin="round"
				/>
			))}
		</Svg>
	)
}

export default AppIcon
