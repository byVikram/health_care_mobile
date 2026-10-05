// src/features/health-feed/feedTheme.ts
//
// Shared look-up tables for the Health feed screens ("Health reads", article, "Health questions",
// question thread): tone pairs, the 24x24 line-icon paths, and small formatters. Values come straight
// from the Health feeds design.

export type FeedTone = { bg: string; ink: string }

export const FEED_TONES = {
	green: { bg: '#E6F4EC', ink: '#1E7A4E' },
	blue: { bg: '#DDEBFA', ink: '#2463A8' },
	amber: { bg: '#FBEFD5', ink: '#8A5300' },
	orange: { bg: '#FDE8DC', ink: '#B4532A' },
	purple: { bg: '#ECE6FA', ink: '#6A4BB5' },
	teal: { bg: '#E3EFEF', ink: '#2B6F71' },
	red: { bg: '#FDECEA', ink: '#B42318' },
	grey: { bg: '#E9EEEF', ink: '#4A5A5D' },
} satisfies Record<string, FeedTone>

export const FEED_ICONS = {
	food: 'M12 7c-1-2-3-3-5-2-3 1-3 6-1 10 1 2 3 4 4 4s1.5-.5 2-.5 1 .5 2 .5 3-2 4-4c2-4 2-9-1-10-2-1-4 0-5 2zM12 7c0-2 1-4 3-4',
	drop: 'M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z',
	heart: 'M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z',
	shield: 'M12 3l8 3v6c0 4.5-3.4 8.2-8 9-4.6-.8-8-4.5-8-9V6zM8.5 12l2.5 2.5 4.5-4.5',
	mind: 'M9 4a3 3 0 0 0-3 3 3 3 0 0 0-1 5.5A3 3 0 0 0 8 17a3 3 0 0 0 4 3V5a3 3 0 0 0-3-1zM15 4a3 3 0 0 1 3 3 3 3 0 0 1 1 5.5A3 3 0 0 1 16 17a3 3 0 0 1-4 3',
	baby: 'M12 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM6 21a6 6 0 0 1 12 0M10 8h.01M14 8h.01',
	document: 'M4 5a2 2 0 0 1 2-2h9l5 5v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2zM8 12h8M8 16h5',
	back: 'M15 6l-6 6 6 6',
	chevronRight: 'M9 6l6 6-6 6',
	bookmark: 'M6 3h12v18l-6-4-6 4z',
	search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4-4',
	share: 'M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7M16 6l-4-4-4 4M12 2v14',
	plus: 'M12 5v14M5 12h14',
	close: 'M6 6l12 12M18 6L6 18',
	check: 'M5 12l5 5 9-10',
	clock: 'M12 7v5l3 2M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z',
	question:
		'M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12zM9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .8-1 1.5M12 16h.01',
	thumb: 'M7 10v11H4V10zM7 10l4-7a2 2 0 0 1 3 2l-1 5h6a2 2 0 0 1 2 2.3l-1.4 7A2 2 0 0 1 17.6 21H7',
	lock: 'M6 11V8a6 6 0 0 1 12 0v3M5 11h14v10H5z',
	info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 8v.01M11 12h1v5h1',
	add: 'M12 5v14M5 12h14',
} as const

type Look = { tone: keyof typeof FEED_TONES; icon: keyof typeof FEED_ICONS }

const READ_LOOKS: [RegExp, Look][] = [
	[/nutri|vitamin|diet|food|supplement|immun/, { tone: 'green', icon: 'food' }],
	[/diabet|endocrin|sugar|thyroid|hormon/, { tone: 'amber', icon: 'drop' }],
	[/heart|cardio|\bbp\b|hypertens|caregiv|cancer|oncolog/, { tone: 'orange', icon: 'heart' }],
	[/women|gynae|gyne|pcos|pregnan/, { tone: 'purple', icon: 'shield' }],
	[/mental|psych|sleep|stress|anxiety/, { tone: 'blue', icon: 'mind' }],
	[/child|pediatr|paediatr|toddler|baby/, { tone: 'teal', icon: 'baby' }],
	[/corona|covid|virus|infection|vaccin|respirat/, { tone: 'blue', icon: 'shield' }],
	[/geriatr|senior|elder|mobility/, { tone: 'teal', icon: 'heart' }],
]

/** Tone + line icon for an article/blog, picked from its category/tag/title. */
export function lookForRead(...hints: (string | null | undefined)[]): { tone: FeedTone; icon: string } {
	const hay = hints.filter(Boolean).join(' ').toLowerCase()
	const hit = READ_LOOKS.find(([re]) => re.test(hay))
	const look = hit ? hit[1] : { tone: 'teal' as const, icon: 'document' as const }
	return { tone: FEED_TONES[look.tone], icon: FEED_ICONS[look.icon] }
}

/** Tone for a question topic pill (Endocrinology, Cardiology, ...). */
export function toneForTopic(topic: string): FeedTone {
	const t = topic.toLowerCase()
	if (t.includes('endocrin')) return FEED_TONES.amber
	if (t.includes('cardio')) return FEED_TONES.red
	if (t.includes('respir')) return FEED_TONES.blue
	if (t.includes('dermat') || t.includes('skin')) return FEED_TONES.teal
	if (t.includes('pediatr') || t.includes('paediatr') || t.includes('child')) return FEED_TONES.green
	if (t.includes('oncolog') || t.includes('mental') || t.includes('psych')) return FEED_TONES.purple
	return FEED_TONES.grey
}

/** The question `tag` column holds up to three comma-separated topics. */
export const splitTags = (tag?: string | null) =>
	(tag ?? '')
		.split(',')
		.map((t) => t.trim())
		.filter(Boolean)

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** "2h ago", "Yesterday", "3 days ago", else "12 Sep 2026". */
export function relativeTime(iso?: string | null): string {
	if (!iso) return ''
	const t = new Date(iso)
	if (Number.isNaN(t.getTime())) return ''
	const mins = Math.floor((Date.now() - t.getTime()) / 60000)
	if (mins < 1) return 'Just now'
	if (mins < 60) return `${mins}m ago`
	const hours = Math.floor(mins / 60)
	if (hours < 24) return `${hours}h ago`
	const days = Math.floor(hours / 24)
	if (days === 1) return 'Yesterday'
	if (days < 7) return `${days} days ago`
	return `${t.getDate()} ${MON[t.getMonth()]} ${t.getFullYear()}`
}

export const longDate = (iso?: string | null) => {
	if (!iso) return ''
	const t = new Date(iso)
	return Number.isNaN(t.getTime()) ? '' : `${t.getDate()} ${MON[t.getMonth()]} ${t.getFullYear()}`
}

export const initialsOf = (name?: string | null) =>
	(name ?? '')
		.replace(/^dr\.?\s+/i, '')
		.split(/\s+/)
		.filter(Boolean)
		.slice(0, 2)
		.map((p) => p[0])
		.join('')
		.toUpperCase()
