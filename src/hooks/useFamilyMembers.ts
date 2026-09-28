import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { FamilyMember as ApiFamilyMember, getFamilyMembers } from '../features/profile/patient/PatientProfileService'

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
 * The caller plus their family members (self always first), from GET patient family-members.
 * Until the fetch resolves — or if it fails / returns nothing — the list is just "self" built from
 * `useAuth().user`, so pickers still work.
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

	const [apiMembers, setApiMembers] = useState<ApiFamilyMember[] | null>(null)
	const [loading, setLoading] = useState(true)
	const activeRef = useRef(true)

	const load = useCallback(async () => {
		setLoading(true)
		try {
			const list = await getFamilyMembers()
			if (activeRef.current && list.length) setApiMembers(list)
		} catch {
			// Fall back to "self" only; the picker still works.
		} finally {
			if (activeRef.current) setLoading(false)
		}
	}, [])

	useEffect(() => {
		activeRef.current = true
		void load()
		return () => {
			activeRef.current = false
		}
	}, [load])

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
					publicId: self.public_id || self.publicId || undefined,
					apiRelation: 'Self',
				}
			: fallbackSelf
		return [selfOption, ...apiMembers.filter((m) => m !== self).map(mapFamilyMember)]
	}, [apiMembers, fallbackSelf])

	return { members, loading, reload: load }
}

export default useFamilyMembers
