// Keeps the signed-in user's photo (AuthContext `user.avatar`, saved on the device at login) current. The bucket is
// private, so that copy is a signed URL that expires after about an hour, and a photo changed elsewhere would
// never reach it. This asks the server for the current photo when the app opens, comes back to the foreground and
// every so often, and updates the stored user. The sidebar, the home header and the profile all read that copy.

import { useEffect, useRef } from 'react'
import { AppState } from 'react-native'
import { useAuth } from '../context/AuthContext'
import { hubRoleFor } from '../features/profile/config/profileHubConfig'
import { fetchCurrentAvatar } from '../services/avatarService'

const REFRESH_EVERY_MS = 50 * 60 * 1000 // the signed URL lasts an hour

export function useSyncedAvatar() {
	const { role, user, accessToken, updateUser } = useAuth()
	const latest = useRef({ user, updateUser })
	useEffect(() => {
		latest.current = { user, updateUser }
	})

	// only roles with a profile photo (patient, doctor, ancillary provider); the others have no photo endpoint here
	const hasPhoto = !!accessToken && hubRoleFor(role) !== null

	useEffect(() => {
		if (!hasPhoto) return
		let active = true

		const sync = async () => {
			try {
				const avatar = await fetchCurrentAvatar()
				if (!active) return
				const { user: current, updateUser: update } = latest.current
				if (!current || (current.avatar || '') === avatar) return
				await update({ avatar: avatar || undefined })
			} catch {
				// keep what is shown; the next refresh tries again
			}
		}

		void sync()
		const timer = setInterval(sync, REFRESH_EVERY_MS)
		const subscription = AppState.addEventListener('change', (state) => {
			if (state === 'active') void sync()
		})
		return () => {
			active = false
			clearInterval(timer)
			subscription.remove()
		}
	}, [hasPhoto])
}
