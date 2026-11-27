// src/features/care-ai/useVoiceInput.ts
//
// Speak-to-type for the Care AI composer: the mic listens and what is said is added to the message box (the patient
// reads it, then sends). It is the shared speech hook behind every search bar's mic (hooks/useVoiceSearch): it asks
// for the microphone once, shows its own message when speech cannot be recognised, and needs a development / production
// build (the native module is not in Expo Go).

import { useVoiceSearch } from '../../hooks/useVoiceSearch'

export function useVoiceInput(onTranscript: (text: string) => void) {
	const voice = useVoiceSearch({ enabled: true, onFinal: onTranscript })
	return {
		/** The mic is open (the composer shows "Listening…"). */
		listening: voice.active,
		/** What is being heard right now, before it is final. */
		heard: voice.partial,
		start: voice.start,
		stop: voice.stop,
	}
}
