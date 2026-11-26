// src/features/doctor/components/useReferDoctors.ts
//
// The doctors a request can be referred to: the doctor's FAVOURITES first (their colleagues; the bookmark of a row adds or removes one),
// then every other doctor, loaded a page at a time (the doctor search, `PAGE_LIMIT` per page), searched (debounced) once something is
// typed and narrowed to one speciality by the SERVER (`specialityId`, the chips come from the specialities lookup). The signed-in
// doctor is left out by the server (`exclude_self`). A favourite shows while it matches the search and the speciality. `loadMore` asks
// for the next page: the sheet calls it when the list is scrolled near its end, so a long list never loads at once. Real data from the
// doctors service, nothing simulated. Starts again from the first page each time the sheet opens (`active`) and each time the search
// text or the speciality changes.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { FavouriteDoctorListItem } from '../search/components/FavouriteDoctorList'
import type { SpecialityItem } from '../../../types/speciality'
import { getDoctors, getFavouriteDoctors, getSpecialities, toggleFavouriteDoctor } from '../doctorService'

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
	// The chips (best-effort: without them the list is simply not narrowable) and the picked one ('' = all).
	const [specialities, setSpecialities] = useState<SpecialityItem[]>([])
	const [specialityId, setSpecialityId] = useState('')
	// Why the last favourite change did not go through (shown by the sheet inline; cleared by the next try and when the sheet opens).
	const [favouriteError, setFavouriteError] = useState<string | null>(null)
	// Rows whose favourite call is running, so a quick second tap does not send a second toggle.
	const [pendingIds, setPendingIds] = useState<string[]>([])
	const page = useRef(0)
	const fetching = useRef(false)
	// Bumped by every new list (a new search, the sheet opening again): a page that comes back for an older one is dropped.
	const generation = useRef(0)
	const text = query.trim()

	const fetchPage = useCallback(async (next: number, search: string, speciality: string, mine: number) => {
		fetching.current = true
		try {
			const res = await getDoctors({
				page: next,
				limit: PAGE_LIMIT,
				exclude_self: true,
				...(search ? { search } : {}),
				...(speciality ? { speciality_id: speciality } : {}),
			})
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
		const timer = setTimeout(() => void fetchPage(1, text, specialityId, mine), text ? SEARCH_DEBOUNCE_MS : 0)
		return () => clearTimeout(timer)
	}, [active, text, specialityId, fetchPage])

	// A new opening starts with an empty search, no speciality picked and no old message.
	useEffect(() => {
		if (!active) return
		setQuery('')
		setSpecialityId('')
		setFavouriteError(null)
	}, [active])

	// The speciality chips, read each time the sheet opens. Best-effort.
	useEffect(() => {
		if (!active) return
		let live = true
		const load = async () => {
			try {
				const res = await getSpecialities()
				if (live) setSpecialities(res.data ?? [])
			} catch {
				// no chips
			}
		}
		void load()
		return () => {
			live = false
		}
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

	/** Adds the doctor to the favourites or removes them. The row changes at once; a failure puts it back and sets `favouriteError`. */
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
			setFavouriteError(null)
			setPendingIds((prev) => [...prev, doctor.id])
			try {
				const res = await toggleFavouriteDoctor(doctor.id, { skipGlobalError: true })
				if (res.success === false) throw new Error(res.message)
			} catch {
				apply(wasFavourite)
				setFavouriteError('Couldn’t update your saved doctors. Please try again.')
			} finally {
				setPendingIds((prev) => prev.filter((id) => id !== doctor.id))
			}
		},
		[favourites, pendingIds]
	)

	// Favourites first (those that match the search and the speciality), then the other doctors in the order the server gave them (the
	// server already applied the search and the speciality to those).
	const list = useMemo(() => {
		const needle = text.toLowerCase()
		const label = specialities.find((s) => s.id === specialityId)?.label
		const matches = (d: FavouriteDoctorListItem) =>
			(!needle || [d.name, d.location, ...d.specialities].join(' ').toLowerCase().includes(needle)) &&
			(!label || d.specialities.includes(label))
		const favouriteIds = new Set(favourites.map((d) => d.id))
		return [...favourites.filter(matches), ...doctors.filter((d) => !favouriteIds.has(d.id))]
	}, [favourites, doctors, text, specialities, specialityId])

	const isFavourite = useCallback((id: string) => favourites.some((d) => d.id === id), [favourites])

	/** The next page, if there is one and none is loading: safe to call as often as the list asks. */
	const loadMore = useCallback(() => {
		if (!active || fetching.current || !hasMore || loading) return
		setLoadingMore(true)
		void fetchPage(page.current + 1, text, specialityId, generation.current)
	}, [active, hasMore, loading, text, specialityId, fetchPage])

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
		favouriteError,
		specialities,
		specialityId,
		setSpecialityId,
	}
}
