// src/features/doctor/components/useReferDoctors.ts
//
// The doctors a request can be referred to: the doctor's FAVOURITES first (their colleagues; the star of a row adds or removes one),
// then every other doctor, loaded a page at a time (the doctor search, `PAGE_LIMIT` per page) and searched (debounced) once something
// is typed (a favourite shows while it matches the search). `loadMore` asks for the next page: the sheet calls it when the list is
// scrolled near its end, so a long list never loads at once. Real data from the doctors service, nothing simulated. Starts again from
// the first page each time the sheet opens (`active`) and each time the search text changes.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Toast from 'react-native-toast-message'
import type { FavouriteDoctorListItem } from '../search/components/FavouriteDoctorList'
import { getDoctors, getFavouriteDoctors, toggleFavouriteDoctor } from '../doctorService'

const PAGE_LIMIT = 20
const SEARCH_DEBOUNCE_MS = 400

const toDoctor = (d: any): FavouriteDoctorListItem => ({
	id: d.id,
	name: d.name,
	avatar_s3_key: d.avatar_s3_key ?? null,
	location: d.location ?? '',
	experience_years: d.experience_years ?? null,
	specialities: d.specialities ?? [],
	is_verified: d.is_verified,
})

export function useReferDoctors(active: boolean) {
	const [query, setQuery] = useState('')
	const [doctors, setDoctors] = useState<FavouriteDoctorListItem[]>([])
	const [loading, setLoading] = useState(false)
	const [loadingMore, setLoadingMore] = useState(false)
	const [hasMore, setHasMore] = useState(false)
	const [loadFailed, setLoadFailed] = useState(false)
	const [favourites, setFavourites] = useState<FavouriteDoctorListItem[]>([])
	// Rows whose favourite call is running, so a quick second tap does not send a second toggle.
	const [pendingIds, setPendingIds] = useState<string[]>([])
	const page = useRef(0)
	const fetching = useRef(false)
	// Bumped by every new list (a new search, the sheet opening again): a page that comes back for an older one is dropped.
	const generation = useRef(0)
	const text = query.trim()

	const fetchPage = useCallback(async (next: number, search: string, mine: number) => {
		fetching.current = true
		try {
			const res = await getDoctors({ page: next, limit: PAGE_LIMIT, ...(search ? { search } : {}) })
			if (mine !== generation.current) return
			const batch = res.success ? (res.data ?? []).map(toDoctor) : []
			page.current = next
			setHasMore(batch.length >= PAGE_LIMIT)
			setLoadFailed(false)
			// A page can repeat a doctor the previous one ended on: keep each once.
			setDoctors((prev) => {
				if (next === 1) return batch
				const seen = new Set(prev.map((d) => d.id))
				return [...prev, ...batch.filter((d) => !seen.has(d.id))]
			})
		} catch {
			if (mine !== generation.current) return
			setLoadFailed(true)
			setHasMore(false)
			if (next === 1) setDoctors([])
		} finally {
			if (mine === generation.current) {
				fetching.current = false
				setLoading(false)
				setLoadingMore(false)
			}
		}
	}, [])

	// The first page: when the sheet opens and whenever the search text settles.
	useEffect(() => {
		if (!active) return
		const mine = ++generation.current
		fetching.current = false
		page.current = 0
		setLoading(true)
		setLoadingMore(false)
		setHasMore(false)
		const timer = setTimeout(() => void fetchPage(1, text, mine), text ? SEARCH_DEBOUNCE_MS : 0)
		return () => clearTimeout(timer)
	}, [active, text, fetchPage])

	// A new opening starts with an empty search.
	useEffect(() => {
		if (active) setQuery('')
	}, [active])

	// The favourites, read each time the sheet opens. Best-effort: without them the list is simply all doctors.
	useEffect(() => {
		if (!active) return
		let live = true
		const load = async () => {
			try {
				const res = await getFavouriteDoctors()
				if (live && res.success) setFavourites((res.data?.favourites ?? []).map(toDoctor))
			} catch {
				// no favourites section
			}
		}
		void load()
		return () => {
			live = false
		}
	}, [active])

	/** Adds the doctor to the favourites or removes them. The row changes at once; a failure puts it back and says so. */
	const toggleFavourite = useCallback(
		async (doctor: FavouriteDoctorListItem) => {
			if (pendingIds.includes(doctor.id)) return
			const wasFavourite = favourites.some((d) => d.id === doctor.id)
			const apply = (on: boolean) =>
				setFavourites((prev) =>
					on
						? prev.some((d) => d.id === doctor.id)
							? prev
							: [doctor, ...prev]
						: prev.filter((d) => d.id !== doctor.id)
				)
			apply(!wasFavourite)
			setPendingIds((prev) => [...prev, doctor.id])
			try {
				const res = await toggleFavouriteDoctor(doctor.id, { skipGlobalError: true })
				if (res.success === false) throw new Error(res.message)
			} catch {
				apply(wasFavourite)
				Toast.show({ type: 'error', text1: 'Couldn’t update your favourites', text2: 'Please try again.' })
			} finally {
				setPendingIds((prev) => prev.filter((id) => id !== doctor.id))
			}
		},
		[favourites, pendingIds]
	)

	// Favourites first (those that match the search), then the other doctors in the order the server gave them.
	const list = useMemo(() => {
		const needle = text.toLowerCase()
		const matches = (d: FavouriteDoctorListItem) =>
			!needle || [d.name, d.location, ...d.specialities].join(' ').toLowerCase().includes(needle)
		const favouriteIds = new Set(favourites.map((d) => d.id))
		return [...favourites.filter(matches), ...doctors.filter((d) => !favouriteIds.has(d.id))]
	}, [favourites, doctors, text])

	const isFavourite = useCallback((id: string) => favourites.some((d) => d.id === id), [favourites])

	/** The next page, if there is one and none is loading: safe to call as often as the list asks. */
	const loadMore = useCallback(() => {
		if (!active || fetching.current || !hasMore || loading) return
		setLoadingMore(true)
		void fetchPage(page.current + 1, text, generation.current)
	}, [active, hasMore, loading, text, fetchPage])

	return {
		query,
		setQuery,
		searching: loading,
		doctors: list,
		loadingMore,
		loadMore,
		loadFailed,
		isFavourite,
		toggleFavourite,
		pendingIds,
	}
}
