// The doctor's profile photo is read from the server ONCE per sign-in and kept in the signed-in user (`user.avatar`,
// AuthContext). The dashboard header, the drawer, the profile hub and Personal details all show that one value; none
// of them fetches the photo on its own any more. (Before, each of the four called the profile API again just to get the
// same URL.) Changing the photo updates `user.avatar` (useAvatarChange), so every place follows at once.

import { useEffect } from 'react'
import { useAuth } from '../../../context/AuthContext'
import { fetchDoctorHub } from './doctorProfileService'

/** One request per sign-in (keyed by the access token, so a new login asks again); everyone who asks shares it. */
const requests = new Map<string, Promise<string | null>>()
/** Sign-ins whose photo has already been put into `user.avatar`: the first caller does it, the rest do nothing. */
const applied = new Set<string>()

const loadOnce = (sessionKey: string): Promise<string | null> => {
	let request = requests.get(sessionKey)
	if (!request) {
		request = fetchDoctorHub()
			.then((hub) => hub.avatar_url || null)
			.catch(() => {
				// Not cached on failure, so the next screen that asks tries again; the initials avatar shows meanwhile.
				requests.delete(sessionKey)
				return null
			})
		requests.set(sessionKey, request)
	}
	return request
}

/** Mount this where the doctor's photo is first needed (dashboard, drawer layout); any number of screens can. */
export function useDoctorAvatarSync(enabled = true) {
	const { accessToken, updateUser } = useAuth()

	useEffect(() => {
		if (!enabled || !accessToken) return
		let cancelled = false
		void loadOnce(accessToken).then((url) => {
			if (cancelled || !url || applied.has(accessToken)) return
			applied.add(accessToken)
			void updateUser({ avatar: url })
		})
		return () => {
			cancelled = true
		}
		// updateUser changes with the user, so it is left out: this must run once per sign-in, not on every update.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [enabled, accessToken])
}
