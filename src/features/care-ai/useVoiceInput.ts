// src/features/care-ai/useVoiceInput.ts
//
// Speak-to-type for the Care AI composer. The speech recogniser (expo-speech-recognition, the same module the
// consultation notes use) is switched off for now: the mic shows "coming soon" and never enters the listening
// state. To turn it back on, restore the commented block and delete the placeholder `start` / `stop` below.

import { useCallback } from 'react'
import { showComingSoon } from '../../utils/toast'
// import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition'

export function useVoiceInput(_onTranscript: (text: string) => void) {
	// const [listening, setListening] = useState(false)
	const listening = false

	// useSpeechRecognitionEvent('result', (event) => {
	// 	const transcript = event.results[0]?.transcript
	// 	if (transcript) onTranscript(transcript)
	// })
	// useSpeechRecognitionEvent('end', () => setListening(false))
	// useSpeechRecognitionEvent('error', () => setListening(false))

	const start = useCallback(async () => {
		// const permission = await ExpoSpeechRecognitionModule.requestPermissionsAsync()
		// if (!permission.granted) return
		// setListening(true)
		// ExpoSpeechRecognitionModule.start({ lang: 'en-US', interimResults: true, continuous: false })
		showComingSoon('Voice input is coming soon.')
	}, [])

	const stop = useCallback(() => {
		// setListening(false)
		// ExpoSpeechRecognitionModule.stop()
	}, [])

	return { listening, start, stop }
}
