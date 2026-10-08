// src/features/care-ai/careAiTheme.ts
//
// The few colours the Care AI design uses that APP_COLORS / TONES have no token for. Everything else comes from
// config/theme.

export const CARE_AI = {
	/** Hairline under the header and between sheet rows. */
	hairline: '#E8EEEF',
	/** 1px border of the reply cards and the starter list. */
	cardBorder: '#E1EAEB',
	/** Divider inside the starter list / summary card / sheets. */
	rowDivider: '#EEF2F2',
	/** Soft grey-teal fill: greeting strip, records row, follow-up suggestions, "why" panel. */
	softSurface: '#F2F7F7',
	/** "Asking for" bar background. */
	askingBar: '#F7FAFA',
	/** The glow ring around the dark Care AI avatar. */
	avatarGlow: '#9FD3D14D',
	/** The little "online" dot under the title. */
	online: '#1E9E5A',
	/** Quick-reply chip outline. */
	chipBorder: '#9FC4C5',
	/** Reply body copy / bullet lines. */
	body: '#3D5357',
	bullet: '#3D4F52',
	/** Caution callout text. */
	noteText: '#5C3D00',
	/** Urgent-care card. */
	urgentBorder: '#F3C1BA',
	urgentButtonBorder: '#E9A79E',
	urgentBody: '#4A3A38',
	/** Composer outline and the disabled send button. */
	composerBorder: '#C9D6D7',
	/** Muted caption text under the composer. */
	caption: '#7A8B8E',
	/** Report banner secondary line. */
	onInkMuted: '#C9DCDC',
} as const
