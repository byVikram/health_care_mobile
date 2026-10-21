// src/features/health-feed/savedReads.ts
//
// Bookmarked articles/blogs ("Saved reads"). The backend has no bookmarks yet, so they're stored on this
// device (AsyncStorage) and survive restarts; they don't follow the user to another phone. Every screen
// that calls useSavedReads() shares one list, so a bookmark toggled on the article page shows on the list.

import { useCallback, useEffect, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'

const KEY = 'health_reads_saved_v1'

let current: string[] = []
let loaded = false
const listeners = new Set<(ids: string[]) => void>()

const publish = (ids: string[]) => {
	current = ids
	listeners.forEach((fn) => fn(ids))
}

async function loadOnce() {
	if (loaded) return
	loaded = true
	try {
		const parsed = JSON.parse((await AsyncStorage.getItem(KEY)) ?? '[]')
		if (Array.isArray(parsed)) publish(parsed.filter((x) => typeof x === 'string'))
	} catch {
		// keep the empty list
	}
}

export function useSavedReads() {
	const [saved, setSaved] = useState<string[]>(current)

	useEffect(() => {
		listeners.add(setSaved)
		void loadOnce()
		return () => {
			listeners.delete(setSaved)
		}
	}, [])

	const toggle = useCallback((id: string) => {
		const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id]
		publish(next)
		AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {})
	}, [])

	return { saved, isSaved: (id: string) => saved.includes(id), toggle }
}
