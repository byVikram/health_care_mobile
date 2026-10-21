// "Change photo" for the profile screens: asks where the photo comes from, uploads it straight away through
// the common avatar API and reports the new (signed) URL. Works the same for every role.

import { useCallback, useState } from 'react'
import { Alert, Platform } from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import Toast from 'react-native-toast-message'
import { removeAvatar, uploadAvatar, type AvatarUpload } from '../../../services/avatarService'
import { useAuth } from '../../../context/AuthContext'

type Options = {
	/** Whether the profile has a photo now (adds the "Remove photo" choice). */
	hasPhoto: boolean
	/** Whether the user may delete their photo. False where a photo is compulsory (doctor, ancillary): they can only replace it. */
	allowRemove?: boolean
	/** Called with the new display URL, or '' after the photo was removed. */
	onChanged: (avatarUrl: string) => void
	/** A family member's public id: the photo is theirs, not the signed-in user's. */
	patientId?: string
	/**
	 * Deferred mode (a family member who does not exist yet): the picked photo is handed over instead of uploaded, to be
	 * uploaded once the member is saved. Called with null when it is removed again.
	 */
	onPicked?: (upload: AvatarUpload | null) => void
}

const PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
	mediaTypes: ImagePicker.MediaTypeOptions.Images,
	allowsEditing: true,
	aspect: [1, 1],
	quality: 0.8,
}

const toUpload = (asset: ImagePicker.ImagePickerAsset): AvatarUpload => {
	// a browser gives a blob:/data: uri (no usable file name), so name the file from its type
	const isLocalUri = /^(blob|data):/.test(asset.uri)
	const name = asset.fileName || (isLocalUri ? '' : asset.uri.split('/').pop()) || `profile-photo-${Date.now()}.jpg`
	const extension = name.split('.').pop()?.toLowerCase()
	const type =
		asset.mimeType ||
		(extension && name.includes('.') ? `image/${extension === 'jpg' ? 'jpeg' : extension}` : 'image/jpeg')
	return { uri: asset.uri, name, type }
}

const messageOf = (error: unknown): string => {
	const e = error as { response?: { data?: { message?: string } }; message?: string }
	return e?.response?.data?.message || e?.message || 'Please try again.'
}

export function useAvatarChange({ hasPhoto, allowRemove = true, onChanged, patientId, onPicked }: Options) {
	const [busy, setBusy] = useState(false)
	const { updateUser } = useAuth()

	const run = useCallback(async (task: () => Promise<string>, successText: string, failureText: string) => {
		setBusy(true)
		try {
			const url = await task()
			onChanged(url)
			// the sidebar and headers read the signed-in user's copy of the photo (a family member's is not theirs)
			if (!patientId) await updateUser({ avatar: url || undefined })
			Toast.show({ type: 'success', text1: successText })
		} catch (error) {
			Toast.show({ type: 'error', text1: failureText, text2: messageOf(error) })
		} finally {
			setBusy(false)
		}
	}, [onChanged, updateUser, patientId])

	const pick = useCallback(
		async (source: 'camera' | 'library') => {
			// the browser has no permission prompt for this: choosing a file is the permission
			const permission =
				Platform.OS === 'web'
					? { granted: true }
					: source === 'camera'
						? await ImagePicker.requestCameraPermissionsAsync()
						: await ImagePicker.requestMediaLibraryPermissionsAsync()
			if (!permission.granted) {
				Alert.alert('Permission needed', `Allow access to your ${source === 'camera' ? 'camera' : 'photos'} to set a profile photo.`)
				return
			}
			const result =
				source === 'camera'
					? await ImagePicker.launchCameraAsync(PICKER_OPTIONS)
					: await ImagePicker.launchImageLibraryAsync(PICKER_OPTIONS)
			if (result.canceled || !result.assets?.length) return
			const upload = toUpload(result.assets[0])
			if (onPicked) {
				onPicked(upload)
				onChanged(upload.uri)
				return
			}
			await run(() => uploadAvatar(upload, patientId), 'Profile photo updated', 'Photo not saved')
		},
		[run, onPicked, onChanged, patientId]
	)

	const removePhoto = useCallback(() => {
		if (onPicked) {
			onPicked(null)
			onChanged('')
			return
		}
		void run(
			async () => {
				await removeAvatar(patientId)
				return ''
			},
			'Profile photo removed',
			'Photo not removed'
		)
	}, [onPicked, onChanged, run, patientId])

	const open = useCallback(() => {
		if (busy) return
		if (Platform.OS === 'web') {
			// Alert.alert has no buttons in the browser, so go straight to the file explorer (on a phone's browser the
			// system itself offers "take a photo" or "choose a photo").
			void pick('library')
			return
		}
		// Deleting is a separate, visible "Delete photo" action on the screen (see `remove` / `canRemove`).
		Alert.alert('Profile photo', undefined, [
			{ text: 'Take a photo', onPress: () => void pick('camera') },
			{ text: 'Choose from library', onPress: () => void pick('library') },
			{ text: 'Cancel', style: 'cancel' as const },
		])
	}, [busy, pick])

	return { open, remove: removePhoto, canRemove: hasPhoto && allowRemove, busy }
}
