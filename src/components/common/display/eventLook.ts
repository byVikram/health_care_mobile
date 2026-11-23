// src/components/common/display/eventLook.ts
//
// Colours and line icons of an event, picked from its category (the "9 · Events" design: a soft tone pair and a
// 24x24 icon per kind of event). Used by the event card, the Home strip and the event detail.

import { APP_COLORS, TONES } from '../../../config/theme'

export type EventTone = { bg: string; ink: string }

const GREEN: EventTone = { bg: APP_COLORS.successBg, ink: APP_COLORS.success }

export const EVENT_ICONS = {
	heart: 'M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z',
	drop: 'M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z',
	aid: 'M4 7h16v13H4zM9 7V4h6v3M12 10.5v6M9 13.5h6',
	ribbon: 'M12 3a4 4 0 0 0-4 4c0 3 4 7 4 7s4-4 4-7a4 4 0 0 0-4-4zM9 12l-4 9 3-1 2 2 2-5M15 12l4 9-3-1-2 2-2-5',
	shield: 'M12 3l8 3v6c0 4.5-3.4 8.2-8 9-4.6-.8-8-4.5-8-9V6zM8.5 12l2.5 2.5 4.5-4.5',
	mind: 'M9 4a3 3 0 0 0-3 3 3 3 0 0 0-1 5.5A3 3 0 0 0 8 17a3 3 0 0 0 4 3V5a3 3 0 0 0-3-1zM15 4a3 3 0 0 1 3 3 3 3 0 0 1 1 5.5A3 3 0 0 1 16 17a3 3 0 0 1-4 3',
	video: 'M3 7h12v10H3zM15 10.5l6-3.5v10l-6-3.5',
	pin: 'M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21zM12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
	clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2',
	calendar: 'M8 2v4M16 2v4M3 9h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z',
	back: 'M15 6l-6 6 6 6',
	chevron: 'M9 6l6 6-6 6',
	share: 'M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7M16 6l-4-4-4 4M12 2v14',
} as const

type Look = { tone: EventTone; icon: string }

const LOOKS: Record<string, Look> = {
	health_camp: { tone: TONES.peach, icon: EVENT_ICONS.heart },
	webinar: { tone: TONES.sand, icon: EVENT_ICONS.drop },
	workshop: { tone: GREEN, icon: EVENT_ICONS.aid },
	seminar: { tone: TONES.lilac, icon: EVENT_ICONS.ribbon },
	health_awareness: { tone: TONES.lilac, icon: EVENT_ICONS.ribbon },
	vaccination_camp: { tone: TONES.sky, icon: EVENT_ICONS.shield },
	live_qa: { tone: TONES.mint, icon: EVENT_ICONS.mind },
	fitness_wellness: { tone: GREEN, icon: EVENT_ICONS.heart },
	nutrition_session: { tone: GREEN, icon: EVENT_ICONS.drop },
}

const FALLBACK: Look = { tone: TONES.mint, icon: EVENT_ICONS.calendar }

export const lookForEvent = (category?: string | null): Look => LOOKS[category ?? ''] ?? FALLBACK
