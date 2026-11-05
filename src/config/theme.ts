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
	/** Promo / offer tag background ("UP TO 32% OFF", "PRIORITY · 24/7"), white text. */
	offer: '#C2410C',
	/** Inactive carousel / pager dot. */
	dotInactive: '#C9D6D7',
	/** Neutral pill background (done / completed / archived states). */
	neutralBg: '#F0F4F4',
	/** Hairline border of the minimal-colour cards (speciality tiles, stat tiles, banners). */
	cardBorder: '#E6ECEC',
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

/** Deterministic tone per label (e.g. a speciality name): the same string always gets the same tone. */
export const toneForString = (label: string) => {
	let hash = 0
	for (let i = 0; i < label.length; i++) hash = (hash * 31 + label.charCodeAt(i)) >>> 0
	return toneAt(hash)
}

export type StatusToneKey =
	| 'confirmed'
	| 'pending'
	| 'scheduled'
	| 'upcoming'
	| 'onTheWay'
	| 'inProgress'
	| 'completed'
	| 'done'
	| 'paid'
	| 'cancelled'
	| 'failed'

/**
 * Background / ink pairs for booking & visit status pills (home-nursing visit pages: "Confirmed" =
 * success on successBg, "In progress" / "Today" = primary on mint).
 */
export const STATUS_TONES: Record<StatusToneKey, { bg: string; ink: string }> = {
	confirmed: { bg: APP_COLORS.successBg, ink: APP_COLORS.success },
	pending: { bg: APP_COLORS.warningBg, ink: APP_COLORS.warning },
	scheduled: { bg: TONES.sky.bg, ink: TONES.sky.ink },
	upcoming: { bg: APP_COLORS.mint, ink: APP_COLORS.primary },
	onTheWay: { bg: TONES.sky.bg, ink: TONES.sky.ink },
	inProgress: { bg: APP_COLORS.mint, ink: APP_COLORS.primary },
	completed: { bg: APP_COLORS.successBg, ink: APP_COLORS.success },
	done: { bg: APP_COLORS.neutralBg, ink: APP_COLORS.inkMuted },
	paid: { bg: APP_COLORS.successBg, ink: APP_COLORS.success },
	cancelled: { bg: APP_COLORS.dangerBg, ink: APP_COLORS.danger },
	failed: { bg: APP_COLORS.dangerBg, ink: APP_COLORS.danger },
}

/** Card shadow used by floating tickets / sheets: 0 8px 24px #12373E29 */
export const CARD_SHADOW = {
	shadowColor: APP_COLORS.shadow,
	shadowOffset: { width: 0, height: 8 },
	shadowOpacity: 0.16,
	shadowRadius: 24,
	elevation: 6,
} as const

/**
 * Shadow of every card in the Find Doctors flow (speciality tiles, banners, stat tiles, doctor result cards, clinic and
 * booking cards): the design's `0 8px 12px rgba(18, 55, 62, 0.14)`, written as a CSS box-shadow so it renders the same
 * on web, iOS and Android (React Native's own shadow props and `elevation` each blur differently per platform).
 */
export const SOFT_CARD_SHADOW = {
	boxShadow: '0px 8px 12px rgba(18, 55, 62, 0.14)',
} as const

export const formatInr = (amount?: number | string | null) => {
	const n = Number(amount)
	if (!Number.isFinite(n) || n <= 0) return '--'
	return `₹${n.toLocaleString('en-IN')}`
}
