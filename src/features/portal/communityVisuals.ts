// src/features/portal/communityVisuals.ts
//
// How a community group (GET /api/communities) is drawn on the Communities screen ("6 · Communities"): a 24x24 stroke glyph and a soft
// tone pair, both worked out from the group's name, category and icon_name (the API sends neither a glyph path nor a colour), plus the
// small text helpers.
import { APP_COLORS, TONES } from '../../config/theme'
import type { CommunityGroup } from '../../services/communityService'

export const COMMUNITY_ICONS = {
	drop: 'M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z',
	heart: 'M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z',
	ribbon: 'M12 3a4 4 0 0 0-4 4c0 3 4 7 4 7s4-4 4-7a4 4 0 0 0-4-4zM9 12l-4 9 3-1 2 2 2-5M15 12l4 9-3-1-2 2-2-5',
	people: 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21v-1a7 7 0 0 1 14 0v1M16 3.5a4 4 0 0 1 0 7M22 21v-1a7 7 0 0 0-4-6.3',
	baby: 'M12 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM6 21a6 6 0 0 1 12 0M10 8h.01M14 8h.01',
	mind: 'M9 4a3 3 0 0 0-3 3 3 3 0 0 0-1 5.5A3 3 0 0 0 8 17a3 3 0 0 0 4 3V5a3 3 0 0 0-3-1zM15 4a3 3 0 0 1 3 3 3 3 0 0 1 1 5.5A3 3 0 0 1 16 17a3 3 0 0 1-4 3',
	shield: 'M12 3l8 3v6c0 4.5-3.4 8.2-8 9-4.6-.8-8-4.5-8-9V6zM8.5 12l2.5 2.5 4.5-4.5',
	info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 11v5M12 8h.01',
	back: 'M15 18l-6-6 6-6',
} as const

type IconKey = 'drop' | 'heart' | 'ribbon' | 'people' | 'baby' | 'mind'

/** The design's six soft tone pairs (background, ink), from the app's tones; the design's green is the success pair. */
const TONE_OF: Record<IconKey, { bg: string; ink: string }> = {
	drop: TONES.sand,
	ribbon: TONES.lilac,
	heart: TONES.peach,
	people: TONES.mint,
	baby: TONES.sky,
	mind: { bg: APP_COLORS.successBg, ink: APP_COLORS.success },
}

const RULES: [IconKey, RegExp][] = [
	['drop', /diabet|sugar|insulin|thyroid|endocrin|bloodtype/],
	['ribbon', /cancer|onco|tumou?r|ribbon/],
	['heart', /heart|cardi|blood pressure|\bbp\b|cholesterol|favorite/],
	['baby', /parent|baby|infant|child|pregnan|mother|maternity|newborn|paed|pedia/],
	['mind', /anxiety|stress|mind|mental|depress|psych|sleep/],
]

const match = (text: string): IconKey | undefined => RULES.find(([, re]) => re.test(text))?.[0]

/** Which glyph fits a group: by its name and category first, then its icon_name; anything else (e.g. caring for the elderly) gets the people glyph. */
export function communityIconKey(g: CommunityGroup): IconKey {
	return match(`${g.name} ${g.category}`.toLowerCase()) ?? match((g.icon_name ?? '').toLowerCase()) ?? 'people'
}

export function communityVisual(g: CommunityGroup) {
	const key = communityIconKey(g)
	return { icon: COMMUNITY_ICONS[key], ...TONE_OF[key] }
}

export const kindOf = (g: CommunityGroup) => (g.group_type === 'forum' ? 'Forum' : 'Support group')

export const membersText = (n: number | undefined) => `${(n ?? 0).toLocaleString('en-IN')} member${n === 1 ? '' : 's'}`

/** Everything the search box looks at for one group, lower-cased. */
export const communitySearchText = (g: CommunityGroup) => `${g.name} ${g.description ?? ''} ${g.category}`.toLowerCase()
