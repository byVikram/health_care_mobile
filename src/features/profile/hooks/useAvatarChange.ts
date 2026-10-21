// "Change photo" for the profile screens: asks where the photo comes from, uploads it straight away through
// the common avatar API and reports the new (signed) URL. Works the same for every role.

import { useCallback, useState } from 'react'
import { Alert } from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import Toast from 'react-native-toast-message'
import { removeAvatar, uploadAvatar, type AvatarUpload } from '../../../services/avatarService'

type Options = {
	/** Whether the profile has a photo now (adds the "Remove photo" choice). */
	hasPhoto: boolean
	/** Called with the new display URL, or '' after the photo was removed. */
	onChanged: (avatarUrl: string) => void
}

const PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
	mediaTypes: ImagePicker.MediaTypeOptions.Images,
	allowsEditing: true,
	aspect: [1, 1],
	quality: 0.8,
}

const toUpload = (asset: ImagePicker.ImagePickerAsset): AvatarUpload => {
	const name = asset.fileName || asset.uri.split('/').pop() || `profile-photo-${Date.now()}.jpg`
	const extension = name.split('.').pop()?.toLowerCase()
	const type = asset.mimeType || (extension ? `image/${extension === 'jpg' ? 'jpeg' : extension}` : 'image/jpeg')
	return { uri: asset.uri, name, type }
}

const messageOf = (error: unknown): string => {
	const e = error as { response?: { data?: { message?: string } }; message?: string }
	return e?.response?.data?.message || e?.message || 'Please try again.'
}

export function useAvatarChange({ hasPhoto, onChanged }: Options) {
	const [busy, setBusy] = useState(false)

	const run = useCallback(async (task: () => Promise<string>) => {
		setBusy(true)
		try {
			onChanged(await task())
			Toast.show({ type: 'success', text1: 'Profile photo updated' })
		} catch (error) {
			Alert.alert('Photo not saved', messageOf(error))
		} finally {
			setBusy(false)
		}
	}, [onChanged])

	const pick = useCallback(
		async (source: 'camera' | 'library') => {
			const permission =
				source === 'camera'
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
			await run(() => uploadAvatar(toUpload(result.assets[0])))
		},
		[run]
	)

	const open = useCallback(() => {
		if (busy) return
		Alert.alert('Profile photo', undefined, [
			{ text: 'Take a photo', onPress: () => void pick('camera') },
			{ text: 'Choose from library', onPress: () => void pick('library') },
			...(hasPhoto
				? [
						{
							text: 'Remove photo',
							style: 'destructive' as const,
							onPress: () =>
								void run(async () => {
									await removeAvatar()
									return ''
								}),
						},
				  ]
				: []),
			{ text: 'Cancel', style: 'cancel' as const },
		])
	}, [busy, hasPhoto, pick, run])

	return { open, busy }
}
