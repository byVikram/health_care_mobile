import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { useAuth } from '../context/AuthContext'
import Toast from 'react-native-toast-message'
import { FamilyMember as ApiFamilyMember, createFamilyMember } from '../features/profile/patient/PatientProfileService'
import { familyStore } from '../features/profile/patient/familyStore'
import { toBackendRelation } from '../features/profile/config/profileOptions'
import type { FamilyMemberDraft } from '../components/common/booking/AppFamilyMemberSheet'

/** One bookable person: the signed-in patient ("self") or one of their family members. */
export interface FamilyMemberOption {
	/** Patient public id; undefined for "self" so the backend books for the caller. */
	id?: string
	/** Stable list key: 'self' for the caller, otherwise the member's public id. */
	key: string
	name: string
	/** Display relation, e.g. 'Self', 'Spouse', 'Child'. */
	relation: string
	avatar?: string | null
	age?: string | number
	gender?: string
	bloodGroup?: string
	/** Public id for every member including self (when known) — for flows that always send one. */
	publicId?: string
	/** Relation exactly as the API returned it (relation || relationship), 'Self' for the caller. */
	apiRelation?: string
}

export const SELF_MEMBER_KEY = 'self'

const isSelfMember = (m: ApiFamilyMember) => m.is_self || m.relation === 'SELF' || m.relationship === 'Self'

/** "15/01/1990" or "15-01-1990" (as typed in the booking sheet) -> "1990-01-15", else null. */
const draftDobToIso = (value: string): string | null => {
	const m = value.trim().match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/)
	if (!m) return null
	const [, d, mo, y] = m
	const date = new Date(Number(y), Number(mo) - 1, Number(d))
	if (date.getDate() !== Number(d) || date > new Date()) return null
	return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`
}

const capitalise = (value: string) => value.charAt(0).toUpperCase() + value.slice(1).toLowerCase()

const mapFamilyMember = (m: ApiFamilyMember): FamilyMemberOption => {
	const id = m.public_id || m.publicId || String(m.id)
	const rel = m.relationship || m.relation || 'Family member'
	return {
		id,
		key: id,
		name: m.name,
		relation: capitalise(rel),
		avatar: m.avatar_s3_key,
		age: m.age || undefined,
		gender: m.gender || undefined,
		bloodGroup: m.blood_group || undefined,
		publicId: id,
		apiRelation: m.relation || m.relationship || 'Family Member',
	}
}

/**
 * The caller plus their family members (self always first). The list is fetched once for the whole app (see
 * familyStore) and refreshed when the app changes the family or the patient's own details, so every picker shares
 * it and none fetches on open. Until it is loaded — or if the fetch fails / returns nothing — the list is just "self"
 * built from `useAuth().user`, so pickers still work.
 */
export function useFamilyMembers() {
	const { user } = useAuth()
	const fallbackSelf: FamilyMemberOption = useMemo(
		() => ({
			key: SELF_MEMBER_KEY,
			name: user?.name || 'Myself',
			relation: 'Self',
			avatar: user?.avatar,
			publicId: user?.id,
			apiRelation: 'Self',
		}),
		[user?.name, user?.avatar, user?.id]
	)

	const stored = useSyncExternalStore(familyStore.subscribe, familyStore.get, familyStore.get)
	const apiMembers: ApiFamilyMember[] | null = stored && stored.length ? stored : null
	const [loading, setLoading] = useState(stored == null)

	// The first screen to need the list loads it; every other one finds it loaded.
	useEffect(() => {
		let active = true
		void familyStore.ensureLoaded().finally(() => {
			if (active) setLoading(false)
		})
		return () => {
			active = false
		}
	}, [])

	/** Fetch the list again now (after something this hook's caller changed outside the app's own services). */
	const load = useCallback(async () => {
		setLoading(true)
		try {
			await familyStore.refresh()
		} finally {
			setLoading(false)
		}
	}, [])

	const members = useMemo<FamilyMemberOption[]>(() => {
		if (!apiMembers) return [fallbackSelf]
		const self = apiMembers.find(isSelfMember)
		const selfOption: FamilyMemberOption = self
			? {
					key: SELF_MEMBER_KEY,
					name: self.name,
					relation: 'Self',
					avatar: self.avatar_s3_key,
					age: self.age || undefined,
					gender: self.gender || undefined,
					bloodGroup: self.blood_group || undefined,
					publicId: self.public_id || self.publicId || String(self.id),
					apiRelation: 'Self',
				}
			: fallbackSelf
		return [selfOption, ...apiMembers.filter((m) => m !== self).map(mapFamilyMember)]
	}, [apiMembers, fallbackSelf])

	/**
	 * Saves a member added from AppFamilyMemberSheet ("Add family member") and reloads the list.
	 * Resolves the new member's key (use it as the selected patient), or null when saving failed.
	 */
	const addFromDraft = useCallback(
		async (draft: FamilyMemberDraft): Promise<string | null> => {
			try {
				const created = await createFamilyMember({
					name: draft.name,
					relation: toBackendRelation(draft.relation),
					gender: draft.gender || undefined,
					date_of_birth: draftDobToIso(draft.dateOfBirth),
					contact_number: draft.mobile || null,
				})
				// createFamilyMember already refreshed the shared list: wait for that, so the new member can be picked.
				if (familyStore.get() == null) await familyStore.refresh()
				else await familyStore.settled()
				Toast.show({ type: 'success', text1: `${draft.name} added to your family` })
				return created.public_id || created.id
			} catch (e) {
				Toast.show({
					type: 'error',
					text1: "Couldn't add family member",
					text2: e instanceof Error ? e.message : 'Please try again.',
				})
				return null
			}
		},
		[]
	)

	return { members, loading, reload: load, addFromDraft }
}

export default useFamilyMembers
