// Profile photo for every role. The server stores the file and links it to the caller's own profile
// (PUT /api/uploads/avatar), so the app never sends a storage key -- it only sends the picked image.

import ApiService from './apiService'
import { API_ENDPOINTS } from '../constants/apiUrls'

export type AvatarUpload = {
	uri: string
	name: string
	type: string
}

type AvatarResponse = { data?: { avatar_s3_key?: string | null; avatar_url?: string | null } }

/** Upload a picked photo. Resolves with a signed URL that can be shown straight away. */
export async function uploadAvatar(upload: AvatarUpload): Promise<string> {
	const form = new FormData()
	// React Native's FormData accepts a { uri, name, type } descriptor as the file part.
	form.append('file', { uri: upload.uri, name: upload.name, type: upload.type } as unknown as Blob)
	const res = await ApiService.put<AvatarResponse>(API_ENDPOINTS.UPLOADS.AVATAR, form, {
		headers: { 'Content-Type': 'multipart/form-data' },
	})
	return res.data?.data?.avatar_url || res.data?.data?.avatar_s3_key || ''
}

export async function removeAvatar(): Promise<void> {
	await ApiService.delete(API_ENDPOINTS.UPLOADS.AVATAR)
}
