// src/components/common/feedback/NotificationPermissionPopup.tsx
//
// Records `notification_prompt_shown` once per signed-in user (locally and on the backend). No UI and no permission
// request: the Android notification dialog is shown by the first-launch step (useFirstLaunchPermissions), which also
// covers installs that predate it, so asking here too would race it.
import { useEffect, useRef } from 'react'
import { useAuth } from '../../../context/AuthContext'
import { markNotificationPromptShownOnBackend } from '../../../services/notificationPermissionService'

export default function NotificationPermissionPopup() {
	const { notificationPromptShown, setNotificationPromptShown, accessToken } = useAuth()
	const isSubmittingRef = useRef(false)

	useEffect(() => {
		if (!accessToken || notificationPromptShown !== false || isSubmittingRef.current) return
		isSubmittingRef.current = true

		const run = async () => {
			try {
				await setNotificationPromptShown(true)
				await markNotificationPromptShownOnBackend()
			} catch (error) {
				console.error('[NOTIFICATION PERMISSION] Prompt failed:', error)
			} finally {
				isSubmittingRef.current = false
			}
		}
		run()
	}, [accessToken, notificationPromptShown, setNotificationPromptShown])

	return null
}
