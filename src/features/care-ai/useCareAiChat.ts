// src/features/care-ai/useCareAiChat.ts
//
// State of one Care AI conversation: the messages, the "typing" beat before each reply, the suggested follow-ups
// and what each tap (starter, quick-reply chip, suggestion, typed text) asks. What the patient types or taps is
// answered by the backend chat (careAiService.ts, drawn through careAiMapper.ts); the four welcome starters are
// scripted prompts ("What's bothering you?") whose chips then go to the backend like typed text.

import { useCallback, useEffect, useRef, useState } from 'react'
import { RED_FLAG_PATTERN } from './careAiData'
import { COULD_NOT_ANSWER, messagesFromSaved, replyFromPayload } from './careAiMapper'
import { buildReply } from './careAiReplies'
import { launchMessages } from './careAiScenarios'
import { createChatSession, getChatSession, sendChatFeedback, sendChatMessage } from './careAiService'
import type {
	CareAiAssistantMessage,
	CareAiFollowUp,
	CareAiLaunch,
	CareAiMessage,
	CareAiReply,
	CareAiReplyArg,
	CareAiReplyId,
	CareAiStarter,
} from './careAiTypes'

/** How long "Care AI is typing" shows before a scripted prompt lands. */
const TYPING_MS = 600

const CHAT_NOT_OPENED = 'Sorry, I couldn’t open that chat. Please try again in a moment.'

/** What a tapped quick-reply chip says to Care AI, by the kind of prompt the chip sat under. */
const chipMessage = (kind: CareAiReplyId, chip: string) => {
	if (kind === 'symptom') return `I have ${chip.charAt(0).toLowerCase()}${chip.slice(1)}`
	if (kind === 'doctor') return `Find me a doctor for: ${chip}`
	return chip
}

export function useCareAiChat(firstName: string, launch?: CareAiLaunch) {
	const idRef = useRef(0)
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
	const busyRef = useRef(false)
	/** The chat session on the backend; made with the first message. */
	const sessionRef = useRef<string | null>(null)
	/** Bumped by a new chat / opening another one: a reply that comes back for an older one is dropped. */
	const epochRef = useRef(0)
	const mountedRef = useRef(true)

	const nextId = useCallback(() => `m${++idRef.current}`, [])

	const assistant = useCallback(
		(kind: CareAiReplyId, arg?: CareAiReplyArg, patch?: Partial<CareAiReply>): CareAiAssistantMessage => ({
			id: nextId(),
			role: 'ai',
			kind,
			reply: { ...buildReply(kind, arg, { firstName }), ...patch },
		}),
		[firstName, nextId]
	)

	// Opened into a scenario (chat summary, booking a doctor)? Start from that conversation, not the welcome screen.
	const [messages, setMessages] = useState<CareAiMessage[]>(
		() =>
			launchMessages(launch, (text) => ({ id: nextId(), role: 'user', text }), assistant) ?? [assistant('greet')]
	)
	const [follow, setFollow] = useState<CareAiFollowUp[]>([])
	const [typing, setTyping] = useState(false)

	useEffect(() => {
		mountedRef.current = true
		return () => {
			mountedRef.current = false
			if (timerRef.current) clearTimeout(timerRef.current)
		}
	}, [])

	/** Mark the choice made on turn `messageId`; the other chips on it lock. */
	const markPicked = useCallback((messageId: string, value: string) => {
		setMessages((prev) => prev.map((m) => (m.role === 'ai' && m.id === messageId ? { ...m, picked: value } : m)))
	}, [])

	/** Add the patient's message; the welcome starters give way to the conversation once anything is asked. */
	const addUserMessage = useCallback(
		(text: string) => {
			setMessages((prev) => [
				...prev.map((m) =>
					m.role === 'ai' && m.kind === 'greet' && !m.picked ? { ...m, picked: 'typed' } : m
				),
				{ id: nextId(), role: 'user', text },
			])
		},
		[nextId]
	)

	/** A scripted prompt: the user's message, the typing beat, then the `id` reply. Ignored while a reply is pending. */
	const askScripted = useCallback(
		(text: string, id: CareAiReplyId, arg?: CareAiReplyArg) => {
			if (busyRef.current) return
			busyRef.current = true
			addUserMessage(text)
			setTyping(true)
			setFollow([])
			timerRef.current = setTimeout(() => {
				const reply = assistant(id, arg)
				setMessages((prev) => [...prev, reply])
				setFollow(reply.reply.follow)
				setTyping(false)
				busyRef.current = false
			}, TYPING_MS)
		},
		[addUserMessage, assistant]
	)

	/** Ask the backend chat. Ignored while a reply is pending. */
	const askBackend = useCallback(
		async (text: string) => {
			if (busyRef.current) return
			busyRef.current = true
			const epoch = epochRef.current
			addUserMessage(text)
			setTyping(true)
			setFollow([])
			try {
				let sessionId = sessionRef.current
				if (!sessionId) {
					sessionId = (await createChatSession()).id
					if (epoch === epochRef.current) sessionRef.current = sessionId
				}
				const turn = await sendChatMessage(sessionId, text)
				if (!mountedRef.current || epoch !== epochRef.current) return
				const reply: CareAiAssistantMessage = {
					id: nextId(),
					role: 'ai',
					kind: 'answer',
					messageId: turn.message_id,
					reply: replyFromPayload(turn.answer, turn.payload ?? {}),
				}
				setMessages((prev) => [...prev, reply])
			} catch {
				if (!mountedRef.current || epoch !== epochRef.current) return
				// Never leave an emergency at "try again": the urgent card does not need the backend.
				const failed = RED_FLAG_PATTERN.test(text.toLowerCase())
					? assistant('urgent-typed')
					: assistant('error', undefined, { text: COULD_NOT_ANSWER })
				setMessages((prev) => [...prev, failed])
			} finally {
				if (mountedRef.current && epoch === epochRef.current) {
					setTyping(false)
					busyRef.current = false
				}
			}
		},
		[addUserMessage, assistant, nextId]
	)

	const sendText = useCallback(
		(text: string) => {
			const trimmed = text.trim()
			if (trimmed) void askBackend(trimmed)
		},
		[askBackend]
	)

	const pickStarter = useCallback(
		(starter: CareAiStarter) => {
			const greet = messages[0]
			if (greet) markPicked(greet.id, starter.title)
			askScripted(starter.title, starter.id)
		},
		[askScripted, markPicked, messages]
	)

	const answerChip = useCallback(
		(turn: CareAiAssistantMessage, chip: string) => {
			if (turn.picked) return
			markPicked(turn.id, chip)
			void askBackend(chipMessage(turn.kind, chip))
		},
		[askBackend, markPicked]
	)

	const askFollowUp = useCallback((f: CareAiFollowUp) => void askBackend(f.label), [askBackend])

	/** Back to the welcome screen with a fresh chat (the old one stays in Recent chats). */
	const newChat = useCallback(() => {
		epochRef.current += 1
		if (timerRef.current) clearTimeout(timerRef.current)
		busyRef.current = false
		sessionRef.current = null
		setMessages([assistant('greet')])
		setFollow([])
		setTyping(false)
	}, [assistant])

	/** Open a saved chat from Recent chats: its messages, and new ones carry on in the same session. */
	const openChat = useCallback(
		async (sessionId: string) => {
			epochRef.current += 1
			const epoch = epochRef.current
			if (timerRef.current) clearTimeout(timerRef.current)
			busyRef.current = true
			setTyping(true)
			setFollow([])
			try {
				const session = await getChatSession(sessionId)
				if (!mountedRef.current || epoch !== epochRef.current) return
				const saved = [...(session.messages ?? [])].sort((a, b) =>
					(a.created_at ?? '').localeCompare(b.created_at ?? '')
				)
				sessionRef.current = session.id
				setMessages([{ ...assistant('greet'), picked: 'typed' }, ...messagesFromSaved(saved, nextId)])
			} catch {
				if (!mountedRef.current || epoch !== epochRef.current) return
				setMessages((prev) => [...prev, assistant('error', undefined, { text: CHAT_NOT_OPENED })])
			} finally {
				if (mountedRef.current && epoch === epochRef.current) {
					setTyping(false)
					busyRef.current = false
				}
			}
		},
		[assistant, nextId]
	)

	/** The patient rated an answer. A failure is not worth interrupting them for. */
	const sendFeedback = useCallback(async (turn: CareAiAssistantMessage, helpful: boolean) => {
		if (!turn.messageId) return
		try {
			await sendChatFeedback(turn.messageId, helpful)
		} catch {
			// the thumb stays lit; the rating is simply not recorded
		}
	}, [])

	return {
		messages,
		follow,
		typing,
		/** False on the welcome screen (only the greeting so far). */
		hasAsked: messages.length > 1,
		sendText,
		pickStarter,
		answerChip,
		askFollowUp,
		openChat,
		newChat,
		sendFeedback,
	}
}
