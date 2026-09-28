// src/components/common/feedback/NotificationPermissionPopup.tsx
import React, { useEffect, useRef, useState } from 'react'
import { useAuth } from '../../../context/AuthContext'
import {
	requestNativeOSPermission,
	markNotificationPromptShownOnBackend,
} from '../../../services/notificationPermissionService'
import StatusModal from './StatusModal'

export default function NotificationPermissionPopup() {
	const { notificationPromptShown, setNotificationPromptShown, accessToken } = useAuth()
	const [visible, setVisible] = useState(false)
	const isSubmittingRef = useRef(false)

	useEffect(() => {
		if (accessToken && notificationPromptShown === false) {
			console.log('[NOTIFICATION POPUP] Displaying Enable Notifications popup...')
			setVisible(true)
		} else {
			setVisible(false)
		}
	}, [accessToken, notificationPromptShown])

	const dismissAndMarkShown = async (requestPermission: boolean = false) => {
		if (isSubmittingRef.current) return
		isSubmittingRef.current = true

		try {
			// Optimistically hide popup & update local AuthContext & AsyncStorage immediately
			setVisible(false)
			await setNotificationPromptShown(true)

			if (requestPermission) {
				console.log('[NOTIFICATION POPUP] User tapped "Notify Me". Requesting native permission...')
				await requestNativeOSPermission()
			} else {
				console.log('[NOTIFICATION POPUP] User tapped "Not Now". Updating prompt flag...')
			}

			// Call backend asynchronously to mark prompt as shown
			await markNotificationPromptShownOnBackend()
		} catch (error) {
			console.error('[NOTIFICATION POPUP ERROR] Exception during dismissAndMarkShown:', error)
		} finally {
			isSubmittingRef.current = false
		}
	}

	if (!visible) return null

	return (
		<StatusModal
			visible={visible}
			status="info"
			title="Enable Notifications"
			description="Stay up to date with your appointments and important alerts. We promise not to spam you!"
			submitText="Notify Me"
			onSubmit={() => void dismissAndMarkShown(true)}
			cancelText="Not Now"
			onCancel={() => void dismissAndMarkShown(false)}
		/>
	)
}
