// src/features/ancillary/staff/schedule/scheduleTheme.ts
//
// The few colours and glyph paths of the provider Schedule design that APP_COLORS / TONES do not carry, kept in one place.
import { APP_COLORS, TONES } from '../../../../config/theme'

export const SCH = {
	/** Instant visits and requests: the peach pair. */
	instantInk: TONES.peach.ink,
	instantBg: TONES.peach.bg,
	/** The orange of the "open jobs" dot on a day, the instant card's border and its timer bar. */
	accent: '#E8743F',
	timerTrack: '#F5E1D6',
	/** Hairline of a section card and of the rule between its rows. */
	cardBorder: '#E3EAEB',
	rule: '#EEF2F2',
	/** Border of the "Needed now" card. */
	neededBorder: '#F3C9B2',
	/** Border and fill of a day that clashes with the nurse's schedule. */
	clashBorder: '#F0D9AE',
	clashBg: '#FFF8EE',
	/** A released / cancelled row. */
	faint: '#7A8B8E',
	released: APP_COLORS.neutralBg,
	/** Body text of the booking card (a notch softer than ink). */
	body: '#3F5357',
	handle: '#C9D5D6',
} as const

export const PATHS = {
	bolt: 'M13 2L4 14h7l-1 8 9-12h-7z',
	home: 'M3 11l9-7 9 7M5 10v10h14V10',
	pin: 'M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11zM12 8v4M12 15h.01',
	more: 'M12 6h.01M12 12h.01M12 18h.01',
	chevronRight: 'M9 6l6 6-6 6',
	chevronDown: 'M6 9l6 6 6-6',
	calendar: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4',
	history: 'M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5M12 7v5l3 2',
	play: 'M8 5l11 7-11 7z',
	check: 'M20 6L9 17l-5-5',
	close: 'M18 6L6 18M6 6l12 12',
	nav: 'M3 11l18-8-8 18-2-8z',
	phone: 'M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2',
	file: 'M14 3H6v18h12V7zM14 3v4h4M9 12h6M9 16h6',
	clock: 'M12 7v5l3 2M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z',
	release: 'M9 14l-5-5 5-5M4 9h11a5 5 0 0 1 0 10h-3',
	warn: 'M12 9v4M12 16.5h.01M10.3 3.9L2 18a2 2 0 0 0 1.7 3h16.6a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z',
	user: 'M20 21a8 8 0 0 0-16 0M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
	filter: 'M3 5h18M6 12h12M10 19h4',
	search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4-4',
} as const
