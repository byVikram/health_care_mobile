// src/features/consultation/useRecordVitals.ts
//
// State and saving for the Notes tab's vitals: what is recorded today (read from the patient's recent readings), whether the sheet is
// open, and the save (one POST per vital type through recordVitals). The draft being typed lives in the sheet itself (a keystroke
// re-renders the sheet, not the whole consultation page). The page owns the latest readings; a save hands it the records the server
// created (`onSaved`) and the card follows from that data, so there is no separate "recorded" flag to keep in step and the card does
// not depend on a second request succeeding.

import { useCallback, useMemo, useRef, useState } from 'react'
import Toast from 'react-native-toast-message'
import { recordVitals, type VitalRecord } from './VitalsService'
import {
	buildVitalChips,
	buildVitalEntries,
	describeLastReading,
	flagSummary,
	todaysVitals,
	validateVitalValues,
	type LatestVitals,
	type VitalValues,
} from './vitalsEntry'

/** Whether the recent readings (what "today" is built from) have been fetched: until they have, "not recorded" is not known. */
export type RecentLoad = 'loading' | 'ready' | 'error'

type Options = {
	/** The patient's public id (the same one the page fetches the latest vitals with). */
	patientId: string
	/** The readings of the last days (see getRecentVitals): today's card is built from these. */
	recentVitals: VitalRecord[]
	recentLoad: RecentLoad
	/** Fetch the recent readings again (after a failure). */
	onRetryRecent: () => void
	/** The latest record of each type: only for the empty card's "Last on 12 Jun" line. */
	latestVitals: LatestVitals
	/** The records a save created (one per vital type), so the page can show them at once. */
	onSaved: (saved: VitalRecord[]) => void
}

export function useRecordVitals({
	patientId,
	recentVitals,
	recentLoad,
	onRetryRecent,
	latestVitals,
	onSaved,
}: Options) {
	const today = useMemo(() => todaysVitals(recentVitals), [recentVitals])
	const chips = useMemo(() => buildVitalChips(today.values), [today])
	const flags = useMemo(() => flagSummary(chips), [chips])
	const lastReading = useMemo(() => describeLastReading(latestVitals), [latestVitals])

	const [visible, setVisible] = useState(false)
	const [saving, setSaving] = useState(false)
	// Set at once on the first tap: `saving` only changes on the next render, so a quick double tap could still send twice.
	const inFlight = useRef(false)

	// The sheet opens on what is recorded today (empty when nothing is yet), but only once that is known: while the recent readings
	// are loading or failed to load, an empty sheet would invite entering readings that were already taken and posting them twice.
	const open = useCallback(() => {
		if (recentLoad === 'loading') {
			Toast.show({ type: 'info', text1: 'Checking today’s readings…' })
			return
		}
		if (recentLoad === 'error') {
			Toast.show({ type: 'error', text1: 'Couldn’t load today’s readings', text2: 'Trying again…' })
			onRetryRecent()
			return
		}
		setVisible(true)
	}, [recentLoad, onRetryRecent])

	const close = useCallback(() => setVisible(false), [])

	const save = useCallback(
		async (draft: VitalValues) => {
			if (inFlight.current) return
			if (!patientId) {
				Toast.show({ type: 'error', text1: 'The patient is still loading', text2: 'Try again in a moment.' })
				return
			}
			const problem = validateVitalValues(draft)
			if (problem) {
				Toast.show({ type: 'error', text1: problem })
				return
			}

			// Only the readings that are new or changed: an edit, or a retry after a partial failure, never repeats a saved one.
			const entries = buildVitalEntries(draft, today.values)
			if (!entries.length) {
				// Nothing new to send (also what happens when a reading is only cleared: the record cannot be removed).
				Toast.show({ type: 'info', text1: 'No changes to save' })
				setVisible(false)
				return
			}

			inFlight.current = true
			setSaving(true)
			try {
				const { saved, failed, reason } = await recordVitals(patientId, entries)
				onSaved(saved)
				if (failed.length) {
					// What did save is now in `today`, so pressing Save again sends only what is still missing.
					Toast.show({
						type: 'error',
						text1: `${failed.length} of ${entries.length} readings could not be saved`,
						text2: `${reason ?? 'Something went wrong.'} Try again to save the rest.`,
					})
				} else {
					Toast.show({ type: 'success', text1: 'Vitals saved' })
					setVisible(false)
				}
			} finally {
				inFlight.current = false
				setSaving(false)
			}
		},
		[patientId, today, onSaved]
	)

	const recorded = useMemo(
		() => ({
			chips,
			recordedAt: today.recordedAt,
			flags,
			lastReading,
			loadState: recentLoad,
			onRetry: onRetryRecent,
		}),
		[chips, today.recordedAt, flags, lastReading, recentLoad, onRetryRecent]
	)

	return {
		recorded,
		openSheet: open,
		sheet: { visible, initial: today.values, saving, close, save },
	}
}
