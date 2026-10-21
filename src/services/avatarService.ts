// Profile photo for every role. The server stores the file and links it to the caller's own profile
// (PUT /api/uploads/avatar), so the app never sends a storage key -- it only sends the picked image.

import { Platform } from 'react-native'
import ApiService from './apiService'
import { API_ENDPOINTS } from '../constants/apiUrls'

export type AvatarUpload = {
	uri: string
	name: string
	type: string
}

type AvatarResponse = { data?: { avatar_s3_key?: string | null; avatar_url?: string | null } }

/** `patientId`: a family member's public id (patients only) -- the photo then goes to that member, not to the caller. */
const forMember = (patientId?: string) => (patientId ? { params: { patient_id: patientId } } : {})

/** Upload a picked photo. Resolves with a signed URL that can be shown straight away. */
export async function uploadAvatar(upload: AvatarUpload, patientId?: string): Promise<string> {
	const form = new FormData()
	if (Platform.OS === 'web') {
		// The browser's FormData only takes a real file: the picker's uri is a blob:/data: URL, so read it back into one.
		// (The { uri, name, type } descriptor below is a React Native device feature; sent from a browser it arrives as
		// the text "[object Object]" and the server answers "validation failed".)
		const blob = await (await fetch(upload.uri)).blob()
		form.append('file', new Blob([blob], { type: upload.type || blob.type }), upload.name)
	} else {
		// React Native's FormData accepts a { uri, name, type } descriptor as the file part.
		form.append('file', { uri: upload.uri, name: upload.name, type: upload.type } as unknown as Blob)
	}
	const res = await ApiService.put<AvatarResponse>(API_ENDPOINTS.UPLOADS.AVATAR, form, {
		headers: { 'Content-Type': 'multipart/form-data' },
		...forMember(patientId),
	})
	return res.data?.data?.avatar_url || res.data?.data?.avatar_s3_key || ''
}

export async function removeAvatar(patientId?: string): Promise<void> {
	const query = patientId ? `?patient_id=${encodeURIComponent(patientId)}` : ''
	await ApiService.delete(`${API_ENDPOINTS.UPLOADS.AVATAR}${query}`)
}
