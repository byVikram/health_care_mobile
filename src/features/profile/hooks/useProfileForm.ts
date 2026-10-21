// Saved-vs-draft form state for the profile edit screens: load once, edit a draft, know whether anything
// changed (drives AppSaveFooter's label), validate with a Zod schema on save, and show a toast / error
// modal. `save` receives the draft and returns the new saved values (usually re-mapped from the API reply).

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Toast from 'react-native-toast-message'
import type { z } from 'zod'
import { getFieldErrors } from '../../../validation/profileSchemas'

type Options<T> = {
	load: () => Promise<T>
	save: (draft: T, saved: T) => Promise<T>
	schema?: z.ZodTypeAny
	/** Toast after a successful save. Defaults to "Saved". */
	successMessage?: string
}

const equal = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

export function useProfileForm<T extends object>({ load, save, schema, successMessage = 'Saved' }: Options<T>) {
	const [saved, setSaved] = useState<T | null>(null)
	const [draft, setDraft] = useState<T | null>(null)
	const [loading, setLoading] = useState(true)
	const [loadError, setLoadError] = useState<string | null>(null)
	const [saving, setSaving] = useState(false)
	const [errors, setErrors] = useState<Record<string, string>>({})
	const [saveError, setSaveError] = useState<string | null>(null)
	const loadRef = useRef(load)
	loadRef.current = load

	const reload = useCallback(async () => {
		setLoading(true)
		setLoadError(null)
		try {
			const value = await loadRef.current()
			setSaved(value)
			setDraft(value)
		} catch (e) {
			setLoadError(e instanceof Error ? e.message : 'Could not load your details')
		} finally {
			setLoading(false)
		}
	}, [])

	useEffect(() => {
		void reload()
	}, [reload])

	const set = useCallback(<K extends keyof T>(key: K, value: T[K]) => {
		setDraft((cur) => (cur ? { ...cur, [key]: value } : cur))
		setErrors((cur) => {
			if (!cur[key as string]) return cur
			const next = { ...cur }
			delete next[key as string]
			return next
		})
	}, [])

	const dirty = useMemo(() => !!draft && !!saved && !equal(draft, saved), [draft, saved])

	const submit = useCallback(async () => {
		if (!draft || !saved) return false
		if (schema) {
			const fieldErrors = getFieldErrors(schema, draft)
			if (Object.keys(fieldErrors).length) {
				setErrors(fieldErrors)
				return false
			}
		}
		setErrors({})
		setSaving(true)
		try {
			const next = await save(draft, saved)
			setSaved(next)
			setDraft(next)
			Toast.show({ type: 'success', text1: successMessage })
			return true
		} catch (e) {
			setSaveError(e instanceof Error ? e.message : 'Please try again.')
			return false
		} finally {
			setSaving(false)
		}
	}, [draft, saved, schema, save, successMessage])

	return {
		draft,
		saved,
		set,
		setDraft,
		dirty,
		loading,
		loadError,
		reload,
		saving,
		submit,
		errors,
		setErrors,
		saveError,
		clearSaveError: () => setSaveError(null),
	}
}
