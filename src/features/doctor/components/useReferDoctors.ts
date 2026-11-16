// src/features/doctor/components/useReferDoctors.ts
//
// The doctors a request can be referred to: the doctor's favourites (their network) while the search box is empty, the doctor search
// (debounced) once something is typed. Real data from the favourites and doctors services, nothing simulated. Reloads the favourites
// each time the sheet opens (`active`).

import { useEffect, useState } from 'react'
import type { FavouriteDoctorListItem } from '../search/components/FavouriteDoctorList'
import { getDoctors, getFavouriteDoctors } from '../doctorService'

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
	const [network, setNetwork] = useState<FavouriteDoctorListItem[]>([])
	const [found, setFound] = useState<FavouriteDoctorListItem[]>([])
	const [searching, setSearching] = useState(false)

	useEffect(() => {
		if (!active) return
		setQuery('')
		let live = true
		void (async () => {
			try {
				const res = await getFavouriteDoctors()
				if (live && res.success) setNetwork((res.data?.favourites ?? []).map(toDoctor))
			} catch {
				// Best-effort: the list stays empty and search still works.
			}
		})()
		return () => {
			live = false
		}
	}, [active])

	useEffect(() => {
		if (!active) return
		const text = query.trim()
		if (!text) {
			setFound([])
			return
		}
		let live = true
		setSearching(true)
		const timer = setTimeout(async () => {
			try {
				const res = await getDoctors({ search: text, limit: 20 })
				if (live && res.success) setFound((res.data ?? []).map(toDoctor))
			} catch {
				if (live) setFound([])
			} finally {
				if (live) setSearching(false)
			}
		}, 400)
		return () => {
			live = false
			clearTimeout(timer)
		}
	}, [active, query])

	return { query, setQuery, searching, doctors: query.trim() ? found : network }
}
