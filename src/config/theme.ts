import { MD3LightTheme as DefaultTheme } from 'react-native-paper';

export const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#2B6F71',
    primaryContainer: '#276668',
    onPrimary: '#ffffff',
    secondary: '#c6e6e7',
    secondaryContainer: '#b6d6d8',
    onSecondary: '#ffffff',
    error: '#d32f2f',
    background: '#f4f6f9',
    surface: '#ffffff',
    surfaceVariant: '#e0e7ef', // used for divider/borders
    onSurface: '#1a2b3c', // text primary
    onSurfaceVariant: '#546e7a', // text secondary
    elevation: {
      ...DefaultTheme.colors.elevation,
      level1: '#ffffff',
    },
  },
  roundness: 10,
};

// ----------------------------------------------------------------------
// App design tokens -- the KarolaHealth design language every screen is being
// moved to (reference: doctor_consultation.html). Import these instead of
// hardcoding hex values. Kept separate from the Paper `theme` above on purpose:
// changing Paper's colours would restyle screens not yet redesigned.
// ----------------------------------------------------------------------

export const APP_COLORS = {
	primary: '#2B6F71',
	primaryDark: '#276668',
	ink: '#12373E',
	inkMuted: '#5B6B6E',
	inkDisabled: '#A3B0B2',
	border: '#7A8B8E',
	divider: '#D5E1E2',
	pageBg: '#F5F8F8',
	surface: '#FFFFFF',
	mint: '#E3EFEF',
	mintAccent: '#9FD3D1',
	disabledBtn: '#C9E0E0',
	success: '#1E7A4E',
	successBg: '#E6F4EC',
	danger: '#B42318',
	dangerBg: '#FDECEA',
	warning: '#8A5300',
	warningBg: '#FDF1DC',
	star: '#E8A200',
	scrim: '#12373E66',
	shadow: '#12373E',
} as const

export type ToneKey = 'mint' | 'sky' | 'lilac' | 'peach' | 'sand'

/** Soft background / ink pairs used for icon tiles, chips and badges. */
export const TONES: Record<ToneKey, { bg: string; ink: string }> = {
	mint: { bg: '#E3EFEF', ink: '#2B6F71' },
	sky: { bg: '#DDEBFA', ink: '#2463A8' },
	lilac: { bg: '#ECE6FA', ink: '#6A4BB5' },
	peach: { bg: '#FDE8DC', ink: '#B4532A' },
	sand: { bg: '#FBEFD5', ink: '#8A5300' },
}

export const TONE_ORDER: ToneKey[] = ['mint', 'sky', 'lilac', 'peach', 'sand']

/** Deterministic tone for list items without their own colour (e.g. by index or id). */
export const toneAt = (index: number) => TONES[TONE_ORDER[Math.abs(index) % TONE_ORDER.length]]

/** Card shadow used by floating tickets / sheets: 0 8px 24px #12373E29 */
export const CARD_SHADOW = {
	shadowColor: APP_COLORS.shadow,
	shadowOffset: { width: 0, height: 8 },
	shadowOpacity: 0.16,
	shadowRadius: 24,
	elevation: 6,
} as const

export const formatInr = (amount?: number | string | null) => {
	const n = Number(amount)
	if (!Number.isFinite(n) || n <= 0) return '--'
	return `₹${n.toLocaleString('en-IN')}`
}
