// src/features/profile/patient/familyStore.ts
//
// The signed-in patient's family list (self first), kept once for the whole app so the drawer, the booking and
// Care AI pickers and the profile screens share it instead of each fetching it when they open. Same module-store
// pattern as labBookingStore.
//
// It is loaded once (`ensureLoaded`), and after that only changes when the app itself changes something:
//   - a screen that fetches the list writes it in (`set`: getFamilyMembers does this for every caller),
//   - a change to a member or to the patient's own details refreshes it (`refreshIfLoaded`, called from the
//     services that make those changes).
// No timer. A change made on another device shows after the Family screen is opened (it fetches its own list) or
// after the app restarts. Cleared on logout.

import { registerSessionCache } from '../../../utils/sessionCache'
import type { FamilyMember } from './PatientProfileService'

type Fetcher = () => Promise<FamilyMember[]>

let members: FamilyMember[] | null = null
let fetcher: Fetcher | null = null
let inflight: Promise<void> | null = null
let again = false
// Bumped on logout, so a fetch that was still running for the previous user is dropped, not stored.
let generation = 0
const listeners = new Set<() => void>()

const emit = () => listeners.forEach((l) => l())

export const familyStore = {
	get: () => members,

	subscribe(listener: () => void) {
		listeners.add(listener)
		return () => {
			listeners.delete(listener)
		}
	},

	/** Written by whatever fetched the list (see getFamilyMembers). */
	set(list: FamilyMember[]) {
		members = list
		emit()
	},

	/** The service module registers how to fetch (the store never imports it, so there is no import cycle). */
	registerFetcher(fn: Fetcher) {
		fetcher = fn
	},

	/** Fetches now. One fetch at a time: a change made while one is running schedules one more behind it. */
	refresh(): Promise<void> {
		if (!fetcher) return Promise.resolve()
		if (inflight) {
			again = true
			return inflight
		}
		const run = fetcher
		const startedFor = generation
		inflight = (async () => {
			try {
				do {
					again = false
					const list = await run()
					if (startedFor !== generation) return
					members = list
					emit()
				} while (again)
			} catch {
				// Soft-fail: keep what we have; the next change or screen tries again.
			} finally {
				inflight = null
			}
		})()
		return inflight
	},

	/** Loads the list the first time anyone needs it; later callers reuse it. */
	ensureLoaded(): Promise<void> {
		return members ? Promise.resolve() : familyStore.refresh()
	},

	/** After a change: refresh, but only when the list has been loaded (a doctor's photo change must not fetch it). */
	refreshIfLoaded(): Promise<void> {
		return members ? familyStore.refresh() : Promise.resolve()
	},

	/** Resolves when the fetch that is running (if any) is done. */
	settled(): Promise<void> {
		return inflight ?? Promise.resolve()
	},
}

registerSessionCache(() => {
	generation += 1
	members = null
	again = false
	emit()
})
