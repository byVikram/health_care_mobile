// src/features/ancillary/utils/serviceSearch.ts
//
// Search over a catalogue of services (Home Care activities, nursing procedures, packages ...) using their REAL data:
// the name, the description / about text, the included tasks and care activities, who it is good for and the category.
// No tags: whatever the API returns for a service is what is searched. (Preparation steps are not searched: they are
// "what to keep ready" notes shared by most services, so they would make every service match.)
//
// How a query matches:
//  - It is split into words ("bath hygiene" -> bath, hygiene) and EVERY word must appear somewhere in the service, so
//    adding a word narrows the list as the user types. Order does not matter.
//  - Filler words ("for", "with", "the" ...) are ignored when the query has other words, so "assistance for feeding"
//    finds Feeding Assistance even though "for" is not in its text.
//  - Text is compared without case, accents or punctuation ("Bed-to-Chair" == "bed to chair", "&" == "and").
//  - A word matches the start of a word ("bath" finds "Bathing") or any part of one ("hygiene" finds "Hygienic").
// Results are ranked: a match in the name beats one in the description / included tasks, which beats one in the rest;
// a word-start beats a mid-word match. Equal scores keep the catalogue's own order. An empty query returns everything.

export interface SearchFields {
	/** The service name (highest weight). */
	name: string
	/** Description / about text and the included tasks / care activities. */
	details?: Array<string | null | undefined>
	/** Good-for text, category name ... (lowest weight). */
	other?: Array<string | null | undefined>
}

/** Lower-case, accent-free, punctuation-free text with single spaces. */
export function normalizeSearchText(value: string | null | undefined): string {
	if (!value) return ''
	let text = String(value).toLowerCase().replace(/&/g, ' and ')
	try {
		text = text.normalize('NFD').replace(/[̀-ͯ]/g, '')
	} catch {
		// String.prototype.normalize is missing on some engines: accents are then compared as they are.
	}
	return text.replace(/[\s\-_/\\.,;:()[\]{}'"`!?*+|#@%^~<>=]+/g, ' ').trim()
}

/** Words that carry no meaning of their own in a query. */
const FILLER_WORDS = new Set(['a', 'an', 'and', 'the', 'of', 'for', 'to', 'with', 'in', 'on', 'at', 'by', 'or', 'my', 'me', 'i', 'need', 'want'])

/**
 * The words of a query, normalized, without duplicates and without filler words. A query that is ONLY filler words
 * ("a", "to") keeps them, so typing the first letters still narrows the list.
 */
export function searchTerms(query: string | null | undefined): string[] {
	const words = Array.from(new Set(normalizeSearchText(query).split(' ').filter(Boolean)))
	const meaningful = words.filter((word) => !FILLER_WORDS.has(word))
	return meaningful.length > 0 ? meaningful : words
}

const NAME_WEIGHT = 30
const DETAIL_WEIGHT = 20
const OTHER_WEIGHT = 10
const WORD_START_BONUS = 5

interface Indexed<T> {
	item: T
	order: number
	name: string
	details: string
	other: string
}

/** 0 when `term` is not in `text`; otherwise a weight, higher when it starts a word. */
function termScore(text: string, term: string, weight: number): number {
	if (!text) return 0
	const at = text.indexOf(term)
	if (at < 0) return 0
	const startsWord = text.startsWith(term) || text.includes(` ${term}`)
	return weight + (startsWord ? WORD_START_BONUS : 0)
}

/**
 * Index the items once (normalizing their text is the costly part) and get back a function that filters + ranks them
 * for a query. Rebuild the index when the items change, call the function on every keystroke.
 */
export function createServiceSearch<T>(items: readonly T[], getFields: (item: T) => SearchFields) {
	const indexed: Indexed<T>[] = items.map((item, order) => {
		const fields = getFields(item)
		return {
			item,
			order,
			name: normalizeSearchText(fields.name),
			details: normalizeSearchText((fields.details ?? []).filter(Boolean).join(' ')),
			other: normalizeSearchText((fields.other ?? []).filter(Boolean).join(' ')),
		}
	})

	return (query: string | null | undefined): T[] => {
		const terms = searchTerms(query)
		if (terms.length === 0) return items.slice()

		const scored: Array<{ entry: Indexed<T>; score: number }> = []
		for (const entry of indexed) {
			let total = 0
			let matchedAll = true
			for (const term of terms) {
				const best = Math.max(
					termScore(entry.name, term, NAME_WEIGHT),
					termScore(entry.details, term, DETAIL_WEIGHT),
					termScore(entry.other, term, OTHER_WEIGHT)
				)
				if (best === 0) {
					matchedAll = false
					break
				}
				total += best
			}
			if (matchedAll) scored.push({ entry, score: total })
		}
		scored.sort((a, b) => b.score - a.score || a.entry.order - b.entry.order)
		return scored.map((s) => s.entry.item)
	}
}
