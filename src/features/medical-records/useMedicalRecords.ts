// src/features/medical-records/useMedicalRecords.ts
//
// The records the Medical records screen shows: each person's list is fetched once, when the family list is ready, and kept per
// person, so switching the person in the header is instant and the "whose record" step can say how many each already has. One
// request gives a person's whole list (their uploads and the prescriptions of their visits). A save or a delete changes the list at
// once (no second request) and is kept even if a fetch that started earlier finishes later. This is the one place that knows
// where records come from; the screen only reads `byMember`.

import { useCallback, useEffect, useRef, useState } from 'react'
import { SELF_MEMBER_KEY, type FamilyMemberOption } from '../../hooks/useFamilyMembers'
import { listRecords, recordsErrorMessage } from './medicalRecordsService'
import type { MedicalRecord, RecordApi } from './medicalRecordsTypes'
import { recordFromApi } from './medicalRecordsView'

export type MemberRecords = {
	records: MedicalRecord[]
	/** 'loading' until the first answer. 'error' means the fetch failed: what was already there is still in `records`. */
	status: 'loading' | 'ready' | 'error'
	error: string | null
}

/** What was added or removed here since some point, so a fetch that began before it can be corrected when it ends. */
type Edits = { added: { seq: number; record: MedicalRecord }[]; removed: { seq: number; id: string }[] }

/** The id the list endpoint takes: none for the signed-in patient (the server knows who is asking), a family member's own id. */
const patientIdOf = (member: FamilyMemberOption): string | undefined =>
	member.key === SELF_MEMBER_KEY ? undefined : (member.publicId ?? member.id)

/**
 * @param members The family list (`useFamilyMembers().members`).
 * @param familyReady The family list has finished loading, so every person's id is known.
 */
export function useMedicalRecords(members: FamilyMemberOption[], familyReady: boolean) {
	const [byMember, setByMember] = useState<Record<string, MemberRecords>>({})
	// A person is fetched once automatically; after that only `refresh` fetches again.
	const requested = useRef(new Set<string>())
	const sequence = useRef(0)
	const edits = useRef<Record<string, Edits>>({})

	const settle = useCallback((key: string, next: (previous: MemberRecords | undefined) => MemberRecords) => {
		setByMember((all) => ({ ...all, [key]: next(all[key]) }))
	}, [])

	const load = useCallback(
		async (member: FamilyMemberOption) => {
			const key = member.key
			const patientId = patientIdOf(member)
			if (key !== SELF_MEMBER_KEY && !patientId) {
				settle(key, (previous) => ({
					records: previous?.records ?? [],
					status: 'error',
					error: 'These records can’t be loaded yet. Pull down to try again.',
				}))
				return
			}
			settle(key, (previous) => ({ records: previous?.records ?? [], status: 'loading', error: null }))

			const startedAt = sequence.current
			try {
				const fetched = (await listRecords(patientId)).map((api) => recordFromApi(api, key))
				// What the person saved or deleted while this fetch was running: its answer may not know about it yet.
				const since = edits.current[key]
				const gone = new Set((since?.removed ?? []).filter((e) => e.seq > startedAt).map((e) => e.id))
				const known = new Set(fetched.map((record) => record.id))
				const kept = (since?.added ?? []).filter(
					(e) => e.seq > startedAt && !known.has(e.record.id) && !gone.has(e.record.id)
				)
				settle(key, () => ({
					records: [...kept.map((e) => e.record), ...fetched.filter((record) => !gone.has(record.id))],
					status: 'ready',
					error: null,
				}))
			} catch (error) {
				settle(key, (previous) => ({
					records: previous?.records ?? [],
					status: 'error',
					error: recordsErrorMessage(error),
				}))
			}
		},
		[settle]
	)

	const keys = members.map((m) => m.key).join('|')
	useEffect(() => {
		if (!familyReady) return
		for (const member of members) {
			if (requested.current.has(member.key)) continue
			requested.current.add(member.key)
			void load(member)
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps -- `keys` stands for `members` (a new array on every render)
	}, [familyReady, keys, load])

	const refresh = useCallback(
		(member: FamilyMemberOption) => {
			requested.current.add(member.key)
			return load(member)
		},
		[load]
	)

	const editsOf = useCallback(
		(memberKey: string): Edits => (edits.current[memberKey] ??= { added: [], removed: [] }),
		[]
	)

	/** Put the record a save returned at the top of that person's list. */
	const addRecord = useCallback(
		(memberKey: string, api: RecordApi) => {
			const record = recordFromApi(api, memberKey)
			editsOf(memberKey).added.push({ seq: ++sequence.current, record })
			settle(memberKey, (previous) => ({
				records: [record, ...(previous?.records ?? [])],
				// A list that failed to load stays marked as failed: saving one record does not make the others appear.
				status: previous?.status ?? 'ready',
				error: previous?.error ?? null,
			}))
		},
		[settle, editsOf]
	)

	/** Take a deleted record out of that person's list. */
	const removeRecord = useCallback(
		(memberKey: string, recordId: string) => {
			editsOf(memberKey).removed.push({ seq: ++sequence.current, id: recordId })
			settle(memberKey, (previous) => ({
				records: (previous?.records ?? []).filter((record) => record.id !== recordId),
				status: previous?.status ?? 'ready',
				error: previous?.error ?? null,
			}))
		},
		[settle, editsOf]
	)

	return { byMember, refresh, addRecord, removeRecord }
}
