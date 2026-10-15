// src/features/ancillary/utils/__tests__/serviceSearch.test.ts
//
// Self-checking like the wallet test (no test runner is configured in this app): run it with any TypeScript runner;
// a failed check THROWS, so a broken search cannot pass unnoticed.
import { createServiceSearch, normalizeSearchText, searchTerms } from '../serviceSearch'

interface Svc {
	title: string
	about: string
	includes: string[]
	goodFor?: string
	category?: string
}

const services: Svc[] = [
	{ title: 'Bathing & Hygiene Assistance', about: 'Help with a safe bath and personal hygiene.', includes: ['Sponge bath', 'Oral care'], category: 'Personal Care' },
	{ title: 'Bed Bath', about: 'Full bed bath for bedridden patients.', includes: ['Skin care'], category: 'Personal Care' },
	{ title: 'Walking Assistance', about: 'Assisted walking inside the home.', includes: ['Support while walking', 'Fall-risk awareness'], category: 'Mobility' },
	{ title: 'Companionship', about: 'Social time and conversation.', includes: ['Conversation', 'Light walking outdoors'], goodFor: 'Older adults living alone', category: 'Support' },
	{ title: 'Medication Reminders', about: 'Timely reminders for prescribed medicines.', includes: ['Verbal reminders'], category: 'Daily Care' },
]

const search = createServiceSearch(services, (s) => ({ name: s.title, details: [s.about, ...s.includes], other: [s.goodFor, s.category] }))
const titles = (query: string) => search(query).map((s) => s.title)
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)
const check = (ok: boolean, message: string) => {
	if (!ok) throw new Error(`Service search check failed: ${message}`)
}

console.log('Testing service search...')

// text is compared without case, accents or punctuation
check(normalizeSearchText('Bed-to-Chair  Transfer & Care!') === 'bed to chair transfer and care', 'normalize failed')
check(same(searchTerms('Bath BATH hygiene'), ['bath', 'hygiene']), 'search terms failed')

// an empty query lists everything in the catalogue's own order
check(same(titles(''), services.map((s) => s.title)) && same(titles('   '), titles('')), 'empty query failed')

// name matches, including the start of a word and in any order / case
check(same(titles('bath'), ['Bathing & Hygiene Assistance', 'Bed Bath']), 'name search failed')
check(same(titles('HYGIENE bathing'), ['Bathing & Hygiene Assistance']), 'every word must match, in any order')
check(same(titles('bathing and hygiene'), ['Bathing & Hygiene Assistance']), '& is the same as "and"')

// the description, the included tasks and the care activities are searched, not only the name
check(titles('conversation').includes('Companionship'), 'included task not searched')
check(titles('prescribed medicines').includes('Medication Reminders'), 'description not searched')
check(titles('sponge').includes('Bathing & Hygiene Assistance'), 'included task not searched (sponge)')
check(titles('older adults').includes('Companionship'), 'good-for not searched')
check(titles('mobility').includes('Walking Assistance'), 'category not searched')

// a name match ranks above a match only in the details
check(titles('walking')[0] === 'Walking Assistance' && titles('walking')[1] === 'Companionship', 'ranking failed')

// filler words do not stop a natural phrase from matching
check(same(titles('assistance for bathing'), titles('assistance bathing')) && titles('assistance for bathing').includes('Bathing & Hygiene Assistance'), 'filler words must be ignored')
check(same(searchTerms('to the'), ['to', 'the']) && same(searchTerms('help with bathing'), ['help', 'bathing']), 'filler-only queries keep their words')

// narrowing as the user types, and no match at all
check(titles('b').length >= titles('ba').length && titles('ba').length >= titles('bat').length, 'typing should only narrow')
check(same(titles('zzzz'), []) && same(titles('bath zzzz'), []), 'no match failed')

console.log('Service search tests passed successfully!')
