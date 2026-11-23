// src/hooks/useVoiceSearch.ts
//
// Speak-to-search for AppSearchBar (the one search field every screen uses). It listens, shows what is being said as it is said,
// and hands back ONE final text; the bar puts that text in the screen's normal search state, so the screen's own debounce /
// search / filter logic runs exactly as if the patient had typed it. Nothing here calls an API.
//
// - Library: expo-speech-recognition (Android SpeechRecognizer, iOS SFSpeechRecognizer, the browser's SpeechRecognition on web). It
//   needs a development / production build: in Expo Go the native module is missing, which is handled (voice reports "unavailable").
// - States: idle -> listening (mic open) -> transcribing (words arriving) -> done (final text delivered) -> idle. 'denied' (permission),
//   'unavailable' (no recogniser) and 'error' (no speech, network, mic busy ...) are shown briefly with a message, then back to idle.
// - One session at a time, app-wide: starting here aborts a session another bar left running. Its listeners exist only while this
//   bar is listening, and are removed on stop / cancel / error / blur / background / unmount, so none are left behind.
// - Permissions: asked at most once (only while still "undetermined"). A refusal that cannot be asked again offers the Settings page.
// - Language: English (the app has no other language): en-IN first, en-US when the recogniser does not offer it.

import { useCallback, useContext, useEffect, useRef, useState } from 'react'
import { AppState } from 'react-native'
import { NavigationContext } from '@react-navigation/native'
import Toast from 'react-native-toast-message'
import type { ExpoSpeechRecognitionErrorEvent, ExpoSpeechRecognitionResultEvent } from 'expo-speech-recognition'
import { offerAppSettings } from '../services/locationService'

type SpeechModule = typeof import('expo-speech-recognition').ExpoSpeechRecognitionModule

export type VoiceState = 'idle' | 'listening' | 'transcribing' | 'done' | 'denied' | 'unavailable' | 'error'

const PREFERRED_LOCALE = 'en-IN'
const FALLBACK_LOCALE = 'en-US'
/** How long "done" / an error state stays before the bar goes back to idle. */
const SETTLE_MS = 1200

// The native module is looked up lazily: where it is not built in (Expo Go) importing it throws, which must not break every screen
// that has a search bar.
let speechModule: SpeechModule | null | undefined
const getSpeech = (): SpeechModule | null => {
	if (speechModule === undefined) {
		try {
			// eslint-disable-next-line @typescript-eslint/no-require-imports
			speechModule = (require('expo-speech-recognition') as typeof import('expo-speech-recognition'))
				.ExpoSpeechRecognitionModule
		} catch {
			speechModule = null
		}
	}
	return speechModule ?? null
}

// The recogniser's English locale, worked out once.
let localePromise: Promise<string> | null = null
const pickLocale = (speech: SpeechModule): Promise<string> => {
	if (!localePromise) {
		localePromise = (async () => {
			try {
				const { locales } = await speech.getSupportedLocales({})
				const has = (tag: string) =>
					locales.some((l) => l.replace('_', '-').toLowerCase() === tag.toLowerCase())
				if (has(PREFERRED_LOCALE)) return PREFERRED_LOCALE
				if (has(FALLBACK_LOCALE)) return FALLBACK_LOCALE
			} catch {
				// This recogniser cannot list its languages: try en-IN and fall back on "language-not-supported".
			}
			return PREFERRED_LOCALE
		})()
	}
	return localePromise
}

// The one session that is open right now, whichever bar owns it.
let activeOwner: symbol | null = null
let abortActive: (() => void) | null = null

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

type Subscription = { remove: () => void }

export function useVoiceSearch({
	enabled,
	onFinal,
	autoStart = false,
	onAutoStarted,
}: {
	/** Off for a bar that is not editable or not for patients: nothing is listened to or started. */
	enabled: boolean
	/** The final text (never a partial one). */
	onFinal: (text: string) => void
	/** Start listening once, as soon as the bar's screen is on screen (a one-time intent, e.g. from the Dashboard's mic). */
	autoStart?: boolean
	/** Called when that start has been made, so the screen can clear its one-time flag. */
	onAutoStarted?: () => void
}) {
	const owner = useRef(Symbol('voice-search')).current
	const [state, setState] = useState<VoiceState>('idle')
	const [partial, setPartial] = useState('')
	const stateRef = useRef<VoiceState>('idle')
	const partialRef = useRef('')
	const deliveredRef = useRef(false)
	const subsRef = useRef<Subscription[]>([])
	const settleRef = useRef<ReturnType<typeof setTimeout> | null>(null)
	const mountedRef = useRef(true)
	const langRef = useRef(PREFERRED_LOCALE)
	const triedFallbackRef = useRef(false)
	const onFinalRef = useRef(onFinal)
	const onAutoStartedRef = useRef(onAutoStarted)
	const startedAutoRef = useRef(false)
	const navigation = useContext(NavigationContext)

	useEffect(() => {
		onFinalRef.current = onFinal
		onAutoStartedRef.current = onAutoStarted
	}, [onFinal, onAutoStarted])

	const setStateBoth = useCallback((next: VoiceState) => {
		stateRef.current = next
		if (mountedRef.current) setState(next)
	}, [])

	const detach = useCallback(() => {
		subsRef.current.forEach((s) => s.remove())
		subsRef.current = []
	}, [])

	/** End this bar's session: no listeners, no owner, text cleared; the state settles back to idle after a moment when it is a message. */
	const finish = useCallback(
		(next: VoiceState) => {
			detach()
			if (activeOwner === owner) {
				activeOwner = null
				abortActive = null
			}
			partialRef.current = ''
			if (mountedRef.current) setPartial('')
			setStateBoth(next)
			if (settleRef.current) clearTimeout(settleRef.current)
			if (next !== 'idle') {
				settleRef.current = setTimeout(() => setStateBoth('idle'), SETTLE_MS * (next === 'done' ? 1 : 2))
			}
		},
		[detach, owner, setStateBoth]
	)

	/** Cancel: nothing is delivered and the search text the screen already had is left as it was. */
	const cancel = useCallback(() => {
		const wasMine = activeOwner === owner
		detach()
		if (wasMine) {
			try {
				getSpeech()?.abort()
			} catch {
				// Already stopped.
			}
		}
		finish('idle')
	}, [detach, finish, owner])

	const deliver = useCallback(
		(text: string) => {
			if (deliveredRef.current) return
			deliveredRef.current = true
			const clean = text.trim()
			finish(clean ? 'done' : 'idle')
			if (clean) onFinalRef.current(clean)
		},
		[finish]
	)

	const fail = useCallback(
		(state: VoiceState, title: string, message: string) => {
			finish(state)
			Toast.show({ type: 'error', text1: title, text2: message })
		},
		[finish]
	)

	const showDenied = useCallback(() => {
		finish('denied')
		offerAppSettings({
			title: 'Microphone access is off',
			description:
				'Allow Microphone and Speech Recognition for KarolaHealth in your phone’s App settings to search by voice.',
			submitText: 'Open Settings',
			cancelText: 'Not now',
		})
	}, [finish])

	const handleError = useCallback(
		(event: ExpoSpeechRecognitionErrorEvent) => {
			switch (event.error) {
				case 'aborted':
				case 'interrupted':
					finish('idle')
					return
				case 'not-allowed':
					showDenied()
					return
				case 'service-not-allowed':
					fail(
						'unavailable',
						'Voice search isn’t available',
						'Speech recognition is turned off or missing on this phone.'
					)
					return
				case 'language-not-supported': {
					const speech = getSpeech()
					if (speech && langRef.current === PREFERRED_LOCALE && !triedFallbackRef.current) {
						triedFallbackRef.current = true
						langRef.current = FALLBACK_LOCALE
						localePromise = Promise.resolve(FALLBACK_LOCALE)
						try {
							speech.start({
								lang: FALLBACK_LOCALE,
								interimResults: true,
								continuous: false,
								maxAlternatives: 1,
							})
							return
						} catch {
							// Falls through to the message below.
						}
					}
					fail(
						'unavailable',
						'Voice search isn’t available',
						'This phone can’t recognise English speech right now.'
					)
					return
				}
				case 'no-speech':
				case 'speech-timeout':
					if (partialRef.current) deliver(partialRef.current)
					else fail('error', 'Didn’t catch that', 'Tap the mic and try again.')
					return
				case 'network':
					if (partialRef.current) deliver(partialRef.current)
					else fail('error', 'Couldn’t recognise your speech', 'Check your connection and try again.')
					return
				case 'audio-capture':
					fail('error', 'Microphone isn’t available', 'Another app may be using it. Try again in a moment.')
					return
				case 'busy':
					fail('error', 'Voice search is busy', 'Try again in a moment.')
					return
				default:
					fail('error', 'Voice search didn’t work', 'Please try again, or type your search.')
			}
		},
		[deliver, fail, finish, showDenied]
	)

	/** Stop listening and use what was heard (the recogniser sends the final text next). */
	const stop = useCallback(() => {
		if (activeOwner !== owner) return
		try {
			getSpeech()?.stop()
		} catch {
			cancel()
		}
	}, [cancel, owner])

	const start = useCallback(async () => {
		if (!enabled || !mountedRef.current) return
		if (stateRef.current === 'listening' || stateRef.current === 'transcribing') return
		const speech = getSpeech()
		let available = false
		try {
			available = !!speech && speech.isRecognitionAvailable()
		} catch {
			available = false
		}
		if (!speech || !available) {
			fail('unavailable', 'Voice search isn’t available', 'This phone or app version can’t recognise speech.')
			return
		}

		// Permission: asked only while it has never been answered. A refusal is answered with the Settings page, not another request.
		try {
			let permission = await speech.getPermissionsAsync()
			if (!permission.granted && permission.status === 'undetermined') {
				permission = await speech.requestPermissionsAsync()
			}
			if (!permission.granted) {
				showDenied()
				return
			}
		} catch {
			fail('error', 'Voice search didn’t work', 'Couldn’t check the microphone permission.')
			return
		}
		if (!mountedRef.current) return

		// One session at a time: a session another bar left open is ended first.
		if (activeOwner && activeOwner !== owner) {
			abortActive?.()
			await sleep(150)
			if (!mountedRef.current) return
		}
		if ((stateRef.current as VoiceState) === 'listening' || (stateRef.current as VoiceState) === 'transcribing')
			return

		activeOwner = owner
		abortActive = cancel
		deliveredRef.current = false
		triedFallbackRef.current = false
		partialRef.current = ''
		setPartial('')

		subsRef.current = [
			speech.addListener('result', (event: ExpoSpeechRecognitionResultEvent) => {
				if (activeOwner !== owner) return
				const text = event.results?.[0]?.transcript ?? ''
				if (!text) return
				if (event.isFinal) {
					deliver(text)
				} else {
					partialRef.current = text
					setPartial(text)
					setStateBoth('transcribing')
				}
			}),
			speech.addListener('error', (event: ExpoSpeechRecognitionErrorEvent) => {
				if (activeOwner === owner) handleError(event)
			}),
			speech.addListener('end', () => {
				if (activeOwner !== owner || deliveredRef.current) return
				// Ended without a final result: use what was heard, or say nothing was.
				if (partialRef.current) deliver(partialRef.current)
				else fail('error', 'Didn’t catch that', 'Tap the mic and try again.')
			}),
		]

		try {
			langRef.current = await pickLocale(speech)
			if (activeOwner !== owner) return
			setStateBoth('listening')
			speech.start({
				lang: langRef.current,
				interimResults: true,
				continuous: false,
				maxAlternatives: 1,
				addsPunctuation: false,
				iosTaskHint: 'search' as never,
			})
		} catch {
			fail('error', 'Voice search didn’t work', 'Please try again, or type your search.')
		}
	}, [cancel, deliver, enabled, fail, handleError, owner, setStateBoth, showDenied])

	// Leaving the screen, the app going to the background, or unmounting ends the session.
	useEffect(() => {
		mountedRef.current = true
		const offBlur = navigation?.addListener('blur', cancel)
		const appState = AppState.addEventListener('change', (next) => {
			if (next !== 'active') cancel()
		})
		return () => {
			mountedRef.current = false
			offBlur?.()
			appState.remove()
			if (settleRef.current) clearTimeout(settleRef.current)
			cancel()
		}
	}, [cancel, navigation])

	// A one-time intent (the Dashboard's mic): start once the screen is focused and its transitions are done; never twice.
	useEffect(() => {
		if (!autoStart) {
			startedAutoRef.current = false
			return
		}
		if (!enabled || startedAutoRef.current) return
		let task: number | null = null
		const run = () => {
			if (startedAutoRef.current) return
			startedAutoRef.current = true
			task = requestIdleCallback(() => {
				void start()
				onAutoStartedRef.current?.()
			})
		}
		let offFocus: (() => void) | undefined
		if (!navigation || navigation.isFocused()) run()
		else offFocus = navigation.addListener('focus', run)
		return () => {
			offFocus?.()
			if (task !== null) cancelIdleCallback(task)
		}
	}, [autoStart, enabled, navigation, start])

	return {
		state,
		/** What is being said right now (a partial text), shown in the input; empty when nothing is being heard. */
		partial,
		active: state === 'listening' || state === 'transcribing',
		start,
		stop,
		cancel,
	}
}

export default useVoiceSearch
