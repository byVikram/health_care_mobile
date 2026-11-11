// A file chosen on the device, in the shape React Native's FormData takes as a file part, plus the picker
// that produces one.

import Toast from 'react-native-toast-message'
import { showStatusModal } from '../services/apiService'

export type PickedFile = {
	uri: string
	name: string
	type: string
	/** Only when running in a browser (Expo web): the real File, which is what a browser FormData needs. */
	file?: File
}

/**
 * Append a picked file to a FormData body.
 *
 * Two runtimes, two ways to say "this is a file": React Native's FormData takes a `{ uri, name, type }`
 * descriptor, but a browser's FormData (Expo web, or JS running in a Chrome debugger) turns that object
 * into the text "[object Object]", which the server then rejects as "sent as plain text". So in a browser
 * the real File is appended, with its name.
 */
export const appendFile = (form: FormData, field: string, file: PickedFile) => {
	if (file.file) {
		form.append(field, file.file, file.name)
		return
	}
	form.append(field, { uri: file.uri, name: file.name, type: file.type } as unknown as Blob)
}

/** What the server accepts for a degree certificate / registration proof. */
const CERTIFICATE_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
/** The server takes up to 10 MB; check here so the doctor learns before uploading. */
const MAX_CERTIFICATE_BYTES = 10 * 1024 * 1024

const MIME_BY_EXTENSION: Record<string, string> = {
	pdf: 'application/pdf',
	jpg: 'image/jpeg',
	jpeg: 'image/jpeg',
	png: 'image/png',
	webp: 'image/webp',
}

type DocumentPicker = typeof import('expo-document-picker')

// `expo-document-picker` is a native module, so it is loaded on demand: a build made before it was installed
// shows a message instead of breaking the screen. It is loaded once, when this file is first imported, and not
// inside the tap handler: a browser (Expo web) only opens a file dialog when it is requested synchronously from
// the click, and awaiting an import first loses that, so nothing would open.
let pickerPromise: Promise<DocumentPicker | null> | null = null
let loadedPicker: DocumentPicker | null = null
const importPicker = async (): Promise<DocumentPicker | null> => {
	try {
		loadedPicker = await import('expo-document-picker')
		return loadedPicker
	} catch {
		return null
	}
}
const loadPicker = () => {
	pickerPromise ??= importPicker()
	return pickerPromise
}
void loadPicker()

/**
 * Open the system file explorer for a PDF or an image and resolve with the chosen file (null if the doctor
 * cancels). Nothing is shown first: one tap, one picker. The server checks the real type from the content,
 * so a wrong extension or MIME type here cannot get past it.
 */
export const pickCertificateFile = async (maxBytes: number = MAX_CERTIFICATE_BYTES): Promise<PickedFile | null> => {
	// Already loaded in practice, so there is no await before the picker opens.
	const picker = loadedPicker ?? (await loadPicker())
	if (!picker) {
		showStatusModal({
			status: 'info',
			title: 'File picker not available',
			description: 'This version of the app was built without the file picker. Rebuild it with "npx expo run:android" (or run: ios) and try again.',
			submitText: 'OK',
		})
		return null
	}

	try {
		const result = await picker.getDocumentAsync({ type: CERTIFICATE_TYPES, copyToCacheDirectory: true })
		if (result.canceled || !result.assets?.length) return null
		const asset = result.assets[0]
		if (asset.size != null && asset.size > maxBytes) {
			Toast.show({
				type: 'error',
				text1: 'File too large',
				text2: `Please choose a file under ${Math.round(maxBytes / (1024 * 1024))} MB.`,
			})
			return null
		}
		const name = asset.name || asset.uri.split('/').pop() || `document-${Date.now()}`
		const extension = name.split('.').pop()?.toLowerCase() ?? ''
		return {
			uri: asset.uri,
			name,
			type: asset.mimeType || MIME_BY_EXTENSION[extension] || 'application/octet-stream',
			file: asset.file, // set on web only
		}
	} catch (error) {
		Toast.show({
			type: 'error',
			text1: 'Could not open the file',
			text2: error instanceof Error ? error.message : 'Please try again.',
		})
		return null
	}
}
