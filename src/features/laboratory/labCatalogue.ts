// src/features/laboratory/labCatalogue.ts
//
// The catalogue as the screens use it: API items adapted to the app's LabItem shape, a small in-memory cache
// so the cart, review and order screens can look an item up by id after it was browsed, and the hooks that
// page / search the catalogue and load one item's detail.

import { useCallback, useEffect, useRef, useState } from 'react'
import { registerSessionCache } from '../../utils/sessionCache'
import type { LabItem } from './labMock'
import {
	fetchCatalogue,
	fetchCatalogueItem,
	labErrorMessage,
	type ApiCatalogueDetail,
	type ApiCatalogueItem,
	type ApiCoverage,
	type LabKind,
} from './labService'

const cache = new Map<string, LabItem>()

registerSessionCache(() => cache.clear())

export const labItemById = (id: string) => cache.get(id)

/** The lab prefixes its packages "PL - "; that is the lab's code, not something to show. */
const cleanName = (name: string) => name.replace(/^PL\s*-\s*/i, '').trim()

const reportText = (tat?: string | null) => {
	const hours = tat?.match(/(\d+)\s*hour/i)?.[1]
	if (hours) return `Reports in ${hours} hrs`
	return tat ? `Reports in ${tat}` : 'Report time shared by the lab'
}

/** "10-12 hours fasting" -> "10–12 hrs" (from the lab's preparation notes, which only the detail carries). */
const fastingOf = (preparations: string[]) => {
	const line = preparations.find((p) => /fast/i.test(p))
	if (!line) return { fasting: false as const }
	const range = line.match(/(\d+)\s*(?:-|–|to)\s*(\d+)\s*(?:hrs?|hours?)/i)
	const single = line.match(/(\d+)\s*(?:hrs?|hours?)/i)
	const fastingLabel = range ? `${range[1]}–${range[2]} hrs` : single ? `${single[1]} hrs` : undefined
	return { fasting: true as const, fastingLabel }
}

export function toLabItem(api: ApiCatalogueItem, detail?: ApiCatalogueDetail): LabItem {
	const prev = cache.get(api.id)
	const preparations = detail?.preparations ?? prev?.preparations
	const includedTests = detail ? detail.included_tests.map((t) => cleanName(t.name)) : prev?.includedTests
	const mrp = Number(api.min_mrp ?? prev?.mrp ?? 0)
	const fast = preparations ? fastingOf(preparations) : { fasting: prev?.fasting ?? false, fastingLabel: prev?.fastingLabel }
	const item: LabItem = {
		id: api.id,
		kind: api.kind,
		name: cleanName(api.display_name || api.name),
		about: detail?.description ?? prev?.about ?? '',
		forWho: '',
		// A package is sold below its MRP (shown struck through); a test has no separate price.
		price: api.kind === 'package' && api.min_price != null ? Number(api.min_price) : mrp,
		mrp,
		report: reportText(api.tat),
		fasting: fast.fasting,
		fastingLabel: fast.fastingLabel,
		sample: api.sample_types.join(', ') || 'As advised by the lab',
		tests: api.kind === 'package' ? (api.tests_count ?? includedTests?.length ?? undefined) : undefined,
		bullets: includedTests?.slice(0, 3) ?? [],
		tags: [],
		includedTests,
		preparations,
	}
	cache.set(item.id, item)
	return item
}

type Params = {
	/** Search terms. Empty = browse; several (a concern tile) = one search each, results merged. */
	queries: string[]
	/** 'all' loads the (few) packages and pages through the tests. */
	kind: 'all' | LabKind
	/** The patient's pincode: only what the labs serving it offer is listed (and `coverage` says which labs). */
	pincode?: string
	/** Wait (no request yet) while the pincode is still being worked out, so the unfiltered list is not shown first. */
	paused?: boolean
}

const PAGE = 20
const PACKAGE_LIMIT = 50

export function useLabCatalogue({ queries, kind, pincode, paused }: Params) {
	const [coverage, setCoverage] = useState<ApiCoverage | null>(null)
	const [packages, setPackages] = useState<LabItem[]>([])
	const [tests, setTests] = useState<LabItem[]>([])
	const [loading, setLoading] = useState(true)
	const [loadingMore, setLoadingMore] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [hasMore, setHasMore] = useState(false)
	const [reloadTick, setReloadTick] = useState(0)
	const pageRef = useRef(1)
	// Each (re)load gets a number; answers from an older one are dropped (the user kept typing).
	const runRef = useRef(0)
	const queryKey = queries.join('|')

	useEffect(() => {
		if (paused) {
			setLoading(true)
			return
		}
		const run = ++runRef.current
		const terms = queryKey ? queryKey.split('|') : ['']
		const kinds: LabKind[] = kind === 'all' ? ['package', 'test'] : [kind]
		const load = async () => {
			setLoading(true)
			setError(null)
			try {
				const calls = kinds.flatMap((k) =>
					terms.map(async (q) => ({
						k,
						res: await fetchCatalogue({
							query: q,
							kind: k,
							page: 1,
							limit: k === 'package' ? PACKAGE_LIMIT : PAGE,
							pincode,
						}),
					}))
				)
				const done = await Promise.all(calls)
				if (run !== runRef.current) return
				const merge = (k: LabKind) => {
					const seen = new Set<string>()
					return done
						.filter((d) => d.k === k)
						.flatMap((d) => d.res.items)
						.filter((i) => !seen.has(i.id) && !!seen.add(i.id))
						.map((i) => toLabItem(i))
				}
				setCoverage(done[0]?.res.coverage ?? null)
				setPackages(merge('package'))
				setTests(merge('test'))
				pageRef.current = 1
				// Only a plain browse / single search pages on; merged concern searches show the top matches.
				const testRes = done.find((d) => d.k === 'test' && terms.length === 1)?.res
				setHasMore(!!testRes && testRes.page < testRes.pages)
			} catch (e) {
				if (run === runRef.current) setError(labErrorMessage(e))
			} finally {
				if (run === runRef.current) setLoading(false)
			}
		}
		void load()
	}, [queryKey, kind, pincode, paused, reloadTick])

	const loadMore = useCallback(async () => {
		if (loading || loadingMore || !hasMore) return
		const run = runRef.current
		setLoadingMore(true)
		try {
			const res = await fetchCatalogue({ query: queryKey, kind: 'test', page: pageRef.current + 1, limit: PAGE, pincode })
			if (run !== runRef.current) return
			pageRef.current = res.page
			setTests((cur) => {
				const seen = new Set(cur.map((i) => i.id))
				return [...cur, ...res.items.filter((i) => !seen.has(i.id)).map((i) => toLabItem(i))]
			})
			setHasMore(res.page < res.pages)
		} catch (e) {
			if (run === runRef.current) setError(labErrorMessage(e))
		} finally {
			setLoadingMore(false)
		}
	}, [loading, loadingMore, hasMore, queryKey, pincode])

	const retry = useCallback(() => setReloadTick((n) => n + 1), [])

	return { packages, tests, coverage, loading, loadingMore, error, hasMore, loadMore, retry }
}

/** One item's detail (what it includes, preparation, which labs offer it). Merges it into the cache. */
export function useLabItemDetail(item: LabItem | undefined, addressId: string | null) {
	const [detail, setDetail] = useState<ApiCatalogueDetail | null>(null)
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [enriched, setEnriched] = useState<LabItem | undefined>(undefined)
	// The id whose fetch has finished (either way): the sheet opens once, with the full content, not twice.
	const [settledId, setSettledId] = useState<string | null>(null)
	const id = item?.id
	const kind = item?.kind

	useEffect(() => {
		setDetail(null)
		setEnriched(undefined)
		setError(null)
		setSettledId(null)
		if (!id || !kind) return
		let active = true
		const load = async () => {
			setLoading(true)
			try {
				const d = await fetchCatalogueItem(kind, id, addressId)
				if (!active) return
				setDetail(d)
				setEnriched(toLabItem(d, d))
			} catch (e) {
				if (active) setError(labErrorMessage(e))
			} finally {
				if (active) {
					setLoading(false)
					setSettledId(id)
				}
			}
		}
		void load()
		return () => {
			active = false
		}
	}, [id, kind, addressId])

	return { detail, item: enriched ?? item, loading, error, ready: !!id && settledId === id }
}
