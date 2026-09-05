// src/components/common/NotificationPermissionPopup.tsx
import React, { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import {
	requestNativeOSPermission,
	markNotificationPromptShownOnBackend,
} from '../../services/notificationPermissionService'
import StatusModal from './StatusModal'

export default function NotificationPermissionPopup() {
	const { notificationPromptShown, setNotificationPromptShown, accessToken } = useAuth()
	const [visible, setVisible] = useState(false)

	useEffect(() => {
		if (accessToken && notificationPromptShown === false) {
			console.log('[NOTIFICATION POPUP] Displaying Enable Notifications popup...')
			setVisible(true)
		} else {
			setVisible(false)
		}
	}, [accessToken, notificationPromptShown])

	const handleNotifyMe = async () => {
		try {
			console.log('[NOTIFICATION POPUP] User tapped "Notify Me". Requesting native permission...')
			await requestNativeOSPermission()
			await markNotificationPromptShownOnBackend()
			await setNotificationPromptShown(true)
			setVisible(false)
		} catch (error) {
			console.error('[NOTIFICATION POPUP ERROR] Exception during handleNotifyMe:', error)
		}
	}

	const handleNotNow = async () => {
		try {
			console.log('[NOTIFICATION POPUP] User tapped "Not Now". Updating prompt flag...')
			await markNotificationPromptShownOnBackend()
			await setNotificationPromptShown(true)
			setVisible(false)
		} catch (error) {
			console.error('[NOTIFICATION POPUP ERROR] Exception during handleNotNow:', error)
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
			onSubmit={handleNotifyMe}
			cancelText="Not Now"
			onCancel={handleNotNow}
		/>
	)
}
