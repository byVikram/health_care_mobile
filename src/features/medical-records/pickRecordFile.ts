// src/features/medical-records/pickRecordFile.ts
//
// The three ways the upload sheet gets a file: the camera, the photo gallery, or the system file explorer for a PDF (the
// shared picker in utils/pickedFile). Each resolves with the file, or null when the patient cancels or the file is refused
// (the reason is shown here), so the sheet only has to wait for a file.

import * as ImagePicker from 'expo-image-picker'
import { pickCertificateFile, type PickedFile } from '../../utils/pickedFile'
import type { UploadSourceId } from './recordVisuals'
import Toast from 'react-native-toast-message'

/** The server's limit for a record's file (UPLOAD_RULES `report`): checked here so the patient learns before uploading. */
const MAX_RECORD_BYTES = 20 * 1024 * 1024

const fromAsset = (asset: ImagePicker.ImagePickerAsset): PickedFile | null => {
	if (asset.fileSize != null && asset.fileSize > MAX_RECORD_BYTES) {
		Toast.show({
			type: 'error',
			text1: 'File too large',
			text2: 'Please choose a file under 20 MB.',
		})
		return null
	}
	const name = asset.fileName || asset.uri.split('/').pop() || `record-${Date.now()}.jpg`
	const extension = name.split('.').pop()?.toLowerCase()
	return {
		uri: asset.uri,
		name,
		type: asset.mimeType || (extension ? `image/${extension === 'jpg' ? 'jpeg' : extension}` : 'image/jpeg'),
		file: asset.file, // set on web only
	}
}

async function takePhoto(): Promise<PickedFile | null> {
	const permission = await ImagePicker.requestCameraPermissionsAsync()
	if (!permission.granted) {
		Toast.show({
			type: 'error',
			text1: 'Camera access needed',
			text2: 'Allow camera access in your phone settings to photograph a record.',
		})
		return null
	}
	const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8 })
	return result.canceled || !result.assets?.length ? null : fromAsset(result.assets[0])
}

async function choosePhoto(): Promise<PickedFile | null> {
	const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
	if (!permission.granted) {
		Toast.show({
			type: 'error',
			text1: 'Photo access needed',
			text2: 'Allow photo access in your phone settings to choose a record.',
		})
		return null
	}
	const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 })
	return result.canceled || !result.assets?.length ? null : fromAsset(result.assets[0])
}

export const pickRecordFile = (source: UploadSourceId): Promise<PickedFile | null> => {
	if (source === 'camera') return takePhoto()
	if (source === 'gallery') return choosePhoto()
	return pickCertificateFile(MAX_RECORD_BYTES)
}
