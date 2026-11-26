// src/features/health-feed/seenQuestions.ts
//
// "N new" on the My questions / My answers cards: which answers arrived since the user last opened a question. The backend does not keep
// what a user has seen, so the moment of the last opening of each question is stored on this device (AsyncStorage, like the saved reads):
// it survives restarts and does not follow the user to another phone. A question never opened counts answers as new only if they came
// after the moment this first ran on the device (`baseline`), so a patient with answers from before is not told they are all new.
// Every screen that calls useSeenQuestions() shares one map, so opening a question clears its chip on the list behind it.

import { useCallback, useEffect, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import type { PatientQuestion } from '../../services/qaService'

const KEY = 'qa_seen_questions_v1'
const BASELINE_KEY = 'qa_seen_baseline_v1'

let current: Record<string, string> = {}
let loadPromise: Promise<void> | null = null
let loaded = false
/** When the feature first ran on this device (ISO); what "seen" means for a question never opened. */
let baseline = ''
const listeners = new Set<(map: Record<string, string>) => void>()

const publish = (map: Record<string, string>) => {
	current = map
	listeners.forEach((fn) => fn(map))
}

/** Reads what is saved, once; everything that reads or writes the map waits for it. */
function loadOnce(): Promise<void> {
	loadPromise ??= (async () => {
		try {
			const parsed = JSON.parse((await AsyncStorage.getItem(KEY)) ?? '{}')
			if (parsed && typeof parsed === 'object') publish({ ...parsed, ...current })
		} catch {
			// keep the empty map
		}
		try {
			baseline = (await AsyncStorage.getItem(BASELINE_KEY)) ?? ''
			if (!baseline) {
				baseline = new Date().toISOString()
				await AsyncStorage.setItem(BASELINE_KEY, baseline)
			}
		} catch {
			baseline ||= new Date().toISOString() // kept in memory for this session
		}
		loaded = true
		publish({ ...current }) // the screens drawn before this finished draw again with the baseline
	})()
	return loadPromise
}

export function useSeenQuestions() {
	const [seen, setSeen] = useState<Record<string, string>>(current)
	// True once the saved map has been read: until then `seen` may be missing what the user already saw.
	const [ready, setReady] = useState(loaded)

	useEffect(() => {
		listeners.add(setSeen)
		let alive = true
		const run = async () => {
			await loadOnce()
			if (alive) setReady(true)
		}
		void run()
		return () => {
			alive = false
			listeners.delete(setSeen)
		}
	}, [])

	/** Records that the user has just seen everything in the question. */
	const markSeen = useCallback(async (questionId: string) => {
		await loadOnce()
		const next = { ...current, [questionId]: new Date().toISOString() }
		publish(next)
		try {
			await AsyncStorage.setItem(KEY, JSON.stringify(next))
		} catch {
			// kept in memory for this session
		}
	}, [])

	return { seen, markSeen, ready }
}

/** An API timestamp as a number; the server sends UTC without a zone. */
const stamp = (iso: string) => new Date(/(Z|[+-]\d{2}:?\d{2})$/i.test(iso) ? iso : `${iso}Z`).getTime()

/** The moment after which an answer is new: when the question was last opened, else when this first ran; null until that is known. */
const sinceOf = (seenAt: string | undefined): number | null => {
	if (seenAt) return new Date(seenAt).getTime()
	return loaded ? new Date(baseline).getTime() : null
}

/**
 * How many answers are new to the user: those given after they last opened the question (for one never opened, after this first ran).
 * `skipMine` leaves out the doctor's own answer ("My answers": only other doctors' answers are news).
 */
export function newAnswerCount(q: PatientQuestion, seenAt: string | undefined, skipMine = false): number {
	const since = sinceOf(seenAt)
	if (since === null) return 0
	return q.answers.filter((a) => !(skipMine && a.is_mine) && stamp(a.created_at) > since).length
}

/** Whether one answer is new to the user (the "New" chip on an answer). */
export const isNewAnswer = (createdAt: string, seenAt: string | undefined): boolean => {
	const since = sinceOf(seenAt)
	return since !== null && stamp(createdAt) > since
}
